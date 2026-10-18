#!/usr/bin/env node

import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const PRODUCTION_NAME='rosterBot-sync-dev';
const PRODUCTION_REGION='ap-southeast-2';
const PRODUCTION_ORIGIN='https://rosterbot.work';
const PRODUCTION_ALIAS='https://www.rosterbot.work';
const PRODUCTION_CONTRACT='rosterbot-schema5-cloud-v1';
const STAGING_REF='wuzyurvrztskljpxpeaq';
const EXPECTED_HOSTED_INDEX_SHA='0f28e48c9900179b96df299c55d042b68a900336512a3e295fb0bd7620747236';
const EXPECTED_HOSTED_CLOUD_SHA='f91bea4ec1ab7537a9de8d2d1157447001e3028f5bc2b6f8226ccab43c9fbea8';
const EXPECTED_EDGE_SHA='0fc2fd4f9dafa0ed582b49121636c7a350e90cbeded6b5d7c2d3f6f0ae5f043d';
const queryRoot=new URL('../phase8a/introspection/',import.meta.url);
const expectedCatalogHashes=new Map([
  ['object-inventory.sql','784826b6bacd78816846fb6ec556c330fd4dbf3afb7adc0a1097dc93b0b3bb5a'],
  ['table-details.sql','8e01802f433e269e76cf6f1c6585a6c2e8c92d18244ba63bfb93dac9ace5292b'],
  ['function-details.sql','a42eb0f0e7c56ec15e728b6d7351b27106fee837e6d7f2b15c332bccac7a060f'],
  ['privilege-details.sql','4eaf1bbddbabf28f322a7cc57045f16afac3f85a1feb9f56bf15e13e2b511e3a'],
  ['column-privileges.sql','37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570'],
  ['write-path-search.sql','dac47d14679d699615b46db8eb805f2abbd058fcb45190587c1bd1d4834ebf05']
]);
const accessToken=(await readFile(join(homedir(),'.supabase','access-token'),'utf8')).trim();
if(!accessToken)throw new Error('Supabase access token is unavailable.');

const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const canonical=value=>`${JSON.stringify(value,null,2)}\n`;
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const confirmations=[];

function confirmProduction(operation,path){
  assert(PRODUCTION_REF==='rithmbggiiusrmdcqrif','Production ref constant changed.');
  assert(PRODUCTION_REF!==STAGING_REF,'Production and staging refs unexpectedly match.');
  assert(path.includes(`/projects/${PRODUCTION_REF}`),`Request is not exact-production scoped: ${path}`);
  assert(!path.includes(STAGING_REF),`Staging ref is forbidden in a production request: ${path}`);
  confirmations.push({operation,target_ref:PRODUCTION_REF,read_only:true});
}

async function management(path,options={},operation='management read'){
  confirmProduction(operation,path);
  const response=await fetch(`https://api.supabase.com${path}`,{...options,headers:{Authorization:`Bearer ${accessToken}`,...(options.body?{'Content-Type':'application/json'}:{})}});
  const text=await response.text();
  if(!response.ok)throw new Error(`${operation} failed (${response.status}): ${text}`);
  return text?JSON.parse(text):null;
}

