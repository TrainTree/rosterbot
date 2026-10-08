(function(root,factory){
  'use strict';
  const schema5=root?.RosterBotSchema5||(typeof module!=='undefined'&&module.exports?require('./02-schema5.js'):null);
  const api=factory(schema5);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else Object.defineProperty(root,'RosterBotCloudSchema5',{value:api,writable:false,configurable:false,enumerable:true});
})(typeof window!=='undefined'?window:globalThis,function(schema5){
  'use strict';
  const BETA_ORIGIN='https://beta.rosterbot.work';
  const STAGING_REF='wuzyurvrztskljpxpeaq';
  const STAGING_URL=`https://${STAGING_REF}.supabase.co`;
  const CONTRACT='rosterbot-schema5-cloud-v1';
  const ENCRYPTED_FORMAT='rosterbot-encrypted-v1';
  const HASH=/^[a-f0-9]{64}$/;
  const BASE64URL=/^[A-Za-z0-9_-]+$/;
  const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

  function trustedContext(context){
    const profile=context?.profile,config=context?.config;
    return !!(
      profile?.version===1&&profile.deployment==='beta-staging'&&profile.environment==='isolated-staging'&&
      profile.projectRef===STAGING_REF&&profile.url===STAGING_URL&&profile.requestedCloudSchema===5&&
      Array.isArray(profile.allowedOrigins)&&profile.allowedOrigins.length===1&&profile.allowedOrigins[0]===BETA_ORIGIN&&
      profile.allowSavedConfiguration===false&&profile.fallbackToEmbedded===false&&context.origin===BETA_ORIGIN&&
      context.enabled===true&&config?.url===STAGING_URL&&config?.key===profile.publishableKey&&
      typeof profile.publishableKey==='string'&&profile.publishableKey.length>0&&
      typeof context.userId==='string'&&context.userId.length>0&&typeof context.accessToken==='string'&&context.accessToken.length>0
    );
  }
  function validateAttestation(value){
    if(!object(value))return {ok:false,reason:'attestation-not-object'};
    const expected=['contract','environment','max_writable_schema','min_writable_schema','project_ref'];
    if(JSON.stringify(Object.keys(value).sort())!==JSON.stringify(expected))return {ok:false,reason:'attestation-fields'};
    if(value.environment!=='isolated-staging')return {ok:false,reason:'attestation-environment'};
    if(value.project_ref!==STAGING_REF)return {ok:false,reason:'attestation-project'};
    if(value.contract!==CONTRACT)return {ok:false,reason:'attestation-contract'};
    const minimum=value.min_writable_schema,maximum=value.max_writable_schema;
    if(!Number.isSafeInteger(minimum)||!Number.isSafeInteger(maximum)||minimum>5||maximum<5||minimum>maximum)return {ok:false,reason:'attestation-schema-range'};
    return {ok:true,value:Object.freeze({...value})};
  }
  function createCapabilityState(){
    let grant=null,lastReason='not-attested';
    function revoke(reason='revoked'){grant=null;lastReason=String(reason||'revoked');return status()}
    function contextSignature(context){return {origin:context.origin,projectRef:context.profile.projectRef,url:context.config.url,key:context.config.key,userId:context.userId,accessToken:context.accessToken}}
    function sameContext(context){
      if(!grant||!trustedContext(context))return false;
      const signature=contextSignature(context);
      return Object.keys(signature).every(key=>signature[key]===grant.signature[key]);
    }
    function isGranted(context){if(!sameContext(context)){if(grant)revoke('context-changed');return false}return true}
    function accept(attestation,context){
      revoke('attestation-pending');
      if(!trustedContext(context))return {ok:false,reason:lastReason='untrusted-context'};
      const checked=validateAttestation(attestation);if(!checked.ok)return {ok:false,reason:lastReason=checked.reason};
      grant={signature:Object.freeze(contextSignature(context)),attestation:checked.value,grantedAt:Date.now()};lastReason='granted';return {ok:true,attestation:checked.value};
    }
    async function attest(request,context){
      revoke('attestation-pending');
      if(!trustedContext(context))throw Object.assign(new Error('Schema-5 Cloud is held because the beta deployment binding is not trusted.'),{code:'SCHEMA5_CLOUD_CAPABILITY_HOLD',reason:lastReason='untrusted-context'});
      try{
        const response=await request();const result=accept(response,context);
        if(!result.ok)throw Object.assign(new Error(`Schema-5 Cloud capability attestation was refused: ${result.reason}.`),{code:'SCHEMA5_CLOUD_CAPABILITY_HOLD',reason:result.reason});
        return result.attestation;
      }catch(error){revoke(error?.reason||'attestation-request-failed');throw error}
    }
    function status(context=null){return Object.freeze({granted:context?isGranted(context):!!grant,reason:lastReason,attestation:grant?.attestation||null,grantedAt:grant?.grantedAt||null})}
    return Object.freeze({accept,attest,isGranted,revoke,status});
  }
  function isPlaintext(payload){return object(payload)&&payload.format===schema5?.SCHEMA5_FORMAT&&payload.storageSchemaVersion===5}
  function isEncrypted(payload){return object(payload)&&payload.format===ENCRYPTED_FORMAT&&payload.schemaVersion===5}
  function validateEncryptedOuter(payload){
    const errors=[];
    if(!isEncrypted(payload))return {ok:false,errors:['encrypted-schema5-format']};
    if(JSON.stringify(Object.keys(payload).sort())!==JSON.stringify(['ciphertext','crypto','format','schemaVersion']))errors.push('encrypted-schema5-fields');
    const c=payload.crypto,keys=['cipher','fingerprint','keyId','passphraseWrap','payloadIv','recoveryWrap','version'];
    if(!object(c)||JSON.stringify(Object.keys(c).sort())!==JSON.stringify(keys))errors.push('encrypted-schema5-crypto-fields');
    if(c?.version!==1||c?.cipher!=='AES-GCM-256'||typeof c?.keyId!=='string'||!c.keyId||!HASH.test(String(c?.fingerprint||''))||!BASE64URL.test(String(c?.payloadIv||''))||typeof payload.ciphertext!=='string'||!BASE64URL.test(payload.ciphertext))errors.push('encrypted-schema5-crypto-metadata');
    const p=c?.passphraseWrap,r=c?.recoveryWrap;
    if(!object(p)||p.kdf!=='PBKDF2-SHA-256'||!Number.isSafeInteger(p.iterations)||p.iterations<100000||![p.salt,p.iv,p.ciphertext].every(value=>typeof value==='string'&&BASE64URL.test(value)))errors.push('encrypted-schema5-passphrase-wrap');
    if(!object(r)||r.type!=='random-256'||![r.iv,r.ciphertext].every(value=>typeof value==='string'&&BASE64URL.test(value)))errors.push('encrypted-schema5-recovery-wrap');
    return {ok:errors.length===0,errors};
  }
  async function validatePlaintext(payload,options={}){return schema5.validateSchema5Envelope(payload,options)}
  function hmacIdentity(envelope){return schema5.schema5Identity(envelope)}
  return Object.freeze({BETA_ORIGIN,STAGING_REF,STAGING_URL,CONTRACT,ENCRYPTED_FORMAT,trustedContext,validateAttestation,createCapabilityState,isPlaintext,isEncrypted,validateEncryptedOuter,validatePlaintext,hmacIdentity});
});
