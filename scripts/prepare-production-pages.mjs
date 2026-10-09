import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile, mkdir, readdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=process.argv[2]?path.resolve(process.argv[2]):null;
const productionDomain='rosterbot.work';
const productionOrigin='https://rosterbot.work';
const productionAlias='https://www.rosterbot.work';
const productionProjectRef='rithmbggiiusrmdcqrif';
const productionProjectUrl=`https://${productionProjectRef}.supabase.co`;
const productionPublishableKey='sb_publishable_TnrRQNNVqPbLq_JkNgu9Zg_--0mqp4B';
const stagingProjectRef='wuzyurvrztskljpxpeaq';
const stagingProjectUrl=`https://${stagingProjectRef}.supabase.co`;
const stagingOrigin='https://beta.rosterbot.work';
const directories=['css','data','js'];

if(!destination){
  console.error('Usage: node scripts/prepare-production-pages.mjs <empty-output-directory>');
  process.exit(2);
}
if(destination===sourceRoot||sourceRoot.startsWith(destination+path.sep))throw new Error('Output must not be the source worktree or one of its parents.');

await mkdir(destination,{recursive:true});
if((await readdir(destination)).length)throw new Error(`Refusing to overwrite non-empty output directory: ${destination}`);

const copied=[];
async function copy(relative){
  const source=path.join(sourceRoot,relative),target=path.join(destination,relative),details=await stat(source);
  if(!details.isFile())throw new Error(`Production input is not a regular file: ${relative}`);
  await mkdir(path.dirname(target),{recursive:true});
  await copyFile(source,target);
  copied.push(relative);
}

await copy('.nojekyll');
await copy('CNAME');
await copy('index.html');
for(const directory of directories){
  const entries=await readdir(path.join(sourceRoot,directory),{withFileTypes:true});
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
    if(!entry.isFile())throw new Error(`Unexpected non-file in runtime directory: ${directory}/${entry.name}`);
    await copy(`${directory}/${entry.name}`);
  }
}

assert.equal((await readFile(path.join(destination,'CNAME'),'utf8')).trim(),productionDomain,'Production CNAME changed.');
const index=await readFile(path.join(destination,'index.html'),'utf8');
assert.match(index,/<title>RosterBot 🤖 v0\.30\.0<\/title>/,'Production title is not v0.30.0.');
for(const match of index.matchAll(/(?:src|href)="([^"#?]+)"/g)){
  const reference=match[1];
  if(/^[a-z]+:/i.test(reference)||reference.startsWith('//'))continue;
  assert((await stat(path.join(destination,reference))).isFile(),`Missing local asset referenced by index.html: ${reference}`);
}

const profile=await readFile(path.join(destination,'js/05-cloud-deployment-profile.js'),'utf8');
for(const required of ["deployment:'production'","environment:'production'",`projectRef:'${productionProjectRef}'`,`url:'${productionProjectUrl}'`,`publishableKey:'${productionPublishableKey}'`,"allowedOrigins:Object.freeze(['https://rosterbot.work','https://www.rosterbot.work'])","allowSavedConfiguration:false","fallbackToEmbedded:false","requestedCloudSchema:5"])assert(profile.includes(required),`Production profile is missing: ${required}`);
const cloud=await readFile(path.join(destination,'js/51-cloud-sync.js'),'utf8');
const gate=await readFile(path.join(destination,'js/07-cloud-schema5.js'),'utf8');
for(const required of ['SCHEMA5_CLOUD_HOLD','requireCloudTransferAllowed','get_roster_schema_capability','new_schema_version:schemaVersion','replaceFromSchema5Envelope'])assert(cloud.includes(required),`Schema-5 Cloud safety path is missing: ${required}`);
for(const required of ['rosterbot-schema5-cloud-v1','context.fixedBinding===true','value.environment!==context?.profile?.environment','value.project_ref!==context?.profile?.projectRef'])assert(gate.includes(required),`Production capability attestation gate is missing: ${required}`);

const runtimeText=(await Promise.all(copied.map(async relative=>`${relative}\n${await readFile(path.join(destination,relative),'utf8')}`))).join('\n');
for(const forbidden of [stagingProjectRef,stagingProjectUrl,stagingOrigin])assert(!runtimeText.includes(forbidden),`Staging identifier leaked into production bundle: ${forbidden}`);
for(const required of [productionOrigin,productionAlias,productionProjectRef,productionProjectUrl,productionPublishableKey])assert(runtimeText.includes(required),`Required production value is missing: ${required}`);
assert(!/sb_secret_[A-Za-z0-9_-]{10,}/i.test(runtimeText),'A Supabase secret key is present in the production bundle.');
assert(!/\bsb(?:p|_pat)_[A-Za-z0-9_-]{10,}/i.test(runtimeText),'A Supabase management/personal access token is present in the production bundle.');
assert(!/\bpostgres(?:ql)?:\/\//i.test(runtimeText),'A database connection string is present in the production bundle.');
assert.equal((runtimeText.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]).length,0,'A JWT credential is present in the production bundle.');
const publishableCandidates=runtimeText.match(/sb_publishable_[A-Za-z0-9_-]{20,}/g)||[];
assert.deepEqual([...new Set(publishableCandidates)],[productionPublishableKey],'Production bundle must contain exactly one distinct browser credential.');
for(const forbiddenRoot of ['tests/','supabase/','backend-capture/','docs/','scripts/'])assert(!copied.some(relative=>relative.startsWith(forbiddenRoot)),`${forbiddenRoot} leaked into production runtime files.`);
assert(!/(phase10c|synthetic-user|example\.invalid|PHASE10A_ENABLE_HOSTED_PRODUCTION)/i.test(runtimeText),'A temporary Phase 10 harness or synthetic-account marker leaked into production runtime content.');

const checksums=[];
for(const relative of copied.sort()){
  const bytes=await readFile(path.join(destination,relative));
  checksums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${relative}`);
}
await writeFile(path.join(destination,'SHA256SUMS.txt'),`${checksums.join('\n')}\n`,'utf8');

console.log(JSON.stringify({
  destination,
  release:'v0.30.0',
  customDomain:productionDomain,
  cloudBinding:{environment:'production',origins:[productionOrigin,productionAlias],projectRef:productionProjectRef,url:productionProjectUrl,requestedCloudSchema:5},
  credentialAudit:{browserSafePublishableKeys:1,jwtCredentials:0,secretCredentials:0,managementOrPersonalAccessTokens:0,databaseConnectionStrings:0,privilegedCredentials:0},
  stagingIdentifierAudit:{projectRef:false,url:false,origin:false,additionalPublishableCredential:false},
  savedConfigurationIgnored:true,
  fallbackDisabled:true,
  cloudCapabilityRelease:'fresh-authenticated-production-schema5-attestation-required',
  excludedSourceRoots:['tests','supabase','backend-capture','docs','scripts'],
  files:copied.length+1
},null,2));
