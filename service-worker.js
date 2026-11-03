'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:4f3214f274e4a1b69ff90c6b2f3421897e2e8cfe7373f778f247284e03849ee3","manifestFormat":2,"cacheName":"rosterbot-app-4f3214f274e4a1b69ff90c6b2f3421897e2e8cfe7373f778f247284e03849ee3","completeBuildMarker":"rosterbot-complete-4f3214f274e4a1b69ff90c6b2f3421897e2e8cfe7373f778f247284e03849ee3","markerPath":".rosterbot/complete/4f3214f274e4a1b69ff90c6b2f3421897e2e8cfe7373f778f247284e03849ee3.json","offlineSetDigest":"97db60646203f9064b8a5ef7c975c5056cb083d05646b5fd1c0702beb17ade7e","required":[{"url":"index.html","sha256":"de4e239ca567eb7a2bd6419900de1485eb65f3fc704072db78398a80521f6883","bytes":195620,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"319ee74a61fdc60a5689fd62bf426cc819241a5bf3418110f1daceb2ae0b8ebb","bytes":260748,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"0f68ab976ba9e1ee0652c8a02b65febc57362f4b24c1e0187087a75cb5f0459f","bytes":5935,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"cb0b88d2fa27320bd4fc3ea195f700c3d5ab02e0086f47aab997508c6e750c06","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"11fcb130742f336dc3ada388b5bf743d3ae50e905509c8a0646eccf88c6fd9ae","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"c5505f8d04a5b2390b75253223c14f21937efc01194d2ef43c85f402ea85cac7","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"8f25f7fad1418821dc877c0afb26a0c14b0cdb082f1366ba99d0e90e9aaf8334","bytes":22950,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"1cbccedac0000280f80bfb1f226e03d8e2eefbaf540872301c9fa148b2792b97","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"3af6ce8e2041ab601c5e8238270c5ad922a0c460fd2fe3f4f98ced923f29eced","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"9f01a2cdafa3b5fd1ad71028dbb4dbef3f8347ea446714ef9cc0d4ee6ebcadd0","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"972b6c102a46531f7492019fe69cad23300f589405e7e625f98064bfb9f8a8fc","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"94fbe878e7a26bbe67d470b4267a7c7d4dd5e3ad437f35e1f48dd7f344717cf0","bytes":49894,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"7d5c2f5bdb9d432e93c7ac4573dc99591a6137777c5b61354bc3b7b0de43613d","bytes":25686,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"c530469ff60b9739022edd3dd7644088890b1bf5349a1324e4d2d83879ce6f43","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"3145ad952bb8b70e308b909f4e4bc78dcc7c1872b2547dedd6a1c3bee0f5a79b","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"d898ebf0f7de13c715120afcc887d401f578b6c0a7dde71afbdcdb769495c44a","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"46bf0820ceb3a73f82e02e6c0a2ebff6041d2f0d4357cfbee058abd9a15b7ec3","bytes":5917,"type":"text/javascript"},{"url":"js/32-dialog-controller.js","sha256":"81905249825a7205a67ff69436b5d8ad6414366a943188f774feae039b3142b3","bytes":5507,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"d9ebf457f1d81488efb67ed1cc2c8a0822b5ea40cee25b618d47b949e505880a","bytes":14373,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"f21abfda429bceb88b79345313bacc6fb9cd76d1157fa616d18b121a08258a3a","bytes":112209,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"b6fa9363c826a616b54a79c4baff1cbddec36582e66904e59dc1154b60219718","bytes":4940,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"19ce2e611e8aed1874854c9a5e4bb3420e30c6083150f39ab6d9c249621965a1","bytes":824,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"3bc7a54ceed9278dfb25e13cbde8ec409ac110c1d4c4cadabbef380b2856f460","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"16b77f8f8c3432a43271277ba10af8fa6d9fa2278212aaa2e057f7ae66fa5074","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"5861bc55f2fabc6e480b6d702c66536277de07a9c80fdd0ae5dbbe50989d057f","bytes":74526,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"e0a8446425f630cdcca7ea3cb00025a2e1dbd7b9713dfa3a4e758347352c410b","bytes":17070,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"02ff44df9e3b659d7bf9ffaf49e70c0e17c1b858f2a3c70e0af09c08a8d326a8","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"107085a4d0cc61f1dc59264fdb4c4f57f879d38d6fca4d18c39182395e921c92","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"db6035f526001fa109406b534c82f7f1f8e4e41bea8328dd00abb2dbd5dd9421","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"02b3112aa13b6f804b13547142d5ca5cabbd9affbe9353ad2af7c98b18ae7c3e","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"cf94dac48ceab91436fba9abf55bbc92f4fef2bc2cb2a27ba0189933e74281e1","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"ce0fd855122c89d602a3f3fc65a5698c7ffe7642e47e9778db3b532cd887ab53","bytes":128926,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"cc40d998cd74414c7526ab0eb206153528a4a375b009c5cefe6a8fa0b2341265","bytes":43369,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"5a452a57e3a672a1bc5c14a17a35fc4728a539d381573efe9ded5a50167a76e5","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"edaf0e5a5cb9d93171667e99f4e5b69dc9d4bc0357d4f5f22ba51eeb598ac87e","bytes":4751,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"93a442e8627230a45c848d97881174525ae196d408f6ff9a3f3fb21243e44c59","bytes":55955,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"3be0942d6fed7ab0919bc77c01658355369445c964e8ccdde82b939b454ca095","bytes":24247,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"aaa37cf2449406da439ee383391a05c088731ec0fb913cd6348c00e06926fe3b","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"1aaf4f2639a0a3ed704053f7a5448df9c5187017fb86d09c94975a70d3fac8d8","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"2877fa18223f0a2e144c450423b35a0261a35f5a0edf1e9051d4044236ad3534","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
for(const key of ['required','cosmetic']){for(const asset of BUILD[key])Object.freeze(asset);Object.freeze(BUILD[key])}Object.freeze(BUILD);
const CACHE_PREFIX='rosterbot-app-',assetByPath=new Map();let lifecycle='parsed',lastFailure=null;

