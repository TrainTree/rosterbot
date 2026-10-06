import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fixtures,root,MemoryStorage,storedValue} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const canonical=require(`${root}/js/02-canonical-state.js`);
const schema5=require(`${root}/js/02-schema5.js`);
const runtime=require(`${root}/js/03-schema5-migration.js`);
const golden=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/schema4-to-schema5-golden.json'),'utf8'));

class MemoryIdbTarget{
  constructor(values={}){this.rows=new Map(Object.entries(values).map(([key,value])=>[key,{key,value:storedValue(value),updatedAt:'2026-10-01T00:00:00.000Z'}]))}
  async read(keys){return new Map(keys.map(key=>[key,this.rows.get(key)?{...this.rows.get(key)}:null]))}
  async apply({put=[],remove=[]}){for(const row of put)this.rows.set(row.key,{...row});for(const key of remove)this.rows.delete(key)}
  value(key){return this.rows.get(key)?.value??null}
}
function configuredPair(){
  const values=Object.fromEntries(Object.entries(fixtures.configured.localStorage).map(([key,value])=>[key,storedValue(value)]));
  values['rosterbot-db-schema-v1']='4';
  const personal=Object.fromEntries(registry.surfaceKeys('indexedDb').filter(key=>values[key]!=null).map(key=>[key,values[key]]));
  personal['rosterbot-db-schema-v1']='4';
  return {storage:new MemoryStorage(values),target:new MemoryIdbTarget(personal),before:values};
}
const runOptions=pair=>({storage:pair.storage,indexedDbTarget:pair.target,now:golden.migrationTimestamp,writer:golden.writer});

test('persisted runtime writes exact schema 5, lossless projection, guard, journal and retained snapshot',async()=>{
  const pair=configuredPair(),result=await runtime.run(runOptions(pair));
  assert.equal(result.ok,true);assert.equal(result.status,'complete');assert.equal(result.cloudSchema5UploadAllowed,false);
  const envelopeRaw=pair.storage.getItem(runtime.KEYS.envelope);
  assert.equal(envelopeRaw,pair.target.value(runtime.KEYS.envelope));
  const envelope=JSON.parse(envelopeRaw),expected=golden.cases.configured.expected;
  assert.deepEqual(envelope,expected.envelope);assert.equal(envelope.generation.fingerprint,expected.fingerprint);
  assert.equal(pair.storage.getItem(runtime.KEYS.marker),'5');assert.equal(pair.target.value(runtime.KEYS.marker),'5');
  assert.equal(JSON.parse(pair.storage.getItem(runtime.KEYS.journal)).state,'complete');
  assert.equal(JSON.parse(pair.storage.getItem(runtime.KEYS.snapshot)).retention.automaticDeletionAllowed,false);
  assert.equal(JSON.parse(pair.storage.getItem(runtime.KEYS.guard)).minimumWriterSchema,5);
  assert.equal((await runtime.verifyProjection({storage:pair.storage,indexedDbTarget:pair.target,expectedFingerprint:expected.sourceFingerprint})).ok,true);
});

test('reload verifies committed schema 5 without remigration',async()=>{
  const pair=configuredPair(),first=await runtime.run(runOptions(pair)),before=pair.storage.getItem(runtime.KEYS.envelope),second=await runtime.run({...runOptions(pair),now:'2026-10-02T00:00:00.000Z'});
  assert.equal(first.ok,true);assert.equal(second.ok,true);assert.equal(second.status,'already-complete');assert.equal(second.migrated,false);assert.equal(pair.storage.getItem(runtime.KEYS.envelope),before);
});

for(const boundary of ['before-snapshot','after-snapshot','after-candidate-build','after-candidate-validation','during-schema5-write','after-schema5-write','after-schema5-verification','during-compatibility-projection','after-compatibility-projection','after-final-commit']){
  test(`restart safely completes after interruption ${boundary}`,async()=>{
    const pair=configuredPair(),interrupted=await runtime.run({...runOptions(pair),interruptAt:boundary});
    assert.equal(interrupted.interrupted,true,boundary);
    const resumed=await runtime.run(runOptions(pair));assert.equal(resumed.ok,true,boundary);assert.equal(JSON.parse(pair.storage.getItem(runtime.KEYS.journal)).state,'complete');assert.equal(pair.storage.getItem(runtime.KEYS.marker),'5');
    const verified=await schema5.validateSchema5Envelope(JSON.parse(pair.storage.getItem(runtime.KEYS.envelope)));assert.equal(verified.ok,true);
  });
}

