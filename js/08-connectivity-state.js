try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/08-connectivity-state.js','rb-build:f975cefad1b130c09a48db7d44c56aa072049034ff6b25b2e3c31a935cbc3ae8')}catch(error){throw error}
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RosterBotConnectivity=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const STATES=Object.freeze({
    ONLINE_ELIGIBLE:'online-eligible',OFFLINE:'offline',TRANSPORT_UNREACHABLE:'transport-unreachable',TIMEOUT:'timeout',
    UNAUTHENTICATED:'unauthenticated',AUTH_LOST:'auth-lost',AUTH_REFRESHING:'auth-refreshing',ATTESTATION_UNAVAILABLE:'attestation-unavailable',
    CAPABILITY_HOLD:'capability-hold',SERVER_REJECTION:'server-rejection',REVISION_CONFLICT:'revision-conflict',
    ENCRYPTION_LOCKED:'encryption-locked',ENCRYPTION_VERIFICATION_FAILED:'encryption-verification-failed',DISABLED:'disabled',
    SYNCING:'syncing',SYNCED:'synced',PENDING:'pending'
  });
  const VALUES=new Set(Object.values(STATES));
  function safeDetail(detail={}){
    const out={};
    for(const key of ['reason','operation','status','path','retryAt','attempt','source'])if(detail[key]!=null)out[key]=typeof detail[key]==='number'?detail[key]:String(detail[key]);
    return out;
  }
  function classified(error,{browserOnline=true,operation='cloud'}={}){
    const message=String(error?.message||error||''),code=String(error?.code||''),status=Number(error?.status||0);
    if(browserOnline===false||code==='CLOUD_OFFLINE')return {kind:STATES.OFFLINE,reason:'browser-offline'};
    if(code==='CLOUD_TIMEOUT'||error?.name==='AbortError'||/timed out/i.test(message))return {kind:STATES.TIMEOUT,reason:'request-timeout'};
    if(code==='SCHEMA5_CLOUD_CAPABILITY_HOLD')return {kind:STATES.CAPABILITY_HOLD,reason:String(error?.reason||'schema-not-writable')};
    if(code==='RB003'||code==='revision_conflict')return {kind:STATES.REVISION_CONFLICT,reason:'revision-conflict'};
    if(status===401)return {kind:STATES.AUTH_LOST,reason:'authentication-refused'};
    if(status===403)return {kind:STATES.SERVER_REJECTION,reason:'server-refused'};
    if(code==='CLOUD_AUTH_REFRESHING')return {kind:STATES.AUTH_REFRESHING,reason:'session-refresh'};
    if(code==='CLOUD_ATTESTATION_UNAVAILABLE'||operation==='attestation')return {kind:STATES.ATTESTATION_UNAVAILABLE,reason:'attestation-unavailable'};
    if(code==='CLOUD_ENCRYPTION_LOCKED'||/encrypted cloud is locked/i.test(message))return {kind:STATES.ENCRYPTION_LOCKED,reason:'encryption-key-unavailable'};
    if(code==='CLOUD_ENCRYPTION_VERIFICATION_FAILED'||/integrity check failed|passphrase was not accepted/i.test(message))return {kind:STATES.ENCRYPTION_VERIFICATION_FAILED,reason:'encryption-verification-failed'};
    if(code==='CLOUD_CONFIG_DISABLED'||code==='CLOUD_CONFIG_MISMATCH')return {kind:STATES.DISABLED,reason:code.toLowerCase()};
    if(code==='CLOUD_TRANSPORT'||error instanceof TypeError||/failed to fetch|networkerror|cloud unavailable/i.test(message))return {kind:STATES.TRANSPORT_UNREACHABLE,reason:'transport-unreachable'};
    if(status>=400)return {kind:STATES.SERVER_REJECTION,reason:`http-${status}`};
    return {kind:STATES.SERVER_REJECTION,reason:'cloud-operation-failed'};
  }
  function userMessage(snapshot){
    const pending=snapshot.pending?' Changes are saved on this device and waiting to sync.':'';
    const messages={
      [STATES.OFFLINE]:`Offline — changes saved on this device.${snapshot.pending?' Cloud sync is pending.':''}`,
      [STATES.TRANSPORT_UNREACHABLE]:`Internet appears available, but Cloud Sync cannot be reached.${pending}`,
      [STATES.TIMEOUT]:`Cloud Sync took too long to respond.${pending}`,
      [STATES.UNAUTHENTICATED]:'Sign in to sync.',[STATES.AUTH_LOST]:'Cloud sign-in was lost. Sign in again to sync.',
      [STATES.AUTH_REFRESHING]:'Refreshing Cloud sign-in…',[STATES.ATTESTATION_UNAVAILABLE]:`Cloud safety check is unavailable.${pending}`,
      [STATES.CAPABILITY_HOLD]:`Cloud sync is held by the server.${pending}`,[STATES.SERVER_REJECTION]:`Cloud sync needs attention.${pending}`,
      [STATES.REVISION_CONFLICT]:'Cloud sync needs attention — another device changed the cloud copy.',
      [STATES.ENCRYPTION_LOCKED]:`Unlock Cloud Sync.${pending}`,[STATES.ENCRYPTION_VERIFICATION_FAILED]:'Cloud encryption verification failed. Local data was not changed.',
      [STATES.DISABLED]:'Cloud Sync is not configured on this build.',[STATES.SYNCING]:'Back online — checking Cloud…',
      [STATES.SYNCED]:'Cloud up to date.',[STATES.PENDING]:'Cloud sync pending.',[STATES.ONLINE_ELIGIBLE]:'Cloud available.'
    };
    return messages[snapshot.kind]||'Cloud sync needs attention.';
  }
  function create({online=()=>typeof navigator==='undefined'||navigator.onLine!==false,now=()=>Date.now(),dispatch=null}={}){
    let value={kind:online()?STATES.ONLINE_ELIGIBLE:STATES.OFFLINE,pending:false,reason:'initial',changedAt:now(),failureCount:0,retryAt:0};
    const emit=()=>{const copy=snapshot();try{dispatch?.(copy)}catch(_){}return copy};
    function snapshot(){return Object.freeze({...value,detail:value.detail?Object.freeze({...value.detail}):undefined,message:userMessage(value)})}
    function transition(kind,detail={}){if(!VALUES.has(kind))throw new TypeError(`Unknown RosterBot connectivity state: ${kind}`);value={...value,kind,reason:String(detail.reason||kind),changedAt:now(),detail:safeDetail(detail)};return emit()}
    function markPending(reason='local-change'){value={...value,pending:true,reason:String(reason),changedAt:now()};if(![STATES.OFFLINE,STATES.TRANSPORT_UNREACHABLE,STATES.TIMEOUT,STATES.AUTH_LOST,STATES.AUTH_REFRESHING,STATES.ATTESTATION_UNAVAILABLE,STATES.CAPABILITY_HOLD,STATES.REVISION_CONFLICT,STATES.ENCRYPTION_LOCKED,STATES.ENCRYPTION_VERIFICATION_FAILED,STATES.DISABLED].includes(value.kind))value.kind=STATES.PENDING;return emit()}
    function clearPending(reason='canonical-state-synced'){value={...value,pending:false,failureCount:0,retryAt:0,reason:String(reason),changedAt:now()};return emit()}
    function noteOffline(reason='browser-offline'){value={...value,kind:STATES.OFFLINE,reason,pending:value.pending,changedAt:now(),retryAt:0,detail:{reason}};return emit()}
    function noteOnline(reason='browser-online'){value={...value,kind:value.pending?STATES.PENDING:STATES.ONLINE_ELIGIBLE,reason,changedAt:now(),failureCount:0,retryAt:0,detail:{reason}};return emit()}
    function noteError(error,options={}){const result=classified(error,{browserOnline:online(),...options}),transient=[STATES.OFFLINE,STATES.TRANSPORT_UNREACHABLE,STATES.TIMEOUT,STATES.ATTESTATION_UNAVAILABLE].includes(result.kind),failureCount=transient?value.failureCount+1:0,delay=transient&&result.kind!==STATES.OFFLINE?Math.min(300000,10000*Math.pow(2,Math.max(0,failureCount-1))):0;value={...value,kind:result.kind,reason:result.reason,pending:value.pending,changedAt:now(),failureCount,retryAt:delay?now()+delay:0,detail:safeDetail({...result,...options,retryAt:delay?now()+delay:0})};return emit()}
    function mayAttempt(){return online()&&now()>=Number(value.retryAt||0)}
    return Object.freeze({snapshot,transition,markPending,clearPending,noteOffline,noteOnline,noteError,mayAttempt,isBrowserOffline:()=>!online()});
  }
  return Object.freeze({STATES,create,classifyError:classified,userMessage});
});
