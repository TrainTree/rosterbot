import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {root,fixtures,MemoryStorage,idbRows} from './helpers.mjs';

const require=createRequire(import.meta.url);
const safety=require(`${root}/js/02-persistence-safety.js`);
const registry=require(`${root}/js/01-persistence-registry.js`);
const personalKeys=['rosterbot-timeline-v1','rosterbot-db-schema-v1','paybot-v06-state'];

test('IndexedDB-only state is recovered over defaults created after startup',()=>{
  const scenario=fixtures.indexedDbOnly,storage=new MemoryStorage(scenario.localStorage),startupKeys=storage.keys();
  storage.setItem('rosterbot-timeline-v1','[]');
  storage.setItem('rosterbot-db-schema-v1','4');
  const result=safety.recoverRows({storage,rows:idbRows(scenario),personalKeys,startupKeys});
  assert.equal(result.restored,true);
  assert.equal(JSON.parse(storage.getItem('rosterbot-timeline-v1'))[0].id,'idb-only');
});

test('existing localStorage remains authoritative under current v0.29 recovery semantics',()=>{
  const scenario=fixtures.localStorageOnly,storage=new MemoryStorage(scenario.localStorage),before=storage.getItem('rosterbot-timeline-v1');
  const rows=[{key:'rosterbot-timeline-v1',value:'[]'}];
  const result=safety.recoverRows({storage,rows,personalKeys,startupKeys:storage.keys()});
  assert.equal(result.restored,false);
  assert.equal(storage.getItem('rosterbot-timeline-v1'),before);
});

test('explicit clear creates a durable device hold without removing signed-in state',()=>{
  const storage=new MemoryStorage({
    'rosterbot-cloud-session-persistent-v1':fixtures.explicitCleared.localStorage['rosterbot-cloud-session-persistent-v1']
  });
  safety.markExplicitClear(storage,'2026-09-29T12:00:00.000Z');
  assert.equal(storage.getItem('rosterbot-cleared-v1'),'2026-09-29T12:00:00.000Z');
  assert.equal(safety.autoHoldFor(storage,'00000000-0000-4000-8000-000000000001').reason,'explicit-local-clear');
  assert(storage.getItem('rosterbot-cloud-session-persistent-v1'));
});

test('explicit clear survives two startup/default cycles and blocks mirror and recovery',()=>{
  const scenario=fixtures.explicitCleared,storage=new MemoryStorage(scenario.localStorage),rows=idbRows(scenario);
  for(let cycle=0;cycle<2;cycle++){
    const startupKeys=storage.keys();
    storage.setItem('paybot-v06-state',JSON.stringify({logicVersion:'0.20.6',period:'2026-09-20',days:Array(14).fill({})}));
    storage.setItem('rosterbot-db-schema-v1','4');
    assert.equal(safety.shouldMirror(storage),false);
    const recovered=safety.recoverRows({storage,rows,personalKeys,startupKeys});
    assert.deepEqual(recovered,{restored:false,count:0,reason:'explicit-clear'});
    assert.equal(storage.getItem('rosterbot-cleared-v1'),'2026-09-29T12:00:00.000Z');
    assert.equal(storage.getItem('rosterbot-timeline-v1'),null);
    assert.equal(safety.autoHoldFor(storage)?.reason,'explicit-local-clear');
  }
});

test('malformed localStorage still blocks mirror replacement under preserved v0.29 precedence',()=>{
  const scenario=fixtures.malformedLocalValidIndexedDb,storage=new MemoryStorage(scenario.localStorage),raw=storage.getItem('rosterbot-timeline-v1');
  const result=safety.recoverRows({storage,rows:idbRows(scenario),personalKeys,startupKeys:storage.keys()});
  assert.equal(result.restored,false);
  assert.equal(storage.getItem('rosterbot-timeline-v1'),raw);
});

test('IndexedDB recovery restores calendar preferences but never private calendar tokens',()=>{
  const storage=new MemoryStorage(),settings=JSON.stringify({fullDuration:true,includeOr:true,includeDetails:false,rosteredFallback:true,timesInTitle:false,range:'90_12'});
  const rows=[
    {key:'rosterbot-calendar-subscription-settings-v1',value:settings},
    {key:'rosterbot-calendar-subscription-tokens-v2',value:JSON.stringify({synthetic:'private-token'})},
    {key:'rosterbot-calendar-subscription-token-v1',value:'private-legacy-token'}
  ];
  const result=safety.recoverRows({storage,rows,personalKeys:registry.surfaceKeys('indexedDb'),startupKeys:[]});
  assert.equal(result.restored,true);
  assert.equal(storage.getItem('rosterbot-calendar-subscription-settings-v1'),settings);
  assert.equal(storage.getItem('rosterbot-calendar-subscription-tokens-v2'),null);
  assert.equal(storage.getItem('rosterbot-calendar-subscription-token-v1'),null);
});
