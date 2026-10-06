import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readSource,root} from './helpers.mjs';

const require=createRequire(import.meta.url);
const errors=require(`${root}/js/04-cloud-error-contract.js`);
const migration=readSource('supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql');
const staging=readSource('supabase/tests/phase8b-staging-integration.mjs');

test('Phase 8B is a delta migration and preserves the captured save RPC shape',()=>{
  assert.match(migration,/DELTA ONLY/);
  assert.doesNotMatch(migration,/create table public\.roster_state/i);
  assert.doesNotMatch(migration,/create table public\.roster_revisions/i);
  assert.match(migration,/save_roster_state\(\s*expected_revision bigint,\s*new_schema_version integer,\s*new_payload jsonb,\s*new_client_id text default null::text\s*\)/s);
  assert.match(migration,/returns table\(revision bigint, updated_at timestamptz\)/);
});

test('schema capability defaults to 4 while staging can explicitly exercise 5',()=>{
  assert.match(migration,/max_writable_schema integer not null default 4/);
  assert.match(migration,/max_writable_schema between 4 and 5/);
  assert.match(migration,/\(true, 4, 4\)/);
  assert.match(staging,/max_writable_schema=5/);
  assert.match(staging,/PHASE8B_ALLOW_ISOLATED_STAGING/);
  assert.match(staging,/rithmbggiiusrmdcqrif/);
});

test('save, wrapper rotation and purge use the same per-user transaction lock',()=>{
  const lock=/pg_advisory_xact_lock\(\s*hashtextextended\('rosterbot\.roster_state:' \|\| uid::text, 0\)\s*\)/g;
  assert.equal([...migration.matchAll(lock)].length,3);
  assert.match(migration,/select rs\.revision, rs\.schema_version[\s\S]*?for update/);
  assert.match(migration,/new_schema_version < current_schema_version[\s\S]*?errcode = 'RB001'[\s\S]*?message = 'schema_too_old'/);
  assert(migration.indexOf('new_schema_version < current_schema_version')<migration.indexOf('perform public._validate_roster_payload(\n        new_schema_version'));
});

test('table triggers enforce current monotonicity, revision sequence and automatic history',()=>{
  for(const trigger of ['roster_state_guard','roster_state_write_history','roster_revision_guard'])assert.match(migration,new RegExp(`create trigger ${trigger}`));
  assert.match(migration,/new\.schema_version < old\.schema_version/);
  assert.match(migration,/new\.revision <> old\.revision \+ 1/);
  assert.match(migration,/insert into public\.roster_revisions/);
  assert.match(migration,/revision_rows_are_immutable/);
});

test('payload agreement covers plaintext schema 4, plaintext schema 5 and encrypted outer metadata',()=>{
  for(const token of ['RosterBotPayBot','rosterbot-personal-state','rosterbot-encrypted-v1','storageSchemaVersion','minimumReaderSchema','passphraseWrap','recoveryWrap'])assert.match(migration,new RegExp(token));
  assert.match(migration,/plaintext_schema4_storage_marker_mismatch/);
  assert.match(migration,/encrypted_outer_schema_missing_or_malformed/);
  assert.match(migration,/incoming_schema=%s payload_schema=%s/);
});

test('stable database errors and least-privilege grants are explicit',()=>{
  const expected={RB001:'schema_too_old',RB002:'schema_too_new',RB003:'revision_conflict',RB004:'payload_schema_mismatch',RB005:'payload_malformed',RB006:'not_authenticated',RB007:'state_invariant_violation'};
  for(const [code,message] of Object.entries(expected)){
    assert.match(migration,new RegExp(`errcode = '${code}'`));
    assert.match(migration,new RegExp(`message = '${message}'`));
  }
  assert.match(migration,/revoke execute on function public\.save_roster_state[\s\S]*?from public, anon/);
  assert.match(migration,/grant execute on function public\.save_roster_state[\s\S]*?to authenticated, service_role/);
  assert.match(migration,/revoke all on table public\.roster_state from service_role;\s*grant select/s);
});

test('v0.30 maps deterministic server errors to no-retry safe states',()=>{
  const cases=[
    [{code:'RB001',message:'ignored'},'schema_too_old','update-required','server-schema-too-old'],
    [{code:'RB002',message:'schema_too_new'},'schema_unsupported','server-rollout-required','server-schema-unsupported'],
    [{code:'RB003',message:'revision_conflict'},'revision_conflict','refresh-conflict','revision-race'],
    [{code:'RB004',message:'payload_schema_mismatch'},'payload_schema_mismatch','recovery-safe','payload-schema-mismatch'],
    [{code:'RB005',message:'payload_malformed'},'payload_malformed','recovery-safe','payload-malformed'],
    [{code:'RB006',message:'not_authenticated'},'not_authenticated','reauthenticate','cloud-authentication-required'],
    [{code:'RB007',message:'state_invariant_violation'},'state_invariant_violation','operational-fault','server-state-invariant']
  ];
  for(const [error,identity,action,holdReason] of cases){
    const result=errors.classify(error);
    assert.equal(result.identity,identity);assert.equal(result.action,action);assert.equal(result.holdReason,holdReason);assert.equal(result.retry,false);
  }
  assert.equal(errors.classify({code:null,message:'revision_conflict: expected 1, current 2'}).identity,'revision_conflict');
  assert.equal(errors.classify({code:'08006',message:'network failure'}),null);
  const cloud=readSource('js/51-cloud-sync.js');
  assert.match(cloud,/holdForDeterministicWriteError\(err\)/);
  assert.match(cloud,/autoRetryNotBefore=Date\.now\(\)\+10000/,'unknown network failures retain the existing retry path');
  assert.doesNotMatch(cloud,/new_schema_version:5|schemaVersion:5/,'schema-5 client writes remain disabled');
});

test('staging harness names every required concurrency, downgrade, payload, RLS and role case',()=>{
  for(const evidence of [
    'testFirstWriteAndDowngrade','ordinary-update','revision_conflict','testConcurrentFirstWrites',
    'schema5-staging-client','downgrade-current','downgrade-stale','downgrade-repeat',
    'testConcurrentSchemaWriters','parameter4-payload5','parameter5-payload4','outer-mismatch',
    'payload_malformed','testEncryptedMaintenance','purge_unencrypted_roster_history',
    'rotate_roster_encryption_wrappers','testRlsAnonAndServiceRole','service role direct roster DML'
  ])assert.match(staging,new RegExp(evidence));
});
