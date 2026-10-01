import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {root,MemoryStorage} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const safety=require(`${root}/js/02-persistence-safety.js`);
const ui=require(`${root}/js/03-recovery-ui.js`);
const timelineKey='rosterbot-timeline-v1';
const personalKeys=registry.surfaceKeys('indexedDb');
const rawTimeline=(id,roster='A',line=1)=>JSON.stringify([{id,startWC:'2026-04-05',mode:'single',trackA:{depot:'SCS',roster,line},trackB:null,createdAt:'2026-04-05T00:00:00.000Z',source:'synthetic Phase 4 test'}]);
const localObject=storage=>Object.fromEntries(storage.keys().map(key=>[key,storage.getItem(key)]));

class MemoryIndexedDb{
  constructor(rows=[],fail=''){this.rows=new Map(rows.map(row=>[row.key,structuredClone(row)]));this.fail=fail}
  async read(keys){return new Map(keys.map(key=>[key,this.rows.has(key)?structuredClone(this.rows.get(key)):null]))}
  async apply({put=[],remove=[]}){
    if(this.fail==='write'){this.fail='';throw new Error('synthetic mirror write failure')}
    for(const row of put)this.rows.set(row.key,structuredClone(row));
    for(const key of remove)this.rows.delete(key);
    if(this.fail==='corrupt'){this.fail='';const key=put[0]?.key;if(key)this.rows.get(key).value='{corrupted-after-write'}
  }
  all(){return [...this.rows.values()].map(row=>structuredClone(row))}
}
function decision(storage,idb){return safety.decideRecovery({registry,localValues:localObject(storage),rows:idb.all(),personalKeys})}
async function applyChoice(storage,idb,state,choice){
  const plan=ui.createRecoveryPlan({state,choice,registry,safety,localValues:localObject(storage),now:'2026-10-01T00:00:00.000Z'});
  return safety.replacePersistenceCopies({storage,indexedDbTarget:idb,registry,...plan});
}

test('two valid differing copies produce comparison summaries and both source actions',()=>{
  const storage=new MemoryStorage({[timelineKey]:{$raw:rawTimeline('local','A',2)}}),idb=new MemoryIndexedDb([{key:timelineKey,value:rawTimeline('idb','B',7),updatedAt:'2026-09-30T10:00:00.000Z'}]),state=decision(storage,idb);
  assert.equal(state.issueType,'conflict');assert.equal(state.userChoiceRequired,true);
  const summary=ui.summarizeRecovery(state,registry,{now:'2026-10-01T00:00:00.000Z'});
  assert.equal(summary.local.currentRoster.roster,'A');assert.equal(summary.indexedDb.currentRoster.roster,'B');
  assert.equal(summary.local.rosterHistoryCount,1);assert.equal(summary.indexedDb.lastModified,'2026-09-30T10:00:00.000Z');
  assert.equal(ui.sourceAvailable(state,'local'),true);assert.equal(ui.sourceAvailable(state,'indexedDb'),true);
});

test('recovery presentations cover malformed copies, unsupported data and unrecoverable data',()=>{
  const valid=rawTimeline('valid');
  const cases=[
    [safety.recoveryDecision({registry,key:timelineKey,localRaw:'{bad',indexedDbRaw:valid}),'recover-local'],
    [safety.recoveryDecision({registry,key:timelineKey,localRaw:valid,indexedDbRaw:'{bad'}),'repair-mirror'],
    [safety.recoveryDecision({registry,key:timelineKey,localRaw:'{bad',indexedDbRaw:'{also-bad'}),'unrecoverable'],
    [safety.recoveryDecision({registry,key:'rosterbot-db-schema-v1',localRaw:'5',indexedDbRaw:null}),'unsupported']
  ];
  for(const [state,kind] of cases)assert.equal(ui.presentation(state).kind,kind);
});

test('unresolved recovery is deterministic across reload and does not mutate either copy',()=>{
  const localRaw=rawTimeline('local'),idbRaw=rawTimeline('idb'),storage=new MemoryStorage({[timelineKey]:{$raw:localRaw}}),idb=new MemoryIndexedDb([{key:timelineKey,value:idbRaw,updatedAt:'2026-09-30T00:00:00.000Z'}]);
  const beforeLocal=localObject(storage),beforeRows=idb.all(),first=decision(storage,idb),reloaded=decision(storage,idb);
  assert.equal(first.issueType,'conflict');assert.equal(reloaded.issueType,'conflict');
  assert.deepEqual(localObject(storage),beforeLocal);assert.deepEqual(idb.all(),beforeRows);
  assert.equal(first.preservedRawCopies[timelineKey].local,reloaded.preservedRawCopies[timelineKey].local);
});

