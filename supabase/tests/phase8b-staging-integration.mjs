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
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const errorContract=require('../../js/04-cloud-error-contract.js');

const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const projectRef=String(process.env.PHASE8B_STAGING_PROJECT_REF||'');
const url=String(process.env.PHASE8B_STAGING_URL||'').replace(/\/$/,'');
const anonKey=String(process.env.PHASE8B_STAGING_ANON_KEY||'');
const serviceKey=String(process.env.PHASE8B_STAGING_SERVICE_ROLE_KEY||'');
const testGroup=String(process.env.PHASE8B_TEST_GROUP||'all');

if(process.env.PHASE8B_ALLOW_ISOLATED_STAGING!=='yes')throw new Error('Refusing to run: set PHASE8B_ALLOW_ISOLATED_STAGING=yes for an isolated staging project.');
if(!url||!anonKey||!serviceKey)throw new Error('Missing Phase 8B staging URL/anon/service-role environment variables.');
if(!/^[a-z]{20}$/.test(projectRef))throw new Error('Missing or invalid PHASE8B_STAGING_PROJECT_REF.');
if(projectRef===PRODUCTION_REF)throw new Error(`Refusing to run against linked project ${PRODUCTION_REF}.`);
if(new URL(url).hostname!==`${projectRef}.supabase.co`)throw new Error('Staging URL/project ref mismatch.');

const createdUsers=[];
let assertions=0;
const evidence={errors:[],concurrent_first_writes:[],concurrent_schema_writers:[],stale_downgrade:null,calendar:null};
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
  const envelope={status:result.status,code:result.data?.code,message:result.data?.message,details:result.data?.details??null,hint:result.data?.hint??null};
  evidence.errors.push(envelope);
  if(/^RB00[1-7]$/.test(code)){
    const classified=errorContract.classify(result.data);
    check(classified,`client did not classify ${JSON.stringify(envelope)}`);
    equal(classified.retry,false,`${code} unexpectedly classified as retryable`);
  }
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
  for(let attempt=0;attempt<4;attempt++){
    const user=await createUser(`concurrent-first-${attempt}`);
    const results=await Promise.all([
      save(user,0,4,plain4(`concurrent-a-${attempt}`),'client-a'),
      save(user,0,4,plain4(`concurrent-b-${attempt}`),'client-b')
    ]);
    equal(results.filter(result=>result.ok).length,1,'exactly one first writer must succeed');
    const rejected=results.find(result=>!result.ok);expectError(rejected,'RB003','revision_conflict');
    const [s,h]=await Promise.all([state(user),history(user)]);
    equal(s.data.length,1);equal(Number(s.data[0].revision),1);
    equal(h.data.length,1);equal(Number(h.data[0].revision),1);
    evidence.concurrent_first_writes.push({attempt,winner:s.data[0].client_id,rejected:{status:rejected.status,code:rejected.data?.code,message:rejected.data?.message},state_revision:Number(s.data[0].revision),history_revisions:h.data.map(row=>Number(row.revision))});
  }
}

async function testConcurrentSchemaWriters(){
  const observed=new Set();
  for(let attempt=0;attempt<8&&observed.size<2;attempt++){
    const user=await createUser(`concurrent-schema-${attempt}`);
    check((await save(user,0,4,plain4(`base-${attempt}`),'base')).ok);
    const startFour=()=>save(user,1,4,plain4(`concurrent-four-${attempt}`),'client-four');
    const startFive=()=>save(user,1,5,plain5(`concurrent-five-${attempt}`),'client-five');
    const started=attempt%2===0?[startFour(),startFive()]:[startFive(),startFour()];
    const finished=await Promise.all(started);
    const [four,five]=attempt%2===0?finished:[finished[1],finished[0]];
    equal([four,five].filter(result=>result.ok).length,1,'exactly one same-revision writer must commit');
    let winner;
    if(five.ok){winner='schema5';expectError(four,'RB001','schema_too_old');}
    else{
      winner='schema4';expectError(five,'RB003','revision_conflict');
      const current=one(await state(user));
      check((await save(user,Number(current.revision),5,plain5(`retry-five-${attempt}`),'client-five')).ok);
    }
    observed.add(winner);
    const current=one(await state(user));equal(current.schema_version,5);
    const before=await snapshot(user);
    expectError(await save(user,Number(current.revision),4,plain4(`post-race-old-${attempt}`),'client-four'),'RB001','schema_too_old');
    equal(await snapshot(user),before);
    evidence.concurrent_schema_writers.push({attempt,initial_winner:winner,schema4_result:{status:four.status,code:four.data?.code??null},schema5_result:{status:five.status,code:five.data?.code??null},final_revision:Number(current.revision),final_schema:current.schema_version});
  }
  equal([...observed].sort(),['schema4','schema5'],'did not observe both legal concurrent schema-writer orderings');
}

