import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {root,readSource} from './helpers.mjs';
import {
  APPLICATION_VERSION,ASSET_MANIFEST_VERSION,COLD_START_ASSETS,FEATURE_ASSETS,
  FOUNDATION_ASSETS,GENERATED_IDENTITY_ASSET,GENERATED_MANIFEST_ASSET,
  PRESENTATION_SCRIPT_ASSETS,RUNTIME_SOURCE_ASSETS,STAMPED_SCRIPT_ASSETS
} from '../../scripts/runtime-assets.mjs';
import {generateRuntimeBuild,verifyRuntimeBuild} from '../../scripts/runtime-build.mjs';

const require=createRequire(import.meta.url);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(readSource(GENERATED_MANIFEST_ASSET));
const buildId=manifest.buildId;

function filesBelow(directory,prefix=''){
  const rows=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=path.posix.join(prefix,entry.name),absolute=path.join(directory,entry.name);
    if(entry.isDirectory())rows.push(...filesBelow(absolute,relative));else rows.push(relative);
  }
  return rows;
}

function bootContext({withIdentity=true}={}){
  const reads=[],writes=[],storage={get length(){reads.push('length');return 0},key(index){reads.push(`key:${index}`);return null},getItem(key){reads.push(`get:${key}`);return null},setItem(key){writes.push(`set:${key}`)},removeItem(key){writes.push(`remove:${key}`)},clear(){writes.push('clear')}};
  const listeners=new Map(),meta={content:buildId},sandbox={console,URL,Date,setTimeout,clearTimeout,localStorage:storage,navigator:{userAgent:'synthetic-build-test'},isSecureContext:true,crypto:{subtle:{}},location:{href:'https://rosterbot.work/',origin:'https://rosterbot.work',replace(){}},addEventListener(type,handler){listeners.set(type,handler)}};
  sandbox.document={readyState:'complete',currentScript:{src:'synthetic.js'},querySelector:selector=>selector==='meta[name="rosterbot-build-id"]'?meta:null,getElementById:()=>null,addEventListener(){},documentElement:{classList:{add(){}}},createElement:()=>({appendChild(){},addEventListener(){},setAttribute(){}})};
  sandbox.window=sandbox;sandbox.globalThis=sandbox;
  const context=vm.createContext(sandbox),html=readSource('index.html'),collector=html.match(/<script id="rosterbotBootDiagnostics">([\s\S]*?)<\/script>/)?.[1];
  assert(collector,'inline boot diagnostics were not found');vm.runInContext(collector,context,{filename:'inline-boot-diagnostics.js'});
  if(withIdentity)vm.runInContext(readSource(GENERATED_IDENTITY_ASSET),context,{filename:GENERATED_IDENTITY_ASSET});
  return {sandbox,context,reads,writes,listeners};
}

test('one authoritative inventory covers every current runtime asset exactly once',()=>{
  const actual=['index.html','manifest.webmanifest','favicon.ico',...filesBelow(path.join(root,'css'),'css'),...filesBelow(path.join(root,'data'),'data'),...filesBelow(path.join(root,'js'),'js'),...filesBelow(path.join(root,'assets/icons'),'assets/icons')].sort();
  assert.deepEqual([...RUNTIME_SOURCE_ASSETS].sort(),actual);
  assert.equal(new Set(RUNTIME_SOURCE_ASSETS).size,RUNTIME_SOURCE_ASSETS.length);
  assert.deepEqual(manifest.assets.map(asset=>asset.url),RUNTIME_SOURCE_ASSETS);
  assert.deepEqual([...FOUNDATION_ASSETS,...PRESENTATION_SCRIPT_ASSETS,...FEATURE_ASSETS],STAMPED_SCRIPT_ASSETS);
});

test('generated manifest is deterministic, current, and hashes every cold-start byte',async()=>{
  const verified=await verifyRuntimeBuild(root);
  assert.equal(verified.buildId,buildId);assert.equal(manifest.applicationVersion,APPLICATION_VERSION);assert.equal(manifest.formatVersion,ASSET_MANIFEST_VERSION);
  for(const asset of manifest.assets){const bytes=fs.readFileSync(path.join(root,asset.url));assert.equal(asset.sha256,sha256(bytes),asset.url);assert.equal(asset.bytes,bytes.byteLength,asset.url)}
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-build-determinism-'));
  try{
    for(const relative of RUNTIME_SOURCE_ASSETS){const target=path.join(temp,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,relative),target)}
    const first=await generateRuntimeBuild(temp,{write:true}),firstManifest=fs.readFileSync(path.join(temp,GENERATED_MANIFEST_ASSET),'utf8');
    const second=await generateRuntimeBuild(temp,{write:true}),secondManifest=fs.readFileSync(path.join(temp,GENERATED_MANIFEST_ASSET),'utf8');
    assert.equal(first.buildId,second.buildId);assert.equal(firstManifest,secondManifest);
    const committed=await generateRuntimeBuild(temp,{sourceCommit:'a'.repeat(40),write:true});assert.equal(committed.manifest.sourceCommit,'a'.repeat(40));assert.notEqual(committed.buildId,first.buildId);
  }finally{fs.rmSync(temp,{recursive:true,force:true})}
});

