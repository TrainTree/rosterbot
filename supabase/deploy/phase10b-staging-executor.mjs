#!/usr/bin/env node

import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

const STAGING_REF='wuzyurvrztskljpxpeaq';
const STAGING_NAME='rosterbot-phase8c-staging';
const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const requiredConfirmation=`APPLY_PHASE10B_CONTRACT_TO_${STAGING_REF}`;
const requestedRef=String(process.env.PHASE10B_STAGING_PROJECT_REF||'');
const confirmation=String(process.env.PHASE10B_CONFIRM||'');
const sqlUrl=new URL('../staging/phase10b-capability-attestation-schema5-contract.sql',import.meta.url);

if(requestedRef!==STAGING_REF)throw new Error(`Refusing apply: PHASE10B_STAGING_PROJECT_REF must equal ${STAGING_REF}.`);
if(requestedRef===PRODUCTION_REF)throw new Error(`Refusing apply against production ${PRODUCTION_REF}.`);
if(confirmation!==requiredConfirmation)throw new Error(`Refusing apply: PHASE10B_CONFIRM must equal ${requiredConfirmation}.`);

const token=(await readFile(join(homedir(),'.supabase','access-token'),'utf8')).trim();
if(!token)throw new Error('Supabase access token is unavailable.');
const sql=await readFile(sqlUrl,'utf8');
const checksum=crypto.createHash('sha256').update(sql).digest('hex');
const confirmations=[];

function confirmTarget(operation){
  if(requestedRef!==STAGING_REF||requestedRef===PRODUCTION_REF)throw new Error(`Target changed before ${operation}.`);
  confirmations.push({operation,target_ref:requestedRef,production_refused:true});
}

async function management(path,options={},operation){
  confirmTarget(operation);
  if(!path.includes(`/projects/${STAGING_REF}`)||path.includes(PRODUCTION_REF))throw new Error(`Unsafe remote path: ${path}`);
  const response=await fetch(`https://api.supabase.com${path}`,{
    ...options,
    headers:{Authorization:`Bearer ${token}`,...(options.body?{'Content-Type':'application/json'}:{})}
  });
  const text=await response.text();
  if(!response.ok)throw new Error(`${operation} failed (${response.status}): ${text}`);
  return text?JSON.parse(text):null;
}

const project=await management(`/v1/projects/${STAGING_REF}`,{},'confirm staging identity immediately before apply');
if(project.ref!==STAGING_REF||project.name!==STAGING_NAME||project.status!=='ACTIVE_HEALTHY')throw new Error(`Unexpected target identity: ${JSON.stringify({ref:project.ref,name:project.name,status:project.status})}`);

const result=await management(`/v1/projects/${STAGING_REF}/database/query`,{
  method:'POST',body:JSON.stringify({query:sql})
},'apply Phase 10B staging-only contract SQL');

const postSql=`
select jsonb_build_object(
  'capability', (select jsonb_build_object('min',min_writable_schema,'max',max_writable_schema,'rows',count(*) over ()) from public.roster_schema_capability where singleton=true),
  'attestation_function', to_regprocedure('public.get_roster_schema_capability()')::text,
  'attestation_authenticated', has_function_privilege('authenticated','public.get_roster_schema_capability()','EXECUTE'),
  'attestation_anon', has_function_privilege('anon','public.get_roster_schema_capability()','EXECUTE'),
  'attestation_service_role', has_function_privilege('service_role','public.get_roster_schema_capability()','EXECUTE'),
  'schema5_validator', to_regprocedure('public._validate_roster_schema5_plaintext(jsonb)')::text,
  'row_counts', jsonb_build_object(
    'state',(select count(*) from public.roster_state),
    'history',(select count(*) from public.roster_revisions),
    'calendar',(select count(*) from public.calendar_feeds),
    'auth_users',(select count(*) from auth.users)
  )
) as evidence;
`;
const post=await management(`/v1/projects/${STAGING_REF}/database/query`,{
  method:'POST',body:JSON.stringify({query:postSql})
},'verify Phase 10B postconditions and capability 4');
const evidence=post?.[0]?.evidence;
if(evidence?.capability?.min!==4||evidence?.capability?.max!==4||Number(evidence?.capability?.rows)!==1)throw new Error('Capability changed during Phase 10B apply.');
if(evidence?.attestation_function!=='get_roster_schema_capability()'||evidence?.schema5_validator!=='_validate_roster_schema5_plaintext(jsonb)')throw new Error('Phase 10B functions are missing.');
if(!evidence?.attestation_authenticated||evidence?.attestation_anon||evidence?.attestation_service_role)throw new Error('Capability attestation grants are unsafe.');
for(const [name,count] of Object.entries(evidence?.row_counts||{}))if(Number(count)!==0)throw new Error(`${name} changed during contract apply.`);

console.log(JSON.stringify({
  phase:'Phase 10B steps 1-3 staging contract apply',
  target:{ref:project.ref,name:project.name,status:project.status},
  production_refused:PRODUCTION_REF,
  confirmations,
  sql_file:'supabase/staging/phase10b-capability-attestation-schema5-contract.sql',
  sql_sha256:checksum,
  apply_result:result,
  postcondition:evidence
},null,2));
