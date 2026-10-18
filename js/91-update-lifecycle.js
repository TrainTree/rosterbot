try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/91-update-lifecycle.js','rb-build:3e1538bab65a611c9762cda96eb9dffa0e32eaad5118cb38b6e5c906f02e82e9')}catch(error){throw error}
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)Object.defineProperty(root,'RosterBotUpdateLifecycle',{value:api,writable:false,configurable:false,enumerable:true});
})(typeof window!=='undefined'?window:null,function(root){
  'use strict';
  const STATES=Object.freeze({UNSUPPORTED:'unsupported',CURRENT:'current',CHECKING:'checking',INSTALLING:'installing',INSTALLATION_FAILED:'installation-failed',WAITING:'complete-update-waiting',ACTIVATION_REQUESTED:'activation-requested',QUIESCING:'quiescing',ACTIVATING:'activating',RELOADING:'reloading',READY:'successfully-running-new-build',ACTIVATION_FAILED:'activation-failed',RECOVERY:'recovery-previous-build-available'});
  const CHANNEL='rosterbot-update-v1',PEER_WINDOW_MS=650,PEER_TIMEOUT_MS=8000;
  function validBuildId(value){return /^rb-build:[a-f0-9]{64}$/.test(String(value||''))}
  function waitingDescriptor(result,currentBuildId){
    if(!result?.ok)return {ok:false,reason:result?.reason||'waiting-build-not-verified'};
    const detail=result.detail||{},marker=result.marker||{};
    if(!validBuildId(detail.buildId)||detail.buildId===currentBuildId)return {ok:false,reason:'not-a-new-build'};
    if(marker.buildId!==detail.buildId||marker.cacheName!==detail.cacheName||marker.manifestFormat!==detail.manifestFormat||marker.offlineSetDigest!==detail.offlineSetDigest||marker.requiredCount!==detail.offlineRequiredCount)return {ok:false,reason:'waiting-build-contract-mismatch'};
    return {ok:true,buildId:detail.buildId,version:detail.applicationVersion,cacheName:detail.cacheName,requiredCount:detail.offlineRequiredCount,offlineSetDigest:detail.offlineSetDigest};
  }
  function createState(initial=STATES.CURRENT){let value=Object.freeze({phase:initial,reason:'initial',targetBuildId:null,version:null,at:Date.now()});const listeners=new Set();return Object.freeze({get:()=>value,set(change){value=Object.freeze({...value,...change,at:Date.now()});for(const listener of [...listeners])try{listener(value)}catch(_){}return value},subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)}})}
  async function quiesceRuntime(environment=root,{timeoutMs=12500}={}){
    const cloud=environment?.RosterBotCloudSync,persistence=environment?.RosterBotSchema5Persistence;let cloudResult=null;
    try{
      if(cloud?.quiesceForApplicationUpdate){cloudResult=await cloud.quiesceForApplicationUpdate({timeoutMs});if(!cloudResult?.ok)return {ok:false,reason:cloudResult?.reason||'cloud-not-quiescent',cloudResult}}
      if(!persistence?.quiesceForApplicationUpdate)return {ok:false,reason:'persistence-quiescence-unavailable',cloudResult};
      const local=await persistence.quiesceForApplicationUpdate({timeoutMs});if(!local?.ok)return {ok:false,reason:local?.reason||'persistence-not-quiescent',cloudResult,local};
      return {ok:true,reason:'safe-boundary',cloudResult,local};
    }catch(error){return {ok:false,reason:String(error?.code||error?.name||'quiescence-failed'),cloudResult,error}}
  }
  if(!root)return Object.freeze({STATES,validBuildId,waitingDescriptor,createState,quiesceRuntime});

  const state=createState(),offline=root.RosterBotOfflineShell,build=root.RosterBotBuild;
  const notice=root.document.getElementById('pwaUpdateNotice'),versionNode=root.document.getElementById('pwaUpdateVersion'),statusNode=root.document.getElementById('pwaUpdateStatus'),updateButton=root.document.getElementById('pwaUpdateNow'),dismissButton=root.document.getElementById('pwaUpdateDismiss');
  function runtimeClientId(){try{return (root.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`).slice(0,80)}catch(_){return `${Date.now()}-${Math.random()}`.slice(0,80)}}
  const clientId=runtimeClientId(),peers=new Map(),peerResults=new Map();let channel=null,target=null,dismissedBuildId=null,activationStarted=false,reloadStarted=false,cloudQuiescence=null;
  function render(next=state.get()){
    const ready=next.phase===STATES.WAITING,busy=[STATES.ACTIVATION_REQUESTED,STATES.QUIESCING,STATES.ACTIVATING,STATES.RELOADING].includes(next.phase),failure=[STATES.INSTALLATION_FAILED,STATES.ACTIVATION_FAILED,STATES.RECOVERY].includes(next.phase);
    if(notice){notice.hidden=!(ready||busy||failure);notice.dataset.busy=String(busy)}
    if(versionNode)versionNode.textContent=next.version?`Version ${String(next.version).startsWith('v')?next.version:`v${next.version}`}`:'';
    if(updateButton){updateButton.hidden=!ready;updateButton.disabled=busy}
    if(dismissButton)dismissButton.hidden=busy;
    if(statusNode)statusNode.textContent=busy?'Saving safely before RosterBot updates…':failure?'The update did not start. Your saved roster was not changed.':'Update when it suits you. Your saved roster stays on this device.';
  }
  state.subscribe(render);render();
  function relay(message){const payload={...message,protocol:'rosterbot-update-v1',sender:clientId};if(channel)channel.postMessage(payload);else root.navigator.serviceWorker?.controller?.postMessage({type:'ROSTERBOT_UPDATE_COORDINATE',payload})}
  async function localQuiesce(requestId,targetBuildId){state.set({phase:STATES.QUIESCING,reason:'user-confirmed-update',targetBuildId});const result=await quiesceRuntime(root);cloudQuiescence=result.cloudResult;relay({kind:'QUIESCENCE_RESULT',requestId,targetBuildId,ok:result.ok,reason:result.reason});return result}
  function releaseLocalQuiescence(){root.RosterBotCloudSync?.releaseApplicationUpdateQuiescence?.(cloudQuiescence);cloudQuiescence=null}
  function onCoordination(message){
    if(message?.protocol!=='rosterbot-update-v1'||message.sender===clientId)return;
    if(message.kind==='HELLO'){peers.set(message.sender,Date.now());return}
    if(message.kind==='PREPARE'&&validBuildId(message.targetBuildId)){peers.set(message.sender,Date.now());target={...(target||{}),buildId:message.targetBuildId};localQuiesce(message.requestId,message.targetBuildId).catch(()=>{})}
    if(message.kind==='QUIESCENCE_RESULT')peerResults.set(message.sender,{at:Date.now(),requestId:message.requestId,ok:message.ok,reason:message.reason});
    if(message.kind==='CANCEL'){releaseLocalQuiescence();if(!activationStarted)state.set({phase:STATES.WAITING,reason:'update-cancelled-by-peer',targetBuildId:message.targetBuildId,version:target?.version||null})}
    if(message.kind==='ACTIVATING'&&validBuildId(message.targetBuildId)){target={...(target||{}),buildId:message.targetBuildId};state.set({phase:STATES.ACTIVATING,reason:'peer-activated-update',targetBuildId:message.targetBuildId})}
  }
  if(typeof root.BroadcastChannel==='function'){channel=new root.BroadcastChannel(CHANNEL);channel.addEventListener('message',event=>onCoordination(event.data))}
  root.navigator.serviceWorker?.addEventListener?.('message',event=>{if(event.data?.type==='ROSTERBOT_UPDATE_COORDINATION')onCoordination(event.data.payload);if(event.data?.type==='ROSTERBOT_UPDATE_ACTIVATING')onCoordination({protocol:'rosterbot-update-v1',kind:'ACTIVATING',sender:'service-worker',targetBuildId:event.data.buildId})});
  relay({kind:'HELLO',buildId:build?.buildId});

  async function inspectWaiting(){
    if(!offline){state.set({phase:STATES.UNSUPPORTED,reason:'offline-shell-unavailable'});return null}
    const descriptor=waitingDescriptor(await offline.verifyWaitingBuild(),build?.buildId);
    if(!descriptor.ok){if(offline.getStatus?.().phase==='failed')state.set({phase:STATES.INSTALLATION_FAILED,reason:descriptor.reason});else if(!activationStarted)state.set({phase:STATES.CURRENT,reason:descriptor.reason});return null}
    target=descriptor;if(dismissedBuildId!==descriptor.buildId)state.set({phase:STATES.WAITING,reason:'verified-complete-waiting-build',targetBuildId:descriptor.buildId,version:descriptor.version});return descriptor;
  }
  async function waitForPeers(requestId){
    const discoveryUntil=Date.now()+PEER_WINDOW_MS;while(Date.now()<discoveryUntil)await new Promise(resolve=>setTimeout(resolve,25));
    const participants=[...peers.entries()].filter(([,seenAt])=>Date.now()-seenAt<30000).map(([id])=>id),deadline=Date.now()+PEER_TIMEOUT_MS;
    while(Date.now()<deadline){const results=participants.map(id=>peerResults.get(id)).filter(value=>value?.requestId===requestId);if(results.length===participants.length)return {ok:results.every(item=>item.ok),timedOut:false,results};await new Promise(resolve=>setTimeout(resolve,50))}
    const results=participants.map(id=>peerResults.get(id)).filter(value=>value?.requestId===requestId);return {ok:results.every(item=>item.ok),timedOut:results.length<participants.length,results};
  }
  async function updateNow(){
    if(activationStarted)return false;const verified=await inspectWaiting();if(!verified)return false;activationStarted=true;state.set({phase:STATES.ACTIVATION_REQUESTED,reason:'user-selected-update',targetBuildId:verified.buildId,version:verified.version});
    const requestId=`${clientId}:${Date.now()}`;relay({kind:'PREPARE',requestId,targetBuildId:verified.buildId});const own=await localQuiesce(requestId,verified.buildId),peerResult=await waitForPeers(requestId);
    if(!own.ok||!peerResult.ok){activationStarted=false;relay({kind:'CANCEL',requestId,targetBuildId:verified.buildId});releaseLocalQuiescence();state.set({phase:STATES.ACTIVATION_FAILED,reason:!own.ok?own.reason:'another-tab-not-safe',targetBuildId:verified.buildId,version:verified.version});return false}
    // A suspended tab may not answer within the bounded window. Activation is
    // still safe: controllerchange reaches it on resume before it can continue
    // normal interaction, and it reloads through the same exact-build gate.
    relay({kind:'ACTIVATING',targetBuildId:verified.buildId,timedOutPeers:peerResult.timedOut});state.set({phase:STATES.ACTIVATING,reason:peerResult.timedOut?'background-tab-timeout':'all-tabs-safe',targetBuildId:verified.buildId,version:verified.version});
    const result=await offline.activateWaitingBuild(verified.buildId,build?.buildId);if(!result?.ok){activationStarted=false;relay({kind:'CANCEL',requestId,targetBuildId:verified.buildId});releaseLocalQuiescence();state.set({phase:STATES.ACTIVATION_FAILED,reason:result?.reason||'activation-rejected',targetBuildId:verified.buildId,version:verified.version});return false}return true;
  }
  async function controllerChanged(){
    if(reloadStarted||!target?.buildId)return;const controller=root.navigator.serviceWorker?.controller;if(!controller)return;
    for(let attempt=0;attempt<20;attempt++){const detail=await offline.requestWorkerStatus(controller,500);if(detail?.buildId===target.buildId&&detail.cacheComplete===true){reloadStarted=true;state.set({phase:STATES.RELOADING,reason:'expected-controller-active',targetBuildId:target.buildId,version:target.version});root.location.reload();return}await new Promise(resolve=>setTimeout(resolve,50))}
    state.set({phase:STATES.ACTIVATION_FAILED,reason:'unexpected-controller-build',targetBuildId:target.buildId,version:target.version});
  }
  root.navigator.serviceWorker?.addEventListener?.('controllerchange',()=>{controllerChanged().catch(()=>{})});
  updateButton?.addEventListener('click',()=>{updateNow().catch(error=>state.set({phase:STATES.ACTIVATION_FAILED,reason:String(error?.message||error?.code||error?.name||'update-failed').slice(0,160)}))});
  dismissButton?.addEventListener('click',()=>{dismissedBuildId=target?.buildId||null;notice.hidden=true});
  offline?.subscribe?.(shell=>{if(shell.phase==='checking')state.set({phase:STATES.CHECKING,reason:shell.reason});if(shell.phase==='installing')state.set({phase:STATES.INSTALLING,reason:shell.reason});if(shell.phase==='waiting')inspectWaiting().catch(()=>{});if(shell.phase==='failed')state.set({phase:shell.available?STATES.INSTALLATION_FAILED:STATES.UNSUPPORTED,reason:shell.reason})});
  async function proveReady(){
    if(!root.__rosterbotApplicationReady||!root.navigator.serviceWorker?.controller)return;try{build.assertFoundations();const detail=await offline.requestWorkerStatus(root.navigator.serviceWorker.controller);if(detail?.buildId!==build.buildId||!detail.cacheComplete)return;root.navigator.serviceWorker.controller.postMessage({type:'ROSTERBOT_BUILD_READY',buildId:build.buildId,coherent:true});if(detail.activation?.buildId===build.buildId&&!detail.activation?.provenReady)state.set({phase:STATES.READY,reason:'new-build-coherent-and-ready',targetBuildId:build.buildId,version:build.applicationVersion})}catch(_){state.set({phase:STATES.RECOVERY,reason:'new-build-startup-not-proven',targetBuildId:build?.buildId,version:build?.applicationVersion})}
  }
  const start=()=>{inspectWaiting().catch(()=>{});proveReady().catch(()=>{})};if(root.__rosterbotApplicationReady)setTimeout(start,0);else root.addEventListener('rosterbot:application-ready',start,{once:true});
  return Object.freeze({STATES,getState:state.get,subscribe:state.subscribe,inspectWaiting,updateNow,quiesce:()=>quiesceRuntime(root),waitingDescriptor,validBuildId});
});
