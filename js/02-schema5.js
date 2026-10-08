try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.start('02-schema5','RosterBotSchema5',document.currentScript?.src||'js/02-schema5.js')}catch(_){}
(function(root,factory){
  'use strict';
  const registry=root?.RosterBotPersistenceRegistry||(typeof module!=='undefined'&&module.exports?require('./01-persistence-registry.js'):null);
  const canonical=root?.RosterBotCanonicalPersistence||(typeof module!=='undefined'&&module.exports?require('./02-canonical-state.js'):null);
  if(!registry){const message='RosterBot startup dependency missing:\n02-schema5 expected persistence registry';if(root&&root.RosterBotBootDiagnostics)root.RosterBotBootDiagnostics.dependency('02-schema5','persistence registry',registry);throw new Error(message)}
  if(!canonical){const message='RosterBot startup dependency missing:\n02-schema5 expected canonical persistence';if(root&&root.RosterBotBootDiagnostics)root.RosterBotBootDiagnostics.dependency('02-schema5','canonical persistence',canonical);throw new Error(message)}
  const api=factory(registry,canonical);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotSchema5=api;
})(typeof window!=='undefined'?window:globalThis,function(defaultRegistry,defaultCanonical){
  'use strict';

  const SCHEMA5_FORMAT='rosterbot-personal-state';
  const SCHEMA5_FORMAT_VERSION=1;
  const SCHEMA5_STORAGE_SCHEMA=5;
  const SCHEMA5_MINIMUM_READER_SCHEMA=5;
  const SCHEMA5_CHECKSUM_SCOPE='rosterbot-schema5-content-v1';
  const SCHEMA5_CANONICALISATION='rosterbot-canonical-json-v1';
  const SNAPSHOT_FORMAT='rosterbot-schema4-pre-migration-snapshot-v1';
  const RECOVERABLE=new Set(['valid','legacy']);
  const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
  const hashPattern=/^[a-f0-9]{64}$/;

  function copyJson(value,canonical=defaultCanonical){
    const serialised=canonical.canonicalSerialise(value);
    if(!serialised.ok)throw new TypeError(serialised.reason);
    return JSON.parse(serialised.text);
  }
  async function sha256(value,{canonical=defaultCanonical,cryptoImpl=globalThis.crypto}={}){
    const serialised=canonical.canonicalSerialise(value);
    if(!serialised.ok)return serialised;
    if(!cryptoImpl?.subtle||typeof TextEncoder==='undefined')return {ok:false,kind:'unavailable',reason:'Web Crypto SHA-256 is unavailable'};
    try{
      const bytes=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(serialised.text));
      return {ok:true,value:[...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join(''),serialised:serialised.text};
    }catch(error){return {ok:false,kind:'unavailable',reason:error?.message||String(error),error}}
  }
  function schema5Identity(envelope){return {format:envelope.format,formatVersion:envelope.formatVersion,storageSchemaVersion:envelope.storageSchemaVersion,personalState:envelope.personalState,extensions:envelope.extensions}}
  function sourceErrors(candidate){
    if(!candidate||candidate.format!==defaultCanonical.CANDIDATE_FORMAT)return [{code:'SOURCE_NOT_CANONICAL',message:'Input is not a Phase 6 canonical candidate.'}];
    if(Number(candidate.schemaVersion)!==4)return [{code:'SOURCE_SCHEMA_UNSUPPORTED',message:`Expected schema 4, received schema ${candidate.schemaVersion}.`}];
    if(candidate.status==='valid')return [];
    return (candidate.problems||[]).map(problem=>({code:problem.state==='malformed'?'SOURCE_MALFORMED':'SOURCE_UNSUPPORTED',key:problem.key,sourceKey:problem.sourceKey,state:problem.state,message:problem.reason||`${problem.key} is not migratable.`}));
  }
  function sourceWarnings(candidate){
    const warnings=[];
    for(const [key,entry] of Object.entries(candidate.entries||{})){
      if(entry?.presence!=='present')continue;
      if(entry.sourceKey&&entry.sourceKey!==key)warnings.push({code:'COMPATIBILITY_ALIAS_PROMOTED',key,sourceKey:entry.sourceKey});
      else if(entry.state==='legacy')warnings.push({code:'LEGACY_SHAPE_PRESERVED',key,sourceKey:entry.sourceKey||key});
    }
    return warnings;
  }
  function candidateFromEnvelope(envelope,{canonical=defaultCanonical}={}){
    const entries={};
    for(const [key,entry] of Object.entries(envelope.personalState.entries))entries[key]=entry.presence==='missing'?{presence:'missing',state:'missing'}:{presence:'present',state:'valid',sourceKey:key,value:copyJson(entry.value,canonical),raw:JSON.stringify(entry.value)};
    return {format:canonical.CANDIDATE_FORMAT,schemaVersion:4,source:'schema5-compatibility-projection',status:'valid',entries,problems:[],raw:{}};
  }
  async function validateSchema5Envelope(envelope,{registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto}={}){
    const errors=[];
    if(!isObject(envelope))return {ok:false,errors:[{code:'ENVELOPE_NOT_OBJECT',message:'Schema-5 envelope must be an object.'}]};
    const envelopeKeys=['checksum','compatibility','extensions','format','formatVersion','generation','migration','minimumReaderSchema','personalState','previousGeneration','storageSchemaVersion','timestamps','writer'];
    if(JSON.stringify(Object.keys(envelope).sort())!==JSON.stringify(envelopeKeys))errors.push({code:'ENVELOPE_FIELDS_INVALID',message:'Unknown envelope fields must use the extensions object.'});
    if(envelope.format!==SCHEMA5_FORMAT)errors.push({code:'FORMAT_UNSUPPORTED',message:'Schema-5 format identifier is unsupported.'});
    if(envelope.formatVersion!==SCHEMA5_FORMAT_VERSION)errors.push({code:'FORMAT_VERSION_UNSUPPORTED',message:'Schema-5 format version is unsupported.'});
    if(envelope.storageSchemaVersion!==SCHEMA5_STORAGE_SCHEMA)errors.push({code:'STORAGE_SCHEMA_UNSUPPORTED',message:'Storage schema must be 5.'});
    if(envelope.minimumReaderSchema!==SCHEMA5_MINIMUM_READER_SCHEMA)errors.push({code:'MINIMUM_READER_INVALID',message:'Minimum reader schema must be 5.'});
    if(!isObject(envelope.writer)||JSON.stringify(Object.keys(envelope.writer).sort())!==JSON.stringify(['app','build','version'])||envelope.writer.app!=='RosterBotPayBot'||typeof envelope.writer.version!=='string'||!envelope.writer.version||typeof envelope.writer.build!=='string'||!envelope.writer.build)errors.push({code:'WRITER_INVALID',message:'Writer app, version and build are required.'});
    if(!isObject(envelope.timestamps)||JSON.stringify(Object.keys(envelope.timestamps).sort())!==JSON.stringify(['createdAt','updatedAt'])||!iso(envelope.timestamps.createdAt)||!iso(envelope.timestamps.updatedAt))errors.push({code:'TIMESTAMPS_INVALID',message:'Creation and update timestamps must be ISO-compatible.'});
    if(!isObject(envelope.personalState)||JSON.stringify(Object.keys(envelope.personalState).sort())!==JSON.stringify(['entries','kind'])||!['state','clear'].includes(envelope.personalState.kind)||!isObject(envelope.personalState.entries))errors.push({code:'PERSONAL_STATE_INVALID',message:'Personal state entries and state/clear kind are required.'});
    if(!isObject(envelope.extensions)||Object.keys(envelope.extensions||{}).some(key=>!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(key)))errors.push({code:'EXTENSIONS_INVALID',message:'Extensions must be an object with namespaced keys.'});
    const provenance=envelope.migration,sourceGeneration=provenance?.sourceGeneration;
    if(!isObject(provenance)||JSON.stringify(Object.keys(provenance).sort())!==JSON.stringify(['fromSchema','migratedAt','source','sourceFingerprint','sourceGeneration','warnings'])||provenance.fromSchema!==4||!iso(provenance.migratedAt)||typeof provenance.source!=='string'||!provenance.source||!hashPattern.test(String(provenance.sourceFingerprint||''))||!Array.isArray(provenance.warnings)||(sourceGeneration!=null&&(!isObject(sourceGeneration)||JSON.stringify(Object.keys(sourceGeneration).sort())!==JSON.stringify(['fingerprint','number'])||!Number.isSafeInteger(sourceGeneration.number)||sourceGeneration.number<1||!hashPattern.test(String(sourceGeneration.fingerprint||'')))))errors.push({code:'PROVENANCE_INVALID',message:'Schema-4 migration provenance is invalid.'});
    if(!isObject(envelope.compatibility)||JSON.stringify(Object.keys(envelope.compatibility).sort())!==JSON.stringify(['projectionFingerprint','schemaVersion','status'])||envelope.compatibility.schemaVersion!==4||envelope.compatibility.status!=='lossless'||!hashPattern.test(String(envelope.compatibility.projectionFingerprint||''))||envelope.compatibility.projectionFingerprint!==provenance?.sourceFingerprint)errors.push({code:'COMPATIBILITY_INVALID',message:'Initial schema-4 lossless projection metadata is invalid.'});
    const generation=envelope.generation;
    if(!isObject(generation)||JSON.stringify(Object.keys(generation).sort())!==JSON.stringify(['fingerprint','id','kind','number','predecessorFingerprint'])||!Number.isSafeInteger(generation.number)||generation.number<1||!['state','clear'].includes(generation.kind)||generation.kind!==envelope.personalState?.kind||!hashPattern.test(String(generation.fingerprint||''))||generation.id!==`${generation.number}:${generation.fingerprint}`||(generation.predecessorFingerprint!=null&&!hashPattern.test(String(generation.predecessorFingerprint))))errors.push({code:'GENERATION_INVALID',message:'Generation identity is invalid.'});
    const checksum=envelope.checksum;
    if(!isObject(checksum)||JSON.stringify(Object.keys(checksum).sort())!==JSON.stringify(['algorithm','canonicalisation','scope','value'])||checksum.algorithm!=='SHA-256'||checksum.canonicalisation!==SCHEMA5_CANONICALISATION||checksum.scope!==SCHEMA5_CHECKSUM_SCOPE||!hashPattern.test(String(checksum.value||'')))errors.push({code:'CHECKSUM_INVALID',message:'Checksum metadata is invalid.'});
    const previous=envelope.previousGeneration;
    if(previous!=null&&(!isObject(previous)||JSON.stringify(Object.keys(previous).sort())!==JSON.stringify(['fingerprint','number','storageSchemaVersion'])||![4,5].includes(previous.storageSchemaVersion)||!Number.isSafeInteger(previous.number)||previous.number<1||!hashPattern.test(String(previous.fingerprint||''))||previous.fingerprint!==generation?.predecessorFingerprint))errors.push({code:'PREVIOUS_GENERATION_INVALID',message:'Previous generation reference is invalid.'});
    if(errors.length)return {ok:false,errors};
    const expectedKeys=canonical.stateKeys(registry),actualKeys=Object.keys(envelope.personalState.entries).sort();
    if(JSON.stringify(actualKeys)!==JSON.stringify(expectedKeys))errors.push({code:'PERSONAL_KEYS_INVALID',message:'Personal entries must contain every and only canonical schema-4 personal key.'});
    for(const key of expectedKeys){
      const entry=envelope.personalState.entries[key];
      if(!isObject(entry)||!['missing','present'].includes(entry.presence)||JSON.stringify(Object.keys(entry).sort())!==(entry.presence==='missing'?JSON.stringify(['presence']):JSON.stringify(['presence','value']))){errors.push({code:'ENTRY_INVALID',key,message:'Entry presence must be missing or present with exact fields.'});continue}
      if(entry.presence==='missing'){if(Object.keys(entry).length!==1)errors.push({code:'MISSING_ENTRY_HAS_VALUE',key,message:'Missing entries cannot contain a value.'});continue}
      const checked=registry.validate(key,JSON.stringify(entry.value));
      if(!RECOVERABLE.has(checked.state))errors.push({code:'ENTRY_UNPROJECTABLE',key,message:checked.reason||checked.state});
    }
    if(errors.length)return {ok:false,errors};
    const hashed=await sha256(schema5Identity(envelope),{canonical,cryptoImpl});
    if(!hashed.ok)return {ok:false,errors:[{code:'CHECKSUM_UNAVAILABLE',message:hashed.reason}]};
    if(hashed.value!==checksum.value||hashed.value!==generation.fingerprint)return {ok:false,errors:[{code:'CHECKSUM_MISMATCH',message:'Envelope content does not match its checksum and generation fingerprint.'}]};
    const projection=canonical.toSchema4Projection(candidateFromEnvelope(envelope,{canonical}),{registry});
    if(!projection.ok)return {ok:false,errors:[{code:'PROJECTION_FAILED',message:projection.reason}]};
    const projectedCandidate=canonical.fromLocalStorage(projection.storage,{registry}),projectedHash=await canonical.fingerprint(projectedCandidate,{cryptoImpl});
    if(!projectedHash.ok||projectedHash.value!==envelope.compatibility.projectionFingerprint)return {ok:false,errors:[{code:'PROJECTION_FINGERPRINT_MISMATCH',message:'Schema-4 compatibility projection fingerprint does not verify.'}]};
    return {ok:true,fingerprint:hashed.value,projection};
  }
  async function migrateSchema4To5(input,options={}){
    const registry=options.registry||defaultRegistry,canonical=options.canonical||defaultCanonical,cryptoImpl=options.cryptoImpl||globalThis.crypto;
    if(input?.format===SCHEMA5_FORMAT){
      const checked=await validateSchema5Envelope(input,{registry,canonical,cryptoImpl});
      return checked.ok?{ok:true,alreadyMigrated:true,envelope:copyJson(input,canonical),fingerprint:checked.fingerprint,warnings:[]}:{ok:false,classification:'recovery-required',errors:checked.errors,warnings:[]};
    }
    const errors=sourceErrors(input);
    if(errors.length)return {ok:false,classification:errors.some(error=>error.code==='SOURCE_MALFORMED')?'malformed-source':'unsupported-source',errors,warnings:[]};
    const timestamp=options.migrationTimestamp,writer=options.writer;
    if(!iso(timestamp))errors.push({code:'MIGRATION_TIMESTAMP_REQUIRED',message:'Caller must supply a deterministic ISO-compatible migration timestamp.'});
    if(!isObject(writer)||writer.app!=='RosterBotPayBot'||typeof writer.version!=='string'||!writer.version||typeof writer.build!=='string'||!writer.build)errors.push({code:'WRITER_REQUIRED',message:'Caller must supply the RosterBotPayBot writer version and build.'});
    if(!['state','clear'].includes(options.kind||'state'))errors.push({code:'KIND_INVALID',message:'Migration kind must be state or clear.'});
    if(errors.length)return {ok:false,classification:'invalid-migration-metadata',errors,warnings:[]};
    const sourceHash=await canonical.fingerprint(input,{cryptoImpl});
    if(!sourceHash.ok)return {ok:false,classification:'fingerprint-failed',errors:[{code:'SOURCE_FINGERPRINT_FAILED',message:sourceHash.reason}],warnings:[]};
    const sourceGeneration=options.sourceGeneration||null;
    if(sourceGeneration&&(!Number.isSafeInteger(sourceGeneration.generation)||sourceGeneration.generation<1||sourceGeneration.verification!=='verified'||sourceGeneration.fingerprint!==sourceHash.value))return {ok:false,classification:'invalid-generation',errors:[{code:'SOURCE_GENERATION_INVALID',message:'Source generation must be verified and match the schema-4 candidate fingerprint.'}],warnings:[]};
    const entries={};for(const key of canonical.stateKeys(registry)){const entry=input.entries[key];entries[key]=entry.presence==='missing'?{presence:'missing'}:{presence:'present',value:copyJson(entry.value,canonical)}}
    const extensions=copyJson(options.extensions||{},canonical),kind=options.kind||'state',generationNumber=sourceGeneration?sourceGeneration.generation+1:(options.generationNumber??1);
    if(!Number.isSafeInteger(generationNumber)||generationNumber<1)return {ok:false,classification:'invalid-generation',errors:[{code:'GENERATION_NUMBER_INVALID',message:'Target generation number must be a positive safe integer.'}],warnings:[]};
    const warnings=[...sourceWarnings(input),...(options.detectionWarnings||[])].map(item=>copyJson(item,canonical));
    const envelope={format:SCHEMA5_FORMAT,formatVersion:SCHEMA5_FORMAT_VERSION,storageSchemaVersion:SCHEMA5_STORAGE_SCHEMA,minimumReaderSchema:SCHEMA5_MINIMUM_READER_SCHEMA,writer:copyJson(writer,canonical),generation:{number:generationNumber,id:'',kind,fingerprint:'',predecessorFingerprint:sourceGeneration?.fingerprint||null},checksum:{algorithm:'SHA-256',canonicalisation:SCHEMA5_CANONICALISATION,scope:SCHEMA5_CHECKSUM_SCOPE,value:''},timestamps:{createdAt:new Date(timestamp).toISOString(),updatedAt:new Date(timestamp).toISOString()},personalState:{kind,entries},extensions,migration:{fromSchema:4,migratedAt:new Date(timestamp).toISOString(),source:options.source||input.source||'resolved-schema4',sourceFingerprint:sourceHash.value,sourceGeneration:sourceGeneration?{number:sourceGeneration.generation,fingerprint:sourceGeneration.fingerprint}:null,warnings},previousGeneration:sourceGeneration?{storageSchemaVersion:4,number:sourceGeneration.generation,fingerprint:sourceGeneration.fingerprint}:null,compatibility:{schemaVersion:4,status:'lossless',projectionFingerprint:sourceHash.value}};
    const hashed=await sha256(schema5Identity(envelope),{canonical,cryptoImpl});
    if(!hashed.ok)return {ok:false,classification:'fingerprint-failed',errors:[{code:'TARGET_FINGERPRINT_FAILED',message:hashed.reason}],warnings};
    envelope.generation.fingerprint=hashed.value;envelope.generation.id=`${generationNumber}:${hashed.value}`;envelope.checksum.value=hashed.value;
    const checked=await validateSchema5Envelope(envelope,{registry,canonical,cryptoImpl});
    if(!checked.ok)return {ok:false,classification:'target-invalid',errors:checked.errors,warnings};
    return {ok:true,alreadyMigrated:false,envelope,fingerprint:hashed.value,sourceFingerprint:sourceHash.value,warnings,compatibilityProjection:checked.projection};
  }
  function classifySchema4Installation({schemaMarker=null,candidate,reconciliationIssue='identical',schema5Present=false,journalPresent=false,clearAuthoritative=false,source='localStorage',unknownAppKeys=[]}={}){
    if(schema5Present)return {classification:'schema5-present',migrationCandidate:false,restartAction:'read-schema5'};
    if(journalPresent)return {classification:'migration-incomplete',migrationCandidate:false,restartAction:'resume-journal'};
    if(schemaMarker!=null&&/^\d+$/.test(String(schemaMarker))&&Number(schemaMarker)>4)return {classification:'newer-schema',migrationCandidate:false,restartAction:'recovery-ui',warnings:[]};
    if(unknownAppKeys.length)return {classification:'unknown-app-data',migrationCandidate:false,restartAction:'recovery-ui',errors:unknownAppKeys.map(key=>({code:'UNKNOWN_APP_KEY',key,message:'Unregistered app-owned data requires a reviewed classification.'})),warnings:[]};
    if(['conflict','unsupported','unrecoverable','malformed-local-recoverable','malformed-indexeddb-recoverable'].includes(reconciliationIssue))return {classification:reconciliationIssue,migrationCandidate:false,restartAction:'recovery-ui',warnings:[]};
    const errors=sourceErrors(candidate);if(errors.length)return {classification:errors.some(error=>error.code==='SOURCE_MALFORMED')?'malformed-source':'unsupported-source',migrationCandidate:false,restartAction:'recovery-ui',errors,warnings:[]};
    const warnings=[];if(schemaMarker==null)warnings.push({code:'SCHEMA_MARKER_MISSING'});else if(String(schemaMarker)!=='4')warnings.push({code:'SCHEMA_MARKER_UNTRUSTED',value:String(schemaMarker)});
    return {classification:clearAuthoritative?'schema4-explicit-clear':'schema4-candidate',migrationCandidate:true,restartAction:'stage-migration',kind:clearAuthoritative?'clear':'state',source,warnings};
  }
  async function makePreMigrationSnapshot(candidate,{createdAt,sourceGeneration=null,kind='state',clearTombstone=null,registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto}={}){
    const errors=sourceErrors(candidate);if(errors.length||!iso(createdAt))return {ok:false,errors:[...errors,...(!iso(createdAt)?[{code:'SNAPSHOT_TIMESTAMP_REQUIRED',message:'Snapshot creation timestamp is required.'}]:[])]};
    const fingerprint=await canonical.fingerprint(candidate,{cryptoImpl});if(!fingerprint.ok)return {ok:false,errors:[{code:'SNAPSHOT_FINGERPRINT_FAILED',message:fingerprint.reason}]};
    const projection=canonical.toSchema4Projection(candidate,{registry});if(!projection.ok)return {ok:false,errors:[{code:'SNAPSHOT_PROJECTION_FAILED',message:projection.reason}]};
    const preservedRawPersonal={};for(const [key,raw] of Object.entries(candidate.raw||{})){const item=registry.get(key);if(item?.category==='personal')preservedRawPersonal[key]=String(raw)}
    return {ok:true,snapshot:{format:SNAPSHOT_FORMAT,createdAt:new Date(createdAt).toISOString(),sourceSchemaVersion:4,kind,fingerprint:fingerprint.value,sourceGeneration:sourceGeneration?copyJson(sourceGeneration,canonical):null,clearTombstone:kind==='clear'&&iso(clearTombstone)?String(clearTombstone):null,projection:{schemaVersion:4,storage:{...projection.storage}},preservedRawPersonal,excludes:['credentials','device-only preferences','caches/derived data','cloud/session/encryption material'],retention:{policy:'indefinite-until-reviewed-cleanup',automaticDeletionAllowed:false}}};
  }
  const JOURNAL_STATES=Object.freeze(['not-started','snapshot-created','candidate-built','candidate-validated','schema5-written','schema5-verified','compatibility-projection-written','complete','rollback-required','failed']);
  const JOURNAL_CONTRACT=Object.freeze({
    'not-started':{definite:'no migration write',notDone:'snapshot and all schema-5 writes',restart:'re-evaluate schema-4 input',automatic:true,ui:false},
    'snapshot-created':{definite:'verified credential-free schema-4 snapshot retained',notDone:'schema-5 candidate and live writes',restart:'verify snapshot then rebuild candidate',automatic:true,ui:false},
    'candidate-built':{definite:'snapshot retained and deterministic candidate descriptor/checksum is durable',notDone:'candidate validation and live writes',restart:'rebuild and byte-compare candidate',automatic:true,ui:false},
    'candidate-validated':{definite:'candidate checksum, projection and snapshot verified',notDone:'schema-5 and compatibility writes',restart:'revalidate then write schema 5',automatic:true,ui:false},
    'schema5-written':{definite:'schema-5 bytes written but not trusted',notDone:'read-back verification, projection and marker',restart:'read back; verify or roll back',automatic:true,ui:false},
    'schema5-verified':{definite:'schema-5 read-back checksum verified; schema marker is still 4/missing',notDone:'compatibility projection and schema marker',restart:'write and verify compatibility projection',automatic:true,ui:false},
    'compatibility-projection-written':{definite:'schema 5 and schema-4 projection written',notDone:'projection verification, marker advance and completion',restart:'verify both views; then advance marker last',automatic:true,ui:false},
    'complete':{definite:'schema 5, projection and marker 5 all verified',notDone:'none',restart:'normal schema-5 startup verification',automatic:true,ui:false},
    'rollback-required':{definite:'a post-write verification failed; snapshot is retained',notDone:'verified restoration',restart:'restore snapshot transactionally and verify',automatic:true,ui:false},
    'failed':{definite:'automatic migration/rollback could not establish a verified state',notDone:'safe authority decision',restart:'preserve all evidence and open recovery UI',automatic:false,ui:true}
  });
  return Object.freeze({SCHEMA5_FORMAT,SCHEMA5_FORMAT_VERSION,SCHEMA5_STORAGE_SCHEMA,SCHEMA5_MINIMUM_READER_SCHEMA,SCHEMA5_CHECKSUM_SCOPE,SCHEMA5_CANONICALISATION,SNAPSHOT_FORMAT,JOURNAL_STATES,JOURNAL_CONTRACT,schema5Identity,validateSchema5Envelope,migrateSchema4To5,classifySchema4Installation,makePreMigrationSnapshot,candidateFromEnvelope,copyJson,sha256});
});
try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.complete('02-schema5','RosterBotSchema5',document.currentScript?.src||'js/02-schema5.js')}catch(_){}
