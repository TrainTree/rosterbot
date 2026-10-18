try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/00-display-mode.js','rb-build:f975cefad1b130c09a48db7d44c56aa072049034ff6b25b2e3c31a935cbc3ae8')}catch(error){throw error}
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)Object.defineProperty(root,'RosterBotDisplayMode',{value:api,writable:false,configurable:false,enumerable:true});
})(typeof window!=='undefined'?window:null,function(root){
  'use strict';
  const listeners=new Set();
  const viewportListeners=new Set();
  const dialogViewportProperties=Object.freeze(['--rb-dialog-visual-height','--rb-dialog-visual-width','--rb-dialog-visual-top','--rb-dialog-visual-left','--rb-dialog-visual-right','--rb-dialog-center-shift']);
  let mediaQuery=null,current=null,viewportCurrent=null,viewportFrame=0;

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

  function positiveDimension(value){const number=Number(value);return Number.isFinite(number)&&number>0?number:null}
  function finiteOffset(value){const number=Number(value);return Number.isFinite(number)?number:0}

  function measureViewport(environment=root){
    const layoutHeight=positiveDimension(environment?.innerHeight);
    const layoutWidth=positiveDimension(environment?.innerWidth);
    const viewport=environment?.visualViewport;
    if(!viewport)return Object.freeze({height:layoutHeight,width:layoutWidth,offsetTop:0,offsetLeft:0,offsetRight:0,centerShift:0,layoutHeight,layoutWidth,constrained:false,valid:Boolean(layoutHeight&&layoutWidth),source:'layout-viewport'});
    const height=positiveDimension(viewport.height);
    const width=positiveDimension(viewport.width);
    const offsetTop=finiteOffset(viewport.offsetTop);
    const offsetLeft=finiteOffset(viewport.offsetLeft);
    const tolerance=2;
    const horizontallyContained=!layoutWidth||(offsetLeft>=-tolerance&&offsetLeft+(width||0)<=layoutWidth+tolerance);
    const verticallyContained=!layoutHeight||(offsetTop>=-tolerance&&offsetTop+(height||0)<=layoutHeight+tolerance);
    const valid=Boolean(height&&width&&layoutHeight&&layoutWidth&&horizontallyContained&&verticallyContained);
    const offsetRight=valid?Math.max(0,layoutWidth-offsetLeft-width):0;
    const centerShift=valid?offsetLeft+(width/2)-(layoutWidth/2):0;
    const constrained=valid&&(height<layoutHeight-1||width<layoutWidth-1||Math.abs(offsetTop)>1||Math.abs(offsetLeft)>1);
    return Object.freeze({height,width,offsetTop,offsetLeft,offsetRight,centerShift,layoutHeight,layoutWidth,constrained,valid,source:'visual-viewport'});
  }

  function clearDialogViewport(documentObject){
    if(typeof documentObject?.querySelectorAll!=='function')return;
    for(const modal of documentObject.querySelectorAll('.feedback-modal')){
      if(modal?.dataset)delete modal.dataset.rosterbotVisualConstrained;
      const dialog=modal?.querySelector?.('.feedback-dialog');
      if(!dialog?.style)continue;
      for(const property of dialogViewportProperties)dialog.style.removeProperty(property);
    }
  }

  function applyDialogViewport(documentObject,viewport){
    clearDialogViewport(documentObject);
    if(!viewport?.valid||!viewport.constrained)return;
    for(const modal of documentObject.querySelectorAll('.feedback-modal:not([hidden])')){
      const dialog=modal.querySelector?.('.feedback-dialog');
      if(!dialog?.style)continue;
      modal.dataset.rosterbotVisualConstrained='true';
      dialog.style.setProperty('--rb-dialog-visual-height',`${viewport.height}px`);
      dialog.style.setProperty('--rb-dialog-visual-width',`${viewport.width}px`);
      dialog.style.setProperty('--rb-dialog-visual-top',`${viewport.offsetTop}px`);
      dialog.style.setProperty('--rb-dialog-visual-left',`${viewport.offsetLeft}px`);
      dialog.style.setProperty('--rb-dialog-visual-right',`${viewport.offsetRight}px`);
      dialog.style.setProperty('--rb-dialog-center-shift',`${viewport.centerShift}px`);
    }
  }

  function publishViewport(next){
    const keys=['height','width','offsetTop','offsetLeft','offsetRight','centerShift','layoutHeight','layoutWidth','constrained','valid','source'];
    const changed=!viewportCurrent||keys.some(key=>viewportCurrent[key]!==next[key]);
    viewportCurrent=next;
    try{
      const documentElement=root?.document?.documentElement;
      if(documentElement){
        documentElement.dataset.rosterbotViewportSource=next.source;
        documentElement.dataset.rosterbotViewportValid=next.valid?'true':'false';
        applyDialogViewport(root.document,next);
      }
    }catch(_){}
    if(changed)for(const listener of [...viewportListeners]){try{listener(viewportCurrent)}catch(error){setTimeout(()=>{throw error},0)}}
    return viewportCurrent;
  }

  function refreshViewport(){viewportFrame=0;return publishViewport(measureViewport(root))}
  function scheduleViewportRefresh(){
    if(viewportFrame)return;
    const schedule=typeof root?.requestAnimationFrame==='function'?root.requestAnimationFrame.bind(root):(callback)=>setTimeout(callback,0);
    viewportFrame=schedule(refreshViewport);
  }
  function getViewportState(){return viewportCurrent||refreshViewport()}
  function subscribeViewport(listener){
    if(typeof listener!=='function')throw new TypeError('RosterBot viewport listener must be a function.');
    viewportListeners.add(listener);return()=>viewportListeners.delete(listener);
  }

  if(root){
    try{
      mediaQuery=typeof root.matchMedia==='function'?root.matchMedia('(display-mode: standalone)'):null;
      if(typeof mediaQuery?.addEventListener==='function')mediaQuery.addEventListener('change',refresh);
      else if(typeof mediaQuery?.addListener==='function')mediaQuery.addListener(refresh);
    }catch(_){}
    refresh();
    try{
      root.visualViewport?.addEventListener?.('resize',scheduleViewportRefresh,{passive:true});
      root.visualViewport?.addEventListener?.('scroll',scheduleViewportRefresh,{passive:true});
      root.addEventListener?.('orientationchange',scheduleViewportRefresh,{passive:true});
      root.addEventListener?.('pageshow',scheduleViewportRefresh,{passive:true});
      root.document?.addEventListener?.('focusin',scheduleViewportRefresh,{passive:true});
      root.document?.addEventListener?.('focusout',scheduleViewportRefresh,{passive:true});
    }catch(_){}
    refreshViewport();
  }

  return Object.freeze({detect,getState,refresh,subscribe,measureViewport,applyDialogViewport,getViewportState,refreshViewport,subscribeViewport});
});
