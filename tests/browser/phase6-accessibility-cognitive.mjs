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
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const requests=[];
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://127.0.0.1'),relative=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.resolve(root,relative);requests.push(url.href);if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(data)})});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,executablePath});

async function create({seed=fixture,reducedMotion='no-preference'}={}){const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion});context.on('request',request=>assert.equal(new URL(request.url()).origin,origin,`external request: ${request.url()}`));await context.addInitScript(({values})=>{const NativeDate=Date,fixed=NativeDate.parse('2026-10-28T12:00:00+11:00');class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}FixedDate.parse=NativeDate.parse;FixedDate.UTC=NativeDate.UTC;window.Date=FixedDate;if(values)for(const [key,value] of Object.entries(values))localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))},{values:seed});return context}
async function ready(page,configured=true){await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__rosterbotApplicationReady===true&&window.RosterBotSchema5Persistence?.isReady?.(),{timeout:30000});if(configured){await page.waitForFunction(()=>document.documentElement.classList.contains('v27-dashboard-active')&&document.querySelectorAll('[data-v32-roster-date]').length===28,{timeout:10000});await page.waitForTimeout(400)}}
async function state(page){return page.evaluate(()=>{const envelope=JSON.parse(localStorage.getItem('rosterbot-personal-state-v1'));return {generation:envelope?.generation?.number??0,fingerprint:envelope?.generation?.fingerprint??'',cloud:localStorage.getItem('rosterbot-cloud-meta-v1')}})}
async function unnamedVisibleControls(page){return page.evaluate(()=>[...document.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href],summary')].filter(node=>{const style=getComputedStyle(node),box=node.getBoundingClientRect();return !node.disabled&&style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0}).filter(node=>{const labels=node.labels?[...node.labels].map(label=>label.textContent.trim()).join(' '):'';const name=(node.getAttribute('aria-label')||node.getAttribute('title')||labels||node.textContent||'').trim();return !name}).map(node=>node.id||node.outerHTML.slice(0,80)))}

const results={frontDoor:{},home:{},calendar:{},dialogs:{},pay:{},zoom:{},motion:{}};
try{
  {
    const context=await create({seed:null}),page=await context.newPage();await ready(page,false);
    assert.equal(await page.locator('#v32FrontDoor h1').count(),1);assert.equal(await page.locator('#v32FrontDoor h1').innerText(),'Know what you’re working and what you should be paid.');
    assert.deepEqual(await unnamedVisibleControls(page),[]);
    await page.keyboard.press('Tab');const first=await page.evaluate(()=>document.activeElement?.id);assert(first);
    await page.locator('#v32TryRosterBot').focus();await page.keyboard.press('Enter');await page.locator('#v32DemoPanel').waitFor({state:'visible'});assert.equal(await page.locator('#v32DemoPanel h1').count(),1);
    await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement?.tagName),'BODY');
    await page.locator('#v32ExitDemo').click();await page.locator('#v32SetUpRoster').click();await page.locator('#setupPanel').waitFor({state:'visible'});assert.equal(await page.locator('#setupPanel h1').count(),1);assert.equal(await page.locator('#v32SetupError[role="alert"]').count(),1);
    assert.deepEqual(await unnamedVisibleControls(page),[]);results.frontDoor={singleH1:true,keyboard:true,demo:true,onboardingLabels:true};await context.close();
  }
  {
    const context=await create(),page=await context.newPage();await ready(page);const before=await state(page);
    assert.equal(await page.locator('#diaryHomePanel > h1').count(),1);assert.equal(await page.locator('#v29NavHome').getAttribute('aria-current'),'page');
    const todayName=await page.locator('#dashTodayCard').getAttribute('aria-label');assert(todayName.length<180,todayName);assert.match(todayName,/View details or record actual day/);
    const days=await page.locator('.v32-forward-day').evaluateAll(nodes=>nodes.map(node=>({date:node.querySelector('time')?.dateTime,name:node.getAttribute('aria-label'),current:node.getAttribute('aria-current')})));
    assert.equal(days.length,28);assert(days.every((item,index)=>index===0||item.date>days[index-1].date));assert(days.every(item=>/2026/.test(item.name)&&/View shift details/.test(item.name)));assert(days.some(item=>/Off Roster/.test(item.name)));assert.equal(days.filter(item=>item.current==='date').length,1);
    assert.equal(await page.locator('.v32-forward-week h3').count(),4);assert.deepEqual(await unnamedVisibleControls(page),[]);
    await page.locator('#universalSearch').fill('SP');await page.locator('#universalSearchResults').waitFor({state:'visible'});assert.equal(await page.locator('#universalSearch').getAttribute('aria-expanded'),'true');assert.match(await page.locator('#universalSearchStatus').innerText(),/search results available|No roster matches/);assert.doesNotMatch(await page.locator('#universalSearchResults').innerText(),/\bSCS · SCS\b/);
    await page.locator('#universalSearchClear').click();assert.equal(await page.locator('#universalSearch').getAttribute('aria-expanded'),'false');
    const day=page.locator('.v32-forward-day').first();await day.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#v32RosterDayModal').isVisible(),true);assert.equal(await page.evaluate(()=>document.activeElement?.id),'v32RosterDayClose');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement?.id),'v32RosterDayEdit');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('v32-forward-day')),true);
    await page.locator('#v29NavHome').focus();await page.evaluate(()=>window.RosterBotDataUI.show());assert.equal(await page.evaluate(()=>document.activeElement?.id),'dataCloseBtn');await page.locator('#dataTechnicalDetails > summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#storageHealth').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement?.id),'v29NavHome');
    const after=await state(page);assert.deepEqual(after,before);results.home={singleH1:true,todayNameLength:todayName.length,navCurrent:true,searchStatus:true,generation:[before.generation,after.generation],fingerprintStable:before.fingerprint===after.fingerprint};results.calendar={days:days.length,chronological:true,namedStates:true,currentDay:true,weekHeadings:4};results.dialogs={focusEntry:true,wrap:true,escapeRestore:true,technicalDisclosure:true};await context.close();
  }
  {
    const context=await create(),page=await context.newPage();await ready(page);
    await page.locator('#v29NavRoster').click();assert.deepEqual(await page.locator('h1:visible').allTextContents(),['My Roster']);
    await page.locator('#v29NavCalendar').click();await page.waitForTimeout(150);assert.deepEqual(await page.locator('h1:visible').allTextContents(),['Calendar']);
    await page.locator('#v29NavMore').click();assert.deepEqual(await page.locator('h1:visible').allTextContents(),['More']);
    await page.locator('#v29NavPay').click();await page.locator('#paybotPage').waitFor({state:'visible'});assert.deepEqual(await page.locator('h1:visible').allTextContents(),['PayBot 🤖💰']);assert.deepEqual(await unnamedVisibleControls(page),[]);
    const tabs=page.locator('[role="tablist"][aria-label="Pay views"] [role="tab"]');assert.equal(await tabs.count(),3);await tabs.first().focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement?.id),'payTabPayslip');assert.equal(await page.locator('#payTabPayslip').getAttribute('aria-selected'),'true');
    const gross=await page.locator('.summary-grid > .metric').first().evaluate(node=>({width:node.getBoundingClientRect().width,font:getComputedStyle(node.querySelector('.v')).fontSize}));results.pay={singleH1:true,namedControls:true,keyboardTabs:true,expectedGrossProminent:gross};await context.close();
  }
  {
    const context=await create(),page=await context.newPage();await ready(page);await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    const home=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,minDay:Math.min(...[...document.querySelectorAll('.v32-forward-day')].map(node=>node.getBoundingClientRect().height)),cellOverflow:Math.max(...[...document.querySelectorAll('.v32-forward-day')].map(node=>node.scrollWidth-node.clientWidth))}));assert(home.overflow<=1,JSON.stringify(home));assert(home.minDay>=44,JSON.stringify(home));assert(home.cellOverflow<=1,JSON.stringify(home));
    await page.locator('#v29NavHome').focus();await page.evaluate(()=>window.RosterBotDataUI.show());const data=await page.locator('#dataModal [role="dialog"]').evaluate(node=>({width:node.getBoundingClientRect().width,viewport:innerWidth,close:document.querySelector('#dataCloseBtn').getBoundingClientRect().height}));assert(data.width<=data.viewport);assert(data.close>=44);await page.locator('#dataCloseBtn').click();results.zoom={home,data};await context.close();
  }
  {
    const context=await create({reducedMotion:'reduce'}),page=await context.newPage();await ready(page);const motion=await page.locator('#dashTodayCard').evaluate(node=>({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,transition:getComputedStyle(node).transitionDuration,animation:getComputedStyle(node).animationDuration,scroll:getComputedStyle(document.documentElement).scrollBehavior}));assert.equal(motion.matches,true);assert.match(motion.transition,/1e-05s|0\.00001s|0s/);results.motion=motion;await context.close();
  }
  assert(requests.length>0);assert.equal(requests.some(url=>/rosterbot\.work|supabase/i.test(url)),false);
  console.log(JSON.stringify({phase:'v0.32 Phase 6 accessibility and cognitive load',...results,canonicalGenerationsFromAccessibility:0,cloudWrites:0,productionContacts:0,stagingContacts:0},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
