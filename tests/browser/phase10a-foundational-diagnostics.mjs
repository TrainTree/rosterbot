import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const playwrightRoot=process.env.PHASE10A_PLAYWRIGHT_ROOT||'/tmp/rosterbot-phase10a-browser/node_modules/playwright-core';
const {chromium}=await import(pathToFileURL(path.join(playwrightRoot,'index.mjs')));
const executablePath=process.env.PHASE10A_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const foundational=[
  ['01-storage-compatibility','RosterBotStorageCompatibility'],['01-persistence-registry','RosterBotPersistenceRegistry'],
  ['02-canonical-state','RosterBotCanonicalPersistence'],['02-persistence-safety','RosterBotPersistenceSafety'],['02-schema5','RosterBotSchema5'],
  ['03-recovery-ui','RosterBotRecoveryUI'],['03-schema5-migration','RosterBotSchema5Migration'],['03-persistence-bootstrap','RosterBotRecovery']
];
function safeFile(relative){const resolved=path.resolve(root,relative.replace(/^\/+/,''));return resolved===root||resolved.startsWith(root+path.sep)?resolved:null}
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://127.0.0.1'),relative=url.pathname==='/'?'index.html':url.pathname.replace(/^\/+/,''),file=safeFile(relative);if(!file){response.writeHead(403);response.end('forbidden');return}fs.readFile(file,(error,data)=>{if(error){response.writeHead(error.code==='ENOENT'?404:500);response.end(error.message);return}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(data)})});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const base=`http://127.0.0.1:${server.address().port}`;

async function launch({failure=null,resourceFailure=null,capability=null}={}){
  const context=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'rb-foundation-')),{headless:true,executablePath,viewport:{width:390,height:844},locale:'en-AU',timezoneId:'Australia/Melbourne'}),record={pageErrors:[],console:[]};
  await context.addInitScript(mode=>{
    window.__diagnosticStorageWrites=0;
    if(mode==='crypto-absent')Object.defineProperty(window,'crypto',{configurable:true,value:undefined});
    if(mode==='crypto-throws')Object.defineProperty(window,'crypto',{configurable:true,get(){throw new DOMException('Synthetic Web Crypto denial','SecurityError')}});
    if(mode==='indexeddb-absent')Object.defineProperty(window,'indexedDB',{configurable:true,value:undefined});
    if(mode==='indexeddb-throws')Object.defineProperty(window,'indexedDB',{configurable:true,get(){throw new DOMException('Synthetic IndexedDB denial','SecurityError')}});
    if(mode==='localstorage-absent')Object.defineProperty(window,'localStorage',{configurable:true,value:undefined});
    if(mode==='localstorage-throws')Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Synthetic localStorage denial','SecurityError')}});
    if(!mode?.startsWith('localstorage-')){
      const nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
      Storage.prototype.setItem=function(key,value){window.__diagnosticStorageWrites++;return nativeSet.call(this,key,value)};
      Storage.prototype.removeItem=function(key){window.__diagnosticStorageWrites++;return nativeRemove.call(this,key)};
      try{localStorage.setItem('rosterbot-db-schema-v1','4');localStorage.setItem('rosterbot-timeline-v1','[{"id":"diagnostic","startWC":"2026-09-27","mode":"single","trackA":{"depot":"SCS","roster":"A","line":1},"trackB":null}]');window.__diagnosticStorageWrites=0}catch(_){}
    }
  },capability);
  if(failure)await context.route(`**/js/${failure[0]}.js`,async route=>{const source=fs.readFileSync(path.join(root,'js',`${failure[0]}.js`),'utf8'),line=source.indexOf('\n')+1,body=source.slice(0,line)+`throw new Error(${JSON.stringify(`Synthetic foundational failure: ${failure[0]}`)});\n`+source.slice(line);await route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body})});
  if(resourceFailure)await context.route(`**/js/${resourceFailure}.js`,route=>route.abort('blockedbyclient'));
  const page=context.pages()[0]||await context.newPage();page.on('pageerror',error=>record.pageErrors.push(error.message));page.on('console',message=>{if(['error','warning'].includes(message.type()))record.console.push({type:message.type(),text:message.text()})});return {context,page,record};
}

