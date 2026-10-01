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
  function shouldMirror(storage){return !isExplicitlyCleared(storage)}
  function recoverRows({storage,rows,personalKeys,startupKeys}){
    if(isExplicitlyCleared(storage))return {restored:false,count:0,reason:'explicit-clear'};
    const allowed=new Set(personalKeys||[]),started=startupKeys==null?null:new Set(startupKeys),list=Array.isArray(rows)?rows:[];let count=0;
    for(const row of list){
      if(!row||!allowed.has(row.key)||typeof row.value!=='string')continue;
      const missingAtStartup=started?!started.has(row.key):storage.getItem(row.key)==null;
      if(missingAtStartup&&storage.getItem(row.key)!==row.value){storage.setItem(row.key,row.value);count++}
    }
    return {restored:count>0,count,reason:count?'restored':'no-missing-keys'};
  }
  return Object.freeze({CLEAR_KEY,AUTO_HOLD_KEY,CLEAR_REASON,isExplicitlyCleared,autoHoldFor,markExplicitClear,shouldMirror,recoverRows});
});
