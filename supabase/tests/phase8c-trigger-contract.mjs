#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const errorContract=require('../../js/04-cloud-error-contract.js');

const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const projectRef=String(process.env.PHASE8B_STAGING_PROJECT_REF||'');
const url=String(process.env.PHASE8B_STAGING_URL||'').replace(/\/$/,'');
const anonKey=String(process.env.PHASE8B_STAGING_ANON_KEY||'');
const serviceKey=String(process.env.PHASE8B_STAGING_SERVICE_ROLE_KEY||'');
if(process.env.PHASE8B_ALLOW_ISOLATED_STAGING!=='yes'||projectRef===PRODUCTION_REF||!/^[a-z]{20}$/.test(projectRef))throw new Error('Refusing non-isolated trigger test.');
if(new URL(url).hostname!==`${projectRef}.supabase.co`)throw new Error('Staging URL/project ref mismatch.');
if(!anonKey||!serviceKey)throw new Error('Missing staging keys.');

const ids=[];
async function api(path,{method='GET',key=anonKey,body}={}){
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(`${url}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();let data=null;if(text){try{data=JSON.parse(text)}catch{data=text}}
  return {ok:response.ok,status:response.status,data};
}
async function createUser(label){
  const suffix=crypto.randomBytes(8).toString('hex');
  const made=await api('/auth/v1/admin/users',{method:'POST',key:serviceKey,body:{email:`phase8c-trigger-${label}-${suffix}@example.invalid`,password:`Phase8C-${suffix}-synthetic!`,email_confirm:true,user_metadata:{purpose:'phase8c-trigger-only'}}});
  assert(made.ok,JSON.stringify(made.data));ids.push(made.data.id);return made.data.id;
}
try{
  const [userA,userB]=[await createUser('a'),await createUser('b')];
  if(!/^[0-9a-f-]{36}$/.test(userA)||!/^[0-9a-f-]{36}$/.test(userB))throw new Error('Unexpected synthetic UUID.');
  const template=fs.readFileSync(new URL('./phase8c-trigger-contract.sql',import.meta.url),'utf8');
  const query=template.replaceAll('__USER_A__',userA).replaceAll('__USER_B__',userB);
  const checksum=crypto.createHash('sha256').update(template).digest('hex');
  const accessToken=fs.readFileSync(`${process.env.HOME}/.supabase/access-token`,'utf8').trim();
  const response=await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
  const text=await response.text();let data=text;try{data=text?JSON.parse(text):null}catch{}
  if(!response.ok)throw new Error(`Trigger SQL failed (${response.status}): ${JSON.stringify(data)}`);
  const errors=data?.[0]?.phase8c_trigger_contract?.trigger_errors||[];
  for(const error of errors){
    const classified=errorContract.classify({code:error.error_code,message:error.error_message});
    assert(classified,`client did not classify ${JSON.stringify(error)}`);
    assert.equal(classified.retry,false,`${error.error_code} classified as retryable`);
  }
  console.log(JSON.stringify({phase:'trigger-level contract',target_ref:projectRef,template_sha256:checksum,http_status:response.status,result:data},null,2));
}finally{
  for(const id of ids.reverse()){const removed=await api(`/auth/v1/admin/users/${id}`,{method:'DELETE',key:serviceKey});if(!removed.ok)throw new Error(`cleanup failed for ${id}`)}
}
