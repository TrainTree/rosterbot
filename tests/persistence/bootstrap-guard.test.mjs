import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {root,MemoryStorage,storedValue,readSource} from './helpers.mjs';

const require=createRequire(import.meta.url);
const compatibility=require(`${root}/js/01-storage-compatibility.js`);
const registry=require(`${root}/js/01-persistence-registry.js`);
const safety=require(`${root}/js/02-persistence-safety.js`);
const recoveryUi=require(`${root}/js/03-recovery-ui.js`);
const fixture=JSON.parse(fs.readFileSync(`${root}/tests/fixtures/schema5-bootstrap-guard.json`,'utf8'));
const golden=JSON.parse(fs.readFileSync(`${root}/tests/fixtures/schema4-to-schema5-golden.json`,'utf8'));
const rawValues=values=>Object.fromEntries(Object.entries(values).map(([key,value])=>[key,storedValue(value)]));

class ObservedStorage extends MemoryStorage{
  writes=[];
  setItem(key,value){this.writes.push(['set',String(key),String(value)]);super.setItem(key,value)}
  removeItem(key){this.writes.push(['remove',String(key)]);super.removeItem(key)}
  clear(){this.writes.push(['clear']);super.clear()}
}

function runBrowserBootstrap(values,{indexedDbRows=null}={}){
  const storage=new ObservedStorage(values),scripts=[],events=[],listeners=new Map(),indexedDbModes=[],startup={dataset:{},innerHTML:'',setAttribute(){},removeAttribute(){}};
  const sandbox={
    localStorage:storage,console,structuredClone,TextEncoder,TextDecoder,Blob,URL,
    setTimeout,clearTimeout,queueMicrotask,
    CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}},
    addEventListener(type,handler){const rows=listeners.get(type)||[];rows.push(handler);listeners.set(type,rows)},
    dispatchEvent(event){events.push(event);for(const handler of listeners.get(event.type)||[])handler(event);return true},
    document:{
      getElementById:id=>id==='appStartup'?startup:null,
      querySelector:()=>null,
      addEventListener(){},
      createElement:tag=>({tagName:String(tag).toUpperCase(),remove(){}}),
      body:{appendChild(node){scripts.push(node.src||node.tagName);queueMicrotask(()=>node.onload?.())}}
    }
  };
  if(indexedDbRows){
    sandbox.indexedDB={open(){
      const request={result:null,error:null};
      queueMicrotask(()=>{
        const db={
          objectStoreNames:{contains:name=>name==='kv'},close(){},
          transaction(_name,mode){
            indexedDbModes.push(mode);
            return {objectStore(){return {getAll(){const query={result:structuredClone(indexedDbRows),error:null};queueMicrotask(()=>query.onsuccess?.());return query}}}};
          }
        };
        request.result=db;request.onsuccess?.();
      });
      return request;
    }};
  }
  sandbox.window=sandbox;sandbox.globalThis=sandbox;
  const context=vm.createContext(sandbox);
  for(const file of ['js/00-error-handler.js','js/01-storage-compatibility.js','js/01-persistence-registry.js','js/03-recovery-ui.js'])vm.runInContext(readSource(file),context,{filename:file});
  sandbox.RosterBotPersistenceSafety={
    reconcileCanonicalState:async()=>({issueType:'empty',startupAllowed:true,userChoiceRequired:false,mirrorAllowed:true,reconciliationPlan:null,replacementEntries:[]}),
    replacePersistenceCopies:async()=>{throw new Error('unexpected persistence replacement')},
    replacePersistentState:async()=>{throw new Error('unexpected persistent write')},
    replaceCanonicalPersistenceCopies:async()=>{throw new Error('unexpected canonical write')}
  };
  vm.runInContext(readSource('js/03-persistence-bootstrap.js'),context,{filename:'js/03-persistence-bootstrap.js'});
  return {sandbox,storage,scripts,events,indexedDbModes,startup};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));

test('Phase 7B exposes distinct schema-4 read/write capabilities',()=>{
  assert.deepEqual(compatibility.POLICY,{currentSupportedStorageSchema:4,readerSchema:4,writerSchema:4,highestSafeWriteSchema:4});
  assert.equal(registry.schemaVersion,4);
  const guard=registry.get(compatibility.KEYS.downgradeGuard);
  assert.equal(guard.category,'internal');
  for(const surface of ['backup','cloud','indexedDb'])assert.equal(guard[surface],false);
  assert(!registry.surfaceKeys('backup').includes(compatibility.KEYS.schema5State));
  assert(!registry.surfaceKeys('cloud').includes(compatibility.KEYS.schema5State));
});

test('fresh and current schema-4 state pass the read-only compatibility preflight',()=>{
  assert.equal(compatibility.inspect({localValues:{}}).allowed,true);
  const current=rawValues({'rosterbot-db-schema-v1':'4','rosterbot-week-leave-v1':{}}),before=structuredClone(current);
  assert.equal(compatibility.inspect({localValues:current}).allowed,true);
  assert.deepEqual(current,before);
});

