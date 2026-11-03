#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const playwrightRoot=process.env.PHASE10A_PLAYWRIGHT_ROOT||'/private/tmp/rosterbot-phase10a-browser/node_modules/playwright-core';
const {chromium}=await import(pathToFileURL(path.join(playwrightRoot,'index.mjs')));
const executablePath=process.env.PHASE10A_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase10a-browser-states.json'),'utf8')).scenarios.longLivedOfficial.localStorage;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.ico':'image/x-icon'};
const requests=[];
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://127.0.0.1'),relative=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.resolve(root,relative);requests.push(url.href);if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(data)})});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,executablePath});

try{
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'block'});
  context.on('request',request=>assert.equal(new URL(request.url()).origin,origin,`external request: ${request.url()}`));
  await context.addInitScript(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))},fixture);
  const page=await context.newPage();await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__rosterbotApplicationReady===true&&window.RosterBotSchema5Persistence?.isReady?.(),{timeout:30000});
  const before=await page.evaluate(()=>{const e=JSON.parse(localStorage.getItem('rosterbot-personal-state-v1'));return {generation:e.generation.number,fingerprint:e.generation.fingerprint,cloudMeta:localStorage.getItem('rosterbot-cloud-meta-v1')}});
  await page.evaluate(()=>window.RosterBotDataUI.show());assert.equal(await page.locator('#dataModal').isVisible(),true);assert.equal(await page.evaluate(()=>document.activeElement?.id),'dataCloseBtn');
  const text=await page.locator('#dataModal').innerText();for(const phrase of ['Your working copy is on this device','Keep a backup of my RosterBot','Use RosterBot on another device','Cloud Sync','Technical details'])assert.match(text,new RegExp(phrase,'i'));
  assert.match(text,/nothing is (?:being )?uploaded/i);assert.match(text,/point-in-time/i);assert.match(text,/multiple devices/i);
  await page.locator('#dataAnotherCloudBtn').click();assert.equal(await page.evaluate(()=>document.activeElement?.id),'cloudEmail');
  await page.locator('#dataTechnicalDetails > summary').click();assert.equal(await page.locator('#storageHealth').isVisible(),true);assert.match(await page.locator('#dataTechnicalDetails').innerText(),/Privacy evidence/);
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportDataBtn').click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.rosterbot$/);assert.match(await page.locator('#dataStatus').innerText(),/Keep the \.rosterbot file somewhere safe/i);
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');const geometry=await page.evaluate(()=>{const dialog=document.querySelector('#dataModal [role="dialog"]'),body=document.querySelector('#dataModal .data-body');return {pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,dialogWidth:dialog.getBoundingClientRect().width,viewport:innerWidth,bodyScroll:body.scrollHeight>=body.clientHeight}});assert(geometry.pageOverflow<=1,JSON.stringify(geometry));assert(geometry.dialogWidth<=geometry.viewport,JSON.stringify(geometry));
  await page.locator('#dataCloseBtn').click();assert.equal(await page.locator('#dataModal').isHidden(),true);
  const after=await page.evaluate(()=>{const e=JSON.parse(localStorage.getItem('rosterbot-personal-state-v1'));return {generation:e.generation.number,fingerprint:e.generation.fingerprint,cloudMeta:localStorage.getItem('rosterbot-cloud-meta-v1')}});assert.equal(after.generation,before.generation);assert.equal(after.fingerprint,before.fingerprint);assert.equal(after.cloudMeta,before.cloudMeta);
  assert.equal(requests.some(url=>/supabase|rosterbot\.work/i.test(url)),false);
  console.log(JSON.stringify({phase:'v0.32 Phase 5 trust and Data & Sync',jobs:['device','backup','another-device','cloud','technical'],backupDownload:true,focusContained:true,largeText:geometry,generation:[before.generation,after.generation],fingerprintStable:before.fingerprint===after.fingerprint,cloudWrites:0,productionContacts:0,stagingContacts:0},null,2));
  await context.close();
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
