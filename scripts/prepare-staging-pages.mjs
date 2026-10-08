import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile, mkdir, readdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=process.argv[2]?path.resolve(process.argv[2]):null;
const stagingDomain='beta.rosterbot.work';
const directories=['css','data','js'];

if(!destination){
  console.error('Usage: node scripts/prepare-staging-pages.mjs <empty-output-directory>');
  process.exit(2);
}
if(destination===sourceRoot||sourceRoot.startsWith(destination+path.sep))throw new Error('Output must not be the source worktree or one of its parents.');

await mkdir(destination,{recursive:true});
const existing=await readdir(destination);
if(existing.length)throw new Error(`Refusing to overwrite non-empty output directory: ${destination}`);

const copied=[];
async function copy(relative){
  const source=path.join(sourceRoot,relative),target=path.join(destination,relative),details=await stat(source);
  if(!details.isFile())throw new Error(`Staging input is not a regular file: ${relative}`);
  await mkdir(path.dirname(target),{recursive:true});
  await copyFile(source,target);
  copied.push(relative);
}

await copy('.nojekyll');
await copy('index.html');
for(const directory of directories){
  const entries=await readdir(path.join(sourceRoot,directory),{withFileTypes:true});
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
    if(!entry.isFile())throw new Error(`Unexpected non-file in runtime directory: ${directory}/${entry.name}`);
    await copy(`${directory}/${entry.name}`);
  }
}

await writeFile(path.join(destination,'CNAME'),`${stagingDomain}\n`,'utf8');
copied.push('CNAME');

const index=await readFile(path.join(destination,'index.html'),'utf8');
for(const match of index.matchAll(/(?:src|href)="([^"#?]+)"/g)){
  const reference=match[1];
  if(/^[a-z]+:/i.test(reference)||reference.startsWith('//'))continue;
  assert((await stat(path.join(destination,reference))).isFile(),`Missing local asset referenced by index.html: ${reference}`);
}

const cloud=await readFile(path.join(destination,'js/51-cloud-sync.js'),'utf8');
assert.match(cloud,/SCHEMA5_CLOUD_HOLD/,'Schema-5 Cloud hold is missing from the staging bundle.');
assert.match(cloud,/server capability remains 4/,'Production Cloud capability-4 hold message is missing from the staging bundle.');
assert.match(cloud,/requireCloudTransferAllowed/,'Cloud transfer guard is missing from the staging bundle.');

const checksums=[];
for(const relative of copied.sort()){
  const bytes=await readFile(path.join(destination,relative));
  checksums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${relative}`);
}
await writeFile(path.join(destination,'SHA256SUMS.txt'),`${checksums.join('\n')}\n`,'utf8');

console.log(JSON.stringify({destination,customDomain:stagingDomain,files:copied.length+1,cloudCapabilityHold:4},null,2));
