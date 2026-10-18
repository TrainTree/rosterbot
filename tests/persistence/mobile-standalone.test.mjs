import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const css=fs.readFileSync(path.join(root,'css/rosterbot.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const display=fs.readFileSync(path.join(root,'js/00-display-mode.js'),'utf8');
const backup=fs.readFileSync(path.join(root,'js/50-data-backup.js'),'utf8');
const calendar=fs.readFileSync(path.join(root,'js/20-roster-ui.js'),'utf8');
const registry=fs.readFileSync(path.join(root,'js/01-persistence-registry.js'),'utf8');

test('safe-area and dynamic-viewport contract covers application edges and modals',()=>{
  for(const token of ['--rb-safe-top:env(safe-area-inset-top,0px)','--rb-safe-right:env(safe-area-inset-right,0px)','--rb-safe-bottom:env(safe-area-inset-bottom,0px)','--rb-safe-left:env(safe-area-inset-left,0px)'])assert(css.includes(token),token);
  assert.match(css,/body\{[\s\S]*?min-height:100vh;[\s\S]*?min-height:100svh;[\s\S]*?min-height:100dvh;/);
  assert.match(css,/\.v27-topbar\{padding-top:var\(--rb-safe-top\)\}/);
  assert.match(css,/\.v29-primary-nav-shell\{padding-right:var\(--rb-safe-right\);padding-left:var\(--rb-safe-left\)\}/);
  assert.match(css,/\.feedback-modal\{[\s\S]*?max-height:100dvh;[\s\S]*?var\(--rb-safe-top\)[\s\S]*?var\(--rb-safe-bottom\)/);
  assert.match(css,/\.feedback-dialog\{[\s\S]*?max-height:calc\(100dvh[\s\S]*?overflow:auto;/);
  assert.match(css,/#dayEditorModal \.day-editor-dialog\{[\s\S]*?height:calc\(100dvh[\s\S]*?max-width:calc\(100vw/);
});

test('critical mobile controls and keyboard-facing fields have reachable sizing',()=>{
  assert.match(css,/--rb-touch-target:44px/);
  for(const selector of ['.feedback-close-btn','.quick-calendar-day','.history-year-btn','.leave-chip button','.week-actions-menu button'])assert(css.includes(selector),selector);
  assert.match(css,/input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea\{font-size:16px\}/);
  assert.match(css,/scroll-padding-bottom:calc\(88px \+ var\(--rb-safe-bottom\)\)/);
  assert.match(css,/scroll-margin-bottom:calc\(104px \+ var\(--rb-safe-bottom\)\)/);
});

test('native controls follow the selected light or dark app appearance',()=>{
  assert.match(css,/html\[data-color-mode="light"\] input,[\s\S]*?textarea\{color-scheme:light\}/);
  assert.match(css,/html\[data-color-mode="dark"\] input,[\s\S]*?textarea\{color-scheme:dark\}/);
});

test('standalone state stays runtime-only and does not enter personal persistence',()=>{
  assert.match(html,/<meta name="mobile-web-app-capable" content="yes">/);
  assert.match(html,/<meta name="apple-mobile-web-app-capable" content="yes">/);
  assert.match(display,/navigatorObject\.standalone===true/);
  assert.match(display,/classList\.toggle\('rb-standalone',next\.installed\)/);
  assert.match(css,/html\.rb-standalone \.v27-header-shell/);
  assert.doesNotMatch(registry,/rosterbot-display-mode|rb-standalone|display-mode-media/);
});

test('external documents cannot replace the installed RosterBot context',()=>{
  const anchors=[...html.matchAll(/<a\b([^>]*href="https?:\/\/[^>]+)>/g)];
  assert(anchors.length>0,'expected external document links');
  for(const [,attributes] of anchors){
    assert.match(attributes,/target="_blank"/,attributes);
    assert.match(attributes,/rel="[^"]*noopener[^"]*"/,attributes);
    assert.match(attributes,/rel="[^"]*noreferrer[^"]*"/,attributes);
  }
});

test('backup import/export and explicit calendar sharing keep local fallbacks',()=>{
  assert.match(html,/id="importDataFile" type="file" accept="application\/json,\.json,\.rosterbot" hidden/);
  assert.match(backup,/new Blob\(\[text\],\{type:'application\/json'\}\)/);
  assert.match(backup,/a\.download=name/);
  assert.match(backup,/if\(!file\)return/);
  assert.match(calendar,/navigator\.share/);
  assert.match(calendar,/navigator\.canShare/);
  assert.match(calendar,/falling back to download/);
  assert.match(calendar,/downloadText\(file\.filename,\s*file\.ics,\s*'text\/calendar;charset=utf-8'\)/);
});

test('Phase 6 does not introduce a viewport resize loop or service-worker architecture change',()=>{
  assert.doesNotMatch(css,/keyboard-height|--keyboard|visualViewport/);
  const runtimeScripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
  assert(runtimeScripts.includes('js/90-service-worker-registration.js'));
  assert(runtimeScripts.includes('js/91-update-lifecycle.js'));
});
