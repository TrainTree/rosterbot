import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {root,MemoryStorage,readSource} from './helpers.mjs';

const require=createRequire(import.meta.url);
const safety=require(`${root}/js/02-persistence-safety.js`);
const registry=require(`${root}/js/01-persistence-registry.js`);
const timeline=JSON.stringify([{id:'imported',startWC:'2026-09-27',mode:'single',trackA:{depot:'SCS',roster:'B',line:7},trackB:null,createdAt:'2026-09-27T00:00:00.000Z'}]);
const employment=JSON.stringify([{id:'role',effectiveDate:'2026-09-27',classification:'driver',pdtScheme:'current'}]);
const manual=JSON.stringify({version:1,label:'Personal',days:{mon:{on:true}}});
const paybot=JSON.stringify({period:'2026-09-27',logicVersion:'0.20.6',days:Array.from({length:14},()=>({}))});
const calendar=JSON.stringify({fullDuration:true,includeOr:true,includeDetails:false,rosteredFallback:true,timesInTitle:false,range:'90_12'});
const payload=(storage={},extra={})=>({app:'RosterBotPayBot',version:'0.29.1',schemaVersion:4,exportedAt:'2026-09-30T00:00:00.000Z',storage,...extra});

test('an exact-shape synthetic v0.21.1 export stages as a legacy schema-4 replacement',()=>{
  const legacy=JSON.parse(fs.readFileSync(`${root}/tests/fixtures/backup-v0211.rosterbot`,'utf8'));
  const candidate=safety.stageReplacementPayload({payload:legacy,registry,surface:'backup'});
  assert.equal(legacy.version,'0.21.1');
  assert.equal(candidate.ok,true,candidate.errors?.join(' '));
  assert.equal(candidate.schemaVersion,4);
  assert.equal(candidate.summary.rosterHistoryCount,2);
  assert.equal(candidate.summary.diaryChangesFound,true);
  assert.equal(candidate.summary.paybotStatePresent,true);
  assert.equal(candidate.summary.calendarSettingsPresent,false);
  assert.equal(candidate.validations['rosterbot-timeline-v1'].state,'valid');
  assert.equal(candidate.validations['paybot-v06-state'].state,'valid');
  assert.deepEqual(candidate.summary.unknownKeys,[]);
});

test('schema-4 backup is staged without touching live state and produces a privacy-safe preview summary',()=>{
  const live=new MemoryStorage({'rosterbot-timeline-v1':timeline,'unrelated-device-secret':'keep'}),before=[...live.map];
  const candidate=safety.stageReplacementPayload({payload:payload({
    'rosterbot-timeline-v1':timeline,'rosterbot-employment-profile-v1':employment,'rosterbot-day-overrides-v1':'{"2026-10-01":{"status":"or"}}',
    'rosterbot-manual-schedule-v1':manual,'paybot-v06-state':paybot,'rosterbot-calendar-subscription-settings-v1':calendar,'rosterbot-db-schema-v1':'4',
    'future-personal-key':{opaque:true}
  },{futureWrapper:{opaque:true}}),registry,surface:'backup'});
  assert.equal(candidate.ok,true);
  assert.deepEqual([...live.map],before);
  assert.equal(candidate.summary.rosterHistoryCount,1);
  assert.equal(candidate.summary.employmentHistoryCount,1);
  assert.equal(candidate.summary.diaryChangesFound,true);
  assert.equal(candidate.summary.manualSchedulePresent,true);
  assert.equal(candidate.summary.paybotStatePresent,true);
  assert.equal(candidate.summary.calendarSettingsPresent,true);
  assert.deepEqual(candidate.summary.unknownKeys,['future-personal-key']);
  assert.deepEqual(candidate.unknownStorage['future-personal-key'],{opaque:true});
  assert.deepEqual(candidate.wrapperUnknown.futureWrapper,{opaque:true});
  assert(!JSON.stringify(candidate.summary).includes('opaque'));
});

