import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

function filesBelow(directory,prefix=''){
  const result=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=path.join(prefix,entry.name),absolute=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...filesBelow(absolute,relative));
    else result.push(relative);
  }
  return result;
}

test('staging Pages bundle is deploy-only, separately named and keeps the Cloud capability-4 hold',()=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'rosterbot-pages-test-')),output=path.join(parent,'bundle');
  try{
    const prepared=spawnSync(process.execPath,[path.join(root,'scripts/prepare-staging-pages.mjs'),output],{cwd:root,encoding:'utf8'});
    assert.equal(prepared.status,0,prepared.stderr||prepared.stdout);
    assert.equal(fs.readFileSync(path.join(output,'CNAME'),'utf8'),'beta.rosterbot.work\n');
    assert.equal(fs.readFileSync(path.join(output,'index.html'),'utf8'),fs.readFileSync(path.join(root,'index.html'),'utf8'));
    for(const directory of ['css','data','js']){
      const sourceFiles=filesBelow(path.join(root,directory)),outputFiles=filesBelow(path.join(output,directory));
      assert.deepEqual(outputFiles,sourceFiles);
      for(const file of sourceFiles)assert.deepEqual(fs.readFileSync(path.join(output,directory,file)),fs.readFileSync(path.join(root,directory,file)));
    }
    const published=new Set(filesBelow(output));
    for(const forbidden of ['docs','tests','supabase','backend-capture','.git'])assert(![...published].some(file=>file===forbidden||file.startsWith(`${forbidden}${path.sep}`)),`${forbidden} leaked into the Pages bundle`);
    const cloud=fs.readFileSync(path.join(output,'js/51-cloud-sync.js'),'utf8');
    assert.match(cloud,/SCHEMA5_CLOUD_HOLD/);assert.match(cloud,/server capability remains 4/);assert.match(cloud,/requireCloudTransferAllowed/);
  }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
