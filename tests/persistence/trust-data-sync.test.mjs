import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html'),css=read('css/rosterbot.css'),backup=read('js/50-data-backup.js'),cloud=read('js/51-cloud-sync.js'),worker=read('service-worker.js');
const between=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));

test('Data & Sync is organised around user jobs and leads with the device working copy',()=>{
  const data=between(html,'<div id="dataModal"','<div id="feedbackModal"');
  for(const phrase of ['Your working copy is on this device','Keep a backup of my RosterBot','Use RosterBot on another device','Cloud Sync','Technical details'])assert.match(data,new RegExp(phrase,'i'));
  assert(data.indexOf('Your working copy is on this device')<data.indexOf('Keep a backup of my RosterBot'));
  assert(data.indexOf('Keep a backup of my RosterBot')<data.indexOf('Use RosterBot on another device'));
  assert(data.indexOf('id="dataAnotherDeviceTitle"')<data.indexOf('id="cloudSyncSection"'));
});

test('primary trust copy distinguishes local use, account, backup and Cloud Sync',()=>{
  assert.match(html,/working RosterBot is saved on this device/i);
  assert.match(html,/account is optional/i);
  assert.match(html,/does not upload it/i);
  assert.match(html,/account is not the same as Cloud Sync/i);
  assert.match(html,/point-in-time file/i);
  assert.match(html,/keeps supported RosterBot information coordinated/i);
});

test('backup format and verified replacement implementation remain intact',()=>{
  assert.match(backup,/\.rosterbot/);assert.match(backup,/stageReplacementPayload/);assert.match(backup,/replaceFromSchema4Storage/);
  assert.match(backup,/replaceCanonicalPersistenceCopies|replacePersistenceCopies/);assert.match(backup,/rollbackVerified/);
  assert.match(backup,/Import preview/);assert.doesNotMatch(between(backup,'function importPreview','function replacementFailureState'),/schema \$\{|App\/version/);
});

test('ordinary Cloud states use outcome language while protocol evidence stays expandable',()=>{
  const presentation=between(cloud,'function presentation','function reflectAnalysis');
  for(const phrase of ['Ready to start Cloud Sync','Up to date','Changes saved on this device','Another device has newer changes','Sync needs your choice','Unlock to sync','Sync needs attention'])assert.match(presentation,new RegExp(phrase,'i'));
  assert.doesNotMatch(presentation,/Supabase|attestation|schema-[45]|token/i);
  const advanced=between(html,'<details id="cloudAdvancedDetails"','</details>');
  for(const phrase of ['Cloud revision','fingerprint','Safe Sync'])assert.match(advanced,new RegExp(phrase,'i'));
});

test('encryption primary copy explains outcomes without exposing algorithm identifiers',()=>{
  const encryption=between(cloud,'function updateEncryptionUi','async function prepareEncryptionSetup');
  assert.match(encryption,/Encrypted Cloud · unlocked/);assert.match(encryption,/passphrase is not stored/);assert.match(encryption,/recovery key/);
  assert.doesNotMatch(encryption,/AES-256-GCM|key \$\{|schema-/);
});

test('another-device navigation is presentation-only',()=>{
  const links=between(backup,"openBtn?.addEventListener",'persistBtn?.addEventListener');
  assert.match(links,/anotherCloudBtn/);assert.match(links,/anotherImportBtn/);
  assert.doesNotMatch(links,/notifyPersonalChange|indexedDB|syncNow\(|fetch\(|localStorage\.(?:setItem|removeItem)/);
});

test('responsive trust cards preserve phone and large-text reflow',()=>{
  assert.match(css,/\.data-route-grid,\.data-plain-comparison\{display:grid/);
  assert.match(css,/@media\(max-width:760px\)\{\.data-route-grid,\.data-plain-comparison\{grid-template-columns:1fr\}/);
  assert.match(css,/\.data-job-section/);assert.match(css,/\.data-technical-details/);
});

test('service worker still bypasses authenticated and cross-origin traffic',()=>{
  assert.match(worker,/request\.method!==['"]GET['"]/);assert.match(worker,/url\.origin!==scope\.origin/);
  assert.match(worker,/assetByPath\.get\(url\.pathname\)/);assert.match(worker,/return asset\?\{asset,navigation:false\}:null/);
});
