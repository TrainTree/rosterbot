'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:d9b23b515f9e586e7a4b603b8e73301bcf530db5ff53f2732f24ad057eed25b5","manifestFormat":2,"cacheName":"rosterbot-app-d9b23b515f9e586e7a4b603b8e73301bcf530db5ff53f2732f24ad057eed25b5","completeBuildMarker":"rosterbot-complete-d9b23b515f9e586e7a4b603b8e73301bcf530db5ff53f2732f24ad057eed25b5","markerPath":".rosterbot/complete/d9b23b515f9e586e7a4b603b8e73301bcf530db5ff53f2732f24ad057eed25b5.json","offlineSetDigest":"ed9715b6aff36444691553d5f542911e03760399ba58f69769eeb180a23cd563","required":[{"url":"index.html","sha256":"47503009afc3925df27352cafb10ec31f4172f235c0df138e823385b34f7372a","bytes":182635,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"863a1b7b83618ede544fc7f4f3c5bae3859c4024976c73119a01bef1e72cbc72","bytes":233290,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"f5d403264582d1dd1cb0771ee8fdc3a01b66c11b17cc2abe6d1a57fecb2b5f0b","bytes":5935,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"37f082dc11e3f43d21f0c8e6e05188da97439efbfb35f652219c677143ae3a65","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"193b9d90043bd1cc35309551fa163b26c3b614cfd14f93ca4772bde0ab69f1e0","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"f325676bf3eae6ca59022c7f0dc469b4b70b61b75545c6db2e71f96368dca447","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"11ac60d8d3df0618bc3caaf35fd2a3480b83d4fee7abe7d2ff8ded7d249ed448","bytes":22043,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"e3dec9abe786449bf30fae3af56997e2e3200d499eb5442654cddca0bb2a45d8","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"ca22082e42d73bb1a046a72b767ec08ec60b080a1f262353d2df8e988f590838","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"54ce62fe8a335424aea1f10a928cd969ae3f6d281f9e8265b1d2d94498c652d9","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"77cd5890c750671874b4ecb2c64b7ce00af82d6b906d8d9a37e1e62bada89c91","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"12268dc2371af6106a27ce018b072c37cb1320093dce3de121451198b10d6299","bytes":49894,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"8bcd775db2415c633bce43bde24943050fe288a6b92f7268dd60f4553072886a","bytes":25686,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"2bbfc48d9249a60d0531313f659125beccc756dd786c4cbf2bb2f5ca144cc34e","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"d078c675c87218ecd913806fc552d1078c77908b150105e7b35b1e9e8b74e698","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"d139bc82d71095d70a77dd15173754a9a69d6f45181eb22fe9a9ab61c881a4eb","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"9d59ecd825c604e6f6264c9e3cb5e6cc12f0d285e7874a220a5a91a4f8fc9fd4","bytes":5917,"type":"text/javascript"},{"url":"js/32-dialog-controller.js","sha256":"939fcfa407f9ceae581858f15c3ac2c45660c4b8433b8cbe5f835f40aca0624b","bytes":5507,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"17a5dae30555df35eb168c42d666c7d1d78cf69d63565e5c25eda0d2fdb23655","bytes":14373,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"d32d4bc8810c9d16962e8948340a6943d0fa2890bdafbdf9b71f8ce8f0ebb0a7","bytes":105006,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"1b8083497bf8ffda9424002a610dc22d1fbfde20ef874231d134a3c0ee4fa3ab","bytes":4940,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"9462b3a4ed07fb84ac038c6ead4a418068b05abcb120a44675d3a54e619e27bb","bytes":824,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"f5d41a2f1a4fb61209ae057c61210943181ebc9706c02feb49efb191baaa1f4d","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"913f83c79e13e65d9bace6cfe5f103d75898ef91e6ef035ff594bcfaee9f2a89","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"f8a519e1fa6e0bd4df96f47c94e427115bd90cce0bebfbb434215c1fac023f27","bytes":74526,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"46921bf634af05896dbe20164754decaac76919d7ad8f843a053b9bab55a297f","bytes":17070,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"305b5de6af062c207fd7acd5abb0b6d01044b01fa24d495a3f00df557d511dc6","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"8e3344fe2810600e63c503b47d6feafde2614df3fd9c87a1a5f1141ca50bbdb8","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"cf2271cfc3044c6ccc7b8fd05259c797d2b55325bdf161f9b29d101f453ec8bd","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"b5dfeba198afbc39abbb989339952e6ce9d818184260231fb7611d6ac4605400","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"f50d97990865349a075743c5b45aedf005505a4385a76394601d3ecea8541754","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"c644c5e59e7923281c3d1b7338ec63498292b301a193e7e5f264e1611dfaca0b","bytes":128926,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"801d51fda48937a42d21e6b78ee14305cdbee97838cd17451205f56beb60ec49","bytes":43369,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"d8627a3bcfb0dca2b837d166741fcda167c71115952c80b5f7d7f88414b43614","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"efd95c23fd886692de229228737e241fcdd347d4bca241afa88145d4c1db43b7","bytes":4751,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"5f56afc5c6e9e721fbc2b24c97d7b27b2cfd7633e7bd1375f2d745e1547e9eb7","bytes":36267,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"4c15b825d02f83e0110de059c598e6fb9f8e121f009cc819caf28d7c29474318","bytes":24247,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"ff50428f23e6dfb624a8482a8b3a49081fe6adf0319ca9324465375605b412d3","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"bc9fad355df1b32ede99e261bfc1e9c78429f740bb9eecebaed3beed50040285","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"5e15e99b6939314d2f901f546e51a208482b56211a1fd443eb450bf8c97e3d99","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
