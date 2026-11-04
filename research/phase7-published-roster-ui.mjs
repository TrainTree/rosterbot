import {SCENARIOS,SOURCE_LABELS,dutySummary,evaluateScenario} from './phase7-published-roster-model.mjs';

const $=id=>document.getElementById(id),seen=new Set();let activeIndex=0,lastInvoker=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateObject=iso=>new Date(`${iso}T00:00:00Z`);
const addDays=(iso,count)=>{const value=dateObject(iso);value.setUTCDate(value.getUTCDate()+count);return value.toISOString().slice(0,10)};
const weekStart=iso=>addDays(iso,-dateObject(iso).getUTCDay());
const shortDate=iso=>dateObject(iso).toLocaleDateString('en-AU',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
const spokenDate=iso=>dateObject(iso).toLocaleDateString('en-AU',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const timeRange=value=>value.state==='work'?`${value.signOn||'—'} → ${value.signOff||'—'}`:'—';
const stateLabel=value=>value.state==='or'?'Off Roster':value.state==='alr'?'ALR':value.state==='leave'?'Annual leave':value.code;

function cardClasses(value){return ['v27-dash-card','v27-today-card','v32-home-day-card',value.state==='or'?'is-off':'',value.state==='alr'?'alr':'',value.state==='leave'?'leave':'',value.ph?'ph':''].filter(Boolean).join(' ')}
function markerText(result){
  if(!result.latestChange||result.latestChange.to!==result.winner)return '';
  if(result.hasActual&&result.actualDiffers)return `Recorded actual differs from published duty ${dutySummary(result.published.duty)}.`;
  if(result.latestChange.level==='detail')return '';
  return `${result.latestChange.summary}. Previously ${dutySummary(result.latestChange.from.duty)}.`;
}
function fillerDuty(index){
  if(index%7===0||index%7===6)return {state:'or',code:'OR',signOn:'',signOff:''};
  const hour=5+(index%5);return {state:'work',code:`SP${String(200+index).padStart(3,'0')}`,signOn:`${String(hour).padStart(2,'0')}:${index%2?'30':'00'}`,signOff:`${String(hour+8).padStart(2,'0')}:${index%2?'30':'00'}`};
}
function renderCalendar(result){
  const start=weekStart(result.date),names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  $('phase7Calendar').innerHTML=Array.from({length:4},(_,week)=>{const wc=addDays(start,week*7),heading=`WC ${shortDate(wc)}`,days=names.map((name,day)=>{const date=addDays(wc,day),selected=date===result.date,value=selected?result.winner.duty:fillerDuty(week*7+day),off=value.state==='or',leave=value.state==='leave'||value.state==='alr',changed=selected&&result.changed&&!seen.has(result.id),viewed=selected&&result.changed&&seen.has(result.id),actual=selected&&result.hasActual,primary=value.state==='work'?value.signOn:(value.state==='or'?'OR':stateLabel(value)),secondary=value.state==='work'?value.code:stateLabel(value),classes=['v32-forward-day','phase7-forward-day',off?'off':'',value.state==='alr'?'alr':leave?'leave':'',value.ph?'ph':'',changed?'changed':'',viewed?'change-seen':'',actual?'actual':''].filter(Boolean).join(' '),spoken=[spokenDate(date),stateLabel(value),value.signOn?`sign on ${value.signOn}`:'',changed?'Changed assignment':'',viewed?'Change viewed':'',actual?'Recorded actual':'',selected?'Open source detail':'Synthetic surrounding day'].filter(Boolean).join('. ');return `<button class="${classes}" type="button" data-research-date="${date}"${selected?' data-scenario-day="true"':''} aria-label="${esc(spoken)}"><span><b>${name}</b><time datetime="${date}">${dateObject(date).getUTCDate()}</time></span><strong>${esc(primary)}</strong><small>${esc(secondary)}</small></button>`}).join('');return `<section class="v32-forward-week${week===0?' current':''}" aria-labelledby="phase7Week${week}"><div class="v32-forward-week-head"><h3 id="phase7Week${week}">${esc(heading)}</h3><span class="v32-forward-week-meta">${week===0?'<span>Scenario week</span>':''}</span></div><div class="v32-forward-days">${days}</div></section>`}).join('');
}
function render(){
  const scenario=SCENARIOS[activeIndex],result=evaluateScenario(scenario),value=result.winner.duty,change=markerText(result),viewed=seen.has(result.id),card=$('phase7CurrentDuty');
  $('phase7Scenario').value=scenario.id;$('phase7ScenarioQuestion').textContent=scenario.question;$('phase7CurrentLabel').textContent=result.hasActual?'Recorded actual':'Duty';card.className=cardClasses(value);$('phase7DutyCode').textContent=stateLabel(value);$('phase7DutyDate').textContent=shortDate(scenario.date);$('phase7DutyTimes').textContent=value.state==='work'?timeRange(value):'—';$('phase7DutySource').textContent=SOURCE_LABELS[result.winner.source];$('phase7DutyDetails').textContent=value.details||stateLabel(value);$('phase7DutySourceLine').textContent=SOURCE_LABELS[result.winner.source];
  const note=$('phase7ChangeNote');note.hidden=!change;note.textContent=viewed?`Change viewed · ${change}`:change;note.className=`phase7-change-note ${result.latestChange?.level||''}${viewed?' seen':''}`;card.setAttribute('aria-label',[spokenDate(scenario.date),stateLabel(value),value.signOn?`sign on ${value.signOn}`:'',SOURCE_LABELS[result.winner.source],change||'',viewed?'Change viewed':'','View duty source and history'].filter(Boolean).join('. '));
  renderCalendar(result);$('phase7Status').textContent=`Scenario ${activeIndex+1} of ${SCENARIOS.length}: ${scenario.title}`;
}
function openDetail(invoker){
  const result=evaluateScenario(SCENARIOS[activeIndex]),value=result.winner.duty,latest=result.latestChange;lastInvoker=invoker;$('phase7DetailTitle').textContent=`${stateLabel(value)} · ${shortDate(result.date)}`;$('phase7DetailSource').textContent=SOURCE_LABELS[result.winner.source];$('phase7DetailCurrent').textContent=`${dutySummary(value)}${value.signOff?` → ${value.signOff}`:''}`;
  const changed=$('phase7ChangedFrom'),published=$('phase7PublishedEvidence');changed.hidden=!(latest&&latest.to===result.winner&&latest.material);if(!changed.hidden){$('phase7DetailPrevious').textContent=`${dutySummary(latest.from.duty)}${latest.from.duty.signOff?` → ${latest.from.duty.signOff}`:''}`;$('phase7ChangeReason').textContent=latest.summary}
  published.hidden=!result.actualDiffers;if(!published.hidden)$('phase7DetailPublished').textContent=`${dutySummary(result.published.duty)}${result.published.duty.signOff?` → ${result.published.duty.signOff}`:''}`;
  $('phase7DetailContent').innerHTML=value.details?`<strong>Shift details</strong><br><span>${esc(value.details)}</span>`:'';
  $('phase7History').innerHTML=result.records.map(item=>`<li><strong>${esc(SOURCE_LABELS[item.source])}</strong> · ${esc(dutySummary(item.duty))}<span>${esc(item.publishedAt.replace('T',' ').replace(/:00\+.*$/,''))}${item===result.winner?' · Winning duty':''}</span></li>`).join('');$('phase7HistoryDetails').hidden=result.records.length<2;$('phase7HistoryDetails').open=false;
  const acknowledge=$('phase7Acknowledge');acknowledge.hidden=!result.changed||seen.has(result.id);$('phase7DetailDialog').showModal();$('phase7Close').focus();
}
function closeDetail(){const dialog=$('phase7DetailDialog');if(dialog.open)dialog.close();lastInvoker?.focus?.();lastInvoker=null}
function select(index){activeIndex=(index+SCENARIOS.length)%SCENARIOS.length;render();$('phase7Scenario').focus()}

for(const scenario of SCENARIOS){const option=document.createElement('option');option.value=scenario.id;option.textContent=scenario.title;$('phase7Scenario').append(option)}
$('phase7Scenario').addEventListener('change',event=>{activeIndex=SCENARIOS.findIndex(item=>item.id===event.target.value);render()});$('phase7Previous').addEventListener('click',()=>select(activeIndex-1));$('phase7Next').addEventListener('click',()=>select(activeIndex+1));$('phase7Theme').addEventListener('change',event=>document.documentElement.dataset.theme=event.target.value);$('phase7Colour').addEventListener('change',event=>document.documentElement.dataset.colorMode=event.target.value);
$('phase7CurrentDuty').addEventListener('click',event=>openDetail(event.currentTarget));$('phase7Calendar').addEventListener('click',event=>{const button=event.target.closest('[data-scenario-day]');if(button)openDetail(button)});$('phase7Close').addEventListener('click',closeDetail);$('phase7Done').addEventListener('click',closeDetail);$('phase7DetailDialog').addEventListener('cancel',event=>{event.preventDefault();closeDetail()});$('phase7Acknowledge').addEventListener('click',()=>{const scenario=SCENARIOS[activeIndex];seen.add(scenario.id);closeDetail();render()});
render();
