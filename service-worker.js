'use strict';
// Generated from rosterbot-build-manifest.json. Do not maintain an asset list here.
const BUILD={"applicationVersion":"0.31.0","buildId":"rb-build:6d37b53eb6fedc291231e6ce1ffb08f0108332d1f56658499504c6a42f441abb","manifestFormat":2,"cacheName":"rosterbot-app-6d37b53eb6fedc291231e6ce1ffb08f0108332d1f56658499504c6a42f441abb","completeBuildMarker":"rosterbot-complete-6d37b53eb6fedc291231e6ce1ffb08f0108332d1f56658499504c6a42f441abb","markerPath":".rosterbot/complete/6d37b53eb6fedc291231e6ce1ffb08f0108332d1f56658499504c6a42f441abb.json","offlineSetDigest":"af9d77eea79c3b8e1c5221cec37577181b7bdc59c380c3bce999700a386e2a7f","required":[{"url":"index.html","sha256":"cdbecbaed0cf4731e084a994c614833c58eb366ced94bb0940b585aebd1494e0","bytes":201974,"type":"text/html"},{"url":"css/rosterbot.css","sha256":"41368d53e05cf1af9abf58e3c53306d5ab9cbba65e4ecfb4e4e3c75067e6ccd6","bytes":258668,"type":"text/css"},{"url":"js/00-build-identity.js","sha256":"50c8e3df9f1bb2b20a182444c32897a524f000319dfb9f575ecc2953b7a16966","bytes":5935,"type":"text/javascript"},{"url":"js/00-canonical-origin.js","sha256":"150f2cc03f20c7456ef94439a1514cdfbf2a103caa176437528d26bfead3e88c","bytes":1457,"type":"text/javascript"},{"url":"js/00-error-handler.js","sha256":"b6c16af8bc54930e70fd43c330f54dc8f8f13de84ad4be114aac13905b20293c","bytes":2054,"type":"text/javascript"},{"url":"js/01-storage-compatibility.js","sha256":"787348534bb454970bfa0d46f194be29a6583e7176b9081a18f3719e221ad32c","bytes":9839,"type":"text/javascript"},{"url":"js/01-persistence-registry.js","sha256":"9c9b715f193e3ad3093386621b32ace7541e7369eb54f0f2b7d18e2c4c20c79b","bytes":22950,"type":"text/javascript"},{"url":"js/02-canonical-state.js","sha256":"71e5c0b2948ad61eb302e05e8be66e281de7c4b1971322bcaeba80a008b3c9c3","bytes":11629,"type":"text/javascript"},{"url":"js/02-persistence-safety.js","sha256":"c15c42c6b8eeb971b1017e2f240b5af4f8b6aec5348f6e5ed2f66c5e6f75a5d5","bytes":46705,"type":"text/javascript"},{"url":"js/02-schema5.js","sha256":"0e3f0e16c87d42050d2aa515800b0956e926520822a225b8bb284f56c14b91e3","bytes":23920,"type":"text/javascript"},{"url":"js/03-recovery-ui.js","sha256":"9f683864af732318bf01c9b9ac9291f20434bf1c3a0c1d74b334ae5675061afa","bytes":18743,"type":"text/javascript"},{"url":"js/03-schema5-migration.js","sha256":"95794f4db230c863cd877ac6ae77b5d1ab436447c6a54e661a0f22255b4afced","bytes":49894,"type":"text/javascript"},{"url":"js/03-persistence-bootstrap.js","sha256":"b8c2ddd5505140c923fc3a857342064717c1982a42f619b298809351c7a84710","bytes":25686,"type":"text/javascript"},{"url":"data/rosters-fp64-fp68-20260908.js","sha256":"81fc415810ec3864cc93ba79e6aa912c479461f7ad709f73696bc16a3eb85c13","bytes":3201466,"type":"text/javascript"},{"url":"js/10-roster-official.js","sha256":"b72b2f2a1fcada5016dd40f69e6d111dd81adc5152cface951b97d1d43e2b150","bytes":9138,"type":"text/javascript"},{"url":"js/11-roster-engine.js","sha256":"e2ac59868e355879b9b35dff204b1d634782dbd51577f713c2b14678005aa779","bytes":18771,"type":"text/javascript"},{"url":"js/12-roster-effective-dates.js","sha256":"922eff6c1814f37cc8c551ccba2ad2039112b26b2051225910527ad943a83110","bytes":5917,"type":"text/javascript"},{"url":"js/32-dialog-controller.js","sha256":"4a22e34cf94ede60d4beaf8a9d0bb3395da01e45a1c8a2abe26373c25c06bb0e","bytes":5507,"type":"text/javascript"},{"url":"js/40-employment-profile.js","sha256":"dd278c093ae9fdc4281adba7ef4fb05b8bb0272dc97226046985efaa5561b27d","bytes":15023,"type":"text/javascript"},{"url":"js/20-roster-ui.js","sha256":"51f02ee4a6c22841143915ebb1a6cf5981771618e717f93513c5e71a9d209deb","bytes":113502,"type":"text/javascript"},{"url":"js/30-feedback.js","sha256":"24fbdc72da9cd137f3d01d76d3efa8cf05b1e635bb443cd0447f278f7ea3533f","bytes":4940,"type":"text/javascript"},{"url":"js/31-changelog.js","sha256":"48adccaec29a2078d82968a3538bfb03af714d386e2baf449ea5633c40df7044","bytes":824,"type":"text/javascript"},{"url":"data/pay-reference-20260923.js","sha256":"91ffab1abdff7f8e77b55b51988902bc119fbc6a820f7119a60c9d72ee217efe","bytes":2324962,"type":"text/javascript"},{"url":"js/41-pay-rate-official.js","sha256":"7d33a9f8da3ae37c3b6f9fbc82d4da81a1fdb54bcb16fb348240d6f45d0adc00","bytes":1610,"type":"text/javascript"},{"url":"js/42-paybot.js","sha256":"445d41b9880fe795020891f42c8d3ec60d1593345ad58d4ada8a34013378b89f","bytes":76258,"type":"text/javascript"},{"url":"js/50-data-backup.js","sha256":"58c1b41f00f40f334c82cd4783f2e59c1e547a2ec39be490aed0ee77855ba29f","bytes":17552,"type":"text/javascript"},{"url":"js/04-cloud-error-contract.js","sha256":"f9a4f923dea2c0a4a5ba7fe25e1129df06ee99b6c4b7e0a10cf744b66895699c","bytes":3089,"type":"text/javascript"},{"url":"js/05-cloud-deployment-profile.js","sha256":"bbf6424a167fb9e33d0bb97e5ef69d7c9d169764f77f2bd217e098533502f8d2","bytes":847,"type":"text/javascript"},{"url":"js/06-cloud-config.js","sha256":"cdcc34983aa31218c3f04d6904fcc832a8bf1a9a5536d33262b3dfa628836805","bytes":6873,"type":"text/javascript"},{"url":"js/07-cloud-schema5.js","sha256":"ce41b2f1758f59c10b22794962a29fe5f8dea22091e16acd206fbfd2810a2eac","bytes":7021,"type":"text/javascript"},{"url":"js/08-connectivity-state.js","sha256":"95214cf86d2866921fa07a9d35ef166313d0d0d3cc4b83aa809abaf44f51efe4","bytes":7464,"type":"text/javascript"},{"url":"js/51-cloud-sync.js","sha256":"53d4b28b45b2bbc90553c8506647a382662b4a9374bc4699a280c1d265b32a4d","bytes":128739,"type":"text/javascript"},{"url":"js/60-diary.js","sha256":"a1a38fb9c1c7004ef1ba7a63fd0baf215388110bb9d0cc595e7ad2986ed6a9a6","bytes":43369,"type":"text/javascript"},{"url":"js/61-page-bridge.js","sha256":"7ffde40353f7c1a167d900adbaf5f49ade6c6534034d4b9896424baee421006e","bytes":1102,"type":"text/javascript"},{"url":"js/75-sources.js","sha256":"6a4e0d6848fe62a1d530b7cf7c25aed0a058cb49705219c36a04a92f656b8c8a","bytes":4751,"type":"text/javascript"},{"url":"js/70-navigation.js","sha256":"14cf4d2783201b08ace941e4a28db7ad829c06e0b760b0b27e74cd373bd05592","bytes":57968,"type":"text/javascript"},{"url":"js/80-calendar-subscription.js","sha256":"a066de3510b2684694aa783f721205f541ef937913947a22845e32b46ec60f18","bytes":24362,"type":"text/javascript"},{"url":"js/00-display-mode.js","sha256":"7b4879e1d825104258669e71e4d60393cec3c8e1aeaee44698e02db3471e3dd3","bytes":8006,"type":"text/javascript"},{"url":"js/90-service-worker-registration.js","sha256":"40d695afbee2bd0eeb38ff0ed178afc46a88df78558b7ab26df49755c61c6175","bytes":8277,"type":"text/javascript"},{"url":"js/91-update-lifecycle.js","sha256":"ba9d141934082ed0e4f83a08f08f232df2c10d29e36533f53c251bfb57e42195","bytes":13237,"type":"text/javascript"},{"url":"manifest.webmanifest","sha256":"07d594562ea3433efcb6adb827315f2d7d95c9052dd3285024bb68dcc05620ba","bytes":875,"type":"application/manifest+json"},{"url":"assets/icons/rosterbot-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-192.png","sha256":"05246126e2a15371836e77e5084d6f0f3509de04e3dbe79f990b82a1cfa9b5b5","bytes":48443,"type":"image/png"},{"url":"assets/icons/rosterbot-maskable-512.png","sha256":"3661bb243b7db5467faf7331a5f14f128d4e74d1b34ea968f2a1d22a987f59ba","bytes":315830,"type":"image/png"},{"url":"assets/icons/apple-touch-icon.png","sha256":"bdac53960fe711a34f8fa42d789602065089194ccc2f0758fc1dfe0f0ee85125","bytes":42933,"type":"image/png"}],"cosmetic":[{"url":"favicon.ico","sha256":"9bcbaf720320ce8525d373887ec26a935a78c40a6d2b0bca6030b74169b655c0","bytes":3192,"type":"image/x-icon"},{"url":"assets/icons/favicon-16.png","sha256":"a1a39d885b52d412c7f64da679d195b0356949bc1cc30c3a74ff0e79e776ddef","bytes":826,"type":"image/png"},{"url":"assets/icons/favicon-32.png","sha256":"aee076dc99209bcf7f0fb60d87da5957cf1794d0a15efcf9b5165bbd9045fd77","bytes":2328,"type":"image/png"}]};
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