test('exact pre-migration schema-4 personal bytes remain recoverable from retained snapshot',async()=>{
  const values={...fixtures.legacyPayBotAliases.localStorage,'rosterbot-db-schema-v1':'4'},raw=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,storedValue(value)])),storage=new MemoryStorage(raw),target=new MemoryIdbTarget(raw),result=await runtime.run({storage,indexedDbTarget:target,now:golden.migrationTimestamp,writer:golden.writer});
  assert.equal(result.ok,true);
  const snapshot=JSON.parse(storage.getItem(runtime.KEYS.snapshot)),journal=JSON.parse(storage.getItem(runtime.KEYS.journal));
  storage.setItem('paybot-v06-state','{"changed":true}');target.rows.set('paybot-v06-state',{key:'paybot-v06-state',value:'{"changed":true}'});
  const rolled=await runtime.rollbackFromSnapshot({storage,indexedDbTarget:target,snapshot,journal,now:'2026-10-02T00:00:00.000Z'});
  assert.equal(rolled.ok,true);assert.equal(storage.getItem('paybot-v04-state'),raw['paybot-v04-state']);assert.equal(target.value('paybot-v04-state'),raw['paybot-v04-state']);assert.equal(storage.getItem('paybot-v06-state'),null);
});

test('fresh and explicit-clear sources remain distinct and exclude device secrets',async()=>{
  const fresh={storage:new MemoryStorage(),target:new MemoryIdbTarget()},clear={storage:new MemoryStorage({'rosterbot-cleared-v1':'2026-09-30T00:00:00.000Z','rosterbot-cloud-session-persistent-v1':'{"secret":"never"}'}),target:new MemoryIdbTarget()};
  const a=await runtime.run({...runOptions(fresh),kind:'state'}),b=await runtime.run({...runOptions(clear),kind:'clear',source:'verified-clear-tombstone'});
  assert.equal(a.ok,true);assert.equal(b.ok,true);assert.notEqual(a.envelope.generation.fingerprint,b.envelope.generation.fingerprint);assert.equal(b.envelope.personalState.kind,'clear');assert.doesNotMatch(JSON.stringify(b.envelope),/never/);
});

test('unknown app-owned keys are identified before automatic migration',()=>{
  assert.deepEqual(runtime.unknownAppKeys({'rosterbot-future-secret-v1':'x','unrelated-origin-key':'keep'}),['rosterbot-future-secret-v1']);
});

test('schema-4 backup state is migrated in memory and replaces schema 5 transactionally',async()=>{
  const pair=configuredPair(),initial=await runtime.run(runOptions(pair));assert.equal(initial.ok,true);
  const incoming=Object.fromEntries(Object.entries(fixtures.multipleEffectiveRosters.localStorage).map(([key,value])=>[key,storedValue(value)]));
  incoming['rosterbot-theme-v1.9']='7';incoming['rosterbot-db-schema-v1']='4';
  const replaced=await runtime.replaceFromSchema4Storage({...runOptions(pair),schema4Storage:incoming,now:'2026-10-03T00:00:00.000Z'});
  assert.equal(replaced.ok,true);assert.equal(replaced.envelope.generation.number,initial.envelope.generation.number+1);assert.equal(replaced.envelope.generation.predecessorFingerprint,initial.envelope.generation.fingerprint);
  assert.deepEqual(replaced.envelope.personalState.entries['rosterbot-timeline-v1'].value,fixtures.multipleEffectiveRosters.localStorage['rosterbot-timeline-v1']);
  assert.equal(pair.storage.getItem('rosterbot-theme-v1.9'),'7');assert.equal(pair.storage.getItem(runtime.KEYS.marker),'5');
  const restarted=await runtime.run({...runOptions(pair),now:'2026-10-04T00:00:00.000Z'});assert.equal(restarted.ok,true);assert.equal(restarted.status,'already-complete');
});

test('schema-5 write and quota failures retain rollback evidence and safely reapply on restart',async()=>{
  for(const errorName of ['Error','QuotaExceededError']){
    const pair=configuredPair(),native=pair.storage.setItem.bind(pair.storage);let failed=false;
    pair.storage.setItem=(key,value)=>{if(!failed&&key===runtime.KEYS.envelope){failed=true;const error=new Error('synthetic schema-5 write failure');error.name=errorName;throw error}native(key,value)};
    const first=await runtime.run(runOptions(pair));assert.equal(first.ok,false,errorName);assert.equal(first.stage,'schema5-write',errorName);
    assert.equal(JSON.parse(pair.storage.getItem(runtime.KEYS.journal)).state,'rollback-required');assert(pair.storage.getItem(runtime.KEYS.snapshot));
    const resumed=await runtime.run(runOptions(pair));assert.equal(resumed.ok,true,errorName);assert.equal(resumed.envelope.generation.number,1,'retry rebuilds the same generation rather than double-migrating');
  }
});

