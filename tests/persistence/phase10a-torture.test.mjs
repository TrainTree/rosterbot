import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {root,MemoryStorage,storedValue} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const canonical=require(`${root}/js/02-canonical-state.js`);
const schema5=require(`${root}/js/02-schema5.js`);
const runtime=require(`${root}/js/03-schema5-migration.js`);
const compatibility=require(`${root}/js/01-storage-compatibility.js`);
const corpus=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase10a-browser-states.json'),'utf8')).scenarios;
const cloudSource=fs.readFileSync(path.join(root,'js/51-cloud-sync.js'),'utf8');

function mergedLocal(name,seen=new Set()){
  if(seen.has(name))throw new Error(`Fixture inheritance cycle at ${name}`);
  seen.add(name);const item=corpus[name];if(!item)throw new Error(`Unknown fixture ${name}`);
  const base=item.inheritLocalStorage?mergedLocal(item.inheritLocalStorage,seen):{};
  return {...base,...item.localStorage};
}
function rawValues(values){return Object.fromEntries(Object.entries(values).map(([key,value])=>[key,storedValue(value)]))}
function personalRaw(values){
  const raw=rawValues(values),keys=new Set([...registry.surfaceKeys('indexedDb'),runtime.KEYS.marker]);
  return Object.fromEntries(Object.entries(raw).filter(([key])=>keys.has(key)));
}
function initialRows(name){
  const item=corpus[name],local=mergedLocal(name);
  if(item.indexedDb==='mirror-local')return personalRaw(local);
  if(item.indexedDb==='mirror-local-personal')return personalRaw(local);
  if(item.indexedDb==='inherited-personal')return personalRaw(mergedLocal(item.inheritLocalStorage));
  if(item.indexedDb==='stale-inherited-personal')return Object.fromEntries(Object.entries(personalRaw(mergedLocal('longLivedOfficial'))).map(([key,value])=>[key,value]));
  return {};
}
class MemoryIdbTarget{
  constructor(values={}){this.rows=new Map(Object.entries(values).map(([key,value])=>[key,{key,value:storedValue(value),updatedAt:'2026-10-01T00:00:00.000Z'}]));this.failApply=null;this.readTransform=null}
  async read(keys){
    const result=new Map(keys.map(key=>[key,this.rows.get(key)?{...this.rows.get(key)}:null]));
    return this.readTransform?this.readTransform(keys,result):result;
  }
  async apply(change){if(this.failApply)throw this.failApply(change);for(const row of change.put||[])this.rows.set(row.key,{...row});for(const key of change.remove||[])this.rows.delete(key)}
  value(key){return this.rows.get(key)?.value??null}
  values(){return Object.fromEntries([...this.rows].map(([key,row])=>[key,row.value]))}
}
function pairFor(name){const values=rawValues(mergedLocal(name));return {storage:new MemoryStorage(values),target:new MemoryIdbTarget(initialRows(name)),before:values}}
const runOptions=(pair,now='2026-10-06T00:00:00.000Z')=>({storage:pair.storage,indexedDbTarget:pair.target,now});
async function fingerprintStorage(storage){const value=await canonical.fingerprint(canonical.fromLocalStorage(storage,{registry}));assert.equal(value.ok,true);return value.value}

test('Phase 10A fixture corpus is synthetic, complete, and each successful source projects losslessly',async t=>{
  const required=['longLivedOfficial','manualLongLived','partialLegacyAliases','indexedDbRecoveryOnly','explicitClearWithStaleIdb','cloudMetadataHeld'];
  assert.deepEqual(Object.keys(corpus),required);
  assert(!JSON.stringify(corpus).includes('@gmail.')&&!JSON.stringify(corpus).includes('@outlook.'));
  for(const name of required){
    await t.test(name,async()=>{
      const pair=pairFor(name),kind=name==='explicitClearWithStaleIdb'?'clear':'state';
      // IndexedDB-only and explicit-clear authority are reconciled by bootstrap;
      // give the pure migration runtime the already-selected authoritative view.
      if(name==='indexedDbRecoveryOnly')for(const [key,value] of Object.entries(initialRows(name)))pair.storage.setItem(key,value);
      if(kind==='clear'){
        for(const key of canonical.stateKeys(registry))pair.storage.removeItem(key);
        for(const key of canonical.stateKeys(registry))pair.target.rows.delete(key);
      }
      const source=canonical.fromLocalStorage(pair.storage,{registry}),sourceHash=await canonical.fingerprint(source);assert.equal(sourceHash.ok,true);
      const migrated=await runtime.run({...runOptions(pair),kind,source:kind==='clear'?'verified-clear-tombstone':'phase10a-fixture'});
      assert.equal(migrated.ok,true,migrated.reason||migrated.stage);
      assert.equal(migrated.envelope.compatibility.projectionFingerprint,sourceHash.value);
      assert.equal((await runtime.verifyProjection({storage:pair.storage,indexedDbTarget:pair.target,expectedFingerprint:sourceHash.value})).ok,true);
      assert.equal(await fingerprintStorage(pair.storage),sourceHash.value);
    });
  }
});

