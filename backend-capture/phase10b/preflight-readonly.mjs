#!/usr/bin/env node

import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

const STAGING_REF='wuzyurvrztskljpxpeaq';
const STAGING_NAME='rosterbot-phase8c-staging';
const STAGING_REGION='ap-southeast-1';
const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const EXPECTED_MAX_WRITABLE_SCHEMA=Number(process.env.PHASE10B_EXPECTED_MAX_WRITABLE_SCHEMA||5);
if(![4,5].includes(EXPECTED_MAX_WRITABLE_SCHEMA))throw new Error('PHASE10B_EXPECTED_MAX_WRITABLE_SCHEMA must be exactly 4 or 5.');
const queryRoot=new URL('../phase8a/introspection/',import.meta.url);
const expectedCatalogHashes=new Map([
  ['object-inventory.sql','784826b6bacd78816846fb6ec556c330fd4dbf3afb7adc0a1097dc93b0b3bb5a'],
  ['table-details.sql','8e01802f433e269e76cf6f1c6585a6c2e8c92d18244ba63bfb93dac9ace5292b'],
  ['function-details.sql','1d1084393f16b7c3327c939d96ee6ef3bde27527ef2cc24898e30b31a96ee3e3'],
  ['privilege-details.sql','4eaf1bbddbabf28f322a7cc57045f16afac3f85a1feb9f56bf15e13e2b511e3a'],
  ['column-privileges.sql','37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570'],
  ['write-path-search.sql','dac47d14679d699615b46db8eb805f2abbd058fcb45190587c1bd1d4834ebf05']
]);

const accessToken=(await readFile(join(homedir(),'.supabase','access-token'),'utf8')).trim();
if(!accessToken)throw new Error('Supabase access token is unavailable.');

const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const canonical=value=>`${JSON.stringify(value,null,2)}\n`;
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const targetConfirmations=[];

function confirmTarget(operation){
  assert(STAGING_REF==='wuzyurvrztskljpxpeaq','Staging ref constant changed.');
  assert(STAGING_REF!==PRODUCTION_REF,'Production target is forbidden.');
  targetConfirmations.push({operation,target_ref:STAGING_REF,production_refused:true});
  return STAGING_REF;
}

async function management(path,options={},operation='management request'){
  const target=confirmTarget(operation);
  assert(path.includes(`/projects/${target}`),`Remote path does not contain exact staging ref: ${path}`);
  assert(!path.includes(PRODUCTION_REF),`Remote path references production: ${path}`);
  const response=await fetch(`https://api.supabase.com${path}`,{
    ...options,
    headers:{
      Authorization:`Bearer ${accessToken}`,
      ...(options.body?{'Content-Type':'application/json'}:{})
    }
  });
  const body=await response.text();
  if(!response.ok)throw new Error(`${operation} failed (${response.status}): ${body}`);
  return body?JSON.parse(body):null;
}

async function query(sql,operation){
  assert(/^\s*(select|with)\b/i.test(sql),'Refusing non-read-only preflight SQL.');
  return management(`/v1/projects/${STAGING_REF}/database/query`,{
    method:'POST',body:JSON.stringify({query:sql})
  },operation);
}

const project=await management(`/v1/projects/${STAGING_REF}`,{},'staging project identity and health');
assert(project.ref===STAGING_REF,`Unexpected project ref: ${project.ref}`);
assert(project.name===STAGING_NAME,`Unexpected project name: ${project.name}`);
assert(project.region===STAGING_REGION,`Unexpected staging region: ${project.region}`);
assert(project.status==='ACTIVE_HEALTHY',`Staging is not healthy: ${project.status}`);

const catalog=[];
for(const [file,expectedSha256] of expectedCatalogHashes){
  const sql=await readFile(new URL(file,queryRoot),'utf8');
  const rows=await query(sql,`read-only catalog check: ${file}`);
  const actualSha256=sha256(canonical(rows));
  assert(actualSha256===expectedSha256,`${file} drifted: expected ${expectedSha256}, received ${actualSha256}`);
  catalog.push({query_file:file,rows:rows.length,sha256:actualSha256,matches_accepted_phase10b:true});
}

