import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {MemoryStorage,fixtures,root,storedValue,readSource} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);
const schema5=require(`${root}/js/02-schema5.js`);
const runtime=require(`${root}/js/03-schema5-migration.js`);
const cloudSchema5=require(`${root}/js/07-cloud-schema5.js`);
const golden=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/schema4-to-schema5-golden.json'),'utf8'));
const KEY='sb_publishable_Phase10bCapabilityFixture_12345';
const STAGING_REF='wuzyurvrztskljpxpeaq',STAGING_URL=`https://${STAGING_REF}.supabase.co`,BETA_ORIGIN='https://beta.rosterbot.work';
const PRODUCTION_REF='rithmbggiiusrmdcqrif',PRODUCTION_URL=`https://${PRODUCTION_REF}.supabase.co`,PRODUCTION_ORIGIN='https://rosterbot.work';

function context(overrides={}){
  const profile={version:1,deployment:'beta-staging',environment:'isolated-staging',projectRef:STAGING_REF,url:STAGING_URL,publishableKey:KEY,allowedOrigins:[BETA_ORIGIN],allowSavedConfiguration:false,fallbackToEmbedded:false,requestedCloudSchema:5};
  return {profile,config:{url:STAGING_URL,key:KEY},origin:BETA_ORIGIN,enabled:true,fixedBinding:true,userId:'synthetic-user-a',accessToken:'synthetic-access-a',...overrides};
}
function productionContext(overrides={}){
  const profile={version:1,deployment:'production',environment:'production',projectRef:PRODUCTION_REF,url:PRODUCTION_URL,publishableKey:KEY,allowedOrigins:[PRODUCTION_ORIGIN,'https://www.rosterbot.work'],allowSavedConfiguration:false,fallbackToEmbedded:false,requestedCloudSchema:5};
  return {profile,config:{url:PRODUCTION_URL,key:KEY},origin:PRODUCTION_ORIGIN,enabled:true,fixedBinding:true,userId:'synthetic-user-a',accessToken:'synthetic-access-a',...overrides};
}
const validAttestation=(ctx=context())=>({environment:ctx.profile.environment,project_ref:ctx.profile.projectRef,contract:cloudSchema5.CONTRACT,min_writable_schema:4,max_writable_schema:5});

test('fresh exact authenticated attestation is the only capability-5 release',async()=>{
  const state=cloudSchema5.createCapabilityState(),ctx=context();
  assert.equal(state.isGranted(ctx),false);
  assert.deepEqual(await state.attest(async()=>validAttestation(),ctx),validAttestation());
  assert.equal(state.isGranted(ctx),true);
  assert.equal(state.status(ctx).reason,'granted');
  const production=productionContext(),productionState=cloudSchema5.createCapabilityState();
  assert.deepEqual(await productionState.attest(async()=>validAttestation(production),production),validAttestation(production));
  assert.equal(productionState.isGranted(production),true);
});

test('no auth, capability 4, wrong identity, malformed and forged attestations retain the hold',async t=>{
  const cases=[
    ['no user',validAttestation(),context({userId:''})],
    ['no access token',validAttestation(),context({accessToken:''})],
    ['capability 4',{...validAttestation(),max_writable_schema:4},context()],
    ['wrong environment',{...validAttestation(),environment:'production'},context()],
    ['wrong project',{...validAttestation(),project_ref:'rithmbggiiusrmdcqrif'},context()],
    ['wrong contract',{...validAttestation(),contract:'forged-client-contract'},context()],
    ['forged extra field',{...validAttestation(),client_claimed_capability:5},context()],
    ['unsupported minimum',{...validAttestation(),min_writable_schema:6,max_writable_schema:6},context()]
  ];
  for(const [name,attestation,ctx] of cases)await t.test(name,async()=>{
    const state=cloudSchema5.createCapabilityState();
    await assert.rejects(()=>state.attest(async()=>attestation,ctx));
    assert.equal(state.isGranted(ctx),false);
  });
});

