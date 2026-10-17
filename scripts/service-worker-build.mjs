import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {ASSET_MANIFEST_VERSION,GENERATED_MANIFEST_ASSET,GENERATED_SERVICE_WORKER_ASSET,isOfflineRequired} from './runtime-assets.mjs';

const sha256=value=>createHash('sha256').update(value).digest('hex');

export function serviceWorkerContract(manifest){
  if(manifest?.format!=='rosterbot-runtime-build-manifest'||manifest.formatVersion!==ASSET_MANIFEST_VERSION)throw new Error(`Service worker requires runtime build manifest format ${ASSET_MANIFEST_VERSION}.`);
  if(!/^rb-build:[a-f0-9]{64}$/.test(manifest.buildId||''))throw new Error('Service worker requires an exact RosterBot build ID.');
  if(!/^rosterbot-app-[a-f0-9]{64}$/.test(manifest.cacheNamespace||''))throw new Error('Service worker requires an exact build cache namespace.');
  const required=[],cosmetic=[];
  for(const asset of manifest.assets||[]){
    const item={url:asset.url,sha256:asset.sha256,bytes:asset.bytes,type:asset.type};
    if(isOfflineRequired(asset.url)){if(asset.requiredForColdStart!==true&&asset.criticality==='startup-critical')throw new Error(`Startup asset is not marked required: ${asset.url}`);required.push(item)}
    else cosmetic.push(item);
  }
  if(!required.some(asset=>asset.url==='index.html'))throw new Error('Offline-required assets must contain index.html.');
  const urls=[...required,...cosmetic].map(asset=>asset.url),duplicates=urls.filter((value,index)=>urls.indexOf(value)!==index);
  if(duplicates.length)throw new Error(`Service-worker asset list contains duplicates: ${[...new Set(duplicates)].join(', ')}`);
  const offlineSetDigest=sha256(Buffer.from(JSON.stringify(required),'utf8'));
  return Object.freeze({
    applicationVersion:manifest.applicationVersion,buildId:manifest.buildId,manifestFormat:manifest.formatVersion,
    cacheName:manifest.cacheNamespace,completeBuildMarker:manifest.completeBuildMarker,
    markerPath:`.rosterbot/complete/${manifest.buildId.slice('rb-build:'.length)}.json`,
    offlineSetDigest,required:Object.freeze(required),cosmetic:Object.freeze(cosmetic)
  });
}

