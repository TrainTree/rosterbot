import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const playwrightRoot=process.env.PHASE10A_PLAYWRIGHT_ROOT||'/tmp/rosterbot-phase10a-browser/node_modules/playwright-core';
const {chromium}=await import(pathToFileURL(path.join(playwrightRoot,'index.mjs')));
const executablePath=process.env.PHASE10A_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const legacyPath=path.join(root,'tests/fixtures/backup-v0211.rosterbot');
const legacy=JSON.parse(fs.readFileSync(legacyPath,'utf8'));
const corpus=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phase10a-browser-states.json'),'utf8')).scenarios;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};

function safeFile(relative){
  const resolved=path.resolve(root,relative.replace(/^\/+/,''));
  return resolved===root||resolved.startsWith(root+path.sep)?resolved:null;
}

const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1'),relative=url.pathname==='/'?'index.html':url.pathname.replace(/^\/+/,''),file=safeFile(relative);
  if(!file){response.writeHead(403);response.end('forbidden');return}
  fs.readFile(file,(error,data)=>{
    if(error){response.writeHead(error.code==='ENOENT'?404:500);response.end(error.message);return}
    response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(data);
  });
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const base=`http://127.0.0.1:${server.address().port}`;

async function waitReady(page,timeout=30000){
  try{await page.waitForFunction(()=>!document.documentElement.classList.contains('rb-booting')&&localStorage.getItem('rosterbot-db-schema-v1')==='5'&&!!window.RosterBotDashboard,{timeout})}
  catch(error){const detail=await page.evaluate(()=>({classes:document.documentElement.className,startup:document.getElementById('appStartup')?.innerText||'',events:window.__phase10Events||[],marker:localStorage.getItem('rosterbot-db-schema-v1'),recovery:window.RosterBotRecovery?.getState?.()||null})).catch(cause=>({inspectionError:cause.message}));throw new Error(`Application did not leave its verified boot gate: ${JSON.stringify(detail)}`,{cause:error})}
}

async function launchCase({disturbDiaryReady=false}={}){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rb10a-legacy-import-'));
  const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath,viewport:{width:820,height:1180},acceptDownloads:true,locale:'en-AU',timezoneId:'Australia/Melbourne'});
  const record={pageErrors:[],console:[],external:[],navigationCount:0};
  await context.addInitScript(()=>{
    const disturb=sessionStorage.getItem('phase10a-disturb-diary-ready')==='1';
    if(disturb){
      const nativeDispatch=window.dispatchEvent.bind(window);
      window.dispatchEvent=event=>event?.type==='rosterbot:local-ready'?true:nativeDispatch(event);
      Object.defineProperty(window,'__rosterbotLocalReady',{configurable:true,get:()=>false,set:()=>{}});
    }
    window.__phase10Events=[];
    for(const type of ['rosterbot:schema5-ready','paybot:ready','rosterbot:local-ready','rosterbot:application-starting','rosterbot:application-ready','rosterbot:recovery-required'])window.addEventListener(type,event=>window.__phase10Events.push({type,at:performance.now(),detail:event.detail?.status||event.detail?.stage||event.detail?.issueType||null}));
  });
  await context.route('**/*',async route=>{
    const url=route.request().url();
    if(!url.startsWith(base)){record.external.push({method:route.request().method(),url});await route.abort('blockedbyclient');return}
    if(disturbDiaryReady&&/\/js\/(?:60-diary|70-navigation)\.js(?:\?|$)/.test(url))await new Promise(resolve=>setTimeout(resolve,url.includes('70-navigation')?350:150));
    await route.continue();
  });
  const page=context.pages()[0]||await context.newPage();
  page.on('pageerror',error=>record.pageErrors.push(error.message));
  page.on('console',message=>{if(['error','warning'].includes(message.type()))record.console.push({type:message.type(),text:message.text()})});
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())record.navigationCount++});
  page.on('dialog',dialog=>dialog.accept());
  return {context,page,record,profile};
}

