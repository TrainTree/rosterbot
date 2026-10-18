import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const playwrightRoot=process.env.PHASE10A_PLAYWRIGHT_ROOT||'/private/tmp/rosterbot-phase10a-browser/node_modules/playwright-core';
const {chromium}=await import(pathToFileURL(path.join(playwrightRoot,'index.mjs')));
const executablePath=process.env.PHASE10A_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase10a-browser-states.json'),'utf8')).scenarios.longLivedOfficial.localStorage;
const requests=[];
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1'),relative=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(relative==='seed.html'){response.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});response.end('<!doctype html><title>seed</title>');return}
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store','service-worker-allowed':'/'});response.end(data)});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const origin=`http://127.0.0.1:${server.address().port}`,profile=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-phase6-mobile-'));
let context;
try{
  context=await chromium.launchPersistentContext(profile,{headless:true,executablePath,viewport:{width:390,height:844},serviceWorkers:'allow',acceptDownloads:true});
  await context.addInitScript(()=>{try{Object.defineProperty(navigator,'standalone',{value:true,configurable:true})}catch(_){}});
  context.on('request',request=>{
    const url=new URL(request.url());requests.push(url.href);
    assert.equal(url.origin,origin,`Phase 6 local browser contacted an external origin: ${url.origin}`);
  });
  const page=context.pages()[0]||await context.newPage();
  await page.goto(`${origin}/seed.html`);
  await page.evaluate(values=>{localStorage.clear();sessionStorage.clear();for(const [key,value]of Object.entries(values))localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))},fixture);
  await page.goto(`${origin}/`);
  await page.waitForFunction(()=>window.__rosterbotApplicationReady===true&&localStorage.getItem('rosterbot-db-schema-v1')==='5',{timeout:30000});
  const initial=await page.evaluate(()=>({envelope:localStorage.getItem('rosterbot-personal-state-v1'),generation:JSON.parse(localStorage.getItem('rosterbot-personal-state-v1')).generation.number,standalone:document.documentElement.classList.contains('rb-standalone'),display:window.RosterBotDisplayMode?.getState?.()}));
  assert.equal(initial.standalone,true);assert.equal(initial.display?.mode,'standalone');

  const touch=await page.locator('#v29PrimaryNav .v29-nav-btn:visible').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {id:node.id,width:r.width,height:r.height}}));
  assert.equal(touch.length,5);for(const item of touch){assert(item.width>=44,JSON.stringify(item));assert(item.height>=44,JSON.stringify(item))}

  await page.evaluate(()=>document.getElementById('dataOpenBtn').click());
  await page.locator('#dataModal').waitFor({state:'visible'});
  const portraitModal=await page.evaluate(()=>{const dialog=document.querySelector('#dataModal .feedback-dialog').getBoundingClientRect(),close=document.getElementById('dataCloseBtn').getBoundingClientRect();return {viewport:{w:innerWidth,h:innerHeight},dialog:{top:dialog.top,bottom:dialog.bottom,left:dialog.left,right:dialog.right},close:{top:close.top,bottom:close.bottom,width:close.width,height:close.height}}});
  assert(portraitModal.dialog.top>=-1&&portraitModal.dialog.bottom<=portraitModal.viewport.h+1,JSON.stringify(portraitModal));
  assert(portraitModal.close.top>=-1&&portraitModal.close.bottom<=portraitModal.viewport.h+1,JSON.stringify(portraitModal));
  assert(portraitModal.close.width>=44&&portraitModal.close.height>=44,JSON.stringify(portraitModal));

  await page.locator('#dataCloseBtn').click();
  await page.evaluate(()=>{document.documentElement.dataset.colorMode='light';document.getElementById('dataOpenBtn').click()});
  const email=page.locator('#cloudEmail');await email.scrollIntoViewIfNeeded();
  assert.equal(await email.evaluate(node=>getComputedStyle(node).fontSize),'16px');
  assert.equal(await email.evaluate(node=>getComputedStyle(node).colorScheme),'light');

  const downloadPromise=page.waitForEvent('download');await page.locator('#exportDataBtn').click();const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/\.rosterbot$/);
  const beforeCancel=await page.evaluate(()=>localStorage.getItem('rosterbot-personal-state-v1'));
  await page.evaluate(()=>document.getElementById('importDataFile').dispatchEvent(new Event('change',{bubbles:true})));
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>localStorage.getItem('rosterbot-personal-state-v1')),beforeCancel);
  await page.locator('#dataCloseBtn').click();

  await page.evaluate(()=>document.getElementById('feedbackOpenBtn').click());
  await page.locator('#feedbackModal').waitFor({state:'visible'});
  await page.locator('#feedbackMessage').focus();await page.setViewportSize({width:390,height:420});await page.waitForTimeout(100);
  const keyboardModal=await page.evaluate(()=>{const dialog=document.querySelector('#feedbackModal .feedback-dialog'),close=document.getElementById('feedbackCloseBtn'),field=document.getElementById('feedbackMessage');dialog.scrollTop=field.offsetTop;const d=dialog.getBoundingClientRect(),c=close.getBoundingClientRect(),f=field.getBoundingClientRect();return {active:document.activeElement===field,viewport:innerHeight,dialog:{top:d.top,bottom:d.bottom},close:{top:c.top,bottom:c.bottom},field:{top:f.top,bottom:f.bottom},font:getComputedStyle(field).fontSize}});
  assert.equal(keyboardModal.active,true);assert.equal(keyboardModal.font,'16px');assert(keyboardModal.close.top>=-1&&keyboardModal.close.bottom<=keyboardModal.viewport+1,JSON.stringify(keyboardModal));assert(keyboardModal.field.bottom>0&&keyboardModal.field.top<keyboardModal.viewport,JSON.stringify(keyboardModal));
  await page.locator('#feedbackCloseBtn').click();

  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>document.getElementById('dataOpenBtn').click());
  const landscape=await page.evaluate(()=>{const dialog=document.querySelector('#dataModal .feedback-dialog').getBoundingClientRect(),close=document.getElementById('dataCloseBtn').getBoundingClientRect();return {viewport:{w:innerWidth,h:innerHeight},dialog:{top:dialog.top,bottom:dialog.bottom,left:dialog.left,right:dialog.right},close:{top:close.top,bottom:close.bottom}}});
  assert(landscape.dialog.left>=-1&&landscape.dialog.right<=landscape.viewport.w+1,JSON.stringify(landscape));assert(landscape.close.top>=-1&&landscape.close.bottom<=landscape.viewport.h+1,JSON.stringify(landscape));
  await page.locator('#dataCloseBtn').click();

  const final=await page.evaluate(()=>({envelope:localStorage.getItem('rosterbot-personal-state-v1'),generation:JSON.parse(localStorage.getItem('rosterbot-personal-state-v1')).generation.number,externalLinks:[...document.querySelectorAll('a[href^="http"]')].map(a=>({target:a.target,rel:a.rel}))}));
  assert.equal(final.envelope,initial.envelope);assert.equal(final.generation,initial.generation);
  for(const link of final.externalLinks){assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);assert.match(link.rel,/noreferrer/)}
  const productionContacts=requests.filter(url=>url.includes('rithmbggiiusrmdcqrif')||url.startsWith('https://rosterbot.work')).length,stagingContacts=requests.filter(url=>url.includes('wuzyurvrztskljpxpeaq')||url.startsWith('https://beta.rosterbot.work')).length;
  assert.equal(productionContacts,0);assert.equal(stagingContacts,0);
  console.log(JSON.stringify({phase:'v0.31 Phase 6 mobile/standalone Chromium matrix',standalone:initial.display,portraitModal,keyboardModal,landscape,touchTargets:touch,backupDownload:download.suggestedFilename(),generation:[initial.generation,final.generation],productionContacts,stagingContacts},null,2));
}finally{
  await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});
}
