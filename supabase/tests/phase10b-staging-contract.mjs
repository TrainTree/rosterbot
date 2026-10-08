#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const errorContract=require('../../js/04-cloud-error-contract.js');
const STAGING_REF='wuzyurvrztskljpxpeaq';
const STAGING_NAME='rosterbot-phase8c-staging';
const STAGING_URL=`https://${STAGING_REF}.supabase.co`;
const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const requestedRef=String(process.env.PHASE10B_STAGING_PROJECT_REF||'');
const confirmation=String(process.env.PHASE10B_CONFIRM_TESTS||'');
if(requestedRef!==STAGING_REF)throw new Error(`Refusing tests: target must be ${STAGING_REF}.`);
if(requestedRef===PRODUCTION_REF)throw new Error(`Refusing tests against production ${PRODUCTION_REF}.`);
if(confirmation!==`TEST_PHASE10B_CONTRACT_ON_${STAGING_REF}`)throw new Error('Refusing tests: exact Phase 10B staging confirmation is missing.');

const accessToken=(await readFile(join(homedir(),'.supabase','access-token'),'utf8')).trim();
if(!accessToken)throw new Error('Supabase access token is unavailable.');
const confirmations=[];
const createdUsers=[];
let assertions=0;
const check=(condition,message)=>{assert(condition,message);assertions++};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);assertions++;};

function confirmTarget(operation,url){
  if(requestedRef!==STAGING_REF||requestedRef===PRODUCTION_REF)throw new Error(`Target changed before ${operation}.`);
  const parsed=new URL(url);
  const managementHost=parsed.hostname==='api.supabase.com'&&parsed.pathname.includes(`/projects/${STAGING_REF}`);
  const stagingHost=parsed.hostname===`${STAGING_REF}.supabase.co`;
  if(!managementHost&&!stagingHost)throw new Error(`Remote URL is not exact staging for ${operation}: ${url}`);
  if(url.includes(PRODUCTION_REF))throw new Error(`Production URL forbidden for ${operation}.`);
  confirmations.push({operation,target_ref:STAGING_REF});
}

async function remote(url,options={},operation='remote request'){
  confirmTarget(operation,url);
  const response=await fetch(url,options);
  const text=await response.text();
  let data=null;if(text){try{data=JSON.parse(text)}catch{data=text}}
  return {ok:response.ok,status:response.status,data};
}

const management=(path,options={},operation)=>remote(`https://api.supabase.com${path}`,{
  ...options,
  headers:{Authorization:`Bearer ${accessToken}`,...(options.body?{'Content-Type':'application/json'}:{})}
},operation);

const projectResult=await management(`/v1/projects/${STAGING_REF}`,{},'confirm staging identity before credential lookup');
check(projectResult.ok,JSON.stringify(projectResult.data));
check(projectResult.data.ref===STAGING_REF&&projectResult.data.name===STAGING_NAME&&projectResult.data.status==='ACTIVE_HEALTHY','Unexpected staging identity.');
const keyResult=await management(`/v1/projects/${STAGING_REF}/api-keys`,{},'load isolated staging API keys');
check(keyResult.ok,JSON.stringify(keyResult.data));
const anonKey=keyResult.data.find(key=>key.name==='anon'&&key.type==='legacy')?.api_key;
const serviceKey=keyResult.data.find(key=>key.name==='service_role'&&key.type==='legacy')?.api_key;
if(!anonKey||!serviceKey)throw new Error('Staging API keys unavailable.');

