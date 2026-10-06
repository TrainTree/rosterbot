#!/usr/bin/env node

const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const projectRef=String(process.env.PHASE8B_STAGING_PROJECT_REF||'');
const url=String(process.env.PHASE8B_STAGING_URL||'').replace(/\/$/,'');
const serviceKey=String(process.env.PHASE8B_STAGING_SERVICE_ROLE_KEY||'');
if(process.env.PHASE8B_ALLOW_ISOLATED_STAGING!=='yes'||projectRef===PRODUCTION_REF||!/^[a-z]{20}$/.test(projectRef))throw new Error('Refusing non-isolated synthetic cleanup.');
if(new URL(url).hostname!==`${projectRef}.supabase.co`)throw new Error('Staging URL/project ref mismatch.');
if(!serviceKey)throw new Error('Missing staging service-role key.');

async function request(path,{method='GET'}={}){
  const response=await fetch(`${url}${path}`,{method,headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
  const text=await response.text();let data=null;if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!response.ok)throw new Error(`Auth admin request failed (${response.status}): ${JSON.stringify(data)}`);
  return data;
}

const listed=await request('/auth/v1/admin/users?per_page=1000&page=1');
const users=Array.isArray(listed)?listed:(listed?.users||[]);
const synthetic=users.filter(user=>/^phase8[bc]-/i.test(String(user.email||'')));
for(const user of synthetic)await request(`/auth/v1/admin/users/${user.id}`,{method:'DELETE'});
const verified=await request('/auth/v1/admin/users?per_page=1000&page=1');
const remaining=(Array.isArray(verified)?verified:(verified?.users||[])).filter(user=>/^phase8[bc]-/i.test(String(user.email||'')));
if(remaining.length)throw new Error(`Synthetic cleanup incomplete: ${remaining.length} users remain.`);
console.log(JSON.stringify({phase:'synthetic cleanup audit',target_ref:projectRef,found:synthetic.length,deleted:synthetic.length,remaining:0},null,2));