test('logout, token/user/config/origin/profile changes and failed attestation immediately revoke the in-memory grant',async()=>{
  const original=context(),state=cloudSchema5.createCapabilityState();
  await state.attest(async()=>validAttestation(),original);assert.equal(state.isGranted(original),true);
  for(const changed of [
    context({userId:''}),context({userId:'synthetic-user-b'}),context({accessToken:'synthetic-access-b'}),
    context({origin:'https://rosterbot.work'}),context({config:{url:'https://rithmbggiiusrmdcqrif.supabase.co',key:KEY}}),
    context({profile:{...original.profile,allowSavedConfiguration:true}})
  ]){assert.equal(state.isGranted(changed),false);assert.equal(state.isGranted(original),false);await state.attest(async()=>validAttestation(),original)}
  await assert.rejects(()=>state.attest(async()=>{throw new Error('expired or refused')},original));
  assert.equal(state.isGranted(original),false);
  state.revoke('logout');assert.equal(state.status(original).granted,false);
  assert.doesNotMatch(readSource('js/07-cloud-schema5.js'),/localStorage|indexedDB|sessionStorage/);
  const client=readSource('js/51-cloud-sync.js');assert.match(client,/async function signOut\(\)\{if\(busy\)return;revokeSchema5Capability\('logout'\)/);assert.match(client,/if\(before!==sessionIdentity\(\)\)revokeSchema5Capability\(s\?'session-changed':'logout'\)/);
});

test('only exact fixed deployment bindings can become trusted',()=>{
  const base=context(),production=productionContext();
  assert.equal(cloudSchema5.trustedContext(base),true);
  assert.equal(cloudSchema5.trustedContext(production),true);
  for(const candidate of [
    {...base,origin:'https://rosterbot.work'},
    {...base,config:{url:'https://rithmbggiiusrmdcqrif.supabase.co',key:KEY}},
    {...base,profile:{...base.profile,projectRef:'rithmbggiiusrmdcqrif'}},
    {...base,profile:{...base.profile,publishableKey:'forged'}},
    {...production,fixedBinding:false},
    {...production,config:{url:STAGING_URL,key:KEY}},
    {...production,profile:{...production.profile,allowSavedConfiguration:true}}
  ])assert.equal(cloudSchema5.trustedContext(candidate),false);
});

test('plaintext and encrypted schema-5 wire formats are strict',async()=>{
  const envelope=golden.cases.configured.expected.envelope;
  assert.equal((await cloudSchema5.validatePlaintext(envelope)).ok,true);
  assert.equal(cloudSchema5.hmacIdentity(envelope).personalState.kind,'state');
  const encrypted={format:'rosterbot-encrypted-v1',schemaVersion:5,crypto:{version:1,cipher:'AES-GCM-256',keyId:'synthetic-key',fingerprint:'a'.repeat(64),payloadIv:'AAAAAAAAAAAAAAAA',passphraseWrap:{kdf:'PBKDF2-SHA-256',iterations:310000,salt:'AAAAAAAA',iv:'BBBBBBBB',ciphertext:'CCCCCCCC'},recoveryWrap:{type:'random-256',iv:'DDDDDDDD',ciphertext:'EEEEEEEE'}},ciphertext:'FFFFFFFF'};
  assert.equal(cloudSchema5.validateEncryptedOuter(encrypted).ok,true);
  assert.equal(cloudSchema5.validateEncryptedOuter({...encrypted,schemaVersion:4}).ok,false);
  assert.equal(cloudSchema5.validateEncryptedOuter({...encrypted,forged:true}).ok,false);
  assert.equal(cloudSchema5.validateEncryptedOuter({...encrypted,crypto:{...encrypted.crypto,fingerprint:'bad'}}).ok,false);
});

class MemoryIdbTarget{
  constructor(values={}){this.rows=new Map(Object.entries(values).map(([key,value])=>[key,{key,value:storedValue(value),updatedAt:'2026-10-01T00:00:00.000Z'}]));this.applies=0;this.failAt=0}
  async read(keys){return new Map(keys.map(key=>[key,this.rows.get(key)?{...this.rows.get(key)}:null]))}
  async apply({put=[],remove=[]}){this.applies++;if(this.applies===this.failAt)throw new Error('synthetic replacement failure');for(const row of put)this.rows.set(row.key,{...row});for(const key of remove)this.rows.delete(key)}
  value(key){return this.rows.get(key)?.value??null}
}
function configuredPair(){
  const values=Object.fromEntries(Object.entries(fixtures.configured.localStorage).map(([key,value])=>[key,storedValue(value)]));values[runtime.KEYS.marker]='4';
  const personal=Object.fromEntries(registry.surfaceKeys('indexedDb').filter(key=>values[key]!=null).map(key=>[key,values[key]]));personal[runtime.KEYS.marker]='4';
  return {storage:new MemoryStorage(values),target:new MemoryIdbTarget(personal)};
}
async function migratedPair(){const pair=configuredPair(),result=await runtime.run({storage:pair.storage,indexedDbTarget:pair.target,now:golden.migrationTimestamp,writer:golden.writer});assert.equal(result.ok,true);return pair}

test('schema-5 Cloud replacement commits the exact validated envelope and projection to both stores',async()=>{
  const pair=await migratedPair(),incoming=golden.cases.multipleHistoricalRosters.expected.envelope;pair.storage.setItem(runtime.KEYS.clear,'2026-10-07T00:00:00.000Z');
  const replaced=await runtime.replaceFromSchema5Envelope({storage:pair.storage,indexedDbTarget:pair.target,envelope:incoming,now:'2026-10-08T01:00:00.000Z'});
  assert.equal(replaced.ok,true);assert.deepEqual(JSON.parse(pair.storage.getItem(runtime.KEYS.envelope)),incoming);assert.deepEqual(JSON.parse(pair.target.value(runtime.KEYS.envelope)),incoming);
  assert.equal(pair.storage.getItem(runtime.KEYS.clear),null);
  assert.equal((await runtime.existingSchema5({storage:pair.storage,indexedDbTarget:pair.target})).ok,true);
  assert.equal((await runtime.verifyProjection({storage:pair.storage,indexedDbTarget:pair.target,expectedFingerprint:incoming.compatibility.projectionFingerprint})).ok,true);
});

test('schema-5 clear-generation restore preserves clear semantics',async()=>{
  const pair=await migratedPair(),incoming=golden.cases.explicitClear.expected.envelope,replaced=await runtime.replaceFromSchema5Envelope({storage:pair.storage,indexedDbTarget:pair.target,envelope:incoming,now:'2026-10-08T01:30:00.000Z'});
  assert.equal(replaced.ok,true);assert.equal(pair.storage.getItem(runtime.KEYS.clear),incoming.timestamps.updatedAt);assert.equal(JSON.parse(pair.storage.getItem(runtime.KEYS.envelope)).personalState.kind,'clear');
});

test('schema-5 Cloud replacement failure restores every previous known-good byte',async()=>{
  const pair=await migratedPair(),incoming=golden.cases.multipleHistoricalRosters.expected.envelope;pair.storage.setItem(runtime.KEYS.clear,'2026-10-07T00:00:00.000Z');const beforeLocal=new Map(pair.storage.map),beforeRows=new Map([...pair.target.rows].map(([key,row])=>[key,{...row}]));
  pair.target.failAt=pair.target.applies+2;
  const replaced=await runtime.replaceFromSchema5Envelope({storage:pair.storage,indexedDbTarget:pair.target,envelope:incoming,now:'2026-10-08T02:00:00.000Z'});
  assert.equal(replaced.ok,false);assert.equal(replaced.rolledBack,true);assert.equal(replaced.rollbackVerified,true);
  assert.deepEqual(pair.storage.map,beforeLocal);assert.deepEqual(pair.target.rows,beforeRows);
  assert.equal((await runtime.existingSchema5({storage:pair.storage,indexedDbTarget:pair.target})).ok,true);
});

test('client and server contracts retain authoritative revision, downgrade, malformed and mismatch rejection',()=>{
  const cloud=readSource('js/51-cloud-sync.js'),sql=readSource('supabase/migrations/20261005000100_phase8b_roster_downgrade_protection.sql');
  assert.match(cloud,/expected_revision:Number\(expected\|\|0\)/);assert.match(cloud,/new_schema_version:schemaVersion/);assert.match(cloud,/new_payload:payload/);
  assert.match(cloud,/CLOUD_PAYLOAD_SCHEMA_MISMATCH/);assert.match(cloud,/A schema-4 compatibility projection cannot be uploaded as schema 5/);
  for(const pair of [["RB001","schema_too_old"],["RB003","revision_conflict"],["RB004","payload_schema_mismatch"],["RB005","payload_malformed"]]){assert.match(sql,new RegExp(pair[0]));assert.match(sql,new RegExp(pair[1]))}
  assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/for update/);
});

