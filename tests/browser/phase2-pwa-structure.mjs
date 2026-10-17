import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const chromium=process.env.ROSTERBOT_CHROMIUM||'/Users/codex/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
assert(fs.existsSync(chromium),`Chromium executable not found: ${chromium}`);

const contentTypes=new Map([
  ['.html','text/html; charset=utf-8'],['.css','text/css; charset=utf-8'],['.js','text/javascript; charset=utf-8'],
  ['.json','application/json; charset=utf-8'],['.webmanifest','application/manifest+json; charset=utf-8'],
  ['.png','image/png'],['.ico','image/x-icon']
]);
const requests=[];
const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname),relative=pathname==='/'?'index.html':pathname.slice(1);
  const absolute=path.resolve(root,relative);requests.push(pathname);
  if(!absolute.startsWith(`${root}${path.sep}`)&&absolute!==path.join(root,'index.html')){response.writeHead(403).end();return}
  try{const body=fs.readFileSync(absolute),headers={'content-type':contentTypes.get(path.extname(absolute))||'application/octet-stream','cache-control':relative==='service-worker.js'?'no-cache, no-store':'no-store'};if(relative==='service-worker.js')headers['service-worker-allowed']='/';response.writeHead(200,headers);response.end(body)}
  catch(_){response.writeHead(404,{'content-type':'text/plain'});response.end('Not found')}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const address=server.address(),origin=`http://127.0.0.1:${address.port}`,profile=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-phase2-chromium-'));
const browser=spawn(chromium,[
  '--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking',
  '--disable-component-update','--disable-sync','--metrics-recording-only',`--user-data-dir=${profile}`,
  '--remote-debugging-port=0','about:blank'
],{stdio:['ignore','ignore','pipe']});
let debuggingPort='';
browser.stderr.setEncoding('utf8');
browser.stderr.on('data',chunk=>{const match=/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(chunk);if(match)debuggingPort=match[1]});

async function waitForPort(){for(let attempt=0;attempt<100&&!debuggingPort;attempt++)await new Promise(resolve=>setTimeout(resolve,50));assert(debuggingPort,'Chromium did not expose a DevTools port')}
await waitForPort();
const pages=await (await fetch(`http://127.0.0.1:${debuggingPort}/json/list`)).json(),page=pages.find(candidate=>candidate.type==='page');
assert(page?.webSocketDebuggerUrl,'Chromium page target is unavailable');
const socket=new WebSocket(page.webSocketDebuggerUrl),pending=new Map();let sequence=0;
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);if(message.error)reject(new Error(message.error.message));else resolve(message.result)}});
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}

try{
  await command('Page.enable');await command('Runtime.enable');
  await command('Page.navigate',{url:`${origin}/`});
  for(let attempt=0;attempt<200;attempt++){
    const ready=await command('Runtime.evaluate',{expression:'({ready:document.readyState,applicationReady:window.__rosterbotApplicationReady===true})',returnByValue:true});
    if(ready.result.value.ready==='complete'&&ready.result.value.applicationReady)break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  for(let attempt=0;attempt<300;attempt++){
    const offline=await command('Runtime.evaluate',{expression:`(async()=>{try{return await window.RosterBotOfflineShell?.refresh?.()}catch(_){return null}})()`,awaitPromise:true,returnByValue:true});
    if(offline.result.value?.phase==='active'&&offline.result.value?.cacheComplete===true)break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  const manifestResult=await command('Page.getAppManifest'),installability=await command('Page.getInstallabilityErrors');
  const runtime=await command('Runtime.evaluate',{expression:`(async()=>({
    ready:document.readyState,
    applicationReady:window.__rosterbotApplicationReady===true,
    startupFailure:document.getElementById('appStartup')?.dataset.startupFailure||'',
    buildId:window.RosterBotBuild?.buildId||'',
    displayMode:window.RosterBotDisplayMode?.getState?.()||null,
    manifestHref:document.querySelector('link[rel="manifest"]')?.href||'',
    iconHrefs:[...document.querySelectorAll('link[rel~="icon"]')].map(link=>link.href),
    iconStatuses:await Promise.all(['assets/icons/rosterbot-192.png','assets/icons/rosterbot-512.png','assets/icons/rosterbot-maskable-192.png','assets/icons/rosterbot-maskable-512.png','assets/icons/apple-touch-icon.png','assets/icons/favicon-16.png','assets/icons/favicon-32.png','favicon.ico'].map(async url=>({url,status:(await fetch(url,{cache:'no-store'})).status}))),
    serviceWorkerRegistrations:'serviceWorker' in navigator?(await navigator.serviceWorker.getRegistrations()).length:0,
    offlineShell:window.RosterBotOfflineShell?.getStatus?.()||null
  }))()`,awaitPromise:true,returnByValue:true});
  const value=runtime.result.value;
  assert.equal(manifestResult.url,`${origin}/manifest.webmanifest`);assert.deepEqual(manifestResult.errors,[]);
  assert.equal(value.ready,'complete');assert.equal(value.applicationReady,true);assert.equal(value.startupFailure,'');assert.match(value.buildId,/^rb-build:[a-f0-9]{64}$/);
  assert.deepEqual(value.displayMode,{mode:'browser',installed:false,source:'display-mode-media'});
  assert.equal(value.manifestHref,`${origin}/manifest.webmanifest`);assert.equal(value.iconHrefs.length,3);assert(value.iconStatuses.every(item=>item.status===200));assert.equal(value.serviceWorkerRegistrations,1);assert.equal(value.offlineShell.phase,'active');assert.equal(value.offlineShell.cacheComplete,true);
  for(const required of ['/manifest.webmanifest','/assets/icons/rosterbot-192.png','/assets/icons/rosterbot-512.png','/assets/icons/rosterbot-maskable-192.png','/assets/icons/rosterbot-maskable-512.png'])assert(requests.includes(required),required);
  console.log(JSON.stringify({
    chromium:path.basename(chromium),manifest:{url:manifestResult.url,errors:manifestResult.errors},
    installabilityErrors:installability.installabilityErrors,runtime,requestedPresentationAssets:requests.filter(value=>value.includes('manifest')||value.includes('icon')||value.includes('favicon')),
    serviceWorkerRegistrations:value.serviceWorkerRegistrations
  },null,2));
}finally{
  socket.close();browser.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,2000))]);
  server.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
