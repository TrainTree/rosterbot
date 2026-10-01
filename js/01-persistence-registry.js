(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotPersistenceRegistry=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const BACKUP_KEYS=[
    'rosterbot-theme-v1.9','rosterbot-view-mode-v1','rosterbot-session-settings-v1','rosterbot-shared-settings-v1',
    'rosterbot-timeline-v1','rosterbot-diary-annual-leave-v1','rosterbot-week-leave-v1','rosterbot-week-overrides-v1',
    'rosterbot-day-overrides-v1','rosterbot-week-locks-v1','rosterbot-pay-checks-v1','rosterbot-db-schema-v1',
    'rosterbot-last-backup-v1','rosterbot-first-use-v1','rosterbot-experience-v1','rosterbot-fortnight-allowances-v1',
    'rosterbot-fortnight-notes-v1','paybot-editor-view-v1','paybot-auto-next-v1','paybot-v06-state','paybot-v05-state',
    'paybot-v04-state','paybot-v03-state','paybot-v02-state','rosterbot-calendar-subscription-settings-v1',
    'rosterbot-employment-profile-v1','rosterbot-manual-schedule-v1'
  ];
  const CLOUD_DEVICE_ONLY=[
    'rosterbot-last-backup-v1','rosterbot-first-use-v1','rosterbot-theme-v1.9','rosterbot-view-mode-v1',
    'rosterbot-experience-v1','rosterbot-shared-settings-v1','paybot-editor-view-v1','paybot-auto-next-v1',
    'paybot-v05-state','paybot-v04-state','paybot-v03-state','paybot-v02-state'
  ];
  const CLOUD_KEYS=BACKUP_KEYS.filter(key=>!CLOUD_DEVICE_ONLY.includes(key));
  const INDEXED_DB_KEYS=[
    'rosterbot-timeline-v1','rosterbot-diary-annual-leave-v1','rosterbot-week-leave-v1','rosterbot-week-overrides-v1',
    'rosterbot-day-overrides-v1','rosterbot-week-locks-v1','rosterbot-pay-checks-v1','rosterbot-employment-profile-v1',
    'rosterbot-manual-schedule-v1','rosterbot-session-settings-v1','rosterbot-shared-settings-v1','rosterbot-theme-v1.9',
    'rosterbot-view-mode-v1','paybot-editor-view-v1','paybot-auto-next-v1','paybot-v06-state','rosterbot-last-backup-v1',
    'rosterbot-first-use-v1','rosterbot-experience-v1','rosterbot-fortnight-allowances-v1','rosterbot-fortnight-notes-v1',
    'rosterbot-db-schema-v1'
  ];

  function parseJson(raw){try{return {ok:true,value:JSON.parse(String(raw))}}catch(error){return {ok:false,error}}}
  const validators={
    string:raw=>typeof raw==='string',
    iso:raw=>typeof raw==='string'&&Number.isFinite(Date.parse(raw)),
    schema4:raw=>String(raw)==='4',
    jsonArray:raw=>{const x=parseJson(raw);return x.ok&&Array.isArray(x.value)},
    jsonObject:raw=>{const x=parseJson(raw);return x.ok&&!!x.value&&typeof x.value==='object'&&!Array.isArray(x.value)},
    timeline:raw=>{const x=parseJson(raw);return x.ok&&Array.isArray(x.value)&&x.value.every(v=>v&&typeof v==='object')},
    paybot:raw=>{const x=parseJson(raw);return x.ok&&!!x.value&&typeof x.value==='object'&&!Array.isArray(x.value)&&(!x.value.days||Array.isArray(x.value.days))},
    theme:raw=>['1','2','3','4','5','6','7'].includes(String(raw)),
    rosterView:raw=>['calendar','compact'].includes(String(raw)),
    experience:raw=>['quick','diary'].includes(String(raw)),
    editorView:raw=>['full','compact'].includes(String(raw)),
    booleanFlag:raw=>['0','1'].includes(String(raw)),
    colorMode:raw=>['light','dark'].includes(String(raw)),
    rosterPeriod:raw=>['week','fortnight'].includes(String(raw))
  };

  const definitions=[
    ['rosterbot-timeline-v1','personal','timeline','personal',null],
    ['rosterbot-diary-annual-leave-v1','personal','jsonArray','personal',null],
    ['rosterbot-week-leave-v1','personal','jsonObject','personal',null],
    ['rosterbot-week-overrides-v1','personal','jsonObject','personal',null],
    ['rosterbot-day-overrides-v1','personal','jsonObject','sensitive',null],
    ['rosterbot-week-locks-v1','personal','jsonObject','personal',null],
    ['rosterbot-pay-checks-v1','personal','jsonObject','financial',null],
    ['rosterbot-fortnight-allowances-v1','personal','jsonObject','financial',null],
    ['rosterbot-fortnight-notes-v1','personal','jsonObject','sensitive',null],
    ['rosterbot-employment-profile-v1','personal','jsonArray','employment',null],
    ['rosterbot-manual-schedule-v1','personal','jsonObject','personal',null],
    ['rosterbot-session-settings-v1','personal','jsonObject','personal',null],
    ['rosterbot-shared-settings-v1','derived','jsonObject','personal',null],
    ['rosterbot-db-schema-v1','device','schema4','none',null],
    ['rosterbot-cleared-v1','device','iso','none',null],
    ['rosterbot-theme-v1.9','device','theme','none',['rosterbot-theme-v1.8','rosterbot-theme-v1.7','rosterbot-theme']],
    ['rosterbot-theme-v1.8','device','string','none',null,'rosterbot-theme-v1.9'],
    ['rosterbot-theme-v1.7','device','string','none',null,'rosterbot-theme-v1.9'],
    ['rosterbot-theme','device','string','none',null,'rosterbot-theme-v1.9'],
    ['rosterbot-view-mode-v1','device','rosterView','none',null],
    ['rosterbot-experience-v1','device','experience','none',null],
    ['rosterbot-color-mode-v1','device','colorMode','none',null],
    ['rosterbot-roster-period-v1','device','rosterPeriod','none',null],
    ['rosterbot-first-use-v1','device','iso','none',null],
    ['rosterbot-last-backup-v1','device','iso','none',null],
    ['paybot-editor-view-v1','device','editorView','none',null],
    ['paybot-auto-next-v1','device','booleanFlag','none',null],
    ['paybot-v06-state','personal','paybot','financial',['paybot-v05-state','paybot-v04-state','paybot-v03-state','paybot-v02-state']],
    ['paybot-v05-state','personal','paybot','financial',null,'paybot-v06-state'],
    ['paybot-v04-state','personal','paybot','financial',null,'paybot-v06-state'],
    ['paybot-v03-state','personal','paybot','financial',null,'paybot-v06-state'],
    ['paybot-v02-state','personal','paybot','financial',null,'paybot-v06-state'],
    ['paybot-lastcalc','derived','jsonObject','financial',null],
    ['rosterbot-paybot-shared-cache-weeks','cache','string','none',null],
    ['rosterbot-calendar-subscription-settings-v1','personal','jsonObject','personal',null],
    ['rosterbot-calendar-subscription-tokens-v2','credential','jsonObject','secret',['rosterbot-calendar-subscription-token-v1']],
    ['rosterbot-calendar-subscription-token-v1','credential','string','secret',null,'rosterbot-calendar-subscription-tokens-v2'],
    ['rosterbot-calendar-subscription-hashes-v2','cache','jsonObject','none',['rosterbot-calendar-subscription-hash-v1']],
    ['rosterbot-calendar-subscription-hash-v1','cache','string','none',null,'rosterbot-calendar-subscription-hashes-v2'],
    ['rosterbot-calendar-subscription-active-v1','cache','booleanFlag','none',null],
    ['rosterbot-cloud-config-v1','device','jsonObject','public-config',null],
    ['rosterbot-cloud-client-id-v1','device','string','identifier',null],
    ['rosterbot-cloud-sync-meta-v1','device','jsonObject','metadata',null],
    ['rosterbot-cloud-restore-safety-v1','personal','jsonObject','sensitive',null],
    ['rosterbot-cloud-session-persistent-v1','credential','jsonObject','secret',['rosterbot-cloud-session-v1']],
    ['rosterbot-cloud-session-v1','credential','jsonObject','secret',null,'rosterbot-cloud-session-persistent-v1','sessionStorage'],
    ['rosterbot-cloud-auto-v1','device','booleanFlag','none',null],
    ['rosterbot-cloud-auto-hold-v1','device','jsonObject','metadata',null],
    ['rosterbot-cloud-crypto-profile-v1','credential','jsonObject','cryptographic',null],
    ['rosterbot-cloud-device-key-v1','credential','jsonObject','secret',null],
    ['rosterbot-cloud-post-reload-v1','cache','string','none',null,null,'sessionStorage']
  ];

  const items=definitions.map(([key,category,validator,sensitivity,aliases=null,aliasFor=null,storage='localStorage'])=>Object.freeze({
    key,storage,category,backup:BACKUP_KEYS.includes(key),cloud:CLOUD_KEYS.includes(key),indexedDb:INDEXED_DB_KEYS.includes(key),
    validator,aliases:Object.freeze(aliases||[]),aliasFor,sensitivity
  }));
  const byKey=new Map(items.map(item=>[item.key,item]));
  const sortedDifference=(a,b)=>a.filter(x=>!b.includes(x)).sort();

  function validate(key,raw){
    const item=byKey.get(key);if(!item)return {known:false,valid:false,reason:'unregistered key'};
    if(raw==null)return {known:true,valid:true,missing:true,validator:item.validator};
    const fn=validators[item.validator]||validators.string;
    return {known:true,valid:!!fn(raw),missing:false,validator:item.validator};
  }
  function report(){
    return {
      itemCount:items.length,
      surfaces:{backup:[...BACKUP_KEYS],cloud:[...CLOUD_KEYS],indexedDb:[...INDEXED_DB_KEYS]},
      disagreements:{
        backupNotCloud:sortedDifference(BACKUP_KEYS,CLOUD_KEYS),
        backupNotIndexedDb:sortedDifference(BACKUP_KEYS,INDEXED_DB_KEYS),
        cloudNotIndexedDb:sortedDifference(CLOUD_KEYS,INDEXED_DB_KEYS),
        indexedDbNotCloud:sortedDifference(INDEXED_DB_KEYS,CLOUD_KEYS)
      }
    };
  }

  return Object.freeze({schemaVersion:4,mode:'read-only-reporting',items:Object.freeze(items),get:key=>byKey.get(key)||null,validate,report});
});
