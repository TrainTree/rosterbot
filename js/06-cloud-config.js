(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else Object.defineProperty(root,'RosterBotCloudConfig',{value:api,writable:false,configurable:false,enumerable:true});
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  const PROFILE_KEYS=new Set(['version','deployment','environment','projectRef','url','publishableKey','allowedOrigins','allowSavedConfiguration','fallbackToEmbedded','requestedCloudSchema']);
  const disabled=(reason,profile=null,origin='')=>Object.freeze({enabled:false,reason,profile,origin,config:null,fixedBinding:true});
  function object(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
  function parseJwtPayload(key){
    try{
      const part=String(key).split('.')[1];if(!part)return null;
      let value=part.replace(/-/g,'+').replace(/_/g,'/');while(value.length%4)value+='=';
      const decode=typeof root.atob==='function'?root.atob(value):null;if(decode==null)return null;
      return JSON.parse(decode);
    }catch(_){return null}
  }
  function browserSafeKey(key,projectRef){
    const value=String(key||'');
    if(/^sb_secret_/i.test(value)||/service[_-]?role/i.test(value))return false;
    if(/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(value))return true;
    if(!/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value))return false;
    const payload=parseJwtPayload(value);
    return payload?.role==='anon'&&payload?.ref===projectRef&&payload?.iss==='supabase';
  }
  function validProjectUrl(url,projectRef){
    try{const parsed=new URL(String(url));return parsed.protocol==='https:'&&parsed.origin===String(url)&&parsed.hostname===`${projectRef}.supabase.co`&&parsed.username===''&&parsed.password===''}catch(_){return false}
  }
  function validOrigin(origin){
    try{const parsed=new URL(String(origin));return parsed.origin===String(origin)&&/^https:$/.test(parsed.protocol)&&parsed.pathname==='/'&&parsed.search===''&&parsed.hash===''}catch(_){return false}
  }
  function validateProfile(profile){
    if(!object(profile))return {ok:false,reason:'deployment-profile-missing'};
    if(Object.keys(profile).some(key=>!PROFILE_KEYS.has(key)))return {ok:false,reason:'deployment-profile-unexpected-field'};
    if(profile.version!==1)return {ok:false,reason:'deployment-profile-version'};
    if(!/^[a-z]{20}$/.test(String(profile.projectRef||'')))return {ok:false,reason:'deployment-project-ref'};
    if(!validProjectUrl(profile.url,profile.projectRef))return {ok:false,reason:'deployment-project-url'};
    if(!browserSafeKey(profile.publishableKey,profile.projectRef))return {ok:false,reason:'deployment-browser-key'};
    if(!Array.isArray(profile.allowedOrigins)||profile.allowedOrigins.length===0||new Set(profile.allowedOrigins).size!==profile.allowedOrigins.length||profile.allowedOrigins.some(origin=>!validOrigin(origin)))return {ok:false,reason:'deployment-origins'};
    if(profile.deployment==='beta-staging'){
      if(profile.environment!=='isolated-staging'||profile.allowedOrigins.length!==1||profile.allowSavedConfiguration!==false||profile.fallbackToEmbedded!==false||profile.requestedCloudSchema!==5)return {ok:false,reason:'beta-deployment-contract'};
    }else if(profile.deployment==='production'){
      if(profile.environment!=='production'||profile.allowSavedConfiguration!==true||profile.fallbackToEmbedded!==true||profile.requestedCloudSchema!==4)return {ok:false,reason:'production-deployment-contract'};
    }else return {ok:false,reason:'deployment-kind'};
    return {ok:true,profile};
  }
  function savedConfiguration(raw){
    let value=raw;
    if(typeof raw==='string'){try{value=JSON.parse(raw)}catch(_){return null}}
    if(!object(value))return null;
    const url=String(value.url||'').replace(/\/+$/,''),key=String(value.key||'');
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!key||/^sb_secret_/i.test(key)||/service[_-]?role/i.test(key))return null;
    return Object.freeze({url,key});
  }
  function embeddedConfiguration(profile){return Object.freeze({url:profile.url,key:profile.publishableKey})}
  function resolve({profile=root.RosterBotCloudDeploymentProfile,origin=root.location?.origin||'',savedRaw=null}={}){
    const checked=validateProfile(profile);if(!checked.ok)return disabled(checked.reason,null,String(origin||''));
    const value=checked.profile,currentOrigin=String(origin||''),embedded=embeddedConfiguration(value);
    if(value.deployment==='beta-staging'){
      if(currentOrigin!==value.allowedOrigins[0])return disabled('beta-origin-mismatch',value,currentOrigin);
      return Object.freeze({enabled:true,reason:null,profile:value,origin:currentOrigin,config:embedded,fixedBinding:true});
    }
    if(value.allowedOrigins.includes(currentOrigin))return Object.freeze({enabled:true,reason:null,profile:value,origin:currentOrigin,config:embedded,fixedBinding:true});
    const saved=value.allowSavedConfiguration?savedConfiguration(savedRaw):null,config=saved||(value.fallbackToEmbedded?embedded:null);
    return config?Object.freeze({enabled:true,reason:null,profile:value,origin:currentOrigin,config,fixedBinding:false}):disabled('cloud-configuration-missing',value,currentOrigin);
  }
  function assertRequest(runtime,targetUrl,actualOrigin=root.location?.origin||''){
    if(!runtime?.enabled||!runtime.config)throw Object.assign(new Error('Cloud is disabled because its deployment configuration is unavailable.'),{code:'CLOUD_CONFIG_DISABLED'});
    if(runtime.profile?.deployment==='beta-staging'){
      if(String(actualOrigin)!==runtime.profile.allowedOrigins[0]||runtime.origin!==runtime.profile.allowedOrigins[0])throw Object.assign(new Error('Cloud is disabled on this origin.'),{code:'CLOUD_ORIGIN_MISMATCH'});
      if(runtime.config.url!==runtime.profile.url||runtime.config.key!==runtime.profile.publishableKey)throw Object.assign(new Error('Cloud is disabled because the beta binding does not match its deployment profile.'),{code:'CLOUD_CONFIG_MISMATCH'});
    }
    let target;try{target=new URL(String(targetUrl))}catch(_){throw Object.assign(new Error('Cloud request URL is malformed.'),{code:'CLOUD_REQUEST_URL_INVALID'})}
    if(target.origin!==runtime.config.url)throw Object.assign(new Error('Cloud request does not match the bound Supabase project.'),{code:'CLOUD_REQUEST_PROJECT_MISMATCH'});
    return true;
  }
  return Object.freeze({validateProfile,resolve,assertRequest,browserSafeKey});
});
