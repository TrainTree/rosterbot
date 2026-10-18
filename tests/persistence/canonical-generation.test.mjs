import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {root,fixtures,MemoryStorage,idbRows} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const canonical=require(`${root}/js/02-canonical-state.js`);
const safety=require(`${root}/js/02-persistence-safety.js`);
const timelineKey='rosterbot-timeline-v1';
const personalKeys=registry.surfaceKeys('indexedDb');
const rawTimeline=(id,roster='A')=>JSON.stringify([{id,startWC:'2026-09-27',mode:'single',trackA:{depot:'SCS',roster,line:1},trackB:null,createdAt:'2026-09-27T00:00:00.000Z',source:'synthetic Phase 6 test'}]);
const localObject=storage=>Object.fromEntries(storage.keys().map(key=>[key,storage.getItem(key)]));

class MemoryIndexedDb{
  constructor(rows=[]){this.rows=new Map(rows.map(row=>[row.key,structuredClone(row)]))}
  async read(keys){return new Map(keys.map(key=>[key,this.rows.has(key)?structuredClone(this.rows.get(key)):null]))}
  async apply({put=[],remove=[]}){for(const row of put)this.rows.set(row.key,structuredClone(row));for(const key of remove)this.rows.delete(key)}
  all(){return [...this.rows.values()].map(row=>structuredClone(row))}
}
async function hashes(local,idb){return Promise.all([canonical.fingerprint(canonical.fromLocalStorage(local,{registry})),canonical.fingerprint(canonical.fromIndexedDb(idb,{registry}))])}
async function reconcile(storage,idb){return safety.reconcileCanonicalState({registry,localValues:localObject(storage),rows:idb.all(),personalKeys})}

test('canonical serialisation is deterministic and rejects unsupported values explicitly',()=>{
  const left=canonical.canonicalSerialise({z:1,a:{b:2,a:[true,null,'x']}}),right=canonical.canonicalSerialise({a:{a:[true,null,'x'],b:2},z:1});
  assert.equal(left.ok,true);assert.equal(left.text,right.text);
  const sparse=[];sparse.length=1;
  for(const value of [{bad:undefined},{bad:NaN},{bad:1n},{bad:new Date()},sparse])assert.equal(canonical.canonicalSerialise(value).kind,'unsupported');
});

test('canonical candidates distinguish missing from explicit empty and project to schema 4',()=>{
  const missing=canonical.fromLocalStorage({}, {registry}),empty=canonical.fromLocalStorage({'rosterbot-week-leave-v1':'{}'}, {registry});
  assert.equal(missing.entries['rosterbot-week-leave-v1'].presence,'missing');
  assert.equal(empty.entries['rosterbot-week-leave-v1'].presence,'present');
  assert.deepEqual(empty.entries['rosterbot-week-leave-v1'].value,{});
  const projection=canonical.toSchema4Projection(empty,{registry});
  assert.equal(projection.ok,true);assert.equal(projection.storage['rosterbot-week-leave-v1'],'{}');assert(projection.removals.includes(timelineKey));
});

test('equivalent schema-4 objects fingerprint alike while meaningful personal changes do not',async()=>{
  const a={'rosterbot-week-leave-v1':'{"2026-10-04":{"note":"x","kind":"annual"}}'},b={'rosterbot-week-leave-v1':'{"2026-10-04":{"kind":"annual","note":"x"}}'},changed={'rosterbot-week-leave-v1':'{"2026-10-04":{"kind":"personal","note":"x"}}'};
  const [ha,hb,hc]=await Promise.all([a,b,changed].map(value=>canonical.fingerprint(canonical.fromLocalStorage(value,{registry}))));
  assert.equal(ha.ok,true);assert.equal(ha.value,hb.value);assert.notEqual(ha.value,hc.value);
});

test('device/cache preferences and credentials do not affect the personal-state fingerprint',async()=>{
  const personal={[timelineKey]:rawTimeline('same')},withDevice={...personal,'rosterbot-theme-v1.9':'7','rosterbot-color-mode-v1':'dark','rosterbot-calendar-subscription-tokens-v2':'{"secret":"synthetic"}','rosterbot-paybot-shared-cache-weeks':'cached'};
  const [plain,device]=await Promise.all([personal,withDevice].map(value=>canonical.fingerprint(canonical.fromLocalStorage(value,{registry}))));
  assert.equal(plain.value,device.value);
  assert(!canonical.stateKeys(registry).includes('rosterbot-calendar-subscription-tokens-v2'));
});

