import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {root,readSource} from './helpers.mjs';
import {
  COLD_START_ASSETS,COSMETIC_ASSETS,INSTALLABILITY_ASSETS,PRESENTATION_SCRIPT_ASSETS,
  RUNTIME_SOURCE_ASSETS,assetCriticality
} from '../../scripts/runtime-assets.mjs';

const require=createRequire(import.meta.url);
const displayMode=require(`${root}/js/00-display-mode.js`);
const manifest=JSON.parse(readSource('manifest.webmanifest'));
const html=readSource('index.html');

function pngDimensions(relative){
  const bytes=fs.readFileSync(path.join(root,relative));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],`${relative} is not PNG`);
  assert.equal(bytes.subarray(12,16).toString('ascii'),'IHDR',`${relative} has no IHDR`);
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}

test('web app manifest is minimal, coherent, and canonical-origin scoped',()=>{
  assert.deepEqual({name:manifest.name,shortName:manifest.short_name,display:manifest.display},{name:'RosterBot',shortName:'RosterBot',display:'standalone'});
  assert.equal(typeof manifest.description,'string');assert(manifest.description.length>20);
  assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');
  for(const key of ['background_color','theme_color'])assert.match(manifest[key],/^#[0-9a-f]{6}$/i,key);
  const productionBase='https://rosterbot.work/manifest.webmanifest';
  for(const key of ['id','start_url','scope'])assert.equal(new URL(manifest[key],productionBase).href,'https://rosterbot.work/',key);
  const betaBase='https://beta.rosterbot.work/manifest.webmanifest';
  for(const key of ['id','start_url','scope'])assert.equal(new URL(manifest[key],betaBase).href,'https://beta.rosterbot.work/',`beta ${key}`);
  assert.equal('shortcuts' in manifest,false);assert.equal('share_target' in manifest,false);assert.equal('related_applications' in manifest,false);
});

test('manifest icons and document presentation metadata reference valid local raster assets',()=>{
  assert.deepEqual(pngDimensions('assets/branding/rosterbot-icon-master.png'),{width:1254,height:1254});
  assert(manifest.icons.some(icon=>icon.sizes==='192x192'&&icon.purpose==='any'));
  assert(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose==='any'));
  assert(manifest.icons.some(icon=>icon.sizes==='192x192'&&icon.purpose==='maskable'));
  assert(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose==='maskable'));
  for(const icon of manifest.icons){
    assert.equal(icon.type,'image/png');assert.equal(fs.existsSync(path.join(root,icon.src)),true,icon.src);
    const [expectedWidth,expectedHeight]=icon.sizes.split('x').map(Number);assert.deepEqual(pngDimensions(icon.src),{width:expectedWidth,height:expectedHeight});
  }
  const expectedPNGs={
    'assets/icons/apple-touch-icon.png':[180,180],
    'assets/icons/favicon-32.png':[32,32],
    'assets/icons/favicon-16.png':[16,16]
  };
  for(const [relative,[width,height]] of Object.entries(expectedPNGs))assert.deepEqual(pngDimensions(relative),{width,height});
  const ico=fs.readFileSync(path.join(root,'favicon.ico'));assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),2);
  for(const required of [
    /<link rel="manifest" href="manifest\.webmanifest">/,
    /<link rel="apple-touch-icon" sizes="180x180" href="assets\/icons\/apple-touch-icon\.png">/,
    /<meta name="apple-mobile-web-app-capable" content="yes">/,
    /<meta name="apple-mobile-web-app-status-bar-style" content="black">/,
    /<meta name="apple-mobile-web-app-title" content="RosterBot">/,
    /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/,
    /<link rel="canonical" href="https:\/\/rosterbot\.work\/">/
  ])assert.match(html,required);
});

test('every Phase 2 resource is classified once in the authoritative build inventory',()=>{
  const manifestResources=['manifest.webmanifest',...manifest.icons.map(icon=>icon.src),'assets/icons/apple-touch-icon.png'];
  for(const relative of new Set(manifestResources)){assert(INSTALLABILITY_ASSETS.includes(relative),relative);assert(RUNTIME_SOURCE_ASSETS.includes(relative),relative)}
  for(const relative of ['favicon.ico','assets/icons/favicon-16.png','assets/icons/favicon-32.png']){assert(COSMETIC_ASSETS.includes(relative));assert(RUNTIME_SOURCE_ASSETS.includes(relative))}
  assert.deepEqual(PRESENTATION_SCRIPT_ASSETS,['js/00-display-mode.js','js/90-service-worker-registration.js','js/91-update-lifecycle.js']);
  assert.equal(assetCriticality('js/00-display-mode.js'),'installability-critical');
  assert.equal(assetCriticality('js/90-service-worker-registration.js'),'installability-critical');
  for(const relative of manifestResources)assert.notEqual(assetCriticality(relative),'startup-critical',relative);
  for(const relative of COSMETIC_ASSETS)assert.equal(assetCriticality(relative),'cosmetic',relative);
  assert(!COLD_START_ASSETS.includes('manifest.webmanifest'));assert(!COLD_START_ASSETS.includes('assets/icons/rosterbot-192.png'));
});

test('standalone detection supports browser, media-query, iOS, and unsupported environments',()=>{
  assert.deepEqual(displayMode.detect({navigator:{},matchMedia:()=>({matches:false})}),{mode:'browser',installed:false,source:'display-mode-media'});
  assert.deepEqual(displayMode.detect({navigator:{},matchMedia:()=>({matches:true})}),{mode:'standalone',installed:true,source:'display-mode-media'});
  assert.deepEqual(displayMode.detect({navigator:{standalone:true},matchMedia:()=>({matches:false})}),{mode:'standalone',installed:true,source:'ios-navigator'});
  assert.deepEqual(displayMode.detect({navigator:{}}),{mode:'browser',installed:false,source:'unsupported'});
  assert.deepEqual(displayMode.detect({navigator:{},matchMedia(){throw new Error('unsupported')}}),{mode:'browser',installed:false,source:'unsupported'});
});

test('service-worker registration and complete-marker validation stay isolated to PWA runtime modules',()=>{
  const runtimeJavaScript=RUNTIME_SOURCE_ASSETS.filter(relative=>relative.endsWith('.js')).map(readSource).join('\n');
  assert.equal((runtimeJavaScript.match(/serviceWorker\s*\.\s*register\s*\(/g)||[]).length,1);
  const ordinaryJavaScript=RUNTIME_SOURCE_ASSETS.filter(relative=>relative.endsWith('.js')&&!['js/90-service-worker-registration.js','js/91-update-lifecycle.js'].includes(relative)).map(readSource).join('\n');
  assert.doesNotMatch(ordinaryJavaScript,/(?:window\s*\.\s*)?caches\s*\.\s*(?:open|match|keys|delete)\s*\(/);
  const source=readSource('js/00-display-mode.js');
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|RosterBotPersistence|RosterBotCloud/);
  const registration=readSource('js/90-service-worker-registration.js');
  assert.doesNotMatch(registration,/localStorage|sessionStorage|indexedDB|RosterBotPersistence|RosterBotCloud/);
});