async function api(path,{method='GET',key=anonKey,token=null,body}={},operation=path){
  const headers={apikey:key,Authorization:`Bearer ${token||key}`};
  if(body!==undefined)headers['Content-Type']='application/json';
  return remote(`${STAGING_URL}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)},operation);
}

function plain4(label){return {app:'RosterBotPayBot',version:'0.30.0-phase10b',schemaVersion:4,exportedAt:'2026-10-08T00:00:00.000Z',privacy:'synthetic staging fixture',storage:{'rosterbot-db-schema-v1':'4','phase10b-synthetic':label}};}
function plain5(label){
  const generation=crypto.createHash('sha256').update(`generation:${label}`).digest('hex');
  const source=crypto.createHash('sha256').update(`source:${label}`).digest('hex');
  return {format:'rosterbot-personal-state',formatVersion:1,storageSchemaVersion:5,minimumReaderSchema:5,writer:{app:'RosterBotPayBot',version:'0.30.0',build:'phase10b-staging-contract'},generation:{number:1,id:`1:${generation}`,kind:'state',fingerprint:generation,predecessorFingerprint:null},checksum:{algorithm:'SHA-256',canonicalisation:'rosterbot-canonical-json-v1',scope:'rosterbot-schema5-content-v1',value:generation},timestamps:{createdAt:'2026-10-08T00:00:00.000Z',updatedAt:'2026-10-08T00:00:00.000Z'},personalState:{kind:'state',entries:{}},extensions:{},migration:{fromSchema:4,migratedAt:'2026-10-08T00:00:00.000Z',source:'phase10b-synthetic',sourceFingerprint:source,sourceGeneration:null,warnings:[]},previousGeneration:null,compatibility:{schemaVersion:4,status:'lossless',projectionFingerprint:source}};
}

async function createUser(label){
  const suffix=crypto.randomBytes(8).toString('hex'),email=`phase10b-${label}-${suffix}@example.invalid`,password=`Phase10B-${suffix}-synthetic!`;
  const made=await api('/auth/v1/admin/users',{method:'POST',key:serviceKey,body:{email,password,email_confirm:true,user_metadata:{purpose:'phase10b-staging-only'}}},`create synthetic ${label} user`);
  check(made.ok,JSON.stringify(made.data));createdUsers.push(made.data.id);
  const signed=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}},`sign in synthetic ${label} user`);
  check(signed.ok,JSON.stringify(signed.data));
  return {id:made.data.id,token:signed.data.access_token};
}

const rpc=(user,name,body={})=>api(`/rest/v1/rpc/${name}`,{method:'POST',token:user.token,body},`${name} as authenticated synthetic user`);
const save=(user,expected,schema,payload,client)=>rpc(user,'save_roster_state',{expected_revision:expected,new_schema_version:schema,new_payload:payload,new_client_id:client});
const state=user=>api(`/rest/v1/roster_state?select=user_id,revision,schema_version,payload,client_id,updated_at&user_id=eq.${user.id}`,{token:user.token},'read own current roster state');
const history=user=>api(`/rest/v1/roster_revisions?select=user_id,revision,schema_version,payload,client_id,created_at&user_id=eq.${user.id}&order=revision.asc`,{token:user.token},'read own roster history');
const snapshot=async user=>JSON.stringify({state:(await state(user)).data,history:(await history(user)).data});
function expectError(result,code,message){equal(result.ok,false);equal(result.data?.code,code,JSON.stringify(result.data));equal(result.data?.message,message,JSON.stringify(result.data));const classified=errorContract.classify(result.data);check(!!classified,`Unclassified error ${code}`);equal(classified.retry,false);}

let suiteEvidence=null;
try{
  const userA=await createUser('contract-a'),userB=await createUser('contract-b'),userC=await createUser('sql-c');

  const attestation=await rpc(userA,'get_roster_schema_capability');
  check(attestation.ok,JSON.stringify(attestation.data));
  equal(attestation.data,{environment:'isolated-staging',project_ref:STAGING_REF,contract:'rosterbot-schema5-cloud-v1',min_writable_schema:4,max_writable_schema:4});

  const anonymousAttestation=await api('/rest/v1/rpc/get_roster_schema_capability',{method:'POST',body:{}},'verify anonymous attestation denial');
  equal(anonymousAttestation.ok,false);check(anonymousAttestation.data?.code==='42501'||String(anonymousAttestation.data?.code||'').startsWith('PGRST'),JSON.stringify(anonymousAttestation.data));
  const spoofed=await rpc(userA,'get_roster_schema_capability',{environment:'isolated-staging',project_ref:STAGING_REF,contract:'rosterbot-schema5-cloud-v1',min_writable_schema:4,max_writable_schema:5});
  equal(spoofed.ok,false,'Caller-supplied capability fields unexpectedly selected an RPC contract.');

  const first=await save(userA,0,4,plain4('first'),'phase10b-a');check(first.ok,JSON.stringify(first.data));equal(Number(first.data[0].revision),1);
  const simultaneous=await Promise.all([
    save(userA,1,4,plain4('concurrent-one'),'phase10b-one'),
    save(userA,1,4,plain4('concurrent-two'),'phase10b-two')
  ]);
  equal(simultaneous.filter(result=>result.ok).length,1,'Same-revision concurrency did not serialize to one winner.');
  const conflict=simultaneous.find(result=>!result.ok);expectError(conflict,'RB003','revision_conflict');
  const afterConcurrency=await snapshot(userA);
  const stateRows=(await state(userA)).data,historyRows=(await history(userA)).data;
  equal(Number(stateRows[0].revision),2);equal(stateRows[0].schema_version,4);equal(historyRows.map(row=>[Number(row.revision),row.schema_version]),[[1,4],[2,4]]);

  const held=await save(userA,2,5,plain5('held-valid'),'configured-client-claims-five');expectError(held,'RB002','schema_too_new');equal(await snapshot(userA),afterConcurrency,'Held schema-5 write changed state/history.');
  const malformedFive=await save(userA,2,5,{format:'rosterbot-personal-state',storageSchemaVersion:5},'malformed-five');expectError(malformedFive,'RB002','schema_too_new');equal(await snapshot(userA),afterConcurrency,'Malformed held schema-5 write changed state/history.');
  const disagreement=await save(userA,2,4,plain5('row-payload-disagreement'),'mismatch');expectError(disagreement,'RB004','payload_schema_mismatch');equal(await snapshot(userA),afterConcurrency,'Schema disagreement changed state/history.');
  const malformedFour=await save(userA,2,4,{app:'RosterBotPayBot',schemaVersion:4,storage:[]},'malformed-four');expectError(malformedFour,'RB005','payload_malformed');equal(await snapshot(userA),afterConcurrency,'Malformed schema-4 write changed state/history.');

  const crossRead=await api(`/rest/v1/roster_state?select=user_id&user_id=eq.${userA.id}`,{token:userB.token},'verify RLS isolation');
  check(crossRead.ok,JSON.stringify(crossRead.data));equal(crossRead.data,[],'RLS disclosed another user state.');

  const sqlTemplate=await readFile(new URL('./phase10b-server-contract.sql',import.meta.url),'utf8');
  const sql=sqlTemplate.replaceAll('__USER_C__',userC.id);
  const sqlResult=await management(`/v1/projects/${STAGING_REF}/database/query`,{method:'POST',body:JSON.stringify({query:sql})},'run transactional Phase 10B validator and guard contract');
  check(sqlResult.ok,JSON.stringify(sqlResult.data));
  const contract=sqlResult.data?.[0]?.phase10b_contract;
  equal(contract?.capability,{min:4,max:4});equal(contract?.trigger_count,3);equal(contract?.rls_enabled,true);
  equal(contract?.attestation?.identity,'get_roster_schema_capability()');equal(contract?.attestation?.volatility,'s');equal(contract?.attestation?.security_definer,true);equal(contract?.attestation?.authenticated_execute,true);equal(contract?.attestation?.anon_execute,false);equal(contract?.attestation?.service_execute,false);
  equal(contract?.validator_cases?.length,14,'Not all schema-5/guard contract cases ran.');
  for(const item of contract.validator_cases){check(['RB001','RB004','RB005','RB007'].includes(item.error_code),`Unexpected SQL contract error ${JSON.stringify(item)}`);const classified=errorContract.classify({code:item.error_code,message:item.error_message});check(!!classified&&classified.retry===false,`Non-deterministic classification ${JSON.stringify(item)}`);}

  suiteEvidence={attestation:attestation.data,spoofed_attestation:{status:spoofed.status,code:spoofed.data?.code??null},schema4:{current_revision:2,history_revisions:[1,2],concurrent_winners:1,concurrent_conflicts:1},schema5_hold:{status:held.status,code:held.data.code,message:held.data.message,state_unchanged:true},malformed_schema5:{status:malformedFive.status,code:malformedFive.data.code,message:malformedFive.data.message,state_unchanged:true},schema_payload_disagreement:{status:disagreement.status,code:disagreement.data.code,message:disagreement.data.message,state_unchanged:true},rls_isolation:true,sql_contract:contract};
}finally{
  for(const id of createdUsers.reverse()){
    const removed=await api(`/auth/v1/admin/users/${id}`,{method:'DELETE',key:serviceKey},'delete Phase 10B synthetic user');
    if(!removed.ok)throw new Error(`Synthetic user cleanup failed (${removed.status}): ${JSON.stringify(removed.data)}`);
  }
}

const finalSql=`select jsonb_build_object('capability',(select max_writable_schema from public.roster_schema_capability where singleton),'state',(select count(*) from public.roster_state),'history',(select count(*) from public.roster_revisions),'calendar',(select count(*) from public.calendar_feeds),'auth_users',(select count(*) from auth.users)) as audit;`;
const finalResult=await management(`/v1/projects/${STAGING_REF}/database/query`,{method:'POST',body:JSON.stringify({query:finalSql})},'final capability and synthetic cleanup audit');
check(finalResult.ok,JSON.stringify(finalResult.data));
const finalAudit=finalResult.data?.[0]?.audit;
equal(finalAudit,{capability:4,state:0,history:0,calendar:0,auth_users:0});

console.log(JSON.stringify({phase:'Phase 10B staging capability-4 contract',target_ref:STAGING_REF,production_refused:true,result:'pass',assertions,synthetic_users_created:3,synthetic_users_deleted:3,final_audit:finalAudit,evidence:suiteEvidence,target_confirmation_count:confirmations.length},null,2));
