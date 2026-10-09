import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url),gate=require(`${root}/js/07-cloud-schema5.js`);
const generator=path.join(root,'scripts/prepare-production-pages.mjs');
const PRODUCTION_REF='rithmbggiiusrmdcqrif',PRODUCTION_URL=`https://${PRODUCTION_REF}.supabase.co`;
const PRODUCTION_KEY='sb_publishable_TnrRQNNVqPbLq_JkNgu9Zg_--0mqp4B';
const STAGING_REF='wuzyurvrztskljpxpeaq',STAGING_URL=`https://${STAGING_REF}.supabase.co`;

function filesBelow(directory,prefix=''){
  const result=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=path.join(prefix,entry.name),absolute=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...filesBelow(absolute,relative));else result.push(relative);
  }
  return result;
}

function prepare(){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-production-pages-')),output=path.join(parent,'bundle');
  const prepared=spawnSync(process.execPath,[generator,output],{cwd:root,encoding:'utf8'});
  return {parent,output,prepared};
}

function runtimeFrom(output,origin='https://rosterbot.work'){
  const window={location:{origin},atob:value=>Buffer.from(value,'base64').toString('binary')};
  const context=vm.createContext({window,URL});
  vm.runInContext(fs.readFileSync(path.join(output,'js/05-cloud-deployment-profile.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(output,'js/06-cloud-config.js'),'utf8'),context);
  return {profile:window.RosterBotCloudDeploymentProfile,api:window.RosterBotCloudConfig};
}

test('production bundle is runtime-only v0.30.0 and contains one production browser binding',()=>{
  const {parent,output,prepared}=prepare();
  try{
    assert.equal(prepared.status,0,prepared.stderr||prepared.stdout);
    const report=JSON.parse(prepared.stdout),published=new Set(filesBelow(output));
    assert.equal(fs.readFileSync(path.join(output,'CNAME'),'utf8').trim(),'rosterbot.work');
    assert.match(fs.readFileSync(path.join(output,'index.html'),'utf8'),/<title>RosterBot 🤖 v0\.30\.0<\/title>/);
    for(const forbidden of ['docs','tests','supabase','backend-capture','scripts','.git'])assert(![...published].some(file=>file===forbidden||file.startsWith(`${forbidden}${path.sep}`)),`${forbidden} leaked into production bundle`);
    const bytes=Buffer.concat([...published].map(file=>fs.readFileSync(path.join(output,file)))).toString('utf8');
    assert(bytes.includes(PRODUCTION_REF));assert(bytes.includes(PRODUCTION_URL));assert(bytes.includes(PRODUCTION_KEY));
    assert(!bytes.includes(STAGING_REF));assert(!bytes.includes(STAGING_URL));assert(!bytes.includes('https://beta.rosterbot.work'));
    assert.deepEqual([...new Set(bytes.match(/sb_publishable_[A-Za-z0-9_-]{20,}/g)||[])],[PRODUCTION_KEY]);
    assert.deepEqual(report.credentialAudit,{browserSafePublishableKeys:1,jwtCredentials:0,secretCredentials:0,managementOrPersonalAccessTokens:0,databaseConnectionStrings:0,privilegedCredentials:0});
    assert.deepEqual(report.stagingIdentifierAudit,{projectRef:false,url:false,origin:false,additionalPublishableCredential:false});
    assert.equal(report.savedConfigurationIgnored,true);assert.equal(report.fallbackDisabled,true);assert.equal(report.files,published.size);
  }finally{fs.rmSync(parent,{recursive:true,force:true})}
});

test('production profile is fixed, origin-bound, and cannot be redirected by saved staging configuration',()=>{
  const {parent,output,prepared}=prepare();
  try{
    assert.equal(prepared.status,0,prepared.stderr||prepared.stdout);
    const {profile,api}=runtimeFrom(output),saved=JSON.stringify({url:STAGING_URL,key:'sb_publishable_StagingRedirectFixture_12345'});
    assert.deepEqual(JSON.parse(JSON.stringify(profile)),{version:1,deployment:'production',environment:'production',projectRef:PRODUCTION_REF,url:PRODUCTION_URL,publishableKey:PRODUCTION_KEY,allowedOrigins:['https://rosterbot.work','https://www.rosterbot.work'],allowSavedConfiguration:false,fallbackToEmbedded:false,requestedCloudSchema:5});
    for(const origin of ['https://rosterbot.work','https://www.rosterbot.work']){
      const resolved=api.resolve({profile,origin,savedRaw:saved});assert.equal(resolved.enabled,true);assert.equal(resolved.fixedBinding,true);assert.deepEqual(JSON.parse(JSON.stringify(resolved.config)),{url:PRODUCTION_URL,key:PRODUCTION_KEY});
      assert.equal(api.assertRequest(resolved,`${PRODUCTION_URL}/rest/v1/roster_state`,origin),true);
      assert.throws(()=>api.assertRequest(resolved,`${STAGING_URL}/rest/v1/roster_state`,origin),error=>error.code==='CLOUD_REQUEST_PROJECT_MISMATCH');
    }
    for(const origin of ['https://beta.rosterbot.work','http://localhost:8765','https://rosterbot.work.example']){
      const resolved=api.resolve({profile,origin,savedRaw:saved});assert.equal(resolved.enabled,false);assert.equal(resolved.config,null);assert.equal(resolved.reason,'production-origin-mismatch');
    }
  }finally{fs.rmSync(parent,{recursive:true,force:true})}
});

test('production schema-5 grant requires a fresh exact production attestation',async()=>{
  const profile={version:1,deployment:'production',environment:'production',projectRef:PRODUCTION_REF,url:PRODUCTION_URL,publishableKey:PRODUCTION_KEY,allowedOrigins:['https://rosterbot.work','https://www.rosterbot.work'],allowSavedConfiguration:false,fallbackToEmbedded:false,requestedCloudSchema:5};
  const context={profile,config:{url:PRODUCTION_URL,key:PRODUCTION_KEY},origin:'https://rosterbot.work',enabled:true,fixedBinding:true,userId:'synthetic-production-contract-user',accessToken:'synthetic-production-contract-session'};
  const attestation={contract:gate.CONTRACT,environment:'production',max_writable_schema:5,min_writable_schema:4,project_ref:PRODUCTION_REF},state=gate.createCapabilityState();
  assert.equal(state.isGranted(context),false);
  await assert.rejects(()=>state.attest(async()=>({...attestation,max_writable_schema:4}),context));assert.equal(state.isGranted(context),false);
  await assert.rejects(()=>state.attest(async()=>({...attestation,project_ref:STAGING_REF}),context));assert.equal(state.isGranted(context),false);
  assert.deepEqual(await state.attest(async()=>attestation,context),attestation);assert.equal(state.isGranted(context),true);
  state.revoke('logout');assert.equal(state.isGranted(context),false);
});

test('production generator refuses a missing or non-empty destination',()=>{
  const missing=spawnSync(process.execPath,[generator],{cwd:root,encoding:'utf8'});assert.notEqual(missing.status,0);assert.match(missing.stderr,/Usage:/);
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-production-pages-reject-')),output=path.join(parent,'bundle');
  try{fs.mkdirSync(output);fs.writeFileSync(path.join(output,'existing'),'do not overwrite');const result=spawnSync(process.execPath,[generator,output],{cwd:root,encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/Refusing to overwrite non-empty output directory/)}finally{fs.rmSync(parent,{recursive:true,force:true})}
});

test('Phase 11A preflight is exact-production and read-only',()=>{
  const source=fs.readFileSync(path.join(root,'backend-capture/phase11a/production-preflight-readonly.mjs'),'utf8');
  assert.match(source,/PRODUCTION_REF='rithmbggiiusrmdcqrif'/);
  assert.match(source,/Refusing non-read-only production SQL/);
  assert.match(source,/path\.includes\(`\/projects\/\$\{PRODUCTION_REF\}`\)/);
  assert.match(source,/Potentially mutating token in production preflight/);
  assert.match(source,/attestation_function_present/);
  assert.doesNotMatch(source,/\/v1\/projects\/\$\{STAGING_REF\}/);
});
