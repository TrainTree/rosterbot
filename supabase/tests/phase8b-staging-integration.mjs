#!/usr/bin/env node
/*
 * Phase 8B destructive integration tests for an ISOLATED Supabase staging
 * project. This script creates only synthetic users and deletes them in its
 * finally block. It refuses the captured linked production project.
 *
 * Required environment:
 *   PHASE8B_ALLOW_ISOLATED_STAGING=yes
 *   PHASE8B_STAGING_URL=https://<isolated-ref>.supabase.co
 *   PHASE8B_STAGING_ANON_KEY=...
 *   PHASE8B_STAGING_SERVICE_ROLE_KEY=...
 *
 * Before running, apply the captured schema and Phase 8B delta to staging,
 * then set roster_schema_capability.max_writable_schema to 5 as described in
 * docs/phase8b-server-downgrade-protection.md. Never point this at production.
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const url=String(process.env.PHASE8B_STAGING_URL||'').replace(/\/$/,'');
const anonKey=String(process.env.PHASE8B_STAGING_ANON_KEY||'');
const serviceKey=String(process.env.PHASE8B_STAGING_SERVICE_ROLE_KEY||'');

if(process.env.PHASE8B_ALLOW_ISOLATED_STAGING!=='yes')throw new Error('Refusing to run: set PHASE8B_ALLOW_ISOLATED_STAGING=yes for an isolated staging project.');
if(!url||!anonKey||!serviceKey)throw new Error('Missing Phase 8B staging URL/anon/service-role environment variables.');
if(new URL(url).hostname.includes(PRODUCTION_REF))throw new Error(`Refusing to run against linked project ${PRODUCTION_REF}.`);

const createdUsers=[];
let assertions=0;
const check=(value,message)=>{assert(value,message);assertions++};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);assertions++};
const canonical=value=>JSON.stringify(value,Object.keys(value||{}).sort());

function plain4(label='synthetic'){
  return {
    app:'RosterBotPayBot',
    version:'0.29.1-phase8b-synthetic',
    schemaVersion:4,
    exportedAt:'2026-10-05T00:00:00.000Z',
    privacy:'Synthetic Phase 8B staging fixture',
    storage:{'rosterbot-db-schema-v1':'4','phase8b-synthetic':label}
  };
}

function plain5(label='synthetic'){
  const fingerprint=crypto.createHash('sha256').update(label).digest('hex');
  return {
    format:'rosterbot-personal-state',formatVersion:1,
    storageSchemaVersion:5,minimumReaderSchema:5,
    writer:{app:'RosterBotPayBot',version:'0.30.0',build:'phase8b-staging'},
    generation:{number:1,id:`1:${fingerprint}`,kind:'state',fingerprint,predecessorFingerprint:null},
    checksum:{algorithm:'SHA-256',canonicalisation:'rosterbot-canonical-json-v1',scope:'rosterbot-schema5-content-v1',value:fingerprint},
    timestamps:{createdAt:'2026-10-05T00:00:00.000Z',updatedAt:'2026-10-05T00:00:00.000Z'},
    personalState:{kind:'state',entries:{'phase8b-synthetic':{presence:'present',value:label}}},
    extensions:{},
    migration:{fromSchema:4,migratedAt:'2026-10-05T00:00:00.000Z',source:'phase8b-staging',sourceFingerprint:fingerprint,sourceGeneration:null,warnings:[]},
    previousGeneration:null,
    compatibility:{schemaVersion:4,status:'lossless',projectionFingerprint:fingerprint}
  };
}

function encrypted(schema=4,label='a',wrappers={}){
  return {
    format:'rosterbot-encrypted-v1',schemaVersion:schema,
    crypto:{
      version:1,cipher:'AES-GCM-256',keyId:`00000000-0000-4000-8000-${label.padEnd(12,'0').slice(0,12)}`,
      fingerprint:crypto.createHash('sha256').update(label).digest('hex'),payloadIv:'AAAAAAAAAAAAAAAA',
      passphraseWrap:{kdf:'PBKDF2-SHA-256',iterations:310000,salt:'c3ludGhldGljLXNhbHQ',iv:'BBBBBBBBBBBBBBBB',ciphertext:wrappers.passphrase||'cGFzc3BocmFzZQ'},
      recoveryWrap:{type:'random-256',iv:'CCCCCCCCCCCCCCCC',ciphertext:wrappers.recovery||'cmVjb3Zlcnk'}
    },
    ciphertext:'c3ludGhldGljLWNpcGhlcnRleHQ'
  };
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
  const email=`phase8b-${label}-${suffix}@example.invalid`,password=`Phase8B-${suffix}-synthetic!`;
  const made=await request('/auth/v1/admin/users',{method:'POST',key:serviceKey,body:{email,password,email_confirm:true,user_metadata:{purpose:'phase8b-staging-only'}}});
  check(made.ok,`create synthetic user failed: ${JSON.stringify(made.data)}`);
  createdUsers.push(made.data.id);
  const signed=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
  check(signed.ok,`sign in synthetic user failed: ${JSON.stringify(signed.data)}`);
  return {id:made.data.id,token:signed.data.access_token,email};
}

const rpc=(user,name,body={})=>request(`/rest/v1/rpc/${name}`,{method:'POST',token:user.token,body});
const save=(user,expected,schema,payload,client='phase8b-staging')=>rpc(user,'save_roster_state',{expected_revision:expected,new_schema_version:schema,new_payload:payload,new_client_id:client});
const state=user=>request(`/rest/v1/roster_state?select=user_id,revision,schema_version,payload,client_id,updated_at&user_id=eq.${user.id}`,{token:user.token});
const history=user=>request(`/rest/v1/roster_revisions?select=user_id,revision,schema_version,payload,client_id,created_at&user_id=eq.${user.id}&order=revision.asc`,{token:user.token});
const one=result=>Array.isArray(result.data)?result.data[0]:result.data;

function expectError(result,code,message){
  equal(result.ok,false,`expected ${code}/${message}, got success`);
  equal(result.data?.code,code,JSON.stringify(result.data));
  if(message)equal(result.data?.message,message,JSON.stringify(result.data));
}

async function snapshot(user){
  const [s,h]=await Promise.all([state(user),history(user)]);
  check(s.ok&&h.ok,`snapshot failed: ${JSON.stringify([s.data,h.data])}`);
  return JSON.stringify({state:s.data,history:h.data});
}

async function testFirstWriteAndDowngrade(){
  const user=await createUser('main');
  const first=await save(user,0,4,plain4('first'),'schema4-client');
  check(first.ok,JSON.stringify(first.data));
  equal(Object.keys(one(first)).sort(),['revision','updated_at']);
  equal(Number(one(first).revision),1);
  let rows=await history(user);equal(rows.data.length,1);equal(rows.data[0].schema_version,4);

  const second=await save(user,1,4,plain4('ordinary-update'),'schema4-client');
  check(second.ok,JSON.stringify(second.data));equal(Number(one(second).revision),2);
  const beforeConflict=await snapshot(user);
  expectError(await save(user,1,4,plain4('stale'),'stale-schema4-client'),'RB003','revision_conflict');
  equal(await snapshot(user),beforeConflict,'revision conflict mutated state/history');

  const upgraded=await save(user,2,5,plain5('upgrade'),'schema5-staging-client');
  if(!upgraded.ok&&upgraded.data?.code==='RB002')throw new Error('Staging schema-5 gate is not enabled. Set max_writable_schema=5 only on isolated staging, then rerun.');
  check(upgraded.ok,JSON.stringify(upgraded.data));equal(Number(one(upgraded).revision),3);
  rows=await history(user);equal(rows.data.map(row=>[Number(row.revision),row.schema_version]),[[1,4],[2,4],[3,5]]);

  const protectedSnapshot=await snapshot(user);
  expectError(await save(user,3,4,plain4('downgrade-current'),'old-client'),'RB001','schema_too_old');
  expectError(await save(user,2,4,plain4('downgrade-stale'),'old-client'),'RB001','schema_too_old');
  expectError(await save(user,3,4,encrypted(4,'downgrade'),'old-encrypted-client'),'RB001','schema_too_old');
  expectError(await save(user,3,4,plain4('downgrade-repeat'),'old-client'),'RB001','schema_too_old');
  equal(await snapshot(user),protectedSnapshot,'downgrade attempt mutated current/history');
}

async function testConcurrentFirstWrites(){
  const user=await createUser('concurrent-first');
  const results=await Promise.all([
    save(user,0,4,plain4('concurrent-a'),'client-a'),
    save(user,0,4,plain4('concurrent-b'),'client-b')
  ]);
  equal(results.filter(result=>result.ok).length,1,'exactly one first writer must succeed');
  const rejected=results.find(result=>!result.ok);expectError(rejected,'RB003','revision_conflict');
  const [s,h]=await Promise.all([state(user),history(user)]);
  equal(s.data.length,1);equal(Number(s.data[0].revision),1);
  equal(h.data.length,1);equal(Number(h.data[0].revision),1);
}

async function testConcurrentSchemaWriters(){
  const user=await createUser('concurrent-schema');
  check((await save(user,0,4,plain4('base'),'base')).ok);
  const [four,five]=await Promise.all([
    save(user,1,4,plain4('concurrent-four'),'client-four'),
    save(user,1,5,plain5('concurrent-five'),'client-five')
  ]);
  equal([four,five].filter(result=>result.ok).length,1,'exactly one same-revision writer must commit');
  if(five.ok)expectError(four,'RB001','schema_too_old');
  else{
    expectError(five,'RB003','revision_conflict');
    const current=one(await state(user));
    check((await save(user,Number(current.revision),5,plain5('retry-five'),'client-five')).ok);
  }
  const current=one(await state(user));equal(current.schema_version,5);
  const before=await snapshot(user);
  expectError(await save(user,Number(current.revision),4,plain4('post-race-old'),'client-four'),'RB001','schema_too_old');
  equal(await snapshot(user),before);
}

async function testPayloadAgreement(){
  const cases=[
    [4,plain5('parameter4-payload5'),'RB004','payload_schema_mismatch'],
    [5,plain4('parameter5-payload4'),'RB004','payload_schema_mismatch'],
    [4,encrypted(5,'outer-mismatch'),'RB004','payload_schema_mismatch'],
    [4,{app:'RosterBotPayBot',storage:{}},'RB004','payload_schema_mismatch'],
    [4,{app:'RosterBotPayBot',schemaVersion:'4',storage:{}},'RB004','payload_schema_mismatch'],
    [4,[],'RB005','payload_malformed'],
    [4,{format:'unknown',schemaVersion:4},'RB005','payload_malformed'],
    [4,{...encrypted(4,'malformed'),crypto:{...encrypted(4,'malformed').crypto,passphraseWrap:{}}},'RB005','payload_malformed'],
    [6,plain5('unsupported-six'),'RB002','schema_too_new']
  ];
  for(let index=0;index<cases.length;index++){
    const [schema,payload,code,message]=cases[index],user=await createUser(`payload-${index}`);
    expectError(await save(user,0,schema,payload,'invalid-fixture'),code,message);
    equal((await state(user)).data,[]);equal((await history(user)).data,[]);
  }
  const encryptedUser=await createUser('encrypted-first');
  const result=await save(encryptedUser,0,4,encrypted(4,'firstencrypted'),'encrypted-client');
  check(result.ok,JSON.stringify(result.data));
  equal(one(await state(encryptedUser)).schema_version,4);
}

async function testEncryptedMaintenance(){
  const user=await createUser('encrypted-maintenance');
  check((await save(user,0,4,plain4('pre-encryption'),'plain-client')).ok);
  const envelope=encrypted(4,'maintained');
  check((await save(user,1,4,envelope,'encrypted-client')).ok);
  const purged=await rpc(user,'purge_unencrypted_roster_history');
  check(purged.ok,JSON.stringify(purged.data));equal(Number(one(purged).deleted_count),1);
  let rows=await history(user);equal(rows.data.map(row=>Number(row.revision)),[2]);

  const replacement=structuredClone(envelope);
  replacement.crypto.passphraseWrap.ciphertext='bmV3LXBhc3NwaHJhc2U';
  replacement.crypto.recoveryWrap.ciphertext='bmV3LXJlY292ZXJ5';
  const rotated=await rpc(user,'rotate_roster_encryption_wrappers',{expected_revision:2,new_payload:replacement,new_client_id:'rotation-client'});
  check(rotated.ok,JSON.stringify(rotated.data));equal(Number(one(rotated).revision),3);equal(Number(one(rotated).deleted_count),1);
  const current=one(await state(user));equal(current.schema_version,4);equal(current.payload.crypto.passphraseWrap.ciphertext,'bmV3LXBhc3NwaHJhc2U');
  rows=await history(user);equal(rows.data.map(row=>Number(row.revision)),[3]);
}

async function testRlsAnonAndServiceRole(){
  const a=await createUser('owner-a'),b=await createUser('owner-b');
  check((await save(a,0,4,plain4('owner-a'),'owner-a')).ok);
  check((await save(b,0,4,plain4('owner-b'),'owner-b')).ok);

  const cross=await request(`/rest/v1/roster_state?select=*&user_id=eq.${b.id}`,{token:a.token});
  check(cross.ok);equal(cross.data,[],'RLS disclosed another user row');
  const directInsert=await request('/rest/v1/roster_state',{method:'POST',token:a.token,body:{user_id:b.id,revision:1,schema_version:4,payload:plain4('forged')}});
  check(!directInsert.ok,'authenticated direct insert unexpectedly succeeded');

  const anonCalls=[
    ['save_roster_state',{expected_revision:0,new_schema_version:4,new_payload:plain4('anon'),new_client_id:'anon'}],
    ['rotate_roster_encryption_wrappers',{expected_revision:0,new_payload:encrypted(4,'anon'),new_client_id:'anon'}],
    ['purge_unencrypted_roster_history',{}]
  ];
  for(const [name,body] of anonCalls){
    const result=await request(`/rest/v1/rpc/${name}`,{method:'POST',body});
    check(!result.ok,`${name} remained anonymously executable`);
    check(result.data?.code==='42501'||String(result.data?.code||'').startsWith('PGRST'),JSON.stringify(result.data));
  }

  const serviceRead=await request(`/rest/v1/roster_state?select=user_id&user_id=in.(${a.id},${b.id})`,{key:serviceKey});
  check(serviceRead.ok);equal(serviceRead.data.length,2,'service role should retain audited read capability');
  const servicePatch=await request(`/rest/v1/roster_state?user_id=eq.${a.id}`,{method:'PATCH',key:serviceKey,body:{revision:2,schema_version:4,payload:plain4('service-write')}});
  check(!servicePatch.ok,'service role direct roster DML should be revoked');
  const serviceRpc=await request('/rest/v1/rpc/save_roster_state',{method:'POST',key:serviceKey,body:{expected_revision:1,new_schema_version:4,new_payload:plain4('service-rpc'),new_client_id:'service'}});
  expectError(serviceRpc,'RB006','not_authenticated');
  equal(Number(one(await state(a)).revision),1,'service-role checks changed state');
}

async function cleanup(){
  const failures=[];
  for(const id of createdUsers.reverse()){
    const result=await request(`/auth/v1/admin/users/${id}`,{method:'DELETE',key:serviceKey});
    if(!result.ok)failures.push({id,status:result.status,data:result.data});
  }
  if(failures.length)throw new Error(`Synthetic-user cleanup failed: ${JSON.stringify(failures)}`);
}

try{
  await testFirstWriteAndDowngrade();
  await testConcurrentFirstWrites();
  await testConcurrentSchemaWriters();
  await testPayloadAgreement();
  await testEncryptedMaintenance();
  await testRlsAnonAndServiceRole();
  console.log(`Phase 8B staging integration passed (${assertions} assertions, ${createdUsers.length} synthetic users).`);
}finally{
  await cleanup();
}
