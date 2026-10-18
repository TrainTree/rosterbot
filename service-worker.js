'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:f9c4304bb1dfac70b3c92378a1e00a03e89907406b7b7ef70e0e85cb3d0d2654","manifestFormat":2,"cacheName":"rosterbot-app-f9c4304bb1dfac70b3c92378a1e00a03e89907406b7b7ef70e0e85cb3d0d2654","completeBuildMarker":"rosterbot-complete-f9c4304bb1dfac70b3c92378a1e00a03e89907406b7b7ef70e0e85cb3d0d2654","markerPath":".rosterbot/complete/f9c4304bb1dfac70b3c92378a1e00a03e89907406b7b7ef70e0e85cb3d0d2654.json","offlineSetDigest":"f3c873b315463a37b979cc4644515f781986da4f3c6177be4b153127e37769c5","required":[{"url":"index.html","sha256":"eefcf1e28f20e081eba062d8bc7ad55158b847b8cae907feb0c8620c6572823a","bytes":181510,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"6ee7da62163bacd067488e8ea224e7377f2950609dd327797c254c54da145afe","bytes":222425,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"9e78ed710ad6da5699dbfb378b9820949aa91402b411d460f08a49b1ed1f9ea8","bytes":5848,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"1dba33d967c6c44ee3387993f7cd1611f42b0de55ae5211fbdc77841b79c971d","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"3b37bf34903b77667135e3355a67699dcb77cb91830e896f7abd524c58537568","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"12ec7190a31e72865c8e78079e1ec0e30fd5548ffdc91f240e53a5b0480b5885","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"31c891dbc5974b254a77a42dfb18640f8569451dec790f72ad797147150567f5","bytes":21883,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"241c3a78440ad62fb5c6896d69df434b101fbd0c3dd58deb305ab07297345c6f","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"c3841af7c5d113f9c3bcaee6e26b5a69400a70816360ef66dc46ce862906de22","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"23ce5088851194a86fcdeabc34cd12ec56790c078fc7ba4faf889ec2781a0f43","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"6d050c86d6d1fb4bacc9b4aa2480269a31f1f5cdc8457944bc968407091a053d","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"3c50af933b06d6617b3552a7ca74ceb9dddd7a80e11cf6e9147da9d2f96257c4","bytes":42211,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"9a0e4b1e945aac13253e7aaf2b02de76b65761db0dea25eb4a1daa9601fc32d2","bytes":24037,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"53d13052087107cb7617fcc79a3126d5fc9f4bd71219e2c743e1f6ecbecfe196","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"5adcfd29d066cdb9bc88f9c41ea5d57975760c74f3fedf750ee4766436cbfa12","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"e695ad5935b8f6360afaf63e15379bad163404c206a77e914d290bca4e11989c","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"f0eb577bc0ee92e0824da6cee448d5d9b206d1dbcfbad0a3e4a28fe75e92a7fa","bytes":5917,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"4d645b004429c9bce15cdc1a9485e7bbd565737a4710f2c7dbc53feeef257817","bytes":14406,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"d27bc9699bc24d3bfd6911622e141890d9bb70f0ea5ff8c7da428b9fbc63089f","bytes":103700,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"b9e69d53137a0ef8e931d23a93b1c9299c1d5b85edf4eba8aa2f12fb57fa0d5a","bytes":5365,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"468917190287a04a2a4376daa96849856df6a20a750c9d6773a9010a979625da","bytes":1233,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"c5b9604697f9d7217b59089e7b3039ab04b7574590d43feb5eb89b285addb0aa","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"a132e43d58251be463b0468a26c3d0c75a803f24eeb7af1ae0b178d74a5b01f7","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"82c6e39d0ea0c12f2859b3e141f1174b4a920f830b99488a19a37cc4ad1c056e","bytes":74282,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"1cce835d5164e6a3121f7196d84b00c953d0a48721683e7b1703547846deeb99","bytes":17329,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"fd9df5d78f73e1b7c99338dd1e4166e0a7ad2edb50a198ae3e3b39af759f860c","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"7dc0ab493090ac5f549e6d429cf55e7bba84e23478a4c5e59c834dc7a5d8cf77","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"c9405e90092945c335ca860aaacbed0e20c0607ff166959d250e673d322a10da","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"663e69b716ae2ce3e3e96da10011db5baf0462d4b9471bb5a650dd620500c70e","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"abf5181461d801729698e6628f1ba48c53bdd4887f31a5459bf7380ed73b7a98","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"4746972ffee6d57f9a0a46e73af42e9a0cd6d7d7cca7603098c3010cf30092e6","bytes":128926,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"1528c989ddf07da67aedf26cf980cb6433650f11566dfa8638282dcf901ebcbd","bytes":42991,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"95b8ee5a49169f8f1bdbe76c708886ffd942d7f9907a50abeb7148638fc559ca","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"5459ce4d302e452ed36fdbed6ba93c7d4de11b8b408c07e5d41a280e864c01e7","bytes":5012,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"4b4e8ba730befc5e1da5aa0c07397742526047e68ad1283c2c7aae33cd50b3ff","bytes":36572,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"ea590a70ad5628924aa36c0e4d9df298e3642f2fb422b771f52b82934dadaeee","bytes":24247,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"625965a1f28789eb7fdfeed2ac8ba52ef19011c22ecd91790e8343d50bbb394d","bytes":2521,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"5fb99488f33f28cde9a48921585e6998c51d1235807d2ba6b649e40665dc328f","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"6928b8c65d0793310460b31de905cb069405b977145ea456cd78722c046d94b1","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
