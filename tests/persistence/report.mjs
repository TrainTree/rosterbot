import {createRequire} from 'node:module';
import {root} from './helpers.mjs';

const require=createRequire(import.meta.url);
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
for(const type of ['conflict','malformed-local-recoverable','malformed-indexeddb-recoverable','unsupported','unrecoverable']){
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
