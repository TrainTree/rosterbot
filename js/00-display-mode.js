try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/00-display-mode.js','rb-build:df94b27c8516f6b050a1072faa6f513f38fbe0c46257112bcc628dc87e352311')}catch(error){throw error}
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)Object.defineProperty(root,'RosterBotDisplayMode',{value:api,writable:false,configurable:false,enumerable:true});
})(typeof window!=='undefined'?window:null,function(root){
  'use strict';
  const listeners=new Set();
  let mediaQuery=null,current=null;

  function detect(environment=root){
    const navigatorObject=environment?.navigator||{};
    if(navigatorObject.standalone===true)return Object.freeze({mode:'standalone',installed:true,source:'ios-navigator'});
    try{
      const query=typeof environment?.matchMedia==='function'?environment.matchMedia('(display-mode: standalone)'):null;
      if(query?.matches)return Object.freeze({mode:'standalone',installed:true,source:'display-mode-media'});
      return Object.freeze({mode:'browser',installed:false,source:query?'display-mode-media':'unsupported'});
    }catch(_){return Object.freeze({mode:'browser',installed:false,source:'unsupported'})}
  }

  function publish(next){
    const changed=!current||current.mode!==next.mode||current.source!==next.source;
    current=next;
    try{
      const documentElement=root?.document?.documentElement;
      if(documentElement){documentElement.dataset.rosterbotDisplayMode=next.mode;documentElement.classList.toggle('rb-standalone',next.installed)}
    }catch(_){}
    if(changed)for(const listener of [...listeners]){try{listener(current)}catch(error){setTimeout(()=>{throw error},0)}}
    return current;
  }

  function refresh(){return publish(detect(root))}
  function getState(){return current||refresh()}
  function subscribe(listener){
    if(typeof listener!=='function')throw new TypeError('RosterBot display-mode listener must be a function.');
    listeners.add(listener);return()=>listeners.delete(listener);
  }

  if(root){
    try{
      mediaQuery=typeof root.matchMedia==='function'?root.matchMedia('(display-mode: standalone)'):null;
      if(typeof mediaQuery?.addEventListener==='function')mediaQuery.addEventListener('change',refresh);
      else if(typeof mediaQuery?.addListener==='function')mediaQuery.addListener(refresh);
    }catch(_){}
    refresh();
  }

  return Object.freeze({detect,getState,refresh,subscribe});
});
