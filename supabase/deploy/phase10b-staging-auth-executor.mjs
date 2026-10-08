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
const requestedRef=String(process.env.PHASE10B_AUTH_STAGING_PROJECT_REF||'');
const confirmation=String(process.env.PHASE10B_AUTH_CONFIRM||'');
const requiredConfirmation=`CONFIGURE_PHASE10B_AUTH_ON_${STAGING_REF}`;

// These checks intentionally happen before credentials are read or any remote
// request is constructed. There is no caller-selectable remote target.
if(requestedRef===PRODUCTION_REF)throw new Error(`Refusing Auth configuration against production ${PRODUCTION_REF}.`);
if(requestedRef!==STAGING_REF)throw new Error(`Refusing Auth configuration: PHASE10B_AUTH_STAGING_PROJECT_REF must equal ${STAGING_REF}.`);
if(confirmation!==requiredConfirmation)throw new Error(`Refusing Auth configuration: PHASE10B_AUTH_CONFIRM must equal ${requiredConfirmation}.`);
if(SITE_URL!=='https://beta.rosterbot.work'||REDIRECT_ALLOW_LIST!=='https://beta.rosterbot.work/')throw new Error('Approved beta Auth origins changed in source.');
if(/[,*\s]/.test(REDIRECT_ALLOW_LIST)||REDIRECT_ALLOW_LIST.includes('localhost')||REDIRECT_ALLOW_LIST.includes('index.html'))throw new Error('Redirect allowlist is not the single approved beta root.');

const token=(await readFile(join(homedir(),'.supabase','access-token'),'utf8')).trim();
if(!token)throw new Error('Supabase access token is unavailable.');

const confirmations=[];
const authPatch=Object.freeze({site_url:SITE_URL,uri_allow_list:REDIRECT_ALLOW_LIST});
const auditSql=`
select jsonb_build_object(
  'capability', (select jsonb_build_object(
    'min', min(min_writable_schema),
    'max', max(max_writable_schema),
    'rows', count(*)
  ) from public.roster_schema_capability where singleton=true),
  'state', (select count(*) from public.roster_state),
  'history', (select count(*) from public.roster_revisions),
  'calendar', (select count(*) from public.calendar_feeds),
  'auth_users', (select count(*) from auth.users),
  'auth_identities', (select count(*) from auth.identities)
) as audit;
`;

function stableJson(value){
  if(Array.isArray(value))return `[${value.map(stableJson).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sha256(value){return crypto.createHash('sha256').update(stableJson(value)).digest('hex');}

function withoutUrlConfiguration(config){
  return Object.fromEntries(Object.entries(config).filter(([key])=>key!=='site_url'&&key!=='uri_allow_list'));
}

function categoryHash(config,predicate){
  return sha256(Object.fromEntries(Object.entries(config).filter(([key])=>predicate(key))));
}

function unchangedCategoryHashes(config){
  return {
    signup:categoryHash(config,key=>['disable_signup','external_anonymous_users_enabled','external_email_enabled','external_phone_enabled','mailer_allow_unverified_email_sign_ins','mailer_autoconfirm','sms_autoconfirm'].includes(key)),
    auth_providers:categoryHash(config,key=>key.startsWith('external_')),
    smtp:categoryHash(config,key=>key.startsWith('smtp_')),
    jwt_sessions:categoryHash(config,key=>key.includes('jwt')||key.startsWith('sessions_')||key.startsWith('refresh_token_')||key==='security_refresh_token_reuse_interval'),
    captcha:categoryHash(config,key=>key.startsWith('security_captcha_'))
  };
}

function confirmTarget(operation,path,options){
  if(requestedRef!==STAGING_REF||requestedRef===PRODUCTION_REF)throw new Error(`Target changed before ${operation}.`);
  if(typeof path!=='string'||path.includes(PRODUCTION_REF)||!(path===`/v1/projects/${STAGING_REF}`||path.startsWith(`/v1/projects/${STAGING_REF}/`)))throw new Error(`Unsafe remote path before ${operation}: ${path}`);
  const method=String(options?.method||'GET').toUpperCase();
  if(method!=='GET'&&method!=='POST'&&method!=='PATCH')throw new Error(`Unsupported method before ${operation}: ${method}`);
  if(method==='PATCH'){
    if(path!==`/v1/projects/${STAGING_REF}/config/auth`)throw new Error(`Only the exact staging Auth endpoint may be patched: ${path}`);
    const body=JSON.parse(String(options?.body||''));
    if(stableJson(body)!==stableJson(authPatch))throw new Error(`Unsafe Auth patch before ${operation}.`);
  }
  if(method==='POST'){
    if(path!==`/v1/projects/${STAGING_REF}/database/query`)throw new Error(`Only exact staging read-only SQL may be posted: ${path}`);
    const body=JSON.parse(String(options?.body||''));
    if(body.query!==auditSql)throw new Error(`Refusing non-audit SQL before ${operation}.`);
  }
  confirmations.push({operation,target_ref:STAGING_REF,method});
}

async function management(path,options={},operation){
  confirmTarget(operation,path,options);
  const response=await fetch(`https://api.supabase.com${path}`,{
    ...options,
    headers:{Authorization:`Bearer ${token}`,...(options.body?{'Content-Type':'application/json'}:{})}
  });
  const text=await response.text();
  if(!response.ok)throw new Error(`${operation} failed (${response.status}): ${text}`);
  return text?JSON.parse(text):null;
}

