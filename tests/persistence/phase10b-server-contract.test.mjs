import test from 'node:test';
import assert from 'node:assert/strict';
import {readSource} from './helpers.mjs';

const sql=readSource('supabase/staging/phase10b-capability-attestation-schema5-contract.sql');
const executor=readSource('supabase/deploy/phase10b-staging-executor.mjs');
const authExecutor=readSource('supabase/deploy/phase10b-staging-auth-executor.mjs');
const capabilityExecutor=readSource('supabase/deploy/phase10b-enable-schema5-executor.mjs');
const integration=readSource('supabase/tests/phase10b-staging-contract.mjs');
const preflight=readSource('backend-capture/phase10b/preflight-readonly.mjs');

test('Phase 10B contract is staging-only and leaves capability at 4',()=>{
  assert.match(sql,/outside supabase\/migrations/);
  assert.match(sql,/maximum_schema <> 4/);
  assert.match(sql,/installation changed the advertised capability/);
  assert.doesNotMatch(sql,/update\s+public\.roster_schema_capability/i);
  assert.match(executor,/wuzyurvrztskljpxpeaq/);
  assert.match(executor,/requestedRef!==STAGING_REF/);
  assert.match(executor,/rithmbggiiusrmdcqrif/);
  assert.match(executor,/PHASE10B_CONFIRM/);
});

test('capability attestation is hard-bound, authenticated, stable and argument-free',()=>{
  assert.match(sql,/get_roster_schema_capability\(\)/);
  for(const value of ['isolated-staging','wuzyurvrztskljpxpeaq','rosterbot-schema5-cloud-v1'])assert.match(sql,new RegExp(value));
  assert.match(sql,/language plpgsql\s+stable\s+parallel safe\s+security definer/s);
  assert.match(sql,/if auth\.uid\(\) is null/);
  assert.match(sql,/revoke execute[\s\S]*?from public, anon, service_role/);
  assert.match(sql,/grant execute[\s\S]*?to authenticated/);
  assert.doesNotMatch(sql,/get_roster_schema_capability\([^)]*[a-z_]+\s+(text|integer|jsonb)/);
});

