#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const projectRef=String(process.env.PHASE8C_STAGING_PROJECT_REF||'');
const confirmation=String(process.env.PHASE8C_ALLOW_ISOLATED_STAGING||'');
const sqlFile=process.argv[2] ? path.resolve(process.argv[2]) : '';

if(confirmation!=='yes')throw new Error('Refusing SQL: set PHASE8C_ALLOW_ISOLATED_STAGING=yes.');
if(!/^[a-z]{20}$/.test(projectRef))throw new Error('Refusing SQL: invalid or missing PHASE8C_STAGING_PROJECT_REF.');
if(projectRef===PRODUCTION_REF)throw new Error(`Refusing SQL against production project ${PRODUCTION_REF}.`);
if(!sqlFile||!fs.statSync(sqlFile).isFile())throw new Error('Usage: phase8c-management-sql.mjs <sql-file>.');

const accessToken=fs.readFileSync(`${process.env.HOME}/.supabase/access-token`,'utf8').trim();
if(!accessToken)throw new Error('Supabase access token is unavailable.');
let query=fs.readFileSync(sqlFile,'utf8');
let transformation=null;
if(process.argv.includes('--omit-captured-default-privileges')){
  if(path.basename(sqlFile)!=='public-schema.sql')throw new Error('Default-privilege omission is allowed only for the Phase 8A public-schema capture.');
  const marker='ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public';
  const markerIndex=query.indexOf(marker);
  if(markerIndex<0)throw new Error('Captured default-privilege marker was not found.');
  query=query.slice(0,markerIndex).trimEnd()+'\n';
  transformation='omitted captured ALTER DEFAULT PRIVILEGES blocks: staging Management API role returned 42501';
}
const checksum=crypto.createHash('sha256').update(query).digest('hex');

const response=await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`,{
  method:'POST',
  headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},
  body:JSON.stringify({query})
});
const body=await response.text();
let data=body;
try{data=body?JSON.parse(body):null}catch{}
if(!response.ok)throw new Error(`Staging SQL failed (${response.status}): ${JSON.stringify(data)}`);

console.log(JSON.stringify({
  target_ref:projectRef,
  production_refused:projectRef!==PRODUCTION_REF,
  sql_file:path.relative(process.cwd(),sqlFile),
  sha256:checksum,
  transformation,
  http_status:response.status,
  result:data
},null,2));
