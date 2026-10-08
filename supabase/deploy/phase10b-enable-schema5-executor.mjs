#!/usr/bin/env node

import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

const STAGING_REF='wuzyurvrztskljpxpeaq';
const STAGING_NAME='rosterbot-phase8c-staging';
const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const SITE_URL='https://beta.rosterbot.work';
const REDIRECT_ALLOW_LIST='https://beta.rosterbot.work/';
const REVIEWED_CONTRACT_SHA256='1a0ccf96462375c898d36f129f53213493eebb1856c628d28c5f935dd837536e';
const requiredConfirmation=`ENABLE_PHASE10B_SCHEMA5_ON_${STAGING_REF}`;
const requestedRef=String(process.env.PHASE10B_STAGING_PROJECT_REF||'');
const confirmation=String(process.env.PHASE10B_ENABLE_SCHEMA5_CONFIRM||'');
const contractUrl=new URL('../staging/phase10b-capability-attestation-schema5-contract.sql',import.meta.url);
const queryRoot=new URL('../../backend-capture/phase8a/introspection/',import.meta.url);
const catalogFiles=[
  'object-inventory.sql',
  'table-details.sql',
  'function-details.sql',
  'privilege-details.sql',
  'column-privileges.sql',
  'write-path-search.sql'
];

// Refuse an explicitly supplied production target before reading credentials or
// constructing any remote request. No caller-controlled ref is used in a URL.
if(requestedRef===PRODUCTION_REF)throw new Error(`Refusing schema-5 capability change against production ${PRODUCTION_REF}.`);
if(requestedRef!==STAGING_REF)throw new Error(`Refusing schema-5 capability change: PHASE10B_STAGING_PROJECT_REF must equal ${STAGING_REF}.`);
if(confirmation!==requiredConfirmation)throw new Error(`Refusing schema-5 capability change: PHASE10B_ENABLE_SCHEMA5_CONFIRM must equal ${requiredConfirmation}.`);

const contractSql=await readFile(contractUrl,'utf8');
const contractSha256=sha256Text(contractSql);
if(contractSha256!==REVIEWED_CONTRACT_SHA256)throw new Error(`Reviewed Phase 10B contract changed: expected ${REVIEWED_CONTRACT_SHA256}, received ${contractSha256}.`);

const token=(await readFile(join(homedir(),'.supabase','access-token'),'utf8')).trim();
if(!token)throw new Error('Supabase access token is unavailable.');

const expectedFunctions=new Map([
  ['_roster_jsonb_is_positive_safe_integer(jsonb)',{name:'_roster_jsonb_is_positive_safe_integer',owner:'postgres',language:'sql',security_definer:false,volatility:'i',parallel:'s',result:'boolean',authenticated:false}],
  ['_validate_roster_schema5_plaintext(jsonb)',{name:'_validate_roster_schema5_plaintext',owner:'postgres',language:'plpgsql',security_definer:true,volatility:'v',parallel:'u',result:'void',authenticated:false}],
  ['_roster_state_guard()',{name:'_roster_state_guard',owner:'postgres',language:'plpgsql',security_definer:true,volatility:'v',parallel:'u',result:'trigger',authenticated:false}],
  ['_roster_revision_guard()',{name:'_roster_revision_guard',owner:'postgres',language:'plpgsql',security_definer:true,volatility:'v',parallel:'u',result:'trigger',authenticated:false}],
  ['get_roster_schema_capability()',{name:'get_roster_schema_capability',owner:'postgres',language:'plpgsql',security_definer:true,volatility:'s',parallel:'s',result:'jsonb',authenticated:true}]
]);

for(const expected of expectedFunctions.values())expected.source=extractFunctionSource(contractSql,expected.name);