test('malformed registered values never receive a valid checksum and preserve exact raw evidence',async()=>{
  const raw='{not-json',candidate=canonical.fromLocalStorage({[timelineKey]:raw},{registry}),result=await canonical.fingerprint(candidate);
  assert.equal(candidate.status,'invalid');assert.equal(candidate.entries[timelineKey].raw,raw);assert.equal(result.ok,false);assert.equal(result.kind,'invalid');
});

test('v0.29 fixture values construct compatible canonical candidates without schema migration',async()=>{
  const scenario=fixtures.configured,local=new MemoryStorage(scenario.localStorage),candidate=canonical.fromLocalStorage(local,{registry}),projection=canonical.toSchema4Projection(candidate,{registry}),hash=await canonical.fingerprint(candidate);
  assert.equal(candidate.schemaVersion,4);assert.equal(candidate.status,'valid');assert.equal(projection.schemaVersion,4);assert.equal(projection.storage[timelineKey],local.getItem(timelineKey));assert.equal(hash.ok,true);
});

test('v0.29 states without generation metadata retain legacy missing-store recovery policy',async()=>{
  for(const [name,expected] of [['localStorageOnly','use-local'],['indexedDbOnly','restore-indexeddb']]){
    const scenario=fixtures[name],storage=new MemoryStorage(scenario.localStorage),idb=new MemoryIndexedDb(idbRows(scenario)),decision=await reconcile(storage,idb);
    assert.equal(decision.issueType,expected);assert.equal(decision.userChoiceRequired,false);
  }
});

test('a verified replacement creates generation metadata and retains one previous known-good projection',async()=>{
  const old=rawTimeline('old','A'),next=rawTimeline('next','B'),storage=new MemoryStorage({[timelineKey]:old}),idb=new MemoryIndexedDb([{key:timelineKey,value:old,updatedAt:'old'}]);
  const result=await safety.replaceCanonicalPersistenceCopies({storage,indexedDbTarget:idb,registry,localSet:[[timelineKey,next]],indexedDbSet:[[timelineKey,next]],now:'2026-10-01T01:00:00.000Z'});
  assert.equal(result.ok,true);assert.equal(result.generation.verification,'verified');assert.equal(result.generation.writer,'v0.31.0');assert.match(result.generation.fingerprint,/^[a-f0-9]{64}$/);assert.equal(safety.isReplacementInProgress(),false);
  const localMeta=canonical.parseGeneration(storage.getItem(canonical.GENERATION_KEY),{registry}),idbMeta=canonical.parseGeneration(idb.rows.get(canonical.GENERATION_KEY).value,{registry}),previous=canonical.parsePrevious(storage.getItem(canonical.PREVIOUS_KEY),{registry});
  assert.equal(localMeta.ok,true);assert.deepEqual(localMeta.value,idbMeta.value);assert.equal(previous.ok,true);assert.equal(previous.value.projection.storage[timelineKey],old);assert.equal((await canonical.verifyPrevious(previous.value,{registry})).ok,true);
});

test('same semantic state across both stores is identical despite raw ordering',async()=>{
  const local=new MemoryStorage({'rosterbot-week-leave-v1':'{"2026-10-04":{"z":1,"a":2}}'}),idb=new MemoryIndexedDb([{key:'rosterbot-week-leave-v1',value:'{"2026-10-04":{"a":2,"z":1}}'}]),decision=await reconcile(local,idb);
  assert.equal(decision.issueType,'identical');assert.equal(decision.userChoiceRequired,false);assert.equal(decision.canonical.localFingerprint.value,decision.canonical.indexedDbFingerprint.value);
});