async function blockedResourceCase(moduleName){
  const {context,page,record}=await launch({resourceFailure:moduleName});await page.goto(`${base}/index.html`,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-startup-failure="module"]');const result=await inspect(page);
  assert.equal(result.first.module,moduleName);assert.equal(result.first.kind,'error-event');assert(result.first.filename.endsWith(`/js/${moduleName}.js`));assert.match(result.first.message,/Script failed to load/);assert.equal(result.title,'RosterBot could not start correctly');assert.equal(result.recovery,false);assert.equal(result.destructive,false);assert.equal(result.marker,'4');assert(result.timeline.includes('diagnostic'));assert.equal(result.writes,0);await context.close();return {module:moduleName,urlRetained:true,firstRetained:true,noMutation:true,pageErrors:record.pageErrors};
}
async function inspect(page){return page.evaluate(expected=>({
  first:window.RosterBotBootDiagnostics?.getFirstError?.()||null,records:window.RosterBotBootDiagnostics?.getRecords?.()||[],
  globals:Object.fromEntries(expected.map(([,name])=>[name,typeof window[name]!=='undefined'&&window[name]!==null])),
  title:document.querySelector('[data-startup-failure="module"] h1')?.textContent||'',technical:document.querySelector('[data-startup-failure="module"] textarea')?.value||'',
  recovery:!!document.querySelector('.recovery-screen'),destructive:!!document.querySelector('[data-recovery-choice],[data-recovery-clear-confirm]'),booting:document.documentElement.classList.contains('rb-booting'),
  marker: (()=>{try{return localStorage?.getItem('rosterbot-db-schema-v1')??null}catch(_){return 'unavailable'}})(),timeline:(()=>{try{return localStorage?.getItem('rosterbot-timeline-v1')??null}catch(_){return 'unavailable'}})(),writes:window.__diagnosticStorageWrites
}),foundational)}

async function failureCase(failure){
  const {context,page,record}=await launch({failure});await page.goto(`${base}/index.html`,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-startup-failure="module"]');const result=await inspect(page),[moduleName,globalName]=failure;
  assert.equal(result.first.module,moduleName);assert.equal(result.first.message,`Synthetic foundational failure: ${moduleName}`);assert.equal(result.title,'RosterBot could not start correctly');assert(result.technical.includes(`Synthetic foundational failure: ${moduleName}`));assert.equal(result.globals[globalName],false);assert(result.records.some(item=>item.module===moduleName&&item.phase==='start'));assert(!result.records.some(item=>item.module===moduleName&&item.phase==='complete'));assert.equal(result.recovery,false);assert.equal(result.destructive,false);assert.equal(result.marker,'4');assert(result.timeline.includes('diagnostic'));assert.equal(result.writes,0);assert.equal(result.booting,true);await context.close();return {module:moduleName,firstRetained:true,downstreamErrors:result.records.filter(item=>item.kind&&item!==result.first).length,noMutation:true,pageErrors:record.pageErrors};
}

async function capabilityCase(capability){
  const {context,page,record}=await launch({capability});await page.goto(`${base}/index.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.RosterBotRecovery&&!!window.RosterBotSchema5Migration);await page.waitForTimeout(150);const result=await inspect(page);
  for(const [,globalName] of foundational)assert.equal(result.globals[globalName],true,`${capability}: ${globalName} was not published`);
  assert.equal(result.title,'',`${capability}: capability denial was misclassified as a foundational module failure`);
  if(capability.startsWith('localstorage-')){assert.equal(result.writes,0);assert.equal(result.first?.module,'startup-storage-probe')}else{assert.equal(result.marker,'4');assert(result.timeline.includes('diagnostic'));assert.equal(result.writes,0);assert.equal(result.first,null)}await context.close();return {capability,globalsPublished:true,foundationalFailure:false,noMutation:true,recoveryShown:result.recovery,destructiveRecoveryOffered:result.destructive,pageErrors:record.pageErrors};
}

async function normalCase(){const {context,page,record}=await launch();await page.goto(`${base}/index.html`);await page.waitForFunction(()=>!document.documentElement.classList.contains('rb-booting')&&!!window.RosterBotDashboard,{timeout:30000});const result=await inspect(page);assert.equal(result.first,null);for(const [moduleName,globalName] of foundational){assert.equal(result.globals[globalName],true);const complete=result.records.find(item=>item.module===moduleName&&item.phase==='complete');assert(complete&&complete.expectedGlobalExists===true,`${moduleName}: completion/global marker missing`)}assert.equal(result.recovery,false);await context.close();return {ready:true,firstError:null,pageErrors:record.pageErrors};}

const results={normal:null,failures:[],blockedResource:null,capabilities:[]};
try{results.normal=await normalCase();for(const item of foundational)results.failures.push(await failureCase(item));results.blockedResource=await blockedResourceCase('02-schema5');for(const capability of ['crypto-absent','crypto-throws','indexeddb-absent','indexeddb-throws','localstorage-absent','localstorage-throws'])results.capabilities.push(await capabilityCase(capability));console.log(JSON.stringify(results,null,2))}finally{await new Promise(resolve=>server.close(resolve))}
