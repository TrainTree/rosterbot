try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.start('03-schema5-migration','RosterBotSchema5Migration',document.currentScript?.src||'js/03-schema5-migration.js')}catch(_){}
(function(root,factory){
  'use strict';
  const registry=root?.RosterBotPersistenceRegistry||(typeof module!=='undefined'&&module.exports?require('./01-persistence-registry.js'):null);
  const canonical=root?.RosterBotCanonicalPersistence||(typeof module!=='undefined'&&module.exports?require('./02-canonical-state.js'):null);
  const schema5=root?.RosterBotSchema5||(typeof module!=='undefined'&&module.exports?require('./02-schema5.js'):null);
  if(!registry){const message='RosterBot startup dependency missing:\n03-schema5-migration expected persistence registry';if(root&&root.RosterBotBootDiagnostics)root.RosterBotBootDiagnostics.dependency('03-schema5-migration','persistence registry',registry);throw new Error(message)}
  if(!canonical){const message='RosterBot startup dependency missing:\n03-schema5-migration expected canonical persistence';if(root&&root.RosterBotBootDiagnostics)root.RosterBotBootDiagnostics.dependency('03-schema5-migration','canonical persistence',canonical);throw new Error(message)}
  if(!schema5){const message='RosterBot startup dependency missing:\n03-schema5-migration expected schema-5 contract';if(root&&root.RosterBotBootDiagnostics)root.RosterBotBootDiagnostics.dependency('03-schema5-migration','schema-5 contract',schema5);throw new Error(message)}
  const api=factory(registry,canonical,schema5);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotSchema5Migration=api;
})(typeof window!=='undefined'?window:globalThis,function(defaultRegistry,defaultCanonical,schema5){
  'use strict';

  const KEYS=Object.freeze({
    marker:'rosterbot-db-schema-v1',guard:'rosterbot-storage-guard-v1',envelope:'rosterbot-personal-state-v1',
    journal:'rosterbot-schema5-migration-journal-v1',snapshot:'rosterbot-schema4-pre-migration-snapshot-v1',clear:'rosterbot-cleared-v1'
  });
  const JOURNAL_FORMAT='rosterbot-schema5-migration-journal';
  const JOURNAL_VERSION=1;
  const WRITER=Object.freeze({app:'RosterBotPayBot',version:'0.30.0',build:'20261006-phase9-local-schema5'});
  const CHECKPOINT=Object.freeze(Object.fromEntries(schema5.JOURNAL_STATES.map((state,index)=>[state,index])));
  const appOwned=key=>/^(?:rosterbot|paybot)-/.test(String(key||''));
  const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const parse=raw=>{try{return {ok:true,value:JSON.parse(String(raw))}}catch(error){return {ok:false,error}}};
  const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
  const exactRow=(rows,key)=>rows instanceof Map?(rows.get(key)||null):(rows||[]).find(row=>row?.key===key)||null;
  const rawFor=(row)=>row&&typeof row==='object'&&Object.prototype.hasOwnProperty.call(row,'value')?row.value:row;

  function interruption(name,interruptAt){
    if(!interruptAt||interruptAt!==name)return;
    const error=new Error(`Simulated migration interruption at ${name}`);error.interrupted=true;error.interruptAt=name;throw error;
  }
  function journalValid(value){
    return isObject(value)&&value.format===JOURNAL_FORMAT&&value.formatVersion===JOURNAL_VERSION&&schema5.JOURNAL_STATES.includes(value.state)&&value.checkpoint===CHECKPOINT[value.state]&&typeof value.migrationId==='string'&&value.migrationId.startsWith('4to5:')&&isObject(value.source)&&/^[a-f0-9]{64}$/.test(String(value.source.fingerprint||''))&&isObject(value.writer)&&isObject(value.timestamps)&&iso(value.timestamps.startedAt)&&iso(value.timestamps.updatedAt);
  }
  function parseJournal(raw){const parsed=parse(raw);return parsed.ok&&journalValid(parsed.value)?{ok:true,value:parsed.value,raw:String(raw)}:{ok:false,reason:parsed.ok?'journal contract is invalid':'journal is not valid JSON'}}
  async function readBoth(indexedDbTarget,storage,key){
    const rows=await indexedDbTarget.read([key]);return {local:storage.getItem(key),indexed:rawFor(rows.get(key)||null)};
  }
  async function restoreRaw({storage,indexedDbTarget,key,beforeLocal,beforeIndexed}){
    let error=null;
    try{if(beforeLocal==null)storage.removeItem(key);else storage.setItem(key,beforeLocal)}catch(cause){error=cause}
    try{await indexedDbTarget.apply({put:beforeIndexed==null?[]:[{key,value:beforeIndexed,updatedAt:new Date().toISOString()}],remove:beforeIndexed==null?[key]:[]})}catch(cause){error=error||cause}
    const reread=await readBoth(indexedDbTarget,storage,key).catch(()=>({local:undefined,indexed:undefined}));
    return {ok:!error&&reread.local===beforeLocal&&reread.indexed===beforeIndexed,error};
  }
  async function dualWriteRaw({storage,indexedDbTarget,key,raw,interruptAt,during}){
    const before=await readBoth(indexedDbTarget,storage,key);
    try{
      storage.setItem(key,raw);interruption(during,interruptAt);
      await indexedDbTarget.apply({put:[{key,value:raw,updatedAt:new Date().toISOString()}],remove:[]});
      const reread=await readBoth(indexedDbTarget,storage,key);
      if(reread.local!==raw||reread.indexed!==raw)throw new Error(`Exact dual-store verification failed for ${key}`);
      return {ok:true};
    }catch(error){
      if(error.interrupted)throw error;
      const rollback=await restoreRaw({storage,indexedDbTarget,key,beforeLocal:before.local,beforeIndexed:before.indexed});
      return {ok:false,error,rolledBack:true,rollbackVerified:rollback.ok,rollbackError:rollback.error};
    }
  }
  async function dualProjectionWrite({storage,indexedDbTarget,projection,registry=defaultRegistry,interruptAt}){
    const canonicalKeys=defaultCanonical.stateKeys(registry),aliasKeys=canonicalKeys.flatMap(key=>registry.compatibilityKeys(key)).filter(key=>!canonicalKeys.includes(key));
    const allKeys=[...new Set([...canonicalKeys,...aliasKeys])],rows=await indexedDbTarget.read(allKeys),beforeLocal=Object.fromEntries(allKeys.map(key=>[key,storage.getItem(key)])),beforeRows=new Map(allKeys.map(key=>[key,rows.get(key)||null]));
    const writes=Object.entries(projection.storage),writeMap=new Map(writes),removals=allKeys.filter(key=>!writeMap.has(key));
    const rollback=async()=>{
      let error=null;
      try{for(const key of allKeys){const raw=beforeLocal[key];if(raw==null)storage.removeItem(key);else storage.setItem(key,raw)}}catch(cause){error=cause}
      try{await indexedDbTarget.apply({put:[...beforeRows.values()].filter(Boolean),remove:allKeys.filter(key=>!beforeRows.get(key))})}catch(cause){error=error||cause}
      const verifyRows=await indexedDbTarget.read(allKeys).catch(()=>new Map());let verified=!error;
      for(const key of allKeys){if(storage.getItem(key)!==beforeLocal[key]||rawFor(verifyRows.get(key)||null)!==rawFor(beforeRows.get(key)||null))verified=false}
      return {verified,error};
    };
    try{
      for(const [key,raw] of writes)storage.setItem(key,raw);for(const key of removals)storage.removeItem(key);
      interruption('during-compatibility-projection',interruptAt);
      await indexedDbTarget.apply({put:writes.map(([key,value])=>({key,value,updatedAt:new Date().toISOString()})),remove:removals});
      const verifyRows=await indexedDbTarget.read(allKeys);
      for(const key of allKeys){const expected=writeMap.get(key)??null;if(storage.getItem(key)!==expected||rawFor(verifyRows.get(key)||null)!==expected)throw new Error(`Compatibility projection verification failed for ${key}`)}
      return {ok:true,written:[...writeMap.keys()],removed:removals};
    }catch(error){if(error.interrupted)throw error;const rolled=await rollback();return {ok:false,error,rolledBack:true,rollbackVerified:rolled.verified,rollbackError:rolled.error}}
  }
  async function writeJournal({storage,indexedDbTarget,journal,state,now,patch={}}){
    const next={...journal,...patch,state,checkpoint:CHECKPOINT[state],timestamps:{...journal.timestamps,updatedAt:now},verification:{...journal.verification,...(patch.verification||{})}};
    const raw=JSON.stringify(next),written=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.journal,raw});
    if(!written.ok)throw Object.assign(written.error||new Error('Migration journal write failed'),{migrationFailure:written});
    return next;
  }
  async function snapshotCheck(snapshot,{registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto}={}){
    const errors=[];
    if(!isObject(snapshot)||snapshot.format!==schema5.SNAPSHOT_FORMAT||snapshot.sourceSchemaVersion!==4||!['state','clear'].includes(snapshot.kind)||!isObject(snapshot.projection)||snapshot.projection.schemaVersion!==4||!isObject(snapshot.projection.storage)||!isObject(snapshot.preservedRawPersonal)||snapshot.retention?.policy!=='indefinite-until-reviewed-cleanup'||snapshot.retention?.automaticDeletionAllowed!==false)errors.push({code:'SNAPSHOT_CONTRACT_INVALID'});
    if(errors.length)return {ok:false,errors};
    const candidate=canonical.fromLocalStorage(snapshot.preservedRawPersonal,{registry}),fingerprint=await canonical.fingerprint(candidate,{cryptoImpl});
    if(!fingerprint.ok||fingerprint.value!==snapshot.fingerprint)errors.push({code:'SNAPSHOT_FINGERPRINT_MISMATCH'});
    const projectionCandidate=canonical.fromLocalStorage(snapshot.projection.storage,{registry}),projectionFingerprint=await canonical.fingerprint(projectionCandidate,{cryptoImpl});
    if(!projectionFingerprint.ok||projectionFingerprint.value!==snapshot.fingerprint)errors.push({code:'SNAPSHOT_PROJECTION_MISMATCH'});
    if(Object.keys(snapshot.preservedRawPersonal).some(key=>registry.get(key)?.category!=='personal'))errors.push({code:'SNAPSHOT_CLASSIFICATION_VIOLATION'});
    return {ok:errors.length===0,errors,candidate,fingerprint:fingerprint.value};
  }
  async function verifyProjection({storage,indexedDbTarget,expectedFingerprint,registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto}){
    const canonicalKeys=canonical.stateKeys(registry),keys=[...new Set(canonicalKeys.flatMap(key=>registry.compatibilityKeys(key)))],rows=await indexedDbTarget.read(keys),local=canonical.fromLocalStorage(storage,{registry}),indexed=canonical.fromIndexedDb([...rows.values()].filter(Boolean),{registry}),[localHash,indexedHash]=await Promise.all([canonical.fingerprint(local,{cryptoImpl}),canonical.fingerprint(indexed,{cryptoImpl})]);
    return {ok:localHash.ok&&indexedHash.ok&&localHash.value===expectedFingerprint&&indexedHash.value===expectedFingerprint,localHash,indexedHash};
  }
  function makeGuard(journal,envelope,completedAt){return {format:'rosterbot-storage-guard',formatVersion:1,migratedSchema:5,minimumReaderSchema:5,minimumWriterSchema:5,migrationEvidence:{migrationId:journal.migrationId,sourceFingerprint:journal.source.fingerprint,targetFingerprint:envelope.generation.fingerprint,completedAt},compatibilityProjection:{schemaVersion:4,status:'lossless',fingerprint:envelope.compatibility.projectionFingerprint}}}
  async function verifyEnvelopeCopies({storage,indexedDbTarget,raw,registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto}){
    const copies=await readBoth(indexedDbTarget,storage,KEYS.envelope);if(copies.local!==raw||copies.indexed!==raw)return {ok:false,reason:'schema-5 exact bytes differ across stores'};
    const parsed=parse(raw);if(!parsed.ok)return {ok:false,reason:'schema-5 state is not valid JSON'};
    const checked=await schema5.validateSchema5Envelope(parsed.value,{registry,canonical,cryptoImpl});return checked.ok?{ok:true,envelope:parsed.value,checked}:{ok:false,reason:'schema-5 envelope validation failed',errors:checked.errors};
  }
  async function rollbackFromSnapshot({storage,indexedDbTarget,snapshot,journal,registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto,now}){
    const checked=await snapshotCheck(snapshot,{registry,canonical,cryptoImpl});if(!checked.ok)return {ok:false,stage:'snapshot-validation',errors:checked.errors};
    const projection={storage:snapshot.preservedRawPersonal},written=await dualProjectionWrite({storage,indexedDbTarget,projection,registry});if(!written.ok)return {ok:false,stage:'rollback-write',...written};
    const verified=await verifyProjection({storage,indexedDbTarget,expectedFingerprint:snapshot.fingerprint,registry,canonical,cryptoImpl});if(!verified.ok)return {ok:false,stage:'rollback-verification',verified};
    try{
      if(snapshot.clearTombstone)storage.setItem(KEYS.clear,snapshot.clearTombstone);else storage.removeItem(KEYS.clear);
      const marker=journal.source.markerRaw;if(marker==null)storage.removeItem(KEYS.marker);else storage.setItem(KEYS.marker,String(marker));
      await indexedDbTarget.apply({put:marker==null?[]:[{key:KEYS.marker,value:String(marker),updatedAt:now}],remove:marker==null?[KEYS.marker]:[]});
      const markerCopies=await readBoth(indexedDbTarget,storage,KEYS.marker);if(markerCopies.local!==(marker==null?null:String(marker))||markerCopies.indexed!==(marker==null?null:String(marker)))throw new Error('Schema-4 marker rollback did not verify');
    }catch(error){return {ok:false,stage:'rollback-marker',error}}
    return {ok:true,stage:'rollback-verified',fingerprint:snapshot.fingerprint};
  }
  async function readJournalPair({storage,indexedDbTarget}){
    const copies=await readBoth(indexedDbTarget,storage,KEYS.journal),local=copies.local==null?null:parseJournal(copies.local),indexed=copies.indexed==null?null:parseJournal(copies.indexed);
    if((local&&!local.ok)||(indexed&&!indexed.ok))return {ok:false,reason:'A migration journal copy is malformed.',copies,local,indexed};
    if(!local&&!indexed)return {ok:true,journal:null,copies};
    const available=[local,indexed].filter(Boolean).map(item=>item.value),ids=new Set(available.map(item=>item.migrationId)),sources=new Set(available.map(item=>item.source.fingerprint));
    if(ids.size!==1||sources.size!==1)return {ok:false,reason:'Migration journal copies describe different migrations.',copies,local,indexed};
    const journal=available.sort((a,b)=>a.checkpoint-b.checkpoint)[0];
    return {ok:true,journal,copies,ahead:local&&indexed&&local.value.checkpoint!==indexed.value.checkpoint};
  }
  async function existingSchema5({storage,indexedDbTarget,registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto}){
    const copies=await readBoth(indexedDbTarget,storage,KEYS.envelope);if(copies.local==null&&copies.indexed==null)return {present:false};
    if(copies.local==null||copies.indexed==null||copies.local!==copies.indexed)return {present:true,ok:false,reason:'Schema-5 state is missing or differs in one store.'};
    const verified=await verifyEnvelopeCopies({storage,indexedDbTarget,raw:copies.local,registry,canonical,cryptoImpl});if(!verified.ok)return {present:true,ok:false,...verified};
    return {present:true,ok:true,raw:copies.local,envelope:verified.envelope,checked:verified.checked};
  }
  async function run(options={}){
    const {storage,indexedDbTarget}=options,registry=options.registry||defaultRegistry,canonical=options.canonical||defaultCanonical,cryptoImpl=options.cryptoImpl||globalThis.crypto,interruptAt=options.interruptAt||null;
    const now=new Date(options.now||new Date()).toISOString(),writer=options.writer||WRITER;
    if(!storage||!indexedDbTarget)throw new TypeError('Schema-5 migration requires local and IndexedDB targets.');
    try{
      const journalPair=await readJournalPair({storage,indexedDbTarget});if(!journalPair.ok)return {ok:false,recoveryRequired:true,stage:'journal-read',reason:journalPair.reason};
      let journal=journalPair.journal;
      const existing=await existingSchema5({storage,indexedDbTarget,registry,canonical,cryptoImpl});
      if(existing.present&&!existing.ok&&!journal)return {ok:false,recoveryRequired:true,stage:'schema5-read',reason:existing.reason,errors:existing.errors};
      if(existing.ok&&journal?.state==='complete'){
        const projection=await verifyProjection({storage,indexedDbTarget,expectedFingerprint:existing.envelope.compatibility.projectionFingerprint,registry,canonical,cryptoImpl}),markers=await readBoth(indexedDbTarget,storage,KEYS.marker),guards=await readBoth(indexedDbTarget,storage,KEYS.guard);
        if(!projection.ok||markers.local!=='5'||markers.indexed!=='5'||guards.local==null||guards.local!==guards.indexed)return {ok:false,recoveryRequired:true,stage:'schema5-startup-verification',reason:'Committed schema 5 or its compatibility evidence does not verify.'};
        return {ok:true,status:'already-complete',envelope:existing.envelope,journal,migrated:false};
      }
      if(existing.ok&&!journal)return {ok:false,recoveryRequired:true,stage:'orphan-schema5',reason:'A valid schema-5 envelope exists without its migration journal.'};

      let snapshot=null,snapshotRaw=null;
      if(journal){
        const copies=await readBoth(indexedDbTarget,storage,KEYS.snapshot);
        if(copies.local==null||copies.indexed==null||copies.local!==copies.indexed)return {ok:false,recoveryRequired:true,stage:'snapshot-read',reason:'Migration snapshot copies are missing or differ.'};
        snapshotRaw=copies.local;const parsed=parse(snapshotRaw);if(!parsed.ok)return {ok:false,recoveryRequired:true,stage:'snapshot-read',reason:'Migration snapshot is malformed.'};snapshot=parsed.value;
        const checked=await snapshotCheck(snapshot,{registry,canonical,cryptoImpl});if(!checked.ok||checked.fingerprint!==journal.source.fingerprint)return {ok:false,recoveryRequired:true,stage:'snapshot-validation',reason:'Migration snapshot fingerprint does not match the journal.',errors:checked.errors};
      }else{
        interruption('before-snapshot',interruptAt);
        const candidate=options.candidate||canonical.fromLocalStorage(storage,{registry}),sourceHash=await canonical.fingerprint(candidate,{cryptoImpl});
        if(!sourceHash.ok)return {ok:false,recoveryRequired:true,stage:'source-validation',reason:sourceHash.reason};
        const markerRaw=storage.getItem(KEYS.marker),sourceGeneration=options.sourceGeneration||null,kind=options.kind||'state',clearTombstone=kind==='clear'?storage.getItem(KEYS.clear):null;
        const made=await schema5.makePreMigrationSnapshot(candidate,{createdAt:now,sourceGeneration,kind,clearTombstone,registry,canonical,cryptoImpl});if(!made.ok)return {ok:false,recoveryRequired:true,stage:'snapshot-build',errors:made.errors};
        snapshot=made.snapshot;snapshotRaw=JSON.stringify(snapshot);
        const snapshotWrite=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.snapshot,raw:snapshotRaw});if(!snapshotWrite.ok)return {ok:false,recoveryRequired:!snapshotWrite.rollbackVerified,stage:'snapshot-write',...snapshotWrite};
        const descriptor={migrationTimestamp:now,writer:schema5.copyJson(writer,canonical),source:options.source||candidate.source||'localStorage',kind,detectionWarnings:schema5.copyJson(options.detectionWarnings||[],canonical),sourceGeneration:sourceGeneration?schema5.copyJson(sourceGeneration,canonical):null,extensions:schema5.copyJson(options.extensions||{},canonical),candidateBytes:null};
        journal={format:JOURNAL_FORMAT,formatVersion:JOURNAL_VERSION,migrationId:`4to5:${sourceHash.value}`,state:'not-started',checkpoint:CHECKPOINT['not-started'],source:{schemaVersion:4,fingerprint:sourceHash.value,kind,source:descriptor.source,markerRaw},snapshotFingerprint:sourceHash.value,targetFingerprint:null,projectionFingerprint:sourceHash.value,writer:schema5.copyJson(writer,canonical),timestamps:{startedAt:now,updatedAt:now},candidateDescriptor:descriptor,verification:{localStorage:{snapshot:true,schema5:false,projection:false,marker:false},indexedDb:{snapshot:true,schema5:false,projection:false,marker:false}},rollback:{attempts:0,verified:false},lastError:null};
        journal=await writeJournal({storage,indexedDbTarget,journal,state:'snapshot-created',now});interruption('after-snapshot',interruptAt);
      }

      if(journal.state==='failed')return {ok:false,recoveryRequired:true,stage:'failed',reason:journal.lastError?.message||'Migration is in failed recovery state.',journal};
      if(journal.state==='rollback-required'){
        const rolled=await rollbackFromSnapshot({storage,indexedDbTarget,snapshot,journal,registry,canonical,cryptoImpl,now});
        if(!rolled.ok){journal=await writeJournal({storage,indexedDbTarget,journal,state:'failed',now,patch:{lastError:{stage:rolled.stage,message:rolled.error?.message||'Schema-4 rollback could not be verified.',at:now}}});return {ok:false,recoveryRequired:true,stage:'rollback-failed',rollback:rolled,journal}}
        journal=await writeJournal({storage,indexedDbTarget,journal,state:'snapshot-created',now,patch:{rollback:{attempts:(journal.rollback?.attempts||0)+1,verified:true,verifiedAt:now},lastError:journal.lastError}});
      }

      let migration=null,candidateRaw=journal.candidateDescriptor?.candidateBytes;
      if(journal.checkpoint<CHECKPOINT['candidate-built']){
        const sourceCandidate=canonical.fromLocalStorage(snapshot.preservedRawPersonal,{registry});
        migration=await schema5.migrateSchema4To5(sourceCandidate,{migrationTimestamp:journal.candidateDescriptor.migrationTimestamp,writer:journal.candidateDescriptor.writer,source:journal.candidateDescriptor.source,kind:journal.candidateDescriptor.kind,detectionWarnings:journal.candidateDescriptor.detectionWarnings,sourceGeneration:journal.candidateDescriptor.sourceGeneration,extensions:journal.candidateDescriptor.extensions,registry,canonical,cryptoImpl});
        if(!migration.ok)return {ok:false,recoveryRequired:true,stage:'candidate-build',migration};
        candidateRaw=JSON.stringify(migration.envelope);
        journal=await writeJournal({storage,indexedDbTarget,journal,state:'candidate-built',now,patch:{targetFingerprint:migration.fingerprint,candidateDescriptor:{...journal.candidateDescriptor,candidateBytes:candidateRaw}}});interruption('after-candidate-build',interruptAt);
      }else{
        const parsed=parse(candidateRaw);if(!parsed.ok)return {ok:false,recoveryRequired:true,stage:'candidate-read',reason:'Journal candidate bytes are malformed.'};
        migration=await schema5.migrateSchema4To5(parsed.value,{registry,canonical,cryptoImpl});if(!migration.ok||migration.fingerprint!==journal.targetFingerprint)return {ok:false,recoveryRequired:true,stage:'candidate-rebuild',reason:'Journal candidate does not reproduce its target fingerprint.'};
        migration={...migration,compatibilityProjection:(await schema5.validateSchema5Envelope(parsed.value,{registry,canonical,cryptoImpl})).projection};
      }
      if(journal.checkpoint<CHECKPOINT['candidate-validated']){
        const parsed=parse(candidateRaw),validated=parsed.ok?await schema5.validateSchema5Envelope(parsed.value,{registry,canonical,cryptoImpl}):{ok:false};
        const snap=await snapshotCheck(snapshot,{registry,canonical,cryptoImpl});if(!validated.ok||!snap.ok||validated.fingerprint!==journal.targetFingerprint)return {ok:false,recoveryRequired:true,stage:'candidate-validation',errors:validated.errors||snap.errors};
        journal=await writeJournal({storage,indexedDbTarget,journal,state:'candidate-validated',now});interruption('after-candidate-validation',interruptAt);
      }
      if(journal.checkpoint<CHECKPOINT['schema5-written']){
        const written=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.envelope,raw:candidateRaw,interruptAt,during:'during-schema5-write'});
        if(!written.ok){journal=await writeJournal({storage,indexedDbTarget,journal,state:'rollback-required',now,patch:{lastError:{stage:'schema5-write',message:written.error?.message||'Schema-5 write failed.',at:now}}});return {ok:false,rolledBack:written.rollbackVerified,recoveryRequired:!written.rollbackVerified,stage:'schema5-write',journal}}
        journal=await writeJournal({storage,indexedDbTarget,journal,state:'schema5-written',now});interruption('after-schema5-write',interruptAt);
      }
      if(journal.checkpoint<CHECKPOINT['schema5-verified']){
        const verified=await verifyEnvelopeCopies({storage,indexedDbTarget,raw:candidateRaw,registry,canonical,cryptoImpl});
        if(!verified.ok){journal=await writeJournal({storage,indexedDbTarget,journal,state:'rollback-required',now,patch:{lastError:{stage:'schema5-verification',message:verified.reason||'Schema-5 verification failed.',at:now}}});return {ok:false,rolledBack:false,recoveryRequired:false,stage:'schema5-verification',journal}}
        const markerCopies=await readBoth(indexedDbTarget,storage,KEYS.marker);if(markerCopies.local==='5'||markerCopies.indexed==='5')return {ok:false,recoveryRequired:true,stage:'marker-advanced-early',reason:'Schema marker advanced before the journal verified schema 5.'};
        journal=await writeJournal({storage,indexedDbTarget,journal,state:'schema5-verified',now,patch:{verification:{localStorage:{...journal.verification.localStorage,schema5:true},indexedDb:{...journal.verification.indexedDb,schema5:true}}}});interruption('after-schema5-verification',interruptAt);
      }
      if(journal.checkpoint<CHECKPOINT['compatibility-projection-written']){
        const parsed=parse(candidateRaw),validated=await schema5.validateSchema5Envelope(parsed.value,{registry,canonical,cryptoImpl}),projection=validated.projection;
        const written=await dualProjectionWrite({storage,indexedDbTarget,projection,registry,interruptAt});
        if(!written.ok){journal=await writeJournal({storage,indexedDbTarget,journal,state:'rollback-required',now,patch:{lastError:{stage:'compatibility-projection',message:written.error?.message||'Compatibility projection write failed.',at:now}}});return {ok:false,rolledBack:written.rollbackVerified,recoveryRequired:!written.rollbackVerified,stage:'compatibility-projection',journal}}
        journal=await writeJournal({storage,indexedDbTarget,journal,state:'compatibility-projection-written',now});interruption('after-compatibility-projection',interruptAt);
      }
      const parsedEnvelope=parse(candidateRaw).value,projectionVerified=await verifyProjection({storage,indexedDbTarget,expectedFingerprint:journal.projectionFingerprint,registry,canonical,cryptoImpl});
      if(!projectionVerified.ok){journal=await writeJournal({storage,indexedDbTarget,journal,state:'rollback-required',now,patch:{lastError:{stage:'projection-verification',message:'Compatibility projection fingerprint did not verify.',at:now}}});return {ok:false,rolledBack:false,recoveryRequired:false,stage:'projection-verification',journal}}
      const envelopeVerified=await verifyEnvelopeCopies({storage,indexedDbTarget,raw:candidateRaw,registry,canonical,cryptoImpl});if(!envelopeVerified.ok)return {ok:false,recoveryRequired:true,stage:'precommit-envelope-verification',reason:envelopeVerified.reason};
      const guardRaw=JSON.stringify(makeGuard(journal,parsedEnvelope,now)),guardWrite=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.guard,raw:guardRaw});if(!guardWrite.ok)return {ok:false,recoveryRequired:!guardWrite.rollbackVerified,stage:'guard-write',...guardWrite};
      const markerWrite=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.marker,raw:'5'});if(!markerWrite.ok)return {ok:false,recoveryRequired:!markerWrite.rollbackVerified,stage:'marker-write',...markerWrite};
      interruption('after-final-commit',interruptAt);
      journal=await writeJournal({storage,indexedDbTarget,journal,state:'complete',now,patch:{verification:{localStorage:{snapshot:true,schema5:true,projection:true,marker:true},indexedDb:{snapshot:true,schema5:true,projection:true,marker:true}},lastError:null}});
      return {ok:true,status:'complete',migrated:true,envelope:parsedEnvelope,journal,snapshotRetained:true,cloudSchema5UploadAllowed:false};
    }catch(error){
      if(error.interrupted)return {ok:false,interrupted:true,interruptAt:error.interruptAt,stage:'interrupted'};
      return {ok:false,recoveryRequired:true,stage:'unexpected',reason:error?.message||String(error),error};
    }
  }
  async function replaceFromSchema4Storage({storage,indexedDbTarget,schema4Storage,source='schema4-backup-import',kind='state',registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto,now=new Date().toISOString(),writer=WRITER}={}){
    const timestamp=new Date(now).toISOString(),current=await existingSchema5({storage,indexedDbTarget,registry,canonical,cryptoImpl});
    if(!current.ok)return {ok:false,stage:'current-schema5-validation',reason:current.reason||'A verified current schema-5 generation is required.'};
    const candidate=canonical.fromLocalStorage(schema4Storage||{},{registry}),built=await schema5.migrateSchema4To5(candidate,{migrationTimestamp:timestamp,writer,source,kind,generationNumber:current.envelope.generation.number+1,registry,canonical,cryptoImpl});
    if(!built.ok)return {ok:false,stage:'backup-migration',migration:built};
    built.envelope.generation.predecessorFingerprint=current.envelope.generation.fingerprint;
    built.envelope.previousGeneration={storageSchemaVersion:5,number:current.envelope.generation.number,fingerprint:current.envelope.generation.fingerprint};
    const revalidated=await schema5.validateSchema5Envelope(built.envelope,{registry,canonical,cryptoImpl});
    if(!revalidated.ok)return {ok:false,stage:'backup-candidate-validation',errors:revalidated.errors};
    const candidateRaw=JSON.stringify(built.envelope),canonicalKeys=canonical.stateKeys(registry),allPersonal=[...new Set(canonicalKeys.flatMap(key=>registry.compatibilityKeys(key)))],auxiliaryKeys=registry.surfaceKeys('backup').filter(key=>registry.get(key)?.category!=='personal'&&key!==KEYS.marker),allKeys=[...new Set([...allPersonal,...auxiliaryKeys,KEYS.envelope,KEYS.guard,KEYS.marker])],localKeys=[...allKeys,KEYS.clear],beforeRows=await indexedDbTarget.read(allKeys),beforeLocal=Object.fromEntries(localKeys.map(key=>[key,storage.getItem(key)]));
    const rollback=async()=>{
      let error=null;
      try{for(const key of localKeys){const raw=beforeLocal[key];if(raw==null)storage.removeItem(key);else storage.setItem(key,raw)}}catch(cause){error=cause}
      try{await indexedDbTarget.apply({put:[...beforeRows.values()].filter(Boolean),remove:allKeys.filter(key=>!beforeRows.get(key))})}catch(cause){error=error||cause}
      const checkRows=await indexedDbTarget.read(allKeys).catch(()=>new Map());let verified=!error;
      for(const key of localKeys)if(storage.getItem(key)!==beforeLocal[key])verified=false;for(const key of allKeys)if(rawFor(checkRows.get(key)||null)!==rawFor(beforeRows.get(key)||null))verified=false;
      return {rolledBack:true,rollbackVerified:verified,rollbackError:error};
    };
    try{
      const envelopeWrite=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.envelope,raw:candidateRaw});if(!envelopeWrite.ok)throw Object.assign(envelopeWrite.error||new Error('Schema-5 backup candidate write failed'),{phase:'envelope'});
      const envelopeCheck=await verifyEnvelopeCopies({storage,indexedDbTarget,raw:candidateRaw,registry,canonical,cryptoImpl});if(!envelopeCheck.ok)throw Object.assign(new Error(envelopeCheck.reason),{phase:'envelope-verification'});
      const projectionWrite=await dualProjectionWrite({storage,indexedDbTarget,projection:revalidated.projection,registry});if(!projectionWrite.ok)throw Object.assign(projectionWrite.error||new Error('Backup compatibility projection failed'),{phase:'projection'});
      const auxiliarySet=auxiliaryKeys.filter(key=>Object.prototype.hasOwnProperty.call(schema4Storage||{},key)).map(key=>[key,String(schema4Storage[key])]),auxiliaryRemove=auxiliaryKeys.filter(key=>!Object.prototype.hasOwnProperty.call(schema4Storage||{},key));
      for(const [key,raw] of auxiliarySet)storage.setItem(key,raw);for(const key of auxiliaryRemove)storage.removeItem(key);
      const idbAuxSet=auxiliarySet.filter(([key])=>registry.get(key)?.indexedDb).map(([key,value])=>({key,value,updatedAt:timestamp})),idbAuxRemove=auxiliaryRemove.filter(key=>registry.get(key)?.indexedDb);
      await indexedDbTarget.apply({put:idbAuxSet,remove:idbAuxRemove});
      const auxRows=await indexedDbTarget.read(auxiliaryKeys.filter(key=>registry.get(key)?.indexedDb));
      for(const key of auxiliaryKeys){const expected=Object.prototype.hasOwnProperty.call(schema4Storage||{},key)?String(schema4Storage[key]):null;if(storage.getItem(key)!==expected)throw Object.assign(new Error(`Imported device-local value failed verification: ${key}`),{phase:'auxiliary-verification'});if(registry.get(key)?.indexedDb&&rawFor(auxRows.get(key)||null)!==expected)throw Object.assign(new Error(`Imported device mirror failed verification: ${key}`),{phase:'auxiliary-verification'})}
      const projectionCheck=await verifyProjection({storage,indexedDbTarget,expectedFingerprint:built.sourceFingerprint,registry,canonical,cryptoImpl});if(!projectionCheck.ok)throw Object.assign(new Error('Imported schema-4 projection fingerprint failed verification'),{phase:'projection-verification'});
      if(kind==='clear')storage.setItem(KEYS.clear,timestamp);else storage.removeItem(KEYS.clear);if((kind==='clear'&&storage.getItem(KEYS.clear)!==timestamp)||(kind!=='clear'&&storage.getItem(KEYS.clear)!=null))throw Object.assign(new Error('Imported clear-state marker failed verification'),{phase:'clear-marker'});
      const guardRaw=JSON.stringify(makeGuard({migrationId:`schema4-backup:${built.sourceFingerprint}`,source:{fingerprint:built.sourceFingerprint}},built.envelope,timestamp)),guard=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.guard,raw:guardRaw});if(!guard.ok)throw Object.assign(guard.error||new Error('Imported generation guard failed'),{phase:'guard'});
      const marker=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.marker,raw:'5'});if(!marker.ok)throw Object.assign(marker.error||new Error('Imported generation marker failed'),{phase:'marker'});
      return {ok:true,stage:'verified',envelope:built.envelope,fingerprint:built.fingerprint,sourceFingerprint:built.sourceFingerprint,compatibilityProjection:revalidated.projection};
    }catch(error){return {ok:false,stage:error.phase||'backup-commit',error,...await rollback()}}
  }
  async function replaceFromSchema5Envelope({storage,indexedDbTarget,envelope,source='schema5-cloud-restore',registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto,now=new Date().toISOString()}={}){
    if(!storage||!indexedDbTarget)return {ok:false,stage:'replacement-target',reason:'Schema-5 replacement requires local and IndexedDB targets.'};
    const timestamp=new Date(now).toISOString(),current=await existingSchema5({storage,indexedDbTarget,registry,canonical,cryptoImpl});
    if(!current.ok)return {ok:false,stage:'current-schema5-validation',reason:current.reason||'A verified current schema-5 generation is required.'};
    let candidate;try{candidate=schema5.copyJson(envelope,canonical)}catch(error){return {ok:false,stage:'incoming-schema5-parse',error,reason:error?.message||String(error)}}
    const checked=await schema5.validateSchema5Envelope(candidate,{registry,canonical,cryptoImpl});
    if(!checked.ok)return {ok:false,stage:'incoming-schema5-validation',errors:checked.errors,reason:'Incoming schema-5 envelope did not validate.'};
    const candidateRaw=JSON.stringify(candidate),canonicalKeys=canonical.stateKeys(registry),allPersonal=[...new Set(canonicalKeys.flatMap(key=>registry.compatibilityKeys(key)))],allKeys=[...new Set([...allPersonal,KEYS.envelope,KEYS.guard,KEYS.marker])],localKeys=[...allKeys,KEYS.clear],beforeRows=await indexedDbTarget.read(allKeys),beforeLocal=Object.fromEntries(localKeys.map(key=>[key,storage.getItem(key)]));
    const rollback=async()=>{
      let error=null;
      try{for(const key of localKeys){const raw=beforeLocal[key];if(raw==null)storage.removeItem(key);else storage.setItem(key,raw)}}catch(cause){error=cause}
      try{await indexedDbTarget.apply({put:[...beforeRows.values()].filter(Boolean),remove:allKeys.filter(key=>!beforeRows.get(key))})}catch(cause){error=error||cause}
      const rows=await indexedDbTarget.read(allKeys).catch(()=>new Map());let verified=!error;
      for(const key of localKeys)if(storage.getItem(key)!==beforeLocal[key])verified=false;for(const key of allKeys)if(rawFor(rows.get(key)||null)!==rawFor(beforeRows.get(key)||null))verified=false;
      return {rolledBack:true,rollbackVerified:verified,rollbackError:error,beforeLocal};
    };
    try{
      const envelopeWrite=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.envelope,raw:candidateRaw});if(!envelopeWrite.ok)throw Object.assign(envelopeWrite.error||new Error('Schema-5 Cloud envelope write failed'),{phase:'envelope'});
      const envelopeCheck=await verifyEnvelopeCopies({storage,indexedDbTarget,raw:candidateRaw,registry,canonical,cryptoImpl});if(!envelopeCheck.ok)throw Object.assign(new Error(envelopeCheck.reason),{phase:'envelope-verification'});
      const projectionWrite=await dualProjectionWrite({storage,indexedDbTarget,projection:checked.projection,registry});if(!projectionWrite.ok)throw Object.assign(projectionWrite.error||new Error('Schema-5 Cloud compatibility projection failed'),{phase:'projection'});
      const projectionCheck=await verifyProjection({storage,indexedDbTarget,expectedFingerprint:candidate.compatibility.projectionFingerprint,registry,canonical,cryptoImpl});if(!projectionCheck.ok)throw Object.assign(new Error('Schema-5 Cloud compatibility projection fingerprint failed verification'),{phase:'projection-verification'});
      if(candidate.personalState.kind==='clear')storage.setItem(KEYS.clear,candidate.timestamps.updatedAt);else storage.removeItem(KEYS.clear);if((candidate.personalState.kind==='clear'&&storage.getItem(KEYS.clear)!==candidate.timestamps.updatedAt)||(candidate.personalState.kind!=='clear'&&storage.getItem(KEYS.clear)!=null))throw Object.assign(new Error('Schema-5 Cloud clear-state marker failed verification'),{phase:'clear-marker'});
      const guardRaw=JSON.stringify(makeGuard({migrationId:`${source}:${candidate.generation.fingerprint}`,source:{fingerprint:current.envelope.generation.fingerprint}},candidate,timestamp)),guard=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.guard,raw:guardRaw});if(!guard.ok)throw Object.assign(guard.error||new Error('Schema-5 Cloud generation guard failed'),{phase:'guard'});
      const marker=await dualWriteRaw({storage,indexedDbTarget,key:KEYS.marker,raw:'5'});if(!marker.ok)throw Object.assign(marker.error||new Error('Schema-5 Cloud marker failed'),{phase:'marker'});
      const finalEnvelope=await existingSchema5({storage,indexedDbTarget,registry,canonical,cryptoImpl}),finalProjection=await verifyProjection({storage,indexedDbTarget,expectedFingerprint:candidate.compatibility.projectionFingerprint,registry,canonical,cryptoImpl});
      if(!finalEnvelope.ok||finalEnvelope.envelope.generation.fingerprint!==candidate.generation.fingerprint||!finalProjection.ok)throw Object.assign(new Error('Schema-5 Cloud replacement final verification failed'),{phase:'final-verification'});
      return {ok:true,stage:'verified',envelope:candidate,fingerprint:checked.fingerprint,compatibilityProjection:checked.projection,previousFingerprint:current.envelope.generation.fingerprint,source};
    }catch(error){return {ok:false,stage:error.phase||'schema5-cloud-commit',error,...await rollback()}}
  }
  async function syncProjection({storage,indexedDbTarget,registry=defaultRegistry,canonical=defaultCanonical,cryptoImpl=globalThis.crypto,now=new Date().toISOString(),writer=WRITER,preserveExplicitClear=false}={}){
    const current=await existingSchema5({storage,indexedDbTarget,registry,canonical,cryptoImpl});if(!current.ok)return {ok:false,stage:'current-schema5-validation',reason:current.reason};
    const candidate=canonical.fromLocalStorage(storage,{registry}),fingerprint=await canonical.fingerprint(candidate,{cryptoImpl});if(!fingerprint.ok)return {ok:false,stage:'projection-source-validation',reason:fingerprint.reason};
    if(fingerprint.value===current.envelope.compatibility.projectionFingerprint)return {ok:true,stage:'unchanged',changed:false,envelope:current.envelope};
    // Feature modules may materialise harmless defaults while the application is
    // starting. They must never turn a verified user clear into ordinary state.
    // Restore the committed empty projection here; a later user-triggered write
    // uses the normal path and intentionally starts a new state generation.
    if(preserveExplicitClear&&current.envelope.personalState.kind==='clear'){
      const restored=await dualProjectionWrite({storage,indexedDbTarget,projection:current.checked.projection,registry});
      return restored.ok?{ok:true,stage:'explicit-clear-preserved',changed:false,envelope:current.envelope,restored:true}:{ok:false,stage:'explicit-clear-projection-restore',...restored};
    }
    const values={};for(const key of registry.surfaceKeys('backup')){const raw=storage.getItem(key);if(raw!=null)values[key]=raw}
    return replaceFromSchema4Storage({storage,indexedDbTarget,schema4Storage:values,source:'local-schema5-projection-update',registry,canonical,cryptoImpl,now,writer}).then(result=>({...result,changed:result.ok}));
  }
  function unknownAppKeys(values,{registry=defaultRegistry}={}){return Object.keys(values||{}).filter(key=>appOwned(key)&&!registry.get(key)).sort()}
  return Object.freeze({KEYS,JOURNAL_FORMAT,JOURNAL_VERSION,WRITER,CHECKPOINT,run,replaceFromSchema4Storage,replaceFromSchema5Envelope,syncProjection,existingSchema5,verifyProjection,snapshotCheck,readJournalPair,rollbackFromSnapshot,unknownAppKeys,dualWriteRaw,dualProjectionWrite});
});
try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.complete('03-schema5-migration','RosterBotSchema5Migration',document.currentScript?.src||'js/03-schema5-migration.js')}catch(_){}
