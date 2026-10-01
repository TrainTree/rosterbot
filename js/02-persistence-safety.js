(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotPersistenceSafety=api;
})(typeof window!=='undefined'?window:globalThis,function(){
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

  async function recoverRows({storage,rows,personalKeys,startupKeys,startupValues,registry}){
    const sourceRegistry=registry||(typeof globalThis!=='undefined'?globalThis.RosterBotPersistenceRegistry:null);
    const localValues=startupValues||Object.fromEntries((startupKeys||personalKeys||[]).map(key=>[key,storage.getItem(key)]).filter(([,value])=>value!=null));
    const decision=decideRecovery({registry:sourceRegistry,localValues,rows,personalKeys});
    if(!decision.startupAllowed||!decision.replacementEntries.length)return {restored:false,count:0,reason:decision.issueType,decision};
    const result=await replacePersistentState({storage,replacements:decision.replacementEntries,registry:sourceRegistry});
    return {restored:result.ok,count:result.ok?decision.replacementEntries.length:0,reason:result.ok?'restored':`replacement-${result.stage}-failed`,decision,replacement:result};
  }
  return Object.freeze({CLEAR_KEY,AUTO_HOLD_KEY,CLEAR_REASON,BACKUP_APP,RECOVERY_FORMAT,isExplicitlyCleared,autoHoldFor,markExplicitClear,beginReplacement,endReplacement,isReplacementInProgress,shouldMirror,stageReplacementPayload,replacementPlan,recoveryDecision,decideRecovery,replacePersistentState,replacePersistenceCopies,recoverRows,semanticallyEqual});
});
