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
  await context.addInitScript(()=>{
    try{Object.defineProperty(navigator,'standalone',{value:true,configurable:true})}catch(_){}
    const listeners={resize:new Set(),scroll:new Set()};
    const state={width:innerWidth,height:innerHeight,offsetTop:0,offsetLeft:0,scale:1};
    const visualViewport={
      get width(){return state.width},get height(){return state.height},get offsetTop(){return state.offsetTop},get offsetLeft(){return state.offsetLeft},get pageTop(){return state.offsetTop},get pageLeft(){return state.offsetLeft},get scale(){return state.scale},
      addEventListener(type,listener){listeners[type]?.add(listener)},removeEventListener(type,listener){listeners[type]?.delete(listener)}
    };
    try{Object.defineProperty(window,'visualViewport',{value:visualViewport,configurable:true})}catch(_){}
    window.__setRosterBotVisualViewport=(next)=>{
      Object.assign(state,next);
      for(const type of ['resize','scroll'])for(const listener of [...listeners[type]])listener.call(visualViewport,new Event(type));
    };
  });
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
  const portraitTypography=await page.locator('#dataTitle').evaluate(node=>({fontSize:getComputedStyle(node).fontSize,lineHeight:getComputedStyle(node).lineHeight,textAdjust:getComputedStyle(document.documentElement).webkitTextSizeAdjust||getComputedStyle(document.documentElement).textSizeAdjust}));
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
  await page.locator('#feedbackMessage').focus();await page.evaluate(()=>window.__setRosterBotVisualViewport({width:390,height:360,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(100);
  const keyboardModal=await page.evaluate(()=>{const overlay=document.getElementById('feedbackModal'),dialog=overlay.querySelector('.feedback-dialog'),close=document.getElementById('feedbackCloseBtn'),field=document.getElementById('feedbackMessage');dialog.scrollTop=field.offsetTop;const o=overlay.getBoundingClientRect(),d=dialog.getBoundingClientRect(),c=close.getBoundingClientRect(),f=field.getBoundingClientRect(),bottomHit=document.elementFromPoint(5,700);return {active:document.activeElement===field,layout:{w:innerWidth,h:innerHeight},visual:{w:visualViewport.width,h:visualViewport.height,top:visualViewport.offsetTop,left:visualViewport.offsetLeft},overlay:{top:o.top,bottom:o.bottom,left:o.left,right:o.right},dialog:{top:d.top,bottom:d.bottom,left:d.left,right:d.right},close:{top:c.top,bottom:c.bottom},field:{top:f.top,bottom:f.bottom},bottomHit:bottomHit?.id||bottomHit?.className,font:getComputedStyle(field).fontSize,constrained:overlay.dataset.rosterbotVisualConstrained}});
  assert.equal(keyboardModal.active,true);assert.equal(keyboardModal.font,'16px');assert.equal(keyboardModal.constrained,'true');assert.deepEqual(keyboardModal.overlay,{top:0,bottom:844,left:0,right:390});assert.equal(keyboardModal.bottomHit,'feedbackModal');assert(keyboardModal.close.top>=-1&&keyboardModal.close.bottom<=keyboardModal.visual.h+1,JSON.stringify(keyboardModal));assert(keyboardModal.field.bottom>0&&keyboardModal.field.top<keyboardModal.visual.h,JSON.stringify(keyboardModal));
  await page.evaluate(()=>window.__setRosterBotVisualViewport({width:390,height:844,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(50);
  assert.equal(await page.locator('#feedbackModal').getAttribute('data-rosterbot-visual-constrained'),null);
  await page.locator('#feedbackCloseBtn').click();

  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{window.__setRosterBotVisualViewport({width:780,height:190,offsetTop:16,offsetLeft:32});document.documentElement.style.setProperty('--rb-safe-left','47px');document.documentElement.style.setProperty('--rb-safe-right','47px');document.documentElement.style.setProperty('--rb-safe-top','0px');document.documentElement.style.setProperty('--rb-safe-bottom','21px');document.getElementById('dataOpenBtn').click();window.RosterBotDisplayMode.refreshViewport()});await page.waitForTimeout(100);
  const landscape=await page.evaluate(()=>{const overlay=document.getElementById('dataModal').getBoundingClientRect(),dialog=document.querySelector('#dataModal .feedback-dialog').getBoundingClientRect(),close=document.getElementById('dataCloseBtn').getBoundingClientRect(),bottomHit=document.elementFromPoint(5,350);return {layout:{w:innerWidth,h:innerHeight},visual:{w:visualViewport.width,h:visualViewport.height,top:visualViewport.offsetTop,left:visualViewport.offsetLeft},overlay:{top:overlay.top,bottom:overlay.bottom,left:overlay.left,right:overlay.right},dialog:{top:dialog.top,bottom:dialog.bottom,left:dialog.left,right:dialog.right},close:{top:close.top,bottom:close.bottom},bottomHit:bottomHit?.id||bottomHit?.className}});
  assert.deepEqual(landscape.overlay,{top:0,bottom:390,left:0,right:844});assert.equal(landscape.bottomHit,'dataModal');assert(landscape.dialog.left>=landscape.visual.left,JSON.stringify(landscape));assert(landscape.dialog.right<=landscape.visual.left+landscape.visual.w,JSON.stringify(landscape));assert(landscape.close.top>=landscape.visual.top-1&&landscape.close.bottom<=landscape.visual.top+landscape.visual.h+1,JSON.stringify(landscape));
  await page.locator('#dataCloseBtn').click();

  const modalGeometry=await page.evaluate(()=>{
    const ids=['dataModal','settingsModal','changelogModal','feedbackModal','employmentModal','sourcesModal','rosterViewerModal','advancedRosterModal','weekOverrideModal','payCheckModal'],results=[];
    for(const id of ids){
      const modal=document.getElementById(id),dialog=modal?.querySelector('.feedback-dialog'),close=modal?.querySelector('.feedback-close-btn');
      if(!modal||!dialog||!close)continue;
      modal.hidden=false;document.body.classList.add('feedback-modal-open');window.RosterBotDisplayMode.refreshViewport();
      const d=dialog.getBoundingClientRect(),c=close.getBoundingClientRect();
      const overlay=modal.getBoundingClientRect();results.push({id,left:d.left,right:d.right,closeLeft:c.left,closeRight:c.right,dialogOverflow:dialog.scrollWidth-dialog.clientWidth,overlayOverflow:modal.scrollWidth-modal.clientWidth,overlay:{top:overlay.top,bottom:overlay.bottom,left:overlay.left,right:overlay.right}});
      modal.hidden=true;
    }
    document.body.classList.remove('feedback-modal-open');return results;
  });
  for(const item of modalGeometry){assert(item.left>=32,JSON.stringify(item));assert(item.right<=812,JSON.stringify(item));assert(item.closeLeft>=32&&item.closeRight<=812,JSON.stringify(item));assert(item.dialogOverflow<=1,JSON.stringify(item));assert(item.overlayOverflow<=1,JSON.stringify(item));assert.deepEqual(item.overlay,{top:0,bottom:390,left:0,right:844})}

  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__setRosterBotVisualViewport({width:390,height:844,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(100);
  await page.evaluate(()=>document.getElementById('dataOpenBtn').click());
  const rotatedTypography=await page.locator('#dataTitle').evaluate(node=>({fontSize:getComputedStyle(node).fontSize,lineHeight:getComputedStyle(node).lineHeight,textAdjust:getComputedStyle(document.documentElement).webkitTextSizeAdjust||getComputedStyle(document.documentElement).textSizeAdjust}));
  assert.deepEqual(rotatedTypography,portraitTypography);
  await page.evaluate(()=>{window.__setRosterBotVisualViewport({width:844,height:180,offsetTop:8,offsetLeft:0});window.__setRosterBotVisualViewport({width:390,height:0,offsetTop:0,offsetLeft:0});window.__setRosterBotVisualViewport({width:370,height:352,offsetTop:14,offsetLeft:10})});await page.waitForTimeout(100);
  const rapidViewport=await page.evaluate(()=>{const modal=document.getElementById('dataModal'),dialog=modal.querySelector('.feedback-dialog'),overlay=modal.getBoundingClientRect(),box=dialog.getBoundingClientRect();return {constrained:modal.dataset.rosterbotVisualConstrained,attribute:modal.getAttribute('data-rosterbot-visual-constrained'),matches:dialog.matches('.feedback-modal[data-rosterbot-visual-constrained="true"] .feedback-dialog'),height:dialog.style.getPropertyValue('--rb-dialog-visual-height'),width:dialog.style.getPropertyValue('--rb-dialog-visual-width'),top:dialog.style.getPropertyValue('--rb-dialog-visual-top'),left:dialog.style.getPropertyValue('--rb-dialog-visual-left'),computedMaxHeight:getComputedStyle(dialog).maxHeight,computedMarginTop:getComputedStyle(dialog).marginTop,overlay:{top:overlay.top,bottom:overlay.bottom,left:overlay.left,right:overlay.right},dialog:{top:box.top,bottom:box.bottom,left:box.left,right:box.right}}});
  assert.equal(rapidViewport.constrained,'true');assert.equal(rapidViewport.height,'352px');assert.equal(rapidViewport.width,'370px');assert.equal(rapidViewport.top,'14px');assert.equal(rapidViewport.left,'10px');assert.deepEqual(rapidViewport.overlay,{top:0,bottom:844,left:0,right:390});assert(rapidViewport.dialog.top>=14&&rapidViewport.dialog.bottom<=366,JSON.stringify(rapidViewport));
  await page.evaluate(()=>window.__setRosterBotVisualViewport({width:390,height:0,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(50);
  assert.equal(await page.locator('#dataModal .feedback-dialog').evaluate(node=>node.style.getPropertyValue('--rb-dialog-visual-height')),'');
  await page.evaluate(()=>window.__setRosterBotVisualViewport({width:390,height:844,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(50);
  await page.locator('#dataCloseBtn').click();

  await page.evaluate(()=>{for(const name of ['--rb-safe-left','--rb-safe-right','--rb-safe-top','--rb-safe-bottom'])document.documentElement.style.setProperty(name,'0px')});
  await page.setViewportSize({width:1024,height:768});await page.evaluate(()=>window.__setRosterBotVisualViewport({width:1024,height:768,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(50);
  const openedDay=await page.evaluate(()=>{window.RosterBotUI.showCurrentPayCycle({persist:false});const date=document.querySelector('[data-roster-day]')?.dataset.rosterDay;if(!date)throw new Error('No rendered roster day available for day-editor test');window.RosterBotDiary.showDay(date);return date});
  const dayTypographyBefore=await page.locator('#dayEditorTitle').evaluate(node=>({fontSize:getComputedStyle(node).fontSize,lineHeight:getComputedStyle(node).lineHeight}));
  await page.locator('#dayNotes').focus();
  await page.evaluate(()=>window.__setRosterBotVisualViewport({width:980,height:410,offsetTop:16,offsetLeft:22}));await page.waitForTimeout(120);
  await page.locator('#dayNotes').scrollIntoViewIfNeeded();
  const dayEditorKeyboard=await page.evaluate(()=>{const viewportBottom=visualViewport.offsetTop+visualViewport.height,overlay=document.getElementById('dayEditorModal').getBoundingClientRect(),dialog=document.querySelector('#dayEditorModal .day-editor-dialog').getBoundingClientRect(),header=document.querySelector('#dayEditorModal .feedback-dialog-header').getBoundingClientRect(),body=document.querySelector('#dayEditorModal .day-editor-scroll'),actions=document.querySelector('#dayEditorModal .actions'),actionBox=actions.getBoundingClientRect(),note=document.getElementById('dayNotes').getBoundingClientRect(),saveClose=document.getElementById('daySaveCloseBtn').getBoundingClientRect(),bottomHit=document.elementFromPoint(5,700),visibleNote=Math.max(0,Math.min(note.bottom,viewportBottom)-Math.max(note.top,header.bottom));return {visual:{top:visualViewport.offsetTop,left:visualViewport.offsetLeft,width:visualViewport.width,height:visualViewport.height,bottom:viewportBottom},layout:{w:innerWidth,h:innerHeight},overlay:{top:overlay.top,bottom:overlay.bottom,left:overlay.left,right:overlay.right},dialog:{top:dialog.top,bottom:dialog.bottom,left:dialog.left,right:dialog.right},header:{top:header.top,bottom:header.bottom},saveClose:{top:saveClose.top,bottom:saveClose.bottom},actions:{top:actionBox.top,bottom:actionBox.bottom,position:getComputedStyle(actions).position,parent:actions.parentElement?.className},note:{top:note.top,bottom:note.bottom,height:note.height,visible:visibleNote},body:{top:body.getBoundingClientRect().top,bottom:body.getBoundingClientRect().bottom,clientHeight:body.clientHeight,scrollHeight:body.scrollHeight},bodyScrollable:body.scrollHeight>body.clientHeight,active:document.activeElement?.id,viewportSource:document.documentElement.dataset.rosterbotViewportSource,bottomHit:bottomHit?.id||bottomHit?.className}});
  assert.equal(dayEditorKeyboard.active,'dayNotes');assert.equal(dayEditorKeyboard.viewportSource,'visual-viewport');assert(dayEditorKeyboard.bodyScrollable,JSON.stringify(dayEditorKeyboard));assert.deepEqual(dayEditorKeyboard.overlay,{top:0,bottom:768,left:0,right:1024});assert.equal(dayEditorKeyboard.bottomHit,'dayEditorModal');assert(dayEditorKeyboard.dialog.left>=dayEditorKeyboard.visual.left-1&&dayEditorKeyboard.dialog.right<=dayEditorKeyboard.visual.left+dayEditorKeyboard.visual.width+1,JSON.stringify(dayEditorKeyboard));assert(dayEditorKeyboard.header.top>=dayEditorKeyboard.visual.top-1&&dayEditorKeyboard.header.bottom<=dayEditorKeyboard.visual.bottom+1,JSON.stringify(dayEditorKeyboard));assert(dayEditorKeyboard.saveClose.top>=dayEditorKeyboard.header.top&&dayEditorKeyboard.saveClose.bottom<=dayEditorKeyboard.header.bottom+1,JSON.stringify(dayEditorKeyboard));assert(dayEditorKeyboard.note.height>=60&&dayEditorKeyboard.note.visible>=50,JSON.stringify(dayEditorKeyboard));assert.equal(dayEditorKeyboard.actions.position,'static');assert.match(dayEditorKeyboard.actions.parent,/day-editor-scroll/);assert(dayEditorKeyboard.actions.top>dayEditorKeyboard.visual.bottom,JSON.stringify(dayEditorKeyboard));
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.__setRosterBotVisualViewport({width:844,height:190,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(100);
  await page.locator('#dayNotes').scrollIntoViewIfNeeded();
  const dayLandscape=await page.evaluate(()=>{const modal=document.getElementById('dayEditorModal'),overlay=modal.getBoundingClientRect(),dialog=modal.querySelector('.day-editor-dialog').getBoundingClientRect(),header=modal.querySelector('.feedback-dialog-header').getBoundingClientRect(),actions=modal.querySelector('.actions').getBoundingClientRect(),note=document.getElementById('dayNotes').getBoundingClientRect(),visualBottom=visualViewport.offsetTop+visualViewport.height,bottomHit=document.elementFromPoint(5,350),visibleNote=Math.max(0,Math.min(note.bottom,visualBottom)-Math.max(note.top,header.bottom));return {overlay:{top:overlay.top,bottom:overlay.bottom,left:overlay.left,right:overlay.right},dialog:{top:dialog.top,bottom:dialog.bottom,left:dialog.left,right:dialog.right},header:{top:header.top,bottom:header.bottom,height:header.height},actions:{top:actions.top,bottom:actions.bottom},note:{top:note.top,bottom:note.bottom,height:note.height,visible:visibleNote},visualBottom,bottomHit:bottomHit?.id||bottomHit?.className}});
  assert.deepEqual(dayLandscape.overlay,{top:0,bottom:390,left:0,right:844});assert.equal(dayLandscape.bottomHit,'dayEditorModal');assert(dayLandscape.dialog.left>=-1&&dayLandscape.dialog.right<=845,JSON.stringify(dayLandscape));assert(dayLandscape.header.top>=-1&&dayLandscape.header.bottom<=dayLandscape.visualBottom+1,JSON.stringify(dayLandscape));assert(dayLandscape.header.height<=64,JSON.stringify(dayLandscape));assert(dayLandscape.note.height>=60&&dayLandscape.note.visible>=44,JSON.stringify(dayLandscape));assert(dayLandscape.actions.top>dayLandscape.visualBottom,JSON.stringify(dayLandscape));
  await page.setViewportSize({width:768,height:1024});await page.evaluate(()=>window.__setRosterBotVisualViewport({width:740,height:580,offsetTop:18,offsetLeft:14}));await page.waitForTimeout(100);
  await page.locator('#dayNotes').scrollIntoViewIfNeeded();
  const dayEditorReturned=await page.evaluate(()=>{const overlay=document.getElementById('dayEditorModal'),note=document.getElementById('dayNotes').getBoundingClientRect(),header=overlay.querySelector('.feedback-dialog-header').getBoundingClientRect(),viewportBottom=visualViewport.offsetTop+visualViewport.height,box=overlay.getBoundingClientRect();return {note:{top:note.top,bottom:note.bottom,height:note.height},header:{top:header.top,bottom:header.bottom},viewportBottom,overlay:{top:box.top,bottom:box.bottom,left:box.left,right:box.right},font:getComputedStyle(document.getElementById('dayEditorTitle')).fontSize}});
  assert(dayEditorReturned.note.top>=dayEditorReturned.header.bottom-1&&dayEditorReturned.note.bottom<=dayEditorReturned.viewportBottom+1,JSON.stringify(dayEditorReturned));assert(dayEditorReturned.header.top>=17,JSON.stringify(dayEditorReturned));assert.deepEqual(dayEditorReturned.overlay,{top:0,bottom:1024,left:0,right:768});
  await page.setViewportSize({width:1024,height:768});await page.evaluate(()=>window.__setRosterBotVisualViewport({width:980,height:410,offsetTop:16,offsetLeft:22}));await page.waitForTimeout(80);
  const dayTypographyRotatedBack=await page.locator('#dayEditorTitle').evaluate(node=>({fontSize:getComputedStyle(node).fontSize,lineHeight:getComputedStyle(node).lineHeight}));assert.deepEqual(dayTypographyRotatedBack,dayTypographyBefore);
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__setRosterBotVisualViewport({width:370,height:360,offsetTop:0,offsetLeft:10}));await page.waitForTimeout(80);await page.locator('#dayNotes').scrollIntoViewIfNeeded();
  const dayPhoneKeyboard=await page.evaluate(()=>{const modal=document.getElementById('dayEditorModal'),overlay=modal.getBoundingClientRect(),dialog=modal.querySelector('.day-editor-dialog').getBoundingClientRect(),header=modal.querySelector('.feedback-dialog-header').getBoundingClientRect(),actions=modal.querySelector('.actions').getBoundingClientRect(),note=document.getElementById('dayNotes').getBoundingClientRect(),visualBottom=visualViewport.offsetTop+visualViewport.height,visibleNote=Math.max(0,Math.min(note.bottom,visualBottom)-Math.max(note.top,header.bottom));return {overlay:{top:overlay.top,bottom:overlay.bottom,left:overlay.left,right:overlay.right},dialog:{top:dialog.top,bottom:dialog.bottom,left:dialog.left,right:dialog.right},header:{top:header.top,bottom:header.bottom},actions:{top:actions.top,bottom:actions.bottom},note:{top:note.top,bottom:note.bottom,height:note.height,visible:visibleNote},visual:{left:visualViewport.offsetLeft,right:visualViewport.offsetLeft+visualViewport.width,bottom:visualBottom}}});
  assert.deepEqual(dayPhoneKeyboard.overlay,{top:0,bottom:844,left:0,right:390});assert(dayPhoneKeyboard.dialog.left>=dayPhoneKeyboard.visual.left-1&&dayPhoneKeyboard.dialog.right<=dayPhoneKeyboard.visual.right+1,JSON.stringify(dayPhoneKeyboard));assert(dayPhoneKeyboard.header.top>=-1&&dayPhoneKeyboard.header.bottom<=dayPhoneKeyboard.visual.bottom+1,JSON.stringify(dayPhoneKeyboard));assert(dayPhoneKeyboard.note.height>=60&&dayPhoneKeyboard.note.visible>=50,JSON.stringify(dayPhoneKeyboard));assert(dayPhoneKeyboard.actions.top>dayPhoneKeyboard.visual.bottom,JSON.stringify(dayPhoneKeyboard));
  await page.evaluate(()=>window.__setRosterBotVisualViewport({width:390,height:844,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(80);
  assert.equal(await page.locator('#dayEditorModal').getAttribute('data-rosterbot-visual-constrained'),null);
  await page.locator('#dayClearActualBtn').scrollIntoViewIfNeeded();
  const dayActionsAfterDismiss=await page.evaluate(()=>{const dialog=document.querySelector('#dayEditorModal .day-editor-dialog').getBoundingClientRect(),buttons=['daySaveBtn','dayUseRosteredBtn','dayClearActualBtn'].map(id=>{const box=document.getElementById(id).getBoundingClientRect();return {id,top:box.top,bottom:box.bottom,left:box.left,right:box.right}});return {dialog:{top:dialog.top,bottom:dialog.bottom,left:dialog.left,right:dialog.right},buttons}});
  for(const button of dayActionsAfterDismiss.buttons){assert(button.top>=dayActionsAfterDismiss.dialog.top-1&&button.bottom<=dayActionsAfterDismiss.dialog.bottom+1,JSON.stringify(dayActionsAfterDismiss));assert(button.left>=dayActionsAfterDismiss.dialog.left-1&&button.right<=dayActionsAfterDismiss.dialog.right+1,JSON.stringify(dayActionsAfterDismiss))}
  await page.locator('#dayEditorClose').click();

  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.__setRosterBotVisualViewport({width:844,height:390,offsetTop:0,offsetLeft:0}));await page.waitForTimeout(50);
  const weekTimeContainment=await page.evaluate(()=>{
    const host=document.createElement('div');host.style.width='700px';host.style.maxWidth='100%';host.innerHTML=`<div class="roster-grid" style="min-width:0;width:100%">${Array.from({length:7},()=>'<div class="day-column"><div class="roster-cell"><div class="cell-time-range"><span class="time-start">18:00</span><span class="time-sep"> – </span><span class="time-finish">02:00</span></div></div></div>').join('')}</div>`;document.body.appendChild(host);
    const values=[...host.querySelectorAll('.day-column')].map(column=>{const cell=column.querySelector('.roster-cell').getBoundingClientRect(),range=column.querySelector('.cell-time-range').getBoundingClientRect(),start=column.querySelector('.time-start').getBoundingClientRect(),finish=column.querySelector('.time-finish').getBoundingClientRect();return {cell:{left:cell.left,right:cell.right},range:{left:range.left,right:range.right},twoLine:finish.top>start.top,text:column.textContent.trim()}});host.remove();return values;
  });
  for(const item of weekTimeContainment){assert(item.range.left>=item.cell.left-1&&item.range.right<=item.cell.right+1,JSON.stringify(item));assert.equal(item.twoLine,true,JSON.stringify(item));assert.match(item.text,/18:00[\s–]+02:00/)}

  const final=await page.evaluate(()=>({envelope:localStorage.getItem('rosterbot-personal-state-v1'),generation:JSON.parse(localStorage.getItem('rosterbot-personal-state-v1')).generation.number,externalLinks:[...document.querySelectorAll('a[href^="http"]')].map(a=>({target:a.target,rel:a.rel}))}));
  assert.equal(final.envelope,initial.envelope);assert.equal(final.generation,initial.generation);
  for(const link of final.externalLinks){assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);assert.match(link.rel,/noreferrer/)}
  const productionContacts=requests.filter(url=>url.includes('rithmbggiiusrmdcqrif')||url.startsWith('https://rosterbot.work')).length,stagingContacts=requests.filter(url=>url.includes('wuzyurvrztskljpxpeaq')||url.startsWith('https://beta.rosterbot.work')).length;
  assert.equal(productionContacts,0);assert.equal(stagingContacts,0);
  console.log(JSON.stringify({phase:'v0.31 Phase 6 mobile/standalone Chromium matrix',standalone:initial.display,portraitModal,portraitTypography,rotatedTypography,keyboardModal,landscape,modalGeometry,rapidViewport,openedDay,dayTypographyBefore,dayEditorKeyboard,dayLandscape,dayEditorReturned,dayTypographyRotatedBack,dayPhoneKeyboard,dayActionsAfterDismiss,weekTimeContainment,touchTargets:touch,backupDownload:download.suggestedFilename(),generation:[initial.generation,final.generation],productionContacts,stagingContacts},null,2));
}finally{
  await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(profile,{recursive:true,force:true});
}