async function query(sql,operation){
  const stripped=sql.replace(/--[^\n]*/g,' ').replace(/\/\*[\s\S]*?\*\//g,' ').replace(/'[^']*'/g,"''");
  assert(/^\s*(select|with)\b/i.test(stripped),'Refusing non-read-only production SQL.');
  assert(!/\b(insert|update|delete|alter|drop|create|grant|revoke|truncate|call|do|copy)\b/i.test(stripped),`Potentially mutating token in production preflight: ${operation}`);
  return management(`/v1/projects/${PRODUCTION_REF}/database/query`,{method:'POST',body:JSON.stringify({query:sql})},operation);
}

const project=await management(`/v1/projects/${PRODUCTION_REF}`,{},'production identity and health');
assert(project.ref===PRODUCTION_REF,`Unexpected project ref: ${project.ref}`);
assert(project.name===PRODUCTION_NAME,`Unexpected project name: ${project.name}`);
assert(project.region===PRODUCTION_REGION,`Unexpected project region: ${project.region}`);
assert(project.status==='ACTIVE_HEALTHY',`Production is not healthy: ${project.status}`);

const catalogs={};
for(const [file,expected] of expectedCatalogHashes){
  const sql=await readFile(new URL(file,queryRoot),'utf8'),rows=await query(sql,`read-only production catalog: ${file}`);
  const actual=sha256(canonical(rows));
  assert(actual===expected,`${file} drifted: expected ${expected}, received ${actual}`);
  catalogs[file]={rows,sha256:actual};
}
const catalogText=canonical(catalogs);
assert(!catalogText.includes(STAGING_REF),'Production catalog unexpectedly references the staging project ref.');

const functionRows=catalogs['function-details.sql'].rows;
const functionByIdentity=new Map(functionRows.map(row=>[row.identity,row]));
const requiredFunctions=['_roster_state_guard()','_roster_revision_guard()','save_roster_state(bigint,integer,jsonb,text)','_validate_roster_payload(integer,jsonb,boolean)','_validate_roster_schema5_plaintext(jsonb)','get_roster_schema_capability()'];
for(const identity of requiredFunctions)assert(functionByIdentity.has(identity),`Required production function is missing: ${identity}`);
const attestation=functionByIdentity.get('get_roster_schema_capability()');
assert(attestation.owner==='postgres'&&attestation.language==='plpgsql'&&attestation.security_definer===true&&attestation.volatility==='s'&&attestation.result_type==='jsonb','Capability-attestation function attributes drifted.');
for(const fragment of ["auth.uid()",`'production'`,`'${PRODUCTION_REF}'`,`'${PRODUCTION_CONTRACT}'`])assert(attestation.definition.includes(fragment),`Capability attestation is missing production contract fragment: ${fragment}`);
const validator=functionByIdentity.get('_validate_roster_schema5_plaintext(jsonb)');
assert(validator.owner==='postgres'&&validator.language==='plpgsql','Schema-5 validator ownership/language drifted.');
const save=functionByIdentity.get('save_roster_state(bigint,integer,jsonb,text)');
for(const fragment of ['revision_conflict','_validate_roster_payload','RB001','RB003'])assert(save.definition.includes(fragment),`Save RPC lost required protection: ${fragment}`);
const payloadValidator=functionByIdentity.get('_validate_roster_payload(integer,jsonb,boolean)');
for(const fragment of ['roster_schema_capability','schema_too_new','schema_unsupported','RB002'])assert(payloadValidator.definition.includes(fragment),`Payload validator lost required protection: ${fragment}`);
for(const identity of ['_roster_state_guard()','_roster_revision_guard()'])for(const fragment of ['_validate_roster_payload','_validate_roster_schema5_plaintext'])assert(functionByIdentity.get(identity).definition.includes(fragment),`${identity} lost required validation: ${fragment}`);

const evidenceSql=`
select jsonb_build_object(
  'capability',(select jsonb_build_object('min',min_writable_schema,'max',max_writable_schema,'rows',count(*) over ()) from public.roster_schema_capability where singleton=true),
  'row_counts',jsonb_build_object(
    'roster_state',(select count(*) from public.roster_state),
    'roster_revisions',(select count(*) from public.roster_revisions),
    'calendar_feeds',(select count(*) from public.calendar_feeds),
    'auth_users',(select count(*) from auth.users),
    'auth_identities',(select count(*) from auth.identities)
  ),
  'state_schema_distribution',(select coalesce(jsonb_agg(jsonb_build_object('schema',schema_version,'rows',rows) order by schema_version),'[]'::jsonb) from (select schema_version,count(*) rows from public.roster_state group by schema_version) s),
  'history_schema_distribution',(select coalesce(jsonb_agg(jsonb_build_object('schema',schema_version,'rows',rows) order by schema_version),'[]'::jsonb) from (select schema_version,count(*) rows from public.roster_revisions group by schema_version) h),
  'enabled_triggers',(select jsonb_agg(t.tgname order by t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('roster_state','roster_revisions') and not t.tgisinternal and t.tgenabled='O'),
  'roster_rls',(select jsonb_object_agg(c.relname,c.relrowsecurity order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('roster_state','roster_revisions')),
  'grants',jsonb_build_object(
    'authenticated_save',has_function_privilege('authenticated','public.save_roster_state(bigint,integer,jsonb,text)','EXECUTE'),
    'anon_save',has_function_privilege('anon','public.save_roster_state(bigint,integer,jsonb,text)','EXECUTE'),
    'authenticated_attestation',has_function_privilege('authenticated','public.get_roster_schema_capability()','EXECUTE'),
    'anon_attestation',has_function_privilege('anon','public.get_roster_schema_capability()','EXECUTE'),
    'service_attestation',has_function_privilege('service_role','public.get_roster_schema_capability()','EXECUTE'),
    'service_roster_select',has_table_privilege('service_role','public.roster_state','SELECT') and has_table_privilege('service_role','public.roster_revisions','SELECT'),
    'service_roster_dml',has_table_privilege('service_role','public.roster_state','INSERT') or has_table_privilege('service_role','public.roster_state','UPDATE') or has_table_privilege('service_role','public.roster_state','DELETE') or has_table_privilege('service_role','public.roster_revisions','INSERT') or has_table_privilege('service_role','public.roster_revisions','UPDATE') or has_table_privilege('service_role','public.roster_revisions','DELETE'),
    'calendar_service_select',has_table_privilege('service_role','public.calendar_feeds','SELECT')
  ),
  'migration_history_table',to_regclass('supabase_migrations.schema_migrations')::text
) evidence;
`;
const evidence=(await query(evidenceSql,'read-only production capability, distributions, triggers, grants, RLS and counts'))[0].evidence;
assert(JSON.stringify(evidence.capability)===JSON.stringify({max:5,min:4,rows:1}),'Production capability is not exactly singleton 4..5.');
assert(JSON.stringify(evidence.enabled_triggers)===JSON.stringify(['roster_revision_guard','roster_state_guard','roster_state_write_history']),'Production trigger set drifted.');
assert(evidence.roster_rls?.roster_state===true&&evidence.roster_rls?.roster_revisions===true,'Production roster RLS is not enabled.');
assert(evidence.grants?.authenticated_save===true&&evidence.grants?.anon_save===false,'Production save RPC grants drifted.');
assert(evidence.grants?.authenticated_attestation===true&&evidence.grants?.anon_attestation===false&&evidence.grants?.service_attestation===false,'Production attestation grants drifted.');
assert(evidence.grants?.service_roster_select===true&&evidence.grants?.service_roster_dml===false,'Production roster service-role grants drifted.');
assert(evidence.grants?.calendar_service_select===true,'Production calendar service-role SELECT is missing.');
assert(evidence.migration_history_table===null,'Unexpected Supabase migration-history table exists.');

const authConfig=await management(`/v1/projects/${PRODUCTION_REF}/config/auth`,{},'read-only production Auth configuration');
const redirects=String(authConfig?.uri_allow_list||'').split(',').map(value=>value.trim()).filter(Boolean).sort();
const auth={site_url:authConfig?.site_url??null,redirects,disable_signup:authConfig?.disable_signup??null,external_email_enabled:authConfig?.external_email_enabled??null};
assert(auth.site_url===PRODUCTION_ORIGIN,`Production Auth site_url is unexpected: ${auth.site_url}`);
assert(JSON.stringify(redirects)===JSON.stringify([`${PRODUCTION_ALIAS}/**`,`${PRODUCTION_ORIGIN}/**`].sort()),`Production redirect allowlist drifted: ${redirects.join(', ')}`);
assert(!canonical(auth).includes(STAGING_REF)&&!canonical(auth).includes('beta.rosterbot.work'),'Production Auth configuration references staging.');

const functions=await management(`/v1/projects/${PRODUCTION_REF}/functions`,{},'read-only production Edge Function inventory');
const calendar=functions.find(item=>item.slug==='calendar-feed');
assert(calendar?.status==='ACTIVE'&&calendar?.version===2&&calendar?.verify_jwt===false,'calendar-feed deployment metadata drifted.');
assert(calendar?.ezbr_sha256===EXPECTED_EDGE_SHA,'calendar-feed bundle hash drifted.');

const hosted={};let hostedText='';
for(const relative of ['index.html','js/51-cloud-sync.js']){
  const response=await fetch(`${PRODUCTION_ORIGIN}/${relative}`,{redirect:'error'}),body=await response.text();
  assert(response.ok,`Hosted production ${relative} failed (${response.status}).`);
  hosted[relative]={http_status:response.status,sha256:sha256(body)};hostedText+=body;
}
assert(hosted['index.html'].sha256===EXPECTED_HOSTED_INDEX_SHA,'Hosted production document is not the approved v0.30 deployment.');
assert(hosted['js/51-cloud-sync.js'].sha256===EXPECTED_HOSTED_CLOUD_SHA,'Hosted production Cloud client is not the approved v0.30 deployment.');
assert(hostedText.includes('v0.30.0'),'Hosted production no longer identifies v0.30.0.');
assert(!hostedText.includes(STAGING_REF)&&!hostedText.includes('beta.rosterbot.work'),'Hosted production runtime references staging.');

console.log(JSON.stringify({
  captured_at:new Date().toISOString(),
  mode:'strictly read-only production preflight; no DDL/DML, user identifiers, payloads, tokens or canary account',
  production_identity:{ref:project.ref,name:project.name,region:project.region,status:project.status},
  target_confirmations:confirmations,
  capability:evidence.capability,
  row_counts:evidence.row_counts,
  state_schema_distribution:evidence.state_schema_distribution,
  history_schema_distribution:evidence.history_schema_distribution,
  triggers:evidence.enabled_triggers,
  rls:evidence.roster_rls,
  grants:evidence.grants,
  contract:{name:PRODUCTION_CONTRACT,attestation_sha256:sha256(attestation.definition),validator_sha256:sha256(validator.definition),save_sha256:sha256(save.definition)},
  catalog:Object.fromEntries(Object.entries(catalogs).map(([file,value])=>[file,{rows:value.rows.length,sha256:value.sha256}])),
  auth,
  calendar_feed:{status:calendar.status,version:calendar.version,verify_jwt:calendar.verify_jwt,ezbr_sha256:calendar.ezbr_sha256},
  hosted,
  staging_ref_refused:STAGING_REF,
  result:'pass'
},null,2));