const auditSql=`
select jsonb_build_object(
  'capability', (
    select jsonb_build_object(
      'min', min(min_writable_schema),
      'max', max(max_writable_schema),
      'rows', count(*),
      'updated_at', max(updated_at)
    )
    from public.roster_schema_capability
  ),
  'row_counts', jsonb_build_object(
    'auth_users', (select count(*) from auth.users),
    'auth_identities', (select count(*) from auth.identities),
    'roster_state', (select count(*) from public.roster_state),
    'roster_revisions', (select count(*) from public.roster_revisions),
    'calendar_feeds', (select count(*) from public.calendar_feeds)
  ),
  'functions', (
    select jsonb_agg(jsonb_build_object(
      'identity', p.oid::regprocedure::text,
      'owner', pg_get_userbyid(p.proowner),
      'language', l.lanname,
      'security_definer', p.prosecdef,
      'volatility', p.provolatile::text,
      'parallel', p.proparallel::text,
      'configuration', p.proconfig,
      'result', pg_get_function_result(p.oid),
      'source', p.prosrc,
      'public_execute', has_function_privilege('public',p.oid,'EXECUTE'),
      'anon_execute', has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'service_role_execute', has_function_privilege('service_role',p.oid,'EXECUTE')
    ) order by p.oid::regprocedure::text)
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    join pg_language l on l.oid=p.prolang
    where n.nspname='public'
      and p.oid in (
        'public._roster_jsonb_is_positive_safe_integer(jsonb)'::regprocedure,
        'public._validate_roster_schema5_plaintext(jsonb)'::regprocedure,
        'public._roster_state_guard()'::regprocedure,
        'public._roster_revision_guard()'::regprocedure,
        'public.get_roster_schema_capability()'::regprocedure
      )
  )
) as audit;
`;

const authenticatedAttestationSql=`
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select public.get_roster_schema_capability() as attestation;
`;

const mutationSql=`
begin;

do $phase10b_enable_schema5$
declare
    capability_rows integer;
    minimum_schema integer;
    maximum_schema integer;
    changed_rows integer;
begin
    select min_writable_schema, max_writable_schema
      into minimum_schema, maximum_schema
    from public.roster_schema_capability
    where singleton = true
    for update;

    select count(*)
      into capability_rows
    from public.roster_schema_capability;

    if not found
       or capability_rows <> 1
       or minimum_schema <> 4
       or maximum_schema <> 4 then
        raise exception 'Phase 10B Step 6 requires the exact singleton capability 4..4';
    end if;

    update public.roster_schema_capability
       set max_writable_schema = 5,
           updated_at = now()
     where singleton = true
       and min_writable_schema = 4
       and max_writable_schema = 4;

    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then
        raise exception 'Phase 10B Step 6 expected exactly one changed capability row, received %', changed_rows;
    end if;

    if not exists (
        select 1
        from public.roster_schema_capability
        where singleton = true
          and min_writable_schema = 4
          and max_writable_schema = 5
    ) or (select count(*) from public.roster_schema_capability) <> 1 then
        raise exception 'Phase 10B Step 6 capability postcondition is not exactly 4..5';
    end if;
end;
$phase10b_enable_schema5$;

commit;
`;

const catalogQueries=new Map();
for(const file of catalogFiles)catalogQueries.set(file,await readFile(new URL(file,queryRoot),'utf8'));
const allowedSql=new Set([auditSql,authenticatedAttestationSql,mutationSql,...catalogQueries.values()]);
const confirmations=[];
let mutationRequests=0;

function sha256Text(value){return crypto.createHash('sha256').update(value).digest('hex');}

