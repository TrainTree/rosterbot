#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const playwrightRoot=process.env.PHASE10A_PLAYWRIGHT_ROOT||'/tmp/rosterbot-phase10a-browser/node_modules/playwright-core';
const {chromium}=await import(pathToFileURL(path.join(playwrightRoot,'index.mjs')));
const executablePath=process.env.PHASE10A_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const BETA_ORIGIN='https://beta.rosterbot.work',STAGING_REF='wuzyurvrztskljpxpeaq',STAGING_ORIGIN=`https://${STAGING_REF}.supabase.co`,PRODUCTION_REF='rithmbggiiusrmdcqrif';
const KEY='sb_publishable_Phase10bLocalBrowserFixture_12345',USER_ID='00000000-0000-4000-8000-00000000010b',TOKEN='synthetic-local-browser-token';
const profileScript=`(function(root){'use strict';const profile=Object.freeze({version:1,deployment:'beta-staging',environment:'isolated-staging',projectRef:'${STAGING_REF}',url:'${STAGING_ORIGIN}',publishableKey:'${KEY}',allowedOrigins:Object.freeze(['${BETA_ORIGIN}']),allowSavedConfiguration:false,fallbackToEmbedded:false,requestedCloudSchema:5});Object.defineProperty(root,'RosterBotCloudDeploymentProfile',{value:profile,writable:false,configurable:false,enumerable:true})})(window);`;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const state={maximum:4,row:null,history:[],requests:[],saves:[],unexpected:[],forceConflict:false};

function session(){return {access_token:TOKEN,refresh_token:'synthetic-refresh',expires_at:4102444800,token_type:'bearer',user:{id:USER_ID,email:'phase10b-local@example.invalid'}}}
function json(route,status,body){return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})}
async function routeRequest(route){
  const request=route.request(),url=new URL(request.url());state.requests.push({url:url.href,method:request.method()});
  if(url.origin===BETA_ORIGIN){
    let relative=decodeURIComponent(url.pathname);if(relative==='/'||relative==='/index.html')relative='/index.html';
    if(relative==='/js/05-cloud-deployment-profile.js')return route.fulfill({status:200,contentType:'text/javascript',body:profileScript});
    const absolute=path.resolve(root,'.'+relative);if(!absolute.startsWith(root+path.sep)||!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())return route.fulfill({status:404,body:'not found'});
    return route.fulfill({status:200,contentType:mime[path.extname(absolute)]||'application/octet-stream',body:fs.readFileSync(absolute)});
  }
  if(url.origin===STAGING_ORIGIN){
    assert.equal(request.headers().apikey,KEY);assert.equal(request.headers().authorization,`Bearer ${TOKEN}`);
    if(url.pathname==='/rest/v1/rpc/get_roster_schema_capability')return json(route,200,{environment:'isolated-staging',project_ref:STAGING_REF,contract:'rosterbot-schema5-cloud-v1',min_writable_schema:4,max_writable_schema:state.maximum});
    if(url.pathname==='/rest/v1/roster_state')return json(route,200,state.row?[state.row]:[]);
    if(url.pathname==='/rest/v1/roster_revisions')return json(route,200,state.history);
    if(url.pathname==='/rest/v1/rpc/save_roster_state'){
      const body=request.postDataJSON();state.saves.push(structuredClone(body));
      if(state.forceConflict||Number(body.expected_revision)!==Number(state.row?.revision||0))return json(route,409,{code:'RB003',message:'revision_conflict',details:`expected_revision=${body.expected_revision} current_revision=${state.row?.revision||0}`});
      const revision=Number(state.row?.revision||0)+1,updated_at=new Date(1760000000000+revision*1000).toISOString();state.row={user_id:USER_ID,revision,schema_version:body.new_schema_version,payload:body.new_payload,client_id:body.new_client_id,updated_at};state.history.unshift({...state.row,created_at:updated_at});return json(route,200,[{revision,updated_at}]);
    }
    if(url.pathname==='/rest/v1/rpc/purge_unencrypted_roster_history')return json(route,200,[{deleted_count:Math.max(0,state.history.length-1)}]);
    if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204,body:''});
    if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password')return json(route,200,session());
    state.unexpected.push(url.href);return json(route,404,{message:'unexpected synthetic endpoint'});
  }
  state.unexpected.push(url.href);return route.abort('blockedbyclient');
}