test('every browser-storage write/read failure preserves the verified schema-4 source',async t=>{
  const cases=[
    ['local quota during snapshot',({storage})=>{const native=storage.setItem.bind(storage);storage.setItem=(key,value)=>{if(key===runtime.KEYS.snapshot){const e=new Error('quota');e.name='QuotaExceededError';throw e}native(key,value)}}],
    ['IndexedDB snapshot write failure',({target})=>{target.failApply=change=>{if(change.put?.some(row=>row.key===runtime.KEYS.snapshot))return new Error('idb write failed')}}],
    ['snapshot read-back mismatch',({target})=>{let once=true;target.readTransform=(keys,rows)=>{if(once&&keys.length===1&&keys[0]===runtime.KEYS.snapshot&&rows.get(runtime.KEYS.snapshot)){once=false;rows.get(runtime.KEYS.snapshot).value='{"corrupt":true}'}return rows}}],
    ['schema-5 local write failure',({storage})=>{const native=storage.setItem.bind(storage);storage.setItem=(key,value)=>{if(key===runtime.KEYS.envelope)throw new Error('schema5 write failed');native(key,value)}}],
    ['schema-5 IndexedDB write failure',({target})=>{target.failApply=change=>{if(change.put?.some(row=>row.key===runtime.KEYS.envelope))return new Error('schema5 idb failed')}}],
    ['compatibility projection failure',({storage})=>{const native=storage.setItem.bind(storage);storage.setItem=(key,value)=>{if(key==='rosterbot-day-overrides-v1')throw new Error('projection failed');native(key,value)}}],
    ['IndexedDB unavailable',({target})=>{target.failApply=()=>new Error('IndexedDB unavailable')}]
  ];
  for(const [name,inject] of cases){
    await t.test(name,async()=>{
      const pair=pairFor('longLivedOfficial'),sourceHash=await fingerprintStorage(pair.storage),before=Object.fromEntries(canonical.stateKeys(registry).map(key=>[key,pair.storage.getItem(key)]));inject(pair);
      const result=await runtime.run(runOptions(pair));assert.equal(result.ok,false);
      assert.notEqual(pair.storage.getItem(runtime.KEYS.marker),'5');
      for(const [key,raw] of Object.entries(before))assert.equal(pair.storage.getItem(key),raw,`${key} local source changed`);
      assert.equal(await fingerprintStorage(pair.storage),sourceHash);
    });
  }
});

test('localStorage read failure fails before migration and performs no write',async()=>{
  const storage={get length(){throw new Error('localStorage blocked')},key(){throw new Error('blocked')},getItem(){throw new Error('blocked')},setItem(){throw new Error('unexpected write')},removeItem(){throw new Error('unexpected remove')}};
  const result=await runtime.run({storage,indexedDbTarget:new MemoryIdbTarget(),now:'2026-10-06T00:00:00.000Z'});
  assert.equal(result.ok,false);assert.equal(result.stage,'unexpected');assert.match(result.reason,/blocked/);
});

