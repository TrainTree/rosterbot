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
  function shouldMirror(storage,recoveryState=null){return !isExplicitlyCleared(storage)&&recoveryState?.mirrorAllowed!==false}

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

  async function replacePersistentState({storage,replacements,registry}){
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw new TypeError('A Storage-compatible target is required');
    if(!registry||typeof registry.validate!=='function')throw new TypeError('A persistence registry is required');
    const entries=replacements instanceof Map?[...replacements.entries()]:Array.isArray(replacements)?replacements:Object.entries(replacements||{}),before={};
    for(const [key,raw] of entries){
      before[key]=storage.getItem(key);
      if(typeof raw!=='string')return {ok:false,stage:'validation',rolledBack:false,rollbackVerified:true,before,error:new Error(`Replacement for ${key} is not a raw string`)};
      const checked=registry.validate(key,raw);
      if(!recoverable(checked))return {ok:false,stage:'validation',rolledBack:false,rollbackVerified:true,before,error:new Error(`Replacement for ${key} is ${checked.state}`)};
    }
    const rollback=()=>{
      let rollbackError=null;
      for(const [key] of entries)try{if(before[key]==null)storage.removeItem(key);else storage.setItem(key,before[key])}catch(error){rollbackError=rollbackError||error}
      let rollbackVerified=!rollbackError;
      for(const [key] of entries)try{if(storage.getItem(key)!==before[key])rollbackVerified=false}catch(_){rollbackVerified=false}
      return {rolledBack:true,rollbackVerified,rollbackError};
    };
    try{
      for(const [key,raw] of entries)storage.setItem(key,raw);
    }catch(error){return {ok:false,stage:'write',before,error,...rollback()}}
    try{
      for(const [key,raw] of entries){
        const reread=storage.getItem(key),checked=registry.validate(key,reread);
        if(reread!==raw||!recoverable(checked))throw new Error(`Verification failed for ${key}`);
      }
      return {ok:true,stage:'verified',before,replacedKeys:entries.map(([key])=>key),rolledBack:false,rollbackVerified:true};
    }catch(error){return {ok:false,stage:'verification',before,error,...rollback()}}
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
    let beforeIndexedDb;
    try{beforeIndexedDb=await indexedDbTarget.read(idbKeys)}catch(error){return {ok:false,stage:'capture',rolledBack:false,rollbackVerified:false,beforeLocal,error}}
    const beforeRows=beforeIndexedDb instanceof Map?beforeIndexedDb:new Map(Object.entries(beforeIndexedDb||{}));
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
    try{
      for(const [key,raw] of localWrites)storage.setItem(key,raw);
      for(const key of localDeletes)storage.removeItem(key);
      await indexedDbTarget.apply({put:[...desiredRows.values()],remove:idbDeletes});
    }catch(error){return {ok:false,stage:'write',beforeLocal,beforeIndexedDb:beforeRows,error,...await rollback()}}
    try{
      for(const key of localKeys){const expected=desiredLocal.has(key)?desiredLocal.get(key):null,actual=storage.getItem(key);if(actual!==expected)throw new Error(`Verification failed for local ${key}`);if(expected!=null&&!recoverable(registry.validate(key,actual)))throw new Error(`Validation failed for local ${key}`)}
      const rows=await indexedDbTarget.read(idbKeys);
      for(const key of idbKeys){const expected=desiredRows.get(key)?.value??null,actual=rows.get(key)?.value??null;if(actual!==expected)throw new Error(`Verification failed for saved mirror ${key}`);if(expected!=null&&!recoverable(registry.validate(key,actual)))throw new Error(`Validation failed for saved mirror ${key}`)}
      return {ok:true,stage:'verified',replacedLocalKeys:localWrites.map(([key])=>key),removedLocalKeys:localDeletes,replacedIndexedDbKeys:idbWrites.map(([key])=>key),removedIndexedDbKeys:idbDeletes,rolledBack:false,rollbackVerified:true};
    }catch(error){return {ok:false,stage:'verification',beforeLocal,beforeIndexedDb:beforeRows,error,...await rollback()}}
  }

  async function recoverRows({storage,rows,personalKeys,startupKeys,startupValues,registry}){
    const sourceRegistry=registry||(typeof globalThis!=='undefined'?globalThis.RosterBotPersistenceRegistry:null);
    const localValues=startupValues||Object.fromEntries((startupKeys||personalKeys||[]).map(key=>[key,storage.getItem(key)]).filter(([,value])=>value!=null));
    const decision=decideRecovery({registry:sourceRegistry,localValues,rows,personalKeys});
    if(!decision.startupAllowed||!decision.replacementEntries.length)return {restored:false,count:0,reason:decision.issueType,decision};
    const result=await replacePersistentState({storage,replacements:decision.replacementEntries,registry:sourceRegistry});
    return {restored:result.ok,count:result.ok?decision.replacementEntries.length:0,reason:result.ok?'restored':`replacement-${result.stage}-failed`,decision,replacement:result};
  }
  return Object.freeze({CLEAR_KEY,AUTO_HOLD_KEY,CLEAR_REASON,isExplicitlyCleared,autoHoldFor,markExplicitClear,shouldMirror,recoveryDecision,decideRecovery,replacePersistentState,replacePersistenceCopies,recoverRows,semanticallyEqual});
});
