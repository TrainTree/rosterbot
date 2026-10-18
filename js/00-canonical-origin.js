try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/00-canonical-origin.js','rb-build:036b543c23fc8918e561f80facf6755b4a798aaeac2c6dbd37e8fd14d4db8b27')}catch(error){throw error}
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)Object.defineProperty(root,'RosterBotCanonicalOrigin',{value:api,writable:false,configurable:false,enumerable:true});
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const CANONICAL_ORIGIN='https://rosterbot.work',PRODUCTION_ALIAS_ORIGIN='https://www.rosterbot.work';
  function decide(input){
    let url;
    try{url=input instanceof URL?input:new URL(typeof input==='string'?input:input?.href||String(input))}catch(_){return Object.freeze({action:'continue',reason:'unparseable-development-location',canonicalOrigin:CANONICAL_ORIGIN,target:null})}
    if(url.origin!==PRODUCTION_ALIAS_ORIGIN)return Object.freeze({action:'continue',reason:url.origin===CANONICAL_ORIGIN?'canonical-production-origin':'deliberate-nonproduction-origin',canonicalOrigin:CANONICAL_ORIGIN,target:null});
    const target=new URL(`${url.pathname}${url.search}${url.hash}`,CANONICAL_ORIGIN).href;
    return Object.freeze({action:'redirect',reason:'production-alias',canonicalOrigin:CANONICAL_ORIGIN,target});
  }
  return Object.freeze({CANONICAL_ORIGIN,PRODUCTION_ALIAS_ORIGIN,decide});
});