test('future schema marker and future minimum reader/writer capabilities block boot',()=>{
  const marker=compatibility.inspect({localValues:{'rosterbot-db-schema-v1':'5'}});
  assert.equal(marker.blocked,true);assert.equal(marker.detected.highestStorageSchema,5);
  const guard={format:compatibility.GUARD_FORMAT,formatVersion:1,migratedSchema:5,minimumReaderSchema:6,minimumWriterSchema:5,migrationEvidence:{journal:'complete'}};
  const minimum=compatibility.inspect({localValues:{[compatibility.KEYS.downgradeGuard]:JSON.stringify(guard)}});
  assert.equal(minimum.blocked,true);assert.equal(minimum.detected.minimumReaderSchema,6);assert.match(minimum.reason,/requires .* schema 6/);
});

test('a lossless schema-4 compatibility projection remains strictly non-writable',()=>{
  const local=rawValues(fixture.localStorage),before=structuredClone(local),result=compatibility.inspect({localValues:local});
  assert.equal(result.blocked,true);
  assert.equal(result.detected.compatibilityProjections[0].status,'lossless');
  assert.equal(result.detected.compatibilityProjections[0].schemaVersion,4);
  assert.equal(result.detected.projectionWritable,false);
  assert.deepEqual(local,before,'inspection must not rewrite the schema marker or projection');
});

test('Phase 7A schema-5 envelope blocks even when its exact schema-4 projection is present',()=>{
  const expected=golden.cases.configured.expected,local={...expected.envelope.compatibilityProjection};
  for(const [key,value] of Object.entries(golden.cases.configured.expected.envelope.personalState.entries))if(value.presence==='present')local[key]=JSON.stringify(value.value);
  local[compatibility.KEYS.schema5State]=JSON.stringify(expected.envelope);
  const result=compatibility.inspect({localValues:local});
  assert.equal(result.blocked,true);assert.equal(result.detected.highestStorageSchema,5);assert.equal(result.detected.projectionWritable,false);
});

test('invalid or partial durable guard evidence also fails closed and survives reload',()=>{
  const local={[compatibility.KEYS.downgradeGuard]:'{partial-migration-evidence'};
  const first=compatibility.inspect({localValues:local}),second=compatibility.inspect({localValues:local});
  assert.equal(first.blocked,true);assert.equal(second.blocked,true);
  assert.equal(first.evidence[0].kind,'invalid-downgrade-guard');
  assert.equal(local[compatibility.KEYS.downgradeGuard],'{partial-migration-evidence');
});

test('ordinary defaults, recovery clear and persisted surfaces cannot clear the internal guard',()=>{
  for(const surface of ['backup','cloud','indexedDb'])assert(!registry.surfaceKeys(surface).includes(compatibility.KEYS.downgradeGuard));
  const plan=recoveryUi.createRecoveryPlan({state:{},choice:'clear',registry,safety,localValues:{},now:'2026-10-01T00:00:00.000Z'});
  assert(!plan.localRemove.includes(compatibility.KEYS.downgradeGuard));
  assert(!plan.indexedDbRemove.includes(compatibility.KEYS.downgradeGuard));
});

test('update-required UI offers recovery export, never downgrade conversion or clear',()=>{
  const local=rawValues(fixture.localStorage),checked=compatibility.inspect({localValues:local}),state=compatibility.recoveryState(checked,{localValues:local});
  const view=recoveryUi.presentation(state),container={dataset:{},setAttribute(){},removeAttribute(){},innerHTML:''};
  recoveryUi.render({container,state,registry});
  assert.equal(view.kind,'update-required');assert.equal(view.title,'This RosterBot data was created by a newer version of RosterBot.');
  assert.match(container.innerHTML,/Your saved data has not been changed/);
  assert.match(container.innerHTML,/data-recovery-export/);
  assert.doesNotMatch(container.innerHTML,/data-recovery-choice|Clear and start again|convert/i);
  const artifact=recoveryUi.buildRecoveryExport({state,registry,now:'2026-10-01T01:00:00.000Z'});
  assert.equal(artifact.recovery.type,'newer-schema');assert.equal(artifact.storageCompatibility.detected.projectionWritable,false);
  assert.equal(artifact.preservedRawCopies['rosterbot-timeline-v1'].local,local['rosterbot-timeline-v1']);
});

test('Phase 9 bootstrap loads migration before the startup gate and feature modules remain dynamically gated',()=>{
  const html=readSource('index.html'),bootstrap=readSource('js/03-persistence-bootstrap.js');
  assert(html.indexOf('js/02-schema5.js')<html.indexOf('js/03-schema5-migration.js'));
  assert(html.indexOf('js/03-schema5-migration.js')<html.indexOf('js/03-persistence-bootstrap.js'));
  assert.match(bootstrap,/hasMigrationEvidence/);assert.match(bootstrap,/await migration\.run/);
  assert(bootstrap.indexOf('await migration.run')<bootstrap.lastIndexOf('await loadApplication'));
  assert.match(bootstrap,/rosterbot:schema5-ready/);
});

test('Cloud schema/RPC and schema-4 backup contracts are unchanged',()=>{
  const cloud=readSource('js/51-cloud-sync.js'),backup=readSource('js/50-data-backup.js');
  assert.match(cloud,/new_schema_version:4/);assert.doesNotMatch(cloud,/new_schema_version:5/);
  assert.match(backup,/schemaVersion:4/);assert.doesNotMatch(backup,/schemaVersion:5/);
});
