import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

if(process.env.PHASE6_ENABLE_HOSTED_BETA!=='1')throw new Error('Set PHASE6_ENABLE_HOSTED_BETA=1 to contact the isolated beta origin.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),origin='https://beta.rosterbot.work';
const playwrightRoot=process.env.PHASE10A_PLAYWRIGHT_ROOT||'/private/tmp/rosterbot-phase10a-browser/node_modules/playwright-core';
const {chromium}=await import(pathToFileURL(path.join(playwrightRoot,'index.mjs'))),executablePath=process.env.PHASE10A_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase10a-browser-states.json'),'utf8')).scenarios.longLivedOfficial.localStorage;
const reviewedBundle=process.env.PHASE6_BETA_BUNDLE_DIR||'/private/tmp/rosterbot-v031-phase6-bundle';
const deployMarker=process.env.PHASE6_BETA_DEPLOY_MARKER||'601c587';
const expected=JSON.parse(fs.readFileSync(path.join(reviewedBundle,'rosterbot-build-manifest.json'),'utf8'));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-phase6-hosted-beta-')),requests=[];
function watch(context){context.on('request',request=>{const url=new URL(request.url());requests.push(url.href);assert(!url.href.includes('rithmbggiiusrmdcqrif'),'production Supabase contact');assert(!url.href.startsWith('https://rosterbot.work'),'production origin contact')})}
async function launch(){const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath,viewport:{width:390,height:844},serviceWorkers:'allow'});watch(context);return context}
async function ready(page){await page.waitForFunction(id=>window.__rosterbotApplicationReady===true&&window.RosterBotBuild?.buildId===id,expected.buildId,{timeout:30000})}
async function snapshot(page){return page.evaluate(()=>{const raw=localStorage.getItem('rosterbot-personal-state-v1'),envelope=raw?JSON.parse(raw):null;return {raw,generation:envelope?.generation?.number??null,fingerprint:envelope?.generation?.fingerprint??null,buildId:window.RosterBotBuild?.buildId,ready:window.__rosterbotApplicationReady,shell:window.RosterBotOfflineShell?.getStatus?.()}})}
let context;
try{
  context=await launch();let page=context.pages()[0]||await context.newPage();
  await page.goto(`${origin}/phase6-seed.html?phase6=${encodeURIComponent(deployMarker)}`,{waitUntil:'domcontentloaded'});
  await page.evaluate(values=>{localStorage.clear();sessionStorage.clear();for(const [key,value]of Object.entries(values))localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))},fixture);
  await page.goto(`${origin}/?phase6=${encodeURIComponent(deployMarker)}`,{waitUntil:'domcontentloaded'});await ready(page);await page.waitForFunction(()=>localStorage.getItem('rosterbot-db-schema-v1')==='5',{timeout:30000});
  await page.waitForFunction(async id=>{const r=await navigator.serviceWorker.getRegistration('/');return r?.active?.state==='activated'&&window.RosterBotOfflineShell?.getStatus?.().cacheComplete===true&&window.RosterBotOfflineShell?.getStatus?.().buildId===id},expected.buildId,{timeout:120000});
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);await page.waitForFunction(id=>window.RosterBotOfflineShell?.getStatus?.().cacheComplete===true&&window.RosterBotOfflineShell?.getStatus?.().buildId===id,expected.buildId,{timeout:30000});
  const online=await snapshot(page);assert.equal(online.buildId,expected.buildId);assert.equal(online.shell?.cacheComplete,true);
  await page.screenshot({path:'/private/tmp/rosterbot-phase6-beta-iphone-portrait.png',fullPage:true});
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await ready(page);const offline=await snapshot(page);assert.equal(offline.raw,online.raw);
  await page.locator('#v29NavRoster').click();await page.locator('#v29ViewRosterBtn').click();await page.locator('#v31RosterFortnight').click();await page.evaluate(()=>window.RosterBotSchema5Persistence.syncNow('phase6-navigation-settled'));const editBefore=await snapshot(page);const details=page.locator('.fortnight-notes:visible').first();if(!(await details.getAttribute('open')))await details.locator('summary').click();const note=details.locator('textarea[data-fn-note]'),marker='Phase 6 hosted offline local edit';await note.fill(marker);await page.waitForFunction(before=>JSON.parse(localStorage.getItem('rosterbot-personal-state-v1')).generation.number===before+1,editBefore.generation,{timeout:10000});const edited=await snapshot(page);assert.match(await note.inputValue(),/Phase 6 hosted offline local edit/);assert.equal(edited.generation,editBefore.generation+1);
  await page.reload({waitUntil:'domcontentloaded'});await ready(page);const offlineReload=await snapshot(page);assert.equal(offlineReload.generation,edited.generation);assert.match(await page.evaluate(()=>localStorage.getItem('rosterbot-fortnight-notes-v1')||''),/Phase 6 hosted offline local edit/);
  await context.close();context=await launch();await context.setOffline(true);page=context.pages()[0]||await context.newPage();await page.goto(`${origin}/`,{waitUntil:'domcontentloaded'});await ready(page);const reopen=await snapshot(page);assert.equal(reopen.raw,edited.raw);assert.equal(reopen.generation,edited.generation);
  await context.setOffline(false);await page.reload({waitUntil:'domcontentloaded'});await ready(page);const reconnected=await snapshot(page);assert.equal(reconnected.raw,edited.raw);assert.equal(reconnected.generation,edited.generation);
  const productionContacts=requests.filter(url=>url.includes('rithmbggiiusrmdcqrif')||url.startsWith('https://rosterbot.work')).length,stagingContacts=requests.filter(url=>url.includes('wuzyurvrztskljpxpeaq')).length;
  assert.equal(productionContacts,0);
  console.log(JSON.stringify({phase:'v0.31 Phase 6 hosted beta Chromium',buildId:expected.buildId,serviceWorkerComplete:true,onlineGeneration:online.generation,coldOffline:true,offlineReload:true,navigationSettledGeneration:editBefore.generation,offlineEditGeneration:[editBefore.generation,edited.generation],closeReopenOffline:true,reconnectedLocalStateStable:true,productionContacts,stagingContacts,screenshot:'/private/tmp/rosterbot-phase6-beta-iphone-portrait.png'},null,2));
}finally{await context?.close();fs.rmSync(profile,{recursive:true,force:true})}