test('production, beta, bootstrap and future caching consume the shared inventory',()=>{
  for(const generator of ['scripts/prepare-production-pages.mjs','scripts/prepare-staging-pages.mjs']){
    const source=readSource(generator);assert.match(source,/RUNTIME_SOURCE_ASSETS/);assert.match(source,/generateRuntimeBuild/);assert.doesNotMatch(source,/const directories=|readdir\(path\.join\(sourceRoot,directory\)/);
  }
  const bootstrap=readSource('js/03-persistence-bootstrap.js');assert.match(bootstrap,/RosterBotBuild\?\.featureAssets/);assert.doesNotMatch(bootstrap,/const moduleSources=\[/);
  assert.equal(manifest.cacheNamespace,`rosterbot-app-${buildId.slice('rb-build:'.length)}`);assert.match(manifest.completeBuildMarker,/^rosterbot-complete-/);
});

test('same-build startup records components while a mismatched component fails closed distinctly',()=>{
  const current=bootContext();
  vm.runInContext(readSource('js/00-canonical-origin.js'),current.context,{filename:'js/00-canonical-origin.js'});
  assert.equal(current.sandbox.RosterBotBuild.observedComponents()['js/00-canonical-origin.js'],buildId);
  const oldBuild=`rb-build:${'f'.repeat(64)}`,mixed=readSource('js/01-storage-compatibility.js').replace(buildId,oldBuild);
  assert.throws(()=>vm.runInContext(mixed,current.context,{filename:'js/01-storage-compatibility.js'}),error=>error.code==='ROSTERBOT_BUILD_MISMATCH');
  const failure=current.sandbox.RosterBotBootDiagnostics.getFirstError();
  assert.equal(failure.kind,'build-coherence');assert.equal(failure.component,'js/01-storage-compatibility.js');assert.equal(failure.expectedBuildId,buildId);assert.equal(failure.observedBuildId,oldBuild);
  assert.deepEqual(current.writes,[]);assert.deepEqual(current.reads,[]);
});

test('missing identity and missing foundational reports stop before personal storage is inspected',()=>{
  const missingResource=bootContext({withIdentity:false});missingResource.listeners.get('error')({target:{tagName:'SCRIPT',src:'https://rosterbot.work/js/00-build-identity.js'}});
  assert.equal(missingResource.sandbox.RosterBotBootDiagnostics.getFirstError().kind,'build-coherence');assert.equal(missingResource.sandbox.RosterBotBootDiagnostics.getFirstError().reason,'build-identity-load-failed');
  const missingIdentity=bootContext({withIdentity:false});
  assert.throws(()=>vm.runInContext(readSource('js/00-error-handler.js'),missingIdentity.context,{filename:'js/00-error-handler.js'}),error=>error.code==='ROSTERBOT_BUILD_IDENTITY_MISSING');
  assert.equal(missingIdentity.sandbox.RosterBotBootDiagnostics.getFirstError().kind,'build-coherence');assert.deepEqual(missingIdentity.reads,[]);assert.deepEqual(missingIdentity.writes,[]);
  const missingFoundation=bootContext();
  for(const asset of FOUNDATION_ASSETS.slice(0,-1))missingFoundation.sandbox.RosterBotBuild.assertComponent(asset,buildId);
  assert.throws(()=>missingFoundation.sandbox.RosterBotBuild.assertFoundations(),error=>error.code==='ROSTERBOT_BUILD_MISMATCH');
  assert.deepEqual(missingFoundation.reads,[]);assert.deepEqual(missingFoundation.writes,[]);
});

test('canonical-origin decision redirects only the production www alias and preserves the URL',()=>{
  const api=require(`${root}/js/00-canonical-origin.js`);
  assert.deepEqual(api.decide('https://www.rosterbot.work/diary?from=home#today'),{action:'redirect',reason:'production-alias',canonicalOrigin:'https://rosterbot.work',target:'https://rosterbot.work/diary?from=home#today'});
  for(const origin of ['https://rosterbot.work/','https://beta.rosterbot.work/','http://localhost:8765/','http://127.0.0.1:8000/','https://test.invalid/'])assert.equal(api.decide(origin).action,'continue',origin);
  const html=readSource('index.html');assert(html.indexOf('id="rosterbotCanonicalOriginDecision"')<html.indexOf('src="js/00-error-handler.js"'));assert.match(readSource('js/00-error-handler.js'),/__rosterbotCanonicalOriginDecision\?\.action==='continue'/);assert.match(readSource('js/03-persistence-bootstrap.js'),/__rosterbotCanonicalRedirectPending/);assert.match(readSource('js/03-persistence-bootstrap.js'),/ROSTERBOT_CANONICAL_ORIGIN_DECISION_MISSING/);
});