test('delayed IndexedDB availability is awaited without changing the source fingerprint',async()=>{
  const pair=pairFor('longLivedOfficial'),sourceHash=await fingerprintStorage(pair.storage),read=pair.target.read.bind(pair.target),apply=pair.target.apply.bind(pair.target);let delayedReads=0,delayedWrites=0;
  pair.target.read=async keys=>{delayedReads++;await new Promise(resolve=>setTimeout(resolve,15));return read(keys)};pair.target.apply=async change=>{delayedWrites++;await new Promise(resolve=>setTimeout(resolve,15));return apply(change)};
  const result=await runtime.run(runOptions(pair));assert.equal(result.ok,true);assert(delayedReads>0);assert(delayedWrites>0);assert.equal(result.envelope.compatibility.projectionFingerprint,sourceHash);assert.equal((await runtime.verifyProjection({storage:pair.storage,indexedDbTarget:pair.target,expectedFingerprint:sourceHash})).ok,true)
});

test('corrupt journal, snapshot and schema-5 checksum all fail closed without rewriting evidence',async t=>{
  await t.test('journal',async()=>{const pair=pairFor('longLivedOfficial');pair.storage.setItem(runtime.KEYS.journal,'{bad');pair.target.rows.set(runtime.KEYS.journal,{key:runtime.KEYS.journal,value:'{bad'});const before=pair.storage.getItem(runtime.KEYS.journal),result=await runtime.run(runOptions(pair));assert.equal(result.stage,'journal-read');assert.equal(pair.storage.getItem(runtime.KEYS.journal),before)});
  await t.test('snapshot',async()=>{const pair=pairFor('longLivedOfficial');await runtime.run({...runOptions(pair),interruptAt:'after-snapshot'});const before='{"damaged":true}';pair.storage.setItem(runtime.KEYS.snapshot,before);pair.target.rows.set(runtime.KEYS.snapshot,{key:runtime.KEYS.snapshot,value:before});const result=await runtime.run(runOptions(pair));assert.equal(result.stage,'snapshot-validation');assert.equal(pair.storage.getItem(runtime.KEYS.snapshot),before)});
  await t.test('checksum',async()=>{const pair=pairFor('longLivedOfficial'),done=await runtime.run(runOptions(pair));assert.equal(done.ok,true);const envelope=JSON.parse(pair.storage.getItem(runtime.KEYS.envelope));envelope.personalState.entries['rosterbot-fortnight-notes-v1'].value['2026-09-20']='tampered';const raw=JSON.stringify(envelope);pair.storage.setItem(runtime.KEYS.envelope,raw);pair.target.rows.set(runtime.KEYS.envelope,{key:runtime.KEYS.envelope,value:raw});const result=await runtime.run(runOptions(pair));assert.equal(result.ok,false);assert.equal(result.stage,'precommit-envelope-verification');assert.equal(pair.storage.getItem(runtime.KEYS.envelope),raw)});
});

test('retained snapshot supports exact rollback, old-client guard, clean recovery and re-upgrade without duplicates',async()=>{
  const pair=pairFor('longLivedOfficial'),beforeHash=await fingerprintStorage(pair.storage),beforeRaw=Object.fromEntries(canonical.stateKeys(registry).map(key=>[key,pair.storage.getItem(key)]));
  const first=await runtime.run(runOptions(pair));assert.equal(first.ok,true);
  const oldClient=compatibility.inspect({localValues:Object.fromEntries(pair.storage.keys().map(key=>[key,pair.storage.getItem(key)])),indexedDbRows:[...pair.target.rows.values()]});assert.equal(oldClient.blocked,true);assert.equal(oldClient.detected.projectionWritable,false);
  const snapshot=JSON.parse(pair.storage.getItem(runtime.KEYS.snapshot)),journal=JSON.parse(pair.storage.getItem(runtime.KEYS.journal));
  const rolled=await runtime.rollbackFromSnapshot({storage:pair.storage,indexedDbTarget:pair.target,snapshot,journal,now:'2026-10-07T00:00:00.000Z'});assert.equal(rolled.ok,true);assert.equal(rolled.fingerprint,beforeHash);
  for(const [key,raw] of Object.entries(beforeRaw))assert.equal(pair.storage.getItem(key),raw,key);
  // A rollback installer removes only schema-5 control records after it has
  // verified the exact schema-4 source. The retained snapshot is copied out as
  // release evidence before the old application is allowed to start.
  for(const key of [runtime.KEYS.envelope,runtime.KEYS.journal,runtime.KEYS.guard,runtime.KEYS.snapshot]){pair.storage.removeItem(key);pair.target.rows.delete(key)}
  assert.equal(compatibility.inspect({localValues:Object.fromEntries(pair.storage.keys().map(key=>[key,pair.storage.getItem(key)])),indexedDbRows:[...pair.target.rows.values()]}).allowed,true);
  const second=await runtime.run({...runOptions(pair),'now':'2026-10-08T00:00:00.000Z'});assert.equal(second.ok,true);assert.equal(await fingerprintStorage(pair.storage),beforeHash);
  const timeline=JSON.parse(pair.storage.getItem('rosterbot-timeline-v1')),employment=JSON.parse(pair.storage.getItem('rosterbot-employment-profile-v1')),overrides=JSON.parse(pair.storage.getItem('rosterbot-day-overrides-v1')),allowances=JSON.parse(pair.storage.getItem('rosterbot-fortnight-allowances-v1'));
  assert.equal(new Set(timeline.map(x=>x.id)).size,timeline.length);assert.equal(new Set(employment.map(x=>x.id)).size,employment.length);assert.equal(Object.keys(overrides).length,3);assert.equal(Object.keys(allowances).length,1);
  const reloaded=await runtime.run({...runOptions(pair),'now':'2026-10-09T00:00:00.000Z'});assert.equal(reloaded.status,'already-complete');
});

