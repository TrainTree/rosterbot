import {createHash} from 'node:crypto';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {
  APPLICATION_VERSION,ASSET_MANIFEST_VERSION,BUILD_ID_PLACEHOLDER,BUILD_STAMP_PATTERN,
  COLD_START_ASSETS,FEATURE_ASSETS,FOUNDATION_ASSETS,GENERATED_IDENTITY_ASSET,
  GENERATED_MANIFEST_ASSET,INSTALLABILITY_ASSETS,PRESENTATION_SCRIPT_ASSETS,
  RUNTIME_SOURCE_ASSETS,STAMPED_SCRIPT_ASSETS,assetCriticality
} from './runtime-assets.mjs';

const sha256=value=>createHash('sha256').update(value).digest('hex');
const mimeType=relative=>relative.endsWith('.html')?'text/html':relative.endsWith('.css')?'text/css':relative.endsWith('.js')?'text/javascript':relative.endsWith('.json')?'application/json':relative.endsWith('.webmanifest')?'application/manifest+json':relative.endsWith('.png')?'image/png':relative.endsWith('.ico')?'image/x-icon':'application/octet-stream';
const normalizedBytes=(relative,bytes)=>{
  if(relative===GENERATED_IDENTITY_ASSET)return null;
  if(relative==='index.html'||STAMPED_SCRIPT_ASSETS.includes(relative))return Buffer.from(bytes.toString('utf8').replace(BUILD_STAMP_PATTERN,BUILD_ID_PLACEHOLDER),'utf8');
  return bytes;
};

async function regularFile(root,relative){
  const absolute=path.join(root,relative),details=await stat(absolute);
  if(!details.isFile())throw new Error(`Runtime asset is not a regular file: ${relative}`);
  return absolute;
}

export async function calculateBuildInput(root,{sourceCommit=null}={}){
  const assets=[];
  for(const relative of RUNTIME_SOURCE_ASSETS){
    if(relative===GENERATED_IDENTITY_ASSET)continue;
    const absolute=await regularFile(root,relative),bytes=await readFile(absolute),normalized=normalizedBytes(relative,bytes);
    assets.push({url:relative,sha256:sha256(normalized),bytes:normalized.byteLength});
  }
  const input={applicationVersion:APPLICATION_VERSION,sourceCommit:sourceCommit||null,assetManifestVersion:ASSET_MANIFEST_VERSION,assets};
  return {input,buildId:`rb-build:${sha256(Buffer.from(JSON.stringify(input),'utf8'))}`};
}

function identitySource({buildId,sourceCommit=null}){
  const identity={
    application:'RosterBot',applicationVersion:APPLICATION_VERSION,buildId,
    sourceCommit:sourceCommit||null,assetManifestVersion:ASSET_MANIFEST_VERSION,
    assetManifestUrl:GENERATED_MANIFEST_ASSET,cacheNamespace:`rosterbot-app-${buildId.slice('rb-build:'.length)}`,
    completeBuildMarker:`rosterbot-complete-${buildId.slice('rb-build:'.length)}`,
    minimumApplicationVersion:APPLICATION_VERSION,
    foundationalAssets:FOUNDATION_ASSETS,presentationAssets:PRESENTATION_SCRIPT_ASSETS,
    featureAssets:FEATURE_ASSETS,coldStartAssets:COLD_START_ASSETS,
    installabilityAssets:INSTALLABILITY_ASSETS,runtimeAssets:RUNTIME_SOURCE_ASSETS
  };
  return `(function(root){\n  'use strict';\n  const identity=${JSON.stringify(identity)};for(const key of ['foundationalAssets','presentationAssets','featureAssets','coldStartAssets','installabilityAssets','runtimeAssets'])Object.freeze(identity[key]);Object.freeze(identity);\n  const observed=new Map();\n  function mismatch(component,actual,reason){\n    const expected=identity.buildId,detail={component:String(component||'unknown'),expectedBuildId:expected,observedBuildId:String(actual||'missing'),reason:String(reason||'build-mismatch')};\n    try{root.RosterBotBootDiagnostics?.buildMismatch?.(detail)}catch(_){}\n    const error=new Error(\`RosterBot application build mismatch: \${detail.component} expected \${expected} but observed \${detail.observedBuildId}\`);error.name='RosterBotBuildMismatchError';error.code='ROSTERBOT_BUILD_MISMATCH';error.detail=detail;throw error;\n  }\n  function assertComponent(component,componentBuildId){if(componentBuildId!==identity.buildId)mismatch(component,componentBuildId,'component-build-mismatch');observed.set(String(component),String(componentBuildId));return true}\n  function assertFoundations(){const missing=identity.foundationalAssets.filter(asset=>observed.get(asset)!==identity.buildId);if(missing.length)mismatch(missing[0],observed.get(missing[0])||'missing','foundational-component-missing');return true}\n  function observedComponents(){return Object.freeze(Object.fromEntries(observed))}\n  const api=Object.freeze({...identity,assertComponent,assertFoundations,observedComponents});\n  const meta=root.document?.querySelector?.('meta[name="rosterbot-build-id"]')?.content||'';\n  if(meta!==identity.buildId)mismatch('index.html',meta||'missing','document-build-mismatch');\n  Object.defineProperty(root,'RosterBotBuild',{value:api,writable:false,configurable:false,enumerable:true});\n})(window);\n`;
}

