(function(){
'use strict';
const PAYBOT_DATA=window.PAYBOT_DATA;
const PAYREF=window.ROSTERBOT_PAY_REFERENCE;
if(!PAYBOT_DATA||!PAYREF||!window.ROSTERBOT_HOLIDAYS||!window.ROSTERBOT_PAY_RATE_DATA){throw new Error('RosterBot PayBot reference data failed to load.')}
const ROSTER_DATASETS=PAYBOT_DATA.datasets;
const FLEX_ROSTER=PAYBOT_DATA.flex;
const SHIFT_DB=PAYBOT_DATA.shiftDb;
const HOLIDAYS=window.ROSTERBOT_HOLIDAYS;
window.PAYBOT_DATA_SHARED=PAYBOT_DATA;
const {LINE_COUNTS,GRADE_DATA,ALLOWANCES,RATE_STARTS,RATE_LABELS,TEMP_ALLOWANCE_START,SECOND_TEMP_ALLOWANCE_START,TEMP_ALLOWANCE_END,PAY_ANCHOR}=PAYREF;
const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const payRoot=document.getElementById('paybotPage');
const $=s=>payRoot.querySelector(s), $$=s=>[...payRoot.querySelectorAll(s)];
let dayState=[];
let loadedEntryMode=null;
let paybotEditorMode=(()=>{try{const s=localStorage.getItem('paybot-editor-view-v1');if(s==='full'||s==='compact')return s}catch(_){}return window.matchMedia?.('(max-width: 720px)').matches?'compact':'full'})();
let paybotAutoAdvance=(()=>{try{const s=localStorage.getItem('paybot-auto-next-v1');if(s==='0'||s==='1')return s==='1'}catch(_){}return true})();

function applyPaybotEditorModeUI(){
  const full=document.getElementById('pbFullEditorBtn'),compact=document.getElementById('pbCompactEditorBtn'),editor=$('#editorView'),auto=document.getElementById('pbAutoAdvance');
  full?.setAttribute('aria-pressed',String(paybotEditorMode==='full'));
  compact?.setAttribute('aria-pressed',String(paybotEditorMode==='compact'));
  editor?.classList.toggle('pb-compact-editor',paybotEditorMode==='compact');
  if(auto){auto.checked=paybotAutoAdvance;const wrap=auto.closest('.pb-auto-next');if(wrap)wrap.hidden=paybotEditorMode!=='compact';}
}
function setPaybotEditorMode(mode){paybotEditorMode=mode==='compact'?'compact':'full';try{localStorage.setItem('paybot-editor-view-v1',paybotEditorMode)}catch(_){}applyPaybotEditorModeUI();if(dayState.length)renderEditor()}
function setPaybotAutoAdvance(on){paybotAutoAdvance=!!on;try{localStorage.setItem('paybot-auto-next-v1',paybotAutoAdvance?'1':'0')}catch(_){}applyPaybotEditorModeUI()}
function openNextCompactDay(idx,force=false){
  if((!paybotAutoAdvance&&!force)||paybotEditorMode!=='compact')return;
  const next=$(`.pb-compact-day[data-idx="${idx+1}"]`);if(!next)return;
  $$('.pb-compact-day.open').forEach(x=>x.classList.remove('open'));
  setTimeout(()=>{
    next.scrollIntoView({behavior:'smooth',block:'center'});
    const start=next.querySelector('.pb-compact-inline-times [data-f="actualStart"]');
    const skip=next.querySelector('[data-action="skip"]');
    if(start&&!start.value&&!start.disabled)start.focus();else skip?.focus();
  },120);
}

function pad(n){return String(n).padStart(2,'0')}
function parseDate(s){const [y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
function dateKey(d){return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`}
function addDays(d,n){return new Date(d.getTime()+n*86400000)}
function fmtDate(d){return d.toLocaleDateString('en-AU',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'})}
function money(v){return new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(v)}
function rateFmt(v){return Number(v).toFixed(4)}
function round2(v){return Math.round((v+Number.EPSILON)*100)/100}
function roundTenth(v){const n=Number(v);if(!Number.isFinite(n)||n<=0)return Math.max(0,Number.isFinite(n)?n:0);return Math.max(0.1,Math.round(n*10+1e-9)/10)}
function rateIndex(start){const k=dateKey(start);let idx=0;RATE_STARTS.forEach((x,i)=>{if(k>=x)idx=i});return idx}
function tempAllowancePct(start){const k=dateKey(start);if(k>=TEMP_ALLOWANCE_END)return 0;if(k>=SECOND_TEMP_ALLOWANCE_START)return 2;if(k>=TEMP_ALLOWANCE_START)return 1;return 0}
function gradeRate(code,start){
  if(code==='PB205'){const exact=window.PayRateOfficial?.rate?.('PB205',start);if(Number.isFinite(exact))return exact;}
  const idx=rateIndex(start),pct=tempAllowancePct(start);let r=GRADE_DATA[code].rates[idx];
  if(pct)r*=1+pct/100;
  return r;
}
function allowanceRate(code,start){return ALLOWANCES[code].rates[rateIndex(start)]}
function employmentForDate(date,fallbackGrade='PB205',fallbackPdt='none'){
  const key=typeof date==='string'?date:dateKey(date),profile=window.RosterBotEmployment?.at?.(key);
  if(profile){const classification=profile.pdtScheme==='legacy'?'VL014':profile.classification;return {source:'profile',classification,pdtScheme:profile.pdtScheme||'none',event:profile,rate:gradeRate(classification,parseDate(key))};}
  let classification=fallbackGrade||'PB205',pdtScheme=fallbackPdt||'none';if(pdtScheme==='legacy')classification='VL014';return {source:'fallback',classification,pdtScheme,event:null,rate:gradeRate(classification,parseDate(key))};
}
function pdtAvailableForDay(d,fallbackPdt='none'){return employmentForDate(d.date,$('#grade')?.value||'PB205',fallbackPdt).pdtScheme==='current'}
function employmentProfileSummary(startDate,endDate){
  const a=typeof startDate==='string'?parseDate(startDate):startDate,b=typeof endDate==='string'?parseDate(endDate):endDate,seen=[];for(let d=new Date(a);d<=b;d=addDays(d,1)){const e=window.RosterBotEmployment?.at?.(dateKey(d));if(e&&!seen.some(x=>x.id===e.id))seen.push(e)}return seen;
}
function snapPeriod(any){const a=parseDate(PAY_ANCHOR),diff=Math.floor((any-a)/86400000),blocks=Math.floor(diff/14);return addDays(a,blocks*14)}
function toMin(t){if(!t)return null;const [h,m]=t.split(':').map(Number);if(!Number.isFinite(h)||!Number.isFinite(m))return null;return h*60+m}
function durationMin(s,e){let a=toMin(s),b=toMin(e);if(a==null||b==null)return 0;if(b<=a)b+=1440;return b-a}
function addClockMinutes(t,mins){const m=toMin(t);if(m==null)return '';const n=((m+mins)%1440+1440)%1440;return `${pad(Math.floor(n/60))}:${pad(n%60)}`}
function hours(m){return m/60}
function hm(min){min=Math.max(0,Math.round(min));return `${Math.floor(min/60)}h${pad(min%60)}`}
function datasetKeyForDate(k){return window.RosterOfficial?.datasetKey?.(k)||null}
function datasetLabel(k){const x=window.ROSTERBOT_OFFICIAL_DATA?.datasets?.[k];return x?`${k} · official rotation/books from ${x.from}${x.to?` to ${x.to}`:''}`:'No supplied historical roster dataset'}
function holidayFor(k){return HOLIDAYS[k]||''}
let sharedWeeksCache=null,sharedSettingsCache=null;
function getSharedRosterSettings(){
  if(window.ROSTERBOT_SHARED?.settings)return window.ROSTERBOT_SHARED.settings;
  try{return JSON.parse(localStorage.getItem('rosterbot-shared-settings-v1')||'null')}catch(_){return null}
}
function sharedRosterWeeks(){
  const s=getSharedRosterSettings();if(!s||!window.RosterEngine||!window.ROSTER_DATA)return null;
  if(window.ROSTERBOT_SHARED?.weeks?.length)return window.ROSTERBOT_SHARED.weeks;
  const sig=JSON.stringify(s);if(sharedWeeksCache&&sharedSettingsCache===sig)return sharedWeeksCache;
  try{sharedWeeksCache=window.RosterEngine.buildWeeks(window.ROSTER_DATA,s,Math.max(26,+localStorage.getItem('rosterbot-paybot-shared-cache-weeks')||26));sharedSettingsCache=sig;return sharedWeeksCache}catch(_){return null}
}
function sharedDayForDate(date,week){
  const key=dateKey(date),s=getSharedRosterSettings();if(!s||!window.RosterEngine||!window.ROSTER_DATA)return null;let weeks=sharedRosterWeeks()||[],foundWeek=null,day=null;for(const w of weeks){const hit=w.days?.find(x=>x.date===key);if(hit){foundWeek=w;day=hit;break}}if(!day){try{const one=window.RosterEngine.buildWeeks(window.ROSTER_DATA,{...s,viewStartDate:key},1);foundWeek=one?.[0]||null;day=foundWeek?.days?.find(x=>x.date===key)||null}catch(_){return null}}if(!day||!foundWeek)return null;const w=foundWeek,raw=day.cell||{},holiday=holidayFor(key),actual=day.actualOverride||null;let code='NO DATA',status='off',start='',end='',exact=false,source='RosterBot forecast';
  if(raw.type==='off'){code='OR';status='off'}else if(raw.type==='alr'){code='ALR';status='alr'}else if(raw.type==='ph'){code='PH';status='worked'}else if(raw.type==='av'){code='AV';status='worked';start=raw.start||''}else if(raw.type==='shift'){code=raw.shift||'SHIFT';status='worked';start=raw.start||'';end=raw.finish||'';exact=!!raw.finish;source=(raw.details||[]).join(' · ')||source}
  if(status==='worked'&&raw.type==='shift'&&start&&!end){end=addClockMinutes(start,480);exact=false;source+=' · 8h fallback'}let phMode=holiday?(window.RosterOfficial?.defaultPhMode?.(raw,true)|| (code==='OR'?'off':'job')):'choose';const out={date:key,week,roster:w.roster,line:w.line,depot:w.depot||'SCS',dataset:raw.sourceDataset||datasetKeyForDate(key)||'ROSTERBOT',code,rosteredStart:start,rosteredEnd:end,rosteredBookHours:raw.bookHours||'',exact,status,actualCode:/^SP\d/i.test(code)?code:'',actualStart:start,actualEnd:end,ph:!!holiday,holidayName:holiday,phMode,allowances:{},lookupMsg:`Loaded from RosterBot forecast · ${source}${raw.phConversion?` · PH conversion applied`:''}${raw.conversionWarning?` · WARNING: ${raw.conversionWarning}`:''}`};
  if(actual){const map={or:'off',worked:'worked',worked_or:'worked_or',alr:'alr',annual:'annual',personal:'personal',ph_credit:'ph_credit',unpaid:'unpaid'};out.status=map[actual.status]||out.status;out.allowances=actual.allowances&&typeof actual.allowances==='object'?JSON.parse(JSON.stringify(actual.allowances)):{};out.pdtCurrent=!!actual.pdtCurrent;if(actual.phMode&&actual.phMode!=='choose')out.phMode=actual.phMode;else if(out.ph&&['worked','worked_or'].includes(out.status))out.phMode=raw.type==='off'?'worked_off':raw.type==='av'?'av_called':window.RosterOfficial?.defaultPhMode?.(raw,true)||'job';if(out.ph&&raw.type==='av'&&['worked','worked_or'].includes(out.status)&&out.phMode==='job')out.phMode='av_called';if(['worked','worked_or'].includes(out.status)){out.actualCode=actual.actualCode||out.actualCode||(/^SP\d/i.test(code)?code:'');out.actualStart=actual.actualStart||start;out.actualEnd=actual.actualEnd||end}else{out.actualCode=actual.actualCode||'';out.actualStart=actual.actualStart||'';out.actualEnd=actual.actualEnd||''}out.lookupMsg=`Actual day loaded from RosterBot diary${actual.notes?` · Note: ${actual.notes}`:''}. Originally rostered ${code}${start?` ${start}${end?`–${end}`:''}`:''}.`}
  // A diary annual-leave week is a 40h paid-leave entitlement, not simulated work of the underlying master roster.
  // Keep the underlying code/roster for history and display, but suppress worked times, shift-linked claims and penalties.
  if(w.isAnnualLeave){out.annualLeaveWeek=w.wcDate;out.status=code==='OR'?'off':'annual';out.actualCode='';out.actualStart='';out.actualEnd='';out.allowances={};out.pdtCurrent=false;if(out.ph)out.phMode='annual';else out.phMode='choose';out.lookupMsg=`Annual leave week · underlying master roster ${code}${start?` ${start}${end?`–${end}`:''}`:''}. PayBot uses 40 ordinary paid hours for the week; public holidays inside the leave week replace 8h of annual leave with PH Gazette.`}
  return out;
}
function sharedForecastAvailable(){return !!(getSharedRosterSettings()&&sharedRosterWeeks())}

function normalizeTimeInput(raw){
  let s=String(raw||'').trim();
  if(!s)return '';
  if(/^\d{1,2}:\d{1,2}$/.test(s)){
    let [h,m]=s.split(':').map(Number);if(h>=0&&h<24&&m>=0&&m<60)return `${pad(h)}:${pad(m)}`;return null;
  }
  let d=s.replace(/\D/g,'');
  if(!d)return '';
  let h,m;
  if(d.length<=2){h=0;m=Number(d)} else if(d.length===3){h=Number(d.slice(0,1));m=Number(d.slice(1))} else if(d.length===4){h=Number(d.slice(0,2));m=Number(d.slice(2))} else return null;
  if(h<24&&m<60)return `${pad(h)}:${pad(m)}`;return null;
}
function timeEntryShortcut(v){
  const q=String(v||'').trim().toUpperCase();
  const map={PH:'ph_credit',PHD:'ph_credit',AL:'annual',SL:'personal',SICK:'personal',PL:'personal',UL:'unpaid',LWOP:'unpaid',OR:'off',OFF:'off'};
  return map[q]||'';
}
function applyTimeShortcut(idx,status){
  const d=dayState[idx];if(!d||!status)return false;
  d.status=status;d.actualStart='';d.actualEnd='';
  if(status!=='worked'&&status!=='worked_or')d.actualCode='';
  return true;
}
function lineOptions(sel,roster,chosen){sel.innerHTML='';for(let i=1;i<=LINE_COUNTS[roster];i++){const o=document.createElement('option');o.value=i;o.textContent=`${roster==='FLEX'?'FLEX':roster}${i}`;if(i==chosen)o.selected=true;sel.appendChild(o)}}
function initSelectors(){
  const rosterOpts=Object.keys(LINE_COUNTS).map(x=>`<option value="${x}">${x}</option>`).join('');
  $('#r1').innerHTML=rosterOpts;$('#r2').innerHTML=rosterOpts;$('#r1').value='A';$('#r2').value='A';lineOptions($('#l1'),'A',1);lineOptions($('#l2'),'A',2);
  $('#grade').innerHTML=Object.entries(GRADE_DATA).map(([k,v])=>`<option value="${k}" ${k==='PB205'?'selected':''}>${k}: ${v.name}</option>`).join('');
  const shared=getSharedRosterSettings();$('#periodDate').value=shared?.startDate?dateKey(snapPeriod(parseDate(shared.startDate))):'2026-08-23';if(sharedForecastAvailable())$('#entryMode').value='forecast';
}
function getCell(roster,line,day,date){
  const k=dateKey(date),c=window.RosterOfficial?.resolveCell?.(k,'SCS',roster,line,day);if(!c||c.type==='unknown')return null;
  if(c.type==='off')return {code:'OR',signon:'',signoff:'',exact:true,source:`${c.sourceDataset||''} SCS roster`};
  if(c.type==='alr')return {code:'ALR',signon:'',signoff:'',exact:true,source:`${c.sourceDataset||''} SCS roster`};
  if(c.type==='ph')return {code:'PH',signon:'',signoff:'',exact:true,source:'Public holiday conversion',phConversion:c.phConversion};
  if(c.type==='av')return {code:'AV',signon:c.start||'',signoff:'',exact:true,source:'Public holiday conversion',phConversion:c.phConversion};
  return {code:c.shift||'SHIFT',signon:c.start||'',signoff:c.finish||'',bookHours:c.bookHours||'',exact:!!c.finish&&c.finishSource!=='assumed-8h',source:(c.details||[]).join(' · '),phConversion:c.phConversion,conversionWarning:c.conversionWarning};
}
function defaultPhMode(cell,manual){if(manual)return 'choose';return window.RosterOfficial?.defaultPhMode?.(cell,true)||(!cell?'choose':cell.code==='OR'?'off':'job')}
function buildDay(date,week,roster,line,dayIndex,manual=false){
  const k=dateKey(date),holiday=holidayFor(k);
  if(manual){
    return {date:k,week,roster:'MANUAL',line:'',dataset:datasetKeyForDate(k),code:'MANUAL',rosteredStart:'',rosteredEnd:'',exact:false,status:'off',actualCode:'',actualStart:'',actualEnd:'',ph:!!holiday,holidayName:holiday,phMode:'choose',allowances:{},lookupMsg:''};
  }
  const cell=getCell(roster,line,dayIndex,date);
  if(!cell){
    return {date:k,week,roster,line,dataset:roster==='FLEX'?'FLEX':datasetKeyForDate(k),code:'NO DATA',rosteredStart:'',rosteredEnd:'',exact:false,status:'off',actualCode:'',actualStart:'',actualEnd:'',ph:!!holiday,holidayName:holiday,phMode:'choose',allowances:{},lookupMsg:'No supplied master rotation for this date'};
  }
  const isOff=cell.code==='OR',isALR=cell.code==='ALR';
  const startTime=cell.signon||'', endTime=cell.signoff||(startTime&&!isOff&&!isALR?addClockMinutes(startTime,480):'');
  return {date:k,week,roster,line,depot:'SCS',dataset:roster==='FLEX'?'FLEX':datasetKeyForDate(k),code:cell.code,rosteredStart:startTime,rosteredEnd:endTime,rosteredBookHours:cell.bookHours||'',exact:!!cell.exact&&!!cell.signoff,status:isOff?'off':isALR?'alr':'worked',actualCode:/^SP\d/i.test(cell.code)?cell.code:'',actualStart:startTime,actualEnd:endTime,ph:!!holiday,holidayName:holiday,phMode:defaultPhMode(cell,false),allowances:{},lookupMsg:cell.signoff?'':(startTime&&!isOff&&!isALR?'8h finish assumed from roster start':'')};
}
function buildFortnight(){
  const start=snapPeriod(parseDate($('#periodDate').value||PAY_ANCHOR));$('#periodDate').value=dateKey(start);
  const mode=$('#entryMode').value,manual=mode==='manual',forecast=mode==='forecast',r1=$('#r1').value,l1=+$('#l1').value,r2=$('#r2').value,l2=+$('#l2').value;loadedEntryMode=mode;dayState=[];
  const modeHint=$('#entryModeHint');if(modeHint){modeHint.classList.remove('pending');modeHint.textContent='This input method is loaded for the current fortnight.';}
  for(let i=0;i<14;i++){const week=i<7?1:2,date=addDays(start,i),roster=week===1?r1:r2,line=week===1?l1:l2;let built;if(forecast){built=sharedDayForDate(date,week);if(!built){const k=dateKey(date),holiday=holidayFor(k);built={date:k,week,roster:'SHARED',line:'',dataset:null,code:'NO DATA',rosteredStart:'',rosteredEnd:'',exact:false,status:'off',actualCode:'',actualStart:'',actualEnd:'',ph:!!holiday,holidayName:holiday,phMode:'choose',allowances:{},lookupMsg:'This date is outside the roster currently shared by RosterBot. Enter it manually or choose roster lines.'};}}else built=buildDay(date,week,roster,line,i%7,manual);dayState.push(built);}
  if(forecast&&dayState.some(d=>d.pdtCurrent)&&$('#pdtMode').value==='none'&&!window.RosterBotEmployment?.at?.(dayState[0]?.date)){$('#pdtMode').value='current';updatePdtUI();}else updatePdtUI();
  renderEditor();calculate();saveState();updateDatasetNote();
}
function statusOptions(d){
  if(d.roster==='MANUAL')return [['off','OR / not worked'],['worked','Rostered work'],['worked_or','Worked on an OR day'],['annual','Annual leave'],['personal','Personal leave'],['ph_credit','PH Days Leave (use PH credit)'],['unpaid','Unpaid leave (no pay)']];
  if(d.code==='OR')return [['off','OR (not worked)'],['worked_or','Worked this OR day'],['annual','Annual leave'],['personal','Personal leave'],['ph_credit','PH Days Leave (use PH credit)'],['unpaid','Unpaid leave (no pay)']];
  if(d.code==='ALR')return [['alr','ALR (paid)'],['worked','Worked shift instead'],['worked_or','Worked on an OR day'],['annual','Annual leave'],['personal','Personal leave'],['ph_credit','PH Days Leave (use PH credit)'],['unpaid','Unpaid leave (no pay)']];
  if(d.code==='NO DATA')return [['off','No shift / unknown'],['worked','Rostered work (manual)'],['worked_or','Worked on an OR day'],['annual','Annual leave'],['personal','Personal leave'],['ph_credit','PH Days Leave (use PH credit)'],['unpaid','Unpaid leave (no pay)']];
  return [['worked','Worked'],['off','OR / not worked instead'],['worked_or','Worked an OR day instead'],['annual','Annual leave'],['personal','Personal leave'],['ph_credit','PH Days Leave (use PH credit)'],['unpaid','Unpaid leave (no pay)']];
}
function phOptions(d){
  return [['choose','Choose public holiday status…'],['job','Rostered ON: Job / worked'],['av','Rostered ON: AV, not called'],['av_called','Rostered AV: called and worked'],['ph','Rostered ON: PH, not required'],['off','Rostered OFF: not required'],['worked_off','Rostered OFF: requested and worked'],['personal','Personal leave on PH'],['annual','Annual/paid leave on PH']];
}
function rowLabel(d){if(d.roster==='MANUAL')return 'Manual';if(d.roster==='FLEX')return `FLEX${d.line}`;return `${d.roster}${d.line}`}
function compactStatusInfo(d){
  const labels={worked:'Worked',worked_or:'OR worked',annual:'Annual leave',personal:'Personal leave',ph_credit:'PH Days Leave',unpaid:'Unpaid leave',alr:'ALR'};
  let label=labels[d.status]||'Unknown',cls='worked';
  if(d.status==='off'){label=(d.roster==='MANUAL'||d.code==='OR')?'OR not worked':'Off';cls='or';}
  else if(d.status==='worked_or'){cls='or';}
  else if(['annual','personal','ph_credit','alr'].includes(d.status)){cls='leave';}
  else if(d.status==='unpaid'){cls='unpaid';}
  return {label,cls};
}
function compactDutyLabel(d){
  if(d.actualCode)return d.actualCode;
  if(d.roster==='MANUAL'&&d.status==='off')return 'OR';
  if(d.roster==='MANUAL')return 'MANUAL';
  return ((d.code==='FLEX')?`FLEX${d.line}`:d.code)||'—';
}
function compactDurationLabel(d){const mins=durationMin(d.actualStart,d.actualEnd);return mins?hm(mins):'—'}
function refreshCompactSummary(idx,el){
  if(!el?.classList.contains('pb-compact-day'))return;
  const d=dayState[idx],si=compactStatusInfo(d);
  const duty=el.querySelector('[data-summary-duty]'),dur=el.querySelector('[data-summary-duration]'),status=el.querySelector('[data-summary-status]');
  if(duty)duty.textContent=compactDutyLabel(d);if(dur)dur.textContent=compactDurationLabel(d);
  if(status){status.textContent=si.label;status.className=`pb-status-badge ${si.cls}`;}
}
function renderCompactPaybotEditor(){
  const start=parseDate(dayState[0]?.date||$('#periodDate').value);$('#periodLabel').textContent=`${fmtDate(start)} – ${fmtDate(addDays(start,13))}`;
  let html='';
  for(let w=1;w<=2;w++){
    const subset=dayState.filter(d=>d.week===w),manual=subset[0]?.roster==='MANUAL';
    html+=`<section class="week"><div class="week-head"><h2>Week ${w}</h2><span>${manual?'Manual entry':rowLabel(subset[0])} · ${fmtDate(parseDate(subset[0].date))} – ${fmtDate(parseDate(subset[6].date))}</span></div><div class="days">`;
    subset.forEach(d=>{
      const idx=dayState.indexOf(d),date=parseDate(d.date),statusOpts=statusOptions(d).map(([v,t])=>`<option value="${v}" ${d.status===v?'selected':''}>${t}</option>`).join(''),phOpts=phOptions(d).map(([v,t])=>`<option value="${v}" ${d.phMode===v?'selected':''}>${t}</option>`).join('');
      const ena=['worked','worked_or'].includes(d.status)||(d.ph&&['job','av_called','worked_off'].includes(d.phMode)),manualBlank=d.roster==='MANUAL'&&d.status==='off',si=compactStatusInfo(d);
      const startEnabled=ena||d.status==='off',endEnabled=ena||manualBlank,quick8Enabled=ena||manualBlank;
      html+=`<article class="day pb-compact-day ${d.ph?'ph':''}" data-idx="${idx}">
        <div class="pb-compact-glance">
          <div class="date"><strong>${DAY_NAMES[date.getUTCDay()].toUpperCase()}</strong><small>${date.getUTCDate()} ${date.toLocaleDateString('en-AU',{timeZone:'UTC',month:'short'})}</small></div>
          <div class="pb-compact-duty"><strong data-summary-duty>${compactDutyLabel(d)}</strong>${rowLabel(d)!=='Manual'||d.pdtCurrent?`<small>${rowLabel(d)==='Manual'?'':rowLabel(d)}${d.pdtCurrent?`${rowLabel(d)==='Manual'?'':' · '}PDT`:''}</small>`:''}</div>
          <div class="pb-compact-inline-times" aria-label="Actual sign-on and sign-off">
            <input type="text" class="time24" inputmode="numeric" maxlength="5" data-f="actualStart" value="${d.actualStart}" placeholder="HHMM" aria-label="Sign on" title="Enter HHMM. Quick codes: PH, AL, SL, UL or OR." ${startEnabled?'':'disabled'}>
            <span class="pb-compact-arrow">→</span>
            <input type="text" class="time24" inputmode="numeric" maxlength="5" data-f="actualEnd" value="${d.actualEnd}" placeholder="HHMM" aria-label="Sign off" ${endEnabled?'':'disabled'}>
            <button class="btn tiny quick8" data-action="plus8" type="button" title="Set sign-off to 8 hours after sign-on" ${quick8Enabled?'':'disabled'}>+8h</button>
            <span class="pb-compact-hours" data-summary-duration>${compactDurationLabel(d)}</span>
          </div>
          <div class="pb-status-badge ${si.cls}" data-summary-status>${si.label}</div>
          <button class="btn tiny soft pb-compact-skip" data-action="skip" type="button" title="Leave this day as it is and move to the next day">Skip</button>
          <button class="btn iconbtn pb-compact-chevron" data-action="details" type="button" title="Shift lookup, status, allowances and other details">⌄</button>
        </div>
        <div class="details pb-compact-expand"><div class="pb-compact-edit-grid">
          <div class="actual-duty"><div class="actual-code-row"><input type="text" data-f="actualCode" value="${d.actualCode||''}" placeholder="SPxxx or 0613" autocomplete="off"><button class="btn tiny" data-action="lookup" type="button">Load shift</button></div><div class="shift-suggestions" data-shift-suggestions></div><div class="lookup-msg" data-lookup-msg>${d.lookupMsg||''}</div></div>
          <div class="status-wrap"><select data-f="status">${statusOpts}</select></div>
          <div class="day-actions">${pdtAvailableForDay(d,$('#pdtMode').value)?`<button class="btn tiny pdt-day-btn ${d.pdtCurrent?'active':''}" data-action="pdt" type="button" title="Apply the current PDT allowance to this shift" ${ena?'':'disabled'}>${d.pdtCurrent?'PDT ✓':'PDT'}</button>`:''}</div>
        </div>
        <div class="details-grid">
          ${d.ph?`<div><div class="phbox auto-ph"><strong>Public holiday: ${d.holidayName||'Gazetted Victorian public holiday'}</strong><div data-phpanel><label>Holiday conversion / status</label><select data-f="phMode">${phOpts}</select><div class="subnote">Detected automatically from the date. Confirm JOB / AV / PH / OFF treatment where relevant.</div></div></div></div>`:''}
          <div>${pdtAvailableForDay(d,$('#pdtMode').value)?`<div class="subnote" style="margin:0 0 8px"><strong>Current PDT:</strong> use the PDT button on each applicable day. PayBot adds A704 for weekday hours and A705 for weekend hours.</div>`:''}<strong style="font-size:13px">Allowances</strong><div class="allowances">${Object.entries(ALLOWANCES).filter(([code])=>!['A704','A705'].includes(code)).map(([code,a])=>{const st=d.allowances[code]||{on:false,qty:a.basis==='hourly'?Math.max(0,durationMin(d.actualStart,d.actualEnd)/60):1};return `<div class="allowance"><div class="a-head"><input type="checkbox" data-allow="${code}" ${st.on?'checked':''}><div><strong>${code}: ${a.name}</strong><small>${a.basis==='hourly'?'Hourly':'Per occasion'}</small></div></div><div class="qty"><small>${a.basis==='hourly'?'Hours':'Quantity'}</small><input type="number" min="0" step="${a.basis==='hourly'?'0.01':'1'}" data-qty="${code}" value="${Number(st.qty||0).toFixed(a.basis==='hourly'?2:0)}"></div></div>`}).join('')}</div></div>
        </div></div>
      </article>`;
    });
    html+='</div></section>';
  }
  $('#editorView').innerHTML=html;applyPaybotEditorModeUI();bindRows();
}

function renderEditor(){
  applyPaybotEditorModeUI();
  if(paybotEditorMode==='compact')return renderCompactPaybotEditor();
  const start=parseDate(dayState[0]?.date||$('#periodDate').value);$('#periodLabel').textContent=`${fmtDate(start)} – ${fmtDate(addDays(start,13))}`;
  let html='';
  for(let w=1;w<=2;w++){
    const subset=dayState.filter(d=>d.week===w),manual=subset[0]?.roster==='MANUAL';
    html+=`<section class="week"><div class="week-head"><h2>Week ${w}</h2><span>${manual?'Manual entry':rowLabel(subset[0])} · ${fmtDate(parseDate(subset[0].date))} – ${fmtDate(parseDate(subset[6].date))}</span></div><div class="days">`;
    subset.forEach(d=>{
      const idx=dayState.indexOf(d),date=parseDate(d.date),statusOpts=statusOptions(d).map(([v,t])=>`<option value="${v}" ${d.status===v?'selected':''}>${t}</option>`).join(''),phOpts=phOptions(d).map(([v,t])=>`<option value="${v}" ${d.phMode===v?'selected':''}>${t}</option>`).join('');
      const masterText=d.rosteredStart?`${d.rosteredStart} → ${d.rosteredEnd}`:d.code;
      const amended=!!(d.rosteredStart&&((d.actualStart&&d.actualStart!==d.rosteredStart)||(d.actualEnd&&d.actualEnd!==d.rosteredEnd)||(d.actualCode&&d.actualCode!==d.code)));
      const actualText=(d.actualStart||d.actualEnd)?`${d.actualStart||'—'} → ${d.actualEnd||'—'}`:'';
      const master=amended?`<span class="amended-rostered">${masterText}</span>${actualText?`<span class="actual-emphasis">Actual: ${actualText}</span>`:''}`:masterText;
      const ena=['worked','worked_or'].includes(d.status)||(d.ph&&['job','av_called','worked_off'].includes(d.phMode));
      html+=`<article class="day ${d.ph?'ph':''}" data-idx="${idx}">
        <div class="date"><strong>${DAY_NAMES[date.getUTCDay()]} ${date.getUTCDate()}/${date.getUTCMonth()+1}</strong><small>${rowLabel(d)}</small>${d.ph?`<span class="holiday-badge">${d.holidayName||'Public holiday'}</span>`:''}</div>
        <div class="shift"><div class="shift-code">${d.code==='FLEX'?`FLEX ${d.line}`:d.code}</div><div class="master-time">${master}</div>${d.rosteredStart&&!d.exact?'<span class="assumed">8h / approximate source</span>':''}</div>
        <div class="actual-duty"><div class="actual-code-row"><input type="text" data-f="actualCode" value="${d.actualCode||''}" placeholder="SPxxx or 0613" autocomplete="off"><button class="btn tiny" data-action="lookup" type="button">Load shift</button></div><div class="shift-suggestions" data-shift-suggestions></div><div class="lookup-msg" data-lookup-msg>${d.lookupMsg||''}</div></div>
        <div class="actual-wrap"><div class="times"><input type="text" class="time24" inputmode="numeric" maxlength="5" data-f="actualStart" value="${d.actualStart}" placeholder="HH:MM" title="Enter HHMM. Quick codes: PH, AL, SL, UL or OR." ${(ena||d.status==='off')?'':'disabled'}><span>→</span><input type="text" class="time24" inputmode="numeric" maxlength="5" data-f="actualEnd" value="${d.actualEnd}" placeholder="HH:MM" ${ena?'':'disabled'}><button class="btn tiny quick8" data-action="plus8" type="button" title="Set sign-off to 8 hours after sign-on" ${ena?'':'disabled'}>+8h</button></div></div>
        <div class="status-wrap"><select data-f="status">${statusOpts}</select></div>
        <div class="day-actions">${pdtAvailableForDay(d,$('#pdtMode').value)?`<button class="btn tiny pdt-day-btn ${d.pdtCurrent?'active':''}" data-action="pdt" type="button" title="Apply the current PDT allowance to this shift" ${ena?'':'disabled'}>${d.pdtCurrent?'PDT ✓':'PDT'}</button>`:''}<button class="btn iconbtn" data-action="details" title="Public holiday and allowances">＋</button></div>
        <div class="details"><div class="details-grid">
          ${d.ph?`<div><div class="phbox auto-ph"><strong>Public holiday: ${d.holidayName||'Gazetted Victorian public holiday'}</strong><div data-phpanel><label>Holiday conversion / status</label><select data-f="phMode">${phOpts}</select><div class="subnote">Detected automatically from the date. Confirm JOB / AV / PH / OFF treatment where relevant.</div></div></div></div>`:''}
          <div>${pdtAvailableForDay(d,$('#pdtMode').value)?`<div class="subnote" style="margin:0 0 8px"><strong>Current PDT:</strong> use the PDT button on each applicable day. PayBot adds A704 for weekday hours and A705 for weekend hours.</div>`:''}<strong style="font-size:13px">Allowances</strong><div class="allowances">${Object.entries(ALLOWANCES).filter(([code])=>!['A704','A705'].includes(code)).map(([code,a])=>{const st=d.allowances[code]||{on:false,qty:a.basis==='hourly'?Math.max(0,durationMin(d.actualStart,d.actualEnd)/60):1};return `<div class="allowance"><div class="a-head"><input type="checkbox" data-allow="${code}" ${st.on?'checked':''}><div><strong>${code}: ${a.name}</strong><small>${a.basis==='hourly'?'Hourly':'Per occasion'}</small></div></div><div class="qty"><small>${a.basis==='hourly'?'Hours':'Quantity'}</small><input type="number" min="0" step="${a.basis==='hourly'?'0.01':'1'}" data-qty="${code}" value="${Number(st.qty||0).toFixed(a.basis==='hourly'?2:0)}"></div></div>`}).join('')}</div></div>
        </div></div>
      </article>`;
    });
    html+='</div></section>';
  }
  $('#editorView').innerHTML=html;applyPaybotEditorModeUI();bindRows();
}
function dedupeShiftRecords(records){
  const seen=new Set();
  return records.filter(r=>{const key=`${String(r.code||'').toUpperCase()}|${r.start||''}|${r.end||''}`;if(seen.has(key))return false;seen.add(key);return true});
}
function masterRotationRecords(ds,day=null){
  const out=[],dataset=PAYBOT_DATA.datasets[ds]||{},days=day==null?[0,1,2,3,4,5,6]:[day];
  for(const [roster,lines] of Object.entries(dataset)){
    if(!lines||typeof lines!=='object')continue;
    for(const [line,cells] of Object.entries(lines)){
      if(!Array.isArray(cells))continue;
      for(const dow of days){
        const cell=cells[dow];if(!cell||!cell.code||['OR','ALR'].includes(cell.code)||!cell.signon)continue;
        const end=cell.signoff||addClockMinutes(cell.signon,480);
        out.push({code:cell.code,start:cell.signon,end,hours:cell.signoff?'':'8h fallback',days:[dow],dataset:ds,book:`${cell.source||'master rotation'} · ${roster}${line}${day==null?' · roster-day fallback':''}`});
      }
    }
  }
  return dedupeShiftRecords(out);
}
function shiftMatchesByStart(raw,date){
  const norm=normalizeTimeInput(raw);if(!norm)return[];
  const k=dateKey(date),ds=datasetKeyForDate(k);if(!ds)return[];
  const day=date.getUTCDay(),matches=[];
  (SHIFT_DB[ds]||[]).forEach(r=>{if(r.start===norm&&(!r.days.length||r.days.includes(day)))matches.push({...r})});
  masterRotationRecords(ds,day).forEach(r=>{if(r.start===norm)matches.push(r)});
  return dedupeShiftRecords(matches).sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));
}
function shiftSuggestions(query,date){const k=dateKey(date);return (window.RosterOfficial?.searchJobs?.(k,query,24)||[]).map(r=>({code:r.code,start:r.start,end:r.end||addClockMinutes(r.start,480),hours:r.hours||'',days:r.days||[],dataset:r.dataset,depot:r.depot||'',bookName:r.book||'',detail:r.detail||'',book:`${r.depot||''} · ${r.book||''}`}))}
function showShiftSuggestions(idx,el,query){
  const panel=el.querySelector('[data-shift-suggestions]');if(!panel)return[];
  const matches=shiftSuggestions(query,parseDate(dayState[idx].date));
  if(!String(query||'').trim()){panel.classList.remove('open');panel.innerHTML='';return matches}
  const isTime=/^\d{3,4}$/.test(String(query).replace(/\D/g,''))||/^\d{1,2}:\d{1,2}$/.test(String(query).trim());
  const isCode=/^sp\d/i.test(String(query).trim());
  if(!matches.length){panel.innerHTML=(isTime||isCode)?`<div class="shift-suggest-empty">${isTime?'No supplied duties start at that time on this day.':'No matching supplied duty found yet.'}</div>`:'';panel.classList.toggle('open',isTime||isCode);return matches}
  panel.innerHTML=matches.map((r,i)=>`<button type="button" class="shift-suggestion" data-suggest="${i}"><strong>${r.code}</strong><span>${r.start}–${r.end}</span><small>${r.book||r.dataset||''}${r.hours?` · ${r.hours}`:''}</small></button>`).join('');panel.classList.add('open');
  panel._matches=matches;return matches;
}
function chooseShift(idx,el,chosen){
  if(!chosen)return;const d=dayState[idx];d.actualCode=chosen.code;d.actualStart=chosen.start;d.actualEnd=chosen.end;d.lookupMsg=`Loaded ${chosen.code} · ${chosen.start}–${chosen.end} · ${chosen.book||''} ${chosen.dataset||''}`.trim();
  if(d.status==='off'||d.status==='alr')d.status=d.code==='OR'?'worked_or':'worked';
  renderEditor();calculate();saveState();if(paybotAutoAdvance&&paybotEditorMode==='compact')setTimeout(()=>openNextCompactDay(idx),30);
}
function shiftMatches(code,date){const q=String(code||'').trim();if(!q)return[];const k=dateKey(date),base=s=>{const m=String(s||'').toLowerCase().match(/^(sp\d+)([a-f])?$/);return m?m[1]:String(s||'').toLowerCase()},b=base(q);let a=window.RosterOfficial?.searchJobs?.(k,q,80)||[];if(/^sp\d/i.test(q))a=a.filter(r=>base(r.code)===b);return dedupeShiftRecords(a.map(r=>({code:r.code,start:r.start,end:r.end||addClockMinutes(r.start,480),hours:r.hours||'',days:r.days||[],dataset:r.dataset,book:`${r.depot||''} · ${r.book||''}`})))}
function applyShiftLookup(idx,el){
  const d=dayState[idx],input=el.querySelector('[data-f="actualCode"]'),raw=input.value.trim();
  const digits=raw.replace(/\D/g,''),looksTime=(/^\d{3,4}$/.test(digits)&&digits.length===raw.replace(/\s/g,'').length)||/^\d{1,2}:\d{1,2}$/.test(raw);
  if(looksTime){
    const matches=showShiftSuggestions(idx,el,raw),msg=el.querySelector('[data-lookup-msg]');
    if(matches.length===1){chooseShift(idx,el,matches[0]);return}
    d.lookupMsg=matches.length?`${matches.length} duties start at ${normalizeTimeInput(raw)}. Pick the one you worked.`:'No supplied duty starts at that time on this day. You can still enter the times manually.';if(msg)msg.textContent=d.lookupMsg;saveState();return;
  }
  const code=raw.toUpperCase();d.actualCode=code;input.value=code;
  const matches=shiftMatches(code,parseDate(d.date)),msg=el.querySelector('[data-lookup-msg]');
  if(!matches.length){d.lookupMsg='No matching duty was found in the supplied roster books or master rotation for this day. Enter the times manually.';msg.textContent=d.lookupMsg;showShiftSuggestions(idx,el,'');saveState();return}
  const timings=[...new Map(matches.map(r=>[`${r.start}|${r.end}|${r.code}`,r])).values()];
  if(timings.length>1){
    const panel=el.querySelector('[data-shift-suggestions]');panel._matches=timings;panel.innerHTML=timings.map((r,i)=>`<button type="button" class="shift-suggestion" data-suggest="${i}"><strong>${r.code}</strong><span>${r.start}–${r.end}</span><small>${r.book||r.dataset||''}</small></button>`).join('');panel.classList.add('open');d.lookupMsg=`${timings.length} matching versions found. Pick the one you worked.`;msg.textContent=d.lookupMsg;saveState();return;
  }
  chooseShift(idx,el,timings[0]);
}
function setTimeEnabled(el,enabled){const idx=+el.dataset.idx,d=dayState[idx],manualBlank=d?.roster==='MANUAL'&&d?.status==='off';const start=el.querySelector('[data-f="actualStart"]'),end=el.querySelector('[data-f="actualEnd"]');if(start)start.disabled=!(enabled||d?.status==='off');if(end)end.disabled=!(enabled||manualBlank);const q8=el.querySelector('[data-action="plus8"]');if(q8)q8.disabled=!(enabled||manualBlank);const pdt=el.querySelector('[data-action="pdt"]');if(pdt)pdt.disabled=!enabled}
function bindRows(){
  $$('.day').forEach(el=>{
    const idx=+el.dataset.idx;
    el.querySelector('[data-action="details"]')?.addEventListener('click',()=>el.classList.toggle('open'));
    el.querySelector('[data-action="skip"]')?.addEventListener('click',()=>{refreshCompactSummary(idx,el);calculate();saveState();openNextCompactDay(idx,true)});
    el.querySelector('[data-action="lookup"]')?.addEventListener('click',()=>applyShiftLookup(idx,el));
    const suggestPanel=el.querySelector('[data-shift-suggestions]');suggestPanel?.addEventListener('click',e=>{const b=e.target.closest('[data-suggest]');if(!b)return;const chosen=suggestPanel._matches?.[+b.dataset.suggest];chooseShift(idx,el,chosen)});
    el.querySelector('[data-action="plus8"]')?.addEventListener('click',()=>{const startInput=el.querySelector('[data-f="actualStart"]'),endInput=el.querySelector('[data-f="actualEnd"]');let start=normalizeTimeInput(startInput.value)||dayState[idx].actualStart;if(!start)return;dayState[idx].actualStart=start;dayState[idx].actualEnd=addClockMinutes(start,480);startInput.value=start;endInput.value=dayState[idx].actualEnd;refreshCompactSummary(idx,el);calculate();saveState();openNextCompactDay(idx)});
    el.querySelector('[data-action="pdt"]')?.addEventListener('click',()=>{dayState[idx].pdtCurrent=!dayState[idx].pdtCurrent;renderEditor();calculate();saveState()});
    const codeInput=el.querySelector('[data-f="actualCode"]');codeInput?.addEventListener('input',()=>showShiftSuggestions(idx,el,codeInput.value));codeInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyShiftLookup(idx,el)}else if(e.key==='Escape'){showShiftSuggestions(idx,el,'')}});
    el.querySelectorAll('[data-f]').forEach(inp=>{
      if(inp.classList.contains('time24')){
        inp.addEventListener('focus',()=>{if(inp.disabled)return;inp.dataset.preFocus=inp.value;inp.value=''});
        inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();inp.blur()}else if(e.key==='Escape'){inp.value=inp.dataset.preFocus??dayState[idx][inp.dataset.f]??'';inp.blur()}});
      }
      const evt=inp.classList.contains('time24')?'blur':'change';
      inp.addEventListener(evt,()=>{
        const f=inp.dataset.f;
        if(inp.classList.contains('time24')){
          const shortcut=f==='actualStart'?timeEntryShortcut(inp.value):'';
          if(shortcut){
            applyTimeShortcut(idx,shortcut);delete inp.dataset.preFocus;renderEditor();calculate();saveState();return;
          }
          if(!String(inp.value||'').trim()&&Object.prototype.hasOwnProperty.call(inp.dataset,'preFocus')){inp.value=inp.dataset.preFocus||dayState[idx][f]||'';delete inp.dataset.preFocus;return}
          const norm=normalizeTimeInput(inp.value);if(norm===null){inp.value=inp.dataset.preFocus||dayState[idx][f]||'';delete inp.dataset.preFocus;return}dayState[idx][f]=norm;inp.value=norm;delete inp.dataset.preFocus;
          if((f==='actualStart'||f==='actualEnd')&&norm&&dayState[idx].status==='off'){dayState[idx].status=dayState[idx].code==='OR'?'worked_or':'worked';const st=el.querySelector('[data-f="status"]');if(st)st.value=dayState[idx].status;setTimeEnabled(el,true)}
        }
        else dayState[idx][f]=inp.value;
        if(f==='status'){const ena=['worked','worked_or'].includes(inp.value)||(dayState[idx].ph&&['job','av_called','worked_off'].includes(dayState[idx].phMode));setTimeEnabled(el,ena)}
        if(f==='phMode'){const ena=['worked','worked_or'].includes(dayState[idx].status)||(dayState[idx].ph&&['job','av_called','worked_off'].includes(inp.value));setTimeEnabled(el,ena)}
        refreshCompactSummary(idx,el);calculate();saveState();if(f==='actualEnd'&&dayState[idx].actualEnd)openNextCompactDay(idx);
      });
    });
    el.querySelectorAll('[data-allow]').forEach(inp=>inp.addEventListener('change',()=>{const code=inp.dataset.allow;dayState[idx].allowances[code]=dayState[idx].allowances[code]||{};dayState[idx].allowances[code].on=inp.checked;const q=el.querySelector(`[data-qty="${code}"]`);dayState[idx].allowances[code].qty=+q.value||0;calculate();saveState()}));
    el.querySelectorAll('[data-qty]').forEach(inp=>inp.addEventListener('input',()=>{const code=inp.dataset.qty;dayState[idx].allowances[code]=dayState[idx].allowances[code]||{};dayState[idx].allowances[code].qty=Math.max(0,+inp.value||0);calculate();saveState()}));
  });
}
function addElement(map,key,label,qty,rate,kind='hours',rounding=true){
  if(!qty||qty<=0)return;const mapKey=`${key}|${rate}`;if(!map[mapKey])map[mapKey]={key,label,rawQty:0,rate,kind,rounding};map[mapKey].rawQty+=qty;
}
function parseBookHours(value){
  const s=String(value||'').trim();if(!s)return 0;
  let m=s.match(/^(\d+)h(\d{1,2})$/i);if(m)return (+m[1])*60+(+m[2]);
  m=s.match(/^(\d+):(\d{1,2})$/);if(m)return (+m[1])*60+(+m[2]);
  const n=Number(s);return Number.isFinite(n)&&n>0?Math.round(n*60):0;
}
function actualDutyRecord(d){
  const code=String(d.actualCode||d.code||'').trim();if(!/^SP\d/i.test(code))return null;
  const date=d.date,day=parseDate(date).getUTCDay(),depot=d.depot||'SCS',start=d.actualStart||d.rosteredStart||'';
  return window.RosterOfficial?.lookupJob?.(date,depot,code,start,day)||window.RosterOfficial?.lookupJob?.(date,'SCS',code,start,day)||null;
}
function payableDutyInfo(d){
  const physical=durationMin(d.actualStart,d.actualEnd),job=actualDutyRecord(d);
  if(!job){const book=parseBookHours(d.rosteredBookHours);return {minutes:book||physical,start:d.actualStart||d.rosteredStart||'',clockMinutes:physical,job:null,source:book?'stored roster-book Hrs':'entered times'};}
  const book=parseBookHours(job.hours)||parseBookHours(d.rosteredBookHours)||durationMin(job.start,job.end)||physical;
  const officialClock=durationMin(job.start,job.end)||book;
  let actualClock=physical;
  // Confirmed source correction: FP67 SP215 was published as 15:34–23:36 but Hrs 8h00;
  // the sign-off was a two-minute typo and the corrected duty is 15:34–23:34.
  if(datasetKeyForDate(d.date)==='FP67'&&String(job.code).toUpperCase()==='SP215'&&d.actualStart==='15:34'&&d.actualEnd==='23:36'&&job.end==='23:34'&&book===480)actualClock=officialClock;
  const extension=Math.max(0,actualClock-officialClock);
  return {minutes:book+extension,start:job.start||d.actualStart||'',clockMinutes:officialClock+extension,job,bookMinutes:book,extensionMinutes:extension,source:'roster-book Hrs'};
}
function brokenGuaranteeBaseHoursFor(days){
  const annualWeeks=new Set(days.map(d=>d.annualLeaveWeek).filter(Boolean));
  let minutes=annualWeeks.size*40*60;
  days.forEach(d=>{
    if(d.annualLeaveWeek)return;
    const status=d.status;
    if(status==='unpaid'||status==='ph_credit')return;
    // A rostered-OFF/AV/not-required PH is still an 8h paid ordinary entitlement,
    // even when another day in the fortnight is unpaid and the 80h guarantee is broken.
    if(d.ph){
      if(['av','ph','off','personal','annual'].includes(d.phMode)){minutes+=480;return}
      if(['job','av_called'].includes(d.phMode)){minutes+=Math.min(payableDutyInfo(d).minutes,480);return}
      return;
    }
    if(status==='off'||status==='worked_or')return;
    if(['annual','personal','alr'].includes(status)){minutes+=480;return}
    if(status==='worked')minutes+=Math.min(payableDutyInfo(d).minutes,480);
  });
  return hours(minutes);
}
function brokenGuaranteeBaseHours(){return brokenGuaranteeBaseHoursFor(dayState)}
const FORTNIGHT_ALLOWANCE_KEY='rosterbot-fortnight-allowances-v1';
function periodAllowanceClaims(start){try{const map=JSON.parse(localStorage.getItem(FORTNIGHT_ALLOWANCE_KEY)||'{}')||{},x=map[dateKey(start)]||{};return {A641:Math.max(0,+x.A641||0),A703:Math.max(0,+x.A703||0),A700:Math.max(0,+x.A700||0),customLabel:String(x.customLabel||''),customQty:Math.max(0,+x.customQty||0),customRate:Math.max(0,+x.customRate||0)}}catch(_){return {A641:0,A703:0,A700:0,customLabel:'',customQty:0,customRate:0}}}
function computePayCalculation(days,gradeCode='PB205',pdtMode='none'){
  if(!Array.isArray(days)||!days.length)return null;
  const start=parseDate(days[0].date),dayRoles=days.map(d=>employmentForDate(d.date,gradeCode,pdtMode)),apr=dayRoles[0]?.rate||gradeRate(gradeCode,start),primaryGrade=dayRoles[0]?.classification||gradeCode,els={},daily=days.map((d,i)=>({date:d.date,items:[],worked:0,classification:dayRoles[i]?.classification||gradeCode,pdtScheme:dayRoles[i]?.pdtScheme||pdtMode})),phDates=new Set(days.filter(d=>d.ph).map(d=>d.date)),workedPH=new Set();
  const hasUnpaid=days.some(d=>d.status==='unpaid');
  const phLeaveHours=days.filter(d=>d.status==='ph_credit').length*8;
  // Week-level annual leave is paid as 40 ordinary hours per leave week, irrespective of the master-roster shift lengths.
  // A gazetted PH inside that leave week replaces 8h of annual leave; it does not add to the 40h weekly entitlement.
  const annualWeekIds=[...new Set(days.map(d=>d.annualLeaveWeek).filter(Boolean))];
  const annualWeekEntitlementHours=annualWeekIds.length*40;
  const annualWeekPhDates=new Set(days.filter(d=>d.annualLeaveWeek&&d.ph).map(d=>d.date));
  const annualWeekPhHours=Math.min(annualWeekEntitlementHours,annualWeekPhDates.size*8);
  const annualWeekLeaveHours=Math.max(0,annualWeekEntitlementHours-annualWeekPhHours);
  const individualAnnualPhHours=days.filter(d=>!d.annualLeaveWeek&&d.ph&&d.phMode==='annual'&&d.status!=='unpaid').length*8;
  const individualAnnualLeaveHours=days.filter(d=>!d.annualLeaveWeek&&d.status==='annual'&&!(d.ph&&d.phMode==='annual')).length*8;
  const annualLeaveHours=annualWeekLeaveHours+individualAnnualLeaveHours;
  const annualPhGazetteHours=annualWeekPhHours+individualAnnualPhHours;
  const rosteredOffPhGazetteHours=days.filter(d=>!d.annualLeaveWeek&&d.ph&&d.phMode==='off'&&d.status!=='unpaid').length*8;
  const normalBase=hasUnpaid?brokenGuaranteeBaseHoursFor(days):Math.max(0,80-phLeaveHours);
  // Allocate the fortnight obligation before deciding whether work on an originally-OR day is genuinely additional.
  // This lets a moved/swapped-in shift fill a missing ordinary shift without requiring an explicit swap object.
  const fixedOrdinaryHours=annualWeekEntitlementHours+days.reduce((sum,d)=>{
    if(d.annualLeaveWeek)return sum;
    const status=d.status,manual=d.roster==='MANUAL',phMode=d.ph?d.phMode:'';
    if(status==='unpaid'||status==='ph_credit')return sum;
    let worked=['worked','worked_or'].includes(status);if(d.ph)worked=['job','av_called','worked_off'].includes(phMode);
    const dur=worked?payableDutyInfo(d).minutes:0;
    const isOR=d.ph?(phMode==='worked_off'):status==='worked_or'||(!manual&&d.code==='OR');
    let qty=0;
    if(d.ph){
      if(['av','ph','off','personal','annual'].includes(phMode))qty=8;
      else if(['job','av_called'].includes(phMode))qty=hasUnpaid?hours(Math.min(dur,480)):8;
    }else if(['annual','personal','alr'].includes(status))qty=8;
    else if(worked&&!isOR)qty=hasUnpaid?hours(Math.min(dur,480)):8;
    return sum+qty;
  },0);
  let ordinaryReplacementRemaining=hasUnpaid?0:Math.max(0,normalBase-fixedOrdinaryHours);
  let normalDisplayRemaining=normalBase;
  // Daily ordinary allocations now also build the aggregate pay elements. This is what lets a classification
  // change inside a fortnight pay the days on each side at their own applicable rate without changing Part 7 rules.
  const annualWeekDailyAllocation=new Map();
  annualWeekIds.forEach(weekId=>{
    const idxs=days.map((d,i)=>d.annualLeaveWeek===weekId?i:-1).filter(i=>i>=0);
    const phIdxs=idxs.filter(i=>days[i].ph);
    phIdxs.slice(0,5).forEach(i=>annualWeekDailyAllocation.set(i,'ph'));
    let slots=Math.max(0,5-Math.min(5,phIdxs.length));
    const preferred=idxs.filter(i=>!days[i].ph&&days[i].code!=='OR'&&days[i].code!=='NO DATA');
    const fallback=idxs.filter(i=>!days[i].ph&&!preferred.includes(i));
    for(const i of [...preferred,...fallback]){if(slots<=0)break;annualWeekDailyAllocation.set(i,'annual');slots--;}
  });
  const dailyAdd=(i,label,qty,rate,extra={})=>{if(qty>0){const rawValue=qty*rate;daily[i].items.push({label,qty,rate,rawValue,value:round2(rawValue),classification:dayRoles[i]?.classification||gradeCode,...extra})}};
  const dailyNormal=(i,qty,label='Normal / guarantee',key='normal')=>{
    qty=Math.max(0,Math.min(+qty||0,normalDisplayRemaining));if(qty<=0)return;
    const role=dayRoles[i],rate=role.rate;addElement(els,key,label,qty,rate,'hours',false);dailyAdd(i,label,qty,rate,{ordinary:true,baseDisplay:true});normalDisplayRemaining=Math.max(0,normalDisplayRemaining-qty);
  };
  const dailyRounded=(i,key,payLabel,dailyLabel,mins,rate)=>{
    if(!mins||mins<=0)return;
    const rawQty=hours(mins),qty=roundTenth(rawQty);if(qty<=0)return;
    addElement(els,key,payLabel,qty,rate,'hours',false);
    {const rawValue=qty*rate;daily[i].items.push({label:dailyLabel||payLabel,qty,rawQty,rate,rawValue,value:round2(rawValue),classification:dayRoles[i]?.classification||gradeCode,rounded:true});}
  };
  days.forEach((d,i)=>{
    const role=dayRoles[i],dayApr=role.rate,status=d.status,date=parseDate(d.date),manual=d.roster==='MANUAL',phMode=d.ph?d.phMode:'';
    if(status==='unpaid'){daily[i].items.push({label:'Unpaid leave (no pay)',qty:0,rate:0,value:0,entitlement:true,classification:role.classification});}
    if(status==='ph_credit'){
      addElement(els,'phdays','PH Days Leave',8,dayApr,'hours',false);dailyAdd(i,'PH Days Leave',8,dayApr,{ordinary:true});
      daily[i].items.push({label:'PH credit used',qty:-8,rate:0,value:0,entitlement:true,classification:role.classification});
    }
    if(d.annualLeaveWeek){
      const allocation=annualWeekDailyAllocation.get(i);
      if(allocation==='ph')dailyNormal(i,8,'PH Gazette (annual leave week)','phgazleave');
      else if(allocation==='annual')dailyNormal(i,8,'Annual Leave','annual');
      else daily[i].items.push({label:'Annual leave week — weekly 40h entitlement allocated on five days',qty:0,rate:0,value:0,entitlement:true,classification:role.classification});
      return;
    }
    if(d.ph&&status!=='unpaid'&&phMode==='av'){addElement(els,'pha','PHA - PH Available premium',8,dayApr*.5,'hours',false);dailyAdd(i,'PH Available premium',8,dayApr*.5)}
    let worked=['worked','worked_or'].includes(status);if(status==='unpaid'||status==='ph_credit')worked=false;
    if(d.ph)worked=['job','av_called','worked_off'].includes(phMode);
    const dutyInfo=worked?payableDutyInfo(d):{minutes:0,start:d.actualStart||'',clockMinutes:0,job:null};
    const dur=dutyInfo.minutes;
    const isOR=d.ph?(phMode==='worked_off'):status==='worked_or'||(!manual&&d.code==='OR');
    let orOrdinaryQty=0;
    if(worked&&isOR&&!d.ph&&!hasUnpaid&&ordinaryReplacementRemaining>0.0001){orOrdinaryQty=Math.min(8,ordinaryReplacementRemaining);ordinaryReplacementRemaining=Math.max(0,ordinaryReplacementRemaining-orOrdinaryQty);}
    let ordinaryDailyQty=0;
    if(status!=='unpaid'&&status!=='ph_credit'){
      if(d.ph){
        if(['av','ph','off','personal','annual'].includes(phMode))ordinaryDailyQty=8;
        else if(['job','av_called'].includes(phMode))ordinaryDailyQty=hasUnpaid?hours(Math.min(dur,480)):8;
      }else if(['annual','personal','alr'].includes(status))ordinaryDailyQty=8;
      else if(worked&&isOR&&orOrdinaryQty>0)ordinaryDailyQty=orOrdinaryQty;
      else if(worked&&!isOR)ordinaryDailyQty=hasUnpaid?hours(Math.min(dur,480)):8;
    }
    if(ordinaryDailyQty){
      const ordinaryLabel=(d.ph&&phMode==='annual')?'PH Gazette (annual leave)':(d.ph&&phMode==='off')?'PH Gazette - rostered OFF':orOrdinaryQty>0?'Normal / fortnight ordinary fill':status==='annual'?'Annual Leave':status==='personal'?'Normal / personal leave':status==='alr'?'Normal / ALR':'Normal';
      const ordinaryKey=(d.ph&&phMode==='annual')?'phgazleave':(d.ph&&phMode==='off')?'phgaz':status==='annual'?'annual':'normal';
      dailyNormal(i,ordinaryDailyQty,ordinaryLabel,ordinaryKey);
    }
    if(worked){
      daily[i].worked=dur;if(!dur)return;
      if(d.ph&&phMode==='worked_off'){
        dailyRounded(i,'otunr','OTUnrShft','Worked OFF / PH - base',dur,dayApr);
      } else if(isOR&&!d.ph&&orOrdinaryQty<=0){
        dailyRounded(i,'otunr','OTUnrShft','OT Unrostered shift - base',dur,dayApr);
        if(dur<480)dailyRounded(i,'ormin','OR minimum guarantee','OR minimum shortfall',480-dur,dayApr);
      } else if((!isOR||orOrdinaryQty>0)&&dur>480){
        dailyRounded(i,'over8','>8hrs RST','>8hrs base component',dur-480,dayApr);
      }
      let cats={weros:0,weunr:0,pha:0},smin=toMin(dutyInfo.start||d.actualStart)||0;
      for(let m=0;m<dur;m++){
        const abs=smin+m,md=addDays(date,Math.floor(abs/1440)),key=dateKey(md),dow=md.getUTCDay(),ph=phDates.has(key),weekend=dow===0||dow===6,ordinaryLike=!isOR||orOrdinaryQty>0,excess=ordinaryLike&&m>=480;
        if(ph)workedPH.add(key);if(excess)cats.weunr++;else if(ph)cats.pha++;else if(isOR&&orOrdinaryQty<=0)cats.weunr++;else if(weekend)cats.weros++;
      }
      dailyRounded(i,'weros','WEROSPEN - Weekend rostered penalty','Weekend rostered premium',cats.weros,dayApr*.5);
      dailyRounded(i,'weunr','WEUNRPEN - Unrostered / overtime 0.5 premium','WEUNRPEN premium',cats.weunr,dayApr*.5);
      dailyRounded(i,'pha','PHA - Public holiday premium','Public holiday premium',cats.pha,dayApr*.5);
    }
    if(role.pdtScheme==='current'&&d.pdtCurrent&&worked){
      const pdtdur=durationMin(d.actualStart,d.actualEnd),smin=toMin(d.actualStart)||0;let weekdayPdt=0,weekendPdt=0;
      for(let m=0;m<pdtdur;m++){const md=addDays(date,Math.floor((smin+m)/1440)),dow=md.getUTCDay();if(dow===0||dow===6)weekendPdt++;else weekdayPdt++}
      if(weekdayPdt){const qty=hours(weekdayPdt),rate=allowanceRate('A704',date);addElement(els,'A704','A704: PDT Allowance',qty,rate,'hours',false);dailyAdd(i,'A704: PDT Allowance',qty,rate)}
      if(weekendPdt){const qty=hours(weekendPdt),rate=allowanceRate('A705',date);addElement(els,'A705','A705: PDT Allowance (Weekend)',qty,rate,'hours',false);dailyAdd(i,'A705: PDT Allowance (Weekend)',qty,rate)}
    }
    Object.entries(d.allowances||{}).forEach(([code,st])=>{if(['A704','A705'].includes(code)||!st.on||!ALLOWANCES[code])return;const qty=Math.max(0,+st.qty||0),rate=allowanceRate(code,date);addElement(els,code,`${code}: ${ALLOWANCES[code].name}`,qty,rate,ALLOWANCES[code].basis,false);dailyAdd(i,`${code}: ${ALLOWANCES[code].name}`,qty,rate)});
  });
  // Preserve the existing guarantee behaviour for an incomplete/unknown fortnight. Once days are entered,
  // normalDisplayRemaining falls to zero and every ordinary hour has already been assigned to its date-specific role.
  if(normalDisplayRemaining>0.0001)addElement(els,'normal','Normal / guarantee balance',normalDisplayRemaining,apr,'hours',false);
  const periodClaims=periodAllowanceClaims(start);
  ['A641','A703','A700'].forEach(code=>{const qty=periodClaims[code];if(qty>0){const rate=allowanceRate(code,start);addElement(els,`period-${code}`,`${code}: ${ALLOWANCES[code].name}`,qty,rate,ALLOWANCES[code].basis,false)}});
  if(periodClaims.customQty>0&&periodClaims.customRate>0)addElement(els,'period-custom',periodClaims.customLabel||'Travel / other allowance',periodClaims.customQty,periodClaims.customRate,'units',false);
  const phMove=workedPH.size*8-days.filter(d=>d.status==='ph_credit').length*8;
  const arr=Object.values(els).map(e=>{let qty=e.rawQty;if(e.kind==='hours'&&e.rounding)qty=roundTenth(qty);const rawValue=qty*e.rate;return {...e,qty,rawValue,value:round2(rawValue)}});
  const gross=round2(arr.reduce((sum,e)=>sum+e.value,0)),extraEq=arr.filter(e=>!['normal','annual','phgazleave','phgaz','phdays'].includes(e.key)).reduce((sum,e)=>sum+(e.value/apr),0);
  return {arr,gross,extraEq,phMove,daily,apr,start,grade:primaryGrade,dayRoles,normalDisplayRemaining,hasUnpaid};
}
function calculate(){
  if(!dayState.length)return;
  const result=computePayCalculation(dayState,$('#grade').value,$('#pdtMode').value);if(!result)return;
  const {arr,gross,extraEq,phMove,daily,apr,start,grade,dayRoles,normalDisplayRemaining,hasUnpaid}=result;
  const uw=$('#unpaidWarning');if(uw){uw.hidden=!hasUnpaid;if(hasUnpaid)uw.innerHTML='<strong>Unpaid leave:</strong> the EA may remove the 80-hour guarantee when an employee is not available for all work offered. For now, PayBot uses the actual rostered base hours plus paid leave for this fortnight. We still need a real unpaid-leave payslip to confirm exactly how payroll applies this rule.';}
  renderResults(arr,gross,extraEq,phMove,daily,apr,start,normalDisplayRemaining);updateRate(apr,start,grade,dayRoles);localStorage.setItem('paybot-lastcalc',JSON.stringify({gross,phMove}));
}
function renderResults(arr,gross,extraEq,phMove,daily,apr,start,normalDisplayRemaining=0){
  $('#grossMetric').textContent=money(gross);$('#extraMetric').textContent=`${extraEq.toFixed(2)} h`;$('#phMetric').textContent=`${phMove>=0?'+':''}${phMove.toFixed(2)} h`;$('#grossTotal').textContent=money(gross);
  $('#payBody').innerHTML=arr.map(e=>`<tr><td>${e.label}</td><td>${e.qty.toFixed(e.kind==='occasion'?0:4)}</td><td>$${rateFmt(e.rate)}</td><td>${money(e.value)}</td></tr>`).join('');
  const rows=daily.map((d,i)=>{
    const ds=dayState[i],dt=parseDate(d.date);
    const paidItems=d.items.filter(x=>!x.entitlement),dayTotal=round2(paidItems.reduce((sum,x)=>sum+x.value,0));
    const items=d.items.length?d.items.map(x=>{
      if(x.entitlement)return `${x.label}: ${x.qty.toFixed(2)}h entitlement`;
      if(x.rounded)return `${x.label}: ${x.rawQty.toFixed(4)}h raw → ${x.qty.toFixed(4)}h payroll × $${rateFmt(x.rate)} = ${money(x.value)}`;
      return `${x.label}: ${x.qty.toFixed(4)}h × $${rateFmt(x.rate)} = ${money(x.value)}`;
    }).join('<br>'):'No pay items for this day';
    const worked=d.worked?` · worked ${hm(d.worked)}`:'';
    return `<div class="break-row"><div><strong>${DAY_NAMES[dt.getUTCDay()]} ${dt.getUTCDate()}/${dt.getUTCMonth()+1}</strong><br><small>${rowLabel(ds)} · ${ds.actualCode||ds.code}${worked}</small></div><div>${items}</div><strong class="day-total"><small>Day total</small>${paidItems.length?money(dayTotal):money(0)}</strong></div>`;
  });
  const pc=periodAllowanceClaims(start),pcItems=[];
  ['A641','A703','A700'].forEach(code=>{if(pc[code]>0){const rate=allowanceRate(code,start),value=round2(pc[code]*rate);pcItems.push(`${ALLOWANCES[code].name}: ${pc[code]} × $${rateFmt(rate)} = ${money(value)}`)}});
  if(pc.customQty>0&&pc.customRate>0)pcItems.push(`${pc.customLabel||'Travel / other allowance'}: ${pc.customQty} × $${rateFmt(pc.customRate)} = ${money(round2(pc.customQty*pc.customRate))}`);
  if(pcItems.length)rows.push(`<div class="break-row guarantee-balance-row"><div><strong>Fortnight allowances</strong><br><small>Not tied to a single shift</small></div><div>${pcItems.join('<br>')}</div><strong class="day-total"><small>Included above</small>—</strong></div>`);
  if(normalDisplayRemaining>0.0001){
    const value=round2(normalDisplayRemaining*apr);
    rows.push(`<div class="break-row guarantee-balance-row"><div><strong>Fortnight guarantee balance</strong><br><small>Not tied to a completed day entry</small></div><div>Normal / guarantee: ${normalDisplayRemaining.toFixed(4)}h × $${rateFmt(apr)} = ${money(value)}<br><small>Finish entering the rostered work or paid leave days and this balance will move onto those days.</small></div><strong class="day-total"><small>Balance</small>${money(value)}</strong></div>`);
  }
  $('#dailyBody').innerHTML=rows.join('');
  const unconfirmed=dayState.filter(d=>d.ph&&d.phMode==='choose').length;if(unconfirmed)$('#phMetric').textContent+=' ⚠';
}
function updateRate(apr,start,gradeOverride=null,dayRoles=null){
  const code=gradeOverride||$('#grade').value,idx=rateIndex(start),pct=tempAllowancePct(start),roles=Array.isArray(dayRoles)?dayRoles:[];
  const unique=[];for(const r of roles)if(r&&!unique.some(x=>x.classification===r.classification&&x.pdtScheme===r.pdtScheme))unique.push(r);
  $('#rateDisplay').textContent=code==='PB205'?`$${rateFmt(apr)}/hr`:`${money(apr)}/hr`;
  if(unique.length>1){$('#rateEffective').textContent='Employment profile · mixed classifications this fortnight';$('#rateNote').textContent=unique.map(r=>`${r.classification}${r.pdtScheme==='current'?' + current PDT':''}`).join(' → ')+' · PayBot applies each role and rate to its own dates.';return}
  if(code==='PB205'){const e=window.PayRateOfficial?.eventFor?.('PB205',start),pe=window.PayRateOfficial?.payrollEventFor?.('PB205',start),diff=pe&&e&&Math.abs((+pe.rate||0)-(+e.rate||0))>0.00001;$('#rateEffective').textContent=`${code} · entitlement APR${e?` from ${e.effectivePayPeriodStart}`:''}`;$('#rateNote').textContent=e?(e.beforeEarliest?`Using the earliest verified PB205 entitlement anchor (${rateFmt(e.rate)}); this pay period predates the currently verified history.`:`PB205 entitlement APR ${rateFmt(e.rate)} · ${e.source||'verified entitlement evidence'}${e.publishedReference?` · ${e.publishedReference}`:''}.${diff?` ADP applied ${rateFmt(pe.rate)} in this period; later backpay evidence is retained separately for reconciliation.`:''}`):'PB205 entitlement rate unavailable.';return}
  $('#rateEffective').textContent=`${code} · ${RATE_LABELS[idx]} schedule`;let tempNote='';if(pct===1)tempNote='Includes the provisional 1.0% temporary allowance. ';if(pct===2)tempNote='Includes the provisional cumulative 2.0% temporary allowance. ';$('#rateNote').textContent=`${tempNote}This classification uses the published Table 6 rate with the applicable provisional uplift.`;
}
function updateDatasetNote(){
  const mode=loadedEntryMode||$('#entryMode').value,manual=mode==='manual',forecast=mode==='forecast',keys=new Set(dayState.map(d=>d.dataset).filter(Boolean));let txt;
  if(forecast)txt=sharedForecastAvailable()?'Using the roster you loaded in RosterBot. Change the pay fortnight and PayBot will load the matching days automatically.':'No roster has been loaded in RosterBot yet. Return to RosterBot and display your roster, or choose another input method.';
  else if(manual)txt='Enter shifts manually. Shift lookup will still use the roster book that applies to the selected date when available.';
  else txt=keys.size?[...keys].map(datasetLabel).join(' + '):'No supplied A-D master rotation covers this fortnight. Use manual entry if you are reconstructing older pay.';
  $('#datasetNote').textContent=txt;$('#sourcePill').textContent=forecast?'Roster loaded from RosterBot':manual?'Manual entry with date-based roster books':keys.size?`Roster data: ${[...keys].join(' + ')}`:'Roster data unavailable';
}
function toggleEntryMode(){const showRoster=$('#entryMode').value==='roster';$$('.roster-field').forEach(x=>x.classList.toggle('hidden',!showRoster));}
let baseGradeBeforePdt='PB205';
let pdtForcedLegacy=false;
function updatePdtUI(){
  const mode=$('#pdtMode').value,grade=$('#grade'),hint=$('#pdtHint'),profileHint=$('#employmentProfileHint'),period=$('#periodDate')?.value||PAY_ANCHOR,start=snapPeriod(parseDate(period)),end=addDays(start,13),events=employmentProfileSummary(start,end),profileAtStart=window.RosterBotEmployment?.at?.(dateKey(start));
  if(mode==='legacy'){
    if(!pdtForcedLegacy){if(grade.value&&grade.value!=='VL014')baseGradeBeforePdt=grade.value;pdtForcedLegacy=true}
    grade.value='VL014';grade.disabled=true;hint.textContent='Legacy PDT uses the VL014 Practical Driver Trainer grade rate.';
  }else{
    if(pdtForcedLegacy&&grade.value==='VL014')grade.value=baseGradeBeforePdt||'PB205';pdtForcedLegacy=false;grade.disabled=false;
    if(mode==='current')hint.textContent='Current PDT keeps your normal grade. Mark the applicable days below and PayBot will add A704/A705 automatically.';else hint.textContent='Used only when no dated Employment & Pay Profile entry applies.';
  }
  if(profileHint){if(events.length){profileHint.innerHTML=`<strong>Employment profile active.</strong> ${events.map(e=>`${e.classification}${e.pdtScheme==='current'?' + current PDT':''}`).join(' → ')}. PayBot resolves the applicable role separately by date.`}else profileHint.textContent='No dated profile applies to this fortnight; the Grade/PDT selectors below are used as the fallback.'}
  if(profileAtStart&&profileAtStart.pdtScheme==='legacy'){grade.disabled=false;}
}
function saveState(){if(!dayState.length)return;const obj={logicVersion:'0.20.6',period:$('#periodDate').value,grade:$('#grade').value,baseGrade:baseGradeBeforePdt,entryMode:loadedEntryMode||$('#entryMode').value,r1:$('#r1').value,l1:$('#l1').value,r2:$('#r2').value,l2:$('#l2').value,pdt:$('#pdtMode').value,days:dayState};localStorage.setItem('paybot-v06-state',JSON.stringify(obj))}
function restore(){
  try{
    let raw=localStorage.getItem('paybot-v06-state')||localStorage.getItem('paybot-v05-state')||localStorage.getItem('paybot-v04-state')||localStorage.getItem('paybot-v03-state')||localStorage.getItem('paybot-v02-state');
    let saved=JSON.parse(raw);if(!saved)return false;
    $('#periodDate').value=saved.period;$('#grade').value=saved.grade||'PB205';baseGradeBeforePdt=saved.baseGrade||(saved.pdt==='legacy'?'PB205':(saved.grade||'PB205'));
    loadedEntryMode=saved.entryMode||(sharedForecastAvailable()?'forecast':'roster');$('#entryMode').value=loadedEntryMode;
    $('#r1').value=saved.r1||'A';lineOptions($('#l1'),$('#r1').value,+saved.l1||1);$('#r2').value=saved.r2||'A';lineOptions($('#l2'),$('#r2').value,+saved.l2||2);
    $('#pdtMode').value=saved.pdt||'none';pdtForcedLegacy=false;updatePdtUI();toggleEntryMode();
    // Week-level leave is owned by the RosterBot diary. Rebuild forecast-mode leave fortnights from the diary
    // instead of trusting a PayBot snapshot saved by an older calculation engine.
    if(loadedEntryMode==='forecast'&&sharedForecastAvailable()){
      const ps=snapPeriod(parseDate(saved.period||PAY_ANCHOR)),pe=addDays(ps,13),pk=dateKey(ps),ek=dateKey(pe);
      const leaveOverlap=(sharedRosterWeeks()||[]).some(w=>w.isAnnualLeave&&w.wcDate>=pk&&w.wcDate<=ek);
      if(leaveOverlap){buildFortnight();return true;}
    }
    if(Array.isArray(saved.days)&&saved.days.length===14){
      dayState=saved.days;
      dayState.forEach(d=>{
        d.holidayName=holidayFor(d.date);d.ph=!!d.holidayName;if(!d.ph)d.phMode='choose';else d.phMode=d.phMode||'choose';
        d.actualCode=d.actualCode||'';d.lookupMsg=d.lookupMsg||'';
        if(d.pdtCurrent===undefined)d.pdtCurrent=!!(d.allowances?.A704?.on||d.allowances?.A705?.on);
        if(d.allowances){delete d.allowances.A704;delete d.allowances.A705;}
        if(d.dataset==='ROSTERBOT'&&d.status==='worked'&&d.actualStart&&!d.actualEnd){
          const dt=parseDate(d.date),cell=getCell(d.roster,d.line,dt.getUTCDay(),dt);d.rosteredEnd=cell?.signoff||addClockMinutes(d.actualStart,480);d.actualEnd=d.rosteredEnd;d.exact=!!cell?.exact&&!!cell?.signoff;d.lookupMsg='Repaired shared forecast finish · '+(cell?.source||'8h fallback');
        }
      });
      const hint=$('#entryModeHint');if(hint){hint.classList.remove('pending');hint.textContent='This input method is loaded for the current fortnight.';}
      renderEditor();calculate();updateDatasetNote();return true;
    }
  }catch(e){console.warn(e)}
  return false
}
function setTab(name){$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$('#editorView').classList.toggle('hidden',name!=='editor');$('#payslipView').classList.toggle('hidden',name!=='payslip');$('#dailyView').classList.toggle('hidden',name!=='daily');const bar=document.getElementById('editorLayoutBar');if(bar)bar.hidden=name!=='editor'}

initSelectors();
$('#r1').addEventListener('change',()=>lineOptions($('#l1'),$('#r1').value,1));$('#r2').addEventListener('change',()=>lineOptions($('#l2'),$('#r2').value,1));
$('#entryMode').addEventListener('change',()=>{
  toggleEntryMode();
  const hint=$('#entryModeHint'),chosen=$('#entryMode').selectedOptions?.[0]?.textContent||'selected input method';
  if(hint){hint.classList.add('pending');hint.textContent=`Current entries are unchanged. Press Load fortnight to switch to ${chosen}.`;}
});
$('#loadBtn').addEventListener('click',buildFortnight);$('#grade').addEventListener('change',()=>{if($('#pdtMode').value!=='legacy')baseGradeBeforePdt=$('#grade').value;calculate();saveState()});$('#pdtMode').addEventListener('change',()=>{updatePdtUI();renderEditor();calculate();saveState()});
$('#prevPeriod').addEventListener('click',()=>{$('#periodDate').value=dateKey(addDays(snapPeriod(parseDate($('#periodDate').value)),-14));buildFortnight()});$('#nextPeriod').addEventListener('click',()=>{$('#periodDate').value=dateKey(addDays(snapPeriod(parseDate($('#periodDate').value)),14));buildFortnight()});
$('#thisPeriod').addEventListener('click',()=>{const now=new Date(),today=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));$('#periodDate').value=dateKey(snapPeriod(today));buildFortnight()});
$('#periodDate').addEventListener('change',()=>{$('#periodDate').value=dateKey(snapPeriod(parseDate($('#periodDate').value)));buildFortnight()});
$('#resetBtn').addEventListener('click',()=>{if(confirm('Reset the current PayBot fortnight and remove saved edits?')){localStorage.removeItem('paybot-v06-state');localStorage.removeItem('paybot-v05-state');localStorage.removeItem('paybot-v04-state');localStorage.removeItem('paybot-v03-state');localStorage.removeItem('paybot-v02-state');location.reload()}});
$$('.tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
document.getElementById('pbFullEditorBtn')?.addEventListener('click',()=>setPaybotEditorMode('full'));
document.getElementById('pbCompactEditorBtn')?.addEventListener('click',()=>setPaybotEditorMode('compact'));
document.getElementById('pbAutoAdvance')?.addEventListener('change',e=>setPaybotAutoAdvance(e.target.checked));
applyPaybotEditorModeUI();
window.addEventListener('rosterbot:forecast',()=>{sharedWeeksCache=null;sharedSettingsCache=null;if(loadedEntryMode==='forecast'&&$('#entryMode').value==='forecast')buildFortnight();});
window.addEventListener('rosterbot:employment-change',()=>{updatePdtUI();if(dayState.length){renderEditor();calculate();}});
function previewFortnight(anyDate){
  const start=snapPeriod(parseDate(anyDate||PAY_ANCHOR)),days=[];
  for(let i=0;i<14;i++){
    const d=sharedDayForDate(addDays(start,i),i<7?1:2);
    if(!d)return {available:false,start:dateKey(start),reason:'Roster diary is not configured for this date.'};
    days.push(d);
  }
  let saved={};try{saved=JSON.parse(localStorage.getItem('paybot-v06-state')||'{}')||{}}catch(_){}
  const gradeCode=saved.grade||$('#grade')?.value||'PB205';let pdtMode=saved.pdt||$('#pdtMode')?.value||'none';if(pdtMode==='none'&&days.some(d=>d.pdtCurrent))pdtMode='current';
  const result=computePayCalculation(days,gradeCode,pdtMode);
  const resolvedGrade=result?.grade||gradeCode;
  const unresolved=days.filter(d=>d.code==='NO DATA'&&!String(d.lookupMsg||'').startsWith('Actual day loaded')).length;
  const unconfirmedPH=days.filter(d=>d.ph&&d.phMode==='choose').length;
  return result?{...result,available:true,start:dateKey(start),end:dateKey(addDays(start,13)),grade:resolvedGrade,pdtMode,unresolved,unconfirmedPH}:{available:false,start:dateKey(start),reason:'Pay calculation unavailable.'};
}
function openFortnight(anyDate){
  sharedWeeksCache=null;sharedSettingsCache=null;$('#entryMode').value='forecast';toggleEntryMode();$('#periodDate').value=dateKey(snapPeriod(parseDate(anyDate||PAY_ANCHOR)));buildFortnight();setTab('payslip');
}
window.PayBotCombined={
  syncFromRosterBot(){sharedWeeksCache=null;sharedSettingsCache=null;$('#entryMode').value='forecast';toggleEntryMode();const s=getSharedRosterSettings(),from=window.ROSTERBOT_SHARED?.viewFrom||s?.viewStartDate||s?.startDate;if(from)$('#periodDate').value=dateKey(snapPeriod(parseDate(from)));buildFortnight();},
  previewFortnight,openFortnight,
  lookupShifts(date,query){try{return shiftSuggestions(query,parseDate(date)).map(r=>({...r}))}catch(_){return[]}},
  rateForPeriod(date,grade='PB205'){try{const start=snapPeriod(parseDate(date));return {start:dateKey(start),rate:gradeRate(grade,start),payrollRate:grade==='PB205'?window.PayRateOfficial?.payrollRate?.('PB205',start):null,event:grade==='PB205'?window.PayRateOfficial?.eventFor?.('PB205',start):null,payrollEvent:grade==='PB205'?window.PayRateOfficial?.payrollEventFor?.('PB205',start):null}}catch(_){return null}},
  roundPayrollHours(hours){return roundTenth(hours)},
  calculateDays(days,grade='PB205',pdtMode='none'){try{return computePayCalculation(days,grade,pdtMode)}catch(_){return null}}
};
try{window.dispatchEvent(new CustomEvent('paybot:ready'))}catch(_){}
toggleEntryMode();updatePdtUI();if(!restore())buildFortnight();

})();
