(function(){
  'use strict';
  const registry=window.RosterBotPersistenceRegistry,safety=window.RosterBotPersistenceSafety;
  const personalKeys=registry.surfaceKeys('indexedDb');
  const moduleSources=[
    'data/rosters-fp64-fp68-20260908.js','js/10-roster-official.js','js/11-roster-engine.js','js/12-roster-effective-dates.js',
    'js/40-employment-profile.js','js/20-roster-ui.js','js/30-feedback.js','js/31-changelog.js','data/pay-reference-20260923.js',
    'js/41-pay-rate-official.js','js/42-paybot.js','js/50-data-backup.js','js/51-cloud-sync.js','js/60-diary.js','js/61-page-bridge.js',
    'js/75-sources.js','js/70-navigation.js','js/80-calendar-subscription.js'
  ];
  let state=null;
  const recoveryApi={
    getState:()=>state,
    isBlocked:()=>state?.startupAllowed===false,
    canMirror:()=>state?.mirrorAllowed!==false
  };
  window.RosterBotRecovery=Object.freeze(recoveryApi);

  function showRecovery(message){
    const startup=document.getElementById('appStartup'),text=startup?.querySelector('span');
    if(startup)startup.dataset.recoveryState=state?.issueType||'unavailable';
    if(text)text.textContent=message||'Saved data needs recovery review. No stored copy has been changed.';
  }
  function readRows(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB'in window)){resolve([]);return}
      let newDatabase=false,request;
      try{request=indexedDB.open('RosterBotPersonalDB',1)}catch(error){reject(error);return}
      request.onupgradeneeded=event=>{if(event.oldVersion===0){newDatabase=true;request.transaction.abort()}};
      request.onerror=()=>{if(newDatabase&&request.error?.name==='AbortError')resolve([]);else reject(request.error||new Error('IndexedDB could not be opened'))};
      request.onsuccess=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains('kv')){db.close();resolve([]);return}
        const tx=db.transaction('kv','readonly'),query=tx.objectStore('kv').getAll();
        query.onsuccess=()=>{const rows=query.result||[];db.close();resolve(rows)};
        query.onerror=()=>{const error=query.error||tx.error;db.close();reject(error)};
      };
    });
  }
  function loadScript(src){
    return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(script)});
  }
  async function loadApplication(){for(const src of moduleSources)await loadScript(src)}
  function readFailureState(error){return {
    issueType:'unrecoverable',affectedKeys:personalKeys,localValidationState:'unknown',indexedDbValidationState:'unavailable',
    automaticRecoveryAllowed:false,userChoiceRequired:true,startupAllowed:false,mirrorAllowed:false,decisions:[],replacementEntries:[],
    preservedRawCopies:{local:{...(window.__rosterbotLocalStateAtStartup||{})},indexedDb:null},reason:error?.message||String(error)
  }}

  (async()=>{
    try{
      if(window.__rosterbotLocalStateAtStartup==null)throw new Error('localStorage could not be read safely');
      const rows=await readRows(),localValues=window.__rosterbotLocalStateAtStartup;
      state=safety.decideRecovery({registry,localValues,rows,personalKeys});
      if(!state.startupAllowed){showRecovery();window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));return}
      if(state.replacementEntries.length){
        const replacement=await safety.replacePersistentState({storage:localStorage,replacements:state.replacementEntries,registry});
        state={...state,replacement};
        if(!replacement.ok){state={...state,issueType:'unrecoverable',startupAllowed:false,mirrorAllowed:false,userChoiceRequired:true,automaticRecoveryAllowed:false,reason:`Automatic recovery ${replacement.stage} failed; prior raw state was restored.`};showRecovery('Automatic recovery failed safely. Your prior data was restored and no feature modules were started.');window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));return}
      }
      await loadApplication();
    }catch(error){state=readFailureState(error);showRecovery('RosterBot could not safely inspect saved data. No stored copy has been changed.');window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}))}
  })();
})();
