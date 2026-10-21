import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {root,MemoryStorage,storedValue} from './helpers.mjs';

const require=createRequire(import.meta.url),registry=require(`${root}/js/01-persistence-registry.js`),canonical=require(`${root}/js/02-canonical-state.js`),runtime=require(`${root}/js/03-schema5-migration.js`);
const fixture=JSON.parse(fs.readFileSync(`${root}/tests/fixtures/phase10a-browser-states.json`,'utf8')).scenarios.longLivedOfficial.localStorage;
class Target{
  constructor(values={}){this.rows=new Map(Object.entries(values).map(([key,value])=>[key,{key,value:storedValue(value),updatedAt:'2026-10-20T00:00:00.000Z'}]));this.delay=0;this.fail=null}
  async read(keys){if(this.delay)await new Promise(resolve=>setTimeout(resolve,this.delay));return new Map(keys.map(key=>[key,this.rows.get(key)?{...this.rows.get(key)}:null]))}
  async apply(change){if(this.delay)await new Promise(resolve=>setTimeout(resolve,this.delay));if(this.fail){const failure=this.fail(change);if(failure)throw failure}for(const row of change.put||[])this.rows.set(row.key,{...row});for(const key of change.remove||[])this.rows.delete(key)}
}
function pair(){const raw=Object.fromEntries(Object.entries(fixture).map(([key,value])=>[key,storedValue(value)])),personal=new Set([...registry.surfaceKeys('indexedDb'),runtime.KEYS.marker]),rows=Object.fromEntries(Object.entries(raw).filter(([key])=>personal.has(key)));return {storage:new MemoryStorage(raw),target:new Target(rows)}}
const options=(value,now='2026-10-20T00:00:00.000Z')=>({storage:value.storage,indexedDbTarget:value.target,now});
async function migrated(){const value=pair(),result=await runtime.run(options(value));assert.equal(result.ok,true);return {value,result}}

test('one accepted multi-key personal operation creates one verified generation and a semantic no-op creates none',async()=>{
  const {value,result:first}=await migrated(),settings=JSON.parse(value.storage.getItem('rosterbot-session-settings-v1')),notes=JSON.parse(value.storage.getItem('rosterbot-fortnight-notes-v1')||'{}');settings.displayWeeks=6;notes['2026-10-18']='accepted setup';
  const committed=await runtime.commitPersonalChanges({...options(value,'2026-10-20T01:00:00.000Z'),changes:{'rosterbot-session-settings-v1':JSON.stringify(settings),'rosterbot-fortnight-notes-v1':JSON.stringify(notes)},source:'phase1-test'});
  assert.equal(committed.ok,true);assert.equal(committed.changed,true);assert.equal(committed.envelope.generation.number,first.envelope.generation.number+1);assert.equal(committed.envelope.generation.predecessorFingerprint,first.envelope.generation.fingerprint);assert.equal(value.storage.getItem(runtime.KEYS.commit),null);
  assert.equal((await runtime.verifyProjection({storage:value.storage,indexedDbTarget:value.target,expectedFingerprint:committed.envelope.compatibility.projectionFingerprint})).ok,true);
  const unchanged=await runtime.commitPersonalChanges({...options(value,'2026-10-20T01:01:00.000Z'),changes:{'rosterbot-session-settings-v1':JSON.stringify(settings)},source:'phase1-no-op'});assert.equal(unchanged.ok,true);assert.equal(unchanged.changed,false);assert.equal(unchanged.envelope.generation.number,committed.envelope.generation.number);
});

for(const boundary of ['personal-after-journal','personal-after-envelope','personal-after-projection','personal-before-final-verification'])test(`restart completes a prepared personal generation after ${boundary}`,async()=>{
  const {value,result:first}=await migrated(),settings=JSON.parse(value.storage.getItem('rosterbot-session-settings-v1'));settings.lastViewedFrom='2026-12-06';let interrupted=false;
  try{await runtime.commitPersonalChanges({...options(value,'2026-10-20T02:00:00.000Z'),changes:{'rosterbot-session-settings-v1':JSON.stringify(settings)},source:'phase1-interruption',interruptAt:boundary})}catch(error){interrupted=error.interrupted===true}
  assert.equal(interrupted,true);assert.notEqual(value.storage.getItem(runtime.KEYS.commit),null);
  const restarted=await runtime.run(options(value,'2026-10-20T02:01:00.000Z'));assert.equal(restarted.ok,true,restarted.reason||restarted.stage);assert.equal(restarted.envelope.generation.number,first.envelope.generation.number+1);assert.equal(value.storage.getItem(runtime.KEYS.commit),null);assert.equal(JSON.parse(value.storage.getItem('rosterbot-session-settings-v1')).lastViewedFrom,'2026-12-06');
  assert.equal((await runtime.verifyProjection({storage:value.storage,indexedDbTarget:value.target,expectedFingerprint:restarted.envelope.compatibility.projectionFingerprint})).ok,true);
});

