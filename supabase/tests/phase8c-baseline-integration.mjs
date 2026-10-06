#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const projectRef=String(process.env.PHASE8B_STAGING_PROJECT_REF||'');
const url=String(process.env.PHASE8B_STAGING_URL||'').replace(/\/$/,'');
const anonKey=String(process.env.PHASE8B_STAGING_ANON_KEY||'');
const serviceKey=String(process.env.PHASE8B_STAGING_SERVICE_ROLE_KEY||'');

if(process.env.PHASE8B_ALLOW_ISOLATED_STAGING!=='yes')throw new Error('Refusing baseline test without isolated-staging confirmation.');
if(!/^[a-z]{20}$/.test(projectRef)||projectRef===PRODUCTION_REF)throw new Error(`Refusing baseline test for project ref ${projectRef||'(missing)'}.`);
if(new URL(url).hostname!==`${projectRef}.supabase.co`)throw new Error('Staging URL/project ref mismatch.');
if(!anonKey||!serviceKey)throw new Error('Missing staging API keys.');

const createdUsers=[];
let assertions=0;
const check=(value,message)=>{assert(value,message);assertions++};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);assertions++};

function plain4(label){
  return {app:'RosterBotPayBot',version:'0.29.1-phase8c-baseline',schemaVersion:4,storage:{'rosterbot-db-schema-v1':'4','phase8c-synthetic':label}};
}

async function request(path,{method='GET',key=anonKey,token=null,body}={}){
  const headers={apikey:key,Authorization:`Bearer ${token||key}`};
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(`${url}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();
  let data=null;
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  return {ok:response.ok,status:response.status,data};
}

async function createUser(label){
  const suffix=crypto.randomBytes(8).toString('hex');
  const email=`phase8c-baseline-${label}-${suffix}@example.invalid`;
  const password=`Phase8C-${suffix}-synthetic!`;
  const made=await request('/auth/v1/admin/users',{method:'POST',key:serviceKey,body:{email,password,email_confirm:true,user_metadata:{purpose:'phase8c-baseline-only'}}});
  check(made.ok,`create user failed: ${JSON.stringify(made.data)}`);
  createdUsers.push(made.data.id);
  const signed=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
  check(signed.ok,`sign in failed: ${JSON.stringify(signed.data)}`);
  return {id:made.data.id,token:signed.data.access_token};
}

const save=(user,expected,payload)=>request('/rest/v1/rpc/save_roster_state',{method:'POST',token:user.token,body:{expected_revision:expected,new_schema_version:4,new_payload:payload,new_client_id:'v0.29-compatible'}});
const rows=(user,table)=>request(`/rest/v1/${table}?select=*&user_id=eq.${user.id}&order=revision.asc`,{token:user.token});

async function cleanup(){
  const failures=[];
  for(const id of createdUsers.reverse()){
    const result=await request(`/auth/v1/admin/users/${id}`,{method:'DELETE',key:serviceKey});
    if(!result.ok)failures.push({id,status:result.status,code:result.data?.code});
  }
  if(failures.length)throw new Error(`Synthetic-user cleanup failed: ${JSON.stringify(failures)}`);
}

try{
  const owner=await createUser('owner');
  const other=await createUser('other');
  const first=await save(owner,0,plain4('first'));
  check(first.ok,JSON.stringify(first.data));
  equal(Object.keys(first.data[0]).sort(),['revision','updated_at']);
  equal(Number(first.data[0].revision),1);

  const second=await save(owner,1,plain4('update'));
  check(second.ok,JSON.stringify(second.data));
  equal(Number(second.data[0].revision),2);
  const current=await rows(owner,'roster_state');
  const history=await rows(owner,'roster_revisions');
  check(current.ok&&history.ok,'owner reads failed');
  equal(current.data.length,1);
  equal(Number(current.data[0].revision),2);
  equal(history.data.map(row=>Number(row.revision)),[1,2]);
  equal(history.data.map(row=>row.payload.storage['phase8c-synthetic']),['first','update']);

  const conflict=await save(owner,1,plain4('stale'));
  equal(conflict.ok,false);
  check(String(conflict.data?.message||'').startsWith('revision_conflict:'),JSON.stringify(conflict.data));
  equal((await rows(owner,'roster_revisions')).data.length,2);

  check((await save(other,0,plain4('other'))).ok);
  const cross=await request(`/rest/v1/roster_state?select=*&user_id=eq.${other.id}`,{token:owner.token});
  check(cross.ok);
  equal(cross.data,[],'baseline RLS disclosed another user row');

  console.log(JSON.stringify({
    phase:'pre-Phase-8B baseline',target_ref:projectRef,assertions,
    schema4_first_write:'pass',schema4_update:'pass',history_revisions:[1,2],
    rls_isolation:'pass',rpc_result_keys:['revision','updated_at'],
    revision_conflict:{status:conflict.status,code:conflict.data?.code,message:conflict.data?.message}
  },null,2));
}finally{
  await cleanup();
}