function stableJson(value){
  if(Array.isArray(value))return `[${value.map(stableJson).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sha256Json(value){return sha256Text(stableJson(value));}

function extractFunctionSource(sql,name){
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=sql.match(new RegExp(`create or replace function public\\.${escaped}\\s*\\([\\s\\S]*?as \\$function\\$([\\s\\S]*?)\\$function\\$;`,'i'));
  if(!match)throw new Error(`Could not derive reviewed source for public.${name} from the accepted contract.`);
  return match[1];
}

function confirmTarget(operation,path,options){
  if(requestedRef!==STAGING_REF||requestedRef===PRODUCTION_REF)throw new Error(`Target changed before ${operation}.`);
  if(typeof path!=='string'||path.includes(PRODUCTION_REF)||!(path===`/v1/projects/${STAGING_REF}`||path.startsWith(`/v1/projects/${STAGING_REF}/`)))throw new Error(`Unsafe remote path before ${operation}: ${path}`);
  const method=String(options?.method||'GET').toUpperCase();
  if(method!=='GET'&&method!=='POST')throw new Error(`Unsupported method before ${operation}: ${method}`);
  if(method==='POST'){
    if(path!==`/v1/projects/${STAGING_REF}/database/query`)throw new Error(`Only the exact staging SQL endpoint may receive POST: ${path}`);
    const body=JSON.parse(String(options?.body||''));
    if(!allowedSql.has(body.query))throw new Error(`Refusing unapproved SQL before ${operation}.`);
    if(body.query===mutationSql){
      mutationRequests+=1;
      if(mutationRequests!==1)throw new Error('Refusing more than one capability mutation request.');
    }
  }
  confirmations.push({operation,target_ref:STAGING_REF,production_refused:true,method});
}

async function management(path,options={},operation){
  confirmTarget(operation,path,options);
  const response=await fetch(`https://api.supabase.com${path}`,{
    ...options,
    headers:{Authorization:`Bearer ${token}`,...(options.body?{'Content-Type':'application/json'}:{})}
  });
  const body=await response.text();
  if(!response.ok)throw new Error(`${operation} failed (${response.status}): ${body}`);
  return body?JSON.parse(body):null;
}

async function query(sql,operation){
  return management(`/v1/projects/${STAGING_REF}/database/query`,{method:'POST',body:JSON.stringify({query:sql})},operation);
}

function assertProject(project,label){
  if(project?.ref!==STAGING_REF||project?.name!==STAGING_NAME||project?.status!=='ACTIVE_HEALTHY')throw new Error(`${label}: unexpected target identity ${JSON.stringify({ref:project?.ref,name:project?.name,status:project?.status})}`);
}

function assertAuth(config,label){
  if(config?.site_url!==SITE_URL)throw new Error(`${label}: Auth site URL is not exactly ${SITE_URL}.`);
  if(config?.uri_allow_list!==REDIRECT_ALLOW_LIST)throw new Error(`${label}: Auth redirect allowlist is not exactly ${REDIRECT_ALLOW_LIST}.`);
  const redirects=String(config.uri_allow_list).split(',').map(value=>value.trim()).filter(Boolean);
  if(redirects.length!==1||redirects[0]!==REDIRECT_ALLOW_LIST)throw new Error(`${label}: Auth redirect allowlist contains an additional destination.`);
}

function assertAudit(audit,expectedMaximum,label){
  if(Number(audit?.capability?.rows)!==1||Number(audit?.capability?.min)!==4||Number(audit?.capability?.max)!==expectedMaximum)throw new Error(`${label}: capability is not exactly singleton 4..${expectedMaximum}.`);
  for(const key of ['auth_users','auth_identities','roster_state','roster_revisions','calendar_feeds'])if(Number(audit?.row_counts?.[key])!==0)throw new Error(`${label}: ${key} count is not zero.`);
  const actualFunctions=new Map((audit?.functions||[]).map(item=>[item.identity,item]));
  if(actualFunctions.size!==expectedFunctions.size)throw new Error(`${label}: reviewed Phase 10B function inventory differs.`);
  for(const [identity,expected] of expectedFunctions){
    const actual=actualFunctions.get(identity);
    if(!actual)throw new Error(`${label}: missing reviewed function ${identity}.`);
    const expectedConfiguration=['search_path=public, pg_temp'];
    for(const [field,value] of Object.entries({owner:expected.owner,language:expected.language,security_definer:expected.security_definer,volatility:expected.volatility,parallel:expected.parallel,result:expected.result,source:expected.source})){
      if(stableJson(actual[field])!==stableJson(value))throw new Error(`${label}: ${identity} ${field} differs from the reviewed contract.`);
    }
    if(stableJson(actual.configuration)!==stableJson(expectedConfiguration))throw new Error(`${label}: ${identity} search_path differs from the reviewed contract.`);
    if(actual.public_execute!==false||actual.anon_execute!==false||actual.service_role_execute!==false||actual.authenticated_execute!==expected.authenticated)throw new Error(`${label}: ${identity} grants differ from the reviewed contract.`);
  }
}

