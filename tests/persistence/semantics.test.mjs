import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {root,fixtures,MemoryStorage,readSource} from './helpers.mjs';

const require=createRequire(import.meta.url);
globalThis.localStorage=new MemoryStorage();
globalThis.RosterOfficial={
  boundaryKey:()=> 'synthetic-boundary',
  lineCount:(_date,_depot,roster)=>roster==='A'||roster==='B'?20:40,
  resolveCell:(date,depot,roster,line,dayIndex)=>({type:'off',raw:['OR'],sourceDataset:'SYNTHETIC',date,depot,roster,line,dayIndex}),
  phConversions:{}
};
globalThis.ROSTERBOT_HOLIDAYS={};
const engine=require(`${root}/js/11-roster-engine.js`);
globalThis.window=globalThis;
globalThis.RosterEngine=engine;
require(`${root}/js/12-roster-effective-dates.js`);

const data={rosters:{A:{lineCount:20},B:{lineCount:20},C:{lineCount:40}},depots:{}};
const baseSettings={startDate:'2026-01-04',viewStartDate:'2026-01-04',timelineMode:'diary',annualLeaveWeeks:[]};

function timeline(name){return fixtures[name].localStorage['rosterbot-timeline-v1']}

test('fresh user can still build a normal quick roster without persisted state',()=>{
  globalThis.localStorage=new MemoryStorage(fixtures.fresh.localStorage);
  const weeks=engine.buildWeeks(data,{...baseSettings,timelineMode:'quick',startRoster:'A',startLine:1,startDepot:'SCS',hasSwap:false},2);
  assert.deepEqual(weeks.map(w=>[w.roster,w.line]),[['A',1],['A',2]]);
});

test('configured v0.29 timeline retains its roster anchor',()=>{
  const rows=timeline('configured');
  const weeks=engine.buildWeeks(data,{...baseSettings,rosterTimeline:rows},2);
  assert.deepEqual(weeks.map(w=>[w.roster,w.line]),[['A',4],['A',5]]);
});

test('multiple effective-dated roster records retain order and future entry',()=>{
  const rows=timeline('multipleEffectiveRosters');
  assert.deepEqual(rows.map(x=>x.id),['arr-early','arr-middle','arr-future']);
  assert.equal(rows.at(-1).startWC,'2027-01-03');
});

test('permanent swap parity and independent two-week advancement remain unchanged',()=>{
  const weeks=engine.buildWeeks(data,{...baseSettings,rosterTimeline:timeline('permanentSwap')},4);
  assert.deepEqual(weeks.map(w=>`${w.roster}${w.line}`),['A1','B10','A3','B12']);
});

test('historical embedded manual pattern wins over the current reusable pattern',()=>{
  const scenario=fixtures.manualHistoricalSnapshot;
  globalThis.localStorage=new MemoryStorage(scenario.localStorage);
  const week=engine.buildWeeks(data,{...baseSettings,rosterTimeline:timeline('manualHistoricalSnapshot')},1)[0];
  assert.equal(week.roster,'MANUAL');
  assert.equal(week.days[1].cell.start,'06:00');
  assert.equal(week.days[1].cell.finish,'14:00');
  assert.notEqual(week.days[1].cell.start,scenario.localStorage['rosterbot-manual-schedule-v1'].days.mon.start);
});

function employmentApi(storage){
  const context={localStorage:storage,console,__rosterbotRequireBuildComponent:()=>true,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},document:{getElementById:()=>null,addEventListener:()=>{}},dispatchEvent:()=>{}};
  context.window=context;
  vm.runInNewContext(readSource('js/40-employment-profile.js'),context,{filename:'js/40-employment-profile.js'});
  return context.RosterBotEmployment;
}

test('employment history remains ordered and effective-dated',()=>{
  const api=employmentApi(new MemoryStorage(fixtures.employmentProgression.localStorage));
  assert.deepEqual(Array.from(api.all(),x=>x.classification),['PF441','PB311','PB205']);
  assert.equal(api.at('2025-12-01').classification,'PB311');
  assert.equal(api.at('2026-08-01').classification,'PB205');
  assert.equal(api.at('2026-08-01').pdtScheme,'current');
});

test('malformed timeline and wrong employment container do not crash readers',()=>{
  const scenario=fixtures.malformedLocalValidIndexedDb;
  globalThis.localStorage=new MemoryStorage(scenario.localStorage);
  assert.doesNotThrow(()=>engine.buildWeeks(data,{...baseSettings},1));
  const api=employmentApi(new MemoryStorage(scenario.localStorage));
  assert.doesNotThrow(()=>api.all());
  assert.deepEqual(Array.from(api.all()),[]);
});

test('legacy PayBot and theme fixtures retain current compatibility inputs',()=>{
  const pay=new MemoryStorage(fixtures.legacyPayBotAliases.localStorage),order=['paybot-v06-state','paybot-v05-state','paybot-v04-state','paybot-v03-state','paybot-v02-state'];
  const selected=order.find(key=>pay.getItem(key)!=null);
  assert.equal(selected,'paybot-v04-state');
  const theme=new MemoryStorage(fixtures.legacyThemeKeys.localStorage);
  assert.equal(theme.getItem('rosterbot-theme-v1.8'),'3');
  assert.equal(theme.getItem('rosterbot-theme-v1.9'),null);
});