test('a verified newer generation automatically repairs a mirror that matches its known predecessor',async()=>{
  const old=rawTimeline('old'),next=rawTimeline('next','B'),storage=new MemoryStorage({[timelineKey]:old}),idb=new MemoryIndexedDb([{key:timelineKey,value:old}]);
  assert.equal((await safety.replaceCanonicalPersistenceCopies({storage,indexedDbTarget:idb,registry,localSet:[[timelineKey,next]],indexedDbSet:[[timelineKey,next]],now:'2026-10-01T02:00:00.000Z'})).ok,true);
  const previous=canonical.parsePrevious(storage.getItem(canonical.PREVIOUS_KEY),{registry}).value;
  idb.rows.set(timelineKey,{key:timelineKey,value:previous.projection.storage[timelineKey]});idb.rows.set(canonical.GENERATION_KEY,{key:canonical.GENERATION_KEY,value:JSON.stringify(previous.generation)});
  const decision=await reconcile(storage,idb);assert.equal(decision.issueType,'repair-indexeddb-from-newer-generation');assert.equal(decision.automaticRecoveryAllowed,true);assert.equal(decision.userChoiceRequired,false);
  assert.equal((await safety.replacePersistenceCopies({storage,indexedDbTarget:idb,registry,...decision.reconciliationPlan})).ok,true);assert.equal(idb.rows.get(timelineKey).value,next);assert.equal((await reconcile(storage,idb)).issueType,'identical');
});

test('a verified newer saved generation repairs localStorage when local is its known predecessor',async()=>{
  const old=rawTimeline('old'),next=rawTimeline('next','C'),storage=new MemoryStorage({[timelineKey]:old}),idb=new MemoryIndexedDb([{key:timelineKey,value:old}]);
  assert.equal((await safety.replaceCanonicalPersistenceCopies({storage,indexedDbTarget:idb,registry,localSet:[[timelineKey,next]],indexedDbSet:[[timelineKey,next]],now:'2026-10-01T02:30:00.000Z'})).ok,true);
  const previous=canonical.parsePrevious(storage.getItem(canonical.PREVIOUS_KEY),{registry}).value;
  storage.setItem(timelineKey,previous.projection.storage[timelineKey]);storage.setItem(canonical.GENERATION_KEY,JSON.stringify(previous.generation));
  const decision=await reconcile(storage,idb);assert.equal(decision.issueType,'repair-local-from-newer-generation');assert.equal(decision.automaticRecoveryAllowed,true);assert.equal(decision.userChoiceRequired,false);
  assert.equal((await safety.replacePersistenceCopies({storage,indexedDbTarget:idb,registry,...decision.reconciliationPlan})).ok,true);assert.equal(storage.getItem(timelineKey),next);
});

test('valid divergent generations without proven ancestry require user choice regardless of timestamps',async()=>{
  const storage=new MemoryStorage({[timelineKey]:rawTimeline('local')}),idb=new MemoryIndexedDb([{key:timelineKey,value:rawTimeline('mirror'),updatedAt:'2099-01-01T00:00:00.000Z'}]),decision=await reconcile(storage,idb);
  assert.equal(decision.issueType,'conflict');assert.equal(decision.automaticRecoveryAllowed,false);assert.equal(decision.userChoiceRequired,true);assert.match(decision.reason,/timestamps are not used/);
});

test('restart after an interrupted local projection restores the last completely verified generation',async()=>{
  const old=rawTimeline('verified-old'),next=rawTimeline('partial-new','B'),storage=new MemoryStorage({[timelineKey]:old}),idb=new MemoryIndexedDb([{key:timelineKey,value:old}]);
  const interrupted=await safety.replaceCanonicalPersistenceCopies({storage,indexedDbTarget:idb,registry,localSet:[[timelineKey,next]],indexedDbSet:[[timelineKey,next]],now:'2026-10-01T03:00:00.000Z',interruptAfter:'local-projection'});
  assert.equal(interrupted.stage,'interrupted');assert.equal(storage.getItem(timelineKey),next);assert.equal(idb.rows.get(timelineKey).value,old);
  const restart=await reconcile(storage,idb);assert.equal(restart.issueType,'restore-previous-verified-generation');assert.equal(restart.automaticRecoveryAllowed,true);
  assert.equal((await safety.replacePersistenceCopies({storage,indexedDbTarget:idb,registry,...restart.reconciliationPlan})).ok,true);assert.equal(storage.getItem(timelineKey),old);assert.equal(idb.rows.get(timelineKey).value,old);assert.equal((await reconcile(storage,idb)).issueType,'identical');
});