test('malformed and unsupported wrappers never become destructive candidates',()=>{
  const cases=[
    [{app:'Wrong',schemaVersion:4,storage:{}},'app identifier'],
    [{app:'RosterBotPayBot',schemaVersion:4,storage:[]},'storage field'],
    [{app:'RosterBotPayBot',schemaVersion:5,storage:{}},'Schema 5'],
    [{app:'RosterBotPayBot',storage:{}},'schemaVersion'],
    [{schemaVersion:4,storage:{}},'app'],
    [{app:'RosterBotPayBot',schemaVersion:4},'storage']
  ];
  for(const [value,message] of cases){const staged=safety.stageReplacementPayload({payload:value,registry,surface:'backup'});assert.equal(staged.ok,false);assert.match(staged.errors.join(' '),new RegExp(message,'i'))}
  assert.throws(()=>JSON.parse('{not-json'));
});

test('malformed recognised values are rejected while unknown fields are retained for analysis',()=>{
  const staged=safety.stageReplacementPayload({payload:payload({'rosterbot-timeline-v1':'{bad','future-key':'exact future value'}),registry,surface:'backup'});
  assert.equal(staged.ok,false);
  assert.equal(staged.validations['rosterbot-timeline-v1'].state,'malformed');
  assert.equal(staged.unknownStorage['future-key'],'exact future value');
  const nonString=safety.stageReplacementPayload({payload:payload({'rosterbot-week-leave-v1':{}}),registry,surface:'backup'});
  assert.equal(nonString.ok,false);assert.match(nonString.errors.join(' '),/raw string/);
});

test('empty and partial backups are identified and retain full-replacement compatibility semantics',()=>{
  const empty=safety.stageReplacementPayload({payload:payload({}),registry,surface:'backup'});
  assert.equal(empty.ok,true);assert.equal(empty.summary.empty,true);assert.equal(empty.summary.partial,true);assert.equal(empty.fullReplacement,true);
  const emptyContainers=safety.stageReplacementPayload({payload:payload({'rosterbot-timeline-v1':'[]','rosterbot-employment-profile-v1':'[]','rosterbot-day-overrides-v1':'{}','rosterbot-db-schema-v1':'4'}),registry,surface:'backup'});
  assert.equal(emptyContainers.ok,true);assert.equal(emptyContainers.summary.empty,true);
  const partial=safety.stageReplacementPayload({payload:payload({'rosterbot-timeline-v1':timeline,'rosterbot-db-schema-v1':'4'}),registry,surface:'backup'});
  assert.equal(partial.ok,true);assert.equal(partial.summary.empty,false);assert.equal(partial.summary.partial,true);
  const plan=safety.replacementPlan(partial);
  assert(plan.localSet.some(([key])=>key==='rosterbot-timeline-v1'));
  assert(plan.localRemove.includes('rosterbot-employment-profile-v1'));
});

test('recovery evidence is recognised explicitly and is not accepted as a normal backup',()=>{
  const staged=safety.stageReplacementPayload({payload:{format:'rosterbot-recovery-evidence-v1',app:'RosterBot',personalDataSchema:4},registry,surface:'backup'});
  assert.equal(staged.ok,false);assert.equal(staged.recoveryArtifact,true);assert.match(staged.errors[0],/recovery\/diagnostic artifact/i);
});

test('existing v0.29.x backup values remain compatible with schema 4 staging',()=>{
  const legacyPaybot=JSON.stringify({period:'2026-09-13',days:[]}),staged=safety.stageReplacementPayload({payload:payload({'rosterbot-timeline-v1':timeline,'paybot-v05-state':legacyPaybot,'rosterbot-db-schema-v1':'4'}),registry,surface:'backup'});
  assert.equal(staged.ok,true);assert.equal(staged.validations['paybot-v05-state'].state,'legacy');assert.equal(staged.schemaVersion,4);
});

test('successful staged backup import applies and verifies the full replacement plan',async()=>{
  const oldTimeline=timeline.replace('imported','old'),storage=new MemoryStorage({'rosterbot-timeline-v1':{$raw:oldTimeline},'rosterbot-employment-profile-v1':{$raw:employment},'unrelated-device-secret':'keep'}),candidate=safety.stageReplacementPayload({payload:payload({'rosterbot-timeline-v1':timeline,'rosterbot-db-schema-v1':'4'}),registry,surface:'backup'}),plan=safety.replacementPlan(candidate,{extraRemovals:['paybot-lastcalc','rosterbot-cleared-v1']});
  const result=await safety.replacePersistentState({storage,registry,replacements:plan.localSet,removals:plan.localRemove});
  assert.equal(result.ok,true);assert.equal(result.stage,'verified');assert.equal(storage.getItem('rosterbot-timeline-v1'),timeline);assert.equal(storage.getItem('rosterbot-employment-profile-v1'),null);assert.equal(storage.getItem('unrelated-device-secret'),'keep');
});

