try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/90-service-worker-registration.js','rb-build:bec61ecfdbfaab3bb1d981a05f5a6585c14c1459cfaeaa196467d5d812e112fb')}catch(error){throw error}
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)Object.defineProperty(root,'RosterBotOfflineShell',{value:api,writable:false,configurable:false,enumerable:true});
})(typeof window!=='undefined'?window:null,function(root){
  'use strict';
  const listeners=new Set();let registration=null,started=false,refreshSequence=0;
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
      registration=await root.navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});
      observeRegistration(registration);
      root.navigator.serviceWorker.addEventListener?.('controllerchange',()=>{refresh().catch(()=>{})});
      return await refresh();
    }catch(error){return publish({phase:'failed',available:false,cacheComplete:false,reason:publicError(error)})}
  }
  function startWhenReady(){
    if(!root)return;
    const start=()=>{register().catch(error=>publish({phase:'failed',available:false,cacheComplete:false,reason:publicError(error)}))};
    if(root.__rosterbotApplicationReady===true)setTimeout(start,0);
    else root.addEventListener?.('rosterbot:application-ready',start,{once:true});
  }
  startWhenReady();
  return Object.freeze({getStatus,subscribe,supported,register,refresh});
});
