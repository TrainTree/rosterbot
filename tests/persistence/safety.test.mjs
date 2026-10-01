import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {root,fixtures,MemoryStorage,idbRows,readSource} from './helpers.mjs';

const require=createRequire(import.meta.url);
const safety=require(`${root}/js/02-persistence-safety.js`);
const registry=require(`${root}/js/01-persistence-registry.js`);
const timelineKey='rosterbot-timeline-v1';
const personalKeys=registry.surfaceKeys('indexedDb');

function localValues(scenario){
  const storage=new MemoryStorage(scenario.localStorage);
  return Object.fromEntries(storage.keys().map(key=>[key,storage.getItem(key)]));
}
function decide({local=null,indexedDb=null,key=timelineKey,updatedAt='2026-09-29T00:00:00.000Z'}={}){
  return safety.recoveryDecision({registry,key,localRaw:local,indexedDbRaw:indexedDb,indexedDbUpdatedAt:updatedAt});
}
function validTimeline(id='copy'){
  return JSON.stringify([{id,startWC:'2026-04-05',mode:'single',trackA:{depot:'SCS',roster:'B',line:7},trackB:null,createdAt:'2026-04-05T00:00:00.000Z',source:'synthetic recovery test'}]);
}

test('recovery decision table covers missing and valid copies',()=>{
  assert.equal(decide().issueType,'empty');
  assert.equal(decide({local:validTimeline('local')}).issueType,'use-local');
  const restore=decide({indexedDb:validTimeline('idb')});
  assert.equal(restore.issueType,'restore-indexeddb');
  assert.equal(restore.automaticRecoveryAllowed,true);
  assert.equal(restore.userChoiceRequired,false);
});

test('malformed local plus valid IndexedDB is recoverable but preserves both raws for user choice',()=>{
  const local='{exactly-not-json',indexedDb=validTimeline('valid-idb');
  const result=decide({local,indexedDb});
  assert.equal(result.issueType,'malformed-local-recoverable');
  assert.equal(result.localValidationState,'malformed');
  assert.equal(result.indexedDbValidationState,'valid');
  assert.equal(result.automaticRecoveryAllowed,false);
  assert.equal(result.userChoiceRequired,true);
  assert.equal(result.startupAllowed,false);
  assert.equal(result.preservedRawCopies.local,local);
  assert.equal(result.preservedRawCopies.indexedDb,indexedDb);
});

test('valid local plus malformed IndexedDB uses local without destroying the malformed mirror',()=>{
  const local=validTimeline('valid-local'),indexedDb='{exact-idb-malformed';
  const result=decide({local,indexedDb});
  assert.equal(result.issueType,'malformed-indexeddb-recoverable');
  assert.equal(result.startupAllowed,true);
  assert.equal(result.userChoiceRequired,true);
  assert.deepEqual(result.preservedRawCopies,{local,indexedDb});
});

test('both malformed is unrecoverable and stays behind the startup gate',()=>{
  const result=decide({local:'{bad-local',indexedDb:'{bad-idb'});
  assert.equal(result.issueType,'unrecoverable');
  assert.equal(result.startupAllowed,false);
  assert.equal(result.userChoiceRequired,true);
});

test('both valid copies compare parsed semantics rather than raw JSON formatting',()=>{
  const value=JSON.parse(validTimeline('same'));
  const local=JSON.stringify(value),indexedDb=JSON.stringify(value,null,2);
  assert.notEqual(local,indexedDb);
  const identical=decide({local,indexedDb});
  assert.equal(identical.issueType,'identical');
  assert.equal(identical.userChoiceRequired,false);
  const conflict=decide({local,indexedDb:validTimeline('different')});
  assert.equal(conflict.issueType,'conflict');
  assert.equal(conflict.startupAllowed,false);
  assert.equal(conflict.userChoiceRequired,true);
});

test('unsupported newer shapes are never overwritten automatically',()=>{
  const newer=JSON.stringify([{id:'future',startWC:'2026-04-05',mode:'schema-5-mode',trackA:{depot:'SCS',roster:'B',line:7}}]);
  for(const result of [decide({local:newer,indexedDb:validTimeline()}),decide({local:validTimeline(),indexedDb:newer})]){
    assert.equal(result.issueType,'unsupported');
    assert.equal(result.automaticRecoveryAllowed,false);
    assert.equal(result.userChoiceRequired,true);
    assert.equal(result.startupAllowed,false);
  }
  assert.equal(decide({key:'rosterbot-db-schema-v1',local:'5'}).issueType,'unsupported');
});

