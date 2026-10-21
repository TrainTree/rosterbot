'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:d91aa0c876599cda1012204dc4b54bb23a35eeade4c6cc38c681cf173336d8b7","manifestFormat":2,"cacheName":"rosterbot-app-d91aa0c876599cda1012204dc4b54bb23a35eeade4c6cc38c681cf173336d8b7","completeBuildMarker":"rosterbot-complete-d91aa0c876599cda1012204dc4b54bb23a35eeade4c6cc38c681cf173336d8b7","markerPath":".rosterbot/complete/d91aa0c876599cda1012204dc4b54bb23a35eeade4c6cc38c681cf173336d8b7.json","offlineSetDigest":"2ccaedff5dc7f22bd6f253b043af99717d26a9677f7e0ae577d0a8c0e4e9877e","required":[{"url":"index.html","sha256":"40d7e444ddd814787f638ca1818871e4b219436fd405c62868f61f4c72c814cd","bytes":186129,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"b5d45fe6b7ec3f9ce72ad1ab2ea5966be52b701997fe06538199c6070f70a43b","bytes":240049,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"1f410104a071ae924ae904c4b0bedb68c58635e166a3123c78b1503dc4e3c027","bytes":5935,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"4db2c4812fa7d3001ae6ea855709e5973fa77813b76c6482c155926a75ff51ed","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"7fe401ca88c7f4574874feee31cb28d8bdb0ef38f3b347a2324dfa536043045c","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"116bdea13bda9e07d3ade1bee82551e3c70f84a5677be4dc61503882383c6926","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"a420eeb8ab1875797e54d49a89bfc879fa1a83ca83ce81f02f8221f5eacbf47d","bytes":22043,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"c3bf0138738cb362b660a0c804aa55024b7adee964b4b00f7cac946ee82ebb5a","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"806c6de57ccb90902b118e40c2763fbe92aa9e174a2b6fb450d65e261c319d6c","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"1447c596974b24ac449cccf1dd8b7cdfedbe582ce1e7c4c592515be0c2d506b9","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"f568b89b953c239414e6db598e30b407c57cf0bd8e067b4d9fc55ed26b573232","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"f9f441e258cd49107757fee65bb88a33a973bdff1b237b8d15f4af1e6a21f63a","bytes":49894,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"2e58981c1a25d09b3a88761031adec7d3499ddd295825d6ff5c28373f40626e8","bytes":25686,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"ff7355eadde4aea0e99c9e0c1409939aaac1ede234763dfdeecc70e8857bd4d9","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"d569c31d3e94dc9840b6857c7eb3bd64e3b41912cfe60a4827ea2782ea54abfd","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"0232678fe6c23c8605f165b2139a02b81d8b6c054f7153f1e740de62899e5d53","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"c70c6171b4f5b0c8314e9bf1b8b4f2283520bb0424b5e111454328dc1e6f339a","bytes":5917,"type":"text/javascript"},{"url":"js/32-dialog-controller.js","sha256":"80e6873949c5c7cf6896f50d8ea5c6367b4864037d7a1ec15a6f009a6e480a08","bytes":5507,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"eb4d4763a34a7e9b12b15e6ccfbf4386bd33482ef1ad87ace8e3f29d3a51d828","bytes":14373,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"ccb4b3aefcf448fa8efba6f63fa380f96c25b862ce45299bdf3ae05b6e8f159f","bytes":105006,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"9b542ac3bf1a6b72b7f6b581257ed6943964235993d11fd396b77e8120d366ff","bytes":4940,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"0beacf8dd3b2c94b837723b2d1bbbb34d7bc900c2183d1ce601a125c5ebfc8fc","bytes":824,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"09520ee179514b49df155a426fcbcb67b29b39285d1e2bebb8ad2ac54cbe208b","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"448fff7dd84bbdcd9bade14a8e7d719b286f7c0a40c3ed1f935398a3f95533a7","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"10c49debeada6c380bb66298c1df5a9ecc7e2e05e89630af9b0b4a88e656f9cf","bytes":74526,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"8fab40b488cae8c54fd76e05dc9a21f74249aefea955bd0b1b3bbe58a38a5973","bytes":17070,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"cb8c19a00d05934b83ce3143b1628d64c32b9eb8fab8f92a7c2fa18881896091","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"25bf2e680fad0e4b38681a8cb46d513132e27e1c22579a7516d32d7c4e7dd874","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"c67eff671384e5069831dac7e82518d9372ded54bed031b40f85aea521cb59ab","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"8fd5ef8f3fa2bdf1ca98df6e238052e04cbad051569399ef83657a4ed4e8d88f","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"a3e768d0668cecbc03f222c6356aef11c5a085219d254c4fe7a85df767506d38","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"e37d5d479d2dfff6ca5e3569ab9e832ab38d400103125c71fa09841616d08bf2","bytes":128926,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"a9d2242f06ff6e1d572d0dbc13f7a60f53a0b75e4b7606cf1b9a2feab6efa67a","bytes":43369,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"ce97e9abdbab8d301d88935be656564f7200c54035faff2f2ac3b2249a833576","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"4c0fdac67b429c37d40571a53cffe114ffbe18d1a933eaaf443bf25007e9c873","bytes":4751,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"85f901cd77c08deb60fff87d888b47b93f296b56831c063d67367d2734eff3a3","bytes":38221,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"e1b20d79098c05f584d229260fae72d80e0b07a6f190538b5ac0ec74aa08a821","bytes":24247,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"563dfb2295a7d15d0021691c37881d3725eff011d699dd946c33dfcc2b4d5ba2","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"33f0fe950cb3ddb559015250e0e1b993fd826a164735e9cb0d0ce59e0d46bb89","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"540e72003ced9416203a252f04b40f773e71a0d549667e39a2447b162136686f","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
