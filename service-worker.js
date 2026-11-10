'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.32.0-rc.1","buildId":"rb-build:8d8e916e93ef645d84ebcbe44470e83eaef73980dca6c286292a9c717ef79da9","manifestFormat":2,"cacheName":"rosterbot-app-8d8e916e93ef645d84ebcbe44470e83eaef73980dca6c286292a9c717ef79da9","completeBuildMarker":"rosterbot-complete-8d8e916e93ef645d84ebcbe44470e83eaef73980dca6c286292a9c717ef79da9","markerPath":".rosterbot/complete/8d8e916e93ef645d84ebcbe44470e83eaef73980dca6c286292a9c717ef79da9.json","offlineSetDigest":"ee36fcf6767301851fd780a55ee3d275e4fb242b4e7d0ea21999f32fa4ecd80e","required":[{"url":"index.html","sha256":"43331964fab87434b7657498c52ef93ccd3a464d2b47580f2d3447d65002b5e6","bytes":203109,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"4d6b15454373b3a513ce7efe15d33a4375445db3ab87c210893c561157232737","bytes":258673,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"ff395dd056715c051702d0ba46a1fb61067aa4d0ef500b8dc4cbaf12ca3a1874","bytes":5945,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"a7ff9210bca2623269a9dcaf8844cad7a308c1f83f5d9aea475a8a755f8d7b40","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"5e2d85b24ab8dd4dba7e291f1e5a876ab02add48091984d753c96b3dfa006dc3","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"73ad03cc5cf375f2bfdc3670ddc5b9762c1f2f2a621c8568102fecf23a3940c6","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"3d23a8148c2331bba97150f15f1937869e9b2283fecd3065433e714766717478","bytes":22950,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"ef00bf77350d81139dc3a53980106f1fd8016b73c276699353ee1f251a7c9112","bytes":11634,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"6c99035c1e1af56a4214a8b6a3dab00d7819cca1e20d7442a031a000f02a2a4f","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"801345635e84f9c666a1bfcad31a17e313356884f55e13d47f8a9ccb1ce5fc1a","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"a4af8a43e4e310246fbd390143a5e733c9a479b821d8ba480722050ea37a3e92","bytes":18748,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"9ac0c399f7b2cc90a159809250180e1b13fef7dc840f6c0420d70b8dd4772c4a","bytes":49896,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"00ed678bf67ea042f4451db893d1fa4ee6a8a66dfa7c37c0f8499b67a249b8a7","bytes":25686,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"8ea8d8d97efb80eeaf19d9f8a4eb6cd1ecf136d88dcb71f20487212764fff43c","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"67b9840f93e8e42d2e66ee6a96420d02d5b345c055600e991d218b5ba3173efc","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"3f9bfb4d34e2fde50c4a36bf917f4807d23acf135ea80d6a88d8c87ebbc19502","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"7041390f60a767677c3c4de43b0b9e1e3f8d1506436e0a1393159b8992024697","bytes":5917,"type":"text/javascript"},{"url":"js/32-dialog-controller.js","sha256":"1dffcdd5c755929faa3493059220d869033f639d36493920344919d0bb304fd8","bytes":5507,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"e75cbc386e9dd3b791c83e4c954bbd1355c1e57b2ccb0e684eda737f6806754a","bytes":15023,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"eee6b4a92c9d52c9d9a140f0b56218fa550add250985807697d4abf7ffacdfe6","bytes":113584,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"5b433b6377db9c12a445c8dd8035498b109fe17cdfc878de886930ce7b5aeaa7","bytes":4940,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"09b2d4fe1337998fcc04878c83827fc0a467d476054f5741d087ed799b19517f","bytes":824,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"04ce881a685a5dcc6e7e1d30cbeebabbdb246ea0696a6528026b1bb3b86cfffb","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"82b2a9a3efecca00a89e05047ce118d60a9b56e867ebe17890900d8e10df825d","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"f9065648b7d4b6bab3ab12f802cc51a7b7d1e4a6e4c0b17bb109a6744c0fbcf6","bytes":76258,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"15722bfb37d8d069fb1f8cca4b9f14ee366098dafc801c7ba9511c0a35ec4d9e","bytes":17562,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"87cc186e0ac8603d94522f76ba772c77c5b4ba42b388835c9614592d84bb3dec","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"c447bd92a67a9d40422677cb6d7fdf9262c2c16a9df0e0ee28b1e9cc0009b3c4","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"abf4c55294a959927fdd74175fbed13149d0b1fb35106c778b8edc65e6f86c38","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"45cdc65360b921525aa4fd0ba341de07cdb8cf1cc985e756dd27453e9b1a36c4","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"7ec18a0ea230ada4c98ea6cca817dd687d3e847a1872fc04542465ffe3452a5d","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"2e3fdd305aaf171929876c0753e6085cd3fc96fe9d2deb12280efe25f29398f8","bytes":128749,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"e3cad6e6a29acd01854016c3c48085edcc1db085e79643aa77a5112f7d9a416f","bytes":43369,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"fe9c20221cb5845aaa220bd4635ac0808162da0a9472e135734f518b39a6b297","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"0e1901693f0a0bfeecc9ba634dd56bd6863b7c41af16cf585a77e5d7e90f96f5","bytes":4751,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"380a53a8b8a8e49bf79f18fbb5393361efccfd077a273e5593e23bd9a6e321b0","bytes":57968,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"3d87e311b20fef4beb43655c8e1ccb246aab293611ad06084f6ec996ba4a2aec","bytes":24362,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"c926fd98bb4a4449640fa91d970404e797b19b333e385b10a9da6d51acc55fd2","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"f870f7ac4be48c312d3b9973daa9ce26c8afa636a8b0e6d04fc9c9960b840296","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"67644b9bf34a296616df391d25cb5da5e37693fff137e41acf5d9cd6f030b793","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
