try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/90-service-worker-registration.js','rb-build:f975cefad1b130c09a48db7d44c56aa072049034ff6b25b2e3c31a935cbc3ae8')}catch(error){throw error}
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)Object.defineProperty(root,'RosterBotOfflineShell',{value:api,writable:false,configurable:false,enumerable:true});
})(typeof window!=='undefined'?window:null,function(root){
  'use strict';
  const listeners=new Set();let registration=null,started=false,refreshSequence=0,lastUpdateCheck=0;
  let status=Object.freeze({phase:'idle',available:false,cacheComplete:false,buildId:root?.RosterBotBuild?.buildId||null,workerBuildId:null,reason:'not-started'});

  function publicError(error){return String(error?.name||error?.code||'registration-failed').slice(0,80)}
  function publish(change){status=Object.freeze({...status,...change});for(const listener of [...listeners]){try{listener(status)}catch(error){setTimeout(()=>{throw error},0)}}return status}
  function getStatus(){return status}
  function subscribe(listener){if(typeof listener!=='function')throw new TypeError('RosterBot offline-shell listener must be a function.');listeners.add(listener);return()=>listeners.delete(listener)}
  function supported(environment=root){
    if(!environment?.navigator?.serviceWorker)return false;
    if(environment.__rosterbotCanonicalOriginDecision?.action!=='continue')return false;
    let url;try{url=new URL(environment.location.href)}catch(_){return false}
    if(url.origin==='https://www.rosterbot.work')return false;
    const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    return url.protocol==='https:'||loopback;
  }
  function stateFromRegistration(current){
    if(current?.installing)return {phase:'installing',available:true,cacheComplete:false,reason:'worker-installing'};
    if(current?.waiting)return {phase:'waiting',available:true,cacheComplete:true,reason:'worker-installed-waiting'};
    if(current?.active)return {phase:'active',available:true,reason:'worker-active'};
    return {phase:'registered',available:true,cacheComplete:false,reason:'worker-registered'};
  }
  function requestWorkerStatus(worker,timeout=2000){
    if(!worker||typeof MessageChannel!=='function')return Promise.resolve(null);
    return new Promise(resolve=>{
      const channel=new MessageChannel(),timer=setTimeout(()=>resolve(null),timeout);
      channel.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data||null)};
      try{worker.postMessage({type:'ROSTERBOT_OFFLINE_STATUS'},[channel.port2])}catch(_){clearTimeout(timer);resolve(null)}
    });
  }
  function markerMatches(marker,detail){return !!marker&&marker.format==='rosterbot-complete-build'&&marker.manifestFormat===detail.manifestFormat&&marker.buildId===detail.buildId&&marker.cacheName===detail.cacheName&&marker.completeBuildMarker===detail.completeBuildMarker&&marker.offlineSetDigest===detail.offlineSetDigest&&marker.requiredCount===detail.offlineRequiredCount}
  async function verifyWaitingBuild(){
    if(!registration)registration=await root.navigator.serviceWorker.getRegistration?.('/');
    const worker=registration?.waiting;if(!worker)return {ok:false,reason:'no-waiting-worker'};
    const detail=await requestWorkerStatus(worker);if(!detail?.buildId)return {ok:false,reason:'waiting-worker-unresponsive'};
    if(detail.cacheComplete!==true||detail.lifecycle!=='installed')return {ok:false,reason:'waiting-build-incomplete',detail};
    if(detail.manifestFormat!==root?.RosterBotBuild?.assetManifestVersion)return {ok:false,reason:'unsupported-build-manifest',detail};
    try{
      if(!(await caches.keys()).includes(detail.cacheName))return {ok:false,reason:'waiting-cache-missing',detail};
      const cache=await caches.open(detail.cacheName),response=await cache.match(new URL(detail.markerPath,registration.scope).href);
      const marker=response?.ok?await response.json():null;
      if(!markerMatches(marker,detail))return {ok:false,reason:'waiting-marker-invalid',detail};
      return {ok:true,reason:'verified-complete-waiting-build',worker,detail,marker};
    }catch(error){return {ok:false,reason:publicError(error),detail}}
  }
  async function activateWaitingBuild(expectedBuildId,fromBuildId){
    const verified=await verifyWaitingBuild();if(!verified.ok)return verified;
    if(verified.detail.buildId!==expectedBuildId)return {ok:false,reason:'activation-build-mismatch',detail:verified.detail};
    if(typeof MessageChannel!=='function')return {ok:false,reason:'activation-message-channel-unavailable',detail:verified.detail};
    return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>resolve({ok:false,reason:'activation-worker-timeout',detail:verified.detail}),4000);channel.port1.onmessage=event=>{clearTimeout(timer);resolve({...event.data,detail:verified.detail})};try{verified.worker.postMessage({type:'ACTIVATE_THIS_COMPLETE_BUILD',buildId:expectedBuildId,fromBuildId:fromBuildId||root?.RosterBotBuild?.buildId||null},[channel.port2])}catch(error){clearTimeout(timer);resolve({ok:false,reason:publicError(error),detail:verified.detail})}});
  }
  async function refresh(){
    if(!registration)return getStatus();
    const sequence=++refreshSequence,base=stateFromRegistration(registration);
    const worker=registration.waiting||registration.active||registration.installing,detail=await requestWorkerStatus(worker);
    if(sequence!==refreshSequence)return getStatus();
    if(detail&&detail.buildId){
      const sameBuild=detail.buildId===(root?.RosterBotBuild?.buildId||null);
      return publish({...base,workerBuildId:detail.buildId,cacheComplete:detail.cacheComplete===true,workerLifecycle:detail.lifecycle||null,reason:sameBuild?base.reason:'different-build-worker'});
    }
    return publish(base);
  }
  function observeWorker(worker){if(!worker||worker.__rosterbotObserved)return;try{Object.defineProperty(worker,'__rosterbotObserved',{value:true})}catch(_){}worker.addEventListener?.('statechange',()=>{refresh().catch(()=>{})})}
  function observeRegistration(current){
    observeWorker(current.installing);observeWorker(current.waiting);observeWorker(current.active);
    current.addEventListener?.('updatefound',()=>{observeWorker(current.installing);publish({phase:'installing',available:true,cacheComplete:false,reason:'update-found'});refresh().catch(()=>{})});
  }
  async function register(){
    if(started)return refresh();started=true;
    if(!supported(root))return publish({phase:'unsupported',available:false,cacheComplete:false,reason:'service-worker-unavailable'});
    publish({phase:'registering',available:false,cacheComplete:false,reason:'registration-started'});
    try{
      registration=await root.navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});lastUpdateCheck=Date.now();
      observeRegistration(registration);
      root.navigator.serviceWorker.addEventListener?.('controllerchange',()=>{refresh().catch(()=>{})});
      return await refresh();
    }catch(error){return publish({phase:'failed',available:false,cacheComplete:false,reason:publicError(error)})}
  }
  async function checkForUpdate({force=false}={}){if(!registration)return getStatus();if(!force&&Date.now()-lastUpdateCheck<6*60*60*1000)return refresh();lastUpdateCheck=Date.now();publish({phase:'checking',available:true,reason:'update-check'});try{await registration.update();return refresh()}catch(error){return publish({phase:'failed',available:true,reason:publicError(error)})}}
  function startWhenReady(){
    if(!root)return;
    const start=()=>{register().catch(error=>publish({phase:'failed',available:false,cacheComplete:false,reason:publicError(error)}))};
    if(root.__rosterbotApplicationReady===true)setTimeout(start,0);
    else root.addEventListener?.('rosterbot:application-ready',start,{once:true});
    root.addEventListener?.('focus',()=>{checkForUpdate().catch(()=>{})});
  }
  startWhenReady();
  return Object.freeze({getStatus,subscribe,supported,register,refresh,checkForUpdate,requestWorkerStatus,verifyWaitingBuild,activateWaitingBuild});
});
