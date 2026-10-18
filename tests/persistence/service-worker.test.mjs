import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {root,readSource} from './helpers.mjs';
import {RUNTIME_SOURCE_ASSETS,isOfflineRequired} from '../../scripts/runtime-assets.mjs';
import {serviceWorkerContract,serviceWorkerSource,verifyServiceWorker} from '../../scripts/service-worker-build.mjs';

const manifest=JSON.parse(readSource('rosterbot-build-manifest.json')),contract=serviceWorkerContract(manifest),scope='https://offline.test/';

class MemoryCache{
  constructor(name,operations){this.name=name;this.operations=operations;this.entries=new Map()}
  key(input){return typeof input==='string'?new URL(input,scope).href:new URL(input.url,scope).href}
  async put(input,response){const key=this.key(input),body=Buffer.from(await response.arrayBuffer()),headers=Object.fromEntries(response.headers);this.entries.set(key,{body,status:response.status,statusText:response.statusText,headers});this.operations.push({type:'put',cache:this.name,url:key})}
  async match(input){const value=this.entries.get(this.key(input));return value?new Response(value.body,{status:value.status,statusText:value.statusText,headers:value.headers}):undefined}
  async delete(input){return this.entries.delete(this.key(input))}
  async keys(){return [...this.entries.keys()].map(url=>new Request(url))}
  setRaw(url,body,{status=200,headers={'content-type':'application/octet-stream'}}={}){this.entries.set(this.key(url),{body:Buffer.from(body),status,statusText:'',headers})}
}

class MemoryCaches{
  constructor(){this.values=new Map();this.operations=[]}
  async open(name){if(!this.values.has(name))this.values.set(name,new MemoryCache(name,this.operations));return this.values.get(name)}
  async keys(){return [...this.values.keys()]}
  async delete(name){this.operations.push({type:'delete-cache',cache:name});return this.values.delete(name)}
}

function fixtureBytes(relative){return fs.readFileSync(path.join(root,relative))}
function workerHarness({faults=new Map(),caches=new MemoryCaches()}={}){
  const handlers=new Map(),fetches=[],personal={reads:0,writes:0},clients={claims:0,async claim(){this.claims++}};
  const self={registration:{scope},clients,addEventListener(type,handler){handlers.set(type,handler)}};
  const fetch=async request=>{
    const url=new URL(typeof request==='string'?request:request.url),relative=url.pathname.slice(1),fault=faults.get(relative);fetches.push(relative);
    if(fault?.type==='timeout')throw new TypeError('Synthetic network timeout');
    if(fault?.type==='interrupt')throw new DOMException('Synthetic interrupted install','AbortError');
    if(fault?.type==='status')return new Response('missing',{status:fault.status});
    const bytes=fault?.type==='bytes'?Buffer.from(fault.bytes):fixtureBytes(relative);
    return new Response(bytes,{status:200,headers:{'content-type':manifest.assets.find(asset=>asset.url===relative)?.type||'application/octet-stream'}});
  };
  const sandbox={self,caches,fetch,crypto:webcrypto,Request,Response,URL,TextEncoder,DOMException,Date,console,localStorage:new Proxy({}, {get(){personal.reads++;throw new Error('service worker touched localStorage')},set(){personal.writes++;throw new Error('service worker touched localStorage')}}),indexedDB:new Proxy({}, {get(){personal.reads++;throw new Error('service worker touched IndexedDB')}})};
  vm.runInContext(serviceWorkerSource(manifest),vm.createContext(sandbox),{filename:'service-worker.js'});
  async function dispatchLifecycle(type){let promise;handlers.get(type)({waitUntil(value){promise=Promise.resolve(value)}});assert(promise,`${type} did not call waitUntil`);return promise}
  async function dispatchFetch(request){let responsePromise=null;handlers.get('fetch')({request,respondWith(value){responsePromise=Promise.resolve(value)}});return responsePromise?{handled:true,response:await responsePromise}:{handled:false,response:null}}
  return {handlers,caches,fetches,personal,clients,self,dispatchLifecycle,dispatchFetch};
}

async function writeMarker(cache,{cacheName,buildId,installedAt=1,offlineSetDigest='old-digest',requiredCount=1,manifestFormat=2,completeBuildMarker=`rosterbot-complete-${buildId.slice('rb-build:'.length)}`}={}){
  const marker={format:'rosterbot-complete-build',manifestFormat,applicationVersion:'0.30.0',buildId,cacheName,completeBuildMarker,offlineSetDigest,requiredCount,installedAt};
  await cache.put(`${scope}.rosterbot/complete/${buildId.slice('rb-build:'.length)}.json`,new Response(JSON.stringify(marker),{status:200,headers:{'content-type':'application/json'}}));
}

