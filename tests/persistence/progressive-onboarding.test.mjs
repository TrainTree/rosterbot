import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html'),css=read('css/rosterbot.css'),ui=read('js/20-roster-ui.js'),navigation=read('js/70-navigation.js');

test('manual onboarding asks for a human situation before branch details',()=>{
  for(const phrase of ['I’m on a master roster','I work a regular pattern','My shifts vary'])assert.match(html,new RegExp(phrase.replace(/[’]/g,'[’\']')));
  assert.match(html,/data-v32-schedule-choice="official"/);
  assert.match(html,/data-v32-schedule-choice="pattern"/);
  assert.match(html,/data-v32-schedule-choice="adhoc"/);
  assert.match(ui,/setupModeChosen/);
  assert.match(ui,/chooseScheduleMode/);
});

test('normal roster preview no longer depends on role, pay date or annual leave',()=>{
  const validator=ui.slice(ui.indexOf('function validRosterSettings'),ui.indexOf('function buildBasicTimeline'));
  assert.doesNotMatch(validator,/roleStartDate|startRole|annualLeave/);
  assert.match(validator,/startDate/);
  assert.match(validator,/validRosterSelection/);
  assert.match(css,/html\.v28-onboarding-active :is\(\.v32-pay-later-field,.+?#annualLeaveBox\)\{display:none!important\}/s);
});

test('one accepted roster stays transactional while pay setup is a later transaction',()=>{
  const acceptance=ui.slice(ui.indexOf('async function saveCurrentAsMyRoster'),ui.indexOf('async function saveCurrentPayRole'));
  assert.match(acceptance,/commitPersonalChanges\?\.\(changes,'accept-initial-roster'\)/);
  assert.match(acceptance,/if\(!onboarding&&!employment\.length\)/);
  assert.match(acceptance,/delete acceptedSettings\.startRole/);
  const pay=ui.slice(ui.indexOf('async function saveCurrentPayRole'),ui.indexOf('function setViewRange'));
  assert.match(pay,/commitPersonalChanges\?\.\(\{'rosterbot-employment-profile-v1'/);
  assert.match(pay,/'complete-current-pay-setup'/);
});

test('unfinished setup is a device-local draft and records branch orientation',()=>{
  const draftWrite=ui.slice(ui.indexOf('function saveRosterSession'),ui.indexOf('function restoreRosterSession'));
  assert.match(draftWrite,/draftValue=\{\.\.\.value,setupModeChosen\}/);
  assert.match(draftWrite,/delete draftValue\.startRole;delete draftValue\.roleStartDate/);
  assert.match(draftWrite,/localStorage\.setItem\(SETUP_DRAFT_KEY,JSON\.stringify\(draftValue\)\)/);
  assert.match(ui,/localStorage\.removeItem\(SETUP_DRAFT_KEY\)/);
  assert.match(ui,/beginInitialOnboarding/);
  assert.doesNotMatch(navigation.slice(navigation.indexOf('function showOnboarding'),navigation.indexOf('function showDashboard')),/notifyPersonalChange|Cloud/);
});

test('pay is presented honestly until a current role is configured',()=>{
  assert.match(html,/Want accurate pay estimates\?/);
  assert.match(html,/Your roster already works without this/);
  assert.match(navigation,/profileReady\?`\$\{money\(r\.gross\)\} expected gross`:'Set up pay estimate'/);
  assert.match(navigation,/Pay role not set/);
  assert.match(html,/Choose your current role/);
});

test('new progressive UI has explicit accessibility and mobile contracts',()=>{
  assert.match(html,/aria-labelledby="v32ScheduleChoiceTitle"/);
  assert.match(html,/role="group" aria-label="How your work is scheduled"/);
  assert.match(html,/aria-pressed="false"/);
  assert.match(html,/aria-describedby="v32PaySetupDescription"/);
  assert.match(html,/id="v32PaySetupError"[^>]*role="alert"/);
  assert.match(css,/\.v32-schedule-choices button\{[^}]*min-height:92px/);
  assert.match(css,/@media\(max-width:620px\)/);
});

test('Phase 3 does not alter the accepted Phase 2 sample or introduce future ingestion claims',()=>{
  assert.match(navigation,/DEMO_ROSTER=Object\.freeze\(\{depot:'SCS',roster:'C',lines:Object\.freeze\(\[60,61\]\)/);
  const changed=`${html}\n${css}\n${ui}\n${navigation}`;
  for(const forbidden of ['Microsoft Entra','weekly roster ingestion','daily roster ingestion','automatic roster change notification'])assert.doesNotMatch(changed,new RegExp(forbidden,'i'));
});
