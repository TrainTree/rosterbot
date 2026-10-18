'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:f975cefad1b130c09a48db7d44c56aa072049034ff6b25b2e3c31a935cbc3ae8","manifestFormat":2,"cacheName":"rosterbot-app-f975cefad1b130c09a48db7d44c56aa072049034ff6b25b2e3c31a935cbc3ae8","completeBuildMarker":"rosterbot-complete-f975cefad1b130c09a48db7d44c56aa072049034ff6b25b2e3c31a935cbc3ae8","markerPath":".rosterbot/complete/f975cefad1b130c09a48db7d44c56aa072049034ff6b25b2e3c31a935cbc3ae8.json","offlineSetDigest":"4275b39ec81f468b76903b8e4a7d07f3e0a29ab3080e520c30100044bff02194","required":[{"url":"index.html","sha256":"fad5e4a5d88cbe29a08071140631fc7e0b1cad6bb9aea633ebcf8fd527c9e0d2","bytes":182635,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"863a1b7b83618ede544fc7f4f3c5bae3859c4024976c73119a01bef1e72cbc72","bytes":233290,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"fbf2fac919ead6983a5bed4af28ede99aa2212089f80b578f3dbf32e1d2af34b","bytes":5886,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"a5b04b1cec70c456028bf8a651e3e6fe6b4b1427ff3b0aa25a7dace4a6c42c20","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"be491f1ca974646546016a0adc9cc6944940e26df795e1b5f146ff6ca1a8ec82","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"42753554db4b3b0035c2481ba1896551e5c80fa436515b5e3ecd5887cae51f34","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"67b9098d942e4c80c135438f00967abe0d4baaeb47f5309c86ff8a1bd75b8f1c","bytes":21883,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"aaca810d1b5928706ffd54e16e8ca39ecb4f74dc3af711d6196688939cd8d57a","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"ca31c545bac5401d24f566b5ec8723da9da24ff49d8869049f379ebdab7ddd2d","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"8eb3d6aa0b7701afb38fd891913528ab059063d6e1308ee58174c3484fc8e634","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"c852936549b99aad909ba60935fac3355f1104ed87472b7d261a978658bf05eb","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"877d81c814b0fef29ab579ccf640872fc356e37640a3935ddf2a00dbf3b7b7c6","bytes":42211,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"85ffcec5234245c45e38c6078e355a754ddd57185ac8ec4c06678d6d60e9e68c","bytes":24037,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"64bb86ce138b367c40fa4f10f8f5fdc2a48e377e3e9afa20f2f25a762edf5717","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"3f2e903fc4e8e70762b3d82faa7206515e7f1ad48e57ab365880ed5c513696b5","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"58e354f6b414e6261fb6cf13e67989c53486c2237f55814529edc59090b4a3c8","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"298de927f64e1597d078b41f7e6844f32273709e5c1229a48e2a04eb8dfa847d","bytes":5917,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"cf5f09945445520f1c822cd39a08d7a7c515c6feb5c2c8420e3b556e71ac7c19","bytes":14406,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"b12ee7848c78d0bf220bf595a669fd5bf6bec7ff10bfd8f093cc5b5ca073e1b8","bytes":103700,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"29f40f631a77ecc57cfc4304befbd7a223ab64537339f0687f862b57faa4d5ff","bytes":5365,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"da17c8934679b5ef529bde27a03ee679251e67785ca76cd12ea57d62da9bcd17","bytes":1233,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"a6be74a9059ee267ea385ccf6f3fbc89dc437b2b44d3ee5ac5d2d51dd4c47960","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"b376a27887090051934db882121f165aa9150780b803583dc4ae9ccd1055ec04","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"0d32e36b230b5d81ee007f9952dccf39a9d1b1dfc1e6355456cb3e9b782efd8d","bytes":74282,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"51fd6ff2449246abc1a42a9a9d7eaa79b3cb52ad185cabf2f2cc5540663e5f1f","bytes":17329,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"78e0446b3723509aa1cae9346d83bdee1eb7eaea38a474621fceff5014c8e592","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"9e656ab219c0b0b011169440a6208df56eca7ffa98a3fd58b345eec36dbb2bc5","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"a03ddeb08dcfbf933d5f04be42d46a845de22611acfac47a599b007533588b59","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"1ecbb3556708a488fdad84330b498a22b44c3e30049f78c12302bb8e382ca3ae","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"71938ef7cc27afa02c270fb9ecb16d194b4b51d260088cef7db3a52021d7efaa","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"3619eb3ea12864772a379a105e0c0f9fee851e16c651a1713833d660d0cf8038","bytes":128926,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"b538f4189fd89db4431bd9991e7c50c7a3fa9972ff4df5b368d9fec526ed9486","bytes":42991,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"1106bb724b5361b4ee8c88245e452b5e2711a22a6cecf28a31904b88b982ae8f","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"1279ae85b730f42fef8426a624aa0e373748c2eef8e470e7460a71bdc0711613","bytes":5012,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"c2e9f62c10eb518c04a78970f28149ef230b22d28fa9a551f47a707245e0c18f","bytes":36572,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"78339389ac34886231b9a187429e8e25bbb53bd758d6a5d817a1b3e065c1250b","bytes":24247,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"d7b8f308c7cc411410ded6c233d733ac51be4222ef6254972278dedc30d91591","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"1fa1fe28bacefcdcac03212d05e08673b27957fa73f5336e9185567688fa2026","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"807b23aea92d0fbfab0f910bd30d5ceab4a40b23b8c47961441346961282fd53","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
