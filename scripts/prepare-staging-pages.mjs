import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile, mkdir, readdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=process.argv[2]?path.resolve(process.argv[2]):null;
const stagingDomain='beta.rosterbot.work';
const stagingOrigin='https://beta.rosterbot.work';
const stagingProjectRef='wuzyurvrztskljpxpeaq';
const stagingProjectUrl=`https://${stagingProjectRef}.supabase.co`;
const productionProjectRef='rithmbggiiusrmdcqrif';
const productionProjectUrl=`https://${productionProjectRef}.supabase.co`;
const productionPublishableKey='sb_publishable_TnrRQNNVqPbLq_JkNgu9Zg_--0mqp4B';
const publishableKey=String(process.env.PHASE10B_BETA_PUBLISHABLE_KEY||'').trim();
const directories=['css','data','js'];

if(!destination){
  console.error('Usage: PHASE10B_BETA_PUBLISHABLE_KEY=sb_publishable_... node scripts/prepare-staging-pages.mjs <empty-output-directory>');
  process.exit(2);
}
if(destination===sourceRoot||sourceRoot.startsWith(destination+path.sep))throw new Error('Output must not be the source worktree or one of its parents.');
if(!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publishableKey))throw new Error('PHASE10B_BETA_PUBLISHABLE_KEY must be the staging browser-safe sb_publishable_ credential. Missing, anon-JWT, secret, service-role and malformed credentials are refused.');

const betaProfile=Object.freeze({
  version:1,
  deployment:'beta-staging',
  environment:'isolated-staging',
  projectRef:stagingProjectRef,
  url:stagingProjectUrl,
  publishableKey,
  allowedOrigins:Object.freeze([stagingOrigin]),
  allowSavedConfiguration:false,
  fallbackToEmbedded:false,
  requestedCloudSchema:5
});
const betaProfileScript=`(function(root){\n  'use strict';\n  const profile=Object.freeze(${JSON.stringify(betaProfile)});\n  Object.freeze(profile.allowedOrigins);\n  Object.defineProperty(root,'RosterBotCloudDeploymentProfile',{value:profile,writable:false,configurable:false,enumerable:true});\n})(window);\n`;

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

await writeFile(path.join(destination,'js/05-cloud-deployment-profile.js'),betaProfileScript,'utf8');

await writeFile(path.join(destination,'CNAME'),`${stagingDomain}\n`,'utf8');
copied.push('CNAME');

const index=await readFile(path.join(destination,'index.html'),'utf8');
for(const match of index.matchAll(/(?:src|href)="([^"#?]+)"/g)){
  const reference=match[1];
  if(/^[a-z]+:/i.test(reference)||reference.startsWith('//'))continue;
  assert((await stat(path.join(destination,reference))).isFile(),`Missing local asset referenced by index.html: ${reference}`);
}

const cloud=await readFile(path.join(destination,'js/51-cloud-sync.js'),'utf8');
const cloudSchema5=await readFile(path.join(destination,'js/07-cloud-schema5.js'),'utf8');
assert.match(cloud,/SCHEMA5_CLOUD_HOLD/,'Schema-5 Cloud hold is missing from the staging bundle.');
assert.match(cloud,/requireCloudTransferAllowed/,'Cloud transfer guard is missing from the staging bundle.');
assert.match(cloud,/get_roster_schema_capability/,'Authenticated capability attestation is missing from the staging bundle.');
assert.match(cloud,/new_schema_version:schemaVersion/,'Schema-5 save wire path is missing from the staging bundle.');
assert.match(cloud,/replaceFromSchema5Envelope/,'Transactional schema-5 restore path is missing from the staging bundle.');
for(const value of ['rosterbot-schema5-cloud-v1','context.fixedBinding===true','value.environment!==context?.profile?.environment','value.project_ref!==context?.profile?.projectRef'])assert(cloudSchema5.includes(value),`Schema-5 capability gate is missing profile-bound validation: ${value}`);
assert(!cloudSchema5.includes(stagingProjectRef),'Shared schema-5 gate must not hard-code the staging project.');
assert(!cloudSchema5.includes(stagingOrigin),'Shared schema-5 gate must not hard-code the beta origin.');

const runtimeFiles=copied.filter(relative=>relative!=='CNAME');
const runtimeText=(await Promise.all(runtimeFiles.map(async relative=>`${relative}\n${await readFile(path.join(destination,relative),'utf8')}`))).join('\n');
for(const forbidden of [productionProjectRef,productionProjectUrl,productionPublishableKey])assert(!runtimeText.includes(forbidden),`Production Supabase identifier leaked into beta bundle: ${forbidden}`);
for(const required of [stagingOrigin,stagingProjectRef,stagingProjectUrl,publishableKey,'isolated-staging'])assert(runtimeText.includes(required),`Required beta staging value is missing: ${required}`);
assert(!/sb_secret_[A-Za-z0-9_-]{10,}/i.test(runtimeText),'A Supabase secret key is present in the beta bundle.');
assert(!/\bsb(?:p|_pat)_[A-Za-z0-9_-]{10,}/i.test(runtimeText),'A Supabase management/personal access token is present in the beta bundle.');
assert(!/\bpostgres(?:ql)?:\/\//i.test(runtimeText),'A database connection string is present in the beta bundle.');
const jwtCandidates=runtimeText.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[];
assert.equal(jwtCandidates.length,0,'A JWT credential is present; Step 5 embeds only the modern staging publishable key.');
const publishableCandidates=runtimeText.match(/sb_publishable_[A-Za-z0-9_-]{20,}/g)||[];
assert.deepEqual([...new Set(publishableCandidates)],[publishableKey],'The generated bundle must contain exactly one distinct browser credential: the supplied staging publishable key.');

const checksums=[];
for(const relative of copied.sort()){
  const bytes=await readFile(path.join(destination,relative));
  checksums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${relative}`);
}
await writeFile(path.join(destination,'SHA256SUMS.txt'),`${checksums.join('\n')}\n`,'utf8');

console.log(JSON.stringify({
  destination,
  customDomain:stagingDomain,
  cloudBinding:{environment:'isolated-staging',origin:stagingOrigin,projectRef:stagingProjectRef,url:stagingProjectUrl,publishableKey,requestedCloudSchema:5},
  credentialAudit:{browserSafePublishableKeys:1,jwtCredentials:0,secretCredentials:0,managementOrPersonalAccessTokens:0,databaseConnectionStrings:0,privilegedCredentials:0},
  productionIdentifierAudit:{projectRef:false,url:false,publishableKey:false},
  savedConfigurationIgnored:true,
  cloudCapabilityRelease:'fresh-authenticated-schema5-attestation-required',
  files:copied.length+1
},null,2));