test('schema-4 backup to schema 5, isolated clear, old-backup import and re-migration preserve identity',async()=>{
  const source=pairFor('longLivedOfficial'),sourceHash=await fingerprintStorage(source.storage),backup={app:'RosterBotPayBot',version:'0.29.1',schemaVersion:4,exportedAt:'2026-10-06T00:00:00.000Z',storage:{}};
  for(const key of registry.surfaceKeys('backup')){const raw=source.storage.getItem(key);if(raw!=null)backup.storage[key]=raw}backup.storage[runtime.KEYS.marker]='4';
  assert.equal((await runtime.run(runOptions(source))).ok,true);
  const isolated={storage:new MemoryStorage(),target:new MemoryIdbTarget()};
  for(const [key,raw] of Object.entries(backup.storage))isolated.storage.setItem(key,raw);
  const imported=await runtime.run({...runOptions(isolated,'2026-10-07T00:00:00.000Z'),source:'schema4-backup-import'});assert.equal(imported.ok,true);assert.equal(await fingerprintStorage(isolated.storage),sourceHash);
  assert.equal(imported.envelope.compatibility.projectionFingerprint,sourceHash);
});

test('partial, alias and malformed backup paths retain the public schema-4 contract',async()=>{
  const pair=pairFor('longLivedOfficial');assert.equal((await runtime.run(runOptions(pair))).ok,true);
  const partial=rawValues({'rosterbot-db-schema-v1':'4','rosterbot-fortnight-notes-v1':{'2026-09-20':'partial only'}}),replaced=await runtime.replaceFromSchema4Storage({...runOptions(pair,'2026-10-07T00:00:00.000Z'),schema4Storage:partial});assert.equal(replaced.ok,true);assert.equal(replaced.envelope.personalState.entries['rosterbot-timeline-v1'].presence,'missing');
  const alias=rawValues({'rosterbot-db-schema-v1':'4','paybot-v04-state':{logicVersion:'0.12',period:'2026-09-20',grade:'PB205',entryMode:'manual',r1:'A',l1:'1',r2:'A',l2:'2',pdt:'none',days:[]}}),aliasResult=await runtime.replaceFromSchema4Storage({...runOptions(pair,'2026-10-08T00:00:00.000Z'),schema4Storage:alias});assert.equal(aliasResult.ok,true);assert.equal(aliasResult.envelope.personalState.entries['paybot-v06-state'].presence,'present');
  const before=pair.storage.getItem(runtime.KEYS.envelope),malformed=await runtime.replaceFromSchema4Storage({...runOptions(pair,'2026-10-09T00:00:00.000Z'),schema4Storage:{'rosterbot-db-schema-v1':'4','rosterbot-timeline-v1':'{bad'}});assert.equal(malformed.ok,false);assert.equal(malformed.stage,'backup-migration');assert.equal(pair.storage.getItem(runtime.KEYS.envelope),before);
});