export async function generateRuntimeBuild(root,{sourceCommit=null,write=true}={}){
  const {input,buildId}=await calculateBuildInput(root,{sourceCommit});
  for(const relative of STAMPED_SCRIPT_ASSETS){
    const absolute=await regularFile(root,relative),source=await readFile(absolute,'utf8'),matches=source.match(BUILD_STAMP_PATTERN)||[];
    if(matches.length!==1)throw new Error(`${relative} must contain exactly one RosterBot build stamp; observed ${matches.length}.`);
    const updated=source.replace(BUILD_STAMP_PATTERN,buildId);
    if(write&&updated!==source)await writeFile(absolute,updated,'utf8');
  }
  const indexPath=await regularFile(root,'index.html'),index=await readFile(indexPath,'utf8'),indexMatches=index.match(BUILD_STAMP_PATTERN)||[];
  if(indexMatches.length!==1)throw new Error(`index.html must contain exactly one RosterBot build stamp; observed ${indexMatches.length}.`);
  const updatedIndex=index.replace(BUILD_STAMP_PATTERN,buildId);
  if(write&&updatedIndex!==index)await writeFile(indexPath,updatedIndex,'utf8');
  const identity=identitySource({buildId,sourceCommit});
  if(write){await mkdir(path.dirname(path.join(root,GENERATED_IDENTITY_ASSET)),{recursive:true});await writeFile(path.join(root,GENERATED_IDENTITY_ASSET),identity,'utf8')}
  const assets=[];
  for(const relative of RUNTIME_SOURCE_ASSETS){
    const bytes=relative===GENERATED_IDENTITY_ASSET?Buffer.from(identity,'utf8'):await readFile(await regularFile(root,relative));
    const criticality=assetCriticality(relative);
    assets.push({url:relative,sha256:sha256(bytes),bytes:bytes.byteLength,type:mimeType(relative),criticality,requiredForColdStart:criticality==='startup-critical'});
  }
  const manifest={
    format:'rosterbot-runtime-build-manifest',formatVersion:ASSET_MANIFEST_VERSION,
    application:'RosterBot',applicationVersion:APPLICATION_VERSION,buildId,sourceCommit:sourceCommit||null,
    cacheNamespace:`rosterbot-app-${buildId.slice('rb-build:'.length)}`,
    completeBuildMarker:`rosterbot-complete-${buildId.slice('rb-build:'.length)}`,
    minimumApplicationVersion:APPLICATION_VERSION,assets
  };
  const manifestText=`${JSON.stringify(manifest,null,2)}\n`;
  if(write)await writeFile(path.join(root,GENERATED_MANIFEST_ASSET),manifestText,'utf8');
  return {buildId,input,identity,manifest,manifestText};
}

export async function verifyRuntimeBuild(root){
  const generated=await generateRuntimeBuild(root,{write:false}),manifest=JSON.parse(await readFile(path.join(root,GENERATED_MANIFEST_ASSET),'utf8'));
  if(JSON.stringify(manifest)!==JSON.stringify(generated.manifest))throw new Error('Generated runtime manifest is stale. Run npm run build:identity.');
  const identity=await readFile(path.join(root,GENERATED_IDENTITY_ASSET),'utf8');
  if(identity!==generated.identity)throw new Error('Generated runtime build identity is stale. Run npm run build:identity.');
  for(const relative of STAMPED_SCRIPT_ASSETS){const source=await readFile(path.join(root,relative),'utf8');if(!source.includes(generated.buildId))throw new Error(`Runtime build stamp is stale: ${relative}`)}
  const index=await readFile(path.join(root,'index.html'),'utf8');if(!index.includes(generated.buildId))throw new Error('Runtime build stamp is stale: index.html');
  return generated;
}