for(const [label,failAt] of [['first',1],['middle',2],['final',3]])test(`transaction rolls back exact bytes after failed ${label} write`,async()=>{
  class FailingStorage extends MemoryStorage{writes=0;failed=false;setItem(key,value){this.writes++;if(!this.failed&&this.writes===failAt){this.failed=true;const error=new Error('synthetic quota/write failure');error.name='QuotaExceededError';throw error}super.setItem(key,value)}}
  const keys=['rosterbot-week-leave-v1','rosterbot-week-locks-v1','rosterbot-pay-checks-v1'],before=['{"a":1}','{"b":2}','{"c":3}'],storage=new FailingStorage(Object.fromEntries(keys.map((key,index)=>[key,{$raw:before[index]}])));
  const result=await safety.replacePersistentState({storage,registry,replacements:keys.map(key=>[key,'{}'])});
  assert.equal(result.ok,false);assert.equal(result.stage,'write');assert.equal(result.rollbackVerified,true);keys.forEach((key,index)=>assert.equal(storage.getItem(key),before[index]));
});

test('verification mismatch rolls back writes and deletions byte-for-byte',async()=>{
  class CorruptingStorage extends MemoryStorage{armed=false;corrupted=false;setItem(key,value){super.setItem(key,value);this.armed=true}getItem(key){if(this.armed&&!this.corrupted&&key==='rosterbot-week-leave-v1'){this.corrupted=true;return '{corrupted'}return super.getItem(key)}}
  const storage=new CorruptingStorage({'rosterbot-week-leave-v1':{$raw:'{"prior":true}'},'rosterbot-week-locks-v1':{$raw:'{"keep":true}'}});
  const result=await safety.replacePersistentState({storage,registry,replacements:[['rosterbot-week-leave-v1','{}']],removals:['rosterbot-week-locks-v1']});
  assert.equal(result.ok,false);assert.equal(result.stage,'verification');assert.equal(result.rollbackVerified,true);assert.equal(storage.getItem('rosterbot-week-leave-v1'),'{"prior":true}');assert.equal(storage.getItem('rosterbot-week-locks-v1'),'{"keep":true}');
});

test('rollback failure is reported as unverified and leaves replacement suppression released',async()=>{
  class RollbackFailStorage extends MemoryStorage{writes=0;setItem(key,value){this.writes++;if(this.writes===2||this.writes===3)throw new Error(this.writes===2?'commit failed':'rollback failed');super.setItem(key,value)}}
  const storage=new RollbackFailStorage({'rosterbot-week-leave-v1':{$raw:'{"prior":1}'},'rosterbot-week-locks-v1':{$raw:'{"prior":2}'}});
  const result=await safety.replacePersistentState({storage,registry,replacements:[['rosterbot-week-leave-v1','{}'],['rosterbot-week-locks-v1','{}']]});
  assert.equal(result.ok,false);assert.equal(result.rolledBack,true);assert.equal(result.rollbackVerified,false);assert(result.rollbackError);assert.equal(safety.isReplacementInProgress(),false);
});

