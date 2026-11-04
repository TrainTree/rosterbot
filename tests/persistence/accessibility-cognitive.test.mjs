import test from 'node:test';
import assert from 'node:assert/strict';
import {readSource} from './helpers.mjs';

const html=readSource('index.html');
const css=readSource('css/rosterbot.css');
const navigation=readSource('js/70-navigation.js');
const rosterUi=readSource('js/20-roster-ui.js');
const paybot=readSource('js/42-paybot.js');
const employment=readSource('js/40-employment-profile.js');
const recovery=readSource('js/03-recovery-ui.js');

test('primary application structure exposes named main and navigation landmarks',()=>{
  assert.match(html,/<nav id="v29PrimaryNav"[^>]+aria-label="Primary navigation"/);
  assert.match(html,/<main id="rosterbotPage"/);
  assert.match(html,/<main id="paybotPage"/);
  for(const heading of ['My RosterBot dashboard','Set up my roster','PayBot 🤖💰'])assert.match(html,new RegExp(`<h1[^>]*>${heading.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
  assert.match(navigation,/aria-current','page'/);
});

test('Home search has a persistent label and restrained result announcement',()=>{
  assert.match(html,/<label class="rb-visually-hidden" for="universalSearch">Search roster by duty, sign-on time or date<\/label>/);
  assert.match(html,/id="universalSearch"[^>]+aria-describedby="universalSearchStatus"[^>]+aria-expanded="false"/);
  assert.match(html,/id="universalSearchStatus"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(rosterUi,/search result[^\n]+available/);
  assert.match(rosterUi,/dutyContext=\[j\.depot,j\.book\][^\n]+indexOf\(value\)===index/);
  assert.doesNotMatch(navigation,/aria-live="assertive"/);
});

test('manual schedule fields are named by day and purpose',()=>{
  for(const day of ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']){
    assert.match(html,new RegExp(`aria-label="${day} is a working day"`));
    assert.match(html,new RegExp(`aria-label="${day} sign on"`));
    assert.match(html,new RegExp(`aria-label="${day} sign off"`));
  }
});

test('PayBot controls and views expose labels and keyboard tab semantics',()=>{
  for(const id of ['periodDate','grade','pdtMode','entryMode','r1','l1','r2','l2','paybotEmploymentType'])assert.match(html,new RegExp(`<label for="${id}"`));
  assert.match(html,/role="tablist" aria-label="Pay views"/);
  for(const id of ['payTabEditor','payTabPayslip','payTabDaily'])assert.match(html,new RegExp(`id="${id}"[^>]+role="tab"`));
  for(const id of ['editorView','payslipView','dailyView'])assert.match(html,new RegExp(`id="${id}"[^>]+role="tabpanel"[^>]+aria-labelledby=`));
  assert.match(paybot,/\['ArrowLeft','ArrowRight','Home','End'\]/);
  assert.match(paybot,/aria-label="\$\{DAY_NAMES[^\n]+actual sign on/);
  assert.match(paybot,/aria-label="\$\{DAY_NAMES[^\n]+actual sign off/);
});

test('form failures are programmatic, field-associated, and focused',()=>{
  for(const id of ['v32SetupError','employmentFormError','payCheckError'])assert.match(html,new RegExp(`id="${id}"[^>]+role="alert"`));
  assert.match(html,/id="payCheckActual"[^>]+aria-describedby="payCheckHelp payCheckError"/);
  assert.match(rosterUi,/payCheckActual\.setAttribute\('aria-invalid','true'\)/);
  assert.match(rosterUi,/target\?\.focus\?\.\(\)/);
  assert.match(employment,/target\?\.setAttribute\('aria-invalid','true'\)/);
});

test('dynamic application state uses selective polite status regions',()=>{
  for(const id of ['appStartup','pwaUpdateNotice','universalSearchStatus','dataStatus','cloudStatus','feedbackStatus','dayLookupMsg'])assert.match(html,new RegExp(`id="${id}"[^>]+(?:role="status"[^>]+aria-live="polite"|aria-live="polite"[^>]+role="status")`));
  const liveCount=(html.match(/aria-live="polite"/g)||[]).length;
  assert(liveCount>=7&&liveCount<20,`unexpected live-region count ${liveCount}`);
});

test('focus, target sizing, reduced motion and Pay hierarchy have durable CSS contracts',()=>{
  assert.match(css,/:focus-visible\{\s*outline:3px solid var\(--accent\)/);
  assert.match(css,/min-height:var\(--rb-touch-target,44px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation-duration:\.01ms!important/);
  assert.match(css,/\.summary-grid>\.metric:first-child\{grid-column:span 2/);
  assert.match(css,/html\[data-color-mode="light"\] \.v32-field-error\{color:#9f1d14\}/);
});

test('four-week roster is chronological semantic content without an unnecessary ARIA grid',()=>{
  assert.match(navigation,/class="v32-forward-week[^`]+aria-labelledby="\$\{weekHeadingId\}"/);
  assert.match(navigation,/<h3 id="\$\{weekHeadingId\}">/);
  assert.match(navigation,/spokenDate\(iso\)/);
  assert.match(navigation,/View shift details/);
  assert.doesNotMatch(navigation,/role="grid"|role="gridcell"/);
});

test('reduced-motion preferences are honoured by routed and modal scrolling',()=>{
  assert.match(navigation,/prefers-reduced-motion: reduce/);
  assert.match(readSource('js/50-data-backup.js'),/prefers-reduced-motion: reduce/);
  assert.match(readSource('js/80-calendar-subscription.js'),/prefers-reduced-motion: reduce/);
  assert.match(employment,/prefers-reduced-motion: reduce/);
});

test('recovery remains a serious accessible task with progressively disclosed evidence',()=>{
  assert.match(recovery,/setAttribute\('role','main'\)/);
  assert.match(recovery,/role="status"/);
  assert.match(recovery,/<details class="recovery-technical"/);
  assert.match(recovery,/Export preserved (?:recovery )?data|Export both before deciding/);
  assert.match(recovery,/data-recovery-clear-confirm/);
});

test('accessibility presentation state does not enter the personal persistence registry',()=>{
  const registry=readSource('js/01-persistence-registry.js');
  assert.doesNotMatch(registry,/focus|aria|accessib|reduced-motion|font-size|zoom/i);
  assert.doesNotMatch([navigation,rosterUi,paybot].join('\n'),/notifyPersonalChange\?\.\([^)]*(?:focus|aria|accessib|zoom)/i);
});
