import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html'),css=read('css/rosterbot.css'),navigation=read('js/70-navigation.js');

function between(source,start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)))}

test('fresh-user front door leads with outcomes and one low-commitment sample action',()=>{
  const front=between(html,'<section id="v32FrontDoor"','<section id="v32DemoPanel"');
  assert.match(front,/Know what you’re working and what you should be paid/);
  assert.doesNotMatch(front,/Know what you’re working\s*[—–-]\s*and what you should be paid/);
  assert.match(front,/Try RosterBot/);assert.match(front,/Set up my roster/);assert.match(front,/Browse rosters &amp; shifts/);
  assert(front.indexOf('Try RosterBot')<front.indexOf('Set up my roster'));
  assert.match(front,/no account or personal details needed/i);
});

test('early trust copy describes local ordinary use without implementation jargon',()=>{
  const trust=between(html,'<div class="v32-trust-promise"','</details>');
  for(const phrase of ['No account is required','Cloud Sync is optional','nothing is uploaded','keeps working offline'])assert.match(trust,new RegExp(phrase,'i'));
  for(const jargon of ['Supabase','schema','attestation','revision','token'])assert.doesNotMatch(trust,new RegExp(jargon,'i'));
});

test('sample is explicit, fictional and contains no form controls or identity',()=>{
  const demo=between(html,'<section id="v32DemoPanel"','<section id="experiencePanel"');
  assert.match(demo,/fictional sample information/i);assert.match(demo,/Nothing here is your roster/i);assert.match(demo,/TRY ROSTERBOT · EXAMPLE ROSTER/i);
  assert.doesNotMatch(demo,/<(?:input|select|textarea|form)\b/i);
  for(const value of ['TODAY','TOMORROW','NEXT TWO CALENDAR WEEKS','expected','Diary &amp; corrections','Pay checks','Calendar &amp; offline'])assert.match(demo,new RegExp(value,'i'));
  assert.match(demo,/id="v32DemoCalendar"/);assert.doesNotMatch(demo,/v32-demo-week[^-]/);
  assert.match(navigation,/Off Roster/);assert.doesNotMatch(demo,/\bRest(?: day| days)?\b/i);
});

