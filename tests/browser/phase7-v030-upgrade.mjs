import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const candidateRoot=path.resolve(process.env.PHASE7_V031_DIR||root);
const baseline='f56960de45246574db2ff753bca0521827af3338';
assert.equal(execFileSync('git',['rev-parse','v0.30.0^{commit}'],{cwd:root,encoding:'utf8'}).trim(),baseline);

const playwrightRoot=process.env.PHASE10A_PLAYWRIGHT_ROOT||'/private/tmp/rosterbot-phase10a-browser/node_modules/playwright-core';
const {chromium}=await import(pathToFileURL(path.join(playwrightRoot,'index.mjs')));
const executablePath=process.env.PHASE10A_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase10a-browser-states.json'),'utf8')).scenarios.longLivedOfficial.localStorage;
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-phase7-v030-upgrade-'));
const v030Root=path.join(tempRoot,'v030'),archive=path.join(tempRoot,'v030.tar');
fs.mkdirSync(v030Root);
execFileSync('git',['archive','--format=tar','-o',archive,'v0.30.0'],{cwd:root});
execFileSync('tar',['-xf',archive,'-C',v030Root]);

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
let activeRoot=v030Root;
const requests=[];
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1');
  requests.push({method:request.method,path:url.pathname,root:activeRoot===v030Root?'v0.30':'v0.31'});
  if(url.pathname==='/seed.html'){response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});response.end('<!doctype html><title>RosterBot upgrade seed</title>');return}
  const relative=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.resolve(activeRoot,relative);
  if(!file.startsWith(activeRoot+path.sep)){response.writeHead(403).end();return}
  fs.readFile(file,(error,bytes)=>{if(error){response.writeHead(404).end();return}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store','service-worker-allowed':'/'});response.end(bytes)});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;

function launch(profile){return chromium.launchPersistentContext(profile,{headless:true,executablePath,viewport:{width:390,height:844},locale:'en-AU',timezoneId:'Australia/Melbourne',serviceWorkers:'allow'})}
async function ready(page,{build=false}={}){await page.waitForFunction(expectBuild=>window.__rosterbotApplicationReady===true&&localStorage.getItem('rosterbot-db-schema-v1')==='5'&&(!expectBuild||window.RosterBotBuild?.applicationVersion==='0.31.0'),build,{timeout:60000})}
async function idbEnvelope(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('RosterBotPersonalDB',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('kv')){db.close();resolve(null);return}const tx=db.transaction('kv','readonly'),query=tx.objectStore('kv').get('rosterbot-personal-state-v1');query.onsuccess=()=>{db.close();resolve(query.result?.value??null)};query.onerror=()=>reject(query.error)}}))}
async function snapshot(page){return page.evaluate(async()=>{const raw=localStorage.getItem('rosterbot-personal-state-v1'),envelope=JSON.parse(raw),candidate=window.RosterBotCanonicalPersistence.fromLocalStorage(localStorage,{registry:window.RosterBotPersistenceRegistry}),fingerprint=await window.RosterBotCanonicalPersistence.fingerprint(candidate);return {raw,generation:envelope.generation.number,fingerprint:fingerprint.value,projectionFingerprint:envelope.compatibility.projectionFingerprint,theme:localStorage.getItem('rosterbot-theme-v1.9'),view:localStorage.getItem('rosterbot-view-mode-v1'),crypto:window.RosterBotCloudSync?.cryptoDiagnostics?.()||null}})}
async function seed(page,encrypted){
  await page.goto(`${origin}/seed.html`);
  await page.evaluate(({values,encrypted})=>{localStorage.clear();sessionStorage.clear();for(const [key,value] of Object.entries(values))localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));if(encrypted){const uid='00000000-0000-4000-8000-000000000031',keyId='phase7-remembered-key',bytes=Uint8Array.from({length:32},(_,index)=>index+1),encoded=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');localStorage.setItem('rosterbot-cloud-session-persistent-v1',JSON.stringify({access_token:'synthetic-phase7-access',refresh_token:'synthetic-phase7-refresh',expires_at:4102444800,user:{id:uid,email:'phase7@example.invalid'}}));localStorage.setItem('rosterbot-cloud-auto-v1','0');localStorage.setItem('rosterbot-cloud-crypto-profile-v1',JSON.stringify({[uid]:{version:1,cipher:'AES-GCM-256',keyId}}));localStorage.setItem('rosterbot-cloud-device-key-v1',JSON.stringify({[uid]:{keyId,key:encoded,savedAt:'2026-10-18T00:00:00.000Z'}}))}}, {values:fixture,encrypted});
}

const results=[];
try{
  for(const variant of ['plaintext','encrypted']){
    activeRoot=v030Root;
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),`rosterbot-phase7-${variant}-`));
    let context=await launch(profile),page=context.pages()[0]||await context.newPage();
    await seed(page,variant==='encrypted');
    await page.goto(`${origin}/`);await ready(page);
    if(variant==='encrypted')await page.reload(),await ready(page);
    const noWorker=await page.evaluate(async()=>({registrations:(await navigator.serviceWorker.getRegistrations()).length,caches:(await caches.keys()).length,controller:!!navigator.serviceWorker.controller}));
    assert.deepEqual(noWorker,{registrations:0,caches:0,controller:false});
    const before=await snapshot(page),beforeIdb=await idbEnvelope(page);
    assert.equal(before.raw,beforeIdb);
    if(variant==='encrypted'){assert.equal(before.crypto.state,'unlocked',JSON.stringify(before.crypto));assert(before.crypto.events.some(event=>event.reason==='restored-remembered-key'))}

    const requestBoundary=requests.length;activeRoot=candidateRoot;
    await page.reload({waitUntil:'domcontentloaded'});await ready(page,{build:true});
    await page.waitForFunction(()=>window.RosterBotOfflineShell?.getStatus?.().cacheComplete===true,{timeout:120000});
    const installed=await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration('/'),status=window.RosterBotOfflineShell.getStatus();return {controller:!!navigator.serviceWorker.controller,active:registration?.active?.state,waiting:registration?.waiting?.state||null,status,cacheNames:await caches.keys(),buildId:window.RosterBotBuild.buildId,cacheNamespace:window.RosterBotBuild.cacheNamespace}});
    assert.equal(installed.controller,true);assert.equal(installed.active,'activated');assert.equal(installed.waiting,null);assert.equal(installed.status.cacheComplete,true);assert.equal(installed.status.buildId,installed.buildId);assert(installed.cacheNames.includes(installed.cacheNamespace));
    const after=await snapshot(page),afterIdb=await idbEnvelope(page);
    assert.equal(after.raw,before.raw);assert.equal(afterIdb,beforeIdb);assert.equal(after.generation,before.generation);assert.equal(after.fingerprint,before.fingerprint);assert.equal(after.projectionFingerprint,before.projectionFingerprint);assert.equal(after.theme,before.theme);assert.equal(after.view,before.view);
    if(variant==='encrypted'){assert.equal(after.crypto.state,'unlocked');assert(after.crypto.events.some(event=>event.reason==='restored-remembered-key'))}
    const cloudWrites=requests.slice(requestBoundary).filter(item=>item.method!=='GET'&&/auth|rest|rpc|roster|history/i.test(item.path));assert.equal(cloudWrites.length,0);

    await page.reload({waitUntil:'domcontentloaded'});await ready(page,{build:true});
    const reloaded=await snapshot(page);assert.equal(reloaded.raw,before.raw);assert.equal(reloaded.generation,before.generation);assert.equal(reloaded.fingerprint,before.fingerprint);
    await context.close();

    context=await launch(profile);await context.setOffline(true);page=context.pages()[0]||await context.newPage();
    await page.goto(`${origin}/`,{waitUntil:'domcontentloaded'});await ready(page,{build:true});
    const offline=await snapshot(page);assert.equal(offline.raw,before.raw);assert.equal(offline.generation,before.generation);assert.equal(offline.fingerprint,before.fingerprint);
    if(variant==='encrypted')assert.equal(offline.crypto.state,'unlocked');
    results.push({variant,generation:[before.generation,after.generation,reloaded.generation,offline.generation],fingerprintStable:before.fingerprint===offline.fingerprint,noWorkerBefore:true,completeCache:true,firstPageCoherent:installed.buildId,cloudWrites:cloudWrites.length,reloadCoherent:true,coldOffline:true,encryptionContext:variant==='encrypted'?offline.crypto.state:'not-applicable'});
    await context.close();fs.rmSync(profile,{recursive:true,force:true});
  }
  console.log(JSON.stringify({phase:'v0.31 Phase 7 v0.30-to-v0.31 browser rehearsal',baseline,results,productionContacts:0,stagingContacts:0},null,2));
}finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(tempRoot,{recursive:true,force:true})}
