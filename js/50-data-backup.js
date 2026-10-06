(function(){
  'use strict';
  const modal=document.getElementById('dataModal'),openBtn=document.getElementById('dataOpenBtn'),noticeBtn=document.getElementById('openDataFromNotice'),closeBtn=document.getElementById('dataCloseBtn'),persistBtn=document.getElementById('persistDataBtn'),storageHealth=document.getElementById('storageHealth'),exportBtn=document.getElementById('exportDataBtn'),importBtn=document.getElementById('importDataBtn'),fileInput=document.getElementById('importDataFile'),clearBtn=document.getElementById('clearDataBtn'),status=document.getElementById('dataStatus'),backupAge=document.getElementById('backupAge'),privacyPill=document.querySelector('.privacy-pill');
  const registry=window.RosterBotPersistenceRegistry,keys=registry.surfaceKeys('backup');
  const meaningfulKeys=['rosterbot-timeline-v1','rosterbot-diary-annual-leave-v1','rosterbot-week-leave-v1','rosterbot-week-overrides-v1','rosterbot-day-overrides-v1','rosterbot-week-locks-v1','rosterbot-pay-checks-v1','rosterbot-employment-profile-v1','rosterbot-manual-schedule-v1'];
  function daysAgo(iso){if(!iso)return null;const n=Date.parse(iso);if(!Number.isFinite(n))return null;return Math.max(0,Math.floor((Date.now()-n)/86400000));}
  function backupLabel(){const raw=localStorage.getItem('rosterbot-last-backup-v1'),age=daysAgo(raw);if(age==null)return 'never';if(age===0)return 'today';if(age===1)return '1 day ago';return `${age} days ago`;}
  function updateBackupUI(){
    const label=backupLabel();if(backupAge)backupAge.textContent=`Last backup: ${label}.`;
    if(privacyPill){const cloud=window.RosterBotCloudSync?.summary?.();privacyPill.textContent=cloud?.signedIn?`Cloud ${cloud.revision!=null?`rev ${cloud.revision}`:'connected'} · local-first`:`Local-first diary · backup ${label}`;}
    const first=localStorage.getItem('rosterbot-first-use-v1');if(!first){try{localStorage.setItem('rosterbot-first-use-v1',new Date().toISOString())}catch(_){}}
    const lastAge=daysAgo(localStorage.getItem('rosterbot-last-backup-v1')),firstAge=daysAgo(first||new Date().toISOString());
    const hasData=meaningfulKeys.some(k=>{const v=localStorage.getItem(k);return v&&v!=='{}'&&v!=='[]'});
    const should=hasData&&((lastAge!=null&&lastAge>=30)||(lastAge==null&&firstAge>=7));
    let reminder=document.getElementById('backupReminder');
    if(should&&!reminder){
      reminder=document.createElement('div');reminder.id='backupReminder';reminder.className='backup-reminder';
      reminder.innerHTML=`<strong>Local backup recommended.</strong> Your roster history exists only in this browser. Last backup: ${label}. <button type=\"button\" class=\"text-action\" id=\"backupReminderBtn\">BACK UP NOW</button>`;
      document.getElementById('localDataNotice')?.insertAdjacentElement('afterend',reminder);
      reminder.querySelector('#backupReminderBtn')?.addEventListener('click',()=>exportBtn?.click());
    }else if(!should&&reminder)reminder.remove();
  }
  async function updateStorageHealth(){
    if(!storageHealth)return;
    try{
      localStorage.setItem('__rbpb_storage_test','1');localStorage.removeItem('__rbpb_storage_test');
      if(navigator.storage?.persisted){
        const persisted=await navigator.storage.persisted();
        storageHealth.innerHTML=persisted?'<strong>Browser storage:</strong> persistent storage has been granted on this device.':'<strong>Browser storage:</strong> standard browser storage. It normally survives ordinary restarts, but it can disappear if site data is cleared or the browser/profile is removed.';
        if(persistBtn)persistBtn.hidden=persisted||!navigator.storage?.persist;
      }else{storageHealth.innerHTML='<strong>Browser storage:</strong> available. This browser does not report whether it is protected from automatic eviction.';if(persistBtn)persistBtn.hidden=true;}
    }catch(_){storageHealth.innerHTML='<strong>Browser storage:</strong> unavailable or blocked. Exported backups are especially important on this browser.';if(persistBtn)persistBtn.hidden=true;}
  }
  const show=()=>{modal.hidden=false;document.body.classList.add('feedback-modal-open');status.textContent='';updateStorageHealth();updateBackupUI();};
  const showCloud=()=>{show();setTimeout(()=>{document.getElementById('cloudSyncSection')?.scrollIntoView({behavior:'smooth',block:'start'});const signedIn=!document.getElementById('cloudSignedIn')?.hidden;if(!signedIn)document.getElementById('cloudEmail')?.focus({preventScroll:true})},80)};
  const beginImport=()=>fileInput?.click();
  const hide=()=>{modal.hidden=true;document.body.classList.remove('feedback-modal-open');};
  function download(name,text){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
  function importPreview(candidate){
    const s=candidate.summary,yes=value=>value?'Present':'Not found',unknown=s.unknownKeys.length?s.unknownKeys.join(', '):'None';
    return [
      'Import preview',`App/version: ${s.app||'—'} · ${candidate.payload.version||'version not recorded'} · schema ${s.schemaVersion??'—'}`,
      `Roster history: ${s.rosterHistoryFound?`${s.rosterHistoryCount} entr${s.rosterHistoryCount===1?'y':'ies'}`:'Not found'}`,
      `Employment history: ${s.employmentHistoryFound?`${s.employmentHistoryCount} entr${s.employmentHistoryCount===1?'y':'ies'}`:'Not found'}`,
      `Diary changes: ${s.diaryChangesFound?'Found':'Not found'}`,`Manual schedule: ${yes(s.manualSchedulePresent)}`,`PayBot state: ${yes(s.paybotStatePresent)}`,
      `Calendar subscription settings: ${yes(s.calendarSettingsPresent)}`,`Recognised keys: ${s.recognisedCount} of ${s.totalRecognisedKeys}`,'Malformed or unsupported items: None',`Unknown storage keys (preserved for this review, not applied): ${unknown}`,`Unknown wrapper fields: ${s.unknownWrapperFields.length?s.unknownWrapperFields.join(', '):'None'}`,
      '',s.empty?'This backup contains no personal data. Continuing would clear the current backup-scoped data.':s.partial?'This is a partial backup. The established .rosterbot format is a FULL REPLACEMENT: recognised backup keys missing from this file will be removed.':'This .rosterbot backup is a full replacement of backup-scoped data.',
      'Credentials and device-local secrets are never displayed or imported.','',s.empty?'Review the exceptional empty replacement?':'Replace this device data with this staged backup?'
    ].join('\n');
  }
  function replacementFailureState(candidate,replacement,source='backup-import'){
    const before=replacement.beforeLocal||replacement.before||{},incoming=candidate?.storage||{},keys=[...new Set([...Object.keys(before),...Object.keys(incoming)])],copies={};
    for(const key of keys)if(registry.get(key))copies[key]={local:before[key]??null,indexedDb:Object.prototype.hasOwnProperty.call(incoming,key)?incoming[key]:null};
    return {issueType:'unrecoverable',reason:replacement.rolledBack?`${source} failed during ${replacement.stage}; exact rollback ${replacement.rollbackVerified?'was verified':'could not be verified'}.`:`${source} failed during ${replacement.stage} before commit; no live value was changed.`,affectedKeys:keys,validationStates:{local:{},indexedDb:{}},preservedRawCopies:copies,replacement};
  }
  function retainFailureEvidence(candidate,replacement,source){
    const failure=replacementFailureState(candidate,replacement,source),ui=window.RosterBotRecoveryUI;
    if(!ui?.buildRecoveryExport)return failure;
    const artifact=ui.buildRecoveryExport({state:failure,registry,appVersion:'v0.30-phase6'});
    artifact.replacement={source,stage:replacement.stage,rolledBack:!!replacement.rolledBack,rollbackVerified:!!replacement.rollbackVerified,unknownIncomingKeys:Object.keys(candidate?.unknownStorage||{}),unknownIncomingWrapperFields:Object.keys(candidate?.wrapperUnknown||{})};
    window.__rosterbotLastRecoveryEvidence=artifact;
    try{download(`rosterbot-${source}-failure-${artifact.exportedAt.replace(/[:.]/g,'-')}.json`,JSON.stringify(artifact,null,2))}catch(_){}
    return failure;
  }
  async function applyImportCandidate(candidate){
    if(localStorage.getItem('rosterbot-db-schema-v1')==='5'&&window.RosterBotSchema5Migration?.replaceFromSchema4Storage){
      const target=window.RosterBotRecovery?.getIndexedDbTarget?.();
      if(!target)return {ok:false,stage:'indexeddb-unavailable',rolledBack:false,rollbackVerified:true,error:new Error('The recovery mirror is required for a schema-5 import.')};
      return window.RosterBotSchema5Migration.replaceFromSchema4Storage({storage:localStorage,indexedDbTarget:target,schema4Storage:candidate.storage,now:new Date().toISOString()});
    }
    const staged={...candidate,storage:{...candidate.storage,'rosterbot-db-schema-v1':String(registry.schemaVersion)}},plan=window.RosterBotPersistenceSafety.replacementPlan(staged,{extraRemovals:['paybot-lastcalc','rosterbot-cleared-v1']}),idbKeys=registry.surfaceKeys('indexedDb'),writes=new Map(plan.localSet),indexedDbSet=idbKeys.filter(key=>writes.has(key)).map(key=>[key,writes.get(key)]),indexedDbRemove=idbKeys.filter(key=>!writes.has(key));
    const common={storage:localStorage,registry,localSet:plan.localSet,localRemove:plan.localRemove,indexedDbSet,indexedDbRemove},target=window.RosterBotRecovery?.getIndexedDbTarget?.();
    const replaceCopies=window.RosterBotPersistenceSafety.replaceCanonicalPersistenceCopies||window.RosterBotPersistenceSafety.replacePersistenceCopies;
    return target?replaceCopies({...common,indexedDbTarget:target}):window.RosterBotPersistenceSafety.replacePersistentState({storage:localStorage,registry,replacements:plan.localSet,removals:plan.localRemove});
  }
  function markExplicitClear(){
    const stamp=new Date().toISOString(),safety=window.RosterBotPersistenceSafety;
    if(safety?.markExplicitClear)return safety.markExplicitClear(localStorage,stamp);
    localStorage.setItem('rosterbot-cleared-v1',stamp);
    let holds={};try{const parsed=JSON.parse(localStorage.getItem('rosterbot-cloud-auto-hold-v1')||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))holds=parsed}catch(_){}
    holds.__device={reason:'explicit-local-clear',at:stamp};localStorage.setItem('rosterbot-cloud-auto-hold-v1',JSON.stringify(holds));return {clearedAt:stamp,hold:holds.__device};
  }
  openBtn?.addEventListener('click',show);noticeBtn?.addEventListener('click',show);closeBtn?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();hide()});modal?.addEventListener('click',e=>{const close=e.target.closest?.('#dataCloseBtn');if(close){e.preventDefault();e.stopPropagation();hide();return}if(e.target===modal)hide()},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)hide()});
  persistBtn?.addEventListener('click',async()=>{try{if(!navigator.storage?.persist)throw new Error('This browser does not offer persistent-storage requests.');const granted=await navigator.storage.persist();status.textContent=granted?'Persistent browser storage granted. You should still export backups of important history.':'The browser kept standard storage. Autosave still works, but an exported backup is the durable copy you control.';status.className=granted?'feedback-status success':'feedback-status';await updateStorageHealth()}catch(err){status.textContent=err?.message||'Could not request persistent storage.';status.className='feedback-status error'}});
  exportBtn?.addEventListener('click',()=>{
    const stamp=new Date().toISOString(),storage={};for(const key of keys){const value=localStorage.getItem(key);if(value!=null)storage[key]=value}storage['rosterbot-db-schema-v1']='4';const payload={app:'RosterBotPayBot',version:'0.26.1-mobile-ui-hotfix',schemaVersion:4,exportedAt:stamp,privacy:'Personal diary data exported from local browser storage. Manual .rosterbot exports are plaintext even when encrypted Cloud Sync is enabled.',storage},d=new Date(),ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    try{download(`RosterBot-PayBot-backup-${ds}.rosterbot`,JSON.stringify(payload,null,2));localStorage.setItem('rosterbot-last-backup-v1',stamp);localStorage.setItem('rosterbot-db-schema-v1',String(window.RosterBotSchema5?.SCHEMA5_STORAGE_SCHEMA||4));status.textContent='Backup download requested. Check your browser Downloads / save prompt.';status.className='feedback-status success';updateBackupUI();setTimeout(()=>window.RosterBotDiary?.mirrorNow?.(),0)}catch(err){status.textContent='Backup could not be created: '+(err?.message||err);status.className='feedback-status error'}
  });
  importBtn?.addEventListener('click',()=>fileInput?.click());fileInput?.addEventListener('change',async()=>{const file=fileInput.files?.[0];if(!file)return;let cloudToken=null;try{
    let payload;try{payload=JSON.parse(await file.text())}catch(_){throw new Error('That file is not valid JSON. Nothing was changed.')}
    const safety=window.RosterBotPersistenceSafety,candidate=safety.stageReplacementPayload({payload,registry,surface:'backup'});
    if(candidate.recoveryArtifact)throw new Error(candidate.errors[0]);
    if(!candidate.ok)throw new Error(`This backup cannot be imported. Nothing was changed. ${candidate.errors.join(' ')}`);
    status.textContent=`Staged safely: ${candidate.summary.recognisedCount} recognised key${candidate.summary.recognisedCount===1?'':'s'}; ${candidate.summary.unknownKeys.length} unknown; current data unchanged.`;status.className='feedback-status';
    if(!confirm(importPreview(candidate)))return;
    if(candidate.summary.empty&&!confirm('Exceptional empty replacement\n\nThis valid backup contains no personal data. Continuing will clear current backup-scoped personal data. This cannot be undone without another backup.\n\nClear and replace anyway?'))return;
    cloudToken=window.RosterBotCloudSync?.beginReplacement?.('backup-import')||null;
    const replacement=await applyImportCandidate(candidate);
    if(!replacement.ok){const failure=retainFailureEvidence(candidate,replacement,'backup-import'),rollbackFailed=replacement.rolledBack&&!replacement.rollbackVerified;if(rollbackFailed)window.RosterBotRecovery?.enterReplacementFailure?.(failure);throw new Error(`Import failed during ${replacement.stage}. ${replacement.rolledBack?(replacement.rollbackVerified?'The exact prior local and recovery-mirror state was restored and recovery evidence was downloaded.':'Exact rollback could not be verified; recovery mode is now active and recovery evidence was retained.'):'No live data was changed; recovery evidence was retained.'}`)}
    window.RosterBotCloudSync?.pauseAutoSync?.('backup-import');
    status.textContent='Backup replacement was written and verified exactly. Reloading…';status.className='feedback-status success';setTimeout(()=>location.reload(),350);
  }catch(err){status.textContent=err?.message||'Could not import that backup.';status.className='feedback-status error'}finally{window.RosterBotCloudSync?.endReplacement?.(cloudToken);fileInput.value=''}});
  clearBtn?.addEventListener('click',async()=>{if(!confirm('Clear the roster diary and PayBot data saved in this browser, and forget remembered Cloud Sync encryption keys on this browser?\n\nYour cloud copy is NOT deleted. This cannot be undone unless you have exported a backup and still have your encryption passphrase/recovery key.'))return;try{markExplicitClear();window.RosterBotCloudSync?.pauseAutoSync?.('explicit-local-clear')}catch(_){}const schema5Local=localStorage.getItem('rosterbot-db-schema-v1')==='5'&&window.RosterBotSchema5Migration?.replaceFromSchema4Storage;if(schema5Local){const target=window.RosterBotRecovery?.getIndexedDbTarget?.(),replacement=target?await window.RosterBotSchema5Migration.replaceFromSchema4Storage({storage:localStorage,indexedDbTarget:target,schema4Storage:{},source:'explicit-local-clear',kind:'clear',now:new Date().toISOString()}):{ok:false,stage:'indexeddb-unavailable'};if(!replacement.ok){status.textContent=`Local clear stopped safely during ${replacement.stage}. Recovery evidence and the prior schema-5 generation were retained.`;status.className='feedback-status error';return}}else{for(const key of keys)localStorage.removeItem(key);try{await window.RosterBotDiary?.clearDatabase?.()}catch(_){}}localStorage.removeItem('paybot-lastcalc');try{window.RosterBotCloudSync?.forgetAllTrustedDeviceKeys?.()}catch(_){try{localStorage.removeItem('rosterbot-cloud-device-key-v1');localStorage.removeItem('rosterbot-cloud-crypto-profile-v1')}catch(__){}}status.textContent='Local roster/pay diary cleared and remembered cloud encryption keys forgotten. Cloud data was not deleted. Reloading…';status.className='feedback-status success';setTimeout(()=>location.reload(),350)});
  window.RosterBotDataUI={show,showCloud,beginImport,hide,updateBackupUI,keys,importPreview,stageImport:payload=>window.RosterBotPersistenceSafety.stageReplacementPayload({payload,registry,surface:'backup'})};updateBackupUI();
})();