test('generated worker is exact-build stamped and derives its offline set from manifest classifications',async()=>{
  const verified=await verifyServiceWorker(root,{manifest});assert.equal(verified.contract.buildId,manifest.buildId);assert.equal(verified.contract.cacheName,manifest.cacheNamespace);assert.equal(verified.contract.manifestFormat,2);
  assert.deepEqual(contract.required.map(asset=>asset.url),manifest.assets.filter(asset=>isOfflineRequired(asset.url)).map(asset=>asset.url));
  assert.equal(contract.required.length,44);assert.equal(contract.cosmetic.length,3);
  assert.match(readSource('service-worker.js'),new RegExp(manifest.buildId));assert.doesNotMatch(readSource('service-worker.js'),/skipWaiting\s*\(/);
});

test('successful install validates every required asset and writes the complete marker last',async()=>{
  const harness=workerHarness();await harness.dispatchLifecycle('install');const cache=await harness.caches.open(contract.cacheName),marker=await cache.match(`${scope}${contract.markerPath}`);
  assert(marker?.ok);assert.deepEqual((await marker.json()).buildId,contract.buildId);
  assert.deepEqual(harness.fetches.slice(0,contract.required.length),contract.required.map(asset=>asset.url));
  const puts=harness.caches.operations.filter(item=>item.type==='put'&&item.cache===contract.cacheName);assert.equal(puts.at(-1).url,`${scope}${contract.markerPath}`);
  assert.equal(harness.clients.claims,0);assert.deepEqual(harness.personal,{reads:0,writes:0});
});

test('concurrent same-build installers cannot delete or partially replace one another',async()=>{
  const caches=new MemoryCaches(),first=workerHarness({caches}),second=workerHarness({caches});
  await Promise.all([first.dispatchLifecycle('install'),second.dispatchLifecycle('install')]);
  const cache=await caches.open(contract.cacheName),marker=await cache.match(`${scope}${contract.markerPath}`);
  assert.equal((await marker.json()).buildId,contract.buildId);
  for(const asset of contract.required)assert(await cache.match(`${scope}${asset.url}`),asset.url);
  assert.equal((await caches.keys()).filter(name=>name===contract.cacheName).length,1);
});

for(const [label,fault] of [
  ['required 404',{type:'status',status:404}],
  ['required timeout',{type:'timeout'}],
  ['required hash mismatch',{type:'bytes',bytes:'newer mixed-build bytes'}],
  ['interrupted install',{type:'interrupt'}]
])test(`atomic install rejects ${label}, leaves the target invalid without a marker, and preserves a complete active cache`,async()=>{
  const caches=new MemoryCaches(),oldName=`rosterbot-app-${'a'.repeat(64)}`,oldBuild=`rb-build:${'a'.repeat(64)}`,old=await caches.open(oldName);
  await writeMarker(old,{cacheName:oldName,buildId:oldBuild,installedAt:10});old.setRaw(`${scope}index.html`,'old coherent app');
  const failing=contract.required[Math.min(4,contract.required.length-1)].url,harness=workerHarness({caches,faults:new Map([[failing,fault]])});
  await assert.rejects(()=>harness.dispatchLifecycle('install'));
  assert.equal(caches.values.has(contract.cacheName),true);assert.equal(await (await caches.open(contract.cacheName)).match(`${scope}${contract.markerPath}`),undefined);assert.equal(caches.values.has(oldName),true);assert(await old.match(`${scope}index.html`));assert.deepEqual(harness.personal,{reads:0,writes:0});
});

test('an incomplete same-build cache from an earlier crash is deterministically repaired before completion',async()=>{
  const caches=new MemoryCaches(),incomplete=await caches.open(contract.cacheName);incomplete.setRaw(`${scope}index.html`,'partial');
  const harness=workerHarness({caches});await harness.dispatchLifecycle('install');
  const clean=await caches.open(contract.cacheName);assert(await clean.match(`${scope}${contract.markerPath}`));assert.equal(Buffer.from(await (await clean.match(`${scope}index.html`)).arrayBuffer()).toString('hex'),fixtureBytes('index.html').toString('hex'));
});

test('activation claims only a completed build and conservatively retains foreign complete and installing caches',async()=>{
  const caches=new MemoryCaches(),harness=workerHarness({caches});await harness.dispatchLifecycle('install');
  for(const [suffix,installedAt] of [['a',5],['b',20],['c',10]]){const buildId=`rb-build:${suffix.repeat(64)}`,name=`rosterbot-app-${suffix.repeat(64)}`,cache=await caches.open(name);await writeMarker(cache,{cacheName:name,buildId,installedAt})}
  const incompleteName=`rosterbot-app-${'d'.repeat(64)}`;await caches.open(incompleteName);
  await harness.dispatchLifecycle('activate');assert.equal(harness.clients.claims,1);
  assert.deepEqual((await caches.keys()).sort(),[contract.cacheName,...['a','b','c'].map(suffix=>`rosterbot-app-${suffix.repeat(64)}`),incompleteName].sort());
});

test('corrupt or mixed foundational bytes are never served and exact current-build bytes may repair online',async()=>{
  const faults=new Map(),harness=workerHarness({faults});await harness.dispatchLifecycle('install');await harness.dispatchLifecycle('activate');
  const asset=contract.required.find(item=>item.url==='js/01-persistence-registry.js'),cache=await harness.caches.open(contract.cacheName),url=`${scope}${asset.url}`;
  cache.setRaw(url,'corrupt cached module');faults.set(asset.url,{type:'bytes',bytes:'newer build module'});
  const rejected=await harness.dispatchFetch(new Request(url));assert.equal(rejected.handled,true);assert.equal(rejected.response.status,503);assert.equal(rejected.response.headers.get('x-rosterbot-offline-shell'),'damaged');
  faults.delete(asset.url);const repaired=await harness.dispatchFetch(new Request(url));assert.equal(repaired.response.status,200);assert.equal(Buffer.from(await repaired.response.arrayBuffer()).toString('hex'),fixtureBytes(asset.url).toString('hex'));
});

test('navigation uses only the active complete build and damaged offline navigation is distinct from Data Recovery',async()=>{
  const harness=workerHarness();await harness.dispatchLifecycle('install');await harness.dispatchLifecycle('activate');
  const normal=await harness.dispatchFetch({method:'GET',mode:'navigate',url:`${scope}diary?from=home`});assert.equal(normal.response.status,200);assert.match(await normal.response.text(),/<!doctype html>/i);
  const cache=await harness.caches.open(contract.cacheName);await cache.delete(`${scope}${contract.markerPath}`);
  const damaged=await harness.dispatchFetch({method:'GET',mode:'navigate',url:`${scope}roster`});const body=await damaged.response.text();assert.equal(damaged.response.status,503);assert.match(body,/application files are unavailable/);assert.match(body,/roster data has not been changed/);assert.doesNotMatch(body,/Data Recovery/);
});

test('authenticated, Cloud, feedback, unknown same-origin and cross-origin requests bypass Cache Storage',async()=>{
  const harness=workerHarness();await harness.dispatchLifecycle('install');await harness.dispatchLifecycle('activate');
  const urls=[
    'https://example.supabase.co/auth/v1/token','https://example.supabase.co/rest/v1/roster_state',
    'https://example.supabase.co/rest/v1/roster_revisions','https://example.supabase.co/rest/v1/rpc/get_roster_schema_capability',
    'https://formspree.io/f/synthetic','https://external.example/resource',`${scope}rest/v1/unknown`,`${scope}api/calendar-feed`
  ];
  const before=harness.caches.operations.length;
  for(const url of urls){const result=await harness.dispatchFetch(new Request(url));assert.equal(result.handled,false,url)}
  assert.equal(harness.caches.operations.length,before);assert.deepEqual(harness.personal,{reads:0,writes:0});
});

test('registration failure remains an offline-capability status and performs no personal-state or recovery action',async()=>{
  const callbacks=[],listeners=new Map(),storage={reads:0,writes:0},serviceWorker={register:async()=>{throw new DOMException('Synthetic registration denial','SecurityError')},addEventListener(){}};
  const document={documentElement:{dataset:{},classList:{toggle(){}}}},window={document,navigator:{serviceWorker},location:{href:'http://localhost:8765/'},__rosterbotCanonicalOriginDecision:{action:'continue'},__rosterbotApplicationReady:true,__rosterbotRequireBuildComponent(){},RosterBotBuild:{buildId:manifest.buildId},addEventListener(type,handler){listeners.set(type,handler)}};
  const sandbox={window,document,navigator:window.navigator,location:window.location,URL,DOMException,MessageChannel,TextEncoder,setTimeout(callback){callbacks.push(callback);return callbacks.length},clearTimeout(){},localStorage:new Proxy({}, {get(){storage.reads++},set(){storage.writes++;return true}}),indexedDB:new Proxy({}, {get(){storage.reads++}})};sandbox.globalThis=window;
  vm.runInContext(readSource('js/90-service-worker-registration.js'),vm.createContext(sandbox),{filename:'js/90-service-worker-registration.js'});
  const result=await window.RosterBotOfflineShell.register();assert.equal(result.phase,'failed');assert.equal(result.available,false);assert.equal(result.cacheComplete,false);assert.equal(result.reason,'SecurityError');assert.deepEqual(storage,{reads:0,writes:0});assert.equal(window.RosterBotRecovery,undefined);
});
