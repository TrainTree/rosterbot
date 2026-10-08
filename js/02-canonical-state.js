try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.start('02-canonical-state','RosterBotCanonicalPersistence',document.currentScript?.src||'js/02-canonical-state.js')}catch(_){}
(function(root,factory){
  'use strict';
  const registry=root?.RosterBotPersistenceRegistry||(typeof module!=='undefined'&&module.exports?require('./01-persistence-registry.js'):null);
  if(!registry){const message='RosterBot startup dependency missing:\n02-canonical-state expected persistence registry';if(root&&root.RosterBotBootDiagnostics)root.RosterBotBootDiagnostics.dependency('02-canonical-state','persistence registry',registry);throw new Error(message)}
  const api=factory(registry);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RosterBotCanonicalPersistence=api;
})(typeof window!=='undefined'?window:globalThis,function(defaultRegistry){
  'use strict';

  const CANDIDATE_FORMAT='rosterbot-canonical-candidate-v1';
  const GENERATION_FORMAT='rosterbot-local-generation-v1';
  const PREVIOUS_FORMAT='rosterbot-previous-generation-v1';
  const GENERATION_KEY='rosterbot-local-generation-v1';
  const PREVIOUS_KEY='rosterbot-previous-generation-v1';
  const WRITER_VERSION='v0.30-phase6';
  const RECOVERABLE=new Set(['valid','legacy']);
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

  function registryFor(registry){
    const value=registry||defaultRegistry;
    if(!value||!Array.isArray(value.items)||typeof value.validate!=='function')throw new TypeError('A persistence registry is required');
    return value;
  }
  function stateKeys(registry=defaultRegistry){
    const source=registryFor(registry);
    return source.items.filter(item=>item.category==='personal'&&item.indexedDb&&!item.aliasFor).map(item=>item.key).sort();
  }
  function localReader(source){
    if(source&&typeof source.getItem==='function')return key=>source.getItem(key);
    const object=isObject(source)?source:{};
    return key=>own(object,key)?object[key]:null;
  }
  function rowsReader(rows){
    const map=rows instanceof Map?rows:new Map((Array.isArray(rows)?rows:[]).filter(row=>row&&typeof row.key==='string').map(row=>[row.key,row]));
    return key=>{
      if(!map.has(key))return {present:false,raw:null,row:null};
      const row=map.get(key);
      if(row==null)return {present:false,raw:null,row:null};
      if(isObject(row)&&own(row,'value'))return {present:true,raw:row.value,row};
      return {present:true,raw:row,row:{key,value:row}};
    };
  }
  function buildCandidate({registry=defaultRegistry,source,read,rawSource}){
    const sourceRegistry=registryFor(registry),entries={},raw={},problems=[];
    for(const key of stateKeys(sourceRegistry)){
      const item=sourceRegistry.get(key),possible=[key,...(item?.aliases||[])];
      let selected=null;
      for(const sourceKey of possible){
        const found=read(sourceKey);
        if(found.present){selected={sourceKey,...found};break}
      }
      if(!selected){entries[key]={presence:'missing',state:'missing'};continue}
      const checked=typeof selected.raw==='string'?sourceRegistry.validate(selected.sourceKey,selected.raw):{known:true,key:selected.sourceKey,state:'unsupported',valid:false,missing:false,raw:selected.raw,value:selected.raw,reason:`${source} value is not a raw string`};
      const state=selected.sourceKey!==key&&RECOVERABLE.has(checked.state)?'legacy':checked.state;
      entries[key]={presence:'present',state,sourceKey:selected.sourceKey,value:checked.value,raw:selected.raw};
      raw[selected.sourceKey]=selected.raw;
      if(!RECOVERABLE.has(state))problems.push({key,sourceKey:selected.sourceKey,state,reason:checked.reason||''});
      for(const sourceKey of possible){
        if(sourceKey===selected.sourceKey)continue;
        const extra=read(sourceKey);if(extra.present)raw[sourceKey]=extra.raw;
      }
    }
    return {
      format:CANDIDATE_FORMAT,schemaVersion:sourceRegistry.schemaVersion,source,status:problems.length?'invalid':'valid',
      entries,problems,rawSource,raw
    };
  }
  function fromLocalStorage(source,{registry=defaultRegistry}={}){
    const readValue=localReader(source);
    return buildCandidate({registry,source:'localStorage',rawSource:source,read:key=>{const raw=readValue(key);return {present:raw!=null,raw}}});
  }
  function fromIndexedDb(rows,{registry=defaultRegistry}={}){
    const readValue=rowsReader(rows);
    return buildCandidate({registry,source:'indexedDb',rawSource:rows,read:readValue});
  }
  function identity(candidate){
    if(!candidate||candidate.format!==CANDIDATE_FORMAT)return {ok:false,kind:'unsupported',reason:'not a canonical candidate'};
    if(candidate.status!=='valid')return {ok:false,kind:'invalid',reason:'candidate contains malformed or unsupported registered values',problems:[...(candidate.problems||[])]};
    const entries={};
    for(const key of Object.keys(candidate.entries||{}).sort()){
      const entry=candidate.entries[key];
      if(entry?.presence==='missing'){entries[key]={presence:'missing'};continue}
      if(entry?.presence!=='present'||!RECOVERABLE.has(entry.state))return {ok:false,kind:'invalid',reason:`${key} is not a validated canonical entry`};
      entries[key]={presence:'present',value:entry.value};
    }
    return {ok:true,value:{schemaVersion:candidate.schemaVersion,entries}};
  }
  function canonicalSerialise(value){
    const seen=new Set();
    function visit(current,path){
      if(current===null)return 'null';
      if(typeof current==='string'||typeof current==='boolean')return JSON.stringify(current);
      if(typeof current==='number'){
        if(!Number.isFinite(current))throw new TypeError(`${path} contains a non-finite number`);
        return JSON.stringify(Object.is(current,-0)?0:current);
      }
      if(typeof current!=='object')throw new TypeError(`${path} contains unsupported ${typeof current}`);
      if(seen.has(current))throw new TypeError(`${path} contains a cycle`);
      if(Object.getOwnPropertySymbols(current).some(symbol=>Object.prototype.propertyIsEnumerable.call(current,symbol)))throw new TypeError(`${path} contains a symbol key`);
      seen.add(current);
      let text;
      if(Array.isArray(current)){
        for(let index=0;index<current.length;index++)if(!own(current,index))throw new TypeError(`${path} contains a sparse array slot`);
        text=`[${current.map((item,index)=>visit(item,`${path}[${index}]`)).join(',')}]`;
      }
      else{
        const prototype=Object.getPrototypeOf(current);
        if(prototype!==Object.prototype&&prototype!==null)throw new TypeError(`${path} contains a non-plain object`);
        text=`{${Object.keys(current).sort().map(key=>`${JSON.stringify(key)}:${visit(current[key],`${path}.${key}`)}`).join(',')}}`;
      }
      seen.delete(current);return text;
    }
    try{return {ok:true,text:visit(value,'$')}}catch(error){return {ok:false,kind:'unsupported',reason:error.message,error}}
  }
  async function fingerprint(candidate,{cryptoImpl=globalThis.crypto}={}){
    const identified=identity(candidate);
    if(!identified.ok)return identified;
    const serialised=canonicalSerialise(identified.value);
    if(!serialised.ok)return serialised;
    if(!cryptoImpl?.subtle||typeof TextEncoder==='undefined')return {ok:false,kind:'unavailable',reason:'Web Crypto SHA-256 is unavailable'};
    try{
      const bytes=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(serialised.text));
      return {ok:true,algorithm:'SHA-256',value:[...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join(''),serialised:serialised.text};
    }catch(error){return {ok:false,kind:'unavailable',reason:error.message||String(error),error}}
  }
  function toSchema4Projection(candidate,{registry=defaultRegistry}={}){
    const sourceRegistry=registryFor(registry),identified=identity(candidate);
    if(!identified.ok)return identified;
    const storage={},removals=[];
    for(const key of stateKeys(sourceRegistry)){
      const entry=candidate.entries[key];
      if(entry.presence==='missing'){removals.push(key);continue}
      const raw=typeof entry.raw==='string'?entry.raw:JSON.stringify(entry.value),checked=sourceRegistry.validate(key,raw);
      if(!RECOVERABLE.has(checked.state))return {ok:false,kind:'unsupported',reason:`${key} cannot be projected to schema 4`};
      storage[key]=raw;
    }
    return {ok:true,schemaVersion:4,storage,removals};
  }
  function parseRegistered(raw,key,registry=defaultRegistry){
    const sourceRegistry=registryFor(registry),checked=sourceRegistry.validate(key,raw);
    return RECOVERABLE.has(checked.state)?{ok:true,value:checked.value,raw}:{ok:false,state:checked.state,reason:checked.reason||'',raw};
  }
  function parseGeneration(raw,{registry=defaultRegistry}={}){
    if(raw==null)return {ok:false,state:'missing',raw:null};
    return parseRegistered(raw,GENERATION_KEY,registry);
  }
  function parsePrevious(raw,{registry=defaultRegistry}={}){
    if(raw==null)return {ok:false,state:'missing',raw:null};
    return parseRegistered(raw,PREVIOUS_KEY,registry);
  }
  function makeGeneration({generation,fingerprint:hash,predecessorFingerprint=null,timestamp=new Date().toISOString(),writer=WRITER_VERSION,verification='pending',kind='state'}={}){
    return {format:GENERATION_FORMAT,generation,fingerprint:hash,predecessorFingerprint,timestamp:new Date(timestamp).toISOString(),writer,verification,kind};
  }
  function makePrevious({candidate,generation,registry=defaultRegistry}={}){
    const projection=toSchema4Projection(candidate,{registry});
    if(!projection.ok)throw new Error(projection.reason||'Previous generation cannot be projected');
    if(!generation||generation.verification!=='verified')throw new Error('Only a verified generation can become previous-known-good');
    return {format:PREVIOUS_FORMAT,generation:{...generation},projection:{schemaVersion:4,storage:{...projection.storage}}};
  }
  async function verifyPrevious(snapshot,{registry=defaultRegistry,cryptoImpl=globalThis.crypto}={}){
    if(!snapshot||snapshot.format!==PREVIOUS_FORMAT||snapshot.generation?.verification!=='verified'||!isObject(snapshot.projection?.storage))return {ok:false,reason:'previous snapshot shape is unsupported'};
    const candidate=fromLocalStorage(snapshot.projection.storage,{registry}),hashed=await fingerprint(candidate,{cryptoImpl});
    if(!hashed.ok)return hashed;
    if(hashed.value!==snapshot.generation.fingerprint)return {ok:false,reason:'previous snapshot fingerprint mismatch',candidate,fingerprint:hashed.value};
    return {ok:true,candidate,fingerprint:hashed.value,generation:snapshot.generation,projection:snapshot.projection};
  }

  return Object.freeze({
    CANDIDATE_FORMAT,GENERATION_FORMAT,PREVIOUS_FORMAT,GENERATION_KEY,PREVIOUS_KEY,WRITER_VERSION,
    stateKeys,fromLocalStorage,fromIndexedDb,identity,canonicalSerialise,fingerprint,toSchema4Projection,
    parseGeneration,parsePrevious,makeGeneration,makePrevious,verifyPrevious
  });
});
try{if(typeof window!=='undefined'&&window.RosterBotBootDiagnostics)window.RosterBotBootDiagnostics.complete('02-canonical-state','RosterBotCanonicalPersistence',document.currentScript?.src||'js/02-canonical-state.js')}catch(_){}
