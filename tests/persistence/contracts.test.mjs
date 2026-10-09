import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,readSource} from './helpers.mjs';

test('fixture set covers every Phase 1 persistence scenario',()=>{
  const required=['fresh','configured','partial','multipleEffectiveRosters','permanentSwap','manualHistoricalSnapshot','employmentProgression','localStorageOnly','indexedDbOnly','malformedLocalValidIndexedDb','explicitCleared','legacyPayBotAliases','legacyThemeKeys'];
  assert.deepEqual(Object.keys(fixtures),required);
});

test('fixtures are synthetic and contain no production account identity',()=>{
  const text=JSON.stringify(fixtures);
  assert.match(text,/synthetic/i);
  assert.doesNotMatch(text,/@(gmail|outlook|icloud|yahoo)\./i);
});

test('v0.30 backup payload contract remains schema 4',()=>{
  const source=readSource('js/50-data-backup.js');
  assert.match(source,/app:'RosterBotPayBot',version:'0\.30\.0',schemaVersion:4/);
  assert.doesNotMatch(source,/schemaVersion:5/);
});

test('Cloud keeps schema 4 compatibility and adds attested schema 5 transport',()=>{
  const source=readSource('js/51-cloud-sync.js');
  assert.match(source,/version:'0\.30\.0',schemaVersion:4/);
  assert.match(source,/new_schema_version:schemaVersion/);
  assert.match(source,/schemaVersion=cloudSchema5\?\.isPlaintext\?\.\(plain\)\?5:4/);
  assert.match(source,/get_roster_schema_capability/);
  assert.match(source,/ENC_FORMAT='rosterbot-encrypted-v1'/);
});

test('explicit-clear implementation no longer removes the tombstone from diary mirroring',()=>{
  const diary=readSource('js/60-diary.js'),backup=readSource('js/50-data-backup.js');
  assert.doesNotMatch(diary,/removeItem\(K\.cleared\)/);
  assert.match(diary,/shouldMirror\(localStorage\)/);
  assert.match(backup,/pauseAutoSync\?\.\('explicit-local-clear'\)/);
});