function assertAttestation(value,label){
  const expected={environment:'isolated-staging',project_ref:STAGING_REF,contract:'rosterbot-schema5-cloud-v1',min_writable_schema:4,max_writable_schema:5};
  if(stableJson(value)!==stableJson(expected))throw new Error(`${label}: authenticated attestation does not match the reviewed schema-5 contract: ${stableJson(value)}.`);
}

async function captureCatalog(label){
  const hashes={};
  for(const [file,sql] of catalogQueries){
    const rows=await query(sql,`${label} catalog/security definition: ${file}`);
    hashes[file]={rows:rows.length,sha256:sha256Json(rows)};
  }
  return hashes;
}

const projectBefore=await management(`/v1/projects/${STAGING_REF}`,{},'confirm exact staging identity before Step 6 preflight');
assertProject(projectBefore,'Preflight');
const authBefore=await management(`/v1/projects/${STAGING_REF}/config/auth`,{},'read exact staging Auth configuration before Step 6');
assertAuth(authBefore,'Preflight');
const authBeforeHash=sha256Json(authBefore);
const auditBefore=(await query(auditSql,'verify capability, reviewed contract and empty staging before Step 6'))?.[0]?.audit;
assertAudit(auditBefore,4,'Preflight');
const catalogBefore=await captureCatalog('pre-mutation');

// This is deliberately the final remote request before the one mutation.
const projectImmediatelyBeforeMutation=await management(`/v1/projects/${STAGING_REF}`,{},'reconfirm exact staging identity immediately before capability mutation');
assertProject(projectImmediatelyBeforeMutation,'Immediate pre-mutation check');

await query(mutationSql,'perform the one transactional staging capability 4..4 to 4..5 change');

const auditAfter=(await query(auditSql,'verify capability, reviewed contract and empty staging after Step 6'))?.[0]?.audit;
assertAudit(auditAfter,5,'Postcondition');
const attestation=(await query(authenticatedAttestationSql,'read reviewed capability attestation as authenticated after Step 6'))?.[0]?.attestation;
assertAttestation(attestation,'Postcondition');
const catalogAfter=await captureCatalog('post-mutation');
if(stableJson(catalogAfter)!==stableJson(catalogBefore))throw new Error('Catalog or security definitions changed during the capability update.');
const authAfter=await management(`/v1/projects/${STAGING_REF}/config/auth`,{},'verify exact staging Auth configuration after Step 6');
assertAuth(authAfter,'Postcondition');
if(sha256Json(authAfter)!==authBeforeHash)throw new Error('Auth configuration changed during the capability update.');
const projectAfter=await management(`/v1/projects/${STAGING_REF}`,{},'verify exact staging identity after Step 6');
assertProject(projectAfter,'Postcondition');

console.log(JSON.stringify({
  phase:'Phase 10B Step 6 isolated-staging schema-5 capability enablement',
  target:{ref:projectAfter.ref,name:projectAfter.name,status:projectAfter.status},
  production_refused:PRODUCTION_REF,
  reviewed_contract:{sql_sha256:contractSha256,function_definitions_and_grants:'exact match'},
  auth:{site_url:authAfter.site_url,uri_allow_list:authAfter.uri_allow_list,configuration_sha256:sha256Json(authAfter),unchanged:true},
  mutation:{transactional:true,locked_singleton:true,asserted_before:{min_writable_schema:4,max_writable_schema:4,rows:1},changed_columns:['max_writable_schema','updated_at'],max_writable_schema:{before:4,after:5},affected_rows:1},
  capability_before:auditBefore.capability,
  capability_after:auditAfter.capability,
  authenticated_attestation:attestation,
  remote_row_counts:auditAfter.row_counts,
  catalog_security:{before:catalogBefore,after:catalogAfter,unchanged:true},
  mutation_requests:mutationRequests,
  confirmations
},null,2));
