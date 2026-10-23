'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:b482256cd45fff82a59a3ead9b4866f085f9d5aed8876e3123e1d0ea25568437","manifestFormat":2,"cacheName":"rosterbot-app-b482256cd45fff82a59a3ead9b4866f085f9d5aed8876e3123e1d0ea25568437","completeBuildMarker":"rosterbot-complete-b482256cd45fff82a59a3ead9b4866f085f9d5aed8876e3123e1d0ea25568437","markerPath":".rosterbot/complete/b482256cd45fff82a59a3ead9b4866f085f9d5aed8876e3123e1d0ea25568437.json","offlineSetDigest":"a5ed513a3d7b65f6f34c692f9e9b3e745855ade01d90d410369c3af4f62955b9","required":[{"url":"index.html","sha256":"f7ea775b44a6508e0e821ba07ee6fdd702b684701b382ebc188db136a2e9ab6a","bytes":187190,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"2ceae35bee9c012aeb59173f210cd0299c758418295ff19b0ae3b2ded7a39502","bytes":244390,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"2e51d9a0f7edc3a5402b7fc2e041eb40ae21fac0d8e0aadb256ef20db6af0d83","bytes":5935,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"5e0db6e6a109b795d9d306988d2d00b280bd04c93e4170936db938fce9548d55","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"5c82d9c6d1886b3d8c8b711d127df8c7b40f099fe0aa142277b8ef5c9229d39c","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"245afe63f362ae545b714d29f5c2f855a41b6f9732defc92490b5e9d4c2759a2","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"ba7ee8343633fcd37feb57d463a9f9525b5aeba642370dbade188ac3ae9a75f7","bytes":22043,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"77cf4c22e975417fe84841e20aaae2ef2de39a9344cbafab6d2722e19348e5e7","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"069795e41c7d281c9211d1d44703450edb3405b214a2f74674efcef30a0dcaca","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"0fded3b1348c655f565f0ea08cfeee521779e57e2030bc1a07ae4989eed45aff","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"ea938a31c5c7f65ae00dff54c087dfd649a7a690c3291af307db5b8732530b2b","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"3ee7c3de687d1c82d13eed4b30d435a1c7579aa333d3e6271bb3fdf0d44475fb","bytes":49894,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"5d72f65c64bb3b8e8548a19c047e5d3c2ff71503984508b70a1251926c3dede9","bytes":25686,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"0750411ddba77b6c226d9d890d57b83ecdc7478d92533cbcee2230a6d4623109","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"387aef3161ab8f34bdc52b6b38074d66454ec08ebcd484dc87c710dd1420f79e","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"9cf5f95da3f73e8acbc2cbfe24ae2758b37d1736defcda2697fe50957c2892f3","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"b64e911b96b0dbad062382a25d2e1340e16cfee97c0e908a838bf41056997cd5","bytes":5917,"type":"text/javascript"},{"url":"js/32-dialog-controller.js","sha256":"ca509de59ec0d47aa28fc2afd0f324c86be2c31fa4f44ff8475fa997626639f8","bytes":5507,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"ac4c77a1d92d55940caa05f847f237eb3f796cfadd6ae491646e4ecbb37b1f97","bytes":14373,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"44bad8388102d1f5631882c1923766eed8636015a79d7a65915e7eb03855e527","bytes":105006,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"7d39c00cee99e65216479a8ff933a802bca60931993f65da5b6505f61bb44684","bytes":4940,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"3197908e326c1721b8e5c78b4de75ae62aa1e13f567c3be524c1d7f4bfac1ed4","bytes":824,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"9763055479d2bcaa59080f98a40a2097e1097d579d07489ba313919b0556ab95","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"10611ff8da29d35c8b15f25a9d7513d7e01f73adad19f150120b65dbc474e6d9","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"2d7ed6e3463fcb4c695862b8b03e6e0c2b84c6d0998d7b7e980fd86a31b4b270","bytes":74526,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"556512efa408ce8faa3b392534beccadcc7532ead291db60320cdb121dd753e5","bytes":17070,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"5aa0923ec3e4f683e51f7a77f0925e1cef0e85a9c57b32f0124e1be6538c982b","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"88de67cc1a83a2e4166329b71d57f687ad5fb672e1e060b653492b89577fbe98","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"fa8fcd9dcebc3e79d887e2a510cbf7676c26adf0644f10164269afb48f2527c0","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"14c9b8fc64bca509b81ba8a4f34d32cf279270e038a76faf741b360a3b342d09","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"ff7897fa183abc573655e275d02c4226e67b284142f7213e1f992374d763ca2a","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"b835e1c2937a3cabadbf20d50858ebe1b0abc16e2511a3793d6193e22f41dfb5","bytes":128926,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"9fc765975040b5d768b141241513565ed209da6fad89c86ac24e5b8b7e7c57ee","bytes":43369,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"7b462b9f314c2773e8a0d06e05ddd1b124100ed27939bb6710c390e5299ab441","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"c1356729ead1731dc4f0af7638bd67817935769999662c5aabeee2b51f6194d2","bytes":4751,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"3ce94099ac09c48522a2a75707b900fcf8ca54514705c1d443e5945512137b3f","bytes":42080,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"1354dd0b7581a0a1916267c0d97c9bbbffcc60f354643f9ce92b397f1643cef0","bytes":24247,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"2df211eb52873779fc83c7d51b1415985d3706fc6a4246b001ebb177fde8034d","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"9c2f572d67ce002b57825febbbf405f04ec8456cabc595b356d9566afd34258a","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"e175150fd14b75678c3860a88150a1b577831f00970cdb1b253b09ac2bcd6fb0","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
