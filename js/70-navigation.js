try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/70-navigation.js','rb-build:96c805ac2cf0b97dc0967cf3082953830112277e83b3988bde95a599f3ebddc0')}catch(error){throw error}
/* v0.27 dashboard/navigation prototype. Reads the existing roster/pay state and
   routes into existing tools; it does not replace the calculation engines. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const MODE_KEY='rosterbot-color-mode-v1';
  const ROSTER_PERIOD_KEY='rosterbot-roster-period-v1';
  const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const PAY_ANCHOR='2026-06-14';
  const DEMO_ROSTER=Object.freeze({depot:'SCS',roster:'C',lines:Object.freeze([60,61]),grade:'PB205'});
  const demoDayDetails=new Map();
  const leaveLabels={annual:'Annual leave',personal:'Personal leave',unpaid:'Unpaid leave',ph_credit:'PH Days Leave',alr:'ALR'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function isoDate(iso){const [y,m,d]=String(iso||'').split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
  function addDays(iso,n){const d=isoDate(iso);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
  function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function diffDays(a,b){return Math.floor((isoDate(b)-isoDate(a))/86400000)}
  function payStartFor(iso){return addDays(PAY_ANCHOR,Math.floor(diffDays(PAY_ANCHOR,iso)/14)*14)}
  function weekStart(iso){const d=isoDate(iso),dow=d.getUTCDay();return addDays(iso,-dow)}
  function money(v){return new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(Number(v)||0)}
  function shortDate(iso){return isoDate(iso).toLocaleDateString('en-AU',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'})}
  function rangeShort(a,b){const da=isoDate(a),db=isoDate(b);if(da.getUTCFullYear()===db.getUTCFullYear()&&da.getUTCMonth()===db.getUTCMonth())return `${da.getUTCDate()}–${db.getUTCDate()} ${db.toLocaleDateString('en-AU',{timeZone:'UTC',month:'short'})}`;return `${da.getUTCDate()} ${da.toLocaleDateString('en-AU',{timeZone:'UTC',month:'short'})}–${db.getUTCDate()} ${db.toLocaleDateString('en-AU',{timeZone:'UTC',month:'short'})}`}
  function readJson(key,fallback={}){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch(_){return fallback}}
  function durationMinutes(start,end){if(!start||!end)return 0;const p=s=>{const [h,m]=String(s).split(':').map(Number);return h*60+m};let a=p(start),b=p(end);if(b<a)b+=1440;return Math.max(0,b-a)}
  function durationText(mins){if(!mins)return '';return `${Math.floor(mins/60)}h${String(mins%60).padStart(2,'0')}`}
  function currentWeeks(){return window.ROSTERBOT_SHARED?.weeks||[]}
  function allDays(){return currentWeeks().flatMap(w=>(w.days||[]).map(d=>({week:w,day:d})))}
  let dashboardForecast=new Map();
  function rebuildDashboardForecast(){
    dashboardForecast=new Map();if(!timeline().length||!window.RosterEngine||!window.ROSTER_DATA)return;
    const from=weekStart(localToday());
    try{for(const week of window.RosterEngine.buildWeeks(window.ROSTER_DATA,window.RosterBotUI.engineSettingsForView(from),12)||[])for(const day of week.days||[])dashboardForecast.set(day.date,{week,day})}catch(_){}
  }
  function dayEntry(date){return allDays().find(x=>x.day?.date===date)||dashboardForecast.get(date)||null}
  function statusFor(x){if(!x)return 'unknown';const a=x.day.actualOverride||null,c=x.day.cell||{};if(a){if(leaveLabels[a.status])return 'leave';if(a.status==='or')return 'off';if(['worked','worked_or'].includes(a.status))return 'shift'}if(x.week?.isAnnualLeave)return 'leave';if(c.type==='off'||c.type==='or')return 'off';if(c.type==='alr'||c.type==='annual')return 'leave';if(c.type==='shift'||c.shift)return 'shift';return 'unknown'}
  function detailsFor(x){
    if(!x)return null;const a=x.day.actualOverride||null,c=x.day.cell||{},kind=statusFor(x),hasActual=!!a,rosterKind=(c.type==='off'||c.type==='or')?'off':(c.type==='alr'||c.type==='annual')?'leave':(c.type==='shift'||c.shift)?'shift':'unknown',roster={kind:rosterKind,code:rosterKind==='off'?'OR':c.shift||'',start:c.start||'',end:c.finish||''};
    const holidayName=x.day.holidayName||window.ROSTERBOT_HOLIDAYS?.[x.day.date]||'';
    if(kind==='leave'){const raw=a?.status||(c.type==='alr'?'alr':'annual');return {kind,statusKey:raw,label:leaveLabels[raw]||'Leave',code:leaveLabels[raw]||'Leave',start:'',end:'',duration:'',hasActual,holidayName,source:hasActual?'Recorded actual':'Roster projection',roster,content:''}}
    if(kind==='off')return {kind,label:'OR',code:'OR',start:'',end:'',duration:'',hasActual,holidayName,source:hasActual?'Recorded actual':'Roster projection',roster,content:''};
    if(kind==='shift'){
      const start=a?.actualStart||c.start||'',end=a?.actualEnd||c.finish||'',code=a?.actualCode||c.shift||'SHIFT',mins=durationMinutes(start,end),duration=(a&&['worked','worked_or'].includes(a.status)?durationText(mins):(c.bookHours||durationText(mins)));let job=null;
      if(hasActual&&code)job=(window.RosterOfficial?.searchJobs?.(x.day.date,code,80)||[]).find(item=>String(item.code).toUpperCase()===String(code).toUpperCase()&&(!start||item.start===start))||(window.RosterOfficial?.searchJobs?.(x.day.date,code,80)||[]).find(item=>String(item.code).toUpperCase()===String(code).toUpperCase())||null;
      const content=String(job?.detail||c.bookContents||(Array.isArray(c.details)?c.details.join(' · '):'')).trim();return {kind,label:code,code,start,end,duration,hasActual,holidayName,source:hasActual?'Recorded actual':(c.userEntered?'Saved work pattern':'Roster projection'),roster,content};
    }
    return {kind,label:'No roster',code:'—',start:'',end:'',duration:'',hasActual,holidayName,source:'No roster information',roster,content:''}
  }
  function timeline(){const rows=readJson('rosterbot-timeline-v1',[]);return Array.isArray(rows)?rows:[]}
  function currentRosterSummary(){const rows=timeline().slice().sort((a,b)=>String(a.startWC).localeCompare(String(b.startWC))),today=localToday();let active=null;for(const r of rows)if(String(r.startWC)<=today)active=r;if(!active)active=rows[0];if(!active)return null;if(active.mode==='manual')return {main:active.manualType==='adhoc'?'Manual fortnight entry':'Personal work pattern',meta:`User-entered schedule · from ${shortDate(active.startWC)}`};const t=active.trackA||{},other=active.trackB;let main=`${t.roster||'ROSTER'} · Line ${t.line||'—'}`;let meta=`${t.depot||'SCS'} · from ${shortDate(active.startWC)}`;if(other)meta+=` · alternates ${other.roster||''} ${other.line||''}`;return {main,meta}}
  function ensureCurrentCycle({persist=true}={}){if(timeline().length){if(persist)$('homeToday')?.click();else window.RosterBotUI?.showCurrentPayCycle?.({persist:false});setTimeout(renderDashboard,80)}}
  const drilldownClasses=['v27-drilldown-active','v27-view-week','v27-view-fortnight','v27-view-calendar','v27-view-month'];
  function clearDrilldown(){drilldownClasses.forEach(c=>document.documentElement.classList.remove(c));if($('outputEyebrow'))$('outputEyebrow').textContent='YOUR ROSTER'}
  function setDrilldown(mode){clearDrilldown();if(!mode)return;document.documentElement.classList.add('v27-drilldown-active',`v27-view-${mode}`);if($('outputEyebrow'))$('outputEyebrow').textContent=mode==='week'||mode==='fortnight'?'MY ROSTER':'CALENDAR';if($('outputTitle'))$('outputTitle').textContent=mode==='week'||mode==='fortnight'?'My roster':'Calendar'}
  function applyOnboardingCopy(){
    const title=$('setup-title'),eye=$('setupEyebrow'),intro=$('v28OnboardingIntro'),go=$('generateBtn');
    if(title)title.textContent='Set up my roster';if(eye)eye.textContent='MANUAL ROSTER SETUP';if(go)go.textContent='Show my roster';if(intro)intro.hidden=false;
  }
  function resetOnboardingPreview(){document.documentElement.classList.remove('v28-onboarding-preview');const c=$('v28PreviewConfirm');if(c)c.hidden=true;if($('outputSection'))$('outputSection').hidden=true}
  function setPrimaryNav(name='home'){qa('[data-v29-nav]').forEach(b=>b.classList.toggle('active',b.dataset.v29Nav===name))}
  function clearHubViews(){document.documentElement.classList.remove('v29-view-roster','v29-view-more')}
  function showRosterSurface(){if($('paybotPage')&&!$('paybotPage').hidden)$('rosterbotNavBtn')?.click()}
  function setFirstRunHistory(view,mode='replace'){
    if(mode==='none'||!history?.[`${mode}State`])return;
    history[`${mode}State`]({...history.state,rosterbotView:view},'',location.href);
  }
  function clearFirstRunViews(){
    document.documentElement.classList.remove('v32-front-door-active','v32-demo-active','v28-onboarding-active','v28-onboarding-preview','v28-lookup-active');
    if($('v32FrontDoor'))$('v32FrontDoor').hidden=true;if($('v32DemoPanel'))$('v32DemoPanel').hidden=true;
  }
  function focusFirstRun(id){requestAnimationFrame(()=>$(id)?.focus({preventScroll:true}))}
  function demoDuty(date,line,week){
    const day=isoDate(date).getUTCDay(),cell=window.RosterOfficial?.resolveCell?.(date,DEMO_ROSTER.depot,DEMO_ROSTER.roster,line,day)||{type:'unknown'};
    if(cell.type==='off')return {kind:'or',code:'OR',date,line,week,cell};
    if(cell.type==='shift')return {kind:'work',code:cell.shift||'SHIFT',start:cell.start||'',end:cell.finish||'',detail:cell.bookContents||'',bookHours:cell.bookHours||'',date,line,week,cell};
    const code=cell.shift||String(cell.type||'NO DATA').toUpperCase();return {kind:'special',code,start:cell.start||'',end:cell.finish||'',detail:(cell.details||[]).join(' · '),bookHours:cell.bookHours||'',date,line,week,cell};
  }
  function demoPayDay(duty){
    const cell=duty.cell||{},holiday=window.ROSTERBOT_HOLIDAYS?.[duty.date]||'',worked=duty.kind==='work',off=duty.kind==='or';return {date:duty.date,week:duty.week,roster:DEMO_ROSTER.roster,line:duty.line,depot:DEMO_ROSTER.depot,dataset:cell.sourceDataset||'',code:off?'OR':duty.code,rosteredStart:duty.start||'',rosteredEnd:duty.end||'',rosteredBookHours:duty.bookHours||'',exact:cell.finishSource!=='assumed-8h',status:off?'off':worked?'worked':cell.type==='alr'?'alr':'worked',actualCode:worked?duty.code:'',actualStart:worked?duty.start||'':'',actualEnd:worked?duty.end||'':'',ph:!!holiday,holidayName:holiday,phMode:window.RosterOfficial?.defaultPhMode?.(cell,!!holiday)||'choose',allowances:{},lookupMsg:'Official sample roster'};
  }
  function setDemoSummary(prefix,duty,duties,index){
    const title=$(prefix+'Duty'),times=$(prefix+'Times');if(!title||!times)return;
    if(duty.kind==='or'){title.textContent='Off Roster';const next=duties.slice(index+1).find(item=>item.kind==='work');times.textContent=next?`Next shift ${shortDate(next.date)} · ${next.start}`:'No later shift in this example';return}
    title.textContent=`${duty.code}${duty.start?` · ${duty.start}`:''}`;times.textContent=duty.start?`${duty.start}${duty.end?` → ${duty.end} · ${durationText(durationMinutes(duty.start,duty.end))}`:''}`:duty.code;
  }
  function renderDemoPreview(){
    const host=$('v32DemoCalendar');if(!host)return;
    const today=localToday(),wc=weekStart(today),names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];demoDayDetails.clear();
    const duties=Array.from({length:14},(_,index)=>{const week=Math.floor(index/7),date=addDays(wc,index),duty=demoDuty(date,DEMO_ROSTER.lines[week],week+1);demoDayDetails.set(date,duty);return duty});
    host.innerHTML=[0,1].map(week=>{const start=addDays(wc,week*7),line=DEMO_ROSTER.lines[week],days=names.map((name,index)=>{const duty=duties[week*7+index],date=duty.date,display=String(isoDate(date).getUTCDate()),fullDisplay=isoDate(date).toLocaleDateString('en-AU',{timeZone:'UTC',day:'numeric',month:'short'}),work=duty.kind==='work',off=duty.kind==='or',state=work?`Duty ${duty.code}, sign on ${duty.start}, sign off ${duty.end}`:off?'Off Roster':duty.code;return `<button class="v32-demo-day ${work?'work':off?'or':'special'}${date===today?' today':''}" type="button" data-v32-demo-date="${date}" aria-label="${esc(`${name} ${fullDisplay}, ${state}. Open example details`)}"><span class="v32-demo-day-date"><b>${name}</b><time datetime="${date}">${display}</time></span><strong class="v32-demo-sign-on">${work?esc(duty.start):esc(duty.code)}</strong><small>${work?`off ${esc(duty.end)}`:off?'Off Roster':esc(duty.code)}</small></button>`}).join('');return `<section class="v32-demo-calendar-week" aria-label="C roster line ${line}, week commencing ${esc(shortDate(start))}"><div class="v32-demo-week-head"><strong>C · LINE ${line}</strong><span>WC ${esc(window.RosterEngine?.formatDateLong?.(start)||shortDate(start))}</span></div><div class="v32-demo-days">${days}</div></section>`}).join('');
    const todayIndex=Math.max(0,Math.min(13,diffDays(wc,today)));setDemoSummary('v32DemoToday',duties[todayIndex],duties,todayIndex);setDemoSummary('v32DemoTomorrow',duties[Math.min(13,todayIndex+1)],duties,Math.min(13,todayIndex+1));
    const pay=window.PayBotCombined?.calculateDays?.(duties.map(demoPayDay),DEMO_ROSTER.grade,'none'),workedMinutes=duties.filter(duty=>duty.kind==='work').reduce((sum,duty)=>sum+durationMinutes(duty.start,duty.end),0);if($('v32DemoRosteredHours'))$('v32DemoRosteredHours').textContent=`${(workedMinutes/60).toFixed(1)} rostered hours this pay fortnight`;if($('v32DemoExpectedPay'))$('v32DemoExpectedPay').textContent=pay?`${money(pay.gross)} expected gross`:'Expected gross unavailable';
  }
  function openDemoDay(duty,date,invoker){
    if(!duty||!date)return;const off=duty.kind!=='work',label=shortDate(date),facts=$('v32DemoDutyFacts'),content=$('v32DemoDutyContent'),offRoster=$('v32DemoDutyOffRoster');
    if($('v32DemoDayTitle'))$('v32DemoDayTitle').textContent=off?`${label} · Off Roster`:`${duty.code} · ${label}`;
    if($('v32DemoDutyDate'))$('v32DemoDutyDate').textContent=label;if($('v32DemoDutyCode'))$('v32DemoDutyCode').textContent=duty.code||'—';if($('v32DemoDutyTimes'))$('v32DemoDutyTimes').textContent=off?'—':`${duty.start} → ${duty.end}`;if($('v32DemoDutyDuration'))$('v32DemoDutyDuration').textContent=off?'—':durationText(durationMinutes(duty.start,duty.end));
    if(facts)facts.hidden=off;if(content){content.hidden=off;content.innerHTML=off?'':`<strong>Shift details</strong><br><span>${esc(duty.detail||'Official shift-book content is unavailable for this duty.')}</span>`}if(offRoster)offRoster.hidden=!off;
    window.RosterBotDialogs.open($('v32DemoDayModal'),{invoker,initialFocus:$('v32DemoDayClose'),onRequestClose:()=>window.RosterBotDialogs.close($('v32DemoDayModal'))});
  }
  function showFrontDoor({historyMode='replace',focus=false}={}){
    showRosterSurface();clearDrilldown();clearHubViews();clearFirstRunViews();document.documentElement.classList.remove('v29-app-ready','v27-dashboard-active');document.documentElement.classList.add('v32-front-door-active');
    let hasDraft=false;try{hasDraft=!!localStorage.getItem('rosterbot-setup-draft-v1')}catch(_){}if($('v32SetUpRoster'))$('v32SetUpRoster').textContent=hasDraft?'Continue setting up my roster':'Set up my roster';
    if($('v32FrontDoor'))$('v32FrontDoor').hidden=false;setFirstRunHistory('front-door',historyMode);window.scrollTo({top:0,behavior:focus?'smooth':'auto'});if(focus)focusFirstRun('v32FrontDoorTitle');
  }
  function showDemo({historyMode='push'}={}){
    if(timeline().length){showDashboard();return}
    showRosterSurface();clearDrilldown();clearHubViews();clearFirstRunViews();document.documentElement.classList.remove('v29-app-ready','v27-dashboard-active');document.documentElement.classList.add('v32-demo-active');
    renderDemoPreview();if($('v32DemoPanel'))$('v32DemoPanel').hidden=false;setFirstRunHistory('demo',historyMode);window.scrollTo({top:0,behavior:'smooth'});focusFirstRun('v32DemoTitle');
  }
  function restorePersonalSetupAfterLookup(){if(document.documentElement.classList.contains('v28-lookup-active'))window.RosterBotUI?.restoreSession?.()}
  function preparePersonalSurface({persist=true}={}){
    showRosterSurface();restorePersonalSetupAfterLookup();clearHubViews();clearFirstRunViews();const confirm=$('v28PreviewConfirm');if(confirm)confirm.hidden=true;document.documentElement.classList.add('v29-app-ready');window.RosterBotUI?.setExperience?.('diary',{display:false,persist});
  }
  function showOnboarding({persist=true,historyMode='push'}={}){
    showRosterSurface();restorePersonalSetupAfterLookup();clearDrilldown();clearHubViews();clearFirstRunViews();document.documentElement.classList.remove('v29-app-ready','v27-dashboard-active');document.documentElement.classList.add('v28-onboarding-active');
    applyOnboardingCopy();window.RosterBotUI?.beginInitialOnboarding?.();window.RosterBotUI?.setExperience?.('quick',{display:false,persist});const setup=$('setupPanel');if(setup)setup.hidden=false;resetOnboardingPreview();if(!timeline().length)setFirstRunHistory('setup',historyMode);window.scrollTo({top:0,behavior:'smooth'});focusFirstRun('setup-title');
  }
  function showDashboard({persist=true}={}){
    if(!timeline().length){const view=history.state?.rosterbotView;if(view==='demo')showDemo({historyMode:'none'});else if(view==='setup')showOnboarding({persist,historyMode:'none'});else showFrontDoor({historyMode:view==='front-door'?'none':'replace'});return}
    clearDrilldown();preparePersonalSurface({persist});document.documentElement.classList.add('v27-dashboard-active');setPrimaryNav('home');window.scrollTo({top:0,behavior:'smooth'});ensureCurrentCycle({persist});renderDashboard()
  }
  function showRosterHub(){
    if(!timeline().length){showFrontDoor({focus:true});return}
    clearDrilldown();preparePersonalSurface();document.documentElement.classList.remove('v27-dashboard-active');document.documentElement.classList.add('v29-view-roster');setPrimaryNav('roster');renderRosterCard();window.scrollTo({top:0,behavior:'smooth'})
  }
  function showMoreHub(){
    if(!timeline().length){showFrontDoor({focus:true});return}
    clearDrilldown();preparePersonalSurface();document.documentElement.classList.remove('v27-dashboard-active');document.documentElement.classList.add('v29-view-more');setPrimaryNav('more');renderSyncStatus();window.scrollTo({top:0,behavior:'smooth'})
  }
  function updateRosterDrilldown(){
    const week=document.documentElement.classList.contains('v27-view-week'),fortnight=document.documentElement.classList.contains('v27-view-fortnight');
    if(!week&&!fortnight)return;
    const from=$('viewFromDate')?.value||localToday(),to=$('viewToDate')?.value||from,summary=currentRosterSummary();
    if($('v31RosterPeriod'))$('v31RosterPeriod').textContent=rangeShort(from,to);
    if($('v31RosterPosition'))$('v31RosterPosition').textContent=summary?.main||'Personal roster';
    $('v31RosterWeek')?.classList.toggle('active',week);$('v31RosterWeek')?.setAttribute('aria-pressed',String(week));
    $('v31RosterFortnight')?.classList.toggle('active',fortnight);$('v31RosterFortnight')?.setAttribute('aria-pressed',String(fortnight));
    const prev=$('v27FortnightPrev'),next=$('v27FortnightNext'),label=week?'week':'pay fortnight';
    prev?.setAttribute('aria-label',`Previous ${label}`);next?.setAttribute('aria-label',`Next ${label}`);
  }
  function showWorkbench(target,mode,nav='home'){preparePersonalSurface();document.documentElement.classList.remove('v27-dashboard-active');setPrimaryNav(nav);setDrilldown(mode);updateRosterDrilldown();setTimeout(()=>{const el=target?q(target):$('outputSection');el?.scrollIntoView({behavior:'smooth',block:'start'})},80)}
  function preferredRosterPeriod(){try{return localStorage.getItem(ROSTER_PERIOD_KEY)==='week'?'week':'fortnight'}catch(_){return 'fortnight'}}
  function rememberRosterPeriod(mode){try{localStorage.setItem(ROSTER_PERIOD_KEY,mode)}catch(_){}}
  function openRoster(mode=preferredRosterPeriod(),nav='home'){
    if(!timeline().length){showFrontDoor({focus:true});return}
    mode=mode==='week'?'week':'fortnight';rememberRosterPeriod(mode);
    if(mode==='week')$('thisWeekView')?.click();else $('thisPayCycleView')?.click();
    showWorkbench('#outputSection',mode,nav);
  }
  function switchRosterPeriod(mode,nav='home'){
    mode=mode==='week'?'week':'fortnight';const from=$('viewFromDate')?.value||localToday(),to=$('viewToDate')?.value||from,today=localToday(),todayVisible=today>=from&&today<=to,anchor=todayVisible?today:from,start=mode==='week'?weekStart(anchor):payStartFor(anchor),end=addDays(start,mode==='week'?6:13);
    rememberRosterPeriod(mode);if($('viewFromDate'))$('viewFromDate').value=start;if($('viewToDate'))$('viewToDate').value=end;$('displayRangeBtn')?.click();showWorkbench('#outputSection',mode,nav);
  }
  function moveRosterPeriod(delta){
    const week=document.documentElement.classList.contains('v27-view-week');
    if(week){const from=weekStart($('viewFromDate')?.value||localToday()),next=addDays(from,delta*7);if($('viewFromDate'))$('viewFromDate').value=next;if($('viewToDate'))$('viewToDate').value=addDays(next,6);$('displayRangeBtn')?.click()}
    else if(delta<0)$('homePrevFortnight')?.click();else $('homeNextFortnight')?.click();
    updateRosterDrilldown();
  }
  function returnRosterToToday(){if(document.documentElement.classList.contains('v27-view-week'))$('thisWeekView')?.click();else $('homeToday')?.click();updateRosterDrilldown()}
  function openToday(){const today=localToday();if(!timeline().length){showFrontDoor({focus:true});return}setPrimaryNav('home');window.RosterBotDiary?.showDay?.(today)}
  function openWeek(){openRoster('week','home')}
  function openFortnight(){openRoster('fortnight','home')}
  function openMyRoster(){openRoster(preferredRosterPeriod(),'roster')}
  function openCalendar(){if(!timeline().length){showFrontDoor({focus:true});return}$('thisPayCycleView')?.click();showWorkbench('#outputSection','calendar','calendar');setTimeout(()=>window.RosterBotCalendarSubscription?.openCalendar?.(),160)}
  function openPay(){if(!timeline().length){showFrontDoor({focus:true});return}restorePersonalSetupAfterLookup();clearHubViews();clearFirstRunViews();document.documentElement.classList.remove('v27-dashboard-active');document.documentElement.classList.add('v29-app-ready');$('paybotNavBtn')?.click();setPrimaryNav('pay')}
  function renderHomeDay(prefix,date,label){
    const x=dayEntry(date),d=detailsFor(x),job=$(`${prefix}Job`),dateEl=$(`${prefix}Date`),times=$(`${prefix}Times`),source=$(`${prefix}Source`),card=$(prefix==='dashToday'?'dashTodayCard':'dashTomorrowCard');if(dateEl)dateEl.textContent=shortDate(date);card?.classList.remove('leave','is-off','has-actual');
    if(!timeline().length){if(job)job.textContent='Set up my roster';if(times)times.textContent='Choose your starting date, depot, roster and line';if(source)source.textContent='';return}
    if(!d){if(job)job.textContent='No roster information';if(times)times.textContent='Open My Roster to review this date';if(source)source.textContent='';return}
    card?.classList.toggle('leave',d.kind==='leave');card?.classList.toggle('is-off',d.kind==='off');card?.classList.toggle('has-actual',d.hasActual);
    if(job)job.textContent=d.kind==='shift'?`${d.code}${d.start?` · ${d.start}`:''}`:d.label;if(times)times.textContent=d.kind==='shift'?`${d.start||'—'} → ${d.end||'—'}${d.duration?` · ${d.duration}`:''}`:(d.kind==='off'?'Off Roster':d.kind==='leave'?'Leave day':'No roster information');if(source)source.textContent=d.source;
    card?.setAttribute('aria-label',`${label}, ${shortDate(date)}. ${d.kind==='shift'?`Duty ${d.code}, sign on ${d.start||'unknown'}, sign off ${d.end||'unknown'}`:d.kind==='off'?'Off Roster':d.label}. ${d.source}. Open shift details`);
  }
  function renderToday(){const today=localToday();renderHomeDay('dashToday',today,'Today');renderHomeDay('dashTomorrow',addDays(today,1),'Tomorrow')}
  function renderNextOffRoster(){
    const today=localToday(),label=$('dashNextOffRoster'),meta=$('dashNextOffRosterMeta');let start='';for(let i=0;i<70;i++){const date=addDays(today,i);if(statusFor(dayEntry(date))==='off'){start=date;break}}
    if(!start){if(label)label.textContent='Not shown in the next 10 weeks';if(meta)meta.textContent='Open the full roster to look further ahead';return}
    let end=start;for(let i=1;i<14;i++){const next=addDays(start,i);if(statusFor(dayEntry(next))!=='off')break;end=next}
    const dayName=iso=>DAY_NAMES[isoDate(iso).getUTCDay()],same=start===end;if(label)label.textContent=same?`${dayName(start)} ${shortDate(start)}`:`${dayName(start)} ${shortDate(start)} – ${dayName(end)} ${shortDate(end)}`;if(meta)meta.textContent=same?'One Off Roster day':`${diffDays(start,end)+1} consecutive Off Roster days`;
  }
  function forwardWeekPosition(week){
    if(!week||week.timelineMissing)return 'No roster';
    if(week.roster==='MANUAL')return 'Personal pattern';
    const roster=week.roster==='FLEX'?'Flex':week.roster==='MAIN'?'Main':week.roster||'Roster',line=Number.isFinite(+week.line)?` ${week.line}`:'',depot=week.depot&&week.depot!=='SCS'?`${week.depot} · `:'';
    return `${depot}${roster}${line}${week.isWeekOverride?' · Override':''}`;
  }
  function renderForwardRoster(){
    const host=$('v32ForwardRoster');if(!host)return;const today=localToday(),start=weekStart(today),end=addDays(start,27),names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];if($('v32ForwardRosterRange'))$('v32ForwardRosterRange').textContent=`${shortDate(start)} – ${shortDate(end)}`;
    host.innerHTML=Array.from({length:4},(_,weekIndex)=>{const wc=addDays(start,weekIndex*7),weekEntry=dayEntry(wc),week=weekEntry?.week||dashboardForecast.get(wc)?.week||null,weekLabel=`WC ${shortDate(wc)} – ${forwardWeekPosition(week)}`,days=names.map((name,index)=>{const date=addDays(wc,index),entry=dayEntry(date),d=detailsFor(entry),kind=d?.kind||'unknown',isAlr=d?.statusKey==='alr',isPh=!!d?.holidayName,leaveCode={annual:'AL',personal:'PL',unpaid:'UL',ph_credit:'PH',alr:'ALR'}[d?.statusKey]||d?.code||'—',state=kind==='shift'?`Duty ${d.code}, sign on ${d.start||'unknown'}, sign off ${d.end||'unknown'}`:kind==='off'?'Off Roster':d?.label||'No roster information',primary=kind==='shift'?(d.start||d.code):kind==='off'?'OR':kind==='leave'?leaveCode:d?.code||'—',baseSecondary=kind==='shift'?(d.code&&d.start?d.code:'Work'):(kind==='off'?'Off Roster':d?.label||'No data'),secondary=isPh?`PH · ${baseSecondary}`:baseSecondary,classes=[kind==='off'?'off':'',isAlr?'alr':kind==='leave'?'leave':'',isPh?'ph':'',date===today?'today':'',d?.hasActual?'has-actual':''].filter(Boolean).join(' '),holidayState=isPh?` Public holiday: ${d.holidayName}.`:'';return `<button class="v32-forward-day ${classes}" type="button" data-v32-roster-date="${date}" aria-label="${esc(`${name} ${shortDate(date)}, ${state}.${holidayState} ${d?.source||''}. Open shift details`)}"${date===today?' aria-current="date"':''}><span><b>${name}</b><time datetime="${date}">${isoDate(date).getUTCDate()}</time></span><strong>${esc(primary)}</strong><small>${esc(secondary)}</small></button>`}).join('');return `<section class="v32-forward-week${weekIndex===0?' current':''}" aria-label="${esc(`${weekIndex===0?'Current week, ':''}${weekLabel}`)}"><div class="v32-forward-week-head"><strong>${esc(weekLabel)}</strong>${weekIndex===0?'<span>Current week</span>':''}</div><div class="v32-forward-days">${days}</div></section>`}).join('');
  }
  function renderWeek(){const today=localToday(),start=weekStart(today),end=addDays(start,6);if($('dashWeekRange'))$('dashWeekRange').textContent=rangeShort(start,end);const strip=$('dashWeekDays');if(strip){strip.innerHTML=DAY_NAMES.map((name,i)=>{const date=addDays(start,i),kind=statusFor(dayEntry(date));return `<span class="v27-week-day ${kind==='off'?'off':kind==='leave'?'leave':''}${date===today?' today':''}" title="${esc(shortDate(date))}"><b>${name[0]}</b><i></i></span>`}).join('')}let next=null;for(let i=1;i<=6;i++){const date=addDays(today,i);if(date>end)break;const x=dayEntry(date),d=detailsFor(x);if(d?.kind==='shift'){next={date,d};break}}if($('dashWeekNext')){if(next){const dd=diffDays(today,next.date),prefix=dd===1?'Tomorrow':DAY_NAMES[isoDate(next.date).getUTCDay()];$('dashWeekNext').textContent=`Next · ${prefix} · ${next.d.code}${next.d.start?` · ${next.d.start}`:''}`}else $('dashWeekNext').textContent=timeline().length?'No more rostered work this week':'Set up your roster to see this week'}}
  function currentPayCheck(start){return readJson('rosterbot-pay-checks-v1',{})[start]||null}
  function hasPayProfile(){return (window.RosterBotEmployment?.all?.()||[]).length>0}
  function renderPaySetupState(){const missing=timeline().length>0&&!hasPayProfile(),card=$('v32PaySetupCard');if(card)card.hidden=!missing}
  function renderFortnight(){const start=payStartFor(localToday()),end=addDays(start,13),profileReady=hasPayProfile();if($('dashFortnightRange'))$('dashFortnightRange').textContent=rangeShort(start,end);const r=window.PayBotCombined?.previewFortnight?.(start);if(r?.available){const worked=(r.daily||[]).reduce((s,d)=>s+(Number(d.worked)||0),0)/60;if($('dashFortnightHours'))$('dashFortnightHours').textContent=`${worked.toFixed(1)} h used in this estimate`;if($('dashFortnightPay'))$('dashFortnightPay').textContent=profileReady?`${money(r.gross)} expected gross`:'Set up pay estimate'}else{if($('dashFortnightPay'))$('dashFortnightPay').textContent=profileReady?'Expected —':'Set up pay estimate';if($('dashFortnightHours'))$('dashFortnightHours').textContent=timeline().length?'Roster ready · add a pay role for an estimate':'Set up your roster to calculate pay'}const c=currentPayCheck(start),el=$('dashFortnightPayslip');if(!el)return;el.className='v27-status-line neutral';if(!c){el.textContent=profileReady?'Estimate · Payslip not checked':'Pay role not set';return}const diff=Math.round(((+c.actualGross||0)-(+c.grossAtCheck||0))*100)/100;if(Math.abs(diff)<.005){el.textContent='Payslip · Matches ✓';el.className='v27-status-line good'}else{el.textContent=`Payslip · ${money(Math.abs(diff))} ${diff<0?'short':'over'}`;el.className='v27-status-line warn'}}
  function varianceRows(){const checks=readJson('rosterbot-pay-checks-v1',{});return Object.entries(checks).map(([start,c])=>({start,diff:Math.round(((+c.actualGross||0)-(+c.grossAtCheck||0))*100)/100})).filter(x=>Math.abs(x.diff)>.004).sort((a,b)=>a.start.localeCompare(b.start))}
  function renderVariances(){const checks=readJson('rosterbot-pay-checks-v1',{}),checked=Object.keys(checks).length,rows=varianceRows(),total=rows.reduce((s,x)=>s+Math.abs(x.diff),0),count=$('dashVarianceCount'),amount=$('dashVarianceAmount'),top=$('dashVarianceTop');if(!checked){if(count)count.textContent='No payslips checked yet';if(amount)amount.textContent='Compare a payslip with expected pay';if(top)top.textContent='Open Pay when your payslip arrives';return}if(!rows.length){if(count)count.textContent=`${checked} payslip${checked===1?'':'s'} checked`;if(amount)amount.textContent='No differences to review';if(top)top.textContent='Everything checked matches ✓';return}if(count)count.textContent=`${rows.length} need${rows.length===1?'s':''} review`;if(amount)amount.textContent=`${money(total)} total difference`;if(top)top.textContent=`Oldest difference · ${rangeShort(rows[0].start,addDays(rows[0].start,13))}`}
  function renderRosterCard(){const s=currentRosterSummary();if($('dashRosterPosition'))$('dashRosterPosition').textContent=s?s.main:'Set up my roster';if($('dashMyRosterMain'))$('dashMyRosterMain').textContent=s?s.main:'Set up my roster';if($('dashMyRosterMeta'))$('dashMyRosterMeta').textContent=s?s.meta:'Choose your roster and line';if($('v29RosterSummaryMain'))$('v29RosterSummaryMain').textContent=s?s.main:'Not configured';if($('v29RosterSummaryMeta'))$('v29RosterSummaryMeta').textContent=s?s.meta:'Set up My Roster first'}
  function renderSyncStatus(){const chip=$('dataOpenBtn'),icon=$('headerSyncIcon'),label=$('headerSyncStatus');if(!chip||!icon||!label)return;chip.classList.remove('sync-warning','sync-error');const state=String($('cloudSyncHeadline')?.textContent||''),auto=String($('cloudAutoState')?.textContent||''),pill=String($('cloudStatePill')?.textContent||'');const combined=`${state} ${auto} ${pill}`.toLowerCase();let visible='Local saved';if(/conflict|error|failed/.test(combined)){visible='Needs attention';chip.classList.add('sync-error')}else if(/local changes|pending|waiting|offline/.test(combined)){visible='Local saved';chip.classList.add('sync-warning')}else if(/up to date|synced|online/.test(combined)){visible='Synced'}label.textContent=visible;if($('v29MoreSyncStatus'))$('v29MoreSyncStatus').textContent=visible}
  function renderDashboard(){rebuildDashboardForecast();renderToday();renderNextOffRoster();renderForwardRoster();renderWeek();renderFortnight();renderVariances();renderRosterCard();renderSyncStatus();renderPaySetupState()}

  let activeRosterDetailDate='';
  function openRosterDay(date,invoker){
    const modal=$('v32RosterDayModal'),x=dayEntry(date),d=detailsFor(x);if(!modal||!d)return;activeRosterDetailDate=date;const off=d.kind==='off',facts=$('v32RosterDayFacts'),offBox=$('v32RosterDayOff'),content=$('v32RosterDayContent'),rostered=$('v32RosterDayRostered');
    if($('v32RosterDayTitle'))$('v32RosterDayTitle').textContent=off?`${shortDate(date)} · Off Roster`:`${d.code} · ${shortDate(date)}`;if($('v32RosterDaySource'))$('v32RosterDaySource').textContent=d.source;if($('v32RosterDayDate'))$('v32RosterDayDate').textContent=shortDate(date);if($('v32RosterDayCode'))$('v32RosterDayCode').textContent=d.code||'—';if($('v32RosterDayTimes'))$('v32RosterDayTimes').textContent=d.kind==='shift'?`${d.start||'—'} → ${d.end||'—'}`:'—';if($('v32RosterDayDuration'))$('v32RosterDayDuration').textContent=d.duration||'—';if(facts)facts.hidden=off;if(offBox)offBox.hidden=!off;
    if(content){content.hidden=off;content.innerHTML=off?'':`<strong>Shift details</strong><br><span>${esc(d.content||'Complete shift details are not available for this duty.')}</span>`}
    const baseline=d.roster||{},changed=d.hasActual&&(baseline.kind!==d.kind||baseline.code!==d.code||baseline.start!==d.start||baseline.end!==d.end);if(rostered){rostered.hidden=!changed;rostered.textContent=changed?`Rostered: ${baseline.kind==='off'?'Off Roster':`${baseline.code||'Duty'}${baseline.start?` · ${baseline.start}`:''}${baseline.end?` → ${baseline.end}`:''}`}`:''}
    window.RosterBotDialogs.open(modal,{invoker,initialFocus:$('v32RosterDayClose'),onRequestClose:()=>window.RosterBotDialogs.close(modal)});
  }
  function editActiveRosterDay(){const date=activeRosterDetailDate;if(!date)return;window.RosterBotDialogs.close($('v32RosterDayModal'),{restoreFocus:false});setPrimaryNav('home');requestAnimationFrame(()=>window.RosterBotDiary?.showDay?.(date))}

  function setMode(mode){mode=mode==='light'?'light':'dark';document.documentElement.dataset.colorMode=mode;try{localStorage.setItem(MODE_KEY,mode);window.RosterBotSchema5Persistence?.notifyPersonalChange?.(MODE_KEY)}catch(_){}const light=mode==='light';$('colorModeToggle')?.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode');$('colorModeToggle')?.setAttribute('title',light?'Switch to dark mode':'Switch to light mode');$('settingsLightMode')?.classList.toggle('active',light);$('settingsDarkMode')?.classList.toggle('active',!light);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',light?'#f7fbfa':'#003c32')}
  function loadMode(){let m='dark';try{m=localStorage.getItem(MODE_KEY)||'dark'}catch(_){}setMode(m)}
  function openModal(id){const m=$(id);if(!m)return;window.RosterBotDialogs.open(m,{invoker:document.activeElement,initialFocus:m.querySelector('.feedback-close-btn'),onRequestClose:()=>closeModal(id)})}
  function closeModal(id){const m=$(id);if(!m)return;window.RosterBotDialogs.close(m)}
  function openPaySetup(){
    const modal=$('v32PaySetupModal');if(!modal||hasPayProfile())return;
    const start=timeline().map(row=>String(row.startWC||'')).filter(Boolean).sort()[0]||'';
    if($('v32PaySetupEffective'))$('v32PaySetupEffective').textContent=start?`This will apply from WC ${shortDate(start)}. You can correct the date later in Employment & Pay Profile.`:'This uses the starting week from your saved roster.';
    if($('v32PaySetupRole'))$('v32PaySetupRole').value='';if($('v32PaySetupError')){$('v32PaySetupError').hidden=true;$('v32PaySetupError').textContent=''}
    window.RosterBotDialogs.open(modal,{invoker:document.activeElement,initialFocus:$('v32PaySetupRole'),onRequestClose:()=>window.RosterBotDialogs.close(modal)});
  }
  async function savePaySetup(){
    const role=$('v32PaySetupRole')?.value||'',error=$('v32PaySetupError'),button=$('v32PaySetupSave');
    if(!role){if(error){error.textContent='Choose your current role first.';error.hidden=false}$('v32PaySetupRole')?.focus();return}
    if(button)button.disabled=true;let result;try{result=await window.RosterBotUI?.saveCurrentPayRole?.(role)}finally{if(button)button.disabled=false}
    if(!result?.ok){if(error){error.textContent=result?.error||'RosterBot could not safely save that pay setup.';error.hidden=false}return}
    window.RosterBotDialogs.close($('v32PaySetupModal'));renderDashboard();
  }
  function refreshSettings(){const compact=localStorage.getItem('rosterbot-view-mode-v1')==='compact';$('settingsCompactView')?.classList.toggle('active',compact);$('settingsCalendarView')?.classList.toggle('active',!compact);if($('settingsThemeSelect'))$('settingsThemeSelect').value=document.documentElement.dataset.theme||'1'}

  function viewerDate(iso){if(!iso)return '';try{return isoDate(iso).toLocaleDateString('en-AU',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'})}catch(_){return String(iso)}}
  function viewerPeriodRange(from,to){return `${viewerDate(from)||'Unknown'}${to?` – ${viewerDate(to)}`:' onward'}`}
  function flexVersionsForDataset(ds){const all=window.ROSTERBOT_OFFICIAL_DATA?.flexVersions||[];if(!ds?.from)return[];const dsEnd=ds.to||'9999-12-31';return all.filter(f=>String(f.from||'')<=dsEnd&&String(f.to||'9999-12-31')>=String(ds.from)).sort((a,b)=>String(a.from).localeCompare(String(b.from)))}
  function flexViewerValue(f){return `FLEX@${f.from}`}
  function selectedViewerRoster(){const datasetKey=$('viewerDataset')?.value,ds=window.ROSTERBOT_OFFICIAL_DATA?.datasets?.[datasetKey],depotName=$('viewerDepot')?.value||'',value=$('viewerRoster')?.value||'';if(!ds)return {datasetKey,ds:null,depotName,value,roster:null,rosterName:value,flex:null};if(value.startsWith('FLEX@')){const from=value.slice(5),f=(window.ROSTERBOT_OFFICIAL_DATA?.flexVersions||[]).find(x=>String(x.from)===from);return {datasetKey,ds,depotName,value,roster:f?{lineCount:f.lineCount,lines:f.lines,source:f.source}:null,rosterName:'FLEX',flex:f||null}}return {datasetKey,ds,depotName,value,roster:ds?.depots?.[depotName]?.[value]||null,rosterName:value,flex:null}}
  function updateViewerPeriodMeta(){const info=selectedViewerRoster(),meta=$('viewerDatasetDates');if(!meta||!info.ds)return;if(info.flex)meta.textContent=`FLEX rotation · ${viewerPeriodRange(info.flex.from,info.flex.to)}`;else meta.textContent=`${info.datasetKey} · ${viewerPeriodRange(info.ds.from,info.ds.to)}`}
  function populateViewer(){const datasets=window.ROSTERBOT_OFFICIAL_DATA?.datasets||{},sel=$('viewerDataset');if(!sel)return;const keys=Object.keys(datasets),prior=sel.value;sel.innerHTML=keys.map(k=>`<option value="${esc(k)}">${esc(k)} — ${esc(viewerPeriodRange(datasets[k]?.from,datasets[k]?.to))}</option>`).join('');const latest=keys.slice().sort((a,b)=>String(datasets[b]?.from||'').localeCompare(String(datasets[a]?.from||'')))[0]||keys[keys.length-1];sel.value=keys.includes(prior)?prior:latest;populateViewerDepots()}
  function populateViewerDepots(){const ds=window.ROSTERBOT_OFFICIAL_DATA?.datasets?.[$('viewerDataset')?.value],dep=$('viewerDepot');if(!ds||!dep)return;const names=Object.keys(ds.depots||{});const keep=names.includes(dep.value)?dep.value:(names.includes('SCS')?'SCS':names[0]);dep.innerHTML=names.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');dep.value=keep||'';populateViewerRosters()}
  function populateViewerRosters(){const ds=window.ROSTERBOT_OFFICIAL_DATA?.datasets?.[$('viewerDataset')?.value],depotName=$('viewerDepot')?.value||'',depot=ds?.depots?.[depotName]||{},sel=$('viewerRoster');if(!sel)return;const prior=sel.value,normalNames=Object.keys(depot).filter(x=>x!=='FLEX'),opts=normalNames.map(x=>({value:x,label:x}));if(depotName==='SCS')for(const f of flexVersionsForDataset(ds))opts.push({value:flexViewerValue(f),label:`FLEX — ${viewerPeriodRange(f.from,f.to)}`});sel.innerHTML=opts.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');const values=opts.map(o=>o.value);if(values.includes(prior))sel.value=prior;else if(prior.startsWith('FLEX@')&&opts.some(o=>o.value.startsWith('FLEX@')))sel.value=opts.find(o=>o.value.startsWith('FLEX@')).value;else sel.value=values[0]||'';updateViewerPeriodMeta();renderViewerMaster();renderViewerSearch()}
  function viewerJob(ds,c){if(!ds||!c||c.type==='off'||c.code==='OR'||!c.code)return null;const code=String(c.code).toUpperCase(),jobs=ds.jobs||[];return jobs.find(j=>String(j.code).toUpperCase()===code&&(!c.start||j.start===c.start))||jobs.find(j=>String(j.code).toUpperCase()===code)||null}
  function renderViewerMaster(){const info=selectedViewerRoster(),roster=info.roster,body=$('viewerMasterBody'),summary=$('viewerRotationSummary'),selected=$('viewerSelectedDuty');if(!body)return;updateViewerPeriodMeta();const lines=Object.keys(roster?.lines||{}).sort((a,b)=>Number(a)-Number(b));if(summary)summary.textContent=info.flex?`${lines.length} line${lines.length===1?'':'s'} · 7-day master rotation · effective ${viewerPeriodRange(info.flex.from,info.flex.to)}`:`${lines.length} line${lines.length===1?'':'s'} · 7-day master rotation`;body.innerHTML=lines.map(lineNo=>{const week=roster.lines[lineNo]||[],blankUnknown=week.filter(c=>c?.type==='unknown'&&!String(c?.raw||'').trim()).length,worked=week.filter(c=>c&&!(c.type==='unknown'&&!String(c.raw||'').trim())&&c.type!=='off'&&c.code!=='OR').length,blankMeansOR=blankUnknown===2&&worked===5;const cells=DAY_NAMES.map((name,i)=>{const c=week[i]||{},off=c.type==='off'||c.code==='OR'||(blankMeansOR&&c.type==='unknown'&&!String(c.raw||'').trim()),code=off?'OR':(c.code||'—'),start=off?'':(c.start||'');return `<td><button class="v27-master-duty${off?' off':''}" type="button" data-viewer-line="${esc(lineNo)}" data-viewer-day="${i}" ${off?'disabled aria-disabled="true"':''}><strong>${esc(code)}</strong>${start?`<span>${esc(start)}</span>`:''}</button></td>`}).join('');return `<tr><th class="v27-master-line" scope="row">${esc(lineNo)}</th>${cells}</tr>`}).join('');if(selected)selected.innerHTML='<span>Select a duty above to inspect its shift-book details.</span>'}
  function showViewerDuty(lineNo,dayIndex){const info=selectedViewerRoster(),week=info.roster?.lines?.[lineNo]||[],c=week[Number(dayIndex)]||{},job=viewerJob(info.ds,c),box=$('viewerSelectedDuty');if(!box)return;const day=DAY_NAMES[Number(dayIndex)]||'',prefix=info.flex?'FLEX ':'';if(c.type==='off'||c.code==='OR'){box.innerHTML=`<strong>${prefix}Line ${esc(lineNo)} · ${esc(day)} · OR</strong><span>Rostered off</span>`;return}box.innerHTML=`<strong>${prefix}Line ${esc(lineNo)} · ${esc(day)} · ${esc(c.code||'SHIFT')}</strong><span>${esc(c.start||'—')}${job?.end?` → ${esc(job.end)}`:''}${job?.hours?` · ${esc(job.hours)}`:''}</span>${job?.book?`<small>${esc(job.book)}${job.depot?` · ${esc(job.depot)}`:''}</small>`:''}${job?.detail?`<p>${esc(job.detail)}</p>`:'<small>No full shift-book description is available for this duty.</small>'}`}

  function renderViewerSearch(){const info=selectedViewerRoster(),ds=info.ds,qv=String($('viewerShiftSearch')?.value||'').trim().toLowerCase(),box=$('viewerShiftResults');if(!box||!ds)return;if(!qv){box.innerHTML=`<p class="muted">${info.flex?`FLEX rotation selected (${esc(viewerPeriodRange(info.flex.from,info.flex.to))}). `:''}Type a duty code or sign-on time to inspect the supplied ${esc(info.datasetKey||'roster period')} roster-book jobs.</p>`;return}const digits=/^\d{4}$/.test(qv)?qv:'';const rows=(ds.jobs||[]).filter(j=>digits?String(j.start||'').replace(':','')===digits:[j.code,j.start,j.end,j.hours,j.depot,j.book,j.detail].join(' ').toLowerCase().includes(qv)).slice(0,30);box.innerHTML=rows.length?rows.map(j=>`<div class="v27-job-result"><strong>${esc(j.code)} · ${esc(j.start||'—')} → ${esc(j.end||'—')} · ${esc(j.hours||'')}</strong><span>${esc(j.depot||'')}${j.book?` · ${esc(j.book)}`:''}</span>${j.detail?`<small>${esc(j.detail)}</small>`:''}</div>`).join(''):'<p class="muted">No matching jobs in this roster period.</p>'}
  function openViewer(){populateViewer();openModal('rosterViewerModal')}

  function updatePagerDots(){const p=$('dashboardCardPager');if(!p)return;const idx=Math.round(p.scrollLeft/Math.max(1,p.clientWidth));qa('[data-dashboard-dot]').forEach((b,i)=>{const on=i===idx;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))})}

  $('dashboardBrandHome')?.addEventListener('click',showDashboard);$('dashboardHomeBtn')?.addEventListener('click',showDashboard);$('v27BackHome')?.addEventListener('click',showDashboard);$('v27ClassicBackHome')?.addEventListener('click',showDashboard);
  $('dashRosterCard')?.addEventListener('click',()=>openRoster(preferredRosterPeriod(),'home'));$('dashTodayCard')?.addEventListener('click',event=>openRosterDay(localToday(),event.currentTarget));$('dashTomorrowCard')?.addEventListener('click',event=>openRosterDay(addDays(localToday(),1),event.currentTarget));$('v32ForwardRoster')?.addEventListener('click',event=>{const button=event.target.closest?.('[data-v32-roster-date]');if(button)openRosterDay(button.dataset.v32RosterDate,button)});$('v32OpenFullRoster')?.addEventListener('click',()=>openRoster(preferredRosterPeriod(),'home'));$('dashPaySummary')?.addEventListener('click',openPay);$('v32RosterDayClose')?.addEventListener('click',()=>window.RosterBotDialogs.close($('v32RosterDayModal')));$('v32RosterDayEdit')?.addEventListener('click',editActiveRosterDay);$('dashVarianceCard')?.addEventListener('click',()=>{const checks=readJson('rosterbot-pay-checks-v1',{});if(Object.keys(checks).length)$('homeIssuesCard')?.click();else openPay()});$('dashMyRosterCard')?.addEventListener('click',showRosterHub);$('dashCalendarCard')?.addEventListener('click',openCalendar);$('dashViewerCard')?.addEventListener('click',openViewer);
  $('v29NavHome')?.addEventListener('click',showDashboard);$('v29NavRoster')?.addEventListener('click',showRosterHub);$('v29NavCalendar')?.addEventListener('click',openCalendar);$('v29NavPay')?.addEventListener('click',openPay);$('v29NavMore')?.addEventListener('click',showMoreHub);
  $('v29ViewRosterBtn')?.addEventListener('click',openMyRoster);$('v31AddRosterChangeBtn')?.addEventListener('click',()=>window.RosterBotDiary?.showAdvanced?.({action:'change'}));$('v29RosterHistoryBtn')?.addEventListener('click',()=>window.RosterBotDiary?.showAdvanced?.());$('v29RosterLookupCard')?.addEventListener('click',openViewer);$('v29OfficialViewerBtn')?.addEventListener('click',openViewer);
  $('v29EmploymentBtn')?.addEventListener('click',()=>window.RosterBotEmployment?.open?.());$('v28SourcesBtn')?.addEventListener('click',()=>window.RosterBotSources?.open?.());$('v29MoreDataBtn')?.addEventListener('click',()=>$('dataOpenBtn')?.click());$('v29MoreSettingsBtn')?.addEventListener('click',()=>{$('settingsOpenBtn')?.click()});$('v29MoreChangelogBtn')?.addEventListener('click',()=>$('changelogOpenBtn')?.click());$('v29MoreFeedbackBtn')?.addEventListener('click',()=>$('feedbackOpenBtn')?.click());
  $('v32OpenPaySetup')?.addEventListener('click',openPaySetup);$('v32PaySetupClose')?.addEventListener('click',()=>window.RosterBotDialogs.close($('v32PaySetupModal')));$('v32PaySetupLater')?.addEventListener('click',()=>window.RosterBotDialogs.close($('v32PaySetupModal')));$('v32PaySetupSave')?.addEventListener('click',savePaySetup);$('v32PaySetupRole')?.addEventListener('change',()=>{if($('v32PaySetupError'))$('v32PaySetupError').hidden=true});
  $('v32TryRosterBot')?.addEventListener('click',()=>showDemo());$('v32SetUpRoster')?.addEventListener('click',()=>showOnboarding());$('v32DemoSetUpRoster')?.addEventListener('click',()=>showOnboarding());$('v32BrowseRosters')?.addEventListener('click',openViewer);$('v32ExitDemo')?.addEventListener('click',()=>{if(history.state?.rosterbotView==='demo'&&history.length>1)history.back();else showFrontDoor({focus:true})});$('v32DemoToday')?.addEventListener('click',event=>openDemoDay(demoDayDetails.get(localToday()),localToday(),event.currentTarget));$('v32DemoCalendar')?.addEventListener('click',event=>{const button=event.target.closest?.('[data-v32-demo-date]');if(!button)return;openDemoDay(demoDayDetails.get(button.dataset.v32DemoDate),button.dataset.v32DemoDate,button)});$('v32DemoDayClose')?.addEventListener('click',()=>window.RosterBotDialogs.close($('v32DemoDayModal')));
  $('v28ChangeSetupBtn')?.addEventListener('click',()=>{resetOnboardingPreview();$('setupPanel')?.scrollIntoView({behavior:'smooth',block:'start'})});$('v28UseRosterBtn')?.addEventListener('click',async()=>{const button=$('v28UseRosterBtn');if(button)button.disabled=true;let ok=false;try{ok=await window.RosterBotUI?.saveCurrentAsMyRoster?.()}finally{if(button)button.disabled=false}if(!ok){alert('RosterBot could not safely save that setup. Check the details and try again.');return}showDashboard()});
  $('v30ExistingCloudBtn')?.addEventListener('click',()=>{if(window.RosterBotDataUI?.showCloud)window.RosterBotDataUI.showCloud();else $('dataOpenBtn')?.click()});$('v30ExistingImportBtn')?.addEventListener('click',()=>{if(window.RosterBotDataUI?.beginImport)window.RosterBotDataUI.beginImport();else $('importDataFile')?.click()});
  ['startDate','startDepot','startRoster','startLine','hasSwap','swapDepot','swapRoster','swapLine'].forEach(id=>$(id)?.addEventListener('change',()=>{if(document.documentElement.classList.contains('v28-onboarding-active'))resetOnboardingPreview()}));
    $('settingsOpenBtn')?.addEventListener('click',()=>{refreshSettings();openModal('settingsModal')});$('settingsCloseBtn')?.addEventListener('click',()=>closeModal('settingsModal'));$('settingsThemeSelect')?.addEventListener('change',e=>{const legacy=$('styleSelect');if(legacy){legacy.value=e.target.value;legacy.dispatchEvent(new Event('change',{bubbles:true}));}refreshSettings();});$('settingsCalendarView')?.addEventListener('click',()=>{$('calendarViewBtn')?.click();refreshSettings()});$('settingsCompactView')?.addEventListener('click',()=>{$('compactViewBtn')?.click();refreshSettings()});
  $('rosterViewerClose')?.addEventListener('click',()=>closeModal('rosterViewerModal'));$('viewerDataset')?.addEventListener('change',populateViewerDepots);$('viewerDepot')?.addEventListener('change',populateViewerRosters);$('viewerRoster')?.addEventListener('change',()=>{updateViewerPeriodMeta();renderViewerMaster();renderViewerSearch()});$('viewerMasterBody')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-viewer-line][data-viewer-day]');if(!b||b.disabled)return;showViewerDuty(b.dataset.viewerLine,b.dataset.viewerDay)});$('viewerShiftSearch')?.addEventListener('input',renderViewerSearch);
  $('v27ClassicPrev')?.addEventListener('click',()=>{$('homePrevFortnight')?.click()});$('v27ClassicToday')?.addEventListener('click',()=>{$('homeToday')?.click()});$('v27ClassicNext')?.addEventListener('click',()=>{$('homeNextFortnight')?.click()});$('v31RosterWeek')?.addEventListener('click',()=>switchRosterPeriod('week',q('[data-v29-nav].active')?.dataset.v29Nav||'home'));$('v31RosterFortnight')?.addEventListener('click',()=>switchRosterPeriod('fortnight',q('[data-v29-nav].active')?.dataset.v29Nav||'home'));$('v27FortnightPrev')?.addEventListener('click',()=>moveRosterPeriod(-1));$('v27FortnightToday')?.addEventListener('click',returnRosterToToday);$('v27FortnightNext')?.addEventListener('click',()=>moveRosterPeriod(1));$('v27ClassicCalendar')?.addEventListener('click',()=>{$('calendarViewBtn')?.click()});$('v27ClassicCompact')?.addEventListener('click',()=>{$('compactViewBtn')?.click()});
  $('universalSearchResults')?.addEventListener('click',e=>{if(e.target.closest?.('[data-search-date]'))showWorkbench('#outputSection','fortnight')});
  let v27YearSwipeX=null,v27YearSwipeY=null;const v27YearStrip=$('historyMonths')?.closest?.('.v27-history-strip')||$('historyMonths');v27YearStrip?.addEventListener('touchstart',e=>{const t=e.touches?.[0];if(!t)return;v27YearSwipeX=t.clientX;v27YearSwipeY=t.clientY},{passive:true});v27YearStrip?.addEventListener('touchend',e=>{if(v27YearSwipeX==null)return;const t=e.changedTouches?.[0];if(!t)return;const dx=t.clientX-v27YearSwipeX,dy=t.clientY-v27YearSwipeY;v27YearSwipeX=v27YearSwipeY=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25){if(dx<0)$('historyNextYear')?.click();else $('historyPrevYear')?.click();}} ,{passive:true});
  let startupPrepared=false,startupRendered=false;
  function prepareStartup(){if(startupPrepared)return;startupPrepared=true;showDashboard({persist:false})}
  function finishStartup(){
    if(startupRendered)return;startupRendered=true;
    try{prepareStartup()}finally{document.documentElement.classList.remove('rb-booting')}
    setTimeout(renderDashboard,250);
  }
  window.addEventListener('storage',()=>setTimeout(()=>{if(timeline().length)renderDashboard()},60));window.addEventListener('rosterbot:employment-change',()=>setTimeout(renderDashboard,0));window.addEventListener('rosterbot:application-starting',prepareStartup);window.addEventListener('rosterbot:application-ready',finishStartup);window.addEventListener('popstate',()=>{if(timeline().length){showDashboard();return}const view=history.state?.rosterbotView;if(view==='demo')showDemo({historyMode:'none'});else if(view==='setup')showOnboarding({historyMode:'none'});else showFrontDoor({historyMode:'none',focus:true})});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&startupRendered){if(timeline().length)renderDashboard();else if(!document.documentElement.matches('.v28-onboarding-active,.v32-front-door-active,.v32-demo-active'))showDashboard({persist:false})}});
  const statusObserver=new MutationObserver(renderSyncStatus);['cloudSyncHeadline','cloudAutoState','cloudStatePill'].forEach(id=>{const el=$(id);if(el)statusObserver.observe(el,{childList:true,subtree:true,characterData:true,attributes:true})});
  setInterval(()=>{if(document.documentElement.classList.contains('v27-dashboard-active'))renderDashboard()},12000);

  document.documentElement.dataset.colorMode='dark';if(window.__rosterbotApplicationStarting)prepareStartup();if(window.__rosterbotApplicationReady)finishStartup();
  window.RosterBotFirstRun={showFrontDoor,showDemo,showSetup:showOnboarding,openBrowse:openViewer,getMode:()=>document.documentElement.classList.contains('v32-demo-active')?'demo':document.documentElement.classList.contains('v32-front-door-active')?'front-door':document.documentElement.classList.contains('v28-onboarding-active')?'setup':'configured',sampleIsPersonalState:false};
  window.RosterBotDashboard={show:showDashboard,showRoster:showRosterHub,showLookup:openViewer,showMore:showMoreHub,openCalendar,openPay,refresh:renderDashboard,openViewer};
})();
