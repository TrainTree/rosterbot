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
  assert.match(css,/\.feedback-modal\{\s*inset:0;[\s\S]*?width:auto;[\s\S]*?height:auto;[\s\S]*?max-height:none/);
  assert.match(css,/\.feedback-modal\[data-rosterbot-visual-constrained="true"\] \.feedback-dialog\{/);
  assert.match(css,/--rb-dialog-visual-height/);assert.match(css,/--rb-dialog-visual-width/);
  assert.doesNotMatch(css,/inset:0 0 auto|--rb-visual-viewport-height/);
});

test('WebKit text autosizing and safe-area modal geometry are explicit',()=>{
  assert.match(css,/html\{-webkit-text-size-adjust:100%;text-size-adjust:100%\}/);
  assert.doesNotMatch(html,/maximum-scale|user-scalable\s*=\s*no/i);
  assert.match(css,/\.feedback-modal\{[\s\S]*?box-sizing:border-box;[\s\S]*?width:auto;/);
  assert.match(css,/\.feedback-dialog\{[\s\S]*?box-sizing:border-box;[\s\S]*?max-width:100%/);
});

test('critical mobile controls and keyboard-facing fields have reachable sizing',()=>{
  assert.match(css,/--rb-touch-target:44px/);
  for(const selector of ['.feedback-close-btn','.quick-calendar-day','.history-year-btn','.leave-chip button','.week-actions-menu button'])assert(css.includes(selector),selector);
  assert.match(css,/input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea\{font-size:16px\}/);
  assert.match(css,/scroll-padding-bottom:calc\(88px \+ var\(--rb-safe-bottom\)\)/);
  assert.match(css,/scroll-margin-bottom:calc\(104px \+ var\(--rb-safe-bottom\)\)/);
  assert.match(html,/<div class="day-editor-scroll">[\s\S]*?id="dayNotes"[\s\S]*?id="daySaveBtn"[\s\S]*?id="dayUseRosteredBtn"[\s\S]*?id="dayClearActualBtn"[\s\S]*?<\/div>\s*<\/section>/);
  assert.match(css,/#dayEditorModal \.day-editor-dialog\{[\s\S]*?display:flex;[\s\S]*?overflow:hidden!important/);
  assert.match(css,/#dayEditorModal \.day-editor-scroll\{[\s\S]*?flex:1 1 auto;[\s\S]*?min-height:0;[\s\S]*?overflow-y:auto/);
  assert.match(css,/#dayEditorModal \.day-editor-scroll>\.actions\{position:static;[\s\S]*?background:transparent/);
  assert.doesNotMatch(css,/#dayEditorModal \.day-editor-dialog>\.actions/);
});

test('seven-day time ranges remain complete and responsive inside their day column',()=>{
  assert.match(css,/\.day-column\{container-type:inline-size\}/);
  assert.match(css,/\.cell-time-range\{[\s\S]*?flex-wrap:wrap;[\s\S]*?max-width:100%;[\s\S]*?white-space:normal/);
  assert.match(css,/@container \(max-width:120px\)\{[\s\S]*?\.time-sep\{display:none\}[\s\S]*?\.time-finish::before/);
  assert.match(calendar,/class="time-start"[\s\S]*?class="time-sep"[\s\S]*?class="time-finish"/);
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

test('Phase 6 visual-viewport compatibility is isolated and leaves service-worker architecture unchanged',()=>{
  assert.doesNotMatch(css,/keyboard-height|--keyboard/);
  assert.match(display,/root\.visualViewport\?\.addEventListener\?\.\('resize',scheduleViewportRefresh/);
  assert.match(display,/root\.visualViewport\?\.addEventListener\?\.\('scroll',scheduleViewportRefresh/);
  assert.match(display,/requestAnimationFrame/);
  assert.match(display,/--rb-dialog-visual-height/);
  assert.match(display,/offsetTop[\s\S]*?offsetLeft[\s\S]*?offsetRight/);
  assert.match(display,/querySelectorAll\('\.feedback-modal:not\(\[hidden\]\)'\)/);
  assert.doesNotMatch(display,/documentElement\.style\.setProperty\('--rb-/);
  assert.doesNotMatch(display,/localStorage|sessionStorage|indexedDB|RosterBotPersistence|RosterBotCloud/);
  const runtimeScripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
  assert(runtimeScripts.includes('js/90-service-worker-registration.js'));
  assert(runtimeScripts.includes('js/91-update-lifecycle.js'));
});
