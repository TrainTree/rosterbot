(function(){
  'use strict';
  const compatibility=window.RosterBotStorageCompatibility,registry=window.RosterBotPersistenceRegistry,safety=window.RosterBotPersistenceSafety,recoveryUi=window.RosterBotRecoveryUI;
  const personalKeys=registry.surfaceKeys('indexedDb');
  const moduleSources=[
    'data/rosters-fp64-fp68-20260908.js','js/10-roster-official.js','js/11-roster-engine.js','js/12-roster-effective-dates.js',
    'js/40-employment-profile.js','js/20-roster-ui.js','js/30-feedback.js','js/31-changelog.js','data/pay-reference-20260923.js',
    'js/41-pay-rate-official.js','js/42-paybot.js','js/50-data-backup.js','js/51-cloud-sync.js','js/60-diary.js','js/61-page-bridge.js',
    'js/75-sources.js','js/70-navigation.js','js/80-calendar-subscription.js'
  ];
  let state=null,applicationLoaded=false,recoveryBusy=false;
  const recoveryApi={
    getState:()=>state,
    isBlocked:()=>state?.startupAllowed===false||state?.userChoiceRequired===true,
    canMirror:()=>state?.mirrorAllowed!==false,
    storagePolicy:()=>compatibility?.POLICY||null,
    getIndexedDbTarget:()=>indexedDbTarget,
    exportEvidence:()=>downloadEvidence(),
    resolve:choice=>resolveRecovery(choice),
    enterReplacementFailure:failure=>enterReplacementFailure(failure)
  };
  window.RosterBotRecovery=Object.freeze(recoveryApi);

  function currentLocalValues(){
    const result={};
    for(let index=0;index<localStorage.length;index++){const key=localStorage.key(index);if(key!=null)result[key]=localStorage.getItem(key)}
    return result;
  }
  function status(message,kind=''){
    const output=document.querySelector('[data-recovery-status]');if(!output)return;output.textContent=message||'';output.className=`recovery-status${kind?' '+kind:''}`;
  }
  function showRecovery(message){
    const startup=document.getElementById('appStartup');
    if(!startup)return;
    if(recoveryUi)recoveryUi.render({container:startup,state,registry});
    else{startup.dataset.recoveryState=state?.issueType||'unavailable';const text=startup.querySelector('span');if(text)text.textContent='Saved data needs recovery review. No stored copy has been changed.'}
    if(message)status(message,'error');
  }
  function blockForNewerSchema(result,{localValues={},rows=[]}={}){
    state=compatibility.recoveryState(result,{localValues,indexedDbRows:rows});
    showRecovery();
    window.dispatchEvent(new CustomEvent('rosterbot:update-required',{detail:state}));
    window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));
    return state;
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
  async function loadApplication(){if(applicationLoaded)return;applicationLoaded=true;for(const src of moduleSources)await loadScript(src)}
  function applyRows({put=[],remove=[]}={}){
    if(!put.length&&!remove.length)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      let request,newDatabase=false;
      try{request=indexedDB.open('RosterBotPersonalDB',1)}catch(error){reject(error);return}
      request.onupgradeneeded=event=>{newDatabase=event.oldVersion===0;if(put.length&&!request.result.objectStoreNames.contains('kv'))request.result.createObjectStore('kv',{keyPath:'key'});else if(newDatabase)request.transaction.abort()};
      request.onerror=()=>{if(newDatabase&&!put.length&&request.error?.name==='AbortError')resolve();else reject(request.error||new Error('Saved mirror could not be opened'))};
      request.onsuccess=()=>{
        const db=request.result;if(!db.objectStoreNames.contains('kv')){db.close();if(put.length)reject(new Error('Saved mirror is missing its data store'));else resolve();return}
        const tx=db.transaction('kv','readwrite'),store=tx.objectStore('kv');
        for(const row of put)store.put(row);for(const key of remove)store.delete(key);
        tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{const error=tx.error||new Error('Saved mirror write failed');db.close();reject(error)};tx.onabort=()=>{const error=tx.error||new Error('Saved mirror write was aborted');db.close();reject(error)};
      };
    });
  }
  const indexedDbTarget={
    read:async keys=>{const wanted=new Set(keys),rows=await readRows();return new Map(keys.map(key=>[key,rows.find(row=>wanted.has(row.key)&&row.key===key)||null]))},
    apply:applyRows
  };
  function enterReplacementFailure(failure={}){
    state={
      issueType:'unrecoverable',affectedKeys:[...(failure.affectedKeys||[])],localValidationState:'unknown',indexedDbValidationState:'unknown',
      automaticRecoveryAllowed:false,userChoiceRequired:true,startupAllowed:false,mirrorAllowed:false,decisions:[],replacementEntries:[],
      validationStates:failure.validationStates||{local:{},indexedDb:{}},preservedRawCopies:failure.preservedRawCopies||{},replacement:failure.replacement||null,
      reason:failure.reason||'A state replacement failed and rollback could not be verified.'
    };
    showRecovery('RosterBot could not verify exact rollback after replacing saved data. Automatic sync and mirroring are paused. Export the recovery evidence before continuing.');
    window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));
    return state;
  }
  function downloadEvidence(){
    if(!recoveryUi||!state)return null;
    const artifact=recoveryUi.buildRecoveryExport({state,registry}),text=JSON.stringify(artifact,null,2),blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=`rosterbot-recovery-${artifact.exportedAt.replace(/[:.]/g,'-')}.json`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Recovery evidence exported. No saved copy was changed.','success');return artifact;
  }
  async function resolveRecovery(choice){
    if(recoveryBusy||!state?.userChoiceRequired)return false;
    if(choice==='clear'&&!confirm('Clear the preserved RosterBot personal data in this browser and start again?\n\nA recovery evidence file will be downloaded first. This cannot be undone inside RosterBot.'))return false;
    recoveryBusy=true;
    try{
      const localValues=currentLocalValues(),plan=recoveryUi.createRecoveryPlan({state,choice,registry,safety,localValues});
      downloadEvidence();status(choice==='clear'?'Preserving evidence, then clearing saved personal data…':'Preserving evidence, then verifying your choice…');
      const replacement=await safety.replaceCanonicalPersistenceCopies({storage:localStorage,indexedDbTarget,registry,...plan});
      if(!replacement.ok){state={...state,startupAllowed:false,mirrorAllowed:false,userChoiceRequired:true,replacement,resolutionFailure:{stage:replacement.stage,rolledBack:replacement.rolledBack,rollbackVerified:replacement.rollbackVerified},reason:`Recovery ${replacement.stage} failed; prior raw state ${replacement.rollbackVerified?'was restored':'could not be fully verified after rollback'}.`};status(`Recovery failed safely during ${replacement.stage}. ${replacement.rollbackVerified?'Both prior copies were restored and verified.':'Rollback could not be fully verified; export the evidence and leave this screen open.'}`,'error');return false}
      const rows=await readRows();state={...await safety.reconcileCanonicalState({registry,localValues:currentLocalValues(),rows,personalKeys}),resolution:{choice,replacement,completedAt:new Date().toISOString()}};
      if(!state.startupAllowed||state.userChoiceRequired){showRecovery('That choice was applied and verified, but another saved-data decision still needs review.');window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));return false}
      window.dispatchEvent(new CustomEvent('rosterbot:recovery-resolved',{detail:state}));status('Recovery verified. Starting RosterBot…','success');await loadApplication();return true;
    }catch(error){state={...(state||readFailureState(error)),startupAllowed:false,mirrorAllowed:false,userChoiceRequired:true,reason:error?.message||String(error)};showRecovery(`Recovery could not continue: ${error?.message||error}. No unverified copy was accepted.`);return false}
    finally{recoveryBusy=false}
  }
  function bindRecoveryActions(){
    document.addEventListener('click',event=>{
      const exportButton=event.target.closest?.('[data-recovery-export]'),choiceButton=event.target.closest?.('[data-recovery-choice]'),cancelButton=event.target.closest?.('[data-recovery-cancel]');
      if(exportButton){downloadEvidence();return}
      if(choiceButton){resolveRecovery(choiceButton.dataset.recoveryChoice);return}
      if(cancelButton)status('Nothing was changed. This recovery screen will remain after a reload until you choose.');
    });
    document.addEventListener('change',event=>{if(!event.target.matches?.('[data-recovery-clear-confirm]'))return;const button=document.querySelector('[data-recovery-choice="clear"]');if(button)button.disabled=!event.target.checked});
  }
  function readFailureState(error){return {
    issueType:'unrecoverable',affectedKeys:personalKeys,localValidationState:'unknown',indexedDbValidationState:'unavailable',
    automaticRecoveryAllowed:false,userChoiceRequired:true,startupAllowed:false,mirrorAllowed:false,decisions:[],replacementEntries:[],
    preservedRawCopies:{local:{...(window.__rosterbotLocalStateAtStartup||{})},indexedDb:null},reason:error?.message||String(error)
  }}

  bindRecoveryActions();
  (async()=>{
    try{
      if(window.__rosterbotLocalStateAtStartup==null)throw new Error('localStorage could not be read safely');
      if(!compatibility)throw new Error('Storage compatibility guard could not be loaded');
      const localValues=window.__rosterbotLocalStateAtStartup,localCompatibility=compatibility.inspect({localValues});
      // A local downgrade marker must stop startup before IndexedDB is even
      // opened. This keeps future projections read-only and prevents a mirror.
      if(localCompatibility.blocked){blockForNewerSchema(localCompatibility,{localValues});return}
      const rows=await readRows(),combinedCompatibility=compatibility.inspect({localValues,indexedDbRows:rows});
      if(combinedCompatibility.blocked){blockForNewerSchema(combinedCompatibility,{localValues,rows});return}
      state=await safety.reconcileCanonicalState({registry,localValues,rows,personalKeys});
      if(!state.startupAllowed||state.userChoiceRequired){showRecovery();window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));return}
      if(state.reconciliationPlan){
        const replacement=await safety.replacePersistenceCopies({storage:localStorage,indexedDbTarget,registry,...state.reconciliationPlan});
        state={...state,replacement};
        if(!replacement.ok){state={...state,issueType:'unrecoverable',startupAllowed:false,mirrorAllowed:false,userChoiceRequired:true,automaticRecoveryAllowed:false,reason:`Generation recovery ${replacement.stage} failed; prior raw state was restored.`};showRecovery('Generation recovery failed safely. Your prior data was restored and no feature modules were started.');window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));return}
        state={...await safety.reconcileCanonicalState({registry,localValues:currentLocalValues(),rows:await readRows(),personalKeys}),replacement};
        if(!state.startupAllowed||state.userChoiceRequired){showRecovery('Automatic generation recovery was applied, but the resulting copies still require review.');window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));return}
      }
      if(state.replacementEntries.length){
        const replacement=await safety.replacePersistentState({storage:localStorage,replacements:state.replacementEntries,registry});
        state={...state,replacement};
        if(!replacement.ok){state={...state,issueType:'unrecoverable',startupAllowed:false,mirrorAllowed:false,userChoiceRequired:true,automaticRecoveryAllowed:false,reason:`Automatic recovery ${replacement.stage} failed; prior raw state was restored.`};showRecovery('Automatic recovery failed safely. Your prior data was restored and no feature modules were started.');window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}));return}
        state={...await safety.reconcileCanonicalState({registry,localValues:currentLocalValues(),rows,personalKeys}),replacement};
      }
      await loadApplication();
    }catch(error){state=readFailureState(error);showRecovery('RosterBot could not safely inspect saved data. No stored copy has been changed.');window.dispatchEvent(new CustomEvent('rosterbot:recovery-required',{detail:state}))}
  })();
})();
