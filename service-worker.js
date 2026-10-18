'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:3e1538bab65a611c9762cda96eb9dffa0e32eaad5118cb38b6e5c906f02e82e9","manifestFormat":2,"cacheName":"rosterbot-app-3e1538bab65a611c9762cda96eb9dffa0e32eaad5118cb38b6e5c906f02e82e9","completeBuildMarker":"rosterbot-complete-3e1538bab65a611c9762cda96eb9dffa0e32eaad5118cb38b6e5c906f02e82e9","markerPath":".rosterbot/complete/3e1538bab65a611c9762cda96eb9dffa0e32eaad5118cb38b6e5c906f02e82e9.json","offlineSetDigest":"7bec7fc9c1b72db57bc10ff787a94b8fe48037e12f7f5acad3dc89ab7225788a","required":[{"url":"index.html","sha256":"6b6c0dd05d527f66a2845a4e125cf6a557fc35aa8bdc3c5b4dfe2090c660a362","bytes":181563,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"6fa532aeb6647a00d5c948260020b40b6b712b60c5ae3918da69f1fca29fe89b","bytes":228462,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"4b7c91fd548f2c33d0007c12a25bbb47c1ede0812273123c465fc18c5912f53c","bytes":5848,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"6525b9281e8f816e3ebc0d1d7b6fcfdeaa031d1448396087a226b4be582e79d6","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"5566252cc50c8402273a52802d49e14fde279ea28faf5018e0ced031026208b5","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"dac3558ac4d2b43b721afd0a7f729d760400ef29f6275a42a3639cc26479a32f","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"b95b76bd0fc98b465ed62e209c9bbe0f6e4d3687d99a70acea2a46d1479310ed","bytes":21883,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"1b8ad102c0d52a76c553a5d9837eb5890db13200b93942bd19f6ce072e6566cb","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"9e4a014020e6d565e42faef5575347e09ebe29aa2d3e9c452e9fed87447c83ea","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"0aaea0049b7849fdb2bf0b648eaff4924a8578d8766c72ac238c93a88ba8eae4","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"bf0598eb75ee3bd751b178a821f72c1bcf94056ab550ce3fb96d9e5141246d3b","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"1dd154f97b7dfd02a4b72962bc819fa5142f536a50f00bfafaedc73affb5a931","bytes":42211,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"eaf620b0df52bec956c08be3d70a11b0d755beb176deed564d65bfb0bde29c34","bytes":24037,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"de812be70124de7f84ae6f43c40e1408a465d7dd88ecc7da788ff4446ec802f2","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"42e5d95ce34cf5418890806258ed45fd0cf59da542591075a5620f28a9def3bb","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"f98e44ee50eea27790b521c432851ed4c7dcfc51f16e252a5e8f32d47d0c00f8","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"d03f28537bc16df35de042f4bd81523864ad3ff5de843e49e3abea77f19e1e38","bytes":5917,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"aadbd3a5808fc76154bfa3e490e51c324c90faab6844043b429429aa680e4cc2","bytes":14406,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"6af785890661a3801575045d1992a1ab6cb471bf883b863d147205d3dd42809b","bytes":103700,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"8fc9aefa9c2120f89055e3a3e8067f5dc82ba9b42c795bc29338795b8ccfd55c","bytes":5365,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"355675a79131b0cd11a9edf7d37d31f90e4a9a1919fd12fbc5207fabb6465811","bytes":1233,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"29210769f2a6df9b48b48709e2168833cd0ade100ecd934f5313ec5d7f7dd962","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"edd1f64408211943c8f1b78703a288185eecc03b4a15179c0c64799c94bad657","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"5c714a7dce2ea43845c7331aef0ad11240ab10730738a320bc2df8de108a320f","bytes":74282,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"baeb9bcf64b32cf6bdf4b1db08eaf4ee70509051e0c95cd6bb1cc0c5e51491d8","bytes":17329,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"8084807268b8d107c367ae29c332574030f0208fcd80a358bca50fec71fcd536","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"1f128a90a8446ae39c01907b244a29378873e2806e0983c2a8c5303032ba72b6","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"77b6ae77093624e30aef92f4641c78556fdee52eee4f8ed9b8a7a97b3215da33","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"ab8911640e51e931595a3e343ad4c4e6cfd2871550a4967e87eb71935a3bfb9b","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"d794ff123ef44ba9781d0b62e57ac4a6d3a338c7399a8e4c433d8a9c3260e7de","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"5a301432eea6accd222b3c17a6c422caaeddf476a2d00a234f6f68b59f55370e","bytes":128926,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"7f5cbd8224b1b22d4ad167e586bc73fdf2845eba03282e82f40688e1e092c5ab","bytes":42991,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"923158a72d75b9f9135761a9ac8ad55b59ea07064dea9ba6270006d1e60032dd","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"2283bac70caf50590ae747bf7fa628bca08fd0b2b8befad29ead0fcdb562194a","bytes":5012,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"ea46b987d2a1eb5a121ae577e0c9bc4a22680d14dfcfa37567fee9583d590ff8","bytes":36572,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"65fa3e0559eef6d09033bf87a6b3518ae7374d5ff7995d182579acbcc931fa10","bytes":24247,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"73316c0228994a3d6467bbaa904043c2197bfb9860f7f97dc73e3d6bd469a66a","bytes":2521,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"75a4bd94b3758b80500e3ce300f3425c5f1d10a8cfcdd0db331509f56768cbfd","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"9d3e6ee1b662dc8485e26c53740983ce1b24adcf94f9b08565202ef2f92142fb","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
