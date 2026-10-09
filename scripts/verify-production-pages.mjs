import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const candidate=process.argv[2]?path.resolve(process.argv[2]):null;
const origin='https://rosterbot.work';
if(!candidate){console.error('Usage: node scripts/verify-production-pages.mjs <reviewed-production-bundle>');process.exit(2)}

const manifest=await readFile(path.join(candidate,'SHA256SUMS.txt'),'utf8');
const expected=new Map();
for(const line of manifest.trim().split('\n')){
  const match=/^([a-f0-9]{64})  (.+)$/.exec(line);assert(match,`Invalid checksum line: ${line}`);expected.set(match[2],match[1]);
}
assert(expected.has('index.html')&&expected.has('js/05-cloud-deployment-profile.js')&&expected.has('js/51-cloud-sync.js'),'Candidate manifest is missing required runtime assets.');

const failures=[];
for(const [relative,hash] of expected){
  const target=new URL(relative,`${origin}/`);assert.equal(target.origin,origin,'Refusing a non-production verification target.');
  const response=await fetch(target,{headers:{'cache-control':'no-cache'}}),bytes=new Uint8Array(await response.arrayBuffer()),actual=createHash('sha256').update(bytes).digest('hex');
  if(!response.ok||actual!==hash)failures.push({file:relative,status:response.status,expected:hash,actual});
}
console.log(JSON.stringify({origin,files:expected.size,matched:expected.size-failures.length,failures,productionSupabaseContacts:0},null,2));
if(failures.length)process.exitCode=1;
