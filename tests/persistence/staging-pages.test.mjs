import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const generator=path.join(root,'scripts/prepare-staging-pages.mjs');
const STAGING_REF='wuzyurvrztskljpxpeaq';
const STAGING_URL=`https://${STAGING_REF}.supabase.co`;
const BETA_ORIGIN='https://beta.rosterbot.work';
const TEST_KEY='sb_publishable_Phase10bBrowserSafeFixture_12345';
const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const PRODUCTION_URL=`https://${PRODUCTION_REF}.supabase.co`;
const PRODUCTION_KEY='sb_publishable_TnrRQNNVqPbLq_JkNgu9Zg_--0mqp4B';

function filesBelow(directory,prefix=''){
  const result=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=path.join(prefix,entry.name),absolute=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...filesBelow(absolute,relative));
    else result.push(relative);
  }
  return result;
}

function prepare(key=TEST_KEY){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-pages-test-')),output=path.join(parent,'bundle');
  const prepared=spawnSync(process.execPath,[generator,output],{cwd:root,encoding:'utf8',env:{...process.env,PHASE10B_BETA_PUBLISHABLE_KEY:key}});
  return {parent,output,prepared};
}

function runtimeFrom(output){
  const window={location:{origin:BETA_ORIGIN},atob:value=>Buffer.from(value,'base64').toString('binary')};
  const context=vm.createContext({window,URL});
  vm.runInContext(fs.readFileSync(path.join(output,'js/05-cloud-deployment-profile.js'),'utf8'),context,{filename:'05-cloud-deployment-profile.js'});
  vm.runInContext(fs.readFileSync(path.join(output,'js/06-cloud-config.js'),'utf8'),context,{filename:'06-cloud-config.js'});
  return {profile:window.RosterBotCloudDeploymentProfile,api:window.RosterBotCloudConfig};
}

