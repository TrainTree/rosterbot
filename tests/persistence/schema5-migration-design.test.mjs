import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fixtures,root,MemoryStorage,idbRows,readSource} from './helpers.mjs';
import {
  JOURNAL_CONTRACT,JOURNAL_STATES,SCHEMA5_FORMAT,SNAPSHOT_FORMAT,
  classifySchema4Installation,makePreMigrationSnapshot,migrateSchema4To5,validateSchema5Envelope
} from './schema5-design.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const canonical=require(`${root}/js/02-canonical-state.js`);
const golden=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/schema4-to-schema5-golden.json'),'utf8'));
const timestamp=golden.migrationTimestamp,writer=golden.writer;

function localCandidate(values){return canonical.fromLocalStorage(new MemoryStorage(values),{registry})}
function indexedCandidate(scenario){return canonical.fromIndexedDb(idbRows(scenario),{registry})}
function scenarioCandidate(id){
  const scenario=golden.cases[id].sourceScenario;
  if(id==='indexedDbOnlyRecovery')return indexedCandidate(fixtures.indexedDbOnly);
  if(id==='explicitClear')return localCandidate({});
  if(id==='unknownToleratedFields'){
    const values=structuredClone(fixtures.configured.localStorage);
    values['rosterbot-timeline-v1'][0].syntheticFutureField={preserve:true,label:'unknown-tolerated'};
    values['rosterbot-calendar-subscription-settings-v1']={fullDuration:true,includeOr:false,includeDetails:true,rosteredFallback:true,timesInTitle:false,range:'90_12',syntheticProviderOption:{enabled:true}};
    return localCandidate(values);
  }
  return localCandidate(fixtures[scenario].localStorage);
}
function detectionFor(id,candidate){
  const args=id==='fresh'||id==='legacyThemeAliases'?{schemaMarker:null,source:'localStorage'}:id==='explicitClear'?{schemaMarker:null,source:'verified-clear-tombstone',clearAuthoritative:true}:id==='indexedDbOnlyRecovery'?{schemaMarker:'4',source:'indexedDb-recovery'}:{schemaMarker:'4',source:'localStorage'};
  return classifySchema4Installation({candidate,...args});
}
async function migrateGolden(id){
  const candidate=scenarioCandidate(id),interpretation=detectionFor(id,candidate);
  return migrateSchema4To5(candidate,{migrationTimestamp:timestamp,writer,kind:interpretation.kind,source:interpretation.source,detectionWarnings:interpretation.warnings});
}

test('golden corpus covers all required successful and rejected migration cases',()=>{
  const required=['fresh','configured','multipleHistoricalRosters','permanentSwap','manualSchedule','employmentPayProgression','partialUser','legacyPayBotAliases','legacyThemeAliases','indexedDbOnlyRecovery','explicitClear','unknownToleratedFields','malformedValue','unsupportedValue'];
  assert.deepEqual(Object.keys(golden.cases),required);
  assert.match(golden.description,/Never loaded into browser storage/);
});

test('every successful migration reproduces its exact schema-5 envelope and fingerprint',async()=>{
  for(const [id,fixture] of Object.entries(golden.cases)){
    if(fixture.expected.classification!=='success')continue;
    const result=await migrateGolden(id);
    assert.equal(result.ok,true,id);
    assert.deepEqual(result.envelope,fixture.expected.envelope,id);
    assert.equal(result.fingerprint,fixture.expected.fingerprint,id);
    assert.equal(result.sourceFingerprint,fixture.expected.sourceFingerprint,id);
    assert.deepEqual(result.warnings,fixture.expected.warnings,id);
    assert.equal((await validateSchema5Envelope(result.envelope)).ok,true,id);
  }
});

