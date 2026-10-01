import {createRequire} from 'node:module';
import {root} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
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