test('choosing this device safely repairs the mirror and normal startup follows',async()=>{
  const localRaw=rawTimeline('local','C',3),storage=new MemoryStorage({[timelineKey]:{$raw:localRaw}}),idb=new MemoryIndexedDb([{key:timelineKey,value:rawTimeline('idb','B',7),updatedAt:'2026-09-30T00:00:00.000Z'}]),state=decision(storage,idb);
  const result=await applyChoice(storage,idb,state,'local');assert.equal(result.ok,true);assert.equal(idb.rows.get(timelineKey).value,localRaw);
  const after=decision(storage,idb);assert.equal(after.issueType,'identical');assert.equal(after.userChoiceRequired,false);assert.equal(after.startupAllowed,true);
});

test('choosing the recovered copy safely replaces local data and normal startup follows',async()=>{
  const idbRaw=rawTimeline('idb','B',7),storage=new MemoryStorage({[timelineKey]:{$raw:rawTimeline('local','A',1)}}),idb=new MemoryIndexedDb([{key:timelineKey,value:idbRaw,updatedAt:'2026-09-30T00:00:00.000Z'}]),state=decision(storage,idb);
  const result=await applyChoice(storage,idb,state,'indexedDb');assert.equal(result.ok,true);assert.equal(storage.getItem(timelineKey),idbRaw);
  const after=decision(storage,idb);assert.equal(after.issueType,'identical');assert.equal(after.userChoiceRequired,false);
});

test('malformed local recovery and malformed mirror repair use verified replacement',async()=>{
  const valid=rawTimeline('valid');
  {
    const storage=new MemoryStorage({[timelineKey]:{$raw:'{damaged-local'}}),idb=new MemoryIndexedDb([{key:timelineKey,value:valid,updatedAt:'2026-09-30T00:00:00.000Z'}]),state=decision(storage,idb);
    assert.equal(state.issueType,'malformed-local-recoverable');assert.equal((await applyChoice(storage,idb,state,'indexedDb')).ok,true);assert.equal(storage.getItem(timelineKey),valid);
  }
  {
    const storage=new MemoryStorage({[timelineKey]:{$raw:valid}}),idb=new MemoryIndexedDb([{key:timelineKey,value:'{damaged-mirror',updatedAt:'2026-09-30T00:00:00.000Z'}]),state=decision(storage,idb);
    assert.equal(state.issueType,'malformed-indexeddb-recoverable');assert.equal(state.userChoiceRequired,true);assert.equal((await applyChoice(storage,idb,state,'local')).ok,true);assert.equal(idb.rows.get(timelineKey).value,valid);
    assert.equal(decision(storage,idb).userChoiceRequired,false);
  }
});

test('failed cross-store replacement restores both exact copies and remains recoverable',async()=>{
  const localRaw=rawTimeline('local'),idbRaw=rawTimeline('idb'),storage=new MemoryStorage({[timelineKey]:{$raw:localRaw}}),idb=new MemoryIndexedDb([{key:timelineKey,value:idbRaw,updatedAt:'2026-09-30T00:00:00.000Z'}],'corrupt'),state=decision(storage,idb),beforeRows=idb.all();
  const result=await applyChoice(storage,idb,state,'local');
  assert.equal(result.ok,false);assert.equal(result.stage,'verification');assert.equal(result.rolledBack,true);assert.equal(result.rollbackVerified,true);
  assert.equal(storage.getItem(timelineKey),localRaw);assert.deepEqual(idb.all(),beforeRows);assert.equal(decision(storage,idb).issueType,'conflict');
});

