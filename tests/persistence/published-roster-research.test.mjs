import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SCENARIOS,compareDuties,evaluateScenario} from '../../research/phase7-published-roster-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('research/phase7-published-roster.html'),css=read('research/phase7-published-roster.css'),ui=read('research/phase7-published-roster-ui.mjs'),staging=read('scripts/prepare-staging-pages.mjs'),production=read('scripts/prepare-production-pages.mjs'),inventory=read('scripts/runtime-assets.mjs'),index=read('index.html');
const scenario=id=>evaluateScenario(SCENARIOS.find(item=>item.id===id));

test('synthetic source hierarchy selects one winning duty without destroying evidence',()=>{
  assert.equal(scenario('projection-only').winner.source,'master');
  assert.equal(scenario('weekly-confirms').winner.source,'weekly');
  assert.equal(scenario('weekly-confirms').changed,false);
  assert.equal(scenario('weekly-changes').winner.duty.code,'SP456');
  assert.equal(scenario('weekly-changes').changed,true);
  assert.equal(scenario('daily-changes').winner.duty.code,'SP789');
  assert.equal(scenario('daily-changes').records.length,3);
});

test('recorded actual is highest authority while published evidence remains available',()=>{
  const matches=scenario('actual-matches'),differs=scenario('actual-differs');
  assert.equal(matches.winner.source,'actual');assert.equal(matches.actualDiffers,false);assert.equal(matches.changed,false);
  assert.equal(differs.winner.source,'actual');assert.equal(differs.winner.duty.code,'SP321');assert.equal(differs.published.source,'daily');assert.equal(differs.published.duty.code,'SP789');assert.equal(differs.actualDiffers,true);
});

test('meaningful-change research distinguishes prominent, critical, detail and unchanged evidence',()=>{
  assert.equal(scenario('or-to-work').latestChange.level,'critical');
  assert.equal(scenario('work-to-or').latestChange.level,'critical');
  assert.equal(scenario('sign-on-only').latestChange.level,'prominent');
  assert.equal(scenario('code-only').latestChange.level,'prominent');
  assert.equal(scenario('daily-confirms').changed,false);
  const detail=compareDuties({state:'work',code:'SP1',signOn:'08:00',signOff:'16:00',location:'SCS',details:'A',ph:false},{state:'work',code:'SP1',signOn:'08:00',signOff:'16:10',location:'SCS',details:'A',ph:false});
  assert.equal(detail.level,'detail');
});

test('fixture corpus covers the Phase 7 acceptance and alarm-fatigue cases',()=>{
  for(const id of ['projection-only','weekly-confirms','weekly-changes','daily-changes','actual-matches','actual-differs','or-to-work','work-to-or','sign-on-only','code-only','alr','leave-ph','daily-confirms','multiple-changes'])assert(SCENARIOS.some(item=>item.id===id),id);
  assert.equal(SCENARIOS.length,14);
  assert(SCENARIOS.every(item=>item.records.every(record=>!JSON.stringify(record).match(/employee|departmental|real person/i))));
});

test('research surface uses existing Home primitives and accessible progressive evidence',()=>{
  for(const className of ['v32-home-now','v32-home-day-card','v32-forward-roster','v32-forward-weeks'])assert.match(html,new RegExp(className));
  assert.match(ui,/v32-forward-day/);
  assert.match(html,/role="status" aria-live="polite"/);assert.match(html,/<dialog[^>]*aria-labelledby="phase7DetailTitle"/);assert.match(html,/<summary>Duty history<\/summary>/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/min-height:44px/);assert.match(css,/@media\(max-width:620px\)/);
});

test('research mode is beta-only and absent from production runtime/navigation/cache inventory',()=>{
  assert.match(staging,/stagingResearchAssets/);assert.match(staging,/research\/phase7-published-roster\.html/);
  for(const source of [production,inventory,index])assert.doesNotMatch(source,/phase7-published-roster/);
  for(const source of [html,ui])for(const forbidden of ['localStorage','indexedDB','notifyPersonalChange','RosterBotSchema5','CloudSync','serviceWorker.register'])assert.doesNotMatch(source,new RegExp(forbidden,'i'));
  assert.doesNotMatch(index,/href="[^\"]*phase7-published-roster/);
});

test('research UI keeps one normal duty and progressively reveals change history',()=>{
  assert.match(ui,/result\.winner\.duty/);assert.match(ui,/result\.published\.duty/);assert.match(ui,/phase7ChangedFrom/);assert.match(ui,/phase7PublishedEvidence/);assert.match(ui,/phase7History/);assert.match(ui,/seen=new Set\(\)/);
  assert.doesNotMatch(ui,/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/);
});