export function serviceWorkerSource(manifest){
  const contract=serviceWorkerContract(manifest);
  return `'use strict';
// Generated from ${GENERATED_MANIFEST_ASSET}. Do not maintain an asset list here.
const BUILD=${JSON.stringify(contract)};
for(const key of ['required','cosmetic']){for(const asset of BUILD[key])Object.freeze(asset);Object.freeze(BUILD[key])}Object.freeze(BUILD);
const CACHE_PREFIX='rosterbot-app-',assetByPath=new Map();let lifecycle='parsed',lastFailure=null;

function absoluteUrl(relative){return new URL(relative,self.registration.scope).href}
function markerUrl(){return absoluteUrl(BUILD.markerPath)}
for(const asset of [...BUILD.required,...BUILD.cosmetic])assetByPath.set(new URL(asset.url,self.registration.scope).pathname,asset);
function safeFailure(error){return String(error?.name||error?.code||'offline-shell-failure').slice(0,80)}
async function digestHex(buffer){const digest=await crypto.subtle.digest('SHA-256',buffer);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
async function validateResponse(asset,response){
  if(!response||!response.ok||response.type==='opaque')throw new Error('OFFLINE_ASSET_HTTP_'+asset.url);
  const bytes=await response.clone().arrayBuffer();
  if(bytes.byteLength!==asset.bytes)throw new Error('OFFLINE_ASSET_SIZE_'+asset.url);
  if(await digestHex(bytes)!==asset.sha256)throw new Error('OFFLINE_ASSET_HASH_'+asset.url);
  return true;
}
async function fetchValidated(asset){
  const request=new Request(absoluteUrl(asset.url),{method:'GET',credentials:'same-origin',cache:'reload',redirect:'error'}),response=await fetch(request);
  await validateResponse(asset,response);return response;
}
function exactMarker(marker){return marker&&marker.format==='rosterbot-complete-build'&&marker.manifestFormat===BUILD.manifestFormat&&marker.buildId===BUILD.buildId&&marker.cacheName===BUILD.cacheName&&marker.completeBuildMarker===BUILD.completeBuildMarker&&marker.offlineSetDigest===BUILD.offlineSetDigest&&marker.requiredCount===BUILD.required.length}
async function readExactMarker(cache){try{const response=await cache.match(markerUrl());if(!response?.ok)return null;const marker=await response.json();return exactMarker(marker)?marker:null}catch(_){return null}}
async function installBuild(){
  lifecycle='installing';lastFailure=null;
  const priorNames=await caches.keys(),priorMarker=priorNames.includes(BUILD.cacheName)?await readExactMarker(await caches.open(BUILD.cacheName)):null;
  if(priorMarker){lifecycle='installed';return}
  const cache=await caches.open(BUILD.cacheName);
  try{
    // Concurrent installers for the same immutable build may safely write the
    // same validated bytes. No installer deletes the shared target cache.
    for(const asset of BUILD.required){const response=await fetchValidated(asset);await cache.put(absoluteUrl(asset.url),response.clone())}
    for(const asset of BUILD.cosmetic){try{const response=await fetchValidated(asset);await cache.put(absoluteUrl(asset.url),response.clone())}catch(_){}}
    const marker={format:'rosterbot-complete-build',manifestFormat:BUILD.manifestFormat,applicationVersion:BUILD.applicationVersion,buildId:BUILD.buildId,cacheName:BUILD.cacheName,completeBuildMarker:BUILD.completeBuildMarker,offlineSetDigest:BUILD.offlineSetDigest,requiredCount:BUILD.required.length,installedAt:Date.now()};
    await cache.put(markerUrl(),new Response(JSON.stringify(marker),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}}));
    lifecycle='installed';
  }catch(error){lifecycle='failed';lastFailure=safeFailure(error);throw error}
}
async function cleanupCaches(){
  // Phase 3 cannot prove that a cache is unused by every old client or by a
  // concurrently installing worker. Cache retirement is deferred to the
  // coordinated update lifecycle; activation never deletes foreign caches.
  return (await caches.keys()).filter(name=>name.startsWith(CACHE_PREFIX));
}
async function activateBuild(){
  lifecycle='activating';const cache=await caches.open(BUILD.cacheName);
  if(!await readExactMarker(cache)){lifecycle='failed';lastFailure='complete-marker-missing';throw new Error('RosterBot active cache is incomplete')}
  await cleanupCaches();lifecycle='active';await self.clients.claim();
}
async function coherentAsset(asset){
  const cache=await caches.open(BUILD.cacheName);
  if(!await readExactMarker(cache))throw new Error('OFFLINE_COMPLETE_MARKER_MISSING');
  const url=absoluteUrl(asset.url),cached=await cache.match(url);
  if(cached){try{await validateResponse(asset,cached);return cached}catch(_){}}
  try{const repaired=await fetchValidated(asset);await cache.put(url,repaired.clone());return repaired}catch(error){throw new Error('OFFLINE_ASSET_UNAVAILABLE_'+asset.url,{cause:error})}
}
function damagedNavigation(error){
  const detail=safeFailure(error),html='<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b5364"><title>RosterBot application files unavailable</title><style>body{margin:0;background:#0b0c0e;color:#f2f4f7;font:16px system-ui;padding:28px}.card{max-width:620px;margin:10vh auto;padding:24px;border:1px solid #36544e;border-radius:16px;background:#131518}code{overflow-wrap:anywhere;color:#a9f3e4}</style><div class="card"><h1>RosterBot application files are unavailable</h1><p>The saved offline app shell is incomplete or damaged. Reconnect to the internet and reopen RosterBot to install one complete version.</p><p>Your roster data has not been changed.</p><code>Build '+BUILD.buildId+' · '+detail+'</code></div></html>';
  return new Response(html,{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-rosterbot-offline-shell':'damaged'}})
}
function damagedAsset(error){return new Response('RosterBot application asset unavailable: '+safeFailure(error),{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-rosterbot-offline-shell':'damaged'}})}
function route(request){
  if(request.method!=='GET')return null;const url=new URL(request.url),scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return null;
  if(request.mode==='navigate')return {asset:assetByPath.get(new URL('index.html',self.registration.scope).pathname),navigation:true};
  const asset=assetByPath.get(url.pathname);return asset?{asset,navigation:false}:null;
}
async function statusMessage(){
  const cache=await caches.open(BUILD.cacheName),cacheComplete=!!await readExactMarker(cache);let reportedLifecycle=lifecycle;
  if(cacheComplete&&reportedLifecycle==='parsed'){
    if(self.registration.active?.scriptURL===self.location.href)reportedLifecycle='active';
    else if(self.registration.waiting?.scriptURL===self.location.href)reportedLifecycle='installed';
    else if(self.registration.installing?.scriptURL===self.location.href)reportedLifecycle='installing';
  }
  return {type:'ROSTERBOT_OFFLINE_STATUS',applicationVersion:BUILD.applicationVersion,buildId:BUILD.buildId,manifestFormat:BUILD.manifestFormat,cacheName:BUILD.cacheName,offlineRequiredCount:BUILD.required.length,cacheComplete,lifecycle:reportedLifecycle,failure:lastFailure}
}

self.addEventListener('install',event=>{event.waitUntil(installBuild())});
self.addEventListener('activate',event=>{event.waitUntil(activateBuild())});
self.addEventListener('fetch',event=>{const target=route(event.request);if(!target)return;event.respondWith(coherentAsset(target.asset).catch(error=>target.navigation?damagedNavigation(error):damagedAsset(error)))});
self.addEventListener('message',event=>{if(event.data?.type!=='ROSTERBOT_OFFLINE_STATUS'||!event.ports?.[0])return;event.waitUntil?.(statusMessage().then(value=>event.ports[0].postMessage(value))) });
Object.defineProperty(self,'__ROSTERBOT_SERVICE_WORKER_BUILD__',{value:BUILD,writable:false,configurable:false});
`;
}

export async function generateServiceWorker(root,{manifest=null,write=true}={}){
  const value=manifest||JSON.parse(await readFile(path.join(root,GENERATED_MANIFEST_ASSET),'utf8')),source=serviceWorkerSource(value),contract=serviceWorkerContract(value);
  if(write)await writeFile(path.join(root,GENERATED_SERVICE_WORKER_ASSET),source,'utf8');
  return {source,contract};
}

export async function verifyServiceWorker(root,{manifest=null}={}){
  const generated=await generateServiceWorker(root,{manifest,write:false}),current=await readFile(path.join(root,GENERATED_SERVICE_WORKER_ASSET),'utf8');
  if(current!==generated.source)throw new Error('Generated service worker is stale. Run npm run build:identity.');
  return generated;
}
