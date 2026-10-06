#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PRODUCTION_REF='rithmbggiiusrmdcqrif';
const projectRef=String(process.env.PHASE8C_STAGING_PROJECT_REF||'');
const confirmation=String(process.env.PHASE8C_ALLOW_ISOLATED_STAGING||'');
const requested=String(process.argv[2]||'');
const allowed=new Map([
  ['baseline',{file:'phase8c-baseline-integration.mjs'}],
  ['gate4',{file:'phase8c-gate4-smoke.mjs'}],
  ['phase8b-core',{file:'phase8b-staging-integration.mjs',group:'core'}],
  ['phase8b-races',{file:'phase8b-staging-integration.mjs',group:'races'}],
  ['phase8b-payload',{file:'phase8b-staging-integration.mjs',group:'payload'}],
  ['phase8b-security',{file:'phase8b-staging-integration.mjs',group:'security'}],
  ['cleanup',{file:'phase8c-cleanup-synthetic-users.mjs'}],
  ['triggers',{file:'phase8c-trigger-contract.mjs'}]
]);

if(confirmation!=='yes')throw new Error('Refusing harness: set PHASE8C_ALLOW_ISOLATED_STAGING=yes.');
if(!/^[a-z]{20}$/.test(projectRef))throw new Error('Refusing harness: invalid or missing PHASE8C_STAGING_PROJECT_REF.');
if(projectRef===PRODUCTION_REF)throw new Error(`Refusing harness against production project ${PRODUCTION_REF}.`);
if(!allowed.has(requested))throw new Error(`Usage: phase8c-with-staging-credentials.mjs ${[...allowed.keys()].join('|')}`);

const accessToken=fs.readFileSync(`${process.env.HOME}/.supabase/access-token`,'utf8').trim();
const response=await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`,{
  headers:{Authorization:`Bearer ${accessToken}`}
});
const keys=await response.json();
if(!response.ok)throw new Error(`Could not load staging API keys (${response.status}).`);
const anon=keys.find(key=>key.name==='anon'&&key.type==='legacy')?.api_key;
const service=keys.find(key=>key.name==='service_role'&&key.type==='legacy')?.api_key;
if(!anon||!service)throw new Error('Staging legacy anon/service-role keys are unavailable.');

console.log(JSON.stringify({target_name:'rosterbot-phase8c-staging',target_ref:projectRef,production_refused:true,harness:requested}));
const selection=allowed.get(requested);
const script=path.join(path.dirname(new URL(import.meta.url).pathname),selection.file);
const result=spawnSync(process.execPath,[script],{
  stdio:['inherit','pipe','pipe'],
  encoding:'utf8',
  env:{
    ...process.env,
    PHASE8B_ALLOW_ISOLATED_STAGING:'yes',
    PHASE8B_STAGING_PROJECT_REF:projectRef,
    PHASE8B_STAGING_URL:`https://${projectRef}.supabase.co`,
    PHASE8B_STAGING_ANON_KEY:anon,
    PHASE8B_STAGING_SERVICE_ROLE_KEY:service,
    ...(selection.group?{PHASE8B_TEST_GROUP:selection.group}:{})
  }
});
if(result.stdout)process.stdout.write(result.stdout);
if(result.stderr)process.stderr.write(result.stderr);
if(result.error)throw result.error;
console.log(JSON.stringify({harness:requested,child_exit_status:result.status,child_signal:result.signal??null}));
process.exitCode=result.status??1;
