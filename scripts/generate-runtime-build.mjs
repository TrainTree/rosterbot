import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {generateRuntimeBuild,verifyRuntimeBuild} from './runtime-build.mjs';
import {generateServiceWorker,verifyServiceWorker} from './service-worker-build.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const verify=process.argv.includes('--verify');
const sourceCommit=String(process.env.ROSTERBOT_SOURCE_COMMIT||'').trim()||null;
const result=verify?await verifyRuntimeBuild(root):await generateRuntimeBuild(root,{sourceCommit,write:true});
const worker=verify?await verifyServiceWorker(root,{manifest:result.manifest}):await generateServiceWorker(root,{manifest:result.manifest,write:true});
console.log(JSON.stringify({mode:verify?'verify':'write',applicationVersion:result.manifest.applicationVersion,buildId:result.buildId,sourceCommit:result.manifest.sourceCommit,assets:result.manifest.assets.length,offlineRequiredAssets:worker.contract.required.length,manifest:'rosterbot-build-manifest.json',serviceWorker:'service-worker.js'},null,2));