test('restart rejects a fully projected but unverified generation in favour of previous known-good',async()=>{
  const old=rawTimeline('verified-old'),next=rawTimeline('unverified-new','C'),storage=new MemoryStorage({[timelineKey]:old}),idb=new MemoryIndexedDb([{key:timelineKey,value:old}]);
  const interrupted=await safety.replaceCanonicalPersistenceCopies({storage,indexedDbTarget:idb,registry,localSet:[[timelineKey,next]],indexedDbSet:[[timelineKey,next]],now:'2026-10-01T04:00:00.000Z',interruptAfter:'indexeddb-projection'});
  assert.equal(interrupted.stage,'interrupted');assert.equal(storage.getItem(timelineKey),next);assert.equal(idb.rows.get(timelineKey).value,next);
  const restart=await reconcile(storage,idb);assert.equal(restart.issueType,'restore-previous-verified-generation');assert.equal(restart.canonical.generations.local.value.verification,'pending');
});

test('a caught generation-phase failure rolls both stores and internal metadata back exactly',async()=>{
  const old=rawTimeline('old'),next=rawTimeline('next','D'),storage=new MemoryStorage({[timelineKey]:old}),idb=new MemoryIndexedDb([{key:timelineKey,value:old,updatedAt:'old'}]);
  const originalApply=idb.apply.bind(idb);let applies=0;
  idb.apply=async change=>{applies++;if(applies===3)throw new Error('synthetic interruption during saved projection');return originalApply(change)};
  const result=await safety.replaceCanonicalPersistenceCopies({storage,indexedDbTarget:idb,registry,localSet:[[timelineKey,next]],indexedDbSet:[[timelineKey,next]],now:'2026-10-01T04:30:00.000Z'});
  assert.equal(result.ok,false);assert.equal(result.rolledBack,true);assert.equal(result.rollbackVerified,true);assert.equal(storage.getItem(timelineKey),old);assert.equal(idb.rows.get(timelineKey).value,old);assert.equal(storage.getItem(canonical.GENERATION_KEY),null);assert.equal(storage.getItem(canonical.PREVIOUS_KEY),null);assert.equal(idb.rows.has(canonical.GENERATION_KEY),false);assert.equal(safety.isReplacementInProgress(),false);
});

test('fingerprint mismatch and malformed newer projection recover from the retained verified generation',async()=>{
  for(const damaged of [rawTimeline('tampered','D'),'{malformed-newer']){
    const old=rawTimeline('old'),next=rawTimeline('next','B'),storage=new MemoryStorage({[timelineKey]:old}),idb=new MemoryIndexedDb([{key:timelineKey,value:old}]);
    assert.equal((await safety.replaceCanonicalPersistenceCopies({storage,indexedDbTarget:idb,registry,localSet:[[timelineKey,next]],indexedDbSet:[[timelineKey,next]],now:'2026-10-01T05:00:00.000Z'})).ok,true);
    storage.setItem(timelineKey,damaged);
    const decision=await reconcile(storage,idb);assert.equal(decision.issueType,'restore-previous-verified-generation');assert.equal(decision.automaticRecoveryAllowed,true);assert.equal(decision.canonical.generations.previous.ok,true);
  }
});

test('a verified clear generation outranks its retained predecessor without timestamp guessing',async()=>{
  const old=rawTimeline('old'),storage=new MemoryStorage({[timelineKey]:old}),idb=new MemoryIndexedDb([{key:timelineKey,value:old}]);
  const result=await safety.replaceCanonicalPersistenceCopies({storage,indexedDbTarget:idb,registry,localSet:[[safety.CLEAR_KEY,'2026-01-01T00:00:00.000Z']],localRemove:[timelineKey],indexedDbRemove:[timelineKey],now:'2026-10-01T06:00:00.000Z'});
  assert.equal(result.ok,true);assert.equal(result.generation.kind,'clear');
  const decision=await reconcile(storage,idb);assert.equal(decision.issueType,'cleared');assert.equal(decision.userChoiceRequired,false);assert.equal(decision.reason,'verified clear generation is authoritative');
});

test('schema remains 4 and Phase 6 metadata stays outside backup, Cloud and legacy mirror surfaces',()=>{
  assert.equal(registry.schemaVersion,4);
  for(const surface of ['backup','cloud','indexedDb']){assert(!registry.surfaceKeys(surface).includes(canonical.GENERATION_KEY));assert(!registry.surfaceKeys(surface).includes(canonical.PREVIOUS_KEY))}
  assert.equal(registry.get(canonical.GENERATION_KEY).category,'internal');assert.equal(registry.get(canonical.PREVIOUS_KEY).category,'internal');
});