async function state(page){
  return page.evaluate(()=>{
    const envelope=JSON.parse(localStorage.getItem('rosterbot-personal-state-v1')||'null'),journal=JSON.parse(localStorage.getItem('rosterbot-schema5-migration-journal-v1')||'null'),parse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')??fallback}catch(_){return fallback}},session=parse('rosterbot-session-settings-v1',{}),leave=parse('rosterbot-diary-annual-leave-v1',[]),semanticDates=['2025-04-20','2026-06-08','2026-09-07','2026-09-29'],dates={};
    for(const date of semanticDates){const week=window.RosterEngine.buildWeeks(window.ROSTER_DATA,{...session,viewStartDate:date,timelineMode:'diary',annualLeaveWeeks:leave},1)[0],day=week?.days?.find(item=>item.date===date);dates[date]=week?{wcDate:week.wcDate,roster:week.roster,line:week.line,track:week.track,isAnnualLeave:week.isAnnualLeave,isWeekOverride:week.isWeekOverride,day:{type:day?.cell?.type||'',shift:day?.cell?.shift||'',actualOverride:day?.actualOverride||null}}:null}
    return {
      marker:localStorage.getItem('rosterbot-db-schema-v1'),envelopeRaw:localStorage.getItem('rosterbot-personal-state-v1'),generation:envelope?.generation||null,journalStartedAt:journal?.timestamps?.startedAt||null,journalState:journal?.state||null,
      timeline:parse('rosterbot-timeline-v1',[]),annualLeave:leave,weekLeave:parse('rosterbot-week-leave-v1',{}),weekOverrides:parse('rosterbot-week-overrides-v1',{}),dayOverrides:parse('rosterbot-day-overrides-v1',{}),checks:parse('rosterbot-pay-checks-v1',{}),allowances:parse('rosterbot-fortnight-allowances-v1',{}),notes:parse('rosterbot-fortnight-notes-v1',{}),paybot:parse('paybot-v06-state',null),preferences:{theme:localStorage.getItem('rosterbot-theme-v1.9'),view:localStorage.getItem('rosterbot-view-mode-v1'),experience:localStorage.getItem('rosterbot-experience-v1')},dates,
      events:window.__phase10Events||[],replacementSuppressed:window.RosterBotPersistenceSafety?.isReplacementInProgress?.()||false,booting:document.documentElement.classList.contains('rb-booting'),dashboardVisible:!!document.getElementById('dashTodayCard')?.offsetParent,cloud:window.RosterBotCloudSync?.summary?.()||null
    };
  });
}

function assertLegacyMeaning(actual){
  assert.equal(actual.marker,'5');
  assert.equal(actual.timeline.length,2);
  assert.equal(actual.timeline[0].mode,'swap');
  assert.equal(actual.timeline[0].trackA.roster,'A');
  assert.equal(actual.timeline[0].trackB.roster,'B');
  assert.deepEqual(actual.annualLeave,['2026-06-07']);
  assert.equal(actual.weekLeave['2026-07-05'].type,'personal');
  assert.equal(actual.weekOverrides['2026-09-06'].line,12);
  assert.equal(actual.dayOverrides['2026-09-29'].notes,'Synthetic v0.21.1 changed job');
  assert.equal(actual.checks['2026-08-23'].actualGross,6740.25);
  assert.equal(actual.allowances['2026-09-20'].A641,2);
  assert.equal(actual.notes['2026-09-20'],'Synthetic v0.21.1 fortnight note');
  assert.equal(actual.paybot.logicVersion,'0.20.6');
  assert.deepEqual(actual.preferences,{theme:'6',view:'compact',experience:'diary'});
  assert.equal(actual.dates['2025-04-20'].track,'B');
  assert.equal(actual.dates['2026-06-08'].isAnnualLeave,true);
  assert.equal(actual.dates['2026-09-07'].isWeekOverride,true);
  assert.equal(actual.dates['2026-09-29'].day.actualOverride.notes,'Synthetic v0.21.1 changed job');
}

