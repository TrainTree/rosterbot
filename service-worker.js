'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:036b543c23fc8918e561f80facf6755b4a798aaeac2c6dbd37e8fd14d4db8b27","manifestFormat":2,"cacheName":"rosterbot-app-036b543c23fc8918e561f80facf6755b4a798aaeac2c6dbd37e8fd14d4db8b27","completeBuildMarker":"rosterbot-complete-036b543c23fc8918e561f80facf6755b4a798aaeac2c6dbd37e8fd14d4db8b27","markerPath":".rosterbot/complete/036b543c23fc8918e561f80facf6755b4a798aaeac2c6dbd37e8fd14d4db8b27.json","offlineSetDigest":"52c97444cfb79838c04fba68413b3a9b4c505dad0f2da282b46ea2104397a2c1","required":[{"url":"index.html","sha256":"c4baea1a5c721c78d4497f1b8a56174deebccae307d938ece58957979ce72359","bytes":181614,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"98f989c8571152afa5233860cfa5df0beab95c79c4b0d2bc9e6cbb609d6c202b","bytes":233290,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"8915211ed695c83f91d45f8086c23de46e5179249a33d8cd2441b3cda5d73f59","bytes":5848,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"b720c449b1e0e7db324d33885a4a31816481f59bd7834f960786d2fb5c806ca7","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"843d3ab2e044aa5a55d1c0a122ffe507a0408c9aaef79a8fd38ad3d44c72bf4c","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"ac5f2fbaa82ecbce6da1da0e143adf9ebe33378384f5a978da2dc2306cf27b24","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"a5434e981de5037bfd0a0de6f69dc03125882c0f9cff89b0a3d68487433201af","bytes":21883,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"e86d7e9702bc499b47593c4739216762ca6a4762304a4458bd6821f83dfda72b","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"39ddbaef3ade11ee304e4874333897e4312f21d7339664ff2fbcdd1c22db13b7","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"097c16c3b34be601f31b2ad18b75bad76ab0b95e5b624bef942d56c54aff987b","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"be94cb1ce3f6b0233b8816ce94438b2dd40818a5d6d67d50f0ce27bcad5d4ccf","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"b9059c8c69dde17cf51fda1520bbc835472aea42a915d44f15719ff075307d5f","bytes":42211,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"cb6077a556709029d002c5f46b15269165f715079ce06bcea3b37e3f7ade4309","bytes":24037,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"ccf7c92c2e8fa15b82d1d36e8d0e6cc0285b0569b867143b9bd6d5da99669a64","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"cfe94d317cef3c44da08088e5061ad668f5282a3a290c882adf1d3d12d6667bc","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"29ca5dbb027816a5ec06d949fd6bd6593cb27407ddcc78967b0839cea3933de0","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"1601144ff7e8f75e018cd14b06e342be869aa814bd9e9437b82187ef1a3c2f30","bytes":5917,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"75f70806791f654549c982449d8571856cf7d8ba5713472904bb73d68b966a4f","bytes":14406,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"b7a7c2e36b1e5d5a870e0bf6ce2968dfb6af413c2f798d360676b3a7876b764e","bytes":103700,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"f0b8d03f6afda7076015c085e44490ff7fc9f893e8ef52966e237e0e7da46a0a","bytes":5365,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"14f5d3cadad24012596b1b00f31437990fef904d8e255630ec2e37d23554b4fb","bytes":1233,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"3ce0584ac8eb3b88bf8d5940588b8a8b1d9e9efa568901f9863ad0bcb262d757","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"e94144f44bedc20646b103223c414231aae4dbc40088e32c1f418208a31cc18d","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"d08cd0459410bb261d996ad105b61281f67dbdae4cf2fa0250c14589fb59af49","bytes":74282,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"c586f36b2db3a8d459ca9a1d6a2efc7464fed7cda32c278eebc0fbb0a007cf5e","bytes":17329,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"100e0e35f84ee9a50ec22d25d286a59916b91d4aaf7394dbb86ec4ddccb58144","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"2fae7a740234040f630dbd9733e31487363fb39ad62b4d38b8c46154449d4409","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"c00da967377c73dae70a1b7546a67d61272d57eabd2c2344951e6e200ecafaa8","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"d05de836f235e63e495c830a249eb8fd5e3bd3fa83a54d3454fe749a1ec804cd","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"73db0691fc0aed0f8e8ea04a1df7b242c71c7e783369d6d8e5124e1a6526eba9","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"2766d0fbaedb4b700ba65984198b7a0af9a3a8defcd83333d82be8c67cab6401","bytes":128926,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"d2691b52bccc2413510e7d5dbe9ef71178dbbd89f341f31c39668f3ca1a43ad0","bytes":42991,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"524962bca1fd352da164746102d68123e91f6b267626188d5eb9b9a0f6ea0540","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"6ae173d6649168410f71e66c549e52261ad1f3bd58a1f170bab9437535690bbf","bytes":5012,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"caa971b1b4ff7141e9cac8f5ed48b247d00d9ebd294e82104e315e2852bd7f93","bytes":36572,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"8fb4348484ffa1aeecc3780f835669b748bf6c3e638e0368991096fa2a1fb7f7","bytes":24247,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"2e3f86fad21077c7463a2ebf2d0cdc2718513926577d30babdbb10aea10628a5","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"43566abac6e4a13276aa5c7e629d07363b38ac1baddff15df5c5cc12546213b9","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"4e7adcf1ab714ad195bc39fbe45c9886e84d86e79ec705911ed666d2997952e3","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
