import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {RUNTIME_SOURCE_ASSETS} from '../../scripts/runtime-assets.mjs';
import {generateRuntimeBuild} from '../../scripts/runtime-build.mjs';
import {generateServiceWorker} from '../../scripts/service-worker-build.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const playwrightRoot=process.env.PHASE10A_PLAYWRIGHT_ROOT||'/private/tmp/rosterbot-phase10a-browser/node_modules/playwright-core';
const {chromium}=await import(pathToFileURL(path.join(playwrightRoot,'index.mjs')));
const executablePath=process.env.PHASE10A_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase10a-browser-states.json'),'utf8')).scenarios.longLivedOfficial.localStorage;

const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-phase3-builds-')),buildB=path.join(tempRoot,'build-b');fs.mkdirSync(buildB,{recursive:true});
for(const relative of RUNTIME_SOURCE_ASSETS){const target=path.join(buildB,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,relative),target)}
const bManifestPath=path.join(buildB,'manifest.webmanifest'),bPwaManifest=JSON.parse(fs.readFileSync(bManifestPath,'utf8'));bPwaManifest.description+=' Synthetic build-B update fixture.';fs.writeFileSync(bManifestPath,`${JSON.stringify(bPwaManifest,null,2)}\n`);
const generatedB=await generateRuntimeBuild(buildB,{write:true});await generateServiceWorker(buildB,{manifest:generatedB.manifest,write:true});
const buildA=JSON.parse(fs.readFileSync(path.join(root,'rosterbot-build-manifest.json'),'utf8')),requests=[];let activeRoot=root,activeLabel='A';
function safeFile(base,relative){const resolved=path.resolve(base,relative.replace(/^\/+/,''));return resolved===base||resolved.startsWith(base+path.sep)?resolved:null}
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1'),relative=url.pathname==='/'?'index.html':url.pathname.replace(/^\/+/,''),file=safeFile(activeRoot,relative);requests.push({build:activeLabel,path:url.pathname});
  if(relative==='seed.html'){response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});response.end('<!doctype html><title>seed</title>');return}
  if(!file){response.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){response.writeHead(error.code==='ENOENT'?404:500);response.end(error.message);return}const headers={'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':relative==='service-worker.js'?'no-cache, no-store':'no-store'};if(relative==='service-worker.js')headers['service-worker-allowed']='/';response.writeHead(200,headers);response.end(data)});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const origin=`http://127.0.0.1:${server.address().port}`;

