try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.start('02-persistence-safety','RosterBotPersistenceSafety',document.currentScript?.src||'js/02-persistence-safety.js')}catch(_){}
(function(root,factory){
  'use strict';
  const canonical=root?.RosterBotCanonicalPersistence||(typeof module!=='undefined'&&module.exports?require('./02-canonical-state.js'):null);
  if(!canonical){const message='RosterBot startup dependency missing:\n02-persistence-safety expected canonical persistence';if(root&&root.RosterBotBootDiagnostics)root.RosterBotBootDiagnostics.dependency('02-persistence-safety','canonical persistence',canonical);throw new Error(message)}
  const api=factory(canonical);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotPersistenceSafety=api;
})(typeof window!=='undefined'?window:globalThis,function(canonicalState){
  'use strict';
  const CLEAR_KEY='rosterbot-cleared-v1';
  const AUTO_HOLD_KEY='rosterbot-cloud-auto-hold-v1';
  const CLEAR_REASON='explicit-local-clear';
  const RECOVERABLE_STATES=new Set(['valid','legacy']);
  const BACKUP_APP='RosterBotPayBot';
  const RECOVERY_FORMAT='rosterbot-recovery-evidence-v1';
  let replacementDepth=0;

  function objectValue(raw){try{const value=JSON.parse(raw||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch(_){return {}}}
  function isExplicitlyCleared(storage){try{return !!storage?.getItem(CLEAR_KEY)}catch(_){return false}}
  function autoHoldFor(storage,userId=''){
    try{const all=objectValue(storage?.getItem(AUTO_HOLD_KEY)),uid=String(userId||'');return (uid&&all[uid])||all.__device||null}catch(_){return null}
  }
  function markExplicitClear(storage,at=new Date().toISOString()){
    const stamp=String(at),all=objectValue(storage.getItem(AUTO_HOLD_KEY));
    storage.setItem(CLEAR_KEY,stamp);
    all.__device={reason:CLEAR_REASON,at:stamp};
    storage.setItem(AUTO_HOLD_KEY,JSON.stringify(all));
    return {clearedAt:stamp,hold:all.__device};
  }
  function beginReplacement(){replacementDepth++;return replacementDepth}
  function endReplacement(){replacementDepth=Math.max(0,replacementDepth-1);return replacementDepth}
  function isReplacementInProgress(){return replacementDepth>0}
  function shouldMirror(storage,recoveryState=null){return !isReplacementInProgress()&&!isExplicitlyCleared(storage)&&recoveryState?.mirrorAllowed!==false}

  function canonical(value){
    if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
    if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }
  function validation(registry,key,raw,source,present=raw!=null){
    if(!present)return registry.validate(key,null);
    if(source==='indexeddb'&&typeof raw!=='string')return {known:true,key,state:'unsupported',valid:false,missing:false,raw,value:raw,reason:'IndexedDB value is not a string'};
    return registry.validate(key,raw);
  }
  function recoverable(checked){return RECOVERABLE_STATES.has(checked?.state)}
  function semanticallyEqual(a,b){return recoverable(a)&&recoverable(b)&&canonical(a.value)===canonical(b.value)}
  function isObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
  function countObject(value){return isObject(value)?Object.keys(value).length:0}
  function stageReplacementPayload({payload,registry,surface='backup'}={}){
    if(!registry||typeof registry.validate!=='function')throw new TypeError('A persistence registry is required');
    const errors=[],warnings=[],wrapperUnknown={},unknownStorage={},validations={},storage={},surfaceKeys=registry.surfaceKeys(surface),allowed=new Set(surfaceKeys);
    if(!isObject(payload))return {ok:false,kind:'malformed-wrapper',errors:['The backup wrapper must be a JSON object.'],warnings,storage,unknownStorage,wrapperUnknown,validations,surface,surfaceKeys,schemaVersion:null};
    if(payload.format===RECOVERY_FORMAT)return {ok:false,kind:'recovery-artifact',errors:['This is a RosterBot recovery/diagnostic artifact, not a normal .rosterbot backup. It has not been restored.'],warnings,storage,unknownStorage,wrapperUnknown,validations,surface,surfaceKeys,schemaVersion:null,recoveryArtifact:true};
    for(const field of ['app','schemaVersion','storage'])if(!Object.prototype.hasOwnProperty.call(payload,field))errors.push(`Missing required wrapper field: ${field}.`);
    if(Object.prototype.hasOwnProperty.call(payload,'app')&&payload.app!==BACKUP_APP)errors.push('The app identifier is not RosterBotPayBot.');
    const schema=Number(payload.schemaVersion);
    if(Object.prototype.hasOwnProperty.call(payload,'schemaVersion')&&schema!==registry.schemaVersion)errors.push(`Schema ${String(payload.schemaVersion)} is unsupported; this client accepts schema ${registry.schemaVersion}.`);
    if(Object.prototype.hasOwnProperty.call(payload,'storage')&&!isObject(payload.storage))errors.push('The storage field must be an object, not an array or scalar value.');
    for(const [key,value] of Object.entries(payload))if(!['app','version','schemaVersion','exportedAt','privacy','storage'].includes(key))wrapperUnknown[key]=value;
    if(isObject(payload.storage))for(const [key,value] of Object.entries(payload.storage)){
      if(!allowed.has(key)){unknownStorage[key]=value;continue}
      if(typeof value!=='string'){
        validations[key]={known:true,key,state:'unsupported',valid:false,reason:'persisted backup values must be raw strings',raw:value};
        errors.push(`${key}: persisted value is not a raw string.`);continue;
      }
      const checked=registry.validate(key,value);validations[key]=checked;
      if(!recoverable(checked)){errors.push(`${key}: ${checked.state}${checked.reason?` (${checked.reason})`:''}.`);continue}
      storage[key]=value;
      if(checked.state==='legacy')warnings.push(`${key}: ${checked.reason||'older compatible value'}.`);
    }
    if(Object.prototype.hasOwnProperty.call(storage,'rosterbot-db-schema-v1')&&storage['rosterbot-db-schema-v1']!==String(registry.schemaVersion))errors.push('The persisted schema marker does not match schema 4.');
    const presentKeys=Object.keys(storage),timeline=validations['rosterbot-timeline-v1']?.value,employment=validations['rosterbot-employment-profile-v1']?.value,day=validations['rosterbot-day-overrides-v1']?.value;
    const substantive=key=>{const item=registry.get(key),value=validations[key]?.value;if(item?.category!=='personal')return false;if(Array.isArray(value))return value.length>0;if(isObject(value)){if(['rosterbot-manual-schedule-v1','rosterbot-session-settings-v1','rosterbot-calendar-subscription-settings-v1','paybot-v06-state','paybot-v05-state','paybot-v04-state','paybot-v03-state','paybot-v02-state'].includes(key))return true;return Object.keys(value).length>0}return value!=null&&String(value)!==''};
    const diaryKeys=['rosterbot-diary-annual-leave-v1','rosterbot-week-leave-v1','rosterbot-week-overrides-v1','rosterbot-day-overrides-v1','rosterbot-week-locks-v1','rosterbot-pay-checks-v1','rosterbot-fortnight-allowances-v1','rosterbot-fortnight-notes-v1'];
    const paybotPresent=['paybot-v06-state','paybot-v05-state','paybot-v04-state','paybot-v03-state','paybot-v02-state'].some(key=>Object.prototype.hasOwnProperty.call(storage,key));
    const summary={
      app:payload.app??null,version:payload.version??null,schemaVersion:Number.isFinite(schema)?schema:null,
      rosterHistoryFound:Array.isArray(timeline)&&timeline.length>0,rosterHistoryCount:Array.isArray(timeline)?timeline.length:0,
      employmentHistoryFound:Array.isArray(employment)&&employment.length>0,employmentHistoryCount:Array.isArray(employment)?employment.length:0,
      diaryChangesFound:diaryKeys.some(substantive),
      diaryChangeCount:countObject(day),manualSchedulePresent:Object.prototype.hasOwnProperty.call(storage,'rosterbot-manual-schedule-v1'),paybotStatePresent:paybotPresent,
      calendarSettingsPresent:Object.prototype.hasOwnProperty.call(storage,'rosterbot-calendar-subscription-settings-v1'),
      recognisedCount:presentKeys.length,totalRecognisedKeys:surfaceKeys.length,malformedOrUnsupported:errors.filter(message=>!message.startsWith('Missing required wrapper')&&!message.startsWith('The app identifier')&&!message.startsWith('Schema ')&&!message.startsWith('The storage field')),
      unknownKeys:Object.keys(unknownStorage),unknownWrapperFields:Object.keys(wrapperUnknown),empty:!presentKeys.some(substantive),partial:presentKeys.length<surfaceKeys.length
    };
    return {ok:errors.length===0,kind:errors.length?'invalid':'candidate',errors,warnings,payload,storage,unknownStorage,wrapperUnknown,validations,surface,surfaceKeys,schemaVersion:schema,summary,fullReplacement:true};
  }
  function replacementPlan(candidate,{extraRemovals=[]}={}){
    if(!candidate?.ok)throw new Error('Only a fully validated staged candidate can be applied.');
    const keys=candidate.surfaceKeys||null,surfaceKeys=keys||Object.keys(candidate.validations||{}).concat(Object.keys(candidate.storage||{}));
    const uniqueSurface=[...new Set(surfaceKeys)],localSet=Object.entries(candidate.storage||{}),present=new Set(localSet.map(([key])=>key));
    return {localSet,localRemove:[...new Set([...uniqueSurface.filter(key=>!present.has(key)),...extraRemovals])].filter(key=>!present.has(key))};
  }
  function recoveryDecision({registry,key,localRaw=null,indexedDbRaw=null,indexedDbUpdatedAt=null,indexedDbPresent=indexedDbRaw!=null}){
    if(!registry||typeof registry.validate!=='function')throw new TypeError('A persistence registry is required');
    const local=validation(registry,key,localRaw,'local'),indexedDb=validation(registry,key,indexedDbRaw,'indexeddb',indexedDbPresent);
    let issueType,startupAllowed=true,automaticRecoveryAllowed=false,userChoiceRequired=false;
    if(local.state==='unsupported'||indexedDb.state==='unsupported'){
      issueType='unsupported';startupAllowed=false;userChoiceRequired=true;
    }else if(local.state==='missing'&&indexedDb.state==='missing')issueType='empty';
    else if(recoverable(local)&&indexedDb.state==='missing')issueType='use-local';
    else if(local.state==='missing'&&recoverable(indexedDb)){issueType='restore-indexeddb';automaticRecoveryAllowed=true}
    else if(recoverable(local)&&recoverable(indexedDb)){
      if(semanticallyEqual(local,indexedDb))issueType='identical';
      else{issueType='conflict';startupAllowed=false;userChoiceRequired=true}
    }else if(local.state==='malformed'&&recoverable(indexedDb)){
      issueType='malformed-local-recoverable';startupAllowed=false;userChoiceRequired=true;
    }else if(recoverable(local)&&indexedDb.state==='malformed'){
      issueType='malformed-indexeddb-recoverable';userChoiceRequired=true;
    }else{
      issueType='unrecoverable';startupAllowed=false;userChoiceRequired=true;
    }
    return {
      issueType,key,affectedKeys:[key],localValidationState:local.state,indexedDbValidationState:indexedDb.state,
      automaticRecoveryAllowed,userChoiceRequired,startupAllowed,
      local,indexedDb:{...indexedDb,updatedAt:indexedDbUpdatedAt},
      preservedRawCopies:{local:localRaw,indexedDb:indexedDbRaw}
    };
  }
  function tombstoneDecision({registry,localValues,rows,personalKeys}){
    const raw=Object.prototype.hasOwnProperty.call(localValues,CLEAR_KEY)?localValues[CLEAR_KEY]:null;
    if(raw==null)return null;
    const checked=registry.validate(CLEAR_KEY,raw),clearTime=Date.parse(String(raw));
    if(!recoverable(checked)||!Number.isFinite(clearTime))return {
      issueType:'unsupported',affectedKeys:[CLEAR_KEY],localValidationState:checked.state,indexedDbValidationState:'missing',
      automaticRecoveryAllowed:false,userChoiceRequired:true,startupAllowed:false,mirrorAllowed:false,
      preservedRawCopies:{[CLEAR_KEY]:{local:raw,indexedDb:null}},reason:'clear tombstone is not a supported timestamp'
    };
    const rowMap=new Map((rows||[]).filter(row=>row&&typeof row.key==='string').map(row=>[row.key,row]));
    const presentLocalKeys=(personalKeys||[]).filter(key=>Object.prototype.hasOwnProperty.call(localValues,key)),retainedRows=(personalKeys||[]).map(key=>rowMap.get(key)).filter(Boolean);
    const retainedKeys=[...new Set([...presentLocalKeys,...retainedRows.map(row=>row.key)])],localChecks=Object.fromEntries(retainedKeys.map(key=>[key,validation(registry,key,Object.prototype.hasOwnProperty.call(localValues,key)?localValues[key]:null,'local')]));
    const indexedDbChecks=Object.fromEntries(retainedKeys.map(key=>[key,validation(registry,key,rowMap.has(key)?rowMap.get(key).value:null,'indexeddb',rowMap.has(key))]));
    const localRecoverable=(personalKeys||[]).filter(key=>registry.get(key)?.category==='personal').some(key=>recoverable(localChecks[key]));
    const localProblems=presentLocalKeys.filter(key=>['malformed','unsupported'].includes(localChecks[key]?.state)),recoverableRows=retainedRows.filter(row=>recoverable(indexedDbChecks[row.key]));
    const newerThanRows=recoverableRows.every(row=>Number.isFinite(Date.parse(String(row.updatedAt||'')))&&Date.parse(String(row.updatedAt))<=clearTime);
    const affectedKeys=retainedKeys,preservedRows=Object.fromEntries(retainedKeys.map(key=>[key,{local:Object.prototype.hasOwnProperty.call(localValues,key)?localValues[key]:null,indexedDb:rowMap.has(key)?rowMap.get(key).value:null}]));
    const localStates=Object.fromEntries(retainedKeys.map(key=>[key,localChecks[key].state])),indexedDbStates=Object.fromEntries(retainedKeys.map(key=>[key,indexedDbChecks[key].state]));
    const indexedStateSet=new Set(Object.values(indexedDbStates)),indexedDbValidationState=indexedStateSet.size===0?'missing':indexedStateSet.size===1?[...indexedStateSet][0]:'mixed';
    const decisions=retainedKeys.filter(key=>key!==CLEAR_KEY).map(key=>{const row=rowMap.get(key);return recoveryDecision({registry,key,localRaw:Object.prototype.hasOwnProperty.call(localValues,key)?localValues[key]:null,indexedDbRaw:row?row.value:null,indexedDbUpdatedAt:row?.updatedAt??null,indexedDbPresent:!!row})});
    if(localProblems.length)return {
      issueType:localProblems.some(key=>localChecks[key].state==='unsupported')?'unsupported':'unrecoverable',affectedKeys:[CLEAR_KEY,...affectedKeys],localValidationState:'mixed',indexedDbValidationState,
      automaticRecoveryAllowed:false,userChoiceRequired:true,startupAllowed:false,mirrorAllowed:false,clearedAt:String(raw),
      preservedRawCopies:{[CLEAR_KEY]:{local:raw,indexedDb:null},...preservedRows},validationStates:{local:{[CLEAR_KEY]:checked.state,...localStates},indexedDb:indexedDbStates},
      decisions,reason:'clear tombstone coexists with malformed or unsupported local data'
    };
    if(!localRecoverable&&newerThanRows)return {
      issueType:'cleared',affectedKeys,localValidationState:'missing',indexedDbValidationState,
      automaticRecoveryAllowed:false,userChoiceRequired:false,startupAllowed:true,mirrorAllowed:false,clearedAt:String(raw),
      preservedRawCopies:preservedRows,validationStates:{local:localStates,indexedDb:indexedDbStates}
    };
    return {
      issueType:'conflict',affectedKeys:[CLEAR_KEY,...affectedKeys],localValidationState:localRecoverable?'valid':'missing',indexedDbValidationState:recoverableRows.length?'valid':'missing',
      automaticRecoveryAllowed:false,userChoiceRequired:true,startupAllowed:false,mirrorAllowed:false,clearedAt:String(raw),
      preservedRawCopies:{[CLEAR_KEY]:{local:raw,indexedDb:null},...preservedRows},validationStates:{local:{[CLEAR_KEY]:checked.state,...localStates},indexedDb:indexedDbStates},
      decisions,ambiguousTombstone:true,reason:'clear tombstone is not demonstrably newer than every recoverable copy'
    };
  }
  function aggregateType(decisions){
    const types=new Set(decisions.map(item=>item.issueType));
    for(const type of ['unrecoverable','unsupported','conflict','malformed-local-recoverable','malformed-indexeddb-recoverable','restore-indexeddb','use-local','identical'])if(types.has(type))return type;
    return 'empty';
  }
  function decideRecovery({registry,localValues={},rows=[],personalKeys=[]}){
    const keys=[...new Set(personalKeys)],local=localValues&&typeof localValues==='object'?localValues:{},list=Array.isArray(rows)?rows:[];
    const tombstone=tombstoneDecision({registry,localValues:local,rows:list,personalKeys:keys});
    if(tombstone)return {decisions:[],validationStates:{local:{},indexedDb:{}},replacementEntries:[],...tombstone};
    const rowMap=new Map(list.filter(row=>row&&typeof row.key==='string').map(row=>[row.key,row]));
    const decisions=keys.map(key=>{const row=rowMap.get(key);return recoveryDecision({registry,key,localRaw:Object.prototype.hasOwnProperty.call(local,key)?local[key]:null,indexedDbRaw:row?row.value:null,indexedDbUpdatedAt:row?.updatedAt??null,indexedDbPresent:!!row})});
    const blocking=decisions.filter(item=>!item.startupAllowed),issues=decisions.filter(item=>!['empty','use-local','identical'].includes(item.issueType));
    const affectedKeys=[...new Set(issues.flatMap(item=>item.affectedKeys))];
    return {
      issueType:aggregateType(decisions),affectedKeys,
      localValidationState:affectedKeys.length===1?decisions.find(item=>item.key===affectedKeys[0])?.localValidationState:'mixed',
      indexedDbValidationState:affectedKeys.length===1?decisions.find(item=>item.key===affectedKeys[0])?.indexedDbValidationState:'mixed',
      automaticRecoveryAllowed:blocking.length===0&&decisions.some(item=>item.automaticRecoveryAllowed),
      userChoiceRequired:decisions.some(item=>item.userChoiceRequired),startupAllowed:blocking.length===0,
      mirrorAllowed:decisions.every(item=>!['malformed-indexeddb-recoverable','unsupported','conflict','unrecoverable','malformed-local-recoverable'].includes(item.issueType)),
      decisions,
      validationStates:{local:Object.fromEntries(decisions.map(item=>[item.key,item.localValidationState])),indexedDb:Object.fromEntries(decisions.map(item=>[item.key,item.indexedDbValidationState]))},
      preservedRawCopies:Object.fromEntries(issues.map(item=>[item.key,item.preservedRawCopies])),
      replacementEntries:decisions.filter(item=>item.issueType==='restore-indexeddb').map(item=>[item.key,item.preservedRawCopies.indexedDb])
    };
  }

  function rawRow(rows,key){return (rows||[]).find(row=>row?.key===key)||null}
  function candidatePlan(candidate,registry){
    const projection=canonicalState.toSchema4Projection(candidate,{registry});
    if(!projection.ok)throw new Error(projection.reason||'Canonical candidate cannot be projected to schema 4');
    const set=Object.entries(projection.storage),remove=[...projection.removals];
    return {localSet:[...set],localRemove:[...remove],indexedDbSet:[...set],indexedDbRemove:[...remove]};
  }
  function mergePlan(plan,{localSet=[],localRemove=[],indexedDbSet=[],indexedDbRemove=[]}={}){
    const merge=(left,right)=>[...new Map([...left,...right]).entries()];
    const localWrites=merge(plan.localSet||[],localSet),idbWrites=merge(plan.indexedDbSet||[],indexedDbSet),localWritten=new Set(localWrites.map(([key])=>key)),idbWritten=new Set(idbWrites.map(([key])=>key));
    return {localSet:localWrites,localRemove:[...new Set([...(plan.localRemove||[]),...localRemove])].filter(key=>!localWritten.has(key)),indexedDbSet:idbWrites,indexedDbRemove:[...new Set([...(plan.indexedDbRemove||[]),...indexedDbRemove])].filter(key=>!idbWritten.has(key))};
  }
  async function reconcileCanonicalState({registry,localValues={},rows=[],personalKeys=[],cryptoImpl=globalThis.crypto}={}){
    if(!canonicalState)return decideRecovery({registry,localValues,rows,personalKeys});
    const localCandidate=canonicalState.fromLocalStorage(localValues,{registry}),indexedDbCandidate=canonicalState.fromIndexedDb(rows,{registry});
    const [localFingerprint,indexedDbFingerprint]=await Promise.all([canonicalState.fingerprint(localCandidate,{cryptoImpl}),canonicalState.fingerprint(indexedDbCandidate,{cryptoImpl})]);
    const localGeneration=canonicalState.parseGeneration(localValues[canonicalState.GENERATION_KEY],{registry}),idbGeneration=canonicalState.parseGeneration(rawRow(rows,canonicalState.GENERATION_KEY)?.value??null,{registry});
    const previousParsed=canonicalState.parsePrevious(localValues[canonicalState.PREVIOUS_KEY],{registry});
    const previous=previousParsed.ok?await canonicalState.verifyPrevious(previousParsed.value,{registry,cryptoImpl}):{ok:false,state:previousParsed.state,reason:previousParsed.reason};
    const canonicalInfo={localCandidate,indexedDbCandidate,localFingerprint,indexedDbFingerprint,generations:{local:localGeneration,indexedDb:idbGeneration,previous}};
    const legacy=()=>({...decideRecovery({registry,localValues,rows,personalKeys}),canonical:canonicalInfo});
    const verifiedFor=(parsed,hash)=>parsed.ok&&parsed.value.verification==='verified'&&parsed.value.fingerprint===hash;
    const pending=[localGeneration,idbGeneration].filter(parsed=>parsed.ok&&parsed.value.verification==='pending').map(parsed=>parsed.value);
    const descendsFromPrevious=parsed=>parsed.ok&&previous.ok&&parsed.value.predecessorFingerprint===previous.fingerprint&&parsed.value.generation>previous.generation.generation;
    const interrupted=pending.find(meta=>previous.ok&&meta.predecessorFingerprint===previous.fingerprint&&meta.generation>previous.generation.generation);
    const damagedNewer=(descendsFromPrevious(localGeneration)&&(!localFingerprint.ok||localGeneration.value.fingerprint!==localFingerprint.value))||(descendsFromPrevious(idbGeneration)&&(!indexedDbFingerprint.ok||idbGeneration.value.fingerprint!==indexedDbFingerprint.value));
    if(previous.ok&&(interrupted||damagedNewer)){
      const previousRaw=JSON.stringify(previous.generation),snapshotRaw=previousParsed.raw,plan=mergePlan(candidatePlan(previous.candidate,registry),{localSet:[[canonicalState.GENERATION_KEY,previousRaw],[canonicalState.PREVIOUS_KEY,snapshotRaw]],indexedDbSet:[[canonicalState.GENERATION_KEY,previousRaw]]});
      return {...legacy(),issueType:'restore-previous-verified-generation',affectedKeys:canonicalState.stateKeys(registry),automaticRecoveryAllowed:true,userChoiceRequired:false,startupAllowed:true,mirrorAllowed:false,replacementEntries:[],reconciliationPlan:plan,reason:'a newer generation is incomplete or damaged; restoring the previous verified generation',canonical:canonicalInfo};
    }
    if(!localFingerprint.ok||!indexedDbFingerprint.ok)return legacy();
    const localHash=localFingerprint.value,idbHash=indexedDbFingerprint.value;
    const verified=[localGeneration,idbGeneration].filter((parsed,index)=>verifiedFor(parsed,index===0?localHash:idbHash)).map(parsed=>parsed.value);
    const newestVerified=verified.sort((a,b)=>b.generation-a.generation)[0]||null;
    const base=legacy();
    if(Object.prototype.hasOwnProperty.call(localValues,CLEAR_KEY)){
      const clearMeta=verifiedFor(localGeneration,localHash)?localGeneration.value:null;
      const previousOlder=previous.ok&&clearMeta&&previous.generation.generation<clearMeta.generation&&clearMeta.predecessorFingerprint===previous.fingerprint;
      const localEmpty=Object.values(localCandidate.entries).every(entry=>entry.presence==='missing');
      if(clearMeta?.kind==='clear'&&localEmpty&&(idbHash===clearMeta.predecessorFingerprint||idbHash===clearMeta.fingerprint||previousOlder)){
        const emptyPlan=candidatePlan(localCandidate,registry),raw=JSON.stringify(clearMeta),plan=mergePlan(emptyPlan,{localSet:[[canonicalState.GENERATION_KEY,raw]],indexedDbSet:[[canonicalState.GENERATION_KEY,raw]]});
        return {...base,issueType:'cleared',automaticRecoveryAllowed:idbHash!==localHash,userChoiceRequired:false,startupAllowed:true,mirrorAllowed:false,replacementEntries:[],reconciliationPlan:idbHash!==localHash?plan:null,reason:'verified clear generation is authoritative',canonical:canonicalInfo};
      }
      return base;
    }
    if(localHash===idbHash){
      return {...base,issueType:Object.values(localCandidate.entries).every(entry=>entry.presence==='missing')?'empty':'identical',automaticRecoveryAllowed:false,userChoiceRequired:false,startupAllowed:true,mirrorAllowed:true,replacementEntries:[],canonical:canonicalInfo};
    }
    const localTrusted=verifiedFor(localGeneration,localHash),idbTrusted=verifiedFor(idbGeneration,idbHash);
    if(localTrusted&&localGeneration.value.predecessorFingerprint===idbHash&&(!idbTrusted||localGeneration.value.generation>idbGeneration.value.generation)){
      const plan=mergePlan(candidatePlan(localCandidate,registry),{indexedDbSet:[[canonicalState.GENERATION_KEY,JSON.stringify(localGeneration.value)]],localSet:[[canonicalState.GENERATION_KEY,JSON.stringify(localGeneration.value)]]});
      return {...base,issueType:'repair-indexeddb-from-newer-generation',affectedKeys:canonicalState.stateKeys(registry),automaticRecoveryAllowed:true,userChoiceRequired:false,startupAllowed:true,mirrorAllowed:false,replacementEntries:[],reconciliationPlan:plan,reason:'verified local generation descends from the saved mirror fingerprint',canonical:canonicalInfo};
    }
    if(idbTrusted&&idbGeneration.value.predecessorFingerprint===localHash&&(!localTrusted||idbGeneration.value.generation>localGeneration.value.generation)){
      const plan=mergePlan(candidatePlan(indexedDbCandidate,registry),{localSet:[[canonicalState.GENERATION_KEY,JSON.stringify(idbGeneration.value)]],indexedDbSet:[[canonicalState.GENERATION_KEY,JSON.stringify(idbGeneration.value)]]});
      return {...base,issueType:'repair-local-from-newer-generation',affectedKeys:canonicalState.stateKeys(registry),automaticRecoveryAllowed:true,userChoiceRequired:false,startupAllowed:true,mirrorAllowed:false,replacementEntries:[],reconciliationPlan:plan,reason:'verified saved-mirror generation descends from the local fingerprint',canonical:canonicalInfo};
    }
    const incomplete=(localGeneration.ok||idbGeneration.ok)&&previous.ok&&!newestVerified?{generation:previous.generation.generation+1}:null;
    const mismatch=(localGeneration.ok&&localGeneration.value.fingerprint!==localHash)||(idbGeneration.ok&&idbGeneration.value.fingerprint!==idbHash);
    if(previous.ok&&(incomplete||mismatch)){
      const previousRaw=JSON.stringify(previous.generation),snapshotRaw=previousParsed.raw,plan=mergePlan(candidatePlan(previous.candidate,registry),{localSet:[[canonicalState.GENERATION_KEY,previousRaw],[canonicalState.PREVIOUS_KEY,snapshotRaw]],indexedDbSet:[[canonicalState.GENERATION_KEY,previousRaw]]});
      return {...base,issueType:'restore-previous-verified-generation',affectedKeys:canonicalState.stateKeys(registry),automaticRecoveryAllowed:true,userChoiceRequired:false,startupAllowed:true,mirrorAllowed:false,replacementEntries:[],reconciliationPlan:plan,reason:'a newer generation is incomplete or fails fingerprint verification; restoring the previous verified generation',canonical:canonicalInfo};
    }
    if(!localGeneration.ok&&!idbGeneration.ok&&!previous.ok){
      return base.issueType==='conflict'?{...base,reason:'valid canonical states diverge and no verified ancestry proves authority; timestamps are not used to choose',canonical:canonicalInfo}:base;
    }
    return {...base,issueType:'conflict',affectedKeys:canonicalState.stateKeys(registry),automaticRecoveryAllowed:false,userChoiceRequired:true,startupAllowed:false,mirrorAllowed:false,replacementEntries:[],reason:'valid canonical states diverge and no verified ancestry proves authority; timestamps are not used to choose',canonical:canonicalInfo};
  }

  async function replacePersistentState({storage,replacements,removals=[],registry}){
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof storage.removeItem!=='function')throw new TypeError('A Storage-compatible target is required');
    if(!registry||typeof registry.validate!=='function')throw new TypeError('A persistence registry is required');
    const entries=replacements instanceof Map?[...replacements.entries()]:Array.isArray(replacements)?replacements:Object.entries(replacements||{}),writeKeys=new Set(entries.map(([key])=>key)),deleteKeys=[...new Set(removals||[])].filter(key=>!writeKeys.has(key)),affected=[...new Set([...entries.map(([key])=>key),...deleteKeys])],before={};
    for(const key of affected)before[key]=storage.getItem(key);
    for(const [key,raw] of entries){
      if(typeof raw!=='string')return {ok:false,stage:'validation',rolledBack:false,rollbackVerified:true,before,error:new Error(`Replacement for ${key} is not a raw string`)};
      const checked=registry.validate(key,raw);
      if(!recoverable(checked))return {ok:false,stage:'validation',rolledBack:false,rollbackVerified:true,before,error:new Error(`Replacement for ${key} is ${checked.state}`)};
    }
    try{for(const key of affected)if(storage.getItem(key)!==before[key])return {ok:false,stage:'capture',rolledBack:false,rollbackVerified:false,before,error:new Error(`Snapshot changed while capturing ${key}`)}}catch(error){return {ok:false,stage:'capture',rolledBack:false,rollbackVerified:false,before,error}}
    const rollback=()=>{
      let rollbackError=null;
      for(const key of affected)try{if(before[key]==null)storage.removeItem(key);else storage.setItem(key,before[key])}catch(error){rollbackError=rollbackError||error}
      let rollbackVerified=!rollbackError;
      for(const key of affected)try{if(storage.getItem(key)!==before[key])rollbackVerified=false}catch(_){rollbackVerified=false}
      return {rolledBack:true,rollbackVerified,rollbackError};
    };
    beginReplacement();
    try{
      for(const [key,raw] of entries)storage.setItem(key,raw);
      for(const key of deleteKeys)storage.removeItem(key);
    }catch(error){const result={ok:false,stage:'write',before,error,...rollback()};endReplacement();return result}
    try{
      for(const [key,raw] of entries){
        const reread=storage.getItem(key),checked=registry.validate(key,reread);
        if(reread!==raw||!recoverable(checked))throw new Error(`Verification failed for ${key}`);
      }
      for(const key of deleteKeys)if(storage.getItem(key)!==null)throw new Error(`Verification failed for removed ${key}`);
      return {ok:true,stage:'verified',before,replacedKeys:entries.map(([key])=>key),removedKeys:deleteKeys,rolledBack:false,rollbackVerified:true};
    }catch(error){return {ok:false,stage:'verification',before,error,...rollback()}}
    finally{endReplacement()}
  }

  async function replacePersistenceCopies({storage,indexedDbTarget,localSet=[],localRemove=[],indexedDbSet=[],indexedDbRemove=[],registry}){
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof storage.removeItem!=='function')throw new TypeError('A Storage-compatible target is required');
    if(!indexedDbTarget||typeof indexedDbTarget.read!=='function'||typeof indexedDbTarget.apply!=='function')throw new TypeError('An IndexedDB recovery target is required');
    if(!registry||typeof registry.validate!=='function')throw new TypeError('A persistence registry is required');
    const localWrites=localSet instanceof Map?[...localSet.entries()]:Array.isArray(localSet)?localSet:Object.entries(localSet||{}),idbWrites=indexedDbSet instanceof Map?[...indexedDbSet.entries()]:Array.isArray(indexedDbSet)?indexedDbSet:Object.entries(indexedDbSet||{});
    const localDeletes=[...new Set(localRemove||[])].filter(key=>!localWrites.some(([writeKey])=>writeKey===key)),idbDeletes=[...new Set(indexedDbRemove||[])].filter(key=>!idbWrites.some(([writeKey])=>writeKey===key));
    const localKeys=[...new Set([...localWrites.map(([key])=>key),...localDeletes])],idbKeys=[...new Set([...idbWrites.map(([key])=>key),...idbDeletes])];
    for(const [key,raw] of [...localWrites,...idbWrites]){
      if(typeof raw!=='string')return {ok:false,stage:'validation',rolledBack:false,rollbackVerified:true,error:new Error(`Replacement for ${key} is not a raw string`)};
      const checked=registry.validate(key,raw);
      if(!recoverable(checked))return {ok:false,stage:'validation',rolledBack:false,rollbackVerified:true,error:new Error(`Replacement for ${key} is ${checked.state}`)};
    }
    const beforeLocal=Object.fromEntries(localKeys.map(key=>[key,storage.getItem(key)]));
    try{for(const key of localKeys)if(storage.getItem(key)!==beforeLocal[key])return {ok:false,stage:'capture',rolledBack:false,rollbackVerified:false,beforeLocal,error:new Error(`Snapshot changed while capturing ${key}`)}}catch(error){return {ok:false,stage:'capture',rolledBack:false,rollbackVerified:false,beforeLocal,error}}
    let beforeIndexedDb;
    try{beforeIndexedDb=await indexedDbTarget.read(idbKeys)}catch(error){return {ok:false,stage:'capture',rolledBack:false,rollbackVerified:false,beforeLocal,error}}
    const beforeRows=beforeIndexedDb instanceof Map?beforeIndexedDb:new Map(Object.entries(beforeIndexedDb||{}));
    try{const verified=await indexedDbTarget.read(idbKeys);for(const key of idbKeys)if(canonical(verified.get(key)||null)!==canonical(beforeRows.get(key)||null))return {ok:false,stage:'capture',rolledBack:false,rollbackVerified:false,beforeLocal,beforeIndexedDb:beforeRows,error:new Error(`Saved mirror changed while capturing ${key}`)}}catch(error){return {ok:false,stage:'capture',rolledBack:false,rollbackVerified:false,beforeLocal,beforeIndexedDb:beforeRows,error}}
    const desiredRows=new Map(idbWrites.map(([key,value])=>[key,{key,value,updatedAt:new Date().toISOString()}]));
    const desiredLocal=new Map(localWrites);
    const rollback=async()=>{
      let rollbackError=null;
      for(const key of localKeys)try{if(beforeLocal[key]==null)storage.removeItem(key);else storage.setItem(key,beforeLocal[key])}catch(error){rollbackError=rollbackError||error}
      try{await indexedDbTarget.apply({put:[...beforeRows.values()].filter(Boolean),remove:idbKeys.filter(key=>!beforeRows.get(key))})}catch(error){rollbackError=rollbackError||error}
      let rollbackVerified=!rollbackError;
      for(const key of localKeys)try{if(storage.getItem(key)!==beforeLocal[key])rollbackVerified=false}catch(_){rollbackVerified=false}
      try{const rows=await indexedDbTarget.read(idbKeys);for(const key of idbKeys){const expected=beforeRows.get(key)||null,actual=rows.get(key)||null;if(canonical(expected)!==canonical(actual))rollbackVerified=false}}catch(_){rollbackVerified=false}
      return {rolledBack:true,rollbackVerified,rollbackError};
    };
    beginReplacement();
    try{
      for(const [key,raw] of localWrites)storage.setItem(key,raw);
      for(const key of localDeletes)storage.removeItem(key);
      await indexedDbTarget.apply({put:[...desiredRows.values()],remove:idbDeletes});
    }catch(error){const result={ok:false,stage:'write',beforeLocal,beforeIndexedDb:beforeRows,error,...await rollback()};endReplacement();return result}
    try{
      for(const key of localKeys){const expected=desiredLocal.has(key)?desiredLocal.get(key):null,actual=storage.getItem(key);if(actual!==expected)throw new Error(`Verification failed for local ${key}`);if(expected!=null&&!recoverable(registry.validate(key,actual)))throw new Error(`Validation failed for local ${key}`)}
      const rows=await indexedDbTarget.read(idbKeys);
      for(const key of idbKeys){const expected=desiredRows.get(key)?.value??null,actual=rows.get(key)?.value??null;if(actual!==expected)throw new Error(`Verification failed for saved mirror ${key}`);if(expected!=null&&!recoverable(registry.validate(key,actual)))throw new Error(`Validation failed for saved mirror ${key}`)}
      return {ok:true,stage:'verified',replacedLocalKeys:localWrites.map(([key])=>key),removedLocalKeys:localDeletes,replacedIndexedDbKeys:idbWrites.map(([key])=>key),removedIndexedDbKeys:idbDeletes,rolledBack:false,rollbackVerified:true};
    }catch(error){return {ok:false,stage:'verification',beforeLocal,beforeIndexedDb:beforeRows,error,...await rollback()}}
    finally{endReplacement()}
  }

  async function replaceCanonicalPersistenceCopies({storage,indexedDbTarget,localSet=[],localRemove=[],indexedDbSet=[],indexedDbRemove=[],registry,writer,now=new Date().toISOString(),interruptAfter=null}={}){
    if(!canonicalState)throw new Error('Canonical persistence support is unavailable');
    const stateKeys=canonicalState.stateKeys(registry),metadataKeys=[canonicalState.GENERATION_KEY,canonicalState.PREVIOUS_KEY];
    const localWrites=localSet instanceof Map?[...localSet.entries()]:Array.isArray(localSet)?localSet:Object.entries(localSet||{}),idbWrites=indexedDbSet instanceof Map?[...indexedDbSet.entries()]:Array.isArray(indexedDbSet)?indexedDbSet:Object.entries(indexedDbSet||{});
    const localDeletes=[...new Set(localRemove||[])],idbDeletes=[...new Set(indexedDbRemove||[])],allLocalKeys=[...new Set([...stateKeys,...metadataKeys,...localWrites.map(([key])=>key),...localDeletes])],allIdbKeys=[...new Set([...stateKeys,canonicalState.GENERATION_KEY,...idbWrites.map(([key])=>key),...idbDeletes])];
    const beforeLocal=Object.fromEntries(allLocalKeys.map(key=>[key,storage.getItem(key)])),beforeRows=await indexedDbTarget.read(allIdbKeys);
    const beforeIndexedDb=beforeRows instanceof Map?beforeRows:new Map(Object.entries(beforeRows||{}));
    const localObject=Object.fromEntries(stateKeys.map(key=>[key,beforeLocal[key]]).filter(([,raw])=>raw!=null)),idbRows=[...beforeIndexedDb.values()].filter(Boolean);
    const localBeforeCandidate=canonicalState.fromLocalStorage(localObject,{registry}),idbBeforeCandidate=canonicalState.fromIndexedDb(idbRows,{registry});
    const [localBeforeHash,idbBeforeHash]=await Promise.all([canonicalState.fingerprint(localBeforeCandidate),canonicalState.fingerprint(idbBeforeCandidate)]);
    const desiredLocal={...localObject};for(const [key,raw] of localWrites)desiredLocal[key]=raw;for(const key of localDeletes)delete desiredLocal[key];
    const desiredRowsMap=new Map(idbRows.map(row=>[row.key,{...row}]));for(const [key,value] of idbWrites)desiredRowsMap.set(key,{key,value});for(const key of idbDeletes)desiredRowsMap.delete(key);
    const desiredLocalCandidate=canonicalState.fromLocalStorage(desiredLocal,{registry}),desiredIdbCandidate=canonicalState.fromIndexedDb([...desiredRowsMap.values()],{registry});
    const [desiredLocalHash,desiredIdbHash]=await Promise.all([canonicalState.fingerprint(desiredLocalCandidate),canonicalState.fingerprint(desiredIdbCandidate)]);
    if(!desiredLocalHash.ok||!desiredIdbHash.ok||desiredLocalHash.value!==desiredIdbHash.value)return {ok:false,stage:'canonical-validation',rolledBack:false,rollbackVerified:true,error:new Error('Replacement projections do not produce one valid canonical state'),canonical:{local:desiredLocalHash,indexedDb:desiredIdbHash}};
    const localMeta=canonicalState.parseGeneration(beforeLocal[canonicalState.GENERATION_KEY],{registry}),idbMeta=canonicalState.parseGeneration(beforeIndexedDb.get(canonicalState.GENERATION_KEY)?.value??null,{registry});
    const parsedMetas=[localMeta,idbMeta].filter(item=>item.ok),highest=Math.max(0,...parsedMetas.map(item=>item.value.generation));
    let predecessor=null,previousSnapshot=null;
    const trustedLocal=localMeta.ok&&localMeta.value.verification==='verified'&&localBeforeHash.ok&&localMeta.value.fingerprint===localBeforeHash.value,trustedIdb=idbMeta.ok&&idbMeta.value.verification==='verified'&&idbBeforeHash.ok&&idbMeta.value.fingerprint===idbBeforeHash.value;
    if(trustedLocal){predecessor=localMeta.value;previousSnapshot=canonicalState.makePrevious({candidate:localBeforeCandidate,generation:predecessor,registry})}
    else if(trustedIdb){predecessor=idbMeta.value;previousSnapshot=canonicalState.makePrevious({candidate:idbBeforeCandidate,generation:predecessor,registry})}
    else if(localBeforeHash.ok&&idbBeforeHash.ok&&localBeforeHash.value===idbBeforeHash.value){
      predecessor=canonicalState.makeGeneration({generation:Math.max(1,highest+1),fingerprint:localBeforeHash.value,timestamp:now,writer:writer||canonicalState.WRITER_VERSION,verification:'verified',kind:'state'});
      previousSnapshot=canonicalState.makePrevious({candidate:localBeforeCandidate,generation:predecessor,registry});
    }
    const generationNumber=Math.max(highest,predecessor?.generation||0)+1,kind=Object.values(desiredLocalCandidate.entries).every(entry=>entry.presence==='missing')&&desiredLocal[CLEAR_KEY]!=null?'clear':'state';
    const pending=canonicalState.makeGeneration({generation:generationNumber,fingerprint:desiredLocalHash.value,predecessorFingerprint:predecessor?.fingerprint||null,timestamp:now,writer:writer||canonicalState.WRITER_VERSION,verification:'pending',kind}),verified={...pending,verification:'verified'};
    const interrupt=stage=>{if(interruptAfter!==stage)return false;const error=new Error(`Simulated interruption after ${stage}`);error.interrupted=true;throw error};
    const rollback=async()=>{
      let rollbackError=null;beginReplacement();
      try{for(const key of allLocalKeys){if(beforeLocal[key]==null)storage.removeItem(key);else storage.setItem(key,beforeLocal[key])}}catch(error){rollbackError=error}
      try{await indexedDbTarget.apply({put:[...beforeIndexedDb.values()].filter(Boolean),remove:allIdbKeys.filter(key=>!beforeIndexedDb.get(key))})}catch(error){rollbackError=rollbackError||error}
      finally{endReplacement()}
      let rollbackVerified=!rollbackError;
      for(const key of allLocalKeys)try{if(storage.getItem(key)!==beforeLocal[key])rollbackVerified=false}catch(_){rollbackVerified=false}
      try{const rows=await indexedDbTarget.read(allIdbKeys);for(const key of allIdbKeys)if(canonical(rows.get(key)||null)!==canonical(beforeIndexedDb.get(key)||null))rollbackVerified=false}catch(_){rollbackVerified=false}
      return {rolledBack:true,rollbackVerified,rollbackError};
    };
    beginReplacement();
    try{
      if(previousSnapshot){const snapshotRaw=JSON.stringify(previousSnapshot),saved=await replacePersistentState({storage,replacements:[[canonicalState.PREVIOUS_KEY,snapshotRaw]],registry});if(!saved.ok)throw Object.assign(saved.error||new Error('Previous generation snapshot failed'),{phaseResult:saved});interrupt('previous-snapshot')}
      const pendingRaw=JSON.stringify(pending),metadata=await replacePersistenceCopies({storage,indexedDbTarget,localSet:[[canonicalState.GENERATION_KEY,pendingRaw]],indexedDbSet:[[canonicalState.GENERATION_KEY,pendingRaw]],registry});if(!metadata.ok)throw Object.assign(metadata.error||new Error('Pending generation metadata failed'),{phaseResult:metadata});interrupt('metadata-pending');
      const localPhase=await replacePersistenceCopies({storage,indexedDbTarget,localSet:localWrites,localRemove:localDeletes,registry});if(!localPhase.ok)throw Object.assign(localPhase.error||new Error('Local projection failed'),{phaseResult:localPhase});interrupt('local-projection');
      const idbPhase=await replacePersistenceCopies({storage,indexedDbTarget,indexedDbSet:idbWrites,indexedDbRemove:idbDeletes,registry});if(!idbPhase.ok)throw Object.assign(idbPhase.error||new Error('Saved projection failed'),{phaseResult:idbPhase});interrupt('indexeddb-projection');
      const verifiedLocal=canonicalState.fromLocalStorage(storage,{registry}),verifiedRows=await indexedDbTarget.read(stateKeys),verifiedIdb=canonicalState.fromIndexedDb([...verifiedRows.values()].filter(Boolean),{registry}),[localHash,idbHash]=await Promise.all([canonicalState.fingerprint(verifiedLocal),canonicalState.fingerprint(verifiedIdb)]);
      if(!localHash.ok||!idbHash.ok||localHash.value!==pending.fingerprint||idbHash.value!==pending.fingerprint)throw new Error('Canonical fingerprint verification failed after projection write');
      const verifiedRaw=JSON.stringify(verified),finalised=await replacePersistenceCopies({storage,indexedDbTarget,localSet:[[canonicalState.GENERATION_KEY,verifiedRaw]],indexedDbSet:[[canonicalState.GENERATION_KEY,verifiedRaw]],registry});if(!finalised.ok)throw Object.assign(finalised.error||new Error('Generation verification metadata failed'),{phaseResult:finalised});
      return {ok:true,stage:'verified',rolledBack:false,rollbackVerified:true,generation:verified,previousGeneration:predecessor,canonicalFingerprint:verified.fingerprint,replacedLocalKeys:localWrites.map(([key])=>key),removedLocalKeys:localDeletes,replacedIndexedDbKeys:idbWrites.map(([key])=>key),removedIndexedDbKeys:idbDeletes};
    }catch(error){
      if(error.interrupted)return {ok:false,stage:'interrupted',interruptedAfter:interruptAfter,rolledBack:false,rollbackVerified:false,error,generation:pending};
      return {ok:false,stage:error.phaseResult?.stage||'verification',error,beforeLocal,beforeIndexedDb,...await rollback()};
    }finally{endReplacement()}
  }

  async function recoverRows({storage,rows,personalKeys,startupKeys,startupValues,registry}){
    const sourceRegistry=registry||(typeof globalThis!=='undefined'?globalThis.RosterBotPersistenceRegistry:null);
    const localValues=startupValues||Object.fromEntries((startupKeys||personalKeys||[]).map(key=>[key,storage.getItem(key)]).filter(([,value])=>value!=null));
    const decision=decideRecovery({registry:sourceRegistry,localValues,rows,personalKeys});
    if(!decision.startupAllowed||!decision.replacementEntries.length)return {restored:false,count:0,reason:decision.issueType,decision};
    const result=await replacePersistentState({storage,replacements:decision.replacementEntries,registry:sourceRegistry});
    return {restored:result.ok,count:result.ok?decision.replacementEntries.length:0,reason:result.ok?'restored':`replacement-${result.stage}-failed`,decision,replacement:result};
  }
  return Object.freeze({CLEAR_KEY,AUTO_HOLD_KEY,CLEAR_REASON,BACKUP_APP,RECOVERY_FORMAT,isExplicitlyCleared,autoHoldFor,markExplicitClear,beginReplacement,endReplacement,isReplacementInProgress,shouldMirror,stageReplacementPayload,replacementPlan,recoveryDecision,decideRecovery,reconcileCanonicalState,replacePersistentState,replacePersistenceCopies,replaceCanonicalPersistenceCopies,recoverRows,semanticallyEqual});
});
try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.complete('02-persistence-safety','RosterBotPersistenceSafety',document.currentScript?.src||'js/02-persistence-safety.js')}catch(_){}