test('cross-store verification failure rolls local and mirror back while sync metadata stays unchanged',async()=>{
  const key='rosterbot-week-leave-v1',meta='{"user":{"baseRevision":41,"localHash":"before"}}',storage=new MemoryStorage({[key]:{$raw:'{"old":true}'},'rosterbot-cloud-sync-meta-v1':{$raw:meta}}),rows=new Map([[key,{key,value:'{"old":true}',updatedAt:'old'}]]);let reads=0;
  const target={read:async keys=>{reads++;const copy=new Map(keys.map(k=>[k,rows.get(k)?{...rows.get(k)}:null]));if(reads===3&&copy.get(key))copy.get(key).value='{"mismatch":true}';return copy},apply:async({put=[],remove=[]})=>{for(const row of put)rows.set(row.key,{...row});for(const k of remove)rows.delete(k)}};
  const result=await safety.replacePersistenceCopies({storage,indexedDbTarget:target,registry,localSet:[[key,'{}']],indexedDbSet:[[key,'{}']]});
  assert.equal(result.ok,false);assert.equal(result.stage,'verification');assert.equal(result.rollbackVerified,true);assert.equal(storage.getItem(key),'{"old":true}');assert.equal(rows.get(key).value,'{"old":true}');assert.equal(storage.getItem('rosterbot-cloud-sync-meta-v1'),meta);
});

test('an unstable pre-commit snapshot aborts without writes or a misleading rollback',async()=>{
  const key='rosterbot-week-leave-v1',storage=new MemoryStorage({[key]:{$raw:'{"old":true}'}}),row={key,value:'{"old":true}',updatedAt:'old'};let reads=0,applies=0;
  const target={read:async keys=>{reads++;return new Map(keys.map(k=>[k,reads===2?{...row,value:'{"changed":true}'}:{...row}]))},apply:async()=>{applies++}};
  const result=await safety.replacePersistenceCopies({storage,indexedDbTarget:target,registry,localSet:[[key,'{}']],indexedDbSet:[[key,'{}']]});
  assert.equal(result.ok,false);assert.equal(result.stage,'capture');assert.equal(result.rolledBack,false);assert.equal(result.rollbackVerified,false);assert.equal(applies,0);assert.equal(storage.getItem(key),'{"old":true}');
});

test('replacement side effects are suppressed across local and mirror commit',async()=>{
  const observations=[],storage=new MemoryStorage(),key='rosterbot-week-leave-v1',rows=new Map(),target={read:async keys=>new Map(keys.map(k=>[k,rows.get(k)||null])),apply:async({put=[],remove=[]})=>{observations.push(safety.isReplacementInProgress());for(const row of put)rows.set(row.key,{...row});for(const k of remove)rows.delete(k)}};
  const nativeSet=storage.setItem.bind(storage);storage.setItem=(k,v)=>{observations.push(safety.isReplacementInProgress());nativeSet(k,v)};
  const result=await safety.replacePersistenceCopies({storage,indexedDbTarget:target,registry,localSet:[[key,'{}']],indexedDbSet:[[key,'{}']]});
  assert.equal(result.ok,true);assert(observations.length>=2);assert(observations.every(Boolean));assert.equal(safety.shouldMirror(storage),true);
});

test('manual and Cloud entry points use staged transactional replacement and suppress side effects',()=>{
  const backup=readSource('js/50-data-backup.js'),cloud=readSource('js/51-cloud-sync.js'),calendarSource=readSource('js/80-calendar-subscription.js'),diary=readSource('js/60-diary.js');
  const importFlow=backup.slice(backup.indexOf("importBtn?.addEventListener"),backup.indexOf("clearBtn?.addEventListener"));
  assert.match(backup,/stageReplacementPayload/);assert.match(backup,/replacePersistenceCopies/);assert.match(backup,/Import preview/);assert.doesNotMatch(importFlow,/for\(const key of keys\)localStorage\.removeItem\(key\)/);
  const apply=cloud.slice(cloud.indexOf('async function applyPayload'),cloud.indexOf('async function restoreCloud'));
  assert.match(apply,/stageReplacementPayload/);assert.match(apply,/replacePersistenceCopies/);assert.ok(apply.indexOf('stageReplacementPayload')<apply.indexOf('saveSafety'));assert.ok(apply.indexOf('replacePersistenceCopies')<apply.indexOf('setMeta'));
  assert.match(cloud,/replacementSuppressed/);assert.match(calendarSource,/isReplacementInProgress/);assert.match(diary,/shouldMirror/);
  assert.match(cloud,/replacement\.rolledBack&&!replacement\.rollbackVerified/);
  assert.match(cloud,/format:'rosterbot-cloud-restore-safety-v1'/);assert.match(cloud,/mechanism:'phase-4-transactional-replacement'/);
});