test('sample cards use the configured Home theme tokens rather than a parallel palette',()=>{
  const card=css.match(/\.v32-demo-card\{([^}]*)\}/)?.[1]||'';
  for(const declaration of ['border:1px solid var(--border)','background:var(--surface-2)','color:var(--text)'])assert(card.includes(declaration),declaration);
  assert.match(css,/\.v32-demo-label\{color:var\(--accent\)/);
  assert.match(css,/\.v32-demo-card>small\{[^}]*color:var\(--muted\)/);
  assert.doesNotMatch(card,/--v27-card|--v27-ink|#[a-f0-9]{3,8}/i);
});

test('sample forward roster is the real C60/C61 Sunday-to-Saturday fortnight with visible dates',()=>{
  const preview=between(navigation,'function renderDemoPreview','function showFrontDoor');
  assert.match(preview,/names=\['Sun','Mon','Tue','Wed','Thu','Fri','Sat'\]/);
  assert.match(navigation,/DEMO_ROSTER=Object\.freeze\(\{depot:'SCS',roster:'C',lines:Object\.freeze\(\[60,61\]\),grade:'PB205'\}\)/);
  assert.match(navigation,/RosterOfficial\?\.resolveCell/);assert.match(preview,/C · LINE \$\{line\}/);assert.match(preview,/WC \$\{/);
  assert.match(preview,/PayBotCombined\?\.calculateDays/);assert.match(preview,/DEMO_ROSTER\.grade/);
  assert.match(preview,/\[0,1\]\.map\(week=>/);
  assert.match(preview,/<time datetime=/);
  assert.match(preview,/week\*7\+index/);
  assert.doesNotMatch(preview,/payStartFor\(/);
  assert.match(preview,/class="v32-demo-day/);assert.match(preview,/class="v32-demo-sign-on"/);assert.match(navigation,/code:'OR'/);
  assert.doesNotMatch(preview,/['"]rest['"]/i);
});

test('sample day glance uses the shared dialog controller and exposes no editing surface',()=>{
  const modal=between(html,'<div id="v32DemoDayModal"','<div id="v32PaySetupModal"');
  assert.match(modal,/role="dialog"/);assert.match(modal,/aria-modal="true"/);assert.match(modal,/FICTIONAL EXAMPLE DUTY/);assert.match(modal,/Off Roster/);
  assert.match(modal,/Sign on \/ off/);assert.match(modal,/id="v32DemoDutyTimes"/);assert.doesNotMatch(modal,/id="v32DemoDuty(?:Start|End)"/);
  assert.match(navigation,/duty\.detail/);assert.match(navigation,/Shift details<\/strong>/);assert.match(navigation,/cell\.bookContents/);assert.doesNotMatch(navigation,/fictional (?:morning|afternoon|evening|early)?\s*passenger services/i);
  assert.doesNotMatch(modal,/<(?:input|select|textarea|form)\b/i);
  for(const excluded of ['Pay editing','Diary editing','Actual worked','Cloud Sync','Employment'])assert.doesNotMatch(modal,new RegExp(excluded,'i'));
  const opener=between(navigation,'function openDemoDay','function showFrontDoor');
  assert.match(opener,/RosterBotDialogs\.open/);assert.match(opener,/initialFocus:\$\('v32DemoDayClose'\)/);assert.match(opener,/RosterBotDialogs\.close/);
  for(const forbidden of ['localStorage','indexedDB','notifyPersonalChange','syncNow','Cloud'])assert.doesNotMatch(opener,new RegExp(forbidden,'i'));
  assert.match(navigation,/\$\('v32DemoToday'\)\?\.addEventListener\('click'/);
  assert.match(navigation,/\$\('v32DemoCalendar'\)\?\.addEventListener\('click'/);
});

test('demo transitions are runtime-only and do not call persistence, Cloud or account APIs',()=>{
  const demoCode=between(navigation,'function showDemo','function restorePersonalSetupAfterLookup');
  for(const forbidden of ['localStorage','indexedDB','notifyPersonalChange','syncNow','Cloud','account','calendar'])assert.doesNotMatch(demoCode,new RegExp(forbidden,'i'));
  assert.match(navigation,/sampleIsPersonalState:false/);
});

test('browse path opens the read-only roster viewer rather than personal setup',()=>{
  assert.match(navigation,/\$\('v32BrowseRosters'\)\?\.addEventListener\('click',openViewer\)/);
  assert.match(navigation,/\$\('v29RosterLookupCard'\)\?\.addEventListener\('click',openViewer\)/);
  const front=between(html,'<section id="v32FrontDoor"','<section id="v32DemoPanel"');
  assert.doesNotMatch(front,/startRole|startRoleDate|employment profile/i);
});

test('existing accepted roster remains the startup discriminator',()=>{
  assert.match(navigation,/if\(!timeline\(\)\.length\)\{const view=history\.state/);
  assert.match(navigation,/document\.documentElement\.classList\.add\('v27-dashboard-active'\)/);
});

test('new phone UI has semantic headings, reflow and accepted touch targets',()=>{
  assert.match(html,/<h1 id="v32FrontDoorTitle"/);assert.match(html,/<h1 id="v32DemoTitle"/);
  assert.match(css,/\.v32-front-door-actions button\{min-height:48px/);assert.match(css,/\.v32-returning-user summary\{min-height:44px/);
  assert.match(css,/@media\(max-width:620px\)/);assert.match(css,/\.v32-demo-benefits\{grid-template-columns:1fr\}/);
});

test('Phase 2 introduces no analytics or telemetry endpoint',()=>{
  const changedRuntime=`${html}\n${css}\n${navigation}`;
  assert.doesNotMatch(changedRuntime,/google-analytics|googletagmanager|segment\.com|mixpanel|posthog/i);
});