async function testStaleDowngradeSequence(){
  const user=await createUser('stale-downgrade-sequence');
  check((await save(user,0,4,plain4('stale-base'),'schema4-reader')).ok);
  const read=one(await state(user));
  const staleRevision=Number(read.revision);
  check((await save(user,staleRevision,5,plain5('stale-upgrade'),'schema5-writer')).ok);
  const protectedSnapshot=await snapshot(user);
  const rejected=await save(user,staleRevision,4,plain4('stale-submit'),'schema4-stale-writer');
  expectError(rejected,'RB001','schema_too_old');
  equal(await snapshot(user),protectedSnapshot,'stale downgrade changed state/history');
  const current=one(await state(user)),rows=(await history(user)).data;
  evidence.stale_downgrade={read_revision:staleRevision,upgrade_revision:Number(current.revision),result:{status:rejected.status,code:rejected.data?.code,message:rejected.data?.message,details:rejected.data?.details},state_schema:current.schema_version,state_revision:Number(current.revision),history_revisions:rows.map(row=>Number(row.revision))};
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
    [6,plain5('unsupported-six'),'RB002','schema_too_new'],
    [3,plain4('unsupported-three'),'RB002','schema_unsupported'],
    [null,plain4('unsupported-null'),'RB002','schema_unsupported']
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
  const encryptedFiveUser=await createUser('encrypted-five-first');
  const encryptedFive=await save(encryptedFiveUser,0,5,encrypted(5,'firstencryptedfive'),'encrypted-schema5-client');
  check(encryptedFive.ok,JSON.stringify(encryptedFive.data));
  equal(one(await state(encryptedFiveUser)).schema_version,5);
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
  equal(directInsert.data?.code,'42501',JSON.stringify(directInsert.data));

  const anonCalls=[
    ['save_roster_state',{expected_revision:0,new_schema_version:4,new_payload:plain4('anon'),new_client_id:'anon'}],
    ['rotate_roster_encryption_wrappers',{expected_revision:0,new_payload:encrypted(4,'anon'),new_client_id:'anon'}],
    ['purge_unencrypted_roster_history',{}]
  ];
  for(const [name,body] of anonCalls){
    const result=await request(`/rest/v1/rpc/${name}`,{method:'POST',body});
    check(!result.ok,`${name} remained anonymously executable`);
    check(result.data?.code==='42501'||String(result.data?.code||'').startsWith('PGRST'),JSON.stringify(result.data));
    evidence.errors.push({status:result.status,code:result.data?.code,message:result.data?.message,details:result.data?.details??null,hint:result.data?.hint??null,case:`anonymous ${name}`});
  }

  const serviceRead=await request(`/rest/v1/roster_state?select=user_id&user_id=in.(${a.id},${b.id})`,{key:serviceKey});
  check(serviceRead.ok);equal(serviceRead.data.length,2,'service role should retain audited read capability');
  const servicePatch=await request(`/rest/v1/roster_state?user_id=eq.${a.id}`,{method:'PATCH',key:serviceKey,body:{revision:2,schema_version:4,payload:plain4('service-write')}});
  check(!servicePatch.ok,'service role direct roster DML should be revoked');
  equal(servicePatch.data?.code,'42501',JSON.stringify(servicePatch.data));
  evidence.errors.push({status:servicePatch.status,code:servicePatch.data?.code,message:servicePatch.data?.message,details:servicePatch.data?.details??null,hint:servicePatch.data?.hint??null,case:'service-role direct roster DML'});
  const serviceRpc=await request('/rest/v1/rpc/save_roster_state',{method:'POST',key:serviceKey,body:{expected_revision:1,new_schema_version:4,new_payload:plain4('service-rpc'),new_client_id:'service'}});
  expectError(serviceRpc,'RB006','not_authenticated');
  equal(Number(one(await state(a)).revision),1,'service-role checks changed state');

  const tokenHash=crypto.createHash('sha256').update('phase8c-synthetic-calendar-token').digest('hex');
  const calendarInsert=await request('/rest/v1/calendar_feeds',{method:'POST',token:a.token,body:{user_id:a.id,token_hash:tokenHash,ics_text:'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n',event_count:0,enabled:true}});
  check(calendarInsert.ok,`calendar insert failed: ${JSON.stringify(calendarInsert.data)}`);
  const calendarCross=await request(`/rest/v1/calendar_feeds?select=user_id&user_id=eq.${a.id}`,{token:b.token});
  check(calendarCross.ok);equal(calendarCross.data,[],'calendar RLS disclosed another user row');
  const edgeRead=await request(`/rest/v1/calendar_feeds?select=ics_text,enabled,updated_at&token_hash=eq.${tokenHash}`,{key:serviceKey});
  check(edgeRead.ok,JSON.stringify(edgeRead.data));equal(edgeRead.data.length,1);equal(edgeRead.data[0].enabled,true);
  const calendarPatch=await request(`/rest/v1/calendar_feeds?user_id=eq.${a.id}`,{method:'PATCH',token:a.token,body:{event_count:1,ics_text:'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-PHASE8C:SYNTHETIC\r\nEND:VCALENDAR\r\n'}});
  check(calendarPatch.ok,`calendar update failed: ${JSON.stringify(calendarPatch.data)}`);
  const calendarDelete=await request(`/rest/v1/calendar_feeds?user_id=eq.${a.id}`,{method:'DELETE',token:a.token});
  check(calendarDelete.ok,`calendar delete failed: ${JSON.stringify(calendarDelete.data)}`);
  evidence.calendar={authenticated_crud:'pass',rls_isolation:'pass',service_role_edge_select:{columns:Object.keys(edgeRead.data[0]).sort(),rows:edgeRead.data.length},function_deployed:false,synthetic_only:true};
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
  if(testGroup==='all'||testGroup==='core'){
    await testFirstWriteAndDowngrade();
    await testConcurrentFirstWrites();
    await testStaleDowngradeSequence();
  }
  if(testGroup==='all'||testGroup==='races')await testConcurrentSchemaWriters();
  if(testGroup==='all'||testGroup==='payload'){
    await testPayloadAgreement();
    await testEncryptedMaintenance();
  }
  if(testGroup==='all'||testGroup==='security')await testRlsAnonAndServiceRole();
  console.log(JSON.stringify({phase:'Phase 8B staging integration',group:testGroup,target_ref:projectRef,result:'pass',assertions,synthetic_users:createdUsers.length,evidence},null,2));
}finally{
  await cleanup();
}
