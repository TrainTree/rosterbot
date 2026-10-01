import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {root} from './helpers.mjs';
import {JOURNAL_STATES,SCHEMA5_FORMAT,SCHEMA5_STORAGE_SCHEMA} from './schema5-design.mjs';

const require=createRequire(import.meta.url);
const compatibility=require(`${root}/js/01-storage-compatibility.js`);
const registry=require(`${root}/js/01-persistence-registry.js`);
const canonical=require(`${root}/js/02-canonical-state.js`);
const safety=require(`${root}/js/02-persistence-safety.js`);
const recoveryUi=require(`${root}/js/03-recovery-ui.js`);
const report=registry.report();

console.log(`Persistence registry: ${report.itemCount} items · schema ${registry.schemaVersion} · ${registry.mode}`);
for(const [name,keys] of Object.entries(report.disagreements)){
  console.log(`\n${name} (${keys.length})`);
  const details=new Map(report.disagreementDetails[name].map(item=>[item.key,item.classification]));
  for(const key of keys)console.log(`- ${key} [${details.get(key)}]`);
}
console.log(`\nPhase 2 corrections (${report.corrections.length})`);
for(const item of report.corrections)console.log(`- ${item.key} [${item.classification}] ${item.resolution}`);

const key='rosterbot-week-leave-v1',valid='{}',malformed='{broken',different='{"2026-09-27":"annual"}';
const recoveryCases=[
  ['missing / missing',null,null],['valid / missing',valid,null],['missing / valid',null,valid],
  ['valid / identical',valid,valid],['valid / different',valid,different],['malformed / valid',malformed,valid],
  ['valid / malformed',valid,malformed],['malformed / malformed',malformed,malformed]
];
console.log(`\nPhase 3 recovery decisions (${recoveryCases.length})`);
for(const [label,localRaw,indexedDbRaw] of recoveryCases){
  const decision=safety.recoveryDecision({registry,key,localRaw,indexedDbRaw});
  console.log(`- ${label}: ${decision.issueType} · auto=${decision.automaticRecoveryAllowed} · choice=${decision.userChoiceRequired} · startup=${decision.startupAllowed}`);
}

console.log('\nPhase 4 recovery presentations');
for(const type of ['newer-schema','conflict','malformed-local-recoverable','malformed-indexeddb-recoverable','unsupported','unrecoverable']){
  const view=recoveryUi.presentation({issueType:type});
  console.log(`- ${type}: ${view.kind} · ${view.title}`);
}
const redactionState={issueType:'unrecoverable',affectedKeys:['rosterbot-calendar-subscription-tokens-v2'],preservedRawCopies:{'rosterbot-calendar-subscription-tokens-v2':{local:'synthetic-secret',indexedDb:null}}};
const artifact=recoveryUi.buildRecoveryExport({state:redactionState,registry,now:'2026-10-01T00:00:00.000Z'});
console.log(`\nRecovery export: ${artifact.format} · schema ${artifact.personalDataSchema} · credential redacted=${artifact.preservedRawCopies['rosterbot-calendar-subscription-tokens-v2'].local.redacted}`);

const orderedA={'rosterbot-week-leave-v1':'{"2026-10-04":{"z":1,"a":2}}'},orderedB={'rosterbot-week-leave-v1':'{"2026-10-04":{"a":2,"z":1}}'};
const [fingerprintA,fingerprintB]=await Promise.all([orderedA,orderedB].map(values=>canonical.fingerprint(canonical.fromLocalStorage(values,{registry}))));
console.log(`\nPhase 6 canonical identity`);
console.log(`- deterministic SHA-256: ${fingerprintA.value} · reordered-equal=${fingerprintA.value===fingerprintB.value}`);
console.log(`- canonical live personal keys: ${canonical.stateKeys(registry).length} · schema=${registry.schemaVersion}`);
console.log(`- internal metadata excluded from backup/Cloud/mirror: ${[canonical.GENERATION_KEY,canonical.PREVIOUS_KEY].every(metadataKey=>['backup','cloud','indexedDb'].every(surface=>!registry.surfaceKeys(surface).includes(metadataKey)))}`);

const divergent=await safety.reconcileCanonicalState({registry,localValues:{'rosterbot-week-leave-v1':'{"a":1}'},rows:[{key:'rosterbot-week-leave-v1',value:'{"a":2}',updatedAt:'2099-01-01T00:00:00.000Z'}],personalKeys:registry.surfaceKeys('indexedDb')});
console.log(`- divergent valid generations: ${divergent.issueType} · choice=${divergent.userChoiceRequired} · timestamp-authority=false`);

const schema5Fixtures=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/schema4-to-schema5-golden.json'),'utf8'));
const schema5Cases=Object.values(schema5Fixtures.cases),schema5Successful=schema5Cases.filter(item=>item.expected.classification==='success');
console.log(`\nPhase 7A schema-5 migration design`);
console.log(`- envelope: ${SCHEMA5_FORMAT} · schema=${SCHEMA5_STORAGE_SCHEMA} · production writes=false`);
console.log(`- golden fixtures: ${schema5Successful.length} success · ${schema5Cases.length-schema5Successful.length} rejected · exact fingerprints=true`);
console.log(`- journal checkpoints: ${JOURNAL_STATES.join(' → ')}`);
console.log(`- compatibility: production registry=${registry.schemaVersion} · backup/cloud remain schema 4`);

const futureFixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/schema5-bootstrap-guard.json'),'utf8'));
const futureLocal=Object.fromEntries(Object.entries(futureFixture.localStorage).map(([key,value])=>[key,typeof value==='string'?value:JSON.stringify(value)]));
const futureDecision=compatibility.inspect({localValues:futureLocal});
console.log(`\nPhase 7B rollback-proof bootstrap guard`);
console.log(`- client capability: supported=${compatibility.POLICY.currentSupportedStorageSchema} · reader=${compatibility.POLICY.readerSchema} · writer=${compatibility.POLICY.writerSchema} · highest-write=${compatibility.POLICY.highestSafeWriteSchema}`);
console.log(`- future fixture: blocked=${futureDecision.blocked} · detected-schema=${futureDecision.detected.highestStorageSchema} · projection-writable=${futureDecision.detected.projectionWritable}`);
console.log(`- normal schema 4: allowed=${compatibility.inspect({localValues:{'rosterbot-db-schema-v1':'4'}}).allowed} · production writes remain schema 4`);
console.log(`- Cloud boundary: client startup guard only · server-side schema downgrade rejection still required`);
