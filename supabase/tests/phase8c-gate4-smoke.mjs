#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const errorContract=require('../../js/04-cloud-error-contract.js');
const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const projectRef=String(process.env.PHASE8B_STAGING_PROJECT_REF||'');
const url=String(process.env.PHASE8B_STAGING_URL||'').replace(/\/$/,'');
const anonKey=String(process.env.PHASE8B_STAGING_ANON_KEY||'');
const serviceKey=String(process.env.PHASE8B_STAGING_SERVICE_ROLE_KEY||'');
if(process.env.PHASE8B_ALLOW_ISOLATED_STAGING!=='yes'||projectRef===PRODUCTION_REF||!/^[a-z]{20}$/.test(projectRef))throw new Error('Refusing non-isolated gate-4 smoke test.');
if(new URL(url).hostname!==`${projectRef}.supabase.co`)throw new Error('Staging URL/project ref mismatch.');
if(!anonKey||!serviceKey)throw new Error('Missing staging keys.');

const ids=[];
const request=async(path,{method='GET',key=anonKey,token=null,body}={})=>{
  const headers={apikey:key,Authorization:`Bearer ${token||key}`};
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(`${url}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let data=null;
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  return {ok:response.ok,status:response.status,data};
};
const plain4=label=>({app:'RosterBotPayBot',version:'0.29.1-phase8c',schemaVersion:4,storage:{'rosterbot-db-schema-v1':'4',synthetic:label}});
const plain5=label=>{const fingerprint=crypto.createHash('sha256').update(label).digest('hex');return {format:'rosterbot-personal-state',formatVersion:1,storageSchemaVersion:5,minimumReaderSchema:5,writer:{},generation:{},checksum:{},timestamps:{},personalState:{},extensions:{},migration:{},previousGeneration:null,compatibility:{},fingerprint}};
async function user(label){const suffix=crypto.randomBytes(8).toString('hex'),email=`phase8c-gate4-${label}-${suffix}@example.invalid`,password=`Phase8C-${suffix}-synthetic!`;const made=await request('/auth/v1/admin/users',{method:'POST',key:serviceKey,body:{email,password,email_confirm:true}});assert(made.ok,JSON.stringify(made.data));ids.push(made.data.id);const signed=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});assert(signed.ok,JSON.stringify(signed.data));return {id:made.data.id,token:signed.data.access_token}}
const save=(u,expected,schema,payload)=>request('/rest/v1/rpc/save_roster_state',{method:'POST',token:u.token,body:{expected_revision:expected,new_schema_version:schema,new_payload:payload,new_client_id:'phase8c-gate4'}});
try{
  const schema4=await user('schema4');
  const first=await save(schema4,0,4,plain4('first'));assert(first.ok,JSON.stringify(first.data));assert.equal(Number(first.data[0].revision),1);
  const update=await save(schema4,1,4,plain4('update'));assert(update.ok,JSON.stringify(update.data));assert.equal(Number(update.data[0].revision),2);
  const conflict=await save(schema4,1,4,plain4('stale'));assert.equal(conflict.data?.code,'RB003');assert.equal(errorContract.classify(conflict.data)?.retry,false);
  const schema5=await user('schema5-rejected');
  const rejected=await save(schema5,0,5,plain5('gate-still-four'));assert.equal(rejected.data?.code,'RB002');assert.equal(rejected.data?.message,'schema_too_new');assert.equal(errorContract.classify(rejected.data)?.retry,false);
  const state=await request(`/rest/v1/roster_state?select=revision&user_id=eq.${schema5.id}`,{token:schema5.token});assert.deepEqual(state.data,[]);
  console.log(JSON.stringify({phase:'post-patch gate-4 smoke',target_ref:projectRef,schema4_first_write:'pass',schema4_update:'pass',revision_conflict:{status:conflict.status,...conflict.data},schema5_gate_rejection:{status:rejected.status,...rejected.data},rejected_state_unchanged:true},null,2));
}finally{
  for(const id of ids.reverse()){const removed=await request(`/auth/v1/admin/users/${id}`,{method:'DELETE',key:serviceKey});if(!removed.ok)throw new Error(`cleanup failed for ${id}`)}
}
