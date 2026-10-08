try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.start('01-persistence-registry','RosterBotPersistenceRegistry',document.currentScript?.src||'js/01-persistence-registry.js')}catch(_){}
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotPersistenceRegistry=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  // These ordered lists are the single source of truth for persistence surfaces.
  // Consumers must ask surfaceKeys() rather than maintaining another allow-list.
  const SURFACES=Object.freeze({
    backup:Object.freeze([
      'rosterbot-theme-v1.9','rosterbot-view-mode-v1','rosterbot-session-settings-v1','rosterbot-shared-settings-v1',
      'rosterbot-timeline-v1','rosterbot-diary-annual-leave-v1','rosterbot-week-leave-v1','rosterbot-week-overrides-v1',
      'rosterbot-day-overrides-v1','rosterbot-week-locks-v1','rosterbot-pay-checks-v1','rosterbot-db-schema-v1',
      'rosterbot-last-backup-v1','rosterbot-first-use-v1','rosterbot-experience-v1','rosterbot-fortnight-allowances-v1',
      'rosterbot-fortnight-notes-v1','paybot-editor-view-v1','paybot-auto-next-v1','paybot-v06-state','paybot-v05-state',
      'paybot-v04-state','paybot-v03-state','paybot-v02-state','rosterbot-calendar-subscription-settings-v1',
      'rosterbot-employment-profile-v1','rosterbot-manual-schedule-v1'
    ]),
    cloud:Object.freeze([
      'rosterbot-session-settings-v1','rosterbot-timeline-v1','rosterbot-diary-annual-leave-v1','rosterbot-week-leave-v1',
      'rosterbot-week-overrides-v1','rosterbot-day-overrides-v1','rosterbot-week-locks-v1','rosterbot-pay-checks-v1',
      'rosterbot-db-schema-v1','rosterbot-fortnight-allowances-v1','rosterbot-fortnight-notes-v1','paybot-v06-state',
      'rosterbot-calendar-subscription-settings-v1','rosterbot-employment-profile-v1','rosterbot-manual-schedule-v1'
    ]),
    indexedDb:Object.freeze([
      'rosterbot-timeline-v1','rosterbot-diary-annual-leave-v1','rosterbot-week-leave-v1','rosterbot-week-overrides-v1',
      'rosterbot-day-overrides-v1','rosterbot-week-locks-v1','rosterbot-pay-checks-v1','rosterbot-employment-profile-v1',
      'rosterbot-manual-schedule-v1','rosterbot-session-settings-v1','rosterbot-shared-settings-v1','rosterbot-theme-v1.9',
      'rosterbot-view-mode-v1','paybot-editor-view-v1','paybot-auto-next-v1','paybot-v06-state','rosterbot-last-backup-v1',
      'rosterbot-first-use-v1','rosterbot-experience-v1','rosterbot-fortnight-allowances-v1','rosterbot-fortnight-notes-v1',
      'rosterbot-db-schema-v1','rosterbot-calendar-subscription-settings-v1'
    ])
  });

  const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const isIsoDate=value=>{const text=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return false;const date=new Date(`${text}T00:00:00Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===text};
  const result=(state,value,reason='')=>({state,value,reason,valid:state==='valid'||state==='legacy'});
  const valid=value=>result('valid',value);
  const legacy=(value,reason)=>result('legacy',value,reason);
  const unsupported=(value,reason)=>result('unsupported',value,reason);
  function parseJson(raw){
    try{return {ok:true,value:JSON.parse(String(raw))}}
    catch(error){return {ok:false,error}}
  }
  function jsonValidator(check){
    return raw=>{const parsed=parseJson(raw);return parsed.ok?check(parsed.value):{state:'malformed',valid:false,value:undefined,error:parsed.error,reason:'invalid JSON'}};
  }
  function required(value,fields){return fields.every(field=>Object.prototype.hasOwnProperty.call(value,field))}
  function timelineValue(value){
    if(!Array.isArray(value))return unsupported(value,'expected an array');
    let old=false;
    for(const row of value){
      if(!isObject(row)||!isIsoDate(row.startWC)||!isObject(row.trackA)||typeof row.trackA.roster!=='string'||!Number.isInteger(Number(row.trackA.line))||Number(row.trackA.line)<1)return unsupported(value,'timeline entries require startWC and a usable trackA');
      if(row.mode!=null&&!['single','swap','manual'].includes(row.mode))return unsupported(value,'timeline entry mode is unsupported');
      if(!row.mode||!row.id)old=true;
      if(row.mode==='swap'&&(!isObject(row.trackB)||typeof row.trackB.roster!=='string'||!Number.isInteger(Number(row.trackB.line))||Number(row.trackB.line)<1))return unsupported(value,'swap timeline entries require a usable trackB');
    }
    return old?legacy(value,'timeline entry uses a recoverable older shape'):valid(value);
  }
  function employmentValue(value){
    if(!Array.isArray(value))return unsupported(value,'expected an array');
    let old=false;
    for(const row of value){
      if(!isObject(row)||!isIsoDate(row.effectiveDate)||typeof row.classification!=='string')return unsupported(value,'employment entries require effectiveDate and classification');
      if(!row.id||!Object.prototype.hasOwnProperty.call(row,'pdtScheme'))old=true;
    }
    return old?legacy(value,'employment entry uses a recoverable older shape'):valid(value);
  }
  function manualScheduleValue(value){
    if(!isObject(value)||!isObject(value.days))return unsupported(value,'manual schedule requires a days object');
    const days=Object.values(value.days);
    if(days.some(day=>!isObject(day)||typeof day.on!=='boolean'))return unsupported(value,'manual schedule days require boolean on values');
    return value.version===1?valid(value):legacy(value,'manual schedule predates version 1 metadata');
  }
  function sessionValue(value){
    if(!isObject(value))return unsupported(value,'expected an object');
    if(!isIsoDate(value.startDate)||typeof value.startRoster!=='string'||!value.startRoster||!Number.isInteger(Number(value.startLine))||Number(value.startLine)<1)return unsupported(value,'session settings require startDate, startRoster and startLine');
    return required(value,['startDepot','roleStartDate','scheduleMode'])?valid(value):legacy(value,'session settings omit fields added by later v0.29 releases');
  }
  function overrideMapValue(value,kind){
    if(!isObject(value))return unsupported(value,'expected an object');
    for(const [date,row] of Object.entries(value)){
      if(!isIsoDate(date)||!isObject(row))return unsupported(value,`${kind} overrides require ISO-date keys and object values`);
      if(kind==='week'&&(typeof row.roster!=='string'||!row.roster||!Number.isInteger(Number(row.line))||Number(row.line)<1))return unsupported(value,'week overrides require roster and line');
      if(kind==='day'&&typeof row.status!=='string')return unsupported(value,'day overrides require status');
    }
    return valid(value);
  }
  function paybotValue(value){
    if(!isObject(value)||typeof value.period!=='string'||!Array.isArray(value.days))return unsupported(value,'PayBot state requires period and days');
    if(value.logicVersion==='0.20.6'&&value.days.length===14)return valid(value);
    return legacy(value,'PayBot state is a recoverable older snapshot');
  }
  function calendarSettingsValue(value){
    if(!isObject(value))return unsupported(value,'expected an object');
    const booleans=['fullDuration','includeOr','includeDetails','rosteredFallback','timesInTitle'];
    if(booleans.some(key=>Object.prototype.hasOwnProperty.call(value,key)&&typeof value[key]!=='boolean'))return unsupported(value,'calendar boolean setting has the wrong type');
    if(Object.prototype.hasOwnProperty.call(value,'range')&&!['30_6','90_12','365_24','all'].includes(value.range))return unsupported(value,'calendar range is unsupported');
    return required(value,[...booleans,'range'])?valid(value):legacy(value,'calendar settings omit recoverable optional preferences');
  }
  function generationValue(value){
    if(!isObject(value)||value.format!=='rosterbot-local-generation-v1')return unsupported(value,'expected Phase 6 generation metadata');
    if(!Number.isSafeInteger(value.generation)||value.generation<1)return unsupported(value,'generation must be a positive safe integer');
    if(!/^[a-f0-9]{64}$/.test(String(value.fingerprint||'')))return unsupported(value,'generation fingerprint must be SHA-256');
    if(value.predecessorFingerprint!=null&&!/^[a-f0-9]{64}$/.test(String(value.predecessorFingerprint)))return unsupported(value,'predecessor fingerprint must be SHA-256 or null');
    if(!Number.isFinite(Date.parse(String(value.timestamp||''))))return unsupported(value,'generation timestamp must be ISO-compatible');
    if(typeof value.writer!=='string'||!value.writer)return unsupported(value,'generation writer is required');
    if(!['pending','verified'].includes(value.verification))return unsupported(value,'generation verification status is unsupported');
    if(!['state','clear'].includes(value.kind))return unsupported(value,'generation kind is unsupported');
    return valid(value);
  }
  function previousGenerationValue(value){
    if(!isObject(value)||value.format!=='rosterbot-previous-generation-v1'||!isObject(value.generation)||!isObject(value.projection))return unsupported(value,'expected a previous-generation snapshot');
    const generation=generationValue(value.generation);
    if(!generation.valid||generation.value.verification!=='verified')return unsupported(value,'previous generation metadata must be verified');
    if(Number(value.projection.schemaVersion)!==4||!isObject(value.projection.storage))return unsupported(value,'previous projection must contain schema-4 storage');
    if(Object.values(value.projection.storage).some(raw=>typeof raw!=='string'))return unsupported(value,'previous projection values must be raw strings');
    return valid(value);
  }
  function storageGuardValue(value){
    if(!isObject(value)||value.format!=='rosterbot-storage-guard'||Number(value.formatVersion)!==1)return unsupported(value,'expected the durable storage downgrade guard');
    for(const key of ['migratedSchema','minimumReaderSchema','minimumWriterSchema'])if(!Number.isSafeInteger(Number(value[key]))||Number(value[key])<1)return unsupported(value,`${key} must be a positive schema number`);
    if(!isObject(value.migrationEvidence))return unsupported(value,'migration evidence is required');
    if(value.compatibilityProjection!=null&&(!isObject(value.compatibilityProjection)||!Number.isSafeInteger(Number(value.compatibilityProjection.schemaVersion))||!['lossless','lossy','unavailable'].includes(value.compatibilityProjection.status)))return unsupported(value,'compatibility projection metadata is invalid');
    return valid(value);
  }

  const validators=Object.freeze({
    string:raw=>valid(String(raw)),
    iso:raw=>Number.isFinite(Date.parse(String(raw)))?valid(String(raw)):unsupported(String(raw),'expected an ISO timestamp'),
    schema4:raw=>String(raw)==='4'?valid('4'):unsupported(String(raw),'only persisted schema 4 is supported'),
    jsonArray:jsonValidator(value=>Array.isArray(value)?valid(value):unsupported(value,'expected an array')),
    jsonObject:jsonValidator(value=>isObject(value)?valid(value):unsupported(value,'expected an object')),
    timeline:jsonValidator(timelineValue),
    employment:jsonValidator(employmentValue),
    manualSchedule:jsonValidator(manualScheduleValue),
    sessionSettings:jsonValidator(sessionValue),
    weekOverrides:jsonValidator(value=>overrideMapValue(value,'week')),
    dayOverrides:jsonValidator(value=>overrideMapValue(value,'day')),
    paybot:jsonValidator(paybotValue),
    calendarSettings:jsonValidator(calendarSettingsValue),
    theme:raw=>['1','2','3','4','5','6','7'].includes(String(raw))?valid(String(raw)):unsupported(String(raw),'unknown theme'),
    rosterView:raw=>['calendar','compact'].includes(String(raw))?valid(String(raw)):unsupported(String(raw),'unknown roster view'),
    experience:raw=>['quick','diary'].includes(String(raw))?valid(String(raw)):unsupported(String(raw),'unknown experience'),
    editorView:raw=>['full','compact'].includes(String(raw))?valid(String(raw)):unsupported(String(raw),'unknown editor view'),
    booleanFlag:raw=>['0','1'].includes(String(raw))?valid(String(raw)):unsupported(String(raw),'expected 0 or 1'),
    colorMode:raw=>['light','dark'].includes(String(raw))?valid(String(raw)):unsupported(String(raw),'unknown colour mode'),
    rosterPeriod:raw=>['week','fortnight'].includes(String(raw))?valid(String(raw)):unsupported(String(raw),'unknown roster period'),
    generation:jsonValidator(generationValue),
    previousGeneration:jsonValidator(previousGenerationValue),
    storageGuard:jsonValidator(storageGuardValue)
  });

  const definitions=[
    ['rosterbot-timeline-v1','personal','timeline','personal',null],
    ['rosterbot-diary-annual-leave-v1','personal','jsonArray','personal',null],
    ['rosterbot-week-leave-v1','personal','jsonObject','personal',null],
    ['rosterbot-week-overrides-v1','personal','weekOverrides','personal',null],
    ['rosterbot-day-overrides-v1','personal','dayOverrides','sensitive',null],
    ['rosterbot-week-locks-v1','personal','jsonObject','personal',null],
    ['rosterbot-pay-checks-v1','personal','jsonObject','financial',null],
    ['rosterbot-fortnight-allowances-v1','personal','jsonObject','financial',null],
    ['rosterbot-fortnight-notes-v1','personal','jsonObject','sensitive',null],
    ['rosterbot-employment-profile-v1','personal','employment','employment',null],
    ['rosterbot-manual-schedule-v1','personal','manualSchedule','personal',null],
    ['rosterbot-session-settings-v1','personal','sessionSettings','personal',null],
    ['rosterbot-shared-settings-v1','derived','jsonObject','personal',null],
    ['rosterbot-db-schema-v1','device','schema4','none',null],
    // Phase 7B detection-only records. They are deliberately absent from every
    // writable surface and are never created during normal schema-4 operation.
    ['rosterbot-storage-guard-v1','internal','storageGuard','metadata',null],
    ['rosterbot-personal-state-v1','internal','jsonObject','sensitive',null],
    ['rosterbot-schema5-migration-journal-v1','internal','jsonObject','metadata',null],
    ['rosterbot-schema4-pre-migration-snapshot-v1','internal','jsonObject','sensitive',null],
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
    ['rosterbot-calendar-subscription-settings-v1','personal','calendarSettings','personal',null],
    ['rosterbot-calendar-subscription-tokens-v2','credential','jsonObject','secret',['rosterbot-calendar-subscription-token-v1']],
    ['rosterbot-calendar-subscription-token-v1','credential','string','secret',null,'rosterbot-calendar-subscription-tokens-v2'],
    ['rosterbot-calendar-subscription-hashes-v2','cache','jsonObject','none',['rosterbot-calendar-subscription-hash-v1']],
    ['rosterbot-calendar-subscription-hash-v1','cache','string','none',null,'rosterbot-calendar-subscription-hashes-v2'],
    ['rosterbot-calendar-subscription-active-v1','cache','booleanFlag','none',null],
    ['rosterbot-cloud-config-v1','device','jsonObject','public-config',null],
    ['rosterbot-cloud-client-id-v1','device','string','identifier',null],
    ['rosterbot-cloud-sync-meta-v1','device','jsonObject','metadata',null],
    ['rosterbot-cloud-restore-safety-v1','recovery','jsonObject','sensitive',null],
    ['rosterbot-cloud-session-persistent-v1','credential','jsonObject','secret',['rosterbot-cloud-session-v1']],
    ['rosterbot-cloud-session-v1','credential','jsonObject','secret',null,'rosterbot-cloud-session-persistent-v1','sessionStorage'],
    ['rosterbot-cloud-auto-v1','device','booleanFlag','none',null],
    ['rosterbot-cloud-auto-hold-v1','device','jsonObject','metadata',null],
    ['rosterbot-cloud-crypto-profile-v1','credential','jsonObject','cryptographic',null],
    ['rosterbot-cloud-device-key-v1','credential','jsonObject','secret',null],
    ['rosterbot-cloud-post-reload-v1','cache','string','none',null,null,'sessionStorage'],
    ['rosterbot-local-generation-v1','internal','generation','metadata',null],
    ['rosterbot-previous-generation-v1','internal','previousGeneration','sensitive',null]
  ];

  const surfaceSets=Object.fromEntries(Object.entries(SURFACES).map(([name,keys])=>[name,new Set(keys)]));
  const items=definitions.map(([key,category,validator,sensitivity,aliases=null,aliasFor=null,storage='localStorage'])=>Object.freeze({
    key,storage,category,backup:surfaceSets.backup.has(key),cloud:surfaceSets.cloud.has(key),indexedDb:surfaceSets.indexedDb.has(key),
    validator,aliases:Object.freeze(aliases||[]),aliasFor,sensitivity
  }));
  const byKey=new Map(items.map(item=>[item.key,item]));
  const sortedDifference=(a,b)=>a.filter(x=>!b.includes(x)).sort();
  const DISAGREEMENT_CLASSIFICATION=Object.freeze({
    'paybot-v02-state':'legacy compatibility','paybot-v03-state':'legacy compatibility','paybot-v04-state':'legacy compatibility','paybot-v05-state':'legacy compatibility',
    'rosterbot-shared-settings-v1':'derived/cache state',
    'rosterbot-theme-v1.9':'device-only','rosterbot-view-mode-v1':'device-only','rosterbot-experience-v1':'device-only',
    'rosterbot-first-use-v1':'device-only','rosterbot-last-backup-v1':'device-only','paybot-editor-view-v1':'device-only','paybot-auto-next-v1':'device-only'
  });

  function validate(key,raw){
    const item=byKey.get(key);
    if(!item)return {known:false,state:'unsupported',valid:false,missing:false,raw,reason:'unregistered key'};
    if(raw==null)return {known:true,state:'missing',valid:false,missing:true,raw:null,value:undefined,validator:item.validator,key};
    const checked=(validators[item.validator]||validators.string)(raw);
    return {known:true,missing:false,raw:String(raw),validator:item.validator,key,...checked};
  }
  function read(storage,key,{aliases=true}={}){
    const item=byKey.get(key);
    if(!item)return validate(key,null);
    const candidates=[key,...(aliases?item.aliases:[])];
    for(const sourceKey of candidates){
      let raw;
      try{raw=storage?.getItem(sourceKey)}catch(error){return {known:true,key,sourceKey,state:'unsupported',valid:false,missing:false,raw:null,value:undefined,error,reason:'storage read failed'}}
      if(raw==null)continue;
      const checked=validate(sourceKey,raw);
      const canonicalKey=item.aliasFor||key;
      if(sourceKey!==key&&checked.valid)checked.state='legacy';
      return {...checked,key:canonicalKey,sourceKey,alias:sourceKey!==key,valid:checked.state==='valid'||checked.state==='legacy'};
    }
    return {...validate(key,null),sourceKey:null,alias:false};
  }
  function surfaceKeys(surface){return SURFACES[surface]?[...SURFACES[surface]]:[]}
  function compatibilityKeys(key){const item=byKey.get(key);return item?[item.key,...item.aliases]:[]}
  function report(){
    const backup=surfaceKeys('backup'),cloud=surfaceKeys('cloud'),indexedDb=surfaceKeys('indexedDb');
    const disagreements={
      backupNotCloud:sortedDifference(backup,cloud),
      backupNotIndexedDb:sortedDifference(backup,indexedDb),
      cloudNotIndexedDb:sortedDifference(cloud,indexedDb),
      indexedDbNotCloud:sortedDifference(indexedDb,cloud)
    };
    return {
      itemCount:items.length,
      surfaces:{backup,cloud,indexedDb},
      disagreements,
      disagreementDetails:Object.fromEntries(Object.entries(disagreements).map(([name,keys])=>[name,keys.map(key=>({key,classification:DISAGREEMENT_CLASSIFICATION[key]||'intentional'}))])),
      corrections:[{key:'rosterbot-calendar-subscription-settings-v1',classification:'genuine persistence bug',resolution:'included in IndexedDB recovery; credential token keys remain excluded'}]
    };
  }

  return Object.freeze({schemaVersion:4,mode:'authoritative-metadata',items:Object.freeze(items),get:key=>byKey.get(key)||null,validate,read,surfaceKeys,compatibilityKeys,report});
});
try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.complete('01-persistence-registry','RosterBotPersistenceRegistry',document.currentScript?.src||'js/01-persistence-registry.js')}catch(_){}
