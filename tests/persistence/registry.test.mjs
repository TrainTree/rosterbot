import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {root,fixtures,readSource} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);

function quotedPersistenceKeys(source){
  return [...source.matchAll(/['"]((?:rosterbot|paybot)-[A-Za-z0-9._-]+)['"]/g)].map(match=>match[1]);
}

function sourceArray(source,pattern){
  const match=source.match(pattern);
  assert(match,'expected persistence allow-list declaration was not found');
  return match[1];
}

test('registry remains reporting-only and describes schema 4',()=>{
  assert.equal(registry.mode,'read-only-reporting');
  assert.equal(registry.schemaVersion,4);
  assert.equal(registry.get('rosterbot-timeline-v1').category,'personal');
  assert.equal(registry.get('rosterbot-timeline-v1').backup,true);
  assert.equal(registry.get('rosterbot-timeline-v1').cloud,true);
  assert.equal(registry.get('rosterbot-timeline-v1').indexedDb,true);
});

test('registry records current compatibility aliases and sensitive exclusions',()=>{
  assert.deepEqual(registry.get('paybot-v06-state').aliases,['paybot-v05-state','paybot-v04-state','paybot-v03-state','paybot-v02-state']);
  assert.equal(registry.get('rosterbot-cloud-session-persistent-v1').sensitivity,'secret');
  assert.equal(registry.get('rosterbot-cloud-session-persistent-v1').backup,false);
  assert.equal(registry.get('rosterbot-calendar-subscription-tokens-v2').cloud,false);
});

test('registry reports the current distributed-list disagreements',()=>{
  const report=registry.report();
  assert.deepEqual(report.disagreements.cloudNotIndexedDb,['rosterbot-calendar-subscription-settings-v1']);
  assert(report.disagreements.backupNotIndexedDb.includes('paybot-v04-state'));
  assert(report.disagreements.indexedDbNotCloud.includes('rosterbot-shared-settings-v1'));
});

test('registry surface lists match the current distributed source allow-lists',()=>{
  const backupSource=readSource('js/50-data-backup.js');
  const cloudSource=readSource('js/51-cloud-sync.js');
  const diarySource=readSource('js/60-diary.js');
  const backup=quotedPersistenceKeys(sourceArray(backupSource,/const keys=\[(.*?)\];/s));
  const deviceOnly=new Set(quotedPersistenceKeys(sourceArray(cloudSource,/const DEVICE_ONLY=new Set\(\[(.*?)\]\);/s)));
  const keyAliases=Object.fromEntries([...sourceArray(diarySource,/const K=\{(.*?)\};/s).matchAll(/(\w+):'([^']+)'/g)].map(match=>[match[1],match[2]]));
  const indexedBlock=sourceArray(diarySource,/const PERSONAL_KEYS=\[(.*?)\];/s);
  const indexed=[...indexedBlock.matchAll(/K\.(\w+)|'([^']+)'/g)].map(match=>match[2]||keyAliases[match[1]]);
  const surfaces=registry.report().surfaces;
  assert.deepEqual(surfaces.backup,backup);
  assert.deepEqual(surfaces.cloud,backup.filter(key=>!deviceOnly.has(key)));
  assert.deepEqual(surfaces.indexedDb,indexed);
});

test('every literal application persistence key is registered',()=>{
  const source=fs.readdirSync(`${root}/js`).filter(name=>name.endsWith('.js')).map(name=>readSource(`js/${name}`)).join('\n');
  const keys=new Set(quotedPersistenceKeys(source));
  keys.delete('rosterbot-encrypted-v1'); // Cloud envelope format identifier, not a storage key.
  const missing=[...keys].filter(key=>!registry.get(key)).sort();
  assert.deepEqual(missing,[]);
});

test('registry validators report malformed fixture values without throwing',()=>{
  const malformed=fixtures.malformedLocalValidIndexedDb.localStorage;
  assert.equal(registry.validate('rosterbot-timeline-v1',malformed['rosterbot-timeline-v1'].$raw).valid,false);
  assert.equal(registry.validate('rosterbot-employment-profile-v1',malformed['rosterbot-employment-profile-v1'].$raw).valid,false);
  assert.equal(registry.validate('unknown-synthetic-key','x').known,false);
});
