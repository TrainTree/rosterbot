import test from 'node:test';
import assert from 'node:assert/strict';
import {APPLICATION_VERSION,RUNTIME_SOURCE_ASSETS} from '../../scripts/runtime-assets.mjs';
import {readSource} from './helpers.mjs';

const index=readSource('index.html');
const readme=readSource('README.md');

test('v0.32.0 release metadata is coordinated without changing schema or Cloud contracts',()=>{
  assert.equal(APPLICATION_VERSION,'0.32.0');
  assert.match(index,/<title>RosterBot 🤖 v0\.32\.0<\/title>/);
  assert.match(index,/v0\.32\.0 UX, Adoption &amp; Accessibility/);
  assert.match(index,/<em>Release<\/em>/);
  assert.match(readme,/RosterBot v0\.32\.0/);
  assert.match(readSource('js/02-canonical-state.js'),/WRITER_VERSION='v0\.32\.0'/);
  assert.match(readSource('js/03-schema5-migration.js'),/version:'0\.32\.0',build:'v0\.32\.0'/);
  assert.match(readSource('js/02-schema5.js'),/SCHEMA5_STORAGE_SCHEMA=5/);
  assert.match(readSource('js/07-cloud-schema5.js'),/CONTRACT='rosterbot-schema5-cloud-v1'/);
  assert.match(readSource('js/05-cloud-deployment-profile.js'),/requestedCloudSchema:5/);
});

test('release notes describe shipped outcomes and do not advertise published-roster ingestion',()=>{
  assert.match(index,/value-first front door/i);
  assert.match(index,/four calendar weeks/i);
  assert.match(index,/optional encrypted Cloud Sync/i);
  assert.doesNotMatch(index,/weekly roster ingestion|daily roster ingestion|automatic roster change detection/i);
});

test('Phase 7 research remains outside normal navigation, runtime inventory and offline assets',()=>{
  assert.equal(RUNTIME_SOURCE_ASSETS.some(path=>path.startsWith('research/')),false);
  assert.doesNotMatch(index,/research\/phase7-published-roster\.html/);
  assert.match(readSource('scripts/prepare-staging-pages.mjs'),/research\/phase7-published-roster\.html/);
  assert.doesNotMatch(readSource('scripts/prepare-production-pages.mjs'),/phase7-published-roster/);
});

test('backup and legacy Cloud compatibility payloads remain schema 4 with final metadata',()=>{
  assert.match(readSource('js/50-data-backup.js'),/version:'0\.32\.0',schemaVersion:4/);
  assert.match(readSource('js/51-cloud-sync.js'),/version:'0\.32\.0',schemaVersion:4/);
});
