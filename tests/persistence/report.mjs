import {createRequire} from 'node:module';
import {root} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const report=registry.report();

console.log(`Persistence registry: ${report.itemCount} items · schema ${registry.schemaVersion} · ${registry.mode}`);
for(const [name,keys] of Object.entries(report.disagreements)){
  console.log(`\n${name} (${keys.length})`);
  const details=new Map(report.disagreementDetails[name].map(item=>[item.key,item.classification]));
  for(const key of keys)console.log(`- ${key} [${details.get(key)}]`);
}
console.log(`\nPhase 2 corrections (${report.corrections.length})`);
for(const item of report.corrections)console.log(`- ${item.key} [${item.classification}] ${item.resolution}`);