async function importBackup(payload,{disturbDiaryReady=false,label='legacy'}={}){
  const {context,page,record}=await launchCase({disturbDiaryReady});
  await page.goto(`${base}/index.html`,{waitUntil:'domcontentloaded'});await waitReady(page);
  const initial=await state(page),initialNavigations=record.navigationCount;
  if(disturbDiaryReady)await page.evaluate(()=>sessionStorage.setItem('phase10a-disturb-diary-ready','1'));
  await page.evaluate(()=>window.RosterBotDataUI.show());
  const file=typeof payload==='string'?payload:{name:`${label}.rosterbot`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))};
  const navigation=page.waitForNavigation({waitUntil:'domcontentloaded',timeout:15000});await page.locator('#importDataFile').setInputFiles(file);await navigation;
  await waitReady(page,20000);
  const imported=await state(page);
  assert.equal(record.navigationCount,initialNavigations+1,`${label}: import must perform exactly one automatic navigation`);
  assert.equal(imported.booting,false);assert.equal(imported.dashboardVisible,true);assert.equal(imported.replacementSuppressed,false);
  assert.equal(imported.cloud?.schema5CapabilityHold,true,`${label}: Cloud capability-4 hold was not retained`);
  assert(imported.generation.number>initial.generation.number,`${label}: imported data must create a new schema-5 generation`);
  assert.equal(imported.journalState,'complete');assert.equal(imported.journalStartedAt,initial.journalStartedAt,`${label}: completed startup migration journal must not restart`);
  const schemaReady=imported.events.findIndex(event=>event.type==='rosterbot:schema5-ready'),payReady=imported.events.findIndex(event=>event.type==='paybot:ready'),applicationStarting=imported.events.findIndex(event=>event.type==='rosterbot:application-starting'),applicationReady=imported.events.findIndex(event=>event.type==='rosterbot:application-ready');
  assert(schemaReady>=0,`${label}: schema-5 readiness was not observed`);assert(payReady>schemaReady,`${label}: features loaded before schema-5 verification`);assert(applicationStarting>payReady,`${label}: initial navigation rendered before feature loading completed`);assert(applicationReady>applicationStarting,`${label}: application readiness did not follow initial navigation and projection verification`);
  const stableEnvelope=imported.envelopeRaw;await page.reload({waitUntil:'domcontentloaded'});await waitReady(page);const reloaded=await state(page);assert.equal(reloaded.envelopeRaw,stableEnvelope,`${label}: a subsequent reload remigrated or changed the import`);assert.equal(reloaded.journalStartedAt,initial.journalStartedAt);assert.equal(record.external.some(item=>item.method!=='GET'),false,`${label}: a held schema-5 client attempted an external mutation`);
  await context.close();return {record,initial,imported,reloaded};
}

async function malformedImport(){
  const {context,page,record}=await launchCase();await page.goto(`${base}/index.html`);await waitReady(page);await page.waitForTimeout(200);await page.evaluate(()=>window.RosterBotSchema5Persistence.syncNow('phase10a-malformed-baseline'));const before=await state(page),initialNavigations=record.navigationCount;await page.evaluate(()=>window.RosterBotDataUI.show());await page.locator('#importDataFile').setInputFiles({name:'malformed.rosterbot',mimeType:'application/json',buffer:Buffer.from('{not-json')});await page.waitForFunction(()=>/not valid JSON/i.test(document.getElementById('dataStatus')?.textContent||''));const after=await state(page);assert.equal(record.navigationCount,initialNavigations);assert.equal(after.envelopeRaw,before.envelopeRaw);assert.equal(after.booting,false);assert.equal(after.replacementSuppressed,false);assert.equal(await page.locator('#dataModal').isVisible(),true);await context.close();return {unchanged:true,status:'rejected-before-replacement',record};
}

const currentStorage=Object.fromEntries(Object.entries(corpus.longLivedOfficial.localStorage).map(([key,value])=>[key,typeof value==='string'?value:JSON.stringify(value)]));
const current={app:'RosterBotPayBot',version:'0.29.1',schemaVersion:4,exportedAt:'2026-10-01T00:00:00.000Z',privacy:'Synthetic current schema-4 regression backup.',storage:currentStorage};
const results={legacy:null,webKitLikeDelayedOrdering:null,currentSchema4:null,malformed:null};
try{
  results.legacy=await importBackup(legacyPath,{label:'v0.21.1'});assertLegacyMeaning(results.legacy.imported);
  results.webKitLikeDelayedOrdering=await importBackup(legacyPath,{label:'v0.21.1-delayed',disturbDiaryReady:true});assertLegacyMeaning(results.webKitLikeDelayedOrdering.imported);
  results.currentSchema4=await importBackup(current,{label:'v0.29.1'});assert.equal(results.currentSchema4.imported.timeline.length,6);assert.equal(results.currentSchema4.imported.timeline.at(-1).id,'future-swap');
  results.malformed=await malformedImport();
  console.log(JSON.stringify({legacy:{automaticNavigation:true,generation:results.legacy.imported.generation.number,semanticDates:results.legacy.imported.dates},webKitLikeDelayedOrdering:{automaticNavigation:true,events:results.webKitLikeDelayedOrdering.imported.events},currentSchema4:{automaticNavigation:true,generation:results.currentSchema4.imported.generation.number},malformed:results.malformed,pageErrors:[...results.legacy.record.pageErrors,...results.webKitLikeDelayedOrdering.record.pageErrors,...results.currentSchema4.record.pageErrors,...results.malformed.record.pageErrors]},null,2));
}finally{await new Promise(resolve=>server.close(resolve))}
