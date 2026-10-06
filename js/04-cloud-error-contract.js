(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RosterBotCloudErrorContract=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const definitions=Object.freeze({
    RB001:Object.freeze({identity:'schema_too_old',messages:['schema_too_old'],action:'update-required',holdReason:'server-schema-too-old',retry:false,userMessage:'Cloud upload stopped safely: this RosterBot version is too old for the current cloud data. Update RosterBot before syncing; local data has been kept.'}),
    RB002:Object.freeze({identity:'schema_unsupported',messages:['schema_too_new','schema_unsupported'],action:'server-rollout-required',holdReason:'server-schema-unsupported',retry:false,userMessage:'Cloud upload stopped safely because this schema is not enabled by the server. Local data has been kept; do not retry until the server rollout is ready.'}),
    RB003:Object.freeze({identity:'revision_conflict',messages:['revision_conflict'],action:'refresh-conflict',holdReason:'revision-race',retry:false,userMessage:'Cloud upload stopped safely because another write changed the cloud revision.'}),
    RB004:Object.freeze({identity:'payload_schema_mismatch',messages:['payload_schema_mismatch'],action:'recovery-safe',holdReason:'payload-schema-mismatch',retry:false,userMessage:'Cloud upload stopped because the payload schema did not match its server metadata. Local data has been kept for recovery.'}),
    RB005:Object.freeze({identity:'payload_malformed',messages:['payload_malformed'],action:'recovery-safe',holdReason:'payload-malformed',retry:false,userMessage:'Cloud upload stopped because the payload envelope was invalid. Local data has been kept for recovery.'}),
    RB006:Object.freeze({identity:'not_authenticated',messages:['not_authenticated'],action:'reauthenticate',holdReason:'cloud-authentication-required',retry:false,userMessage:'Cloud upload stopped because the signed-in session was not accepted. Sign in again before retrying.'}),
    RB007:Object.freeze({identity:'state_invariant_violation',messages:['state_invariant_violation'],action:'operational-fault',holdReason:'server-state-invariant',retry:false,userMessage:'Cloud upload stopped because the server detected an internal state invariant violation. Local data has been kept; do not retry until the service is repaired.'})
  });
  function exactMessage(error){return String(error?.message||'').trim().split(':',1)[0]}
  function classify(error){
    const code=String(error?.code||'').toUpperCase(),message=exactMessage(error);
    if(definitions[code])return definitions[code];
    for(const definition of Object.values(definitions))if(definition.messages.includes(message))return definition;
    return null;
  }
  return Object.freeze({definitions,classify});
});
