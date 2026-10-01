import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {root,fixtures,MemoryStorage,readSource} from './helpers.mjs';

const require=createRequire(import.meta.url);
const registry=require(`${root}/js/01-persistence-registry.js`);

const currentSession={startDate:'2026-01-04',startDepot:'SCS',startRoster:'A',startLine:4,roleStartDate:'2026-01-04',scheduleMode:'official',unknownFutureField:{kept:true}};
const currentCalendar={fullDuration:true,includeOr:true,includeDetails:false,rosteredFallback:true,timesInTitle:false,range:'90_12',unknownFutureField:'kept'};
const priorityKeys=['rosterbot-timeline-v1','rosterbot-employment-profile-v1','rosterbot-manual-schedule-v1','rosterbot-session-settings-v1','rosterbot-week-overrides-v1','rosterbot-day-overrides-v1','paybot-v06-state','rosterbot-calendar-subscription-settings-v1'];

test('validators distinguish missing, malformed JSON and unsupported containers',()=>{
  assert.equal(registry.validate('rosterbot-timeline-v1',null).state,'missing');
  const malformed=registry.validate('rosterbot-timeline-v1','{not-json');
  assert.equal(malformed.state,'malformed');
  assert.equal(malformed.raw,'{not-json');
  assert.equal(malformed.value,undefined);
  const wrong=registry.validate('rosterbot-timeline-v1','{}');
  assert.equal(wrong.state,'unsupported');
  assert.deepEqual(wrong.value,{});
});

test('all priority validators classify malformed JSON and wrong container types consistently',()=>{
  const arrayKeys=new Set(['rosterbot-timeline-v1','rosterbot-employment-profile-v1']);
  for(const key of priorityKeys){
    assert.equal(registry.validate(key,'{broken-json').state,'malformed',key);
    const wrong=arrayKeys.has(key)?'{}':'[]';
    assert.equal(registry.validate(key,wrong).state,'unsupported',key);
  }
});

test('all priority validators accept current v0.29 shapes',()=>{
  const current={
    'rosterbot-timeline-v1':fixtures.configured.localStorage['rosterbot-timeline-v1'],
    'rosterbot-employment-profile-v1':fixtures.configured.localStorage['rosterbot-employment-profile-v1'],
    'rosterbot-manual-schedule-v1':fixtures.manualHistoricalSnapshot.localStorage['rosterbot-manual-schedule-v1'],
    'rosterbot-session-settings-v1':currentSession,
    'rosterbot-week-overrides-v1':{'2026-09-27':{depot:'SCS',roster:'A',line:4,editedAt:'2026-09-27T00:00:00.000Z'}},
    'rosterbot-day-overrides-v1':fixtures.configured.localStorage['rosterbot-day-overrides-v1'],
    'paybot-v06-state':{logicVersion:'0.20.6',period:'2026-09-20',grade:'PB205',days:Array.from({length:14},(_,index)=>({date:`synthetic-${index}`}))},
    'rosterbot-calendar-subscription-settings-v1':currentCalendar
  };
  for(const [key,value] of Object.entries(current))assert.equal(registry.validate(key,JSON.stringify(value)).state,'valid',key);
});

test('important persisted shapes reject missing required fields without discarding parsed values',()=>{
  const cases=[
    ['rosterbot-timeline-v1',[{id:'missing-start',mode:'single',trackA:{roster:'A',line:1}}]],
    ['rosterbot-employment-profile-v1',[{id:'missing-date',classification:'PB205',pdtScheme:'none'}]],
    ['rosterbot-manual-schedule-v1',{version:1,label:'Missing days'}],
    ['rosterbot-session-settings-v1',{startDate:'2026-01-04',startRoster:'A'}],
    ['rosterbot-week-overrides-v1',{'2026-01-04':{roster:'A'}}],
    ['rosterbot-day-overrides-v1',{'2026-01-05':{notes:'missing status'}}],
    ['paybot-v06-state',{logicVersion:'0.20.6',period:'2026-01-04'}]
  ];
  for(const [key,value] of cases){
    const checked=registry.validate(key,JSON.stringify(value));
    assert.equal(checked.state,'unsupported',key);
    assert.deepEqual(checked.value,value,key);
  }
});