async function launch(){
  const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'rb-phase10b-local-')),{headless:true,executablePath,viewport:{width:900,height:1000},locale:'en-AU',timezoneId:'Australia/Melbourne'});
  await context.addInitScript(({sessionValue})=>{if(location.origin==='https://beta.rosterbot.work'){localStorage.setItem('rosterbot-cloud-session-persistent-v1',JSON.stringify(sessionValue));localStorage.setItem('rosterbot-cloud-auto-v1','0')}},{sessionValue:session()});
  const page=context.pages()[0]||await context.newPage();await page.route('**/*',routeRequest);return {context,page};
}
async function ready(page){await page.goto(`${BETA_ORIGIN}/index.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__rosterbotApplicationReady===true&&!!window.RosterBotCloudSync&&!!window.RosterBotSchema5Persistence,{timeout:30000});await page.waitForFunction(()=>localStorage.getItem('rosterbot-db-schema-v1')==='5',{timeout:30000})}

let editedFingerprint='';
const first=await launch();
try{
  await ready(first.page);await first.page.waitForFunction(()=>window.RosterBotCloudSync.capabilityStatus()?.reason==='attestation-schema-range',{timeout:15000});
  assert.equal(await first.page.evaluate(()=>window.RosterBotCloudSync.summary().schema5CapabilityHold),true);
  assert.equal(state.requests.filter(item=>/\/rest\/v1\/(?:roster_state|roster_revisions)|save_roster_state/.test(item.url)).length,0,'capability 4 emitted roster transfer traffic');

  state.maximum=5;
  const attestation=await first.page.evaluate(()=>window.RosterBotCloudSync.attestSchema5Capability());
  assert.deepEqual(attestation,{environment:'isolated-staging',project_ref:STAGING_REF,contract:'rosterbot-schema5-cloud-v1',min_writable_schema:4,max_writable_schema:5});
  assert.equal(await first.page.evaluate(()=>window.RosterBotCloudSync.summary().schema5CapabilityHold),false);
  await first.page.evaluate(()=>window.RosterBotCloudSync.syncNow());
  assert.equal(state.saves.length,1);assert.equal(state.saves[0].expected_revision,0);assert.equal(state.saves[0].new_schema_version,5);assert.equal(state.saves[0].new_payload.format,'rosterbot-personal-state');assert.equal(state.row.revision,1);assert.equal(state.history.length,1);
  const firstFingerprint=state.saves[0].new_payload.generation.fingerprint;

  await first.page.evaluate(async()=>{const rows=JSON.parse(localStorage.getItem('rosterbot-timeline-v1')||'[]');rows.push({id:'phase10b-local-edit',startWC:'2027-01-03',mode:'single',trackA:{depot:'SCS',roster:'A',line:9},trackB:null,createdAt:'2026-10-08T10:00:00.000Z',source:'synthetic browser test'});localStorage.setItem('rosterbot-timeline-v1',JSON.stringify(rows));await window.RosterBotSchema5Persistence.syncNow('phase10b-browser-edit')});
  state.forceConflict=true;await first.page.evaluate(()=>window.RosterBotCloudSync.syncNow());state.forceConflict=false;
  assert.equal(state.row.revision,1);assert.equal(state.saves.at(-1).expected_revision,1,'conflict upload did not use the authoritative expected revision');
  const savesAfterConflict=state.saves.length;
  state.maximum=4;await first.page.evaluate(()=>window.RosterBotCloudSync.revokeSchema5Capability('synthetic-capability-change'));await first.page.evaluate(()=>window.RosterBotCloudSync.syncNow());
  assert.equal(state.saves.length,savesAfterConflict,'capability failure emitted a write');assert.equal(await first.page.evaluate(()=>window.RosterBotCloudSync.summary().schema5CapabilityHold),true);

  state.maximum=5;await first.page.evaluate(()=>window.RosterBotCloudSync.attestSchema5Capability());await first.page.evaluate(()=>window.RosterBotCloudSync.syncNow());assert.equal(state.row.revision,2);editedFingerprint=state.row.payload.generation.fingerprint;
  await first.page.evaluate(()=>window.RosterBotDataUI.showCloud());await first.page.click('#cloudEnableEncryption');await first.page.fill('#cloudEncryptionPassphrase','Phase10B-local-passphrase!');await first.page.fill('#cloudEncryptionPassphraseConfirm','Phase10B-local-passphrase!');await first.page.click('#cloudGenerateRecovery');await first.page.waitForFunction(()=>document.getElementById('cloudRecoveryKeyValue')?.textContent?.startsWith('RBK1-'),{timeout:15000});await first.page.check('#cloudRecoverySaved');await first.page.click('#cloudCommitEncryption');await first.page.waitForFunction(()=>window.RosterBotCloudSync.summary().encryption==='unlocked'&&window.RosterBotCloudSync.summary().revision===3,{timeout:30000});
  assert.equal(state.row.schema_version,5);assert.equal(state.row.payload.format,'rosterbot-encrypted-v1');assert.equal(state.row.payload.schemaVersion,5);assert.match(state.row.payload.crypto.fingerprint,/^[a-f0-9]{64}$/);assert.notEqual(state.row.payload.crypto.fingerprint,firstFingerprint);assert.equal(state.history.length,3);
}finally{await first.context.close()}

const second=await launch();
try{
  await ready(second.page);await second.page.waitForFunction(()=>window.RosterBotCloudSync.summary().revision===3,{timeout:15000});
  assert.equal(await second.page.evaluate(()=>window.RosterBotCloudSync.summary().encryption),'locked');
  await second.page.evaluate(()=>window.RosterBotDataUI.showCloud());await second.page.click('#cloudUnlockEncryption');await second.page.fill('#cloudUnlockSecret','Phase10B-local-passphrase!');await second.page.click('#cloudUnlockSubmit');await second.page.waitForFunction(()=>window.RosterBotCloudSync.summary().encryption==='unlocked',{timeout:30000});
  const encrypted=structuredClone(state.row.payload);await second.page.evaluate(async payload=>window.RosterBotCloudSync.applyPayload(payload,{baseRevision:3,direction:'synthetic-fresh-device',schemaVersion:5}),encrypted);
  const restored=await second.page.evaluate(()=>JSON.parse(localStorage.getItem('rosterbot-personal-state-v1')));
  assert.equal(restored.storageSchemaVersion,5);assert.equal(restored.generation.fingerprint,editedFingerprint);
  assert.equal((await second.page.evaluate(()=>window.RosterBotCloudSync.capabilityStatus())).granted,true);
}finally{await second.context.close()}

assert.equal(state.unexpected.length,0,JSON.stringify(state.unexpected));assert.equal(state.requests.some(item=>item.url.includes(PRODUCTION_REF)),false);
console.log(JSON.stringify({phase:'10B-step7A-local-browser',attestations:state.requests.filter(item=>item.url.includes('get_roster_schema_capability')).length,save_attempts:state.saves.length,accepted_revisions:state.history.length,plaintext_schema5:'pass',encrypted_schema5:'pass',capability4_zero_transfer:'pass',expected_revision_conflict:'pass',fresh_device_restore:'pass',production_contacts:0},null,2));
