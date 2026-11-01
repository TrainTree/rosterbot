import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../../css/rosterbot.css',import.meta.url),'utf8');
const navigation=fs.readFileSync(new URL('../../js/70-navigation.js',import.meta.url),'utf8');

test('Home exposes daily answers before secondary search and detailed roster utilities',()=>{
  for(const id of ['dashTodayCard','dashTomorrowCard','dashNextOffRoster','dashPaySummary','v32ForwardRoster'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(css,/#diaryHomePanel>\.v32-home-now\{order:1\}/);
  assert.match(css,/#diaryHomePanel>\.v32-forward-roster\{order:2\}/);
  assert.match(css,/#diaryHomePanel>\.v27-search-row\{order:4/);
});

test('forward roster is four calendar weeks with a shared read-only day dialog',()=>{
  assert.match(navigation,/Array\.from\(\{length:4\}/);
  assert.match(navigation,/start=weekStart\(today\)/);
  assert.match(navigation,/names=\['Sun','Mon','Tue','Wed','Thu','Fri','Sat'\]/);
  assert.match(navigation,/<span>Current week<\/span>/);
  assert.match(navigation,/forwardWeekPosition\(week\)/);
  assert.match(css,/\.v32-forward-weeks\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(navigation,/data-v32-roster-date/);
  assert.match(html,/id="v32RosterDayModal"/);
  assert.match(html,/id="v32RosterDayEdit"[^>]*>Edit \/ record actual day</);
  assert.match(navigation,/RosterBotDialogs\.open\(modal/);
  assert.match(navigation,/window\.RosterBotDiary\?\.showDay/);
});

test('presentation actions do not write personal state or notify Cloud',()=>{
  const renderers=navigation.slice(navigation.indexOf('function renderHomeDay'),navigation.indexOf('function currentPayCheck'));
  const detail=navigation.slice(navigation.indexOf('function openRosterDay'),navigation.indexOf('function setMode'));
  assert.doesNotMatch(renderers,/localStorage\.setItem|notifyPersonalChange|notifyLocalChange|CloudSync\?\.(?:save|upload)/);
  assert.doesNotMatch(detail,/localStorage\.setItem|notifyPersonalChange|notifyLocalChange|CloudSync\?\.(?:save|upload)/);
  assert.match(navigation,/Roster projection/);
  assert.match(navigation,/Recorded actual/);
  assert.match(renderers,/Off Roster/);
  assert.doesNotMatch(renderers,/\bRest\b/);
});

test('compact roster cells contain all content and expose non-colour state',()=>{
  assert.match(css,/\.v32-forward-day\{[^}]*min-width:0[^}]*overflow:hidden/);
  assert.match(css,/\.v32-forward-days\{[^}]*repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(navigation,/kind==='off'\?'OR'/);
  assert.match(navigation,/aria-label=.*Off Roster/s);
  assert.match(navigation,/aria-current=\"date\"/);
  assert.match(css,/\.v32-forward-day\.off\{background:var\(--blue\)/);
  assert.match(css,/\.v32-forward-day\.alr\{background:var\(--alr\)/);
  assert.match(css,/\.v32-forward-day\.ph\{border-color:#d9a514/);
  assert.match(navigation,/PH · \$\{baseSecondary\}/);
});