const browserRequests=[];
async function launch(profile){const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath,viewport:{width:390,height:844},locale:'en-AU',timezoneId:'Australia/Melbourne',serviceWorkers:'allow'});context.on('request',request=>browserRequests.push(request.url()));return context}
async function pageFor(context){return context.pages()[0]||context.newPage()}
async function ready(page){await page.waitForFunction(()=>window.__rosterbotApplicationReady===true&&window.__rosterbotLocalReady===true&&localStorage.getItem('rosterbot-db-schema-v1')==='5',{timeout:30000})}
async function offlineReady(page){
  await page.waitForFunction(async()=>{try{const registration=await navigator.serviceWorker.getRegistration(location.href),state=await window.RosterBotOfflineShell?.refresh?.();return state?.cacheComplete===true&&navigator.serviceWorker.controller&&registration?.active?.state==='activated'}catch(_){return false}},{timeout:30000});
  await page.waitForTimeout(1500);
  return page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration(location.href);return {...window.RosterBotOfflineShell.getStatus(),native:{active:registration?.active?.state||null,installing:registration?.installing?.state||null,waiting:registration?.waiting?.state||null,controller:navigator.serviceWorker.controller?.state||null}}});
}
function raw(value){return typeof value==='string'?value:JSON.stringify(value)}
async function seed(page){await page.goto(`${origin}/seed.html`);await page.evaluate(values=>{localStorage.clear();sessionStorage.clear();for(const [key,value] of Object.entries(values))localStorage.setItem(key,value)},Object.fromEntries(Object.entries(fixture).map(([key,value])=>[key,raw(value)])))}
async function snapshot(page){return page.evaluate(()=>{
  const envelope=JSON.parse(localStorage.getItem('rosterbot-personal-state-v1')),notes=JSON.parse(localStorage.getItem('rosterbot-fortnight-notes-v1')||'{}'),session=JSON.parse(localStorage.getItem('rosterbot-session-settings-v1')||'{}'),timeline=JSON.parse(localStorage.getItem('rosterbot-timeline-v1')||'[]'),leave=JSON.parse(localStorage.getItem('rosterbot-diary-annual-leave-v1')||'[]');
  let pay=null,date='2025-01-05';for(let index=0;index<50&&!pay?.available;index++,date=window.RosterEngine.addDays(date,14))pay=window.PayBotCombined?.previewFortnight?.(date)||null;
  const rosterWeek=window.RosterEngine?.buildWeeks?.(window.ROSTER_DATA,{...session,viewStartDate:'2026-09-20',timelineMode:'diary',rosterTimeline:timeline,annualLeaveWeeks:leave},1)?.[0]||null;
  return {buildId:window.RosterBotBuild.buildId,generation:envelope.generation.number,fingerprint:envelope.generation.fingerprint,envelope:localStorage.getItem('rosterbot-personal-state-v1'),notes,marker:localStorage.getItem('rosterbot-db-schema-v1'),startupFailure:document.getElementById('appStartup')?.dataset.startupFailure||'',rosterWeek:rosterWeek?{wcDate:rosterWeek.wcDate,roster:rosterWeek.roster,line:rosterWeek.line,timelineMissing:!!rosterWeek.timelineMissing,days:rosterWeek.days?.length||0}:null,globals:{roster:!!window.RosterEngine,diary:!!window.RosterBotDiary,pay:!!window.PayBotCombined,dataset:!!window.ROSTERBOT_OFFICIAL_DATA&&!!window.ROSTER_DATA,payDataset:!!window.ROSTERBOT_PAY_RATE_DATA&&!!window.PayRateOfficial},pay};
})}
async function cachedMarker(page,manifest){return page.evaluate(async manifest=>{if(!(await caches.keys()).includes(manifest.cacheNamespace))return null;const cache=await caches.open(manifest.cacheNamespace),markerRequest=(await cache.keys()).find(request=>new URL(request.url).pathname.includes('/.rosterbot/complete/'));if(!markerRequest)return null;const response=await cache.match(markerRequest);return response?.ok?response.json():null},manifest)}
async function waitForWaitingBuild(page,manifest,timeout=120000){
  const started=Date.now();let stableSince=0,last=null;
  while(Date.now()-started<timeout){
    last=await page.evaluate(async({cacheName,buildId})=>{const registration=await navigator.serviceWorker.getRegistration(location.href),names=await caches.keys();let marker=null;if(names.includes(cacheName)){const cache=await caches.open(cacheName),request=(await cache.keys()).find(item=>new URL(item.url).pathname.includes('/.rosterbot/complete/'));if(request)try{marker=await (await cache.match(request)).json()}catch(_){}}return {active:registration?.active?.state||null,installing:registration?.installing?.state||null,waiting:registration?.waiting?.state||null,names,marker,complete:marker?.buildId===buildId}}, {cacheName:manifest.cacheNamespace,buildId:manifest.buildId});
    if(last.complete&&last.waiting&&!last.installing){if(!stableSince)stableSince=Date.now();if(Date.now()-stableSince>=2000)return last}else stableSince=0;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.fail(`Build B did not reach a stable complete waiting state: ${JSON.stringify(last)}`);
}

const result={initial:null,coldOffline:null,offlineReload:null,offlineEdit:null,upgrade:null,externalRequests:[]};
try{
  const offlineProfile=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-phase3-offline-profile-'));let context=await launch(offlineProfile),page=await pageFor(context);
  await seed(page);await page.goto(`${origin}/`,{waitUntil:'domcontentloaded'});await ready(page);const initialStatus=await offlineReady(page),initial=await snapshot(page),initialCaches=await page.evaluate(()=>caches.keys());
  assert.equal(initial.buildId,buildA.buildId);assert.equal(initial.marker,'5');assert(initial.globals.roster&&initial.globals.diary&&initial.globals.pay&&initial.globals.dataset&&initial.globals.payDataset,JSON.stringify(initial.globals));assert.equal(initial.pay?.available,true,JSON.stringify(initial.pay));assert.equal(initial.rosterWeek?.timelineMissing,false,JSON.stringify(initial.rosterWeek));assert.equal(initial.rosterWeek?.days,7);assert(initialCaches.includes(buildA.cacheNamespace));
  result.initial={buildId:initial.buildId,generation:initial.generation,cache:buildA.cacheNamespace,offlineRequired:buildA.assets.filter(asset=>asset.criticality!=='cosmetic').length};
  await context.close();const beforeOfflineRequests=requests.length;

  context=await launch(offlineProfile);await context.setOffline(true);await new Promise(resolve=>setTimeout(resolve,1500));page=await pageFor(context);await page.goto(`${origin}/`,{waitUntil:'domcontentloaded',timeout:15000});await ready(page);const cold=await snapshot(page),coldStatus=await offlineReady(page);
  assert.equal(requests.length,beforeOfflineRequests,'Cold offline launch reached the network server');assert.equal(cold.buildId,initial.buildId);assert.equal(cold.envelope,initial.envelope);assert.equal(cold.generation,initial.generation);assert.deepEqual(cold.globals,initial.globals);assert.equal(cold.pay.available,true);assert.equal(coldStatus.cacheComplete,true);assert.equal(cold.startupFailure,'');
  result.coldOffline={ready:true,buildId:cold.buildId,generation:cold.generation,networkRequests:0,roster:true,diary:true,pay:true};

  const beforeReloadRequests=requests.length;await page.reload({waitUntil:'domcontentloaded'});await ready(page);const reloaded=await snapshot(page);assert.equal(requests.length,beforeReloadRequests);assert.equal(reloaded.envelope,cold.envelope);assert.equal(reloaded.generation,cold.generation);result.offlineReload={ready:true,generation:reloaded.generation,networkRequests:0};

  await page.click('#v29NavRoster');await page.click('#v29ViewRosterBtn');await page.click('#v31RosterFortnight');await page.locator('.fortnight-notes summary:visible').first().click();const note=page.locator('textarea[data-fn-note]:visible').first();await note.waitFor({state:'visible',timeout:10000});const beforeEdit=await snapshot(page),marker='Phase 3 offline local edit';await note.fill(marker);assert.equal(await note.inputValue(),marker);await page.evaluate(()=>window.RosterBotSchema5Persistence.syncNow('phase3-offline-edit'));await page.waitForFunction(previous=>JSON.parse(localStorage.getItem('rosterbot-personal-state-v1')).generation.number===previous+1,beforeEdit.generation);const edited=await snapshot(page);assert.equal(edited.generation,beforeEdit.generation+1);assert(Object.values(edited.notes).includes(marker));
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);const persisted=await snapshot(page);assert.equal(persisted.generation,edited.generation);assert.equal(persisted.envelope,edited.envelope);assert(Object.values(persisted.notes).includes(marker));result.offlineEdit={generationBefore:beforeEdit.generation,generationAfter:edited.generation,persistedAfterReload:true};await context.close();fs.rmSync(offlineProfile,{recursive:true,force:true});

  activeRoot=root;activeLabel='A';const upgradeProfile=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-phase3-upgrade-profile-'));context=await launch(upgradeProfile);page=await pageFor(context);await seed(page);await page.goto(`${origin}/`,{waitUntil:'domcontentloaded'});await ready(page);await offlineReady(page);await page.waitForFunction(async()=>{const registration=await navigator.serviceWorker.getRegistration('/'),quiet=!!registration?.active&&!registration.installing&&!registration.waiting;if(!quiet){window.__rosterbotBuildAQuietSince=0;return false}if(!window.__rosterbotBuildAQuietSince)window.__rosterbotBuildAQuietSince=Date.now();return Date.now()-window.__rosterbotBuildAQuietSince>=2000},{},{timeout:30000,polling:100});const beforeUpgrade=await snapshot(page),aController=await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL||''),beforeNative=await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration('/');return {active:registration?.active?.state||null,installing:registration?.installing?.state||null,waiting:registration?.waiting?.state||null,caches:await caches.keys()}});assert(aController.endsWith('/service-worker.js'));assert.equal(beforeNative.waiting,null,JSON.stringify(beforeNative));assert.equal(beforeNative.installing,null,JSON.stringify(beforeNative));
  activeRoot=buildB;activeLabel='B';await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration(location.href);await registration.update()});const waitingState=await waitForWaitingBuild(page,generatedB.manifest),waitingMarker=waitingState.marker;assert.equal(waitingMarker?.buildId,generatedB.buildId);assert.equal(waitingMarker?.cacheName,generatedB.manifest.cacheNamespace);const status=await page.evaluate(()=>window.RosterBotOfflineShell.refresh());assert.equal(status.phase,'waiting');assert.equal(status.cacheComplete,true);
  const afterInstall=await snapshot(page),upgradeCaches=await page.evaluate(()=>caches.keys());assert.equal(afterInstall.envelope,beforeUpgrade.envelope);assert.equal(afterInstall.generation,beforeUpgrade.generation);assert(upgradeCaches.includes(buildA.cacheNamespace)&&upgradeCaches.includes(generatedB.manifest.cacheNamespace));
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);const stillA=await snapshot(page),stillWaiting=await page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration('/'))?.waiting);assert.equal(stillA.buildId,buildA.buildId);assert.equal(stillA.envelope,beforeUpgrade.envelope);assert.equal(stillWaiting,true);assert.equal((await cachedMarker(page,generatedB.manifest))?.buildId,generatedB.buildId);
  result.upgrade={activeBuild:stillA.buildId,waitingBuild:generatedB.buildId,waitingComplete:true,activeClientStayedCoherent:true,personalStateUnchanged:true,caches:upgradeCaches.filter(name=>name.startsWith('rosterbot-app-')).length};await context.close();fs.rmSync(upgradeProfile,{recursive:true,force:true});
  result.externalRequests=[...new Set(browserRequests.filter(value=>new URL(value).origin!==origin))];assert.deepEqual(result.externalRequests,[]);
  console.log(JSON.stringify({phase:'v0.31 Phase 3 real Chromium offline matrix',...result},null,2));
}finally{
  await new Promise(resolve=>server.close(resolve));fs.rmSync(tempRoot,{recursive:true,force:true});
}