function assertProject(project,label){
  if(project?.ref!==STAGING_REF||project?.name!==STAGING_NAME||project?.status!=='ACTIVE_HEALTHY')throw new Error(`${label}: unexpected target identity ${JSON.stringify({ref:project?.ref,name:project?.name,status:project?.status})}`);
}

function assertAudit(audit,label){
  if(Number(audit?.capability?.rows)!==1||Number(audit?.capability?.min)!==4||Number(audit?.capability?.max)!==4)throw new Error(`${label}: server schema capability is not exactly singleton 4..4.`);
  for(const key of ['state','history','calendar','auth_users','auth_identities'])if(Number(audit?.[key])!==0)throw new Error(`${label}: ${key} count is not zero.`);
}

function assertAuthUrls(config,label){
  if(config?.site_url!==SITE_URL)throw new Error(`${label}: site_url is not the exact approved beta origin.`);
  if(config?.uri_allow_list!==REDIRECT_ALLOW_LIST)throw new Error(`${label}: redirect allowlist is not the exact approved beta root.`);
  const destinations=config.uri_allow_list.split(',').map(value=>value.trim()).filter(Boolean);
  if(destinations.length!==1||destinations[0]!==REDIRECT_ALLOW_LIST)throw new Error(`${label}: redirect allowlist contains an additional destination.`);
}

const projectBefore=await management(`/v1/projects/${STAGING_REF}`,{},'confirm exact staging identity before preflight');
assertProject(projectBefore,'Preflight');
const authBefore=await management(`/v1/projects/${STAGING_REF}/config/auth`,{},'read staging Auth configuration before patch');
const auditBeforeResult=await management(`/v1/projects/${STAGING_REF}/database/query`,{method:'POST',body:JSON.stringify({query:auditSql})},'audit staging capability and rows before patch');
const auditBefore=auditBeforeResult?.[0]?.audit;
assertAudit(auditBefore,'Preflight');

// Re-read and assert the immutable project identity immediately before the only
// remote write. management() independently validates the exact ref/path/body.
const projectImmediatelyBeforeWrite=await management(`/v1/projects/${STAGING_REF}`,{},'reconfirm exact staging identity immediately before Auth patch');
assertProject(projectImmediatelyBeforeWrite,'Immediate pre-write check');
await management(`/v1/projects/${STAGING_REF}/config/auth`,{method:'PATCH',body:JSON.stringify(authPatch)},'patch only staging Auth site URL and redirect allowlist');

const authAfter=await management(`/v1/projects/${STAGING_REF}/config/auth`,{},'read back staging Auth configuration after patch');
assertAuthUrls(authAfter,'Readback');
const beforeUntouched=withoutUrlConfiguration(authBefore);
const afterUntouched=withoutUrlConfiguration(authAfter);
if(stableJson(afterUntouched)!==stableJson(beforeUntouched))throw new Error('A non-URL Auth configuration value changed.');

const auditAfterResult=await management(`/v1/projects/${STAGING_REF}/database/query`,{method:'POST',body:JSON.stringify({query:auditSql})},'reconfirm staging capability and zero rows after patch');
const auditAfter=auditAfterResult?.[0]?.audit;
assertAudit(auditAfter,'Postcondition');
const projectAfter=await management(`/v1/projects/${STAGING_REF}`,{},'reconfirm exact staging identity after Auth patch');
assertProject(projectAfter,'Postcondition');

const beforeCategoryHashes=unchangedCategoryHashes(authBefore);
const afterCategoryHashes=unchangedCategoryHashes(authAfter);
if(stableJson(beforeCategoryHashes)!==stableJson(afterCategoryHashes))throw new Error('A protected Auth configuration category changed.');

console.log(JSON.stringify({
  phase:'Phase 10B Step 4 staging Auth origin configuration',
  target:{ref:projectAfter.ref,name:projectAfter.name,status:projectAfter.status},
  production_refused:PRODUCTION_REF,
  patch_body:authPatch,
  readback:{site_url:authAfter.site_url,uri_allow_list:authAfter.uri_allow_list,redirect_destinations:[REDIRECT_ALLOW_LIST]},
  unchanged_auth_configuration:{all_non_url_fields:true,non_url_sha256:sha256(afterUntouched),category_sha256:afterCategoryHashes},
  audit_before:auditBefore,
  audit_after:auditAfter,
  confirmations
},null,2));