test('non-string IndexedDB values are unsupported and preserved exactly',()=>{
  const raw={futureEnvelope:true,payload:{synthetic:1}},result=safety.recoveryDecision({registry,key:timelineKey,localRaw:null,indexedDbRaw:raw,indexedDbPresent:true});
  assert.equal(result.issueType,'unsupported');
  assert.equal(result.indexedDbValidationState,'unsupported');
  assert.equal(result.preservedRawCopies.indexedDb,raw);
});

test('explicit clear newer than every recoverable row blocks recovery and mirroring',()=>{
  const scenario=fixtures.explicitCleared,rows=idbRows(scenario),before=structuredClone(rows);
  const result=safety.decideRecovery({registry,localValues:localValues(scenario),rows,personalKeys});
  assert.equal(result.issueType,'cleared');
  assert.equal(result.automaticRecoveryAllowed,false);
  assert.equal(result.userChoiceRequired,false);
  assert.equal(result.startupAllowed,true);
  assert.equal(result.mirrorAllowed,false);
  assert.deepEqual(rows,before);
  assert.equal(result.preservedRawCopies[timelineKey].indexedDb,rows[0].value);
});

test('explicit clear remains authoritative when later startup recreates device-only defaults',()=>{
  const scenario=fixtures.explicitCleared,local={...localValues(scenario),'rosterbot-db-schema-v1':'4','rosterbot-theme-v1.9':'1','rosterbot-first-use-v1':'2026-09-30T00:00:00.000Z'};
  const result=safety.decideRecovery({registry,localValues:local,rows:idbRows(scenario),personalKeys});
  assert.equal(result.issueType,'cleared');
  assert.equal(result.startupAllowed,true);
  assert.equal(result.mirrorAllowed,false);
});

test('explicit clear records its durable hold without removing a signed-in session',()=>{
  const storage=new MemoryStorage({'rosterbot-cloud-session-persistent-v1':fixtures.explicitCleared.localStorage['rosterbot-cloud-session-persistent-v1']});
  safety.markExplicitClear(storage,'2026-09-29T12:00:00.000Z');
  assert.equal(storage.getItem('rosterbot-cleared-v1'),'2026-09-29T12:00:00.000Z');
  assert.equal(safety.autoHoldFor(storage,'00000000-0000-4000-8000-000000000001').reason,'explicit-local-clear');
  assert.equal(safety.shouldMirror(storage),false);
  assert(storage.getItem('rosterbot-cloud-session-persistent-v1'));
});

test('explicit clear does not hide or overwrite malformed local raw data',()=>{
  const raw='{malformed-after-clear',local={'rosterbot-cleared-v1':'2026-09-29T12:00:00.000Z',[timelineKey]:raw};
  const result=safety.decideRecovery({registry,localValues:local,rows:[],personalKeys:[timelineKey]});
  assert.equal(result.issueType,'unrecoverable');
  assert.equal(result.startupAllowed,false);
  assert.equal(result.preservedRawCopies[timelineKey].local,raw);
});

test('a clear tombstone that is not newer than recoverable IndexedDB requires a choice',()=>{
  const local={'rosterbot-cleared-v1':'2026-09-20T00:00:00.000Z'},rows=[{key:timelineKey,value:validTimeline(),updatedAt:'2026-09-21T00:00:00.000Z'}];
  const result=safety.decideRecovery({registry,localValues:local,rows,personalKeys:[timelineKey]});
  assert.equal(result.issueType,'conflict');
  assert.equal(result.startupAllowed,false);
  assert.equal(result.userChoiceRequired,true);
});

test('decision logic is side-effect free and exposes exact malformed copies',()=>{
  const scenario=fixtures.malformedLocalValidIndexedDb,local=localValues(scenario),rows=idbRows(scenario),beforeLocal=structuredClone(local),beforeRows=structuredClone(rows);
  const result=safety.decideRecovery({registry,localValues:local,rows,personalKeys:[timelineKey]});
  assert.equal(result.issueType,'malformed-local-recoverable');
  assert.deepEqual(local,beforeLocal);
  assert.deepEqual(rows,beforeRows);
  assert.equal(result.preservedRawCopies[timelineKey].local,'{not-json');
  assert.equal(result.preservedRawCopies[timelineKey].indexedDb,rows[0].value);
});

