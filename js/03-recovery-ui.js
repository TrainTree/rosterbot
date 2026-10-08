try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.start('03-recovery-ui','RosterBotRecoveryUI',document.currentScript?.src||'js/03-recovery-ui.js')}catch(_){}
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotRecoveryUI=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const BUILD_VERSION='v0.30-phase7b';
  const RECOVERABLE=new Set(['valid','legacy']);
  const SECRET_SENSITIVITY=new Set(['secret','cryptographic']);
  const LABELS={
    'rosterbot-timeline-v1':'Roster history','rosterbot-employment-profile-v1':'Employment history',
    'rosterbot-day-overrides-v1':'Diary changes','rosterbot-week-overrides-v1':'Roster week changes',
    'rosterbot-fortnight-notes-v1':'Fortnight notes','rosterbot-pay-checks-v1':'Pay checks',
    'rosterbot-db-schema-v1':'Data format','rosterbot-session-settings-v1':'Current roster settings',
    'rosterbot-cleared-v1':'Clear record'
  };
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const recoverable=checked=>RECOVERABLE.has(checked?.state);
  const iso=value=>{const time=Date.parse(String(value||''));return Number.isFinite(time)?new Date(time).toISOString():null};
  const friendlyDate=value=>{const stamp=iso(value);return stamp?new Date(stamp).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short'}):null};

  function sourceChecks(state,registry,source){
    const result=new Map();
    for(const decision of state?.decisions||[]){
      const checked=source==='local'?decision.local:decision.indexedDb;
      if(decision.key&&checked)result.set(decision.key,checked);
    }
    for(const [key,copies] of Object.entries(state?.preservedRawCopies||{})){
      if(result.has(key)||!registry.get(key)||!copies||typeof copies!=='object')continue;
      const raw=source==='local'?copies.local:copies.indexedDb;
      result.set(key,registry.validate(key,raw));
    }
    return result;
  }
  function currentTimeline(rows,now){
    if(!Array.isArray(rows)||!rows.length)return null;
    const date=String(now||new Date().toISOString()).slice(0,10),ordered=[...rows].filter(row=>row&&typeof row.startWC==='string').sort((a,b)=>a.startWC.localeCompare(b.startWC));
    return [...ordered].reverse().find(row=>row.startWC<=date)||ordered[0]||null;
  }
  function summarizeSource(state,registry,source,{now}={}){
    const checks=sourceChecks(state,registry,source),values=new Map([...checks].filter(([,checked])=>recoverable(checked)).map(([key,checked])=>[key,checked.value]));
    const states={valid:0,legacy:0,malformed:0,unsupported:0,missing:0};
    for(const checked of checks.values())states[checked.state]=(states[checked.state]||0)+1;
    const other=sourceChecks(state,registry,source==='local'?'indexedDb':'local');
    const missingInformation=[...other].filter(([key,checked])=>recoverable(checked)&&!recoverable(checks.get(key))).map(([key])=>LABELS[key]||key);
    const timeline=values.get('rosterbot-timeline-v1'),employment=values.get('rosterbot-employment-profile-v1'),dayOverrides=values.get('rosterbot-day-overrides-v1');
    const current=currentTimeline(timeline,now),dates=Array.isArray(timeline)?timeline.map(row=>row?.startWC).filter(Boolean).sort():[];
    const updated=source==='indexedDb'?[...(state?.decisions||[])].map(item=>item.indexedDb?.updatedAt).map(iso).filter(Boolean).sort().at(-1)||null:null;
    const problems=states.malformed+states.unsupported;
    return {
      source,status:problems?'damaged':states.valid+states.legacy?'valid':'empty',states,missingInformation,
      rosterHistoryCount:Array.isArray(timeline)?timeline.length:0,rosterDateRange:dates.length?{from:dates[0],to:dates.at(-1)}:null,
      currentRoster:current?{depot:current.trackA?.depot||'',roster:current.trackA?.roster||'',line:current.trackA?.line??'',mode:current.mode||''}:null,
      employmentHistoryCount:Array.isArray(employment)?employment.length:0,
      diaryOverrideCount:dayOverrides&&typeof dayOverrides==='object'&&!Array.isArray(dayOverrides)?Object.keys(dayOverrides).length:0,
      lastModified:updated
    };
  }
  function summarizeRecovery(state,registry,options={}){
    return {local:summarizeSource(state,registry,'local',options),indexedDb:summarizeSource(state,registry,'indexedDb',options)};
  }
  function redactedRaw(registry,key,raw){
    if(raw==null)return null;
    const item=registry.get(key);
    if(!item||item.category==='credential'||SECRET_SENSITIVITY.has(item.sensitivity))return {redacted:true,reason:item?'credential or device secret':'unregistered value'};
    return raw;
  }
  function normalizedCopies(state,registry){
    const copies={};
    for(const [key,value] of Object.entries(state?.preservedRawCopies||{})){
      if(key==='local'&&value&&typeof value==='object'&&!Array.isArray(value)&&!Object.prototype.hasOwnProperty.call(value,'local')){
        for(const [localKey,raw] of Object.entries(value))if(registry.get(localKey))copies[localKey]={local:redactedRaw(registry,localKey,raw),recoveredBackup:null};
        continue;
      }
      if(!registry.get(key))continue;
      const pair=value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,'local')?value:{local:value,indexedDb:null};
      copies[key]={local:redactedRaw(registry,key,pair.local),recoveredBackup:redactedRaw(registry,key,pair.indexedDb)};
    }
    return copies;
  }
  function buildRecoveryExport({state,registry,now=new Date().toISOString(),appVersion=BUILD_VERSION}){
    const summaries=summarizeRecovery(state,registry,{now});
    return {
      format:'rosterbot-recovery-evidence-v1',exportedAt:new Date(now).toISOString(),app:'RosterBot',appVersion,
      personalDataSchema:registry.schemaVersion,recovery:{type:state?.issueType||'unavailable',reason:state?.reason||null,clearedAt:state?.clearedAt||null,affectedKeys:[...(state?.affectedKeys||[])]},
      storageCompatibility:state?.storageCompatibility?JSON.parse(JSON.stringify(state.storageCompatibility)):null,
      validationStates:{local:{...(state?.validationStates?.local||{})},recoveredBackup:{...(state?.validationStates?.indexedDb||{})}},
      sources:{local:{id:'this-device',summary:summaries.local},recoveredBackup:{id:'recovery-mirror',summary:summaries.indexedDb}},
      preservedRawCopies:normalizedCopies(state,registry),
      privacy:'Recovery evidence may contain personal roster, diary, employment and pay data. Credentials, private calendar tokens and cryptographic secrets are redacted.'
    };
  }

  function sourceAvailable(state,source){
    const choices=(state?.decisions||[]).filter(item=>item.userChoiceRequired||['conflict','malformed-local-recoverable','malformed-indexeddb-recoverable'].includes(item.issueType));
    if(!choices.length&&state?.ambiguousTombstone){
      return Object.entries(state.preservedRawCopies||{}).some(([key,pair])=>key!=='rosterbot-cleared-v1'&&pair?.[source==='local'?'local':'indexedDb']!=null);
    }
    return choices.length>0&&choices.every(item=>recoverable(source==='local'?item.local:item.indexedDb));
  }
  function presentation(state){
    if(state?.ambiguousTombstone)return {title:'Choose whether to keep cleared data',intro:'RosterBot found a clear record and retained saved data, but cannot safely tell which is newer.',detail:'Automatically generated defaults are not being used to make this decision. RosterBot will not replace or restore anything until you choose.',kind:'tombstone'};
    switch(state?.issueType){
      case 'newer-schema':return {title:'This RosterBot data was created by a newer version of RosterBot.',intro:'Your saved data has not been changed.',detail:'Open this data with the newer version of RosterBot. This version will remain read-only; any schema-4 compatibility projection is recovery evidence only and cannot be opened as ordinary writable data.',kind:'update-required'};
      case 'conflict':return {title:'Choose which saved copy to use',intro:'RosterBot found two different saved copies of your data.',detail:'Both copies are preserved. RosterBot will not replace anything until you choose.',kind:'choice'};
      case 'malformed-local-recoverable':return {title:'A saved copy needs recovery',intro:'The copy RosterBot normally opens appears damaged, but another recoverable copy exists.',detail:'You can export the evidence, then recover using the valid saved copy.',kind:'recover-local'};
      case 'malformed-indexeddb-recoverable':return {title:'A saved mirror needs repair',intro:'Your current copy is valid, but its recovery mirror appears damaged.',detail:'RosterBot has paused startup and mirroring until you approve a verified repair.',kind:'repair-mirror'};
      case 'unsupported':return {title:'A newer RosterBot version is required',intro:'This data was written by a newer or unsupported version of RosterBot.',detail:'This version will not convert, replace or clear it. Export the preserved data and open it with the version that wrote it.',kind:'unsupported'};
      default:return {title:'Saved data could not be recovered automatically',intro:'RosterBot could not find a complete valid copy it can safely use.',detail:'Nothing has been reset. Export the preserved evidence before deciding whether to clear this browser and start again.',kind:'unrecoverable'};
    }
  }
  function copyOperations(state,source,registry){
    const localSet=[],localRemove=[],indexedDbSet=[],indexedDbRemove=[];
    for(const item of state?.decisions||[]){
      const localGood=recoverable(item.local),idbGood=recoverable(item.indexedDb);
      if(item.issueType==='restore-indexeddb'&&idbGood){localSet.push([item.key,item.preservedRawCopies.indexedDb]);continue}
      if(!item.userChoiceRequired&&!['conflict','malformed-local-recoverable','malformed-indexeddb-recoverable'].includes(item.issueType))continue;
      const selected=source==='local'?item.local:item.indexedDb,raw=source==='local'?item.preservedRawCopies.local:item.preservedRawCopies.indexedDb;
      if(!recoverable(selected))throw new Error(`${source==='local'?'This device copy':'The recovered copy'} is not valid for ${item.key}.`);
      if(source==='local'&&(!idbGood||item.issueType==='conflict'))indexedDbSet.push([item.key,raw]);
      if(source==='indexedDb'&&(!localGood||item.issueType==='conflict'))localSet.push([item.key,raw]);
    }
    if(state?.ambiguousTombstone)localRemove.push('rosterbot-cleared-v1');
    return {localSet,localRemove,indexedDbSet,indexedDbRemove};
  }
  function clearHoldOperation(localValues,safety){
    let holds;try{holds=JSON.parse(localValues?.[safety.AUTO_HOLD_KEY]||'{}')}catch(_){return null}
    if(!holds||typeof holds!=='object'||Array.isArray(holds)||holds.__device?.reason!==safety.CLEAR_REASON)return null;
    delete holds.__device;
    return Object.keys(holds).length?[safety.AUTO_HOLD_KEY,JSON.stringify(holds)]:safety.AUTO_HOLD_KEY;
  }
  function createRecoveryPlan({state,choice,registry,safety,localValues={},now=new Date().toISOString()}){
    if(choice==='clear'){
      const keys=registry.surfaceKeys('indexedDb'),localRemove=registry.items.filter(item=>['personal','derived','recovery'].includes(item.category)).map(item=>item.key),indexedDbRemove=[...keys];
      return {choice,localSet:[[safety.CLEAR_KEY,new Date(now).toISOString()]],localRemove:localRemove.filter(key=>key!==safety.CLEAR_KEY),indexedDbSet:[],indexedDbRemove,destructive:true};
    }
    if(!['local','indexedDb'].includes(choice))throw new Error('Unknown recovery choice.');
    const plan=copyOperations(state,choice,registry),hold=state?.ambiguousTombstone?clearHoldOperation(localValues,safety):null;
    if(Array.isArray(hold))plan.localSet.push(hold);else if(typeof hold==='string')plan.localRemove.push(hold);
    return {choice,...plan,destructive:false};
  }

  function summaryHtml(summary,label,{preserved=false}={}){
    const hasData=['valid','legacy','malformed','unsupported'].some(key=>Number(summary.states?.[key])>0),status=preserved?(hasData?'Preserved — not opened':'No saved information'):(summary.status==='valid'?'Valid copy':summary.status==='damaged'?'Needs recovery':'No saved information'),copyStatus=preserved?(hasData?'valid':'empty'):summary.status;
    const roster=summary.currentRoster?`${summary.currentRoster.depot?summary.currentRoster.depot+' · ':''}${summary.currentRoster.roster || 'Roster'}${summary.currentRoster.line!==''?' line '+summary.currentRoster.line:''}`:'Not available';
    const range=summary.rosterDateRange?`${summary.rosterDateRange.from} to ${summary.rosterDateRange.to}`:'Not available';
    return `<article class="recovery-copy recovery-copy-${escapeHtml(copyStatus)}"><div class="recovery-copy-head"><h3>${escapeHtml(label)}</h3><span>${escapeHtml(status)}</span></div><dl><div><dt>Current roster</dt><dd>${escapeHtml(roster)}</dd></div><div><dt>Roster history</dt><dd>${summary.rosterHistoryCount} entr${summary.rosterHistoryCount===1?'y':'ies'} · ${escapeHtml(range)}</dd></div><div><dt>Employment history</dt><dd>${summary.employmentHistoryCount} entr${summary.employmentHistoryCount===1?'y':'ies'}</dd></div><div><dt>Diary changes</dt><dd>${summary.diaryOverrideCount}</dd></div>${summary.lastModified?`<div><dt>Recovery copy saved</dt><dd>${escapeHtml(friendlyDate(summary.lastModified))}</dd></div>`:''}</dl>${summary.missingInformation.length?`<p class="recovery-missing"><strong>Missing here:</strong> ${escapeHtml(summary.missingInformation.join(', '))}</p>`:''}</article>`;
  }
  function technicalHtml(state){
    const details={type:state?.issueType||'unavailable',reason:state?.reason||null,affectedKeys:state?.affectedKeys||[],validationStates:state?.validationStates||{},clearedAt:state?.clearedAt||null,storageCompatibility:state?.storageCompatibility||null};
    return `<details class="recovery-technical"><summary>Technical details</summary><p>Raw saved values are intentionally hidden here. The recovery export contains eligible raw evidence with device secrets redacted.</p><pre>${escapeHtml(JSON.stringify(details,null,2))}</pre></details>`;
  }
  function actionsHtml(state){
    const view=presentation(state),localOk=sourceAvailable(state,'local'),idbOk=sourceAvailable(state,'indexedDb');
    if(view.kind==='update-required')return '<div class="recovery-actions"><button type="button" class="primary" data-recovery-export>Export preserved recovery data</button></div>';
    if(view.kind==='unsupported')return '<div class="recovery-actions"><button type="button" class="primary" data-recovery-export>Export preserved data</button></div>';
    if(view.kind==='unrecoverable')return '<div class="recovery-actions"><button type="button" class="primary" data-recovery-export>Export preserved raw data</button><label class="recovery-confirm"><input type="checkbox" data-recovery-clear-confirm> I understand this will clear the saved personal data in this browser.</label><button type="button" class="danger" data-recovery-choice="clear" disabled>Clear and start again</button></div>';
    const buttons=[];
    if(view.kind==='repair-mirror')buttons.push('<button type="button" class="primary" data-recovery-choice="local">Keep current copy and repair mirror</button>');
    else if(view.kind==='recover-local')buttons.push('<button type="button" class="primary" data-recovery-choice="indexedDb">Recover using the valid saved copy</button>');
    else if(view.kind==='tombstone'){
      if(localOk)buttons.push('<button type="button" class="primary" data-recovery-choice="local">Keep this device’s retained data</button>');
      if(idbOk)buttons.push('<button type="button" class="primary" data-recovery-choice="indexedDb">Restore the recovered saved copy</button>');
      buttons.push('<label class="recovery-confirm"><input type="checkbox" data-recovery-clear-confirm> I understand this keeps the cleared state and discards the retained copies.</label><button type="button" class="danger" data-recovery-choice="clear" disabled>Keep data cleared</button>');
    }else{
      if(localOk)buttons.push('<button type="button" class="primary" data-recovery-choice="local">Use this device’s copy</button>');
      if(idbOk)buttons.push('<button type="button" class="primary" data-recovery-choice="indexedDb">Use the recovered backup copy</button>');
    }
    buttons.push('<button type="button" class="secondary" data-recovery-export>Export both before deciding</button>','<button type="button" class="secondary" data-recovery-cancel>Leave unchanged</button>');
    return `<div class="recovery-actions">${buttons.join('')}</div>`;
  }
  function render({container,state,registry}){
    const view=presentation(state),summaries=summarizeRecovery(state,registry);
    container.dataset.recoveryState=state?.issueType||'unavailable';
    container.setAttribute('role','main');container.removeAttribute('aria-live');
    const updateRequired=view.kind==='update-required',kicker=updateRequired?'UPDATE REQUIRED':'SAFE DATA RECOVERY',preserveNote=updateRequired?'RosterBot has not written defaults, changed a compatibility projection, mirrored data, or contacted Cloud/calendar publishing. You may export a redacted recovery evidence file without changing saved state.':'A redacted recovery evidence file is downloaded automatically before RosterBot replaces or clears a copy.';
    container.innerHTML=`<div class="recovery-screen"><header><span class="recovery-kicker">${kicker}</span><h1>${escapeHtml(view.title)}</h1><p class="recovery-lead">${escapeHtml(view.intro)}</p><p>${escapeHtml(view.detail)}</p></header><section class="recovery-copies" aria-label="Saved copy comparison">${summaryHtml(summaries.local,'This device',{preserved:updateRequired})}${summaryHtml(summaries.indexedDb,'Recovered saved copy',{preserved:updateRequired})}</section><p class="recovery-preserve-note">${escapeHtml(preserveNote)}</p>${actionsHtml(state)}<p class="recovery-status" data-recovery-status role="status" aria-live="polite"></p>${technicalHtml(state)}</div>`;
    return {view,summaries};
  }
  return Object.freeze({BUILD_VERSION,buildRecoveryExport,summarizeRecovery,presentation,sourceAvailable,createRecoveryPlan,render});
});
try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.complete('03-recovery-ui','RosterBotRecoveryUI',document.currentScript?.src||'js/03-recovery-ui.js')}catch(_){}