test('malformed and unsupported golden inputs reproduce exact recovery classifications',async()=>{
  const malformed=await migrateSchema4To5(localCandidate(fixtures.malformedLocalValidIndexedDb.localStorage),{migrationTimestamp:timestamp,writer});
  const unsupported=await migrateSchema4To5(localCandidate({'rosterbot-timeline-v1':JSON.stringify([{id:'unsupported',startWC:'2026-01-04',mode:'future-mode',trackA:{depot:'SCS',roster:'A',line:1}}])}),{migrationTimestamp:timestamp,writer});
  assert.deepEqual({classification:malformed.classification,errors:malformed.errors},golden.cases.malformedValue.expected);
  assert.deepEqual({classification:unsupported.classification,errors:unsupported.errors},golden.cases.unsupportedValue.expected);
});

test('migration is pure, repeatable and idempotent for an already-valid schema-5 envelope',async()=>{
  const candidate=scenarioCandidate('configured'),before=structuredClone({entries:candidate.entries,problems:candidate.problems,raw:candidate.raw}),options={migrationTimestamp:timestamp,writer:structuredClone(writer),source:'localStorage'},optionsBefore=structuredClone(options);
  const first=await migrateSchema4To5(candidate,options),second=await migrateSchema4To5(candidate,options),again=await migrateSchema4To5(first.envelope);
  assert.deepEqual({entries:candidate.entries,problems:candidate.problems,raw:candidate.raw},before);
  assert.deepEqual(options,optionsBefore);
  assert.deepEqual(first,second);
  assert.equal(again.ok,true);
  assert.equal(again.alreadyMigrated,true);
  assert.deepEqual(again.envelope,first.envelope);
});

test('schema-4 interpretation treats markers as evidence, resolves IndexedDB first, and blocks ambiguity/newer data',()=>{
  const valid=localCandidate(fixtures.configured.localStorage),invalid=localCandidate(fixtures.malformedLocalValidIndexedDb.localStorage);
  assert.equal(classifySchema4Installation({schemaMarker:'4',candidate:valid}).migrationCandidate,true);
  assert.deepEqual(classifySchema4Installation({schemaMarker:null,candidate:valid}).warnings,[{code:'SCHEMA_MARKER_MISSING'}]);
  assert.deepEqual(classifySchema4Installation({schemaMarker:'schema-four',candidate:valid}).warnings,[{code:'SCHEMA_MARKER_UNTRUSTED',value:'schema-four'}]);
  assert.equal(classifySchema4Installation({schemaMarker:'4',candidate:invalid}).migrationCandidate,false,'hard-coded 4 cannot override malformed data');
  assert.equal(classifySchema4Installation({schemaMarker:'5',candidate:valid}).classification,'newer-schema');
  assert.equal(classifySchema4Installation({schemaMarker:'4',candidate:valid,unknownAppKeys:['rosterbot-future-personal-v1']}).classification,'unknown-app-data');
  assert.equal(classifySchema4Installation({schemaMarker:'4',candidate:valid,reconciliationIssue:'conflict'}).restartAction,'recovery-ui');
  assert.equal(classifySchema4Installation({schemaMarker:'4',candidate:indexedCandidate(fixtures.indexedDbOnly),source:'indexedDb-recovery'}).source,'indexedDb-recovery');
  assert.equal(classifySchema4Installation({candidate:localCandidate({}),clearAuthoritative:true}).kind,'clear');
  assert.equal(classifySchema4Installation({candidate:valid,schema5Present:true}).restartAction,'read-schema5');
  assert.equal(classifySchema4Installation({candidate:valid,journalPresent:true}).restartAction,'resume-journal');
});

test('schema 5 is a semantic envelope: roster, swap, manual and employment history are unchanged',async()=>{
  for(const [id,key] of [
    ['multipleHistoricalRosters','rosterbot-timeline-v1'],
    ['permanentSwap','rosterbot-timeline-v1'],
    ['manualSchedule','rosterbot-timeline-v1'],
    ['manualSchedule','rosterbot-manual-schedule-v1'],
    ['employmentPayProgression','rosterbot-employment-profile-v1']
  ]){
    const source=scenarioCandidate(id).entries[key].value,result=await migrateGolden(id);
    assert.deepEqual(result.envelope.personalState.entries[key].value,source,`${id}:${key}`);
    assert.deepEqual(JSON.parse(result.compatibilityProjection.storage[key]),source,`${id}:${key}:projection`);
  }
  const swap=(await migrateGolden('permanentSwap')).envelope.personalState.entries['rosterbot-timeline-v1'].value[0];
  assert.equal(swap.mode,'swap');assert.equal(swap.trackA.line,1);assert.equal(swap.trackB.line,10);
  const manual=(await migrateGolden('manualSchedule')).envelope.personalState.entries['rosterbot-timeline-v1'].value[0];
  assert.equal(manual.manualPattern.days.mon.start,'06:00');
});

