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

test('registry is authoritative metadata and still describes schema 4',()=>{
  assert.equal(registry.mode,'authoritative-metadata');
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

test('registry reports and classifies every retained surface disagreement',()=>{
  const report=registry.report();
  assert.deepEqual(report.disagreements.cloudNotIndexedDb,[]);
  assert.deepEqual(report.disagreements.backupNotIndexedDb,['paybot-v02-state','paybot-v03-state','paybot-v04-state','paybot-v05-state']);
  assert.deepEqual(report.disagreements.indexedDbNotCloud,['paybot-auto-next-v1','paybot-editor-view-v1','rosterbot-experience-v1','rosterbot-first-use-v1','rosterbot-last-backup-v1','rosterbot-shared-settings-v1','rosterbot-theme-v1.9','rosterbot-view-mode-v1']);
  for(const details of Object.values(report.disagreementDetails))for(const item of details)assert.notEqual(item.classification,'intentional',`unclassified disagreement: ${item.key}`);
  assert.deepEqual(report.corrections,[{key:'rosterbot-calendar-subscription-settings-v1',classification:'genuine persistence bug',resolution:'included in IndexedDB recovery; credential token keys remain excluded'}]);
});

test('backup, Cloud and IndexedDB consume the authoritative registry surfaces',()=>{
  const backupSource=readSource('js/50-data-backup.js');
  const cloudSource=readSource('js/51-cloud-sync.js');
  const diarySource=readSource('js/60-diary.js');
  assert.match(backupSource,/keys=registry\.surfaceKeys\('backup'\)/);
  assert.match(cloudSource,/return registry\.surfaceKeys\('cloud'\)/);
  assert.match(diarySource,/PERSONAL_KEYS=registry\.surfaceKeys\('indexedDb'\)/);
  assert.doesNotMatch(backupSource,/const keys=\[/);
  assert.doesNotMatch(cloudSource,/const DEVICE_ONLY=/);
  assert.doesNotMatch(diarySource,/const PERSONAL_KEYS=\[/);
  for(const [surface,keys] of Object.entries(registry.report().surfaces))for(const key of keys){
    const item=registry.get(key);
    assert(item,`${surface} contains unregistered key ${key}`);
    assert.equal(item[surface==='indexedDb'?'indexedDb':surface],true);
  }
});

test('calendar settings recover through IndexedDB without recovering private tokens',()=>{
  const indexed=registry.surfaceKeys('indexedDb');
  assert(indexed.includes('rosterbot-calendar-subscription-settings-v1'));
  assert(!indexed.includes('rosterbot-calendar-subscription-tokens-v2'));
  assert(!indexed.includes('rosterbot-calendar-subscription-token-v1'));
  assert.equal(registry.get('rosterbot-calendar-subscription-tokens-v2').category,'credential');
  assert.equal(registry.get('rosterbot-calendar-subscription-tokens-v2').sensitivity,'secret');
});

test('every literal application persistence key is registered',()=>{
  const source=fs.readdirSync(`${root}/js`).filter(name=>name.endsWith('.js')).map(name=>readSource(`js/${name}`)).join('\n');
  const keys=new Set(quotedPersistenceKeys(source));
  keys.delete('rosterbot-encrypted-v1'); // Cloud envelope format identifier, not a storage key.
  keys.delete('rosterbot-recovery-evidence-v1'); // Recovery export format identifier, not a storage key.
  keys.delete('rosterbot-canonical-candidate-v1'); // In-memory candidate format identifier, not a storage key.
  keys.delete('rosterbot-storage-guard'); // Downgrade-guard format identifier; the persisted key has a -v1 suffix.
  const missing=[...keys].filter(key=>!registry.get(key)).sort();
  assert.deepEqual(missing,[]);
});

test('registry validators report malformed fixture values without throwing',()=>{
  const malformed=fixtures.malformedLocalValidIndexedDb.localStorage;
  assert.equal(registry.validate('rosterbot-timeline-v1',malformed['rosterbot-timeline-v1'].$raw).valid,false);
  assert.equal(registry.validate('rosterbot-employment-profile-v1',malformed['rosterbot-employment-profile-v1'].$raw).valid,false);
  assert.equal(registry.validate('unknown-synthetic-key','x').known,false);
});