test('explicit clear before, during and after migration stays authoritative over stale mirrors and Cloud metadata',async t=>{
  await t.test('before',async()=>{const pair=pairFor('explicitClearWithStaleIdb');for(const key of canonical.stateKeys(registry))pair.target.rows.delete(key);const result=await runtime.run({...runOptions(pair),kind:'clear',source:'verified-clear-tombstone'});assert.equal(result.ok,true);assert.equal(result.envelope.personalState.kind,'clear');assert.equal(pair.storage.getItem('rosterbot-cloud-session-persistent-v1')!=null,true);
    const defaults=rawValues(mergedLocal('longLivedOfficial'));pair.storage.setItem('rosterbot-session-settings-v1',defaults['rosterbot-session-settings-v1']);
    const preserved=await runtime.syncProjection({...runOptions(pair,'2026-10-06T01:00:00.000Z'),preserveExplicitClear:true});assert.equal(preserved.ok,true,JSON.stringify({stage:preserved.stage,reason:preserved.reason,error:preserved.error?.message}));assert.equal(preserved.stage,'explicit-clear-preserved');assert.equal(preserved.envelope.personalState.kind,'clear');assert.equal(pair.storage.getItem('rosterbot-session-settings-v1'),null);
    const intentionalSettings=JSON.parse(defaults['rosterbot-session-settings-v1']);intentionalSettings.displayWeeks=3;pair.storage.setItem('rosterbot-session-settings-v1',JSON.stringify(intentionalSettings));const intentional=await runtime.syncProjection({...runOptions(pair,'2026-10-06T01:01:00.000Z')});assert.equal(intentional.ok,true);assert.equal(intentional.changed,true);assert.equal(intentional.envelope.personalState.kind,'state')});
  await t.test('during interruption',async()=>{const pair=pairFor('longLivedOfficial');assert.equal((await runtime.run({...runOptions(pair),interruptAt:'after-candidate-validation'})).interrupted,true);pair.storage.clear();pair.target.rows.clear();pair.storage.setItem(runtime.KEYS.clear,'2026-10-06T02:00:00.000Z');const result=await runtime.run({...runOptions(pair,'2026-10-06T02:00:00.000Z'),kind:'clear',source:'verified-clear-tombstone'});assert.equal(result.ok,true);assert.equal(result.envelope.personalState.kind,'clear')});
  await t.test('after',async()=>{const pair=pairFor('cloudMetadataHeld'),first=await runtime.run(runOptions(pair));assert.equal(first.ok,true);const snapshot=pair.storage.getItem(runtime.KEYS.snapshot),clearedAt='2026-10-06T03:00:00.000Z';pair.storage.setItem(runtime.KEYS.clear,clearedAt);const clear=await runtime.replaceFromSchema4Storage({...runOptions(pair,clearedAt),schema4Storage:{},source:'explicit-local-clear',kind:'clear'});assert.equal(clear.ok,true);assert.equal(clear.envelope.personalState.kind,'clear');assert.equal(pair.storage.getItem(runtime.KEYS.snapshot),snapshot);assert(pair.storage.getItem('rosterbot-cloud-session-persistent-v1'));assert.equal((await runtime.run({...runOptions(pair,'2026-10-07T03:00:00.000Z')})).status,'already-complete')});
});