test('schema-4 upgrade comparison aligns only canonically equal legacy values for plaintext and encrypted payloads',()=>{
  const cloud=readSource('js/51-cloud-sync.js');
  assert.match(cloud,/remotePlain=isEncryptedPayload\(remote\?\.payload\)\?await decryptCloudPayload\(remote\.payload\):remote\?\.payload/);
  assert.match(cloud,/function alignSchema4ProjectionStorage/);
  assert.match(cloud,/canonical\(JSON\.parse\(local\[key\]\)\)===canonical\(JSON\.parse\(remoteRaw\)\)/);
  assert.match(cloud,/if\(same\)local\[key\]=remoteRaw/);
  assert.match(cloud,/alignSchema4ProjectionStorage\(normalizedStorage\(schema5ProjectionStorage\(plain\)\),remotePlain\)/);
});

test('historical schema-4 encryption domain and verified unlock publication remain compatible',()=>{
  const cloud=readSource('js/51-cloud-sync.js'),unlock=cloud.slice(cloud.indexOf('async function unlockEncryption'),cloud.indexOf('function lockEncryptionDevice'));
  assert.match(cloud,/schema===5\?'RosterBot schema-5 cloud fingerprint v1\\0':'RosterBot sync fingerprint v1\\0'/);
  assert.doesNotMatch(cloud,/RosterBot schema-4 cloud fingerprint v1/);
  const candidateVerification=unlock.indexOf('await decryptCloudPayload(remote.payload,master,profile)'),publishProfile=unlock.indexOf('cryptoProfile=profile'),publishMaster=unlock.indexOf('masterKeyBytes=master'),installedVerification=unlock.indexOf('await decryptCloudPayload(remote.payload);'),success=unlock.indexOf("setStatus('Encrypted cloud unlocked on this device.");
  assert(candidateVerification>=0&&candidateVerification<publishProfile&&publishProfile<publishMaster&&publishMaster<installedVerification&&installedVerification<success,'unlock success or key publication precedes verified decryption');
  for(const reason of ['deriving','derived-key-verifying-payload','installed-context-verifying','unlocked-verified','unlock-verification-failed','missing-key-at-decrypt','same-user-token-refresh-preserved','revoked-logout','revoked-user-change','revoked-auth-loss','revoked-config-change','revoked-explicit-lock'])assert.match(cloud,new RegExp(reason));
  const diagnostic=cloud.slice(cloud.indexOf('function cryptoTransition'),cloud.indexOf('function isPlainSchema4'));
  assert.doesNotMatch(diagnostic,/accessToken|refresh_token|masterKeyBytes\s*[:=]\s*masterKeyBytes|ciphertext|passphrase|secret/);
});

test('maintained Phase 8C trigger fixture is a current client-valid schema-5 envelope',async()=>{
  const sql=readSource('supabase/tests/phase8c-trigger-contract.sql'),match=/schema_version = 5,\s*payload = '(\{"format":"rosterbot-personal-state"[^']+\})'::jsonb/s.exec(sql);
  assert(match,'schema-5 trigger fixture not found');assert.equal((await schema5.validateSchema5Envelope(JSON.parse(match[1]))).ok,true);
});