test('schema-5 plaintext server validator covers the approved visible contract',()=>{
  for(const token of ['generation_number','generation_fingerprint','rosterbot-canonical-json-v1','rosterbot-schema5-content-v1','personalState','projectionFingerprint','sourceFingerprint','previousGeneration','sourceGeneration','plaintext_schema5_envelope_invalid'])assert.match(sql,new RegExp(token));
  assert.match(sql,/generation_object->>'id' is distinct from\s+generation_number \|\| ':' \|\| generation_fingerprint/);
  assert.match(sql,/checksum_object->>'value' is distinct from generation_fingerprint/);
  assert.match(sql,/errcode = 'RB005'[\s\S]*?message = 'payload_malformed'/);
  assert.match(sql,/_validate_roster_payload\([\s\S]*?true[\s\S]*?_validate_roster_schema5_plaintext/s);
});

test('gate-4 integration covers hold, spoof resistance, deterministic errors, concurrency and cleanup',()=>{
  for(const token of ['configured-client-claims-five','schema_too_new','payload_schema_mismatch','payload_malformed','get_roster_schema_capability','Same-revision concurrency','RLS disclosed','synthetic_users_deleted:3','final capability and synthetic cleanup audit'])assert.match(integration,new RegExp(token));
  assert.match(integration,/max_writable_schema:5/,'spoof attempt must explicitly claim capability 5');
  assert.match(integration,/equal\(finalAudit,\{capability:4,state:0,history:0,calendar:0,auth_users:0\}\)/);
});

test('read-only preflight is staging-only and checks accepted Phase 10B hashes',()=>{
  assert.match(preflight,/Refusing non-read-only preflight SQL/);
  assert.match(preflight,/STAGING_REF='wuzyurvrztskljpxpeaq'/);
  assert.match(preflight,/path\.includes\(PRODUCTION_REF\)/);
  assert.match(preflight,/PHASE10B_EXPECTED_MAX_WRITABLE_SCHEMA\|\|5/);
  assert.match(preflight,/matches_accepted_phase10b:true/);
  for(const hash of ['784826b6bacd78816846fb6ec556c330fd4dbf3afb7adc0a1097dc93b0b3bb5a','1d1084393f16b7c3327c939d96ee6ef3bde27527ef2cc24898e30b31a96ee3e3','dac47d14679d699615b46db8eb805f2abbd058fcb45190587c1bd1d4834ebf05'])assert.match(preflight,new RegExp(hash));
  for(const file of ['object-inventory.sql','table-details.sql','function-details.sql','privilege-details.sql','column-privileges.sql','write-path-search.sql'])assert.match(preflight,new RegExp(file.replace('.','\\.')));
});

test('Step 4 Auth executor is exact-ref guarded and can patch only the approved beta origins',()=>{
  for(const token of ['wuzyurvrztskljpxpeaq','rithmbggiiusrmdcqrif','PHASE10B_AUTH_STAGING_PROJECT_REF','PHASE10B_AUTH_CONFIRM','CONFIGURE_PHASE10B_AUTH_ON_'])assert.match(authExecutor,new RegExp(token));
  assert.match(authExecutor,/requestedRef!==STAGING_REF/);
  assert.match(authExecutor,/path!==`\/v1\/projects\/\$\{STAGING_REF\}\/config\/auth`/);
  assert.match(authExecutor,/Object\.freeze\(\{site_url:SITE_URL,uri_allow_list:REDIRECT_ALLOW_LIST\}\)/);
  assert.match(authExecutor,/SITE_URL='https:\/\/beta\.rosterbot\.work'/);
  assert.match(authExecutor,/REDIRECT_ALLOW_LIST='https:\/\/beta\.rosterbot\.work\/'/);
  assert.match(authExecutor,/stableJson\(afterUntouched\)!==stableJson\(beforeUntouched\)/);
  assert.match(authExecutor,/Number\(audit\?\.capability\?\.min\)!==4/);
  for(const table of ['state','history','calendar','auth_users','auth_identities'])assert.match(authExecutor,new RegExp(`'${table}'`));
  assert.doesNotMatch(authExecutor,/api-keys|publishable|service_role.*api_key|localhost:3000|\/index\.html/);
});

test('Step 6 capability executor is exact-ref guarded and permits one 4 to 5 row update only',()=>{
  for(const token of ['wuzyurvrztskljpxpeaq','rithmbggiiusrmdcqrif','PHASE10B_STAGING_PROJECT_REF','PHASE10B_ENABLE_SCHEMA5_CONFIRM','ENABLE_PHASE10B_SCHEMA5_ON_'])assert.match(capabilityExecutor,new RegExp(token));
  assert.match(capabilityExecutor,/requestedRef===PRODUCTION_REF/);
  assert.match(capabilityExecutor,/for update/);
  assert.match(capabilityExecutor,/minimum_schema <> 4/);
  assert.match(capabilityExecutor,/maximum_schema <> 4/);
  assert.match(capabilityExecutor,/set max_writable_schema = 5,\s*updated_at = now\(\)/s);
  assert.match(capabilityExecutor,/changed_rows <> 1/);
  assert.match(capabilityExecutor,/mutationRequests!==1/);
  assert.match(capabilityExecutor,/get_roster_schema_capability\(\) as attestation/);
  for(const table of ['auth_users','auth_identities','roster_state','roster_revisions','calendar_feeds'])assert.match(capabilityExecutor,new RegExp(`'${table}'`));
  assert.doesNotMatch(capabilityExecutor,/PATCH|admin\/users|save_roster_state\s*\(/);
});

test('schema-5 release is hard-bound to beta staging and cannot release production',()=>{
  const cloud=readSource('js/51-cloud-sync.js'),gate=readSource('js/07-cloud-schema5.js');
  assert.match(cloud,/get_roster_schema_capability/);
  assert.match(cloud,/await requireCloudTransferAllowed\(\)/);
  for(const token of ['https://beta.rosterbot.work','wuzyurvrztskljpxpeaq','isolated-staging','rosterbot-schema5-cloud-v1'])assert.match(gate,new RegExp(token.replaceAll('.','\\.')));
  assert.match(gate,/allowSavedConfiguration===false/);
  assert.match(gate,/fallbackToEmbedded===false/);
  assert.doesNotMatch(gate,/rithmbggiiusrmdcqrif|https:\/\/rosterbot\.work/);
});