test('delayed IndexedDB cannot expose a hybrid compatibility generation',async()=>{
  const {value,result:first}=await migrated(),beforeRaw=value.storage.getItem(runtime.KEYS.envelope),beforeSettings=value.storage.getItem('rosterbot-session-settings-v1'),settings=JSON.parse(beforeSettings);settings.displayWeeks=9;value.target.delay=20;
  const pending=runtime.commitPersonalChanges({...options(value,'2026-10-20T03:00:00.000Z'),changes:{'rosterbot-session-settings-v1':JSON.stringify(settings)},source:'phase1-delayed'});
  assert.equal(value.storage.getItem('rosterbot-session-settings-v1'),beforeSettings);
  const result=await pending;assert.equal(result.ok,true);assert.equal(result.envelope.generation.number,first.envelope.generation.number+1);assert.notEqual(value.storage.getItem(runtime.KEYS.envelope),beforeRaw);assert.equal(JSON.parse(value.storage.getItem('rosterbot-session-settings-v1')).displayWeeks,9);
});

test('validation failure before a commit journal leaves the previous generation untouched',async()=>{
  const {value,result:first}=await migrated(),beforeEnvelope=value.storage.getItem(runtime.KEYS.envelope),beforeSettings=value.storage.getItem('rosterbot-session-settings-v1');
  const rejected=await runtime.commitPersonalChanges({...options(value,'2026-10-20T03:10:00.000Z'),changes:{'rosterbot-not-a-personal-key-v1':'bad'},source:'phase1-invalid'});
  assert.equal(rejected.ok,false);assert.equal(rejected.stage,'personal-change-validation');assert.equal(value.storage.getItem(runtime.KEYS.commit),null);assert.equal(value.storage.getItem(runtime.KEYS.envelope),beforeEnvelope);assert.equal(value.storage.getItem('rosterbot-session-settings-v1'),beforeSettings);assert.equal(JSON.parse(beforeEnvelope).generation.number,first.envelope.generation.number);
});

test('a fault between local and IndexedDB envelope writes rolls back the surface and restart commits one complete generation',async()=>{
  const {value,result:first}=await migrated(),beforeEnvelope=value.storage.getItem(runtime.KEYS.envelope),beforeSettings=value.storage.getItem('rosterbot-session-settings-v1'),settings=JSON.parse(beforeSettings);settings.experienceMode='advanced';
  let injected=true;value.target.fail=change=>injected&&(change.put||[]).some(row=>row.key===runtime.KEYS.envelope)?(injected=false,new Error('synthetic IndexedDB envelope fault')):null;
  const failed=await runtime.commitPersonalChanges({...options(value,'2026-10-20T03:20:00.000Z'),changes:{'rosterbot-session-settings-v1':JSON.stringify(settings)},source:'phase1-storage-fault'});
  assert.equal(failed.ok,false);assert.equal(failed.recoveryRequired,true);assert.equal(value.storage.getItem(runtime.KEYS.envelope),beforeEnvelope);assert.equal(value.storage.getItem('rosterbot-session-settings-v1'),beforeSettings);assert.notEqual(value.storage.getItem(runtime.KEYS.commit),null);
  value.target.fail=null;const restarted=await runtime.run(options(value,'2026-10-20T03:21:00.000Z'));assert.equal(restarted.ok,true,restarted.reason||restarted.stage);assert.equal(restarted.envelope.generation.number,first.envelope.generation.number+1);assert.equal(JSON.parse(value.storage.getItem('rosterbot-session-settings-v1')).experienceMode,'advanced');assert.equal(value.storage.getItem(runtime.KEYS.commit),null);assert.equal((await runtime.verifyProjection({storage:value.storage,indexedDbTarget:value.target,expectedFingerprint:restarted.envelope.compatibility.projectionFingerprint})).ok,true);
});

test('draft setup is registered device-local and excluded from every personal transfer surface',()=>{
  const item=registry.get('rosterbot-setup-draft-v1');assert.equal(item.category,'device');for(const surface of ['backup','cloud','indexedDb'])assert.equal(registry.surfaceKeys(surface).includes(item.key),false);assert.equal(canonical.stateKeys(registry).includes(item.key),false);
  const diary=fs.readFileSync(`${root}/js/60-diary.js`,'utf8');assert.match(diary,/category!==['"]personal['"]/);assert.doesNotMatch(diary,/setTimeout\(mirrorNow,\s*(?:40|75|100)\)/);
});
