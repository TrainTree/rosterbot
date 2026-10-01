import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fixtures,root,MemoryStorage,idbRows} from './helpers.mjs';
import {classifySchema4Installation,migrateSchema4To5} from './schema5-design.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const canonical=require(`${root}/js/02-canonical-state.js`);
const migrationTimestamp='2026-10-01T00:00:00.000Z';
const writer={app:'RosterBotPayBot',version:'0.30.0',build:'phase7a-golden'};

function localCandidate(values){return canonical.fromLocalStorage(new MemoryStorage(values),{registry})}
function indexedCandidate(scenario){return canonical.fromIndexedDb(idbRows(scenario),{registry})}

const configuredWithUnknown=structuredClone(fixtures.configured.localStorage);
configuredWithUnknown['rosterbot-timeline-v1'][0].syntheticFutureField={preserve:true,label:'unknown-tolerated'};
configuredWithUnknown['rosterbot-calendar-subscription-settings-v1']={fullDuration:true,includeOr:false,includeDetails:true,rosteredFallback:true,timesInTitle:false,range:'90_12',syntheticProviderOption:{enabled:true}};

const successful=[
  ['fresh','fresh user',localCandidate(fixtures.fresh.localStorage),{schemaMarker:null,source:'localStorage'}],
  ['configured','normal configured user',localCandidate(fixtures.configured.localStorage),{schemaMarker:'4',source:'localStorage'}],
  ['multipleHistoricalRosters','multiple historical rosters',localCandidate(fixtures.multipleEffectiveRosters.localStorage),{schemaMarker:'4',source:'localStorage'}],
  ['permanentSwap','permanent swap',localCandidate(fixtures.permanentSwap.localStorage),{schemaMarker:'4',source:'localStorage'}],
  ['manualSchedule','manual schedule and historical snapshot',localCandidate(fixtures.manualHistoricalSnapshot.localStorage),{schemaMarker:'4',source:'localStorage'}],
  ['employmentPayProgression','employment/pay progression',localCandidate(fixtures.employmentProgression.localStorage),{schemaMarker:'4',source:'localStorage'}],
  ['partialUser','partial user',localCandidate(fixtures.partial.localStorage),{schemaMarker:'4',source:'localStorage'}],
  ['legacyPayBotAliases','legacy PayBot aliases',localCandidate(fixtures.legacyPayBotAliases.localStorage),{schemaMarker:'4',source:'localStorage'}],
  ['legacyThemeAliases','legacy theme aliases remain device-local',localCandidate(fixtures.legacyThemeKeys.localStorage),{schemaMarker:null,source:'localStorage'}],
  ['indexedDbOnlyRecovery','IndexedDB-only recovery result',indexedCandidate(fixtures.indexedDbOnly),{schemaMarker:'4',source:'indexedDb-recovery'}],
  ['explicitClear','explicit clear',localCandidate({}),{schemaMarker:null,source:'verified-clear-tombstone',clearAuthoritative:true}],
  ['unknownToleratedFields','unknown tolerated fields inside supported values',localCandidate(configuredWithUnknown),{schemaMarker:'4',source:'localStorage'}]
];

const cases={};
for(const [id,description,candidate,detectionInput] of successful){
  const interpretation=classifySchema4Installation({candidate,...detectionInput});
  const result=await migrateSchema4To5(candidate,{migrationTimestamp,writer,kind:interpretation.kind,source:detectionInput.source,detectionWarnings:interpretation.warnings});
  if(!result.ok)throw new Error(`${id}: ${JSON.stringify(result.errors)}`);
  cases[id]={description,sourceScenario:id==='multipleHistoricalRosters'?'multipleEffectiveRosters':id==='manualSchedule'?'manualHistoricalSnapshot':id==='employmentPayProgression'?'employmentProgression':id==='partialUser'?'partial':id==='legacyThemeAliases'?'legacyThemeKeys':id==='indexedDbOnlyRecovery'?'indexedDbOnly':id==='explicitClear'?'explicitCleared':id,expected:{classification:'success',sourceFingerprint:result.sourceFingerprint,fingerprint:result.fingerprint,warnings:result.warnings,envelope:result.envelope}};
}

const malformed=localCandidate(fixtures.malformedLocalValidIndexedDb.localStorage);
const unsupported=localCandidate({'rosterbot-timeline-v1':JSON.stringify([{id:'unsupported',startWC:'2026-01-04',mode:'future-mode',trackA:{depot:'SCS',roster:'A',line:1}}])});
for(const [id,description,candidate] of [
  ['malformedValue','malformed schema-4 value',malformed],
  ['unsupportedValue','unsupported schema-4 value',unsupported]
]){
  const result=await migrateSchema4To5(candidate,{migrationTimestamp,writer});
  cases[id]={description,sourceScenario:id==='malformedValue'?'malformedLocalValidIndexedDb':'derived-unsupported',expected:{classification:result.classification,errors:result.errors}};
}

const fixture={fixtureFormat:1,description:'Deterministic design-only schema-4 to schema-5 golden migrations. Never loaded into browser storage.',migrationTimestamp,writer,cases};
fs.writeFileSync(path.join(root,'tests/fixtures/schema4-to-schema5-golden.json'),`${JSON.stringify(fixture,null,2)}\n`);