test('ordinary post-migration edits keep schema 5 and schema-4 projection consistent without duplicates',async()=>{
  const pair=pairFor('longLivedOfficial'),first=await runtime.run(runOptions(pair));assert.equal(first.ok,true);let generation=first.envelope.generation.number;
  const edits=[
    ['rosterbot-timeline-v1',rows=>[...rows,{id:'post-change',startWC:'2027-01-03',mode:'single',trackA:{depot:'SCS',roster:'A',line:6},trackB:null,createdAt:'2026-10-06T04:00:00.000Z',source:'phase10a edit'}]],
    ['rosterbot-timeline-v1',rows=>rows.map(row=>row.id==='post-change'?{...row,mode:'swap',trackB:{depot:'SCS',roster:'B',line:8}}:row)],
    ['rosterbot-manual-schedule-v1',()=>({version:1,label:'Post-migration pattern',days:{sun:{on:false},mon:{on:true,start:'09:00',end:'17:00'},tue:{on:true,start:'09:00',end:'17:00'},wed:{on:true,start:'09:00',end:'17:00'},thu:{on:true,start:'09:00',end:'17:00'},fri:{on:false},sat:{on:false}},updatedAt:'2026-10-06T04:01:00.000Z'})],
    ['rosterbot-day-overrides-v1',map=>({...map,'2026-10-06':{date:'2026-10-06',status:'worked',actualCode:'SP549',actualStart:'06:00',actualEnd:'14:00',notes:'post migration',pdtCurrent:false,phMode:'',allowances:{},editedAt:'2026-10-06T04:02:00.000Z',source:'phase10a edit'}})],
    ['rosterbot-employment-profile-v1',rows=>[...rows,{id:'post-role',effectiveDate:'2027-01-01',classification:'VL007',pdtScheme:'none',note:'post migration',createdAt:'2026-10-06T04:03:00.000Z'}]],
    ['rosterbot-fortnight-allowances-v1',map=>({...map,'2026-10-04':{A641:1,A703:1,A700:0,customLabel:'post',customQty:2,customRate:5}})],
    ['rosterbot-pay-checks-v1',map=>({...map,'2026-09-20':{checkedAt:'2026-10-06T04:05:00.000Z',grossAtCheck:6500,actualGross:6499}})],
    ['rosterbot-calendar-subscription-settings-v1',settings=>({...settings,includeOr:true,timesInTitle:false})]
  ];
  for(const [index,[key,change]] of edits.entries()){
    const current=JSON.parse(pair.storage.getItem(key)||(/schedule/.test(key)?'null':/timeline|profile/.test(key)?'[]':'{}')),next=change(current);pair.storage.setItem(key,JSON.stringify(next));
    const synced=await runtime.syncProjection({...runOptions(pair,`2026-10-06T05:${String(index).padStart(2,'0')}:00.000Z`)});assert.equal(synced.ok,true,key);assert.equal(synced.changed,true,key);assert.equal(synced.envelope.generation.number,++generation,key);
    assert.equal((await runtime.verifyProjection({storage:pair.storage,indexedDbTarget:pair.target,expectedFingerprint:synced.envelope.compatibility.projectionFingerprint})).ok,true,key);
  }
  pair.storage.setItem('rosterbot-view-mode-v1','calendar');pair.storage.setItem('rosterbot-theme-v1.9','2');
  const timeline=JSON.parse(pair.storage.getItem('rosterbot-timeline-v1')),employment=JSON.parse(pair.storage.getItem('rosterbot-employment-profile-v1'));
  assert.equal(timeline.filter(x=>x.id==='post-change').length,1);assert.equal(employment.filter(x=>x.id==='post-role').length,1);
  const envelope=pair.storage.getItem(runtime.KEYS.envelope),reloaded=await runtime.run({...runOptions(pair,'2026-10-07T05:00:00.000Z')});assert.equal(reloaded.status,'already-complete');assert.equal(pair.storage.getItem(runtime.KEYS.envelope),envelope);
});

test('Cloud attestation gate covers uploads, downloads, history restore and wrapper rotation',()=>{
  assert.match(cloudSource,/function schema5CapabilityHold\(\)/);
  assert.match(cloudSource,/async function rpcSave\([^)]*\)\{await requireCloudTransferAllowed\(\)/);
  assert.match(cloudSource,/async function applyPayload\([^)]*\}\s*=\s*\{\}\)\{\s*await requireCloudTransferAllowed\(\)/);
  assert.match(cloudSource,/async function rotateEncryptionWrappers\([^)]*\)\{await requireCloudTransferAllowed\(\)/);
  assert.match(cloudSource,/async function restoreCloud[\s\S]*?await applyPayload\(remote\.payload/);
  assert.match(cloudSource,/async function restoreHistoryRevision[\s\S]*?await applyPayload\(r\.payload/);
  assert.match(cloudSource,/async function autoSyncAttempt[\s\S]*?await requireCloudTransferAllowed\(\)/);
});