const evidenceSql=`
select jsonb_build_object(
  'capability', (
    select jsonb_build_object(
      'min', min_writable_schema,
      'max', max_writable_schema,
      'rows', count(*) over ()
    )
    from public.roster_schema_capability
    where singleton = true
  ),
  'row_counts', jsonb_build_object(
    'roster_state', (select count(*) from public.roster_state),
    'roster_revisions', (select count(*) from public.roster_revisions),
    'calendar_feeds', (select count(*) from public.calendar_feeds),
    'auth_users', (select count(*) from auth.users),
    'auth_identities', (select count(*) from auth.identities)
  ),
  'unexpected_auth_users', (
    select count(*) from auth.users
    where email is null or email !~* '@example\\.invalid$'
  ),
  'triggers', (
    select jsonb_agg(jsonb_build_object(
      'name', t.tgname,
      'enabled', t.tgenabled,
      'definition', pg_get_triggerdef(t.oid, true)
    ) order by t.tgname)
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('roster_state','roster_revisions')
      and not t.tgisinternal
  ),
  'roster_rls', (
    select jsonb_object_agg(c.relname,c.relrowsecurity order by c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('roster_state','roster_revisions')
  ),
  'policies', (
    select jsonb_agg(jsonb_build_object(
      'table', tablename,
      'name', policyname,
      'roles', roles,
      'command', cmd,
      'using', qual,
      'with_check', with_check
    ) order by tablename,policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('roster_state','roster_revisions')
  ),
  'grants', jsonb_build_object(
    'authenticated_save_execute', has_function_privilege('authenticated','public.save_roster_state(bigint,integer,jsonb,text)','EXECUTE'),
    'anon_save_execute', has_function_privilege('anon','public.save_roster_state(bigint,integer,jsonb,text)','EXECUTE'),
    'service_roster_select', has_table_privilege('service_role','public.roster_state','SELECT') and has_table_privilege('service_role','public.roster_revisions','SELECT'),
    'service_roster_dml', has_table_privilege('service_role','public.roster_state','INSERT') or has_table_privilege('service_role','public.roster_state','UPDATE') or has_table_privilege('service_role','public.roster_state','DELETE') or has_table_privilege('service_role','public.roster_revisions','INSERT') or has_table_privilege('service_role','public.roster_revisions','UPDATE') or has_table_privilege('service_role','public.roster_revisions','DELETE')
  )
) as evidence;
`;
const evidence=(await query(evidenceSql,'read-only capability, rows, Auth, trigger, grant and RLS audit'))[0]?.evidence;
assert(evidence?.capability?.min===4&&evidence?.capability?.max===EXPECTED_MAX_WRITABLE_SCHEMA&&Number(evidence?.capability?.rows)===1,`Capability is not exactly singleton 4..${EXPECTED_MAX_WRITABLE_SCHEMA}.`);
for(const [name,count] of Object.entries(evidence.row_counts||{}))assert(Number(count)===0,`${name} is not empty: ${count}`);
assert(Number(evidence.unexpected_auth_users)===0,'Unexpected non-synthetic Auth users exist.');
assert(JSON.stringify((evidence.triggers||[]).map(item=>[item.name,item.enabled]))===JSON.stringify([
  ['roster_revision_guard','O'],['roster_state_guard','O'],['roster_state_write_history','O']
]),'Phase 8B trigger set or enabled state drifted.');
assert(evidence.roster_rls?.roster_state===true&&evidence.roster_rls?.roster_revisions===true,'Roster RLS is not enabled.');
assert(evidence.grants?.authenticated_save_execute===true,'Authenticated save RPC grant is missing.');
assert(evidence.grants?.anon_save_execute===false,'Anonymous save RPC grant unexpectedly exists.');
assert(evidence.grants?.service_roster_select===true,'Service-role roster read grant is missing.');
assert(evidence.grants?.service_roster_dml===false,'Service-role direct roster DML grant unexpectedly exists.');

const authConfig=await management(`/v1/projects/${STAGING_REF}/config/auth`,{},'read-only staging Auth configuration');
const safeAuthConfig={
  site_url:authConfig?.site_url??null,
  uri_allow_list:authConfig?.uri_allow_list??null,
  disable_signup:authConfig?.disable_signup??null,
  external_email_enabled:authConfig?.external_email_enabled??null
};

console.log(JSON.stringify({
  captured_at:new Date().toISOString(),
  mode:'read-only isolated-staging preflight; no production request; no user identifiers or payloads',
  expected_capability:{min:4,max:EXPECTED_MAX_WRITABLE_SCHEMA},
  staging_identity:{ref:project.ref,name:project.name,region:project.region,status:project.status},
  production_refused:PRODUCTION_REF,
  target_confirmations:targetConfirmations,
  catalog,
  evidence,
  auth_config:safeAuthConfig,
  beta_configuration_review:{
    proposed_origin:'https://beta.rosterbot.work',
    proposed_project_ref:STAGING_REF,
    proposed_api_origin:`https://${STAGING_REF}.supabase.co`,
    production_project_referenced:false,
    browser_credentials_configured:false,
    bundle_deployed:false
  },
  result:'pass'
},null,2));