test('schema-5 read-back mismatch never becomes authoritative and resumes from verified evidence',async()=>{
  const pair=configuredPair(),nativeRead=pair.target.read.bind(pair.target);let corrupt=true;
  pair.target.read=async keys=>{const rows=await nativeRead(keys);if(corrupt&&keys.length===1&&keys[0]===runtime.KEYS.envelope&&rows.get(runtime.KEYS.envelope)){corrupt=false;rows.get(runtime.KEYS.envelope).value='{"corrupted":true}'}return rows};
  const first=await runtime.run(runOptions(pair));assert.equal(first.ok,false);assert.equal(first.stage,'schema5-write');assert.equal(pair.storage.getItem(runtime.KEYS.marker),'4');
  const resumed=await runtime.run(runOptions(pair));assert.equal(resumed.ok,true);assert.equal(pair.storage.getItem(runtime.KEYS.marker),'5');
});

test('schema-4 rollback projection is semantically equal and evidence survives restart',async()=>{
  const pair=configuredPair(),migrated=await runtime.run(runOptions(pair)),snapshotRaw=pair.storage.getItem(runtime.KEYS.snapshot);assert.equal(migrated.ok,true);
  const snapshot=JSON.parse(snapshotRaw),journal=JSON.parse(pair.storage.getItem(runtime.KEYS.journal)),rolled=await runtime.rollbackFromSnapshot({storage:pair.storage,indexedDbTarget:pair.target,snapshot,journal,now:'2026-10-05T00:00:00.000Z'});
  assert.equal(rolled.ok,true);assert.equal(rolled.fingerprint,migrated.envelope.compatibility.projectionFingerprint);assert.equal(pair.storage.getItem(runtime.KEYS.snapshot),snapshotRaw);
  const candidate=canonical.fromLocalStorage(pair.storage,{registry}),hash=await canonical.fingerprint(candidate);assert.equal(hash.value,snapshot.fingerprint);
});

test('explicit local clear commits a distinct clear generation without deleting migration evidence',async()=>{
  const pair=configuredPair(),initial=await runtime.run(runOptions(pair)),snapshotRaw=pair.storage.getItem(runtime.KEYS.snapshot),journalRaw=pair.storage.getItem(runtime.KEYS.journal);assert.equal(initial.ok,true);
  pair.storage.setItem(runtime.KEYS.clear,'2026-10-05T00:00:00.000Z');
  const cleared=await runtime.replaceFromSchema4Storage({...runOptions(pair),schema4Storage:{},source:'explicit-local-clear',kind:'clear',now:'2026-10-05T00:00:00.000Z'});
  assert.equal(cleared.ok,true);assert.equal(cleared.envelope.personalState.kind,'clear');assert(Object.values(cleared.envelope.personalState.entries).every(entry=>entry.presence==='missing'));
  assert.equal(pair.storage.getItem(runtime.KEYS.snapshot),snapshotRaw);assert.equal(pair.storage.getItem(runtime.KEYS.journal),journalRaw);assert.equal(pair.storage.getItem(runtime.KEYS.clear),'2026-10-05T00:00:00.000Z');
  const restarted=await runtime.run({...runOptions(pair),now:'2026-10-06T00:00:00.000Z'});assert.equal(restarted.ok,true);assert.equal(restarted.envelope.personalState.kind,'clear');
});

test('malformed persisted schema-5 metadata and unnamespaced envelope fields are rejected explicitly',async()=>{
  const valid=structuredClone(golden.cases.configured.expected.envelope),badPrevious=structuredClone(valid),badEntry=structuredClone(valid),unknownTop=structuredClone(valid);
  badPrevious.previousGeneration={storageSchemaVersion:5,number:1,fingerprint:'not-a-fingerprint'};
  badEntry.personalState.entries['rosterbot-week-leave-v1']={presence:'missing',value:{}};
  unknownTop.futureField={};
  assert((await schema5.validateSchema5Envelope(badPrevious)).errors.some(error=>error.code==='PREVIOUS_GENERATION_INVALID'));
  assert((await schema5.validateSchema5Envelope(badEntry)).errors.some(error=>error.code==='ENTRY_INVALID'));
  assert((await schema5.validateSchema5Envelope(unknownTop)).errors.some(error=>error.code==='ENVELOPE_FIELDS_INVALID'));
});
