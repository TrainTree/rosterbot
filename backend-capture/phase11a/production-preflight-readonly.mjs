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
const STAGING_REF='wuzyurvrztskljpxpeaq';
const EXPECTED_EDGE_SHA='0fc2fd4f9dafa0ed582b49121636c7a350e90cbeded6b5d7c2d3f6f0ae5f043d';
const EXPECTED_HOSTED_CLOUD_SHA='2130dfc537370578af0c265376b2dcfc7ce2c0943b49e7140fe5e2052066370f';
const queryRoot=new URL('../phase8a/introspection/',import.meta.url);
const expectedCatalogHashes=new Map([
  ['object-inventory.sql','c449b5885e074aab34a31619825a430815225a6f871d9ed9bce0ce189789aa8a'],
  ['table-details.sql','8e01802f433e269e76cf6f1c6585a6c2e8c92d18244ba63bfb93dac9ace5292b'],
  ['function-details.sql','9f15ff46d0b3d840f29aa6956f8727669815d4b891da7a0b2ca939e045e77e57'],
  ['privilege-details.sql','4eaf1bbddbabf28f322a7cc57045f16afac3f85a1feb9f56bf15e13e2b511e3a'],
  ['column-privileges.sql','37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570'],
  ['write-path-search.sql','f8bd949222e4a6ca86a2b1015cc361162ff202033711b54fcefb8876388e7feb']
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
  assert(path.includes(`/projects/${PRODUCTION_REF}`),`Request path is not exact-production scoped: ${path}`);
  assert(!path.includes(STAGING_REF),`Staging ref is forbidden in production request: ${path}`);
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
  assert(/^\s*(select|with)\b/i.test(sql),'Refusing non-read-only production SQL.');
  assert(!/\b(insert|update|delete|alter|drop|create|grant|revoke|truncate|call|do)\b/i.test(sql.replace(/'[^']*'/g,"''")),`Potentially mutating token in production preflight: ${operation}`);
  return management(`/v1/projects/${PRODUCTION_REF}/database/query`,{method:'POST',body:JSON.stringify({query:sql})},operation);
}

const project=await management(`/v1/projects/${PRODUCTION_REF}`,{},'production identity and health');
assert(project.ref===PRODUCTION_REF,`Unexpected project ref: ${project.ref}`);
assert(project.name===PRODUCTION_NAME,`Unexpected project name: ${project.name}`);
assert(project.region===PRODUCTION_REGION,`Unexpected project region: ${project.region}`);
assert(project.status==='ACTIVE_HEALTHY',`Production is not healthy: ${project.status}`);

const catalog=[];
let catalogText='';
for(const [file,expected] of expectedCatalogHashes){
  const sql=await readFile(new URL(file,queryRoot),'utf8'),rows=await query(sql,`read-only production catalog: ${file}`),actual=sha256(canonical(rows));
  assert(actual===expected,`${file} drifted: expected ${expected}, received ${actual}`);
  catalogText+=canonical(rows);
  catalog.push({query_file:file,rows:rows.length,sha256:actual,matches_approved_phase8_production:true});
}
assert(!catalogText.includes(STAGING_REF),'Production catalog unexpectedly references the staging project ref.');

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
    'service_roster_select',has_table_privilege('service_role','public.roster_state','SELECT') and has_table_privilege('service_role','public.roster_revisions','SELECT'),
    'service_roster_dml',has_table_privilege('service_role','public.roster_state','INSERT') or has_table_privilege('service_role','public.roster_state','UPDATE') or has_table_privilege('service_role','public.roster_state','DELETE') or has_table_privilege('service_role','public.roster_revisions','INSERT') or has_table_privilege('service_role','public.roster_revisions','UPDATE') or has_table_privilege('service_role','public.roster_revisions','DELETE'),
    'calendar_service_select',has_table_privilege('service_role','public.calendar_feeds','SELECT')
  ),
  'attestation_function_present',to_regprocedure('public.get_roster_schema_capability()') is not null,
  'migration_history_table',to_regclass('supabase_migrations.schema_migrations')::text
) evidence;
`;
const evidence=(await query(evidenceSql,'read-only production capability, distribution, grants, RLS and counts'))[0].evidence;
assert(JSON.stringify(evidence.capability)===JSON.stringify({max:4,min:4,rows:1}),'Production capability is not exactly singleton 4..4.');
assert(JSON.stringify(evidence.enabled_triggers)===JSON.stringify(['roster_revision_guard','roster_state_guard','roster_state_write_history']),'Production trigger set drifted.');
assert(evidence.roster_rls?.roster_state===true&&evidence.roster_rls?.roster_revisions===true,'Production roster RLS is not enabled.');
assert(evidence.grants?.authenticated_save===true&&evidence.grants?.anon_save===false,'Production save RPC grants drifted.');
assert(evidence.grants?.service_roster_select===true&&evidence.grants?.service_roster_dml===false,'Production roster service-role grants drifted.');
assert(evidence.grants?.calendar_service_select===true,'Production calendar service-role SELECT is missing.');
assert((evidence.state_schema_distribution||[]).every(item=>Number(item.schema)===4),'Production current state contains non-schema-4 rows.');
assert((evidence.history_schema_distribution||[]).every(item=>Number(item.schema)===4),'Production history contains non-schema-4 rows.');
assert(evidence.migration_history_table===null,'Unexpected Supabase migration-history table exists.');

const authConfig=await management(`/v1/projects/${PRODUCTION_REF}/config/auth`,{},'read-only production Auth configuration');
const auth={site_url:authConfig?.site_url??null,uri_allow_list:authConfig?.uri_allow_list??null,disable_signup:authConfig?.disable_signup??null,external_email_enabled:authConfig?.external_email_enabled??null};
assert(auth.site_url===PRODUCTION_ORIGIN,`Production Auth site_url is unexpected: ${auth.site_url}`);
assert(!String(auth.uri_allow_list||'').includes(STAGING_REF)&&!String(auth.uri_allow_list||'').includes('beta.rosterbot.work'),'Production Auth redirect allowlist references staging.');

const functions=await management(`/v1/projects/${PRODUCTION_REF}/functions`,{},'read-only production Edge Function inventory');
const calendar=functions.find(item=>item.slug==='calendar-feed');
assert(calendar?.status==='ACTIVE','calendar-feed is not active.');
assert(calendar?.version===2,'calendar-feed version drifted.');
assert(calendar?.verify_jwt===false,'calendar-feed JWT configuration drifted.');
assert(calendar?.ezbr_sha256===EXPECTED_EDGE_SHA,'calendar-feed bundle hash drifted.');

const hostedFiles=['index.html','js/51-cloud-sync.js'];
const hosted={};let hostedText='';
for(const relative of hostedFiles){
  const response=await fetch(`${PRODUCTION_ORIGIN}/${relative}`),body=await response.text();
  assert(response.ok,`Hosted production ${relative} failed (${response.status}).`);
  hosted[relative]={http_status:response.status,sha256:sha256(body)};hostedText+=body;
}
assert(hosted['js/51-cloud-sync.js'].sha256===EXPECTED_HOSTED_CLOUD_SHA,'Current hosted production Cloud client changed unexpectedly.');
assert(!hostedText.includes(STAGING_REF)&&!hostedText.includes('beta.rosterbot.work'),'Current production runtime references staging.');

console.log(JSON.stringify({
  captured_at:new Date().toISOString(),
  mode:'read-only production preflight; no DDL/DML, user identifiers, payloads, tokens or canary account',
  production_identity:{ref:project.ref,name:project.name,region:project.region,status:project.status},
  staging_ref_refused:STAGING_REF,
  target_confirmations:confirmations,
  catalog,
  evidence,
  auth,
  documented_client_origins:[PRODUCTION_ORIGIN,PRODUCTION_ALIAS],
  calendar_feed:{status:calendar.status,version:calendar.version,verify_jwt:calendar.verify_jwt,ezbr_sha256:calendar.ezbr_sha256},
  hosted,
  result:'pass'
},null,2));