test('recovery export keeps relevant raw copies and redacts registered secrets',()=>{
  const tokenKey='rosterbot-calendar-subscription-tokens-v2',cryptoKey='rosterbot-cloud-device-key-v1',state={issueType:'unrecoverable',reason:'synthetic',affectedKeys:[timelineKey,tokenKey,cryptoKey],validationStates:{local:{[timelineKey]:'malformed'},indexedDb:{}},preservedRawCopies:{[timelineKey]:{local:'{damaged-personal',indexedDb:rawTimeline('backup')},[tokenKey]:{local:'private-calendar-token',indexedDb:null},[cryptoKey]:{local:'private-encryption-key',indexedDb:null}}};
  const artifact=ui.buildRecoveryExport({state,registry,now:'2026-10-01T00:00:00.000Z'}),text=JSON.stringify(artifact);
  assert.equal(artifact.format,'rosterbot-recovery-evidence-v1');assert.equal(artifact.personalDataSchema,4);assert.equal(artifact.preservedRawCopies[timelineKey].local,'{damaged-personal');
  assert.equal(artifact.preservedRawCopies[tokenKey].local.redacted,true);assert.equal(artifact.preservedRawCopies[cryptoKey].local.redacted,true);
  assert.doesNotMatch(text,/private-calendar-token|private-encryption-key/);
});

test('ambiguous tombstone requires choice while a recent authoritative clear remains automatic',async()=>{
  const retained=rawTimeline('retained'),oldStorage=new MemoryStorage({'rosterbot-cleared-v1':'2026-09-20T00:00:00.000Z'}),oldIdb=new MemoryIndexedDb([{key:timelineKey,value:retained,updatedAt:'2026-09-21T00:00:00.000Z'}]),ambiguous=decision(oldStorage,oldIdb);
  assert.equal(ambiguous.ambiguousTombstone,true);assert.equal(ui.presentation(ambiguous).kind,'tombstone');
  assert.equal((await applyChoice(oldStorage,oldIdb,ambiguous,'indexedDb')).ok,true);assert.equal(oldStorage.getItem('rosterbot-cleared-v1'),null);assert.equal(oldStorage.getItem(timelineKey),retained);assert.equal(decision(oldStorage,oldIdb).userChoiceRequired,false);
  const recentStorage=new MemoryStorage({'rosterbot-cleared-v1':'2026-09-22T00:00:00.000Z'}),recentIdb=new MemoryIndexedDb([{key:timelineKey,value:retained,updatedAt:'2026-09-21T00:00:00.000Z'}]);
  const authoritative=decision(recentStorage,recentIdb);assert.equal(authoritative.issueType,'cleared');assert.equal(authoritative.userChoiceRequired,false);
});

test('both malformed copies can only start again through an explicit clear plan',async()=>{
  const storage=new MemoryStorage({[timelineKey]:{$raw:'{bad-local'},'paybot-v05-state':{$raw:'{old-personal'}}),idb=new MemoryIndexedDb([{key:timelineKey,value:'{bad-mirror',updatedAt:'2026-09-30T00:00:00.000Z'}]),state=decision(storage,idb);
  assert.equal(state.issueType,'unrecoverable');assert.equal(ui.presentation(state).kind,'unrecoverable');
  const plan=ui.createRecoveryPlan({state,choice:'clear',registry,safety,localValues:localObject(storage),now:'2026-10-01T00:00:00.000Z'});
  assert.equal(plan.destructive,true);assert(plan.localRemove.includes('paybot-v05-state'));
  const result=await safety.replacePersistenceCopies({storage,indexedDbTarget:idb,registry,...plan});
  assert.equal(result.ok,true);assert.equal(storage.getItem(timelineKey),null);assert.equal(storage.getItem('paybot-v05-state'),null);assert.equal(idb.rows.has(timelineKey),false);assert.equal(storage.getItem('rosterbot-cleared-v1'),'2026-10-01T00:00:00.000Z');
  assert.equal(decision(storage,idb).issueType,'cleared');
});

test('fresh and normal identical users do not require recovery UI',()=>{
  const fresh=decision(new MemoryStorage(),new MemoryIndexedDb()),raw=rawTimeline('same'),identical=decision(new MemoryStorage({[timelineKey]:{$raw:raw}}),new MemoryIndexedDb([{key:timelineKey,value:raw,updatedAt:'2026-09-30T00:00:00.000Z'}]));
  assert.equal(fresh.userChoiceRequired,false);assert.equal(fresh.startupAllowed,true);assert.equal(identical.userChoiceRequired,false);assert.equal(identical.startupAllowed,true);
});