test('unknown fields are accepted for current v0.29 shapes',()=>{
  assert.equal(registry.validate('rosterbot-session-settings-v1',JSON.stringify(currentSession)).state,'valid');
  assert.equal(registry.validate('rosterbot-calendar-subscription-settings-v1',JSON.stringify(currentCalendar)).state,'valid');
  const timeline=fixtures.configured.localStorage['rosterbot-timeline-v1'].map(row=>({...row,unknownFutureField:true}));
  assert.equal(registry.validate('rosterbot-timeline-v1',JSON.stringify(timeline)).state,'valid');
});

test('legacy shapes and compatibility aliases are reported as recoverable legacy',()=>{
  const oldSession={startDate:'2026-05-03',startRoster:'B',startLine:2};
  assert.equal(registry.validate('rosterbot-session-settings-v1',JSON.stringify(oldSession)).state,'legacy');
  const payStorage=new MemoryStorage(fixtures.legacyPayBotAliases.localStorage);
  const pay=registry.read(payStorage,'paybot-v06-state');
  assert.equal(pay.state,'legacy');
  assert.equal(pay.sourceKey,'paybot-v04-state');
  assert.equal(pay.alias,true);
  const theme=registry.read(new MemoryStorage(fixtures.legacyThemeKeys.localStorage),'rosterbot-theme-v1.9');
  assert.equal(theme.state,'legacy');
  assert.equal(theme.sourceKey,'rosterbot-theme-v1.8');
  const malformedCanonical=new MemoryStorage({'paybot-v06-state':{$raw:'{broken'},'paybot-v04-state':fixtures.legacyPayBotAliases.localStorage['paybot-v04-state']});
  const precedence=registry.read(malformedCanonical,'paybot-v06-state');
  assert.equal(precedence.state,'malformed');
  assert.equal(precedence.sourceKey,'paybot-v06-state');
});

test('calendar subscription settings validate independently from device-local credentials',()=>{
  assert.equal(registry.validate('rosterbot-calendar-subscription-settings-v1',JSON.stringify(currentCalendar)).state,'valid');
  assert.equal(registry.validate('rosterbot-calendar-subscription-settings-v1',JSON.stringify({range:'90_12'})).state,'legacy');
  assert.equal(registry.validate('rosterbot-calendar-subscription-settings-v1',JSON.stringify({range:'forever'})).state,'unsupported');
  assert.equal(registry.get('rosterbot-calendar-subscription-settings-v1').category,'personal');
  assert.equal(registry.get('rosterbot-calendar-subscription-tokens-v2').category,'credential');
});

test('safe reads are side-effect free and preserve malformed raw text for recovery',()=>{
  class ObservedStorage extends MemoryStorage{
    writes=0;
    setItem(key,value){this.writes++;super.setItem(key,value)}
    removeItem(key){this.writes++;super.removeItem(key)}
  }
  const storage=new ObservedStorage({'rosterbot-timeline-v1':{$raw:'{original-malformed'}}),before=storage.getItem('rosterbot-timeline-v1');
  const checked=registry.read(storage,'rosterbot-timeline-v1');
  assert.equal(checked.state,'malformed');
  assert.equal(checked.raw,before);
  assert.equal(storage.getItem('rosterbot-timeline-v1'),before);
  assert.equal(storage.writes,0);
});

test('registry validation cannot write before the boot and recovery gate',()=>{
  const source=readSource('js/01-persistence-registry.js');
  assert.doesNotMatch(source,/\.setItem\(|\.removeItem\(|indexedDB\.open/);
  const index=readSource('index.html');
  assert(index.indexOf('js/01-persistence-registry.js')<index.indexOf('js/20-roster-ui.js'));
  assert(index.indexOf('js/01-persistence-registry.js')<index.indexOf('js/60-diary.js'));
});

test('all valid v0.29 fixture values retain their parsed semantics',()=>{
  for(const scenario of Object.values(fixtures))for(const [key,value] of Object.entries(scenario.localStorage)){
    const item=registry.get(key);if(!item)continue;
    const storage=new MemoryStorage({[key]:value}),checked=registry.read(storage,key,{aliases:false});
    if(checked.state==='malformed'||checked.state==='unsupported')continue;
    const raw=storage.getItem(key);
    const expected=['jsonArray','jsonObject','timeline','employment','manualSchedule','sessionSettings','weekOverrides','dayOverrides','paybot','calendarSettings'].includes(item.validator)?JSON.parse(raw):raw;
    assert.deepEqual(checked.value,expected,`${key} changed meaning while validating`);
  }
});