test('PayBot aliases canonicalise once while diary, calendar and tolerated fields round-trip',async()=>{
  const pay=await migrateGolden('legacyPayBotAliases'),payEntries=pay.envelope.personalState.entries;
  assert.equal(payEntries['paybot-v06-state'].presence,'present');
  assert.equal(payEntries['paybot-v06-state'].value.logicVersion,'0.12');
  assert.equal(pay.compatibilityProjection.storage['paybot-v04-state'],undefined);
  assert.equal(JSON.parse(pay.compatibilityProjection.storage['paybot-v06-state']).period,'2026-09-20');
  assert.deepEqual(pay.warnings,[{code:'COMPATIBILITY_ALIAS_PROMOTED',key:'paybot-v06-state',sourceKey:'paybot-v04-state'}]);

  const configured=await migrateGolden('configured');
  assert.deepEqual(configured.envelope.personalState.entries['rosterbot-day-overrides-v1'].value,scenarioCandidate('configured').entries['rosterbot-day-overrides-v1'].value);
  const unknown=await migrateGolden('unknownToleratedFields'),entries=unknown.envelope.personalState.entries;
  assert.equal(entries['rosterbot-timeline-v1'].value[0].syntheticFutureField.preserve,true);
  assert.equal(entries['rosterbot-calendar-subscription-settings-v1'].value.syntheticProviderOption.enabled,true);
  assert.equal(JSON.parse(unknown.compatibilityProjection.storage['rosterbot-calendar-subscription-settings-v1']).syntheticProviderOption.enabled,true);
});

test('device preferences, credentials, caches and recovery metadata never enter schema 5',async()=>{
  const source={...fixtures.configured.localStorage,
    'rosterbot-theme-v1.9':'7','rosterbot-color-mode-v1':'dark','rosterbot-calendar-subscription-tokens-v2':JSON.stringify({secret:'synthetic-token'}),
    'rosterbot-cloud-session-persistent-v1':JSON.stringify({access_token:'synthetic-access'}),'rosterbot-paybot-shared-cache-weeks':'cache',
    'rosterbot-cloud-restore-safety-v1':JSON.stringify({sensitive:'recovery'})};
  const result=await migrateSchema4To5(localCandidate(source),{migrationTimestamp:timestamp,writer});
  const text=JSON.stringify(result.envelope);
  for(const excluded of ['synthetic-token','synthetic-access','recovery','rosterbot-theme-v1.9','rosterbot-color-mode-v1','rosterbot-paybot-shared-cache-weeks'])assert.doesNotMatch(text,new RegExp(excluded));
});

test('explicit clear has a distinct schema-5 identity and does not resurrect IndexedDB history',async()=>{
  const fresh=await migrateGolden('fresh'),cleared=await migrateGolden('explicitClear');
  assert.notEqual(fresh.fingerprint,cleared.fingerprint);
  assert.equal(cleared.envelope.personalState.kind,'clear');
  assert(Object.values(cleared.envelope.personalState.entries).every(entry=>entry.presence==='missing'));
  assert.equal(cleared.envelope.migration.source,'verified-clear-tombstone');
});

