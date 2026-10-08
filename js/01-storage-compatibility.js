try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.start('01-storage-compatibility','RosterBotStorageCompatibility',document.currentScript?.src||'js/01-storage-compatibility.js')}catch(_){}
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotStorageCompatibility=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  // Phase 7B is deliberately still a schema-4 client. These capabilities are
  // separate so a future reader can understand an older schema without thereby
  // gaining permission to write a newer (or projected) state.
  const POLICY=Object.freeze({
    currentSupportedStorageSchema:4,
    readerSchema:4,
    writerSchema:4,
    highestSafeWriteSchema:4
  });
  // Phase 9 is a local schema-5-capable build. The default POLICY intentionally
  // remains the schema-4 rollback-client capability so guard regression tests
  // can continue proving that an older writer is stopped.
  const SCHEMA5_POLICY=Object.freeze({
    currentSupportedStorageSchema:5,
    readerSchema:5,
    writerSchema:5,
    highestSafeWriteSchema:5
  });
  const KEYS=Object.freeze({
    schemaMarker:'rosterbot-db-schema-v1',
    downgradeGuard:'rosterbot-storage-guard-v1',
    schema5State:'rosterbot-personal-state-v1',
    migrationJournal:'rosterbot-schema5-migration-journal-v1',
    preMigrationSnapshot:'rosterbot-schema4-pre-migration-snapshot-v1'
  });
  const GUARD_FORMAT='rosterbot-storage-guard';
  const GUARD_FORMAT_VERSION=1;
  const FUTURE_RECORD_KEYS=Object.freeze([KEYS.schema5State,KEYS.migrationJournal,KEYS.preMigrationSnapshot]);
  const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const positiveInteger=value=>Number.isSafeInteger(Number(value))&&Number(value)>0?Number(value):null;
  const parseJson=raw=>{try{return {ok:true,value:JSON.parse(String(raw))}}catch(error){return {ok:false,error}}};

  function validateDowngradeGuard(raw){
    const parsed=parseJson(raw);
    if(!parsed.ok)return {ok:false,reason:'Downgrade guard is not valid JSON.'};
    const value=parsed.value;
    if(!isObject(value)||value.format!==GUARD_FORMAT||Number(value.formatVersion)!==GUARD_FORMAT_VERSION)return {ok:false,reason:'Downgrade guard format is unsupported.'};
    const migratedSchema=positiveInteger(value.migratedSchema),minimumReaderSchema=positiveInteger(value.minimumReaderSchema),minimumWriterSchema=positiveInteger(value.minimumWriterSchema);
    if(!migratedSchema||!minimumReaderSchema||!minimumWriterSchema)return {ok:false,reason:'Downgrade guard schema capabilities are invalid.'};
    if(!isObject(value.migrationEvidence))return {ok:false,reason:'Downgrade guard migration evidence is missing.'};
    let compatibilityProjection=null;
    if(value.compatibilityProjection!=null){
      const projection=value.compatibilityProjection;
      if(!isObject(projection)||!positiveInteger(projection.schemaVersion)||!['lossless','lossy','unavailable'].includes(projection.status))return {ok:false,reason:'Downgrade guard compatibility projection metadata is invalid.'};
      compatibilityProjection={schemaVersion:Number(projection.schemaVersion),status:projection.status,fingerprint:typeof projection.fingerprint==='string'?projection.fingerprint:null};
    }
    return {ok:true,value:{...value,migratedSchema,minimumReaderSchema,minimumWriterSchema,compatibilityProjection}};
  }

  function sourceEntries(values){
    if(values instanceof Map)return [...values.entries()].map(([key,row])=>[key,row&&typeof row==='object'&&Object.prototype.hasOwnProperty.call(row,'value')?row.value:row]);
    if(Array.isArray(values))return values.filter(row=>row&&typeof row.key==='string').map(row=>[row.key,row.value]);
    return Object.entries(values||{});
  }
  function inspectSource(values,source,policy=POLICY){
    const entries=new Map(sourceEntries(values)),evidence=[];
    const markerRaw=entries.get(KEYS.schemaMarker);
    if(markerRaw!=null){
      const schema=positiveInteger(markerRaw);
      if(schema&&schema>policy.currentSupportedStorageSchema)evidence.push({source,key:KEYS.schemaMarker,kind:'newer-schema-marker',storageSchema:schema});
    }
    const guardRaw=entries.get(KEYS.downgradeGuard);
    if(guardRaw!=null){
      const checked=validateDowngradeGuard(guardRaw);
      if(!checked.ok)evidence.push({source,key:KEYS.downgradeGuard,kind:'invalid-downgrade-guard',reason:checked.reason});
      else{
        const guard=checked.value;
        if(guard.migratedSchema>policy.currentSupportedStorageSchema||guard.minimumReaderSchema>policy.readerSchema||guard.minimumWriterSchema>policy.writerSchema){
          evidence.push({source,key:KEYS.downgradeGuard,kind:'downgrade-guard',storageSchema:guard.migratedSchema,minimumReaderSchema:guard.minimumReaderSchema,minimumWriterSchema:guard.minimumWriterSchema,compatibilityProjection:guard.compatibilityProjection,migrationEvidence:true});
        }
      }
    }
    for(const key of FUTURE_RECORD_KEYS){
      const raw=entries.get(key);if(raw==null)continue;
      const parsed=parseJson(raw),value=parsed.ok&&isObject(parsed.value)?parsed.value:null;
      const item={
        source,key,kind:key===KEYS.schema5State?'future-schema-state':'migration-evidence',
        storageSchema:positiveInteger(value?.storageSchemaVersion)||(key===KEYS.schema5State?5:null),
        minimumReaderSchema:positiveInteger(value?.minimumReaderSchema),
        minimumWriterSchema:positiveInteger(value?.minimumWriterSchema),
        compatibilityProjection:isObject(value?.compatibility)?{schemaVersion:positiveInteger(value.compatibility.schemaVersion),status:String(value.compatibility.status||'unknown'),fingerprint:typeof value.compatibility.projectionFingerprint==='string'?value.compatibility.projectionFingerprint:null}:null,
        validJson:parsed.ok
      };
      if(policy.currentSupportedStorageSchema<5||!parsed.ok||(item.storageSchema&&item.storageSchema>policy.currentSupportedStorageSchema)||(item.minimumReaderSchema&&item.minimumReaderSchema>policy.readerSchema)||(item.minimumWriterSchema&&item.minimumWriterSchema>policy.writerSchema))evidence.push(item);
    }
    return evidence;
  }

  function reasonFor(evidence,policy=POLICY){
    if(evidence.some(item=>item.kind==='invalid-downgrade-guard'))return 'Migration/downgrade evidence exists but this client cannot validate it.';
    const minimum=Math.max(0,...evidence.flatMap(item=>[item.minimumReaderSchema||0,item.minimumWriterSchema||0]));
    if(minimum>policy.readerSchema)return `This data requires RosterBot storage reader/writer schema ${minimum}; this client supports schema ${policy.readerSchema}.`;
    const schema=Math.max(0,...evidence.map(item=>item.storageSchema||0));
    if(schema>policy.currentSupportedStorageSchema)return `Persisted storage schema ${schema} is newer than this client's supported schema ${policy.currentSupportedStorageSchema}.`;
    return 'Migration evidence from a newer RosterBot storage format is present.';
  }
  function inspect({localValues={},indexedDbRows=[],policy=POLICY}={}){
    const evidence=[...inspectSource(localValues,'localStorage',policy),...inspectSource(indexedDbRows,'indexedDB',policy)];
    if(!evidence.length)return {allowed:true,blocked:false,policy,evidence:[]};
    const projections=evidence.map(item=>item.compatibilityProjection).filter(Boolean);
    return {
      allowed:false,blocked:true,issueType:'newer-schema',reason:reasonFor(evidence,policy),policy,evidence,
      detected:{
        highestStorageSchema:Math.max(0,...evidence.map(item=>item.storageSchema||0))||null,
        minimumReaderSchema:Math.max(0,...evidence.map(item=>item.minimumReaderSchema||0))||null,
        minimumWriterSchema:Math.max(0,...evidence.map(item=>item.minimumWriterSchema||0))||null,
        compatibilityProjections:projections,
        projectionWritable:false
      }
    };
  }

  function appOwned(key){return /^(?:rosterbot|paybot)-/.test(String(key||''))}
  function recoveryState(result,{localValues={},indexedDbRows=[]}={}){
    if(!result?.blocked)throw new Error('A blocked compatibility result is required.');
    const preservedRawCopies={};
    for(const [key,raw] of sourceEntries(localValues))if(appOwned(key))preservedRawCopies[key]={local:raw,indexedDb:null};
    for(const [key,raw] of sourceEntries(indexedDbRows))if(appOwned(key)){
      if(!preservedRawCopies[key])preservedRawCopies[key]={local:null,indexedDb:raw};else preservedRawCopies[key].indexedDb=raw;
    }
    return {
      issueType:'newer-schema',readOnly:true,updateRequired:true,affectedKeys:[...new Set(result.evidence.map(item=>item.key))],
      localValidationState:'newer',indexedDbValidationState:'not-written',automaticRecoveryAllowed:false,userChoiceRequired:false,
      startupAllowed:false,mirrorAllowed:false,decisions:[],replacementEntries:[],validationStates:{local:{},indexedDb:{}},
      preservedRawCopies,reason:result.reason,storageCompatibility:{policy:{...(result.policy||POLICY)},detected:{...result.detected},evidence:result.evidence.map(item=>({...item}))}
    };
  }

  return Object.freeze({POLICY,SCHEMA5_POLICY,KEYS,GUARD_FORMAT,GUARD_FORMAT_VERSION,validateDowngradeGuard,inspect,recoveryState});
});
try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.complete('01-storage-compatibility','RosterBotStorageCompatibility',document.currentScript?.src||'js/01-storage-compatibility.js')}catch(_){}