function absoluteUrl(relative){return new URL(relative,self.registration.scope).href}
function markerUrl(){return absoluteUrl(BUILD.markerPath)}
function activationUrl(){return absoluteUrl('.rosterbot/update/'+BUILD.buildId.slice('rb-build:'.length)+'.json')}
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
async function readActivation(){try{const cache=await caches.open(BUILD.cacheName),response=await cache.match(activationUrl());return response?.ok?await response.json():null}catch(_){return null}}
async function writeActivation(value){const cache=await caches.open(BUILD.cacheName);await cache.put(activationUrl(),new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}}))}
async function verifiedComplete(){return !!await readExactMarker(await caches.open(BUILD.cacheName))}
async function broadcast(message){const clients=await self.clients.matchAll?.({type:'window',includeUncontrolled:true})||[];for(const client of clients)try{client.postMessage(message)}catch(_){}return clients.length}
async function retireObsoleteCaches(previousBuildId){
  const clients=await self.clients.matchAll?.({type:'window',includeUncontrolled:true})||[];if(clients.length>1)return {removed:[],deferred:'multiple-clients'};
  const complete=[];for(const name of await caches.keys()){if(!name.startsWith(CACHE_PREFIX)||name===BUILD.cacheName)continue;try{const cache=await caches.open(name),request=(await cache.keys()).find(item=>new URL(item.url).pathname.includes('/.rosterbot/complete/'));if(!request)continue;const marker=await (await cache.match(request)).json();if(marker?.format==='rosterbot-complete-build'&&marker.cacheName===name)complete.push(marker)}catch(_){}}
  const previousName=typeof previousBuildId==='string'?CACHE_PREFIX+previousBuildId.slice('rb-build:'.length):null,newest=complete.sort((a,b)=>Number(b.installedAt||0)-Number(a.installedAt||0))[0]?.cacheName,keep=new Set([BUILD.cacheName,previousName,newest].filter(Boolean)),removed=[];
  for(const marker of complete)if(!keep.has(marker.cacheName)&&await caches.delete(marker.cacheName))removed.push(marker.cacheName);
  return {removed,deferred:null};
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
  return {type:'ROSTERBOT_OFFLINE_STATUS',applicationVersion:BUILD.applicationVersion,buildId:BUILD.buildId,manifestFormat:BUILD.manifestFormat,cacheName:BUILD.cacheName,completeBuildMarker:BUILD.completeBuildMarker,markerPath:BUILD.markerPath,offlineSetDigest:BUILD.offlineSetDigest,offlineRequiredCount:BUILD.required.length,cacheComplete,lifecycle:reportedLifecycle,failure:lastFailure,activation:await readActivation()}
}
async function activationMessage(event){
  const reply=value=>{try{event.ports?.[0]?.postMessage(value)}catch(_){}};
  if(event.data?.buildId!==BUILD.buildId){reply({ok:false,reason:'activation-build-mismatch'});return}
  if(!await verifiedComplete()){reply({ok:false,reason:'activation-complete-marker-invalid'});return}
  const record={format:'rosterbot-update-activation-v1',buildId:BUILD.buildId,fromBuildId:event.data?.fromBuildId||null,requestedAt:Date.now(),provenReady:false};await writeActivation(record);await broadcast({type:'ROSTERBOT_UPDATE_ACTIVATING',buildId:BUILD.buildId,fromBuildId:record.fromBuildId});reply({ok:true,reason:'activation-accepted',buildId:BUILD.buildId});await self.skipWaiting()
}
async function buildReadyMessage(event){
  if(event.data?.buildId!==BUILD.buildId||event.data?.coherent!==true||!await verifiedComplete())return;
  const prior=await readActivation(),record={...(prior||{}),format:'rosterbot-update-activation-v1',buildId:BUILD.buildId,provenReady:true,readyAt:Date.now()};await writeActivation(record);const retirement=await retireObsoleteCaches(record.fromBuildId);await broadcast({type:'ROSTERBOT_UPDATE_READY_PROVEN',buildId:BUILD.buildId,retirement})
}
async function coordinateMessage(event){if(!event.data?.payload||event.data.payload.protocol!=='rosterbot-update-v1')return;await broadcast({type:'ROSTERBOT_UPDATE_COORDINATION',payload:event.data.payload})}

self.addEventListener('install',event=>{event.waitUntil(installBuild())});
self.addEventListener('activate',event=>{event.waitUntil(activateBuild())});
self.addEventListener('fetch',event=>{const target=route(event.request);if(!target)return;event.respondWith(coherentAsset(target.asset).catch(error=>target.navigation?damagedNavigation(error):damagedAsset(error)))});
self.addEventListener('message',event=>{const type=event.data?.type;if(type==='ROSTERBOT_OFFLINE_STATUS'&&event.ports?.[0])event.waitUntil?.(statusMessage().then(value=>event.ports[0].postMessage(value)));else if(type==='ACTIVATE_THIS_COMPLETE_BUILD')event.waitUntil?.(activationMessage(event));else if(type==='ROSTERBOT_BUILD_READY')event.waitUntil?.(buildReadyMessage(event));else if(type==='ROSTERBOT_UPDATE_COORDINATE')event.waitUntil?.(coordinateMessage(event))});
Object.defineProperty(self,'__ROSTERBOT_SERVICE_WORKER_BUILD__',{value:BUILD,writable:false,configurable:false});