test('pre-migration snapshot preserves schema-4 personal evidence but excludes secrets and device state',async()=>{
  const values={...fixtures.legacyPayBotAliases.localStorage,'rosterbot-theme-v1.9':'7','rosterbot-calendar-subscription-tokens-v2':JSON.stringify({secret:'never-copy'})},candidate=localCandidate(values);
  const made=await makePreMigrationSnapshot(candidate,{createdAt:timestamp});
  assert.equal(made.ok,true);assert.equal(made.snapshot.format,SNAPSHOT_FORMAT);
  assert.equal(made.snapshot.preservedRawPersonal['paybot-v04-state'],JSON.stringify(fixtures.legacyPayBotAliases.localStorage['paybot-v04-state']));
  assert.equal(JSON.parse(made.snapshot.projection.storage['paybot-v06-state']).period,'2026-09-20');
  assert.doesNotMatch(JSON.stringify(made.snapshot),/never-copy|rosterbot-theme-v1\.9|calendar-subscription-tokens/);
  assert.equal(made.snapshot.retention.automaticDeletionAllowed,false);
});

test('generation ancestry and schema-4 rollback projection fingerprints verify',async()=>{
  const candidate=scenarioCandidate('configured'),sourceHash=await canonical.fingerprint(candidate),sourceGeneration=canonical.makeGeneration({generation:7,fingerprint:sourceHash.value,timestamp,writer:'v0.30-phase6',verification:'verified'});
  const result=await migrateSchema4To5(candidate,{migrationTimestamp:timestamp,writer,sourceGeneration});
  assert.equal(result.envelope.generation.number,8);
  assert.equal(result.envelope.generation.predecessorFingerprint,sourceHash.value);
  assert.deepEqual(result.envelope.previousGeneration,{storageSchemaVersion:4,number:7,fingerprint:sourceHash.value});
  assert.equal((await canonical.fingerprint(canonical.fromLocalStorage(result.compatibilityProjection.storage,{registry}))).value,sourceHash.value);
});

test('checksum covers schema-5 content, detects tampering, and supports namespaced extension round-trip',async()=>{
  const candidate=scenarioCandidate('configured'),options={migrationTimestamp:timestamp,writer,extensions:{'org.rosterbot.synthetic':{future:true}}};
  const first=await migrateSchema4To5(candidate,options),second=await migrateSchema4To5(candidate,options);
  assert.equal(first.fingerprint,second.fingerprint);
  assert.deepEqual(first.envelope.extensions,options.extensions);
  const tampered=structuredClone(first.envelope);tampered.extensions['org.rosterbot.synthetic'].future=false;
  assert.deepEqual((await validateSchema5Envelope(tampered)).errors,[{code:'CHECKSUM_MISMATCH',message:'Envelope content does not match its checksum and generation fingerprint.'}]);
});

test('journal state machine is total and never advances the marker before both views verify',()=>{
  assert.deepEqual(Object.keys(JOURNAL_CONTRACT),JOURNAL_STATES);
  for(const state of JOURNAL_STATES){const row=JOURNAL_CONTRACT[state];assert(row.definite&&row.notDone&&row.restart);assert.equal(typeof row.automatic,'boolean');assert.equal(typeof row.ui,'boolean')}
  assert.match(JOURNAL_CONTRACT['schema5-verified'].definite,/marker is still 4\/missing/);
  assert.match(JOURNAL_CONTRACT['compatibility-projection-written'].notDone,/projection verification, marker advance/);
  assert.equal(JOURNAL_CONTRACT.failed.ui,true);
});

test('schema-5 migration stays local-first while Cloud release requires attestation',()=>{
  assert.equal(registry.schemaVersion,4);
  assert.match(readSource('index.html'),/02-schema5\.js/);
  assert.match(readSource('index.html'),/03-schema5-migration\.js/);
  assert.equal(registry.get('rosterbot-personal-state-v1').category,'internal');
  assert(['backup','cloud','indexedDb'].every(surface=>!registry.surfaceKeys(surface).includes('rosterbot-personal-state-v1')));
  assert.match(readSource('js/50-data-backup.js'),/schemaVersion:4/);
  assert.match(readSource('js/51-cloud-sync.js'),/new_schema_version:schemaVersion/);
  assert.match(readSource('js/51-cloud-sync.js'),/get_roster_schema_capability/);
  assert.equal(SCHEMA5_FORMAT,'rosterbot-personal-state');
});
