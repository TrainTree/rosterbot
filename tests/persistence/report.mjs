import {createRequire} from 'node:module';
import {root} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const report=registry.report();

console.log(`Persistence registry: ${report.itemCount} items · schema ${registry.schemaVersion} · ${registry.mode}`);
for(const [name,keys] of Object.entries(report.disagreements)){
  console.log(`\n${name} (${keys.length})`);
  for(const key of keys)console.log(`- ${key}`);
}