test('beta Pages bundle contains only the exact staging deployment profile',()=>{
  const {parent,output,prepared}=prepare();
  try{
    assert.equal(prepared.status,0,prepared.stderr||prepared.stdout);
    assert.equal(fs.readFileSync(path.join(output,'CNAME'),'utf8'),'beta.rosterbot.work\n');
    assert.equal(fs.readFileSync(path.join(output,'index.html'),'utf8'),fs.readFileSync(path.join(root,'index.html'),'utf8'));
    for(const directory of ['css','data','js']){
      const sourceFiles=filesBelow(path.join(root,directory)),outputFiles=filesBelow(path.join(output,directory));
      assert.deepEqual(outputFiles,sourceFiles);
      for(const file of sourceFiles){
        if(file==='05-cloud-deployment-profile.js')continue;
        assert.deepEqual(fs.readFileSync(path.join(output,directory,file)),fs.readFileSync(path.join(root,directory,file)));
      }
    }
    const published=new Set(filesBelow(output));
    for(const forbidden of ['docs','tests','supabase','backend-capture','.git'])assert(![...published].some(file=>file===forbidden||file.startsWith(`${forbidden}${path.sep}`)),`${forbidden} leaked into the Pages bundle`);
    const bytes=Buffer.concat([...published].map(file=>fs.readFileSync(path.join(output,file)))).toString('utf8');
    for(const forbidden of [PRODUCTION_REF,PRODUCTION_URL,PRODUCTION_KEY])assert(!bytes.includes(forbidden),`${forbidden} leaked into beta`);
    for(const required of [STAGING_REF,STAGING_URL,BETA_ORIGIN,TEST_KEY,'isolated-staging'])assert(bytes.includes(required),`${required} missing from beta`);
    assert(!/sb_secret_[A-Za-z0-9_-]{10,}/i.test(bytes));
    assert(!/\bsb(?:p|_pat)_[A-Za-z0-9_-]{10,}/i.test(bytes));
    assert(!/\bpostgres(?:ql)?:\/\//i.test(bytes));
    assert(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(bytes));
    const {profile}=runtimeFrom(output);
    assert.deepEqual(JSON.parse(JSON.stringify(profile)),{version:1,deployment:'beta-staging',environment:'isolated-staging',projectRef:STAGING_REF,url:STAGING_URL,publishableKey:TEST_KEY,allowedOrigins:[BETA_ORIGIN],allowSavedConfiguration:false,fallbackToEmbedded:false,requestedCloudSchema:5});
    const report=JSON.parse(prepared.stdout);
    assert.deepEqual(report.productionIdentifierAudit,{projectRef:false,url:false,publishableKey:false});
    assert.deepEqual(report.credentialAudit,{browserSafePublishableKeys:1,jwtCredentials:0,secretCredentials:0,managementOrPersonalAccessTokens:0,databaseConnectionStrings:0,privilegedCredentials:0});
  }finally{fs.rmSync(parent,{recursive:true,force:true})}
});

test('beta binding ignores saved production configuration and accepts only the exact beta origin',()=>{
  const {parent,output,prepared}=prepare();
  try{
    assert.equal(prepared.status,0,prepared.stderr||prepared.stdout);
    const {profile,api}=runtimeFrom(output),saved=JSON.stringify({url:PRODUCTION_URL,key:PRODUCTION_KEY});
    const exact=api.resolve({profile,origin:BETA_ORIGIN,savedRaw:saved});
    assert.equal(exact.enabled,true);assert.deepEqual(JSON.parse(JSON.stringify(exact.config)),{url:STAGING_URL,key:TEST_KEY});assert.equal(exact.fixedBinding,true);
    for(const origin of ['https://rosterbot.work','https://www.rosterbot.work','http://beta.rosterbot.work','https://beta.rosterbot.work.example','http://localhost:8765']){
      const result=api.resolve({profile,origin,savedRaw:saved});assert.equal(result.enabled,false,origin);assert.equal(result.config,null,origin);assert.equal(result.reason,'beta-origin-mismatch',origin);
    }
    assert.throws(()=>api.assertRequest(exact,`${PRODUCTION_URL}/rest/v1/roster_state`,BETA_ORIGIN),error=>error.code==='CLOUD_REQUEST_PROJECT_MISMATCH');
    assert.equal(api.assertRequest(exact,`${STAGING_URL}/rest/v1/roster_state`,BETA_ORIGIN),true);
  }finally{fs.rmSync(parent,{recursive:true,force:true})}
});

test('missing, incomplete, malformed, mismatched and forged beta profiles fail closed',()=>{
  const {parent,output,prepared}=prepare();
  try{
    assert.equal(prepared.status,0,prepared.stderr||prepared.stdout);
    const {profile,api}=runtimeFrom(output),cases=[
      null,
      {},
      {...profile,publishableKey:''},
      {...profile,publishableKey:'sb_secret_forbiddenCredential123456'},
      {...profile,projectRef:'aaaaaaaaaaaaaaaaaaaa'},
      {...profile,url:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co'},
      {...profile,allowedOrigins:['https://rosterbot.work']},
      {...profile,allowSavedConfiguration:true},
      {...profile,fallbackToEmbedded:true},
      {...profile,clientCapability:5}
    ];
    for(const candidate of cases){const result=api.resolve({profile:candidate,origin:BETA_ORIGIN,savedRaw:JSON.stringify({url:PRODUCTION_URL,key:PRODUCTION_KEY})});assert.equal(result.enabled,false);assert.equal(result.config,null)}
  }finally{fs.rmSync(parent,{recursive:true,force:true})}
});

test('generator refuses missing, malformed and privileged credentials before creating a bundle',()=>{
  for(const key of ['', 'not-a-key','sb_secret_forbiddenCredential123456','service_role_forbiddenCredential123456']){
    const parent=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-pages-reject-')),output=path.join(parent,'bundle');
    try{
      const env={...process.env};if(key)env.PHASE10B_BETA_PUBLISHABLE_KEY=key;else delete env.PHASE10B_BETA_PUBLISHABLE_KEY;
      const result=spawnSync(process.execPath,[generator,output],{cwd:root,encoding:'utf8',env});
      assert.notEqual(result.status,0,key);assert.match(result.stderr,/browser-safe sb_publishable_ credential/);assert.equal(fs.existsSync(output),false);
    }finally{fs.rmSync(parent,{recursive:true,force:true})}
  }
});

test('ordinary production deployment and manual development fallback remain unchanged',()=>{
  const window={location:{origin:'https://rosterbot.work'},atob:value=>Buffer.from(value,'base64').toString('binary')},context=vm.createContext({window,URL});
  vm.runInContext(fs.readFileSync(path.join(root,'js/05-cloud-deployment-profile.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,'js/06-cloud-config.js'),'utf8'),context);
  const profile=window.RosterBotCloudDeploymentProfile,api=window.RosterBotCloudConfig,embedded={url:PRODUCTION_URL,key:PRODUCTION_KEY};
  assert.deepEqual(JSON.parse(JSON.stringify(api.resolve({profile,origin:'https://rosterbot.work'}).config)),embedded);
  assert.deepEqual(JSON.parse(JSON.stringify(api.resolve({profile,origin:'https://www.rosterbot.work'}).config)),embedded);
  assert.deepEqual(JSON.parse(JSON.stringify(api.resolve({profile,origin:'http://localhost:8765'}).config)),embedded);
  const manual={url:'https://abcdefghijklmnopqrst.supabase.co',key:'sb_publishable_ManualDevelopmentFixture_123'};
  assert.deepEqual(JSON.parse(JSON.stringify(api.resolve({profile,origin:'http://localhost:8765',savedRaw:JSON.stringify(manual)}).config)),manual);
});

test('beta profile schema request and forged client claims cannot release the capability-4 hold',()=>{
  const cloud=fs.readFileSync(path.join(root,'js/51-cloud-sync.js'),'utf8');
  assert.match(cloud,/const SCHEMA5_CLOUD_HOLD=localStorage\.getItem\('rosterbot-db-schema-v1'\)==='5'\|\|localStorage\.getItem\('rosterbot-personal-state-v1'\)!=null/);
  assert.match(cloud,/async function rpcSave\([^)]*\)\{requireCloudTransferAllowed\(\)/);
  assert.match(cloud,/async function applyPayload\([^)]*\}\s*=\s*\{\}\)\{\s*requireCloudTransferAllowed\(\)/);
  assert.match(cloud,/async function rotateEncryptionWrappers\([^)]*\)\{requireCloudTransferAllowed\(\)/);
  assert.doesNotMatch(cloud,/get_roster_schema_capability|new_schema_version:5|requestedCloudSchema.*SCHEMA5_CLOUD_HOLD/);
});
