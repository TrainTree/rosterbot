import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {root,readSource} from './helpers.mjs';

const require=createRequire(import.meta.url),connectivity=require(`${root}/js/08-connectivity-state.js`);

test('typed connectivity model covers every Phase 4 Cloud runtime state',()=>{
  assert.deepEqual(new Set(Object.values(connectivity.STATES)),new Set([
    'online-eligible','offline','transport-unreachable','timeout','unauthenticated','auth-lost','auth-refreshing',
    'attestation-unavailable','capability-hold','server-rejection','revision-conflict','encryption-locked',
    'encryption-verification-failed','disabled','syncing','synced','pending'
  ]));
  assert.doesNotMatch(readSource('js/08-connectivity-state.js'),/localStorage|sessionStorage|indexedDB|caches\.|CacheStorage/);
});

test('offline edits become one pending canonical state without a request queue',()=>{
  let online=true,clock=1000;const events=[],state=connectivity.create({online:()=>online,now:()=>clock,dispatch:value=>events.push(value)});
  state.markPending('generation-6');state.markPending('generation-7');state.markPending('generation-8');
  assert.equal(state.snapshot().kind,'pending');assert.equal(state.snapshot().pending,true);assert.equal(state.snapshot().reason,'generation-8');
  online=false;clock++;state.noteOffline();assert.equal(state.mayAttempt(),false);assert.equal(state.snapshot().kind,'offline');assert.equal(state.snapshot().pending,true);
  online=true;clock++;state.noteOnline();assert.equal(state.snapshot().kind,'pending');assert.equal(state.mayAttempt(),true);
  state.transition(connectivity.STATES.SYNCING,{operation:'reconcile'});state.clearPending();state.transition(connectivity.STATES.SYNCED);
  assert.equal(state.snapshot().pending,false);assert.equal(state.snapshot().kind,'synced');
  assert.equal('queue' in state.snapshot(),false);assert.equal(events.some(event=>JSON.stringify(event).includes('generation-6')&&JSON.stringify(event).includes('generation-8')),false);
});

test('offline, transport, timeout, auth, attestation, capability, conflict and encryption failures stay distinct',()=>{
  const classify=(error,options={})=>connectivity.classifyError(error,{browserOnline:true,...options}).kind;
  assert.equal(connectivity.classifyError(new Error('x'),{browserOnline:false}).kind,'offline');
  assert.equal(classify(Object.assign(new Error('late'),{code:'CLOUD_TIMEOUT'})),'timeout');
  assert.equal(classify(Object.assign(new Error('down'),{code:'CLOUD_TRANSPORT'})),'transport-unreachable');
  assert.equal(classify(Object.assign(new Error('no'),{status:401})),'auth-lost');
  assert.equal(classify(Object.assign(new Error('hold'),{code:'SCHEMA5_CLOUD_CAPABILITY_HOLD'})),'capability-hold');
  assert.equal(classify(Object.assign(new Error('race'),{code:'RB003'})),'revision-conflict');
  assert.equal(classify(Object.assign(new Error('locked'),{code:'CLOUD_ENCRYPTION_LOCKED'})),'encryption-locked');
  assert.equal(classify(new Error('network failed'),{operation:'attestation'}),'attestation-unavailable');
});

test('transient transport failures use bounded backoff and browser online is only a hint',()=>{
  let clock=5000,online=true;const state=connectivity.create({online:()=>online,now:()=>clock});
  state.markPending('edit');const one=state.noteError(Object.assign(new Error('down'),{code:'CLOUD_TRANSPORT'}));assert.equal(one.retryAt,15000);assert.equal(state.mayAttempt(),false);
  clock=15000;assert.equal(state.mayAttempt(),true);const two=state.noteError(Object.assign(new Error('down'),{code:'CLOUD_TRANSPORT'}));assert.equal(two.retryAt,35000);
  online=false;assert.equal(state.mayAttempt(),false);state.noteOffline();assert.match(state.snapshot().message,/saved on this device/);
});

test('Cloud client reconnect ordering is fresh attestation, remote fetch, analysis and revision-checked save',()=>{
  const source=readSource('js/51-cloud-sync.js'),attempt=source.slice(source.indexOf('async function autoSyncAttempt'),source.indexOf('function startAutoPolling'));
  const attest=attempt.indexOf('await requireCloudTransferAllowed()'),fetch=attempt.indexOf('await fetchCloud()'),analyse=attempt.indexOf('await analyseSync(remote)'),save=attempt.indexOf('await rpcSave(expected)');
  assert(attest>=0&&attest<fetch&&fetch<analyse&&analyse<save);
  assert.match(source,/revokeSchema5Capability\('network-reconnect-requires-fresh-attestation'\)/);
  assert.match(source,/expected_revision:Number\(expected\|\|0\)/);
  assert.doesNotMatch(source,/offline(?:Write|Request|Http)Queue|queuedRequestBodies|replayQueued/i);
});

test('known offline suppresses automatic writes while manual actions explain the condition',()=>{
  const source=readSource('js/51-cloud-sync.js'),attempt=source.slice(source.indexOf('async function autoSyncAttempt'),source.indexOf('function startAutoPolling'));
  assert.match(attempt,/connectivity\?\.isBrowserOffline\?\.\(\)/);assert.match(attempt,/automatic-sync-suppressed/);
  assert(attempt.indexOf('automatic-sync-suppressed')<attempt.indexOf('await requireCloudTransferAllowed()'));
  assert.match(source,/CLOUD_OFFLINE/);assert.match(source,/Offline — changes are saved on this device/);
});

test('network loss never revokes verified crypto context but logout, auth loss, user and config changes still do',()=>{
  const source=readSource('js/51-cloud-sync.js'),offline=source.slice(source.indexOf('function browserWentOffline'),source.indexOf('function browserCameOnline'));
  assert.match(offline,/revokeSchema5Capability\('network-offline'\)/);assert.doesNotMatch(offline,/clearCryptoMemory/);
  for(const reason of ['revoked-logout','revoked-user-change','revoked-auth-loss','revoked-config-change'])assert.match(source,new RegExp(reason));
  assert.match(source,/same-user-token-refresh-preserved/);
});

test('session navigation fields retain the current canonical contract and eventually reconcile',()=>{
  const registry=require(`${root}/js/01-persistence-registry.js`),source=readSource('js/51-cloud-sync.js');
  assert.equal(registry.get('rosterbot-session-settings-v1').category,'personal');
  for(const field of ['displayWeeks','experienceMode','lastViewedFrom','lastViewedTo'])assert.match(source,new RegExp(`SESSION_VOLATILE[^;]+${field}|${field}[^;]+SESSION_VOLATILE`));
  assert.match(source,/durableSessionComparable/);assert.match(source,/probeLocalChanges/);assert.match(source,/if\(hash!==meta\.localHash\)\{markCloudPending/);
});

test('calendar and feedback remain network-only and never create offline replay queues',()=>{
  const calendar=readSource('js/80-calendar-subscription.js'),feedback=readSource('js/30-feedback.js');
  assert.match(calendar,/navigator\.onLine===false/);assert.match(calendar,/existing calendar feed was left unchanged/);assert.doesNotMatch(calendar,/retry-\$\{safety\.state\}/);assert.doesNotMatch(calendar,/setTimeout\(\(\)=>scheduleAutoPublish\(`retry/);
  assert.match(feedback,/Feedback was not queued or sent/);assert.match(feedback,/Nothing was queued/);
  assert.doesNotMatch(`${calendar}\n${feedback}`,/caches\.|CacheStorage|serviceWorker\.controller\.postMessage/);
});