test('unambiguous IndexedDB-only state is safely restored',async()=>{
  const scenario=fixtures.indexedDbOnly,storage=new MemoryStorage(scenario.localStorage);
  const result=await safety.recoverRows({storage,rows:idbRows(scenario),personalKeys,registry,startupValues:localValues(scenario)});
  assert.equal(result.restored,true);
  assert.equal(result.replacement.ok,true);
  assert.equal(JSON.parse(storage.getItem(timelineKey))[0].id,'idb-only');
});

test('IndexedDB recovery restores calendar preferences but never private tokens',async()=>{
  const storage=new MemoryStorage(),settings=JSON.stringify({fullDuration:true,includeOr:true,includeDetails:false,rosteredFallback:true,timesInTitle:false,range:'90_12'});
  const rows=[
    {key:'rosterbot-calendar-subscription-settings-v1',value:settings},
    {key:'rosterbot-calendar-subscription-tokens-v2',value:JSON.stringify({synthetic:'private-token'})},
    {key:'rosterbot-calendar-subscription-token-v1',value:'private-legacy-token'}
  ];
  const result=await safety.recoverRows({storage,rows,personalKeys,registry,startupValues:{}});
  assert.equal(result.restored,true);
  assert.equal(storage.getItem('rosterbot-calendar-subscription-settings-v1'),settings);
  assert.equal(storage.getItem('rosterbot-calendar-subscription-tokens-v2'),null);
  assert.equal(storage.getItem('rosterbot-calendar-subscription-token-v1'),null);
});

test('safe replacement rolls back the exact prior raw state after a failed write',async()=>{
  class FailsSecondWrite extends MemoryStorage{
    writes=0;
    setItem(key,value){this.writes++;if(this.writes===2)throw new Error('synthetic write failure');super.setItem(key,value)}
  }
  const first='rosterbot-diary-annual-leave-v1',second='rosterbot-week-leave-v1',priorFirst='["2026-01-04"]',priorSecond='{"2026-02-01":"annual"}';
  const storage=new FailsSecondWrite({[first]:{$raw:priorFirst},[second]:{$raw:priorSecond}});
  const result=await safety.replacePersistentState({storage,registry,replacements:[[first,'[]'],[second,'{}']]});
  assert.equal(result.ok,false);
  assert.equal(result.stage,'write');
  assert.equal(result.rolledBack,true);
  assert.equal(result.rollbackVerified,true);
  assert.equal(storage.getItem(first),priorFirst);
  assert.equal(storage.getItem(second),priorSecond);
});

test('safe replacement detects failed verification and restores the exact prior raw state',async()=>{
  class CorruptsOneVerificationRead extends MemoryStorage{
    armed=false;corrupted=false;
    setItem(key,value){super.setItem(key,value);this.armed=true}
    getItem(key){if(this.armed&&!this.corrupted){this.corrupted=true;return '{corrupted-after-write'}return super.getItem(key)}
  }
  const key='rosterbot-week-leave-v1',prior='{"2026-01-04":"annual"}',storage=new CorruptsOneVerificationRead({[key]:{$raw:prior}});
  const result=await safety.replacePersistentState({storage,registry,replacements:[[key,'{}']]});
  assert.equal(result.ok,false);
  assert.equal(result.stage,'verification');
  assert.equal(result.rolledBack,true);
  assert.equal(result.rollbackVerified,true);
  assert.equal(storage.getItem(key),prior);
});

test('startup does not load feature modules or write defaults while authoritative state requires user choice',()=>{
  const source=readSource('js/03-persistence-bootstrap.js');
  const gate=source.indexOf('if(!state.startupAllowed)'),load=source.indexOf('await loadApplication()'),replacement=source.indexOf('safety.replacePersistentState');
  assert(gate>=0&&load>gate&&replacement>gate);
  assert(source.slice(gate,replacement).includes('return'));
  assert.doesNotMatch(source,/localStorage\.setItem|localStorage\.removeItem/);
});
