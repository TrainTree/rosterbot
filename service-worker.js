'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.32.0","buildId":"rb-build:1dd75d9547321eaf27713ec6ca0e71166079208f1dc64263bb54492386adafca","manifestFormat":2,"cacheName":"rosterbot-app-1dd75d9547321eaf27713ec6ca0e71166079208f1dc64263bb54492386adafca","completeBuildMarker":"rosterbot-complete-1dd75d9547321eaf27713ec6ca0e71166079208f1dc64263bb54492386adafca","markerPath":".rosterbot/complete/1dd75d9547321eaf27713ec6ca0e71166079208f1dc64263bb54492386adafca.json","offlineSetDigest":"c057e18dcb96e75172e6ba06df7fd6245d77926e1746cfbda427876b92952f4d","required":[{"url":"index.html","sha256":"1a98cdd50aa3384578128dee7721804957f204fe13cbc79f2779614bb0aa7082","bytes":203071,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"f6344a52fa2f9941f55642df44864f0aa1bbeed4a1391d864aa1d461f1a4331f","bytes":258668,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"7a7aa54fea859441a37455074594fc4220d264d03e5a941fd6ee7d03ba74d6ea","bytes":5973,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"6618a3b814a59f23caea66f27307cb0ce8f59e23e2c51bcd4711d97c947db069","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"1ddc3a1eaa922bb1a5bf443a9eb823581c8b10adcfd21653ceff94b32851051c","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"8ec84691a12a52d995040b865c314829db0a81c1f675a0d23b72c5ac61f9bc21","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"4e14e41dab1c9838fd2e0d78137c362626a177ca6a33b4eb83ee30d988ffa94f","bytes":22950,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"565aebfc35e06200a0acad21ed75ffcee1fa78892091d5bfb573670fbd754af9","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"6d0910878d19d98e1c74e98aca5ea6f2e300d01553b98939160b27a6ba3eb441","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"1ebd6461cdc021acbdf43c0dcbf5fa5559944e84e78087e5da5da06ab4c27256","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"6a9ed24e263fd5344a556d3deb9ea3546cb2b7661bd4aa841c54eeeace5fb8e7","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"96090c775934703befbcaff791eff095955121c4e9c508a83f74fb19dfee6850","bytes":49886,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"bf87160118b18e687c77ad1be654918b4f984c531b4e57c408e1d309222f3b73","bytes":25686,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"34ddc349081e6303ee5e696b40da124685f30b305c68c72833d2b108689248ba","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"8bec5b09e432681fdf443ca5544333af9f0f45b320f97f12ce7d945a138dbd22","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"19763554023d71cf8703fb388f92e88556d29ff28406ccf16c9c22ead32ae3e2","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"39f35f9844c789d506723eee559d148e1836e78e20bf80c42c7991b52f9d2646","bytes":5917,"type":"text/javascript"},{"url":"js/32-dialog-controller.js","sha256":"998397ed1ae4c2bf6de317624a4e812757495fbb167c791bb86230d07970c203","bytes":5507,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"8b1b0759a86da38c77b7256be8410b05d86bae931d7d55d90f71880d359795b6","bytes":15023,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"13bc812177d0a28a2e45d0509daabb4749838ba712258dc62efc70528cdc8de6","bytes":113584,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"454be3f3652412bd13e368d16ff1be0dc006ff7112e4c1ab8cda3d2460e52e52","bytes":4940,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"28ac9e586b0986cf9d418d9a692e28105f369ef6b13a8d341dbbfe28dd1bcfcb","bytes":824,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"62fc756ec23561139900b652479eb1824143f4a782f664df26f831007da63c9d","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"f75065056b77c195b70b760e37db983b4ee4377be1f5452d192fa0d52513579b","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"e3a53a9657aa95dc6c81b21cca487ad35f712a3fa26f7ea220e27379980502f8","bytes":76258,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"0c164ee82b148439c2296bb43ca19ca37577659b1dd1cff1bee90d3b919f52a8","bytes":17552,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"a1b62d3125446b2dbe4b337158684771f03a27aaf2045eabb0ed987c0f8a58f7","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"8a3c9d6bdc7895921f33c52cea66602e4976e3a3822ba903322feb0332f87b9a","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"719915c26c082ff5ab58d512798d23b387681d76917ec7cf10b86cb7f6ce4b34","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"a17fbcd48bcacb62a681645975f043236580f2fb27ed91a8221f5e7dccfd68e6","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"aa79cdb5f0a4b30d843be7e8fb5e061a398b1d77eb918dd543b020f1251de3bc","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"04d4ef4ec41ea8e36c87fa0aee4a5d920ce3ab7e5dd0e96c3cfc3e9adb90971b","bytes":128739,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"7cb5f0ccef37b9b45145c6f9cf5b0aad0c96fafeb5e21170c81355521c75b24e","bytes":43369,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"2116e25583e82985632938bf5be57cdf5d5afbcffb2bfb3c061723165b946d4f","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"1789cdbf6f21f6cfa4f2f381cc1fed4c9bc4097aa18af518cc41505350987d93","bytes":4751,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"84714888109ea1192be7ad529b21bb88feb3feea6bc9228f632fce8b12c537a1","bytes":57968,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"591ca725db5baf10ebd0357415165ba10b884d5cb15c646ce887c809d4bcc7c2","bytes":24362,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"7d2b7097e752fefb5e0e5e091294e009ca0223af95e8decd9d0aedd6e0d04585","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"97ccd5c4e03746f5f327f2fc6cd8ee645d90d2f5d3a21936bb926ace7088a826","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"2e6541671b12a46aefcda00cad6208d405ed5aa888f46ab76fb2f69a3286d173","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
