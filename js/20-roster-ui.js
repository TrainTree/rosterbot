(function () {
  'use strict';

  const data = window.ROSTER_DATA;
  const E = window.RosterEngine;
  if (!data || !E) {
    document.body.innerHTML = '<p style="padding:20px">Roster data failed to load.</p>';
    return;
  }

  const $ = id => document.getElementById(id);
  const startDate = $('startDate');
  const startDepot = $('startDepot');
  const startRoster = $('startRoster');
  const startLine = $('startLine');
  const displayWeeks = $('displayWeeks');
  const viewFromDate = $('viewFromDate');
  const viewToDate = $('viewToDate');
  const displayRangeBtn = $('displayRangeBtn');
  const thisWeekView = $('thisWeekView');
  const thisPayCycleView = $('thisPayCycleView');
  const prevFortnightView = $('prevFortnightView');
  const nextFortnightView = $('nextFortnightView');
  const quickCalendarBtn = $('quickCalendarBtn');
  const quickCalendar = $('quickCalendar');
  const quickCalPrev = $('quickCalPrev');
  const quickCalNext = $('quickCalNext');
  const quickCalMonth = $('quickCalMonth');
  const quickCalYear = $('quickCalYear');
  const quickCalGrid = $('quickCalGrid');
  const quickCalFoot = $('quickCalFoot');
  const editSetupBtn = $('editSetupBtn');
  const diaryHistoryBtn = $('diaryHistoryBtn');
  const experiencePanel = $('experiencePanel');
  const quickModeBtn = $('quickModeBtn');
  const diaryModeBtn = $('diaryModeBtn');
  const experienceStatus = $('experienceStatus');
  const diaryNavEyebrow = $('diaryNavEyebrow');
  const convertQuickToDiaryBtn = $('convertQuickToDiaryBtn');
  const quickConvertNote = $('quickConvertNote');
  const setupPanel = $('setupPanel');
  const currentRosterPosition = $('currentRosterPosition');
  const viewRangeSummary = $('viewRangeSummary');
  const payCheckModal = $('payCheckModal');
  const payCheckClose = $('payCheckClose');
  const payCheckPeriod = $('payCheckPeriod');
  const payCheckExpected = $('payCheckExpected');
  const payCheckActual = $('payCheckActual');
  const payCheckDifference = $('payCheckDifference');
  const payCheckSave = $('payCheckSave');
  const payCheckReopen = $('payCheckReopen');
  const wcHint = $('wcHint');
  const rosterMeta = $('rosterMeta');
  const lineCountHint = $('lineCountHint');
  const hasSwap = $('hasSwap');
  const swapFields = $('swapFields');
  const swapDepot = $('swapDepot');
  const swapRoster = $('swapRoster');
  const swapLine = $('swapLine');
  const sequencePreview = $('sequencePreview');
  const generateBtn = $('generateBtn');
  const outputSection = $('outputSection');
  const rosterOutput = $('rosterOutput');
  const outputTitle = $('outputTitle');
  const calendarViewBtn = $('calendarViewBtn');
  const compactViewBtn = $('compactViewBtn');
  const exportWeeks = $('exportWeeks');
  const downloadIcsBtn = $('downloadIcsBtn');
  const styleSelect = $('styleSelect');
  const hasAnnualLeave = $('hasAnnualLeave');
  const annualLeaveFields = $('annualLeaveFields');
  const annualLeaveDate = $('annualLeaveDate');
  const addAnnualLeaveBtn = $('addAnnualLeaveBtn');
  const addFourAnnualLeaveBtn = $('addFourAnnualLeaveBtn');
  const annualLeaveList = $('annualLeaveList');
  const splitAlternating = $('splitAlternating');
  const splitOr = $('splitOr');
  const splitAnnualLeave = $('splitAnnualLeave');
  const calendarFilesPanel = $('calendarFilesPanel');
  const calendarFileList = $('calendarFileList');
  const calendarBundleActions = $('calendarBundleActions');
  const shareAllCalendarBtn = $('shareAllCalendarBtn');
  const downloadZipBtn = $('downloadZipBtn');
  const annualLeaveWeeks = new Set();
  let preparedCalendarFiles = [];
  let activeViewFrom = '', activeViewTo = '';
  let monthFocusFrom = '', monthFocusTo = '';
  const PAY_VIEW_ANCHOR = '2026-06-14';
  function isoUtc(iso){const [y,m,d]=String(iso||'').split('-').map(Number);return new Date(Date.UTC(y,m-1,d))}
  function daysBetween(a,b){return Math.floor((isoUtc(b)-isoUtc(a))/86400000)}
  function snapPayPeriodIso(iso){const diff=daysBetween(PAY_VIEW_ANCHOR,iso);const blocks=Math.floor(diff/14);return E.addDays(PAY_VIEW_ANCHOR,blocks*14)}
  function moneyAud(v){return new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(Number(v)||0)}
  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch(_){return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));window.RosterBotCloudSync?.notifyLocalChange?.(key)}catch(_){}}
  function hasSavedTimeline(){return Array.isArray(readJson('rosterbot-timeline-v1',[]))&&readJson('rosterbot-timeline-v1',[]).length>0}
  let experienceMode = (()=>{try{const saved=localStorage.getItem('rosterbot-experience-v1');if(saved==='quick'||saved==='diary')return saved}catch(_){}return hasSavedTimeline()?'diary':'quick';})();
  function isDiaryMode(){return experienceMode==='diary'}
  function engineSettingsForView(from){
    const base={...currentSettings(),viewStartDate:from||currentSettings().startDate,experienceMode};
    if(isDiaryMode()) return {...base,timelineMode:'diary',annualLeaveWeeks:readJson('rosterbot-diary-annual-leave-v1',[])};
    return {...base,timelineMode:'quick',rosterTimeline:[],weekOverrides:{},dayOverrides:{},weekLocks:{}};
  }
  function updateExperienceUI(){
    document.documentElement.classList.toggle('quick-mode',!isDiaryMode());document.documentElement.classList.toggle('diary-mode',isDiaryMode());
    quickModeBtn?.classList.toggle('active',!isDiaryMode());diaryModeBtn?.classList.toggle('active',isDiaryMode());
    quickModeBtn?.setAttribute('aria-pressed',String(!isDiaryMode()));diaryModeBtn?.setAttribute('aria-pressed',String(isDiaryMode()));
    if(diaryNavEyebrow)diaryNavEyebrow.textContent=isDiaryMode()?'ROSTER DIARY':'QUICK VIEW';
    const title=$('diary-nav-title');if(title)title.textContent=isDiaryMode()?'Your personal roster timeline':'Quick roster range';
    const posLabel=document.querySelector('.diary-current .setup-collapsed-note');if(posLabel)posLabel.textContent=isDiaryMode()?'Current diary position':'Quick sequence position';
    if(experienceStatus)experienceStatus.textContent=isDiaryMode()?'PERSONAL DIARY active · saved roster history, actual-day records and pay audit tools are enabled.':'QUICK / BASIC active · this setup is a lightweight scenario and does not create or alter your saved roster history.';
    if(generateBtn)generateBtn.textContent=isDiaryMode()?'Display roster':'Display quick roster';
    if(setupPanel)setupPanel.hidden=isDiaryMode();
    if(convertQuickToDiaryBtn){const hasHistory=hasSavedTimeline();convertQuickToDiaryBtn.textContent=hasHistory?'Open my personal diary':'Turn this into my personal diary';if(quickConvertNote)quickConvertNote.textContent=hasHistory?'Your saved personal diary is untouched by this Quick scenario. In Advanced Builder you can also copy the current Quick setup into the diary as a new or earlier period.':'Quick mode stays lightweight. Converting copies this starting roster (and any Quick annual-leave weeks) into the diary; the Quick setup itself remains available separately.';}
  }
  function setExperience(mode,{display=true}={}){
    experienceMode=mode==='diary'?'diary':'quick';try{localStorage.setItem('rosterbot-experience-v1',experienceMode)}catch(_){}updateExperienceUI();saveRosterSession();
    if(display){if(isDiaryMode()){if(hasSavedTimeline())setCurrentPayCycle(true);else{setupPanel.hidden=true;window.RosterBotDiary?.showAdvanced?.();}}else{if(!viewFromDate.value){const w=E.weekCommencing(startDate.value||localTodayIso());viewFromDate.value=w;viewToDate.value=E.addDays(w,13)}generateDisplay(false);}}
  }
  function validRosterSelection(date,depot,roster,line){
    const d=String(date||'').trim(),dep=depot||'SCS',r=String(roster||'').trim(),n=Number(line);
    if(!d||!r||!Number.isInteger(n)||n<1)return false;
    const official=window.RosterOfficial?.rosterObj?.(d,dep,r);
    const fallback=(dep==='SCS'?data.rosters?.[r]:data.depots?.[dep]?.[r])||data.rosters?.[r];
    const count=Number((official||fallback)?.lineCount)||0;
    return count>0&&n<=count;
  }
  function validRosterSettings(st){
    if(!st||!validRosterSelection(st.startDate,st.startDepot||'SCS',st.startRoster,st.startLine))return false;
    if(st.hasSwap&&!validRosterSelection(st.startDate,st.swapDepot||st.startDepot||'SCS',st.swapRoster,st.swapLine))return false;
    return true;
  }
  function ensureBasicTimeline(){
    const existing=readJson('rosterbot-timeline-v1',[]);if(Array.isArray(existing)&&existing.length)return existing;
    const st=currentSettings();if(!validRosterSettings(st))return [];
    const base={id:'base-'+Date.now(),startWC:E.weekCommencing(st.startDate),mode:st.hasSwap?'swap':'single',trackA:{depot:st.startDepot||'SCS',roster:st.startRoster,line:+st.startLine||1},trackB:st.hasSwap?{depot:st.swapDepot||st.startDepot||'SCS',roster:st.swapRoster,line:+st.swapLine||1}:null,createdAt:new Date().toISOString(),source:'basic setup migration'};
    writeJson('rosterbot-timeline-v1',[base]);try{localStorage.setItem('rosterbot-db-schema-v1','4')}catch(_){};return [base];
  }
  function saveCurrentAsMyRoster(){
    const clearPreviewConfirmation=()=>{document.documentElement.classList.remove('v28-onboarding-preview');const confirm=$('v28PreviewConfirm');if(confirm)confirm.hidden=true};
    if(hasSavedTimeline()){clearPreviewConfirmation();setExperience('diary',{display:false});return true}
    const base=ensureBasicTimeline();if(!base.length)return false;
    const onboarding=document.documentElement.classList.contains('v28-onboarding-active');
    writeJson('rosterbot-diary-annual-leave-v1',onboarding?[]:(currentSettings().annualLeaveWeeks||[]));
    clearPreviewConfirmation();setExperience('diary',{display:false});window.RosterBotDiary?.mirrorNow?.();return true;
  }
  function setViewRange(from,to,display=true,{preserveMonthFocus=false}={}){
    if(!from)return;if(!preserveMonthFocus){monthFocusFrom='';monthFocusTo=''}let a=from,b=to||from;if(E.compareIsoDates(b,a)<0)[a,b]=[b,a];viewFromDate.value=a;viewToDate.value=b;if(display)generateDisplay(false);
  }
  function isDisplayDimmedDate(date){const from=monthFocusFrom||activeViewFrom,to=monthFocusTo||activeViewTo;return (from&&E.compareIsoDates(date,from)<0)||(to&&E.compareIsoDates(date,to)>0)}
  function setCurrentWeek(display=true){const today=localTodayIso(),wc=E.weekCommencing(today);setViewRange(wc,E.addDays(wc,6),display)}
  function setCurrentPayCycle(display=true){const start=snapPayPeriodIso(localTodayIso());setViewRange(start,E.addDays(start,13),display);syncQuickCalendar(start)}
  function shiftViewPayCycle(delta){const base=snapPayPeriodIso(viewFromDate.value||localTodayIso()),start=E.addDays(base,delta*14);setViewRange(start,E.addDays(start,13),true);syncQuickCalendar(start)}
  const CAL_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  let quickCalCursor={year:0,month:0},quickCalSelected='';
  function calendarDate(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
  function syncQuickCalendar(date){const iso=date||viewFromDate.value||localTodayIso(),dt=isoUtc(iso);quickCalSelected=iso;quickCalCursor={year:dt.getUTCFullYear(),month:dt.getUTCMonth()};renderQuickCalendar()}
  function fillQuickCalendarSelectors(){if(!quickCalMonth||!quickCalYear)return;if(!quickCalMonth.options.length)CAL_MONTHS.forEach((name,i)=>quickCalMonth.add(new Option(name,String(i))));if(!quickCalYear.options.length){for(let y=1970;y<=2100;y++)quickCalYear.add(new Option(String(y),String(y)));}}
  function renderQuickCalendar(){if(!quickCalGrid)return;fillQuickCalendarSelectors();if(!quickCalCursor.year){const dt=isoUtc(viewFromDate.value||localTodayIso());quickCalCursor={year:dt.getUTCFullYear(),month:dt.getUTCMonth()}}quickCalMonth.value=String(quickCalCursor.month);quickCalYear.value=String(quickCalCursor.year);const first=new Date(Date.UTC(quickCalCursor.year,quickCalCursor.month,1)),firstMonday=(first.getUTCDay()+6)%7,start=new Date(Date.UTC(quickCalCursor.year,quickCalCursor.month,1-firstMonday)),cycleStart=snapPayPeriodIso(quickCalSelected||viewFromDate.value||localTodayIso()),cycleEnd=E.addDays(cycleStart,13),today=localTodayIso();let html='';for(let i=0;i<42;i++){const d=new Date(start.getTime()+i*86400000),iso=calendarDate(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()),other=d.getUTCMonth()!==quickCalCursor.month,dow=d.getUTCDay(),inCycle=E.compareIsoDates(iso,cycleStart)>=0&&E.compareIsoDates(iso,cycleEnd)<=0;html+=`<button type="button" class="quick-calendar-day${other?' other-month':''}${dow===0||dow===6?' weekend':''}${inCycle?' in-pay-cycle':''}${iso===cycleStart?' pay-start':''}${iso===cycleEnd?' pay-end':''}${iso===quickCalSelected?' selected-day':''}${iso===today?' today':''}" data-quick-cal-date="${iso}" aria-label="${E.formatDateLong(iso)}">${d.getUTCDate()}</button>`}quickCalGrid.innerHTML=html;if(quickCalFoot)quickCalFoot.textContent=`PAY CYCLE ${E.formatDateShort(cycleStart)} – ${E.formatDateShort(cycleEnd)} · choose any date to jump.`}
  function moveQuickCalendarMonth(delta){let y=quickCalCursor.year,m=quickCalCursor.month+delta;y+=Math.floor(m/12);m=((m%12)+12)%12;quickCalCursor={year:y,month:m};renderQuickCalendar()}
  function openQuickCalendar(){if(!quickCalendar)return;const opening=quickCalendar.hidden;if(opening){syncQuickCalendar(viewFromDate.value||localTodayIso());quickCalendar.hidden=false;quickCalendarBtn?.setAttribute('aria-expanded','true')}else{quickCalendar.hidden=true;quickCalendarBtn?.setAttribute('aria-expanded','false')}}
  function closeQuickCalendar(){if(!quickCalendar)return;quickCalendar.hidden=true;quickCalendarBtn?.setAttribute('aria-expanded','false')}
  function chooseQuickCalendarDate(iso){quickCalSelected=iso;const start=snapPayPeriodIso(iso);setViewRange(start,E.addDays(start,13),true);const dt=isoUtc(iso);quickCalCursor={year:dt.getUTCFullYear(),month:dt.getUTCMonth()};renderQuickCalendar()}


  function applyTheme(theme) {
    const chosen = ['1', '2', '3', '4', '5', '6', '7'].includes(String(theme)) ? String(theme) : '1';
    document.documentElement.dataset.theme = chosen;
    styleSelect.value = chosen;
    const themeColours = { '1':'#0b5364', '2':'#111315', '3':'#0b3a70', '4':'#e6531d', '5':'#c7353c', '6':'#6f3489', '7':'#202020' };
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColours[chosen] || '#0b5364');
    try { localStorage.setItem('rosterbot-theme-v1.9', chosen); } catch (_) {}
  }

  function initialiseTheme() {
    let saved = '1';
    try {
      saved = localStorage.getItem('rosterbot-theme-v1.9');
      if (!saved) {
        const old = localStorage.getItem('rosterbot-theme-v1.8') || localStorage.getItem('rosterbot-theme-v1.7');
        saved = ({ '1':'1', '2':'2', '3':'6', '4':'4' })[old] || '';
      }
      if (!saved) {
        const legacy = localStorage.getItem('rosterbot-theme');
        saved = ({ '1':'2', '2':'1', '3':'6' })[legacy] || '1';
      }
    } catch (_) { saved = '1'; }
    applyTheme(saved);
  }

  function localTodayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function depotNames(date=startDate.value||localTodayIso()){return window.RosterOfficial?.depotNames?.(date)||['SCS']}
  function rosterNames(depot=startDepot?.value||'SCS',date=startDate.value||localTodayIso()){return window.RosterOfficial?.rosterNames?.(date,depot)||[]}
  function populateDepotSelect(select,preferred,date=startDate.value||localTodayIso()){if(!select)return;const current=preferred||select.value||'SCS',names=depotNames(date);select.replaceChildren();for(const name of names){const opt=new Option(name==='SCS'?'Southern Cross (SCS)':name,name);select.add(opt)}select.value=names.includes(current)?current:(names.includes('SCS')?'SCS':names[0]||'SCS')}
  function populateRosterSelect(select, preferred, depot=startDepot?.value||'SCS', date=startDate.value||localTodayIso()) {const current=preferred||select.value,names=rosterNames(depot,date);select.replaceChildren();for(const name of names){const opt=new Option(name==='FLEX'?'Flex':name==='MAIN'?'Main rotation':name==='CABCOM'?'Cab Committee':`${name} Roster`,name);select.add(opt)}if(names.includes(current))select.value=current;else if(names.length)select.value=names[0]}
  function populateLineSelect(select, rosterName, preferredLine, depot=startDepot?.value||'SCS', date=startDate.value||localTodayIso()) {const count=window.RosterOfficial?.lineCount?.(date,depot,rosterName)||data.rosters?.[rosterName]?.lineCount||1,old=parseInt(preferredLine??select.value,10);select.replaceChildren();for(let i=1;i<=count;i++)select.add(new Option(String(i),String(i)));select.value=String(Number.isFinite(old)?Math.min(count,Math.max(1,old)):1)}

  function formatMetaDate(iso) {
    return iso ? E.formatDateLong(iso) : 'unknown';
  }

  function updateStartHints() {try{wcHint.textContent=`WC ${E.formatDateLong(E.weekCommencing(startDate.value))}`}catch(_){wcHint.textContent='WC —'}const depot=startDepot?.value||'SCS',r=window.RosterOfficial?.rosterObj?.(startDate.value,depot,startRoster.value),count=r?.lineCount||0;lineCountHint.textContent=`${count} line${count===1?'':'s'} in this roster`;const ds=window.RosterOfficial?.datasetKey?.(startDate.value)||'No dataset';rosterMeta.textContent=`${depot} · ${ds}${startRoster.value==='FLEX'?` · ${window.RosterOfficial?.flexVersion?.(startDate.value)?.source||'FLEX'}`:''}`}


  function initialRosterViewMode() {
    try {
      const saved = localStorage.getItem('rosterbot-view-mode-v1');
      if (saved === 'calendar' || saved === 'compact') return saved;
    } catch (_) {}
    // Calendar is the product default on every screen size. A user-selected
    // compact preference is still preserved above when it exists.
    return 'calendar';
  }

  let rosterViewMode = initialRosterViewMode();

  function updateRosterViewButtons() {
    calendarViewBtn?.setAttribute('aria-pressed', String(rosterViewMode === 'calendar'));
    compactViewBtn?.setAttribute('aria-pressed', String(rosterViewMode === 'compact'));
    rosterOutput?.classList.toggle('compact-mode', rosterViewMode === 'compact');    $('homeCalendarView')?.classList.toggle('active',rosterViewMode==='calendar');$('homeCompactView')?.classList.toggle('active',rosterViewMode==='compact');
  }

  function setRosterViewMode(mode, persist = true) {
    rosterViewMode = mode === 'compact' ? 'compact' : 'calendar';
    if (persist) {
      try { localStorage.setItem('rosterbot-view-mode-v1', rosterViewMode); } catch (_) {}
    }
    updateRosterViewButtons();
    if (!outputSection.hidden) generateDisplay(false);
  }

  function currentSettings() {
    return {
      startDate: startDate.value,
      startDepot: startDepot?.value || 'SCS',
      startRoster: startRoster.value,
      startLine: Number.parseInt(startLine.value, 10),
      hasSwap: hasSwap.checked,
      swapDepot: swapDepot?.value || startDepot?.value || 'SCS',
      swapRoster: swapRoster.value,
      swapLine: Number.parseInt(swapLine.value, 10),
      annualLeaveWeeks: hasAnnualLeave.checked ? Array.from(annualLeaveWeeks).sort() : []
    };
  }

  function saveRosterSession() {
    if(document.documentElement.classList.contains('v28-lookup-active')) return;
    try { localStorage.setItem('rosterbot-session-settings-v1', JSON.stringify({ ...currentSettings(), experienceMode, displayWeeks:Math.min(5200,Math.max(1,Number.parseInt(displayWeeks.value,10)||1)), lastViewedFrom:viewFromDate?.value||'', lastViewedTo:viewToDate?.value||'' })); } catch (_) {}
  }

  function restoreRosterSession() {
    let saved=null;
    try { saved=JSON.parse(localStorage.getItem('rosterbot-session-settings-v1') || localStorage.getItem('rosterbot-shared-settings-v1') || 'null'); } catch (_) {}
    if(!saved || !validRosterSettings({...saved,startDepot:saved.startDepot||'SCS',swapDepot:saved.swapDepot||saved.startDepot||'SCS'})) return false;
    startDate.value=saved.startDate; populateDepotSelect(startDepot,saved.startDepot||'SCS',saved.startDate); populateRosterSelect(startRoster,saved.startRoster,startDepot.value,saved.startDate); populateLineSelect(startLine,startRoster.value,saved.startLine||1,startDepot.value,saved.startDate);
    hasSwap.checked=!!saved.hasSwap; swapFields.hidden=!hasSwap.checked; populateDepotSelect(swapDepot,saved.swapDepot||saved.startDepot||'SCS',saved.startDate); populateRosterSelect(swapRoster,saved.swapRoster||'C',swapDepot.value,saved.startDate); populateLineSelect(swapLine,swapRoster.value,saved.swapLine||1,swapDepot.value,saved.startDate);
    displayWeeks.value=String(Math.min(5200,Math.max(1,Number.parseInt(saved.displayWeeks,10)||1))); annualLeaveWeeks.clear(); for(const wc of (saved.annualLeaveWeeks||[])) annualLeaveWeeks.add(wc);
    hasAnnualLeave.checked=annualLeaveWeeks.size>0; annualLeaveFields.hidden=!hasAnnualLeave.checked; annualLeaveDate.value=annualLeaveWeeks.size?Array.from(annualLeaveWeeks).sort()[0]:E.weekCommencing(startDate.value);
    renderAnnualLeaveList(); updateStartHints(); updateSequencePreview(); return true;
  }

  function updateSequencePreview() {if(!hasSwap.checked)return;try{const st=currentSettings(),out=[];let a=+st.startLine||1,b=+st.swapLine||1;for(let i=0;i<8;i++){const useA=i%2===0,depot=useA?st.startDepot:st.swapDepot,roster=useA?st.startRoster:st.swapRoster,line=useA?a:b;out.push(`${depot==='SCS'?'':depot+' · '}${roster==='MAIN'?'LINE':roster} ${line}`);const count=window.RosterOfficial?.lineCount?.(st.startDate,depot,roster)||1;if(useA)a=((a-1+2)%count)+1;else b=((b-1+2)%count)+1}sequencePreview.textContent=out.join('  →  ')}catch(err){sequencePreview.textContent=err.message}}

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function clearPreparedCalendarFiles() {
    preparedCalendarFiles = [];
    if (calendarFilesPanel) calendarFilesPanel.hidden = true;
    if (calendarBundleActions) calendarBundleActions.hidden = true;
    if (calendarFileList) calendarFileList.replaceChildren();
  }

  function updateExportOptionStates() {
    const includeOr = selectedRadio('orMode') === 'allDay';
    splitOr.disabled = !includeOr;
    if (!includeOr) splitOr.checked = false;
    const hasLeave = hasAnnualLeave.checked && annualLeaveWeeks.size > 0;
    splitAnnualLeave.disabled = !hasLeave;
    if (!hasLeave) splitAnnualLeave.checked = false;
  }

  function renderAnnualLeaveList() {
    annualLeaveList.replaceChildren();
    const weeks = Array.from(annualLeaveWeeks).sort();
    if (!weeks.length) {
      const empty = document.createElement('span');
      empty.className = 'leave-empty';
      empty.textContent = 'No annual leave weeks added yet.';
      annualLeaveList.appendChild(empty);
    } else {
      for (const wc of weeks) {
        const chip = document.createElement('span');
        chip.className = 'leave-chip';
        chip.innerHTML = `<span>WC ${escapeHtml(E.formatDateLong(wc))}</span><button type="button" aria-label="Remove annual leave WC ${escapeHtml(E.formatDateLong(wc))}" data-remove-leave="${wc}">×</button>`;
        annualLeaveList.appendChild(chip);
      }
    }
    updateExportOptionStates();
    clearPreparedCalendarFiles();
  }

  function addAnnualLeaveWeek() {
    if (!annualLeaveDate.value) return;
    const wc = E.weekCommencing(annualLeaveDate.value);
    annualLeaveWeeks.add(wc);
    annualLeaveDate.value = wc;
    hasAnnualLeave.checked = true;
    annualLeaveFields.hidden = false;
    renderAnnualLeaveList();
    saveRosterSession();
    refreshDisplayIfVisible();
  }

  function refreshDisplayIfVisible() {
    if (!outputSection.hidden) generateDisplay(false);
  }

  function renderCell(cell, isPreStart, day) {
    const preClass = isPreStart ? ' pre-start' : '';
    const actual = day?.actualOverride || null;
    if (actual) {
      const rosterDuty = cell?.type==='shift' ? (cell.shift||'SHIFT') : cell?.type==='off' ? 'OR' : cell?.type==='alr' ? 'ALR' : 'NO DATA';
      const rosterTime = cell?.start ? `${cell.start}${cell.finish?`–${cell.finish}`:''}` : '';
      const note = `<div class="actual-roster-note">Originally rostered: <span class="actual-rostered-strike">${escapeHtml(rosterDuty)}${rosterTime?` · ${escapeHtml(rosterTime)}`:''}</span></div>`;
      const statusLabel = {or:'OR',annual:'ANNUAL LEAVE',personal:'PERSONAL LEAVE',ph_credit:'PH DAYS LEAVE',unpaid:'UNPAID LEAVE',worked_or:'OR WORKED',alr:'ALR'}[actual.status] || '';
      if (!['worked','worked_or'].includes(actual.status)) {
        return `<div class="roster-cell${actual.status==='or'?' off':''}${preClass}"><div class="cell-special">${escapeHtml(statusLabel||actual.status||'ACTUAL')}<span class="actual-marker">*</span></div>${note}</div>`;
      }
      const duty = actual.actualCode || cell?.shift || 'WORKED';
      const time = actual.actualStart ? `<div class="cell-time-range"><span class="time-start">${escapeHtml(actual.actualStart)}</span>${actual.actualEnd?`<span class="time-sep"> – </span><span class="time-finish">${escapeHtml(actual.actualEnd)}</span>`:''}</div>` : '';
      const duration = actual.actualStart && actual.actualEnd ? `<div class="cell-duration">${escapeHtml(payableRosterDurationLabel(day,cell))}</div>` : '';
      return `<div class="roster-cell${preClass}"><div class="cell-shift">${escapeHtml(duty)}<span class="actual-marker">*</span></div>${time}${duration}${note}</div>`;
    }
    if (cell.type === 'off') return `<div class="roster-cell off${preClass}"><div class="cell-special">OR</div></div>`;
    if (cell.type === 'alr') return `<div class="roster-cell alr${preClass}"><div class="cell-special">ALR</div></div>`;
    if (cell.type === 'ph') return `<div class="roster-cell${preClass}"><div class="cell-special">PH</div><div class="ph-conversion-note">${escapeHtml(cell.details?.[0]||'Public holiday conversion')}</div></div>`;
    if (cell.type === 'av') return `<div class="roster-cell${preClass}"><div class="cell-special">AV${cell.start?` · ${escapeHtml(cell.start)}`:''}</div><div class="ph-conversion-note">${escapeHtml(cell.details?.[0]||'Public holiday available')}</div></div>`;
    if (cell.type === 'shift') {
      const shift = cell.shift ? `<div class="cell-shift">${escapeHtml(cell.shift)}</div>` : '';
      const displayFinish = cell.finish || (cell.start ? addClockHours(cell.start,8) : '');
      const time = cell.finish ? `<div class="cell-time-range"><span class="time-start">${escapeHtml(cell.start)}</span><span class="time-sep"> – </span><span class="time-finish">${escapeHtml(cell.finish)}</span></div>` : `<div class="cell-time">${escapeHtml(cell.start)}</div>`;
      const duration = cell.start && displayFinish ? `<div class="cell-duration">${escapeHtml(cell.bookHours||durationLabel(cell.start,displayFinish))}</div>` : '';
      const assumed = cell.finishSource === 'assumed-8h-old-d' ? `<div class="cell-finish-assumed">8h finish assumed</div>` : '';
      const details = (cell.details || []).map(d => `<div class="cell-detail">${escapeHtml(d)}</div>`).join('');
      const conv=cell.phConversion?`<div class="ph-conversion-note">PH conversion · normally ${escapeHtml(cell.phConversion.original?.shift||'roster')} ${escapeHtml(cell.phConversion.original?.start||'')}</div>`:'';const warn=cell.conversionWarning?`<div class="conversion-warning">⚠ ${escapeHtml(cell.conversionWarning)}</div>`:'';return `<div class="roster-cell${preClass}">${shift}${time}${duration}${assumed}${details}${conv}${warn}</div>`;
    }
    const raw = (cell.raw || []).map(x => escapeHtml(x)).join('<br>');
    return `<div class="roster-cell${preClass}"><div class="cell-detail">${raw}</div></div>`;
  }


  function addClockHours(hhmm, hoursToAdd) {
    if (!/^\d{2}:\d{2}$/.test(String(hhmm || ''))) return '';
    const [h,m] = hhmm.split(':').map(Number);
    const total = ((h * 60 + m + Math.round(hoursToAdd * 60)) % 1440 + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
  }

  function durationLabel(start, finish) {
    if (!start || !finish) return '—';
    const [sh,sm] = start.split(':').map(Number), [eh,em] = finish.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 1440;
    return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2,'0')}`;
  }

  function payableRosterDurationLabel(day,cell){
    const actual=day?.actualOverride||null;if(!actual||!['worked','worked_or'].includes(actual.status))return cell?.bookHours||durationLabel(cell?.start,cell?.finish);
    const code=String(actual.actualCode||cell?.shift||'').trim(),start=actual.actualStart||cell?.start||'',finish=actual.actualEnd||cell?.finish||'';
    if(!start||!finish)return '—';
    let rec=null;
    if(/^SP\d/i.test(code)){
      const matches=window.RosterOfficial?.searchJobs?.(day.date,code,80)||[];
      rec=matches.find(r=>String(r.code).toUpperCase()===code.toUpperCase()&&r.start===start)||matches.find(r=>String(r.code).toUpperCase()===code.toUpperCase())||null;
    }
    const parseH=v=>{const m=String(v||'').match(/^(\d+)h(\d{1,2})$/i);return m?(+m[1])*60+(+m[2]):0};
    const book=parseH(rec?.hours||cell?.bookHours);if(!book)return durationLabel(start,finish);
    const toM=t=>{const [h,m]=String(t||'').split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null};
    const span=(a,b)=>{let x=toM(a),y=toM(b);if(x==null||y==null)return 0;if(y<=x)y+=1440;return y-x};
    const official=span(rec?.start||cell?.start,rec?.end||cell?.finish)||book;let actualSpan=span(start,finish);
    if(window.RosterOfficial?.datasetKey?.(day.date)==='FP67'&&code.toUpperCase()==='SP215'&&start==='15:34'&&finish==='23:36'&&(rec?.end||cell?.finish)==='23:34'&&book===480)actualSpan=official;
    const paid=book+Math.max(0,actualSpan-official);return `${Math.floor(paid/60)}h${String(paid%60).padStart(2,'0')}`;
  }

  function payPeriodGroups(weeks){
    const groups=[];
    for(const week of weeks){const start=snapPayPeriodIso(week.wcDate);let g=groups.find(x=>x.start===start);if(!g){g={start,end:E.addDays(start,13),weeks:[]};groups.push(g)}g.weeks.push(week)}
    return groups;
  }
  function payCheckMap(){return readJson('rosterbot-pay-checks-v1',{})}
  const FORTNIGHT_ALLOWANCE_KEY='rosterbot-fortnight-allowances-v1';
  const FORTNIGHT_NOTES_KEY='rosterbot-fortnight-notes-v1';
  let fortnightNoteMirrorTimer=0;
  function fortnightNotesMap(){return readJson(FORTNIGHT_NOTES_KEY,{})}
  function fortnightNote(start){return String(fortnightNotesMap()[start]||'')}
  function saveFortnightNote(start,value){const map=fortnightNotesMap(),v=String(value||'').slice(0,1000);if(v.trim())map[start]=v;else delete map[start];writeJson(FORTNIGHT_NOTES_KEY,map);clearTimeout(fortnightNoteMirrorTimer);fortnightNoteMirrorTimer=setTimeout(()=>window.RosterBotDiary?.mirrorNow?.(),250)}
  function fortnightNotesHtml(start){const note=fortnightNote(start);return `<details class="fortnight-notes"${note?' open':''}><summary>Fortnight notes${note?' · saved':''}</summary><div class="fortnight-notes-body"><textarea data-fn-note="${escapeHtml(start)}" maxlength="1000" placeholder="Notes for this pay fortnight — pay questions, roster changes, things to follow up…">${escapeHtml(note)}</textarea><small class="fortnight-notes-status">Saved automatically in your local RosterBot diary and backup · 1000 character maximum.</small></div></details>`}
  function fortnightAllowanceMap(){return readJson(FORTNIGHT_ALLOWANCE_KEY,{})}
  function fortnightAllowanceClaims(start){const x=fortnightAllowanceMap()[start]||{};return {A641:Math.max(0,+x.A641||0),A703:Math.max(0,+x.A703||0),A700:Math.max(0,+x.A700||0),customLabel:String(x.customLabel||''),customQty:Math.max(0,+x.customQty||0),customRate:Math.max(0,+x.customRate||0)}}
  function saveFortnightAllowanceField(start,field,value){const map=fortnightAllowanceMap(),x=map[start]||{};if(field==='customLabel')x[field]=String(value||'').slice(0,120).trim();else x[field]=Math.max(0,+value||0);map[start]=x;writeJson(FORTNIGHT_ALLOWANCE_KEY,map);refreshPayPreviews()}
  function legacyFortnightClaims(group){const out={A641:0,A703:0,A700:0};for(const w of group?.weeks||[])for(const d of w.days||[]){const a=d.actualOverride?.allowances||{};Object.keys(out).forEach(code=>{if(a?.[code]?.on)out[code]+=Math.max(0,+a[code].qty||0)})}return out}
  function fortnightAllowanceHtml(start,group){const c=fortnightAllowanceClaims(start),legacy=legacyFortnightClaims(group),legacyText=Object.entries(legacy).filter(([,q])=>q>0).map(([code,q])=>`${code} × ${q}`).join(' · ');return `<details class="fortnight-allowances"><summary>Fortnight allowances / claims</summary><div class="fortnight-allowance-grid"><div class="fortnight-allowance-item"><label><strong>A641 · Rest Job Meals</strong><span>Quantity for this fortnight</span><input type="number" min="0" step="1" value="${c.A641}" data-fn-allow="A641" data-fn-start="${escapeHtml(start)}"></label></div><div class="fortnight-allowance-item"><label><strong>A703 · T&amp;I Meals</strong><span>Quantity for this fortnight</span><input type="number" min="0" step="1" value="${c.A703}" data-fn-allow="A703" data-fn-start="${escapeHtml(start)}"></label></div><div class="fortnight-allowance-item"><label><strong>A700/A701 · T&amp;I Beds</strong><span>Quantity for this fortnight</span><input type="number" min="0" step="1" value="${c.A700}" data-fn-allow="A700" data-fn-start="${escapeHtml(start)}"></label></div><div class="fortnight-allowance-item fortnight-allowance-custom"><label><strong>Travel / other claim</strong><span>Description</span><input type="text" value="${escapeHtml(c.customLabel)}" placeholder="e.g. Travel allowance" maxlength="120" data-fn-allow="customLabel" data-fn-start="${escapeHtml(start)}"></label><label><strong>Units</strong><span>Qty</span><input type="number" min="0" step="0.01" value="${c.customQty}" data-fn-allow="customQty" data-fn-start="${escapeHtml(start)}"></label><label><strong>Rate</strong><span>$ per unit</span><input type="number" min="0" step="0.01" value="${c.customRate}" data-fn-allow="customRate" data-fn-start="${escapeHtml(start)}"></label></div></div><div class="fortnight-allowance-note">Wasted meals stay attached to the actual day. Existing older day-linked Rest/T&amp;I claims remain preserved and continue to calculate.${legacyText?` Existing day-linked claims here: ${legacyText}.`:''}</div></details>`}
  function payDetailPanelHtml(start){return `<div class="unified-pay-details" data-pay-detail-panel="${escapeHtml(start)}" hidden></div>`}
  function payFooter(group){
    const check=isDiaryMode()?payCheckMap()[group.start]:null;
    return `<section class="fortnight-pay-footer" data-pay-preview="${escapeHtml(group.start)}"><div class="fortnight-pay-values"><span>EXPECTED ENTITLEMENT</span><strong data-pay-gross>Calculating…</strong><span data-pay-actual-label ${check?'':'hidden'}>PAID THIS PAYSLIP</span><strong data-pay-actual ${check?'':'hidden'}>${check?moneyAud(check.actualGross):'—'}</strong><span data-pay-diff-label ${check?'':'hidden'}>VARIANCE</span><strong class="pay-difference" data-pay-diff ${check?'':'hidden'}>${check?moneyAud((+check.actualGross||0)-(+check.grossAtCheck||0)):'—'}</strong></div><div class="fortnight-pay-actions"><button type="button" class="secondary" data-pay-details="${escapeHtml(group.start)}">Pay details</button>${isDiaryMode()?`<button type="button" class="secondary" data-pay-check="${escapeHtml(group.start)}">${check?'View pay check':'Check payslip'}</button>`:''}</div><div class="pay-check-status${check?' checked':''}" data-pay-status>${isDiaryMode()?(check?`Checked ${new Date(check.checkedAt).toLocaleDateString('en-AU')}`:'Live calculation · updates automatically as the roster diary changes'):'Quick calculation · updates automatically.'}</div>${fortnightAllowanceHtml(group.start,group)}${fortnightNotesHtml(group.start)}${payDetailPanelHtml(group.start)}</section>`;
  }
  function inlinePayDetails(start,mode='summary'){
    const panel=rosterOutput.querySelector(`[data-pay-detail-panel="${start}"]`),res=window.PayBotCombined?.previewFortnight?.(start);if(!panel||!res?.available)return;
    const tabs=`<div class="pay-detail-tabs"><button type="button" class="secondary ${mode==='summary'?'active':''}" data-pay-detail-tab="summary" data-start="${start}">Summary</button><button type="button" class="secondary ${mode==='breakdown'?'active':''}" data-pay-detail-tab="breakdown" data-start="${start}">Breakdown</button><button type="button" class="secondary ${mode==='daily'?'active':''}" data-pay-detail-tab="daily" data-start="${start}">Day by day</button></div>`;
    if(mode==='summary'){
      const rate=window.PayBotCombined?.rateForPeriod?.(start,'PB205');
      panel.innerHTML=tabs+`<div class="pay-detail-summary"><div><span>EXPECTED GROSS</span><strong>${moneyAud(res.gross)}</strong></div><div><span>ADDITIONAL PAY EQUIV.</span><strong>${Number(res.extraEq||0).toFixed(2)} h</strong></div><div><span>PH CREDIT MOVEMENT</span><strong>${res.phMove>=0?'+':''}${Number(res.phMove||0).toFixed(2)} h</strong></div></div><div class="fortnight-allowance-note">PB205 entitlement APR ${rate?.rate?`$${Number(rate.rate).toFixed(4)}/hr`:'—'} · pay calculation updates automatically from the roster diary.</div>`;
    }else if(mode==='breakdown'){
      panel.innerHTML=tabs+`<table class="inline-pay-table"><thead><tr><th>Pay element</th><th>Hours / units</th><th>Rate</th><th>Value</th></tr></thead><tbody>${(res.arr||[]).map(e=>`<tr><td>${escapeHtml(e.label)}</td><td>${Number(e.qty||0).toFixed(e.kind==='occasion'?0:4)}</td><td>$${Number(e.rate||0).toFixed(4)}</td><td>${moneyAud(e.value)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">Expected gross</th><th>${moneyAud(res.gross)}</th></tr></tfoot></table>`;
    }else{
      const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      panel.innerHTML=tabs+`<div class="inline-daily">${(res.daily||[]).map(d=>{const dt=new Date(d.date+'T00:00:00Z'),items=(d.items||[]).length?(d.items||[]).map(x=>x.entitlement?`${escapeHtml(x.label)}`:`${escapeHtml(x.label)}${x.qty!=null?` · ${Number(x.qty).toFixed(4)}h`:''}${x.value!=null?` · ${moneyAud(x.value)}`:''}`).join('<br>'):'No pay items';const total=(d.items||[]).filter(x=>!x.entitlement).reduce((a,x)=>a+(+x.value||0),0);return `<div class="inline-daily-row"><div><strong>${dayNames[dt.getUTCDay()]} ${dt.getUTCDate()}/${dt.getUTCMonth()+1}</strong><br><small>${escapeHtml(d.date)}</small></div><div>${items}</div><strong>${moneyAud(total)}</strong></div>`}).join('')}</div>`;
    }
    panel.hidden=false;
  }


  function renderFortnightGroup(group,selectedStartDate){
    const weeksHtml=group.weeks.map(w=>rosterViewMode==='compact'?renderCompactWeek(w,selectedStartDate):renderWeek(w,selectedStartDate)).join('');
    return `<section class="fortnight-group" data-pay-period="${escapeHtml(group.start)}"><div class="fortnight-group-head"><div><div class="eyebrow">PAY FORTNIGHT</div><strong>${escapeHtml(E.formatDateLong(group.start))} – ${escapeHtml(E.formatDateLong(group.end))}</strong></div></div>${weeksHtml}${payFooter(group)}</section>`;
  }
  function refreshPayPreviews(){
    const fn=window.PayBotCombined?.previewFortnight;if(!fn)return;
    rosterOutput.querySelectorAll('[data-pay-preview]').forEach(box=>{
      const start=box.dataset.payPreview,res=fn(start),grossEl=box.querySelector('[data-pay-gross]'),statusEl=box.querySelector('[data-pay-status]'),btn=box.querySelector('[data-pay-check]'),check=isDiaryMode()?payCheckMap()[start]:null;
      const actualLabel=box.querySelector('[data-pay-actual-label]'),actualEl=box.querySelector('[data-pay-actual]'),diffLabel=box.querySelector('[data-pay-diff-label]'),diffEl=box.querySelector('[data-pay-diff]');
      if(!res?.available){grossEl.textContent='—';statusEl.textContent=res?.reason||'Pay preview unavailable';if(btn)btn.disabled=true;return}
      if(res.unresolved>0){grossEl.textContent='—';statusEl.textContent=`${isDiaryMode()?'Roster diary':'Roster data'} incomplete for ${res.unresolved} day${res.unresolved===1?'':'s'} in this pay cycle.`;if(btn)btn.disabled=true;return}
      grossEl.textContent=moneyAud(res.gross);if(btn)btn.disabled=false;box.dataset.previewGross=String(res.gross);
      let note=res.unconfirmedPH?` · ${res.unconfirmedPH} public holiday status${res.unconfirmedPH===1?'':'es'} need confirmation`:(isDiaryMode()?' · live diary calculation':' · live quick calculation');
      if(check){
        const actual=+check.actualGross||0,snapshot=+check.grossAtCheck||0,diff=Math.round((actual-snapshot)*100)/100,currentChanged=Math.round((res.gross-snapshot)*100)/100;
        [actualLabel,actualEl,diffLabel,diffEl].forEach(el=>{if(el)el.hidden=false});if(actualEl)actualEl.textContent=moneyAud(actual);if(diffEl){diffEl.textContent=`${diff>0?'+':''}${moneyAud(diff)}`;diffEl.classList.toggle('negative',diff<-.004);diffEl.classList.toggle('positive',diff>.004)}
        statusEl.classList.add('checked');statusEl.textContent=`Checked ${new Date(check.checkedAt).toLocaleDateString('en-AU')} · expected snapshot ${moneyAud(snapshot)}${Math.abs(currentChanged)>=.01?` · current expected changed ${currentChanged>0?'+':''}${moneyAud(currentChanged)}`:''}${note}`;if(btn)btn.textContent='View pay check';
      } else {
        [actualLabel,actualEl,diffLabel,diffEl].forEach(el=>{if(el)el.hidden=true});statusEl.classList.remove('checked');statusEl.textContent=`Open · ${res.grade} · ${res.grade==='PB205'?('$'+Number(res.apr).toFixed(4)):moneyAud(res.apr)}/hr${note}`;if(btn)btn.textContent='Check payslip';
      }
    });
  }
  let checkingPayStart='';
  function updatePayCheckDifference(){const expected=Number(payCheckExpected?.dataset.value||0),raw=String(payCheckActual?.value??'').trim();if(!raw){payCheckDifference.textContent='—';payCheckDifference.className='';return}const actual=Number(raw);if(!Number.isFinite(actual)){payCheckDifference.textContent='—';payCheckDifference.className='';return}const diff=Math.round((actual-expected)*100)/100;payCheckDifference.textContent=`${diff>0?'+':''}${moneyAud(diff)}`;payCheckDifference.className=`pay-difference${diff<-.004?' negative':diff>.004?' positive':''}`}
  function showPayCheck(start){const box=rosterOutput.querySelector(`[data-pay-preview="${start}"]`),expected=Number(box?.dataset.previewGross),check=payCheckMap()[start];if(!Number.isFinite(expected)){alert('Expected pay is not available for this fortnight yet.');return}checkingPayStart=start;payCheckPeriod.textContent=`${E.formatDateLong(start)} – ${E.formatDateLong(E.addDays(start,13))}`;payCheckExpected.textContent=moneyAud(expected);payCheckExpected.dataset.value=String(expected);payCheckActual.value=check?.actualGross!=null?String(check.actualGross):'';payCheckSave.textContent=check?'Update checked pay':'Mark pay checked';payCheckReopen.hidden=!check;updatePayCheckDifference();payCheckModal.hidden=false;document.body.classList.add('feedback-modal-open');setTimeout(()=>payCheckActual.focus(),0)}
  function hidePayCheck(){payCheckModal.hidden=true;document.body.classList.remove('feedback-modal-open');checkingPayStart=''}
  function savePayCheck(){if(!checkingPayStart)return;const expected=Number(payCheckExpected.dataset.value),raw=String(payCheckActual.value??'').trim();if(!raw){alert('Enter the gross amount shown on the payslip.');return}const actual=Number(raw);if(!Number.isFinite(actual)||actual<0){alert('Enter the gross amount shown on the payslip.');return}const map=payCheckMap();map[checkingPayStart]={checkedAt:new Date().toISOString(),grossAtCheck:expected,actualGross:Math.round(actual*100)/100};writeJson('rosterbot-pay-checks-v1',map);hidePayCheck();refreshPayPreviews();updateHomeDashboard(window.ROSTERBOT_SHARED?.weeks||[]);window.RosterBotDiary?.mirrorNow?.()}
  function clearPayCheck(){if(!checkingPayStart)return;const map=payCheckMap();delete map[checkingPayStart];writeJson('rosterbot-pay-checks-v1',map);hidePayCheck();refreshPayPreviews();updateHomeDashboard(window.ROSTERBOT_SHARED?.weeks||[]);window.RosterBotDiary?.mirrorNow?.()}

  function updateDiaryPosition(){
    if(!currentRosterPosition)return;if(isDiaryMode()&&!hasSavedTimeline()){currentRosterPosition.textContent='Roster history not configured';return}try{const today=localTodayIso(),one=E.buildWeeks(data,engineSettingsForView(today),1)?.[0];if(one&&!one.timelineMissing){currentRosterPosition.textContent=`${one.depot&&one.depot!=='SCS'?one.depot+' · ':''}${one.roster}${one.line} · WC ${E.formatDateLong(one.wcDate)}`;return}}catch(_){}currentRosterPosition.textContent=isDiaryMode()?'Roster history not configured':'Quick sequence unavailable';
  }

  function renderCompactDay(day, week, selectedStartDate) {
    const pre = week.weekIndex === 0 && E.compareIsoDates(day.date, selectedStartDate) < 0;
    const outside = isDisplayDimmedDate(day.date);
    const isToday = day.date===localTodayIso();
    const c = day.cell || {};
    const preClass = `${pre ? ' pre-start' : ''}${outside?' range-outside':''}${isToday?' today-marker':''}`;
    const dateText = E.formatDateShort(day.date);
    let duty = '—', time = '—', badge = '', finish = c.finish || '', assumed = false, details = '', fullJob = '', corridor = '';

    if (c.type === 'off') {
      duty = 'OR';
      badge = '<span class="compact-badge or">OR</span>';
    } else if (c.type === 'alr') {
      duty = 'ALR';
      badge = '<span class="compact-badge alr">ALR</span>';
    } else if (c.type === 'shift') {
      duty = c.shift || (week.roster === 'FLEX' ? 'FLEX' : 'SHIFT');
      if (c.start && !finish) { finish = addClockHours(c.start, 8); assumed = true; }
      time = c.start ? (finish ? `${c.start}–${finish}` : c.start) : '—';
      details = (c.details || []).join(' · ');
      fullJob = c.bookContents || '';
      corridor = c.bookCorridor || '';
    } else {
      const raw = (c.raw || []).filter(Boolean);
      duty = raw[0] || '—';
      details = raw.slice(1).join(' · ');
    }

    let actualDetail = '';
    const actual = day.actualOverride || null;
    if (actual) {
      const rosterDuty = c.type==='shift' ? (c.shift||'SHIFT') : c.type==='off' ? 'OR' : c.type==='alr' ? 'ALR' : 'NO DATA';
      const rosterTime = c.start ? `${c.start}${finish?`–${finish}`:''}` : '—';
      const statusLabel = {or:'OR',annual:'ANNUAL LEAVE',personal:'PERSONAL LEAVE',ph_credit:'PH DAYS LEAVE',unpaid:'UNPAID LEAVE',worked_or:'OR WORKED',alr:'ALR'}[actual.status] || 'WORKED';
      if (['worked','worked_or'].includes(actual.status)) { duty = actual.actualCode || duty || 'WORKED'; time = actual.actualStart ? `${actual.actualStart}${actual.actualEnd?`–${actual.actualEnd}`:''}` : '—'; }
      else { duty = statusLabel; time = '—'; }
      badge = `<span class="compact-duty-text">${escapeHtml(duty)} *</span>`;
      const payClaims = [
        actual.pdtCurrent ? 'PDT' : '',
        ...Object.entries(actual.allowances || {}).filter(([,st]) => st && st.on).map(([code,st]) => {
          const qty = Math.max(0, Number(st.qty) || 0);
          return `${code}${qty && qty !== 1 ? ` × ${qty}` : ''}`;
        }),
        actual.phMode && actual.phMode !== 'choose' ? `PH: ${actual.phMode}` : ''
      ].filter(Boolean);
      actualDetail = `<div class="compact-detail compact-detail-wide"><span>Actual record</span><strong>${escapeHtml(statusLabel)}${actual.actualCode?` · ${escapeHtml(actual.actualCode)}`:''}${actual.actualStart?` · ${escapeHtml(actual.actualStart)}${actual.actualEnd?`–${escapeHtml(actual.actualEnd)}`:''}`:''}</strong></div><div class="compact-detail compact-detail-wide"><span>Originally rostered</span><strong>${escapeHtml(rosterDuty)} · ${escapeHtml(rosterTime)}</strong></div>${payClaims.length?`<div class="compact-detail compact-detail-wide"><span>Pay claims</span><strong>${escapeHtml(payClaims.join(' · '))}</strong></div>`:''}${actual.notes?`<div class="compact-detail compact-detail-wide"><span>Notes</span><div class="compact-job-text">${escapeHtml(actual.notes)}</div></div>`:''}`;
    }

    const duration = actual && ['worked','worked_or'].includes(actual.status) ? payableRosterDurationLabel(day,c) : (c.type === 'shift' ? (c.bookHours||durationLabel(c.start, finish)) : '—');
    const detailHtml = c.type === 'shift' ? `${actualDetail}
      <div class="compact-detail"><span>Roster line</span><strong>${escapeHtml(week.roster)} ${week.line}</strong></div>
      <div class="compact-detail"><span>Duty</span><strong>${escapeHtml(duty)}</strong></div>
      <div class="compact-detail"><span>Sign on</span><strong>${escapeHtml(c.start || '—')}</strong></div>
      <div class="compact-detail"><span>Sign off</span><strong>${escapeHtml(finish || '—')}${assumed ? '<span class="compact-approx">approx.</span>' : ''}</strong></div>
      <div class="compact-detail"><span>Length</span><strong>${escapeHtml(duration)}</strong></div>
      <div class="compact-detail"><span>Source</span><strong>${assumed ? '8h estimate' : (c.finishSource === 'roster-book' ? 'Roster book' : 'Roster data')}</strong></div>
      ${details ? `<div class="compact-detail compact-detail-wide"><span>Roster notes</span><strong>${escapeHtml(details)}</strong></div>` : ''}
      ${fullJob ? `<div class="compact-detail compact-detail-wide"><span>Full job detail</span><div class="compact-job-text">${escapeHtml(fullJob)}</div>${corridor ? `<div class="compact-job-meta">Roster book: ${escapeHtml(corridor)}</div>` : ''}</div>` : ''}` : `
      <div class="compact-detail"><span>Roster line</span><strong>${escapeHtml(week.roster)} ${week.line}</strong></div>
      <div class="compact-detail"><span>Status</span><strong>${escapeHtml(duty)}</strong></div>`;

    return `
      <details class="compact-day${preClass}${day.holidayName?' public-holiday-day':''}" data-roster-day="${escapeHtml(day.date)}">
        <summary>
          <div class="compact-day-label"><strong>${escapeHtml(day.dayLabel.toUpperCase())}${isToday?'<span class="today-tag">TODAY</span>':''}</strong><span>${escapeHtml(dateText)}${day.holidayName?` · ${escapeHtml(day.holidayName)}`:""}</span></div>
          <div class="compact-time">${escapeHtml(time)}${duration!=='—'?`<span class="compact-shift-duration">${escapeHtml(duration)}</span>`:''}</div>
          <div class="compact-duty">${badge || `<span class="compact-duty-text">${escapeHtml(duty)}</span>`}</div>
          <div class="compact-chevron">⌄</div>
        </summary>
        <div class="compact-details">${detailHtml}${isDiaryMode()?`<div class="compact-detail compact-detail-wide"><button type="button" class="secondary edit-actual-day-btn" data-edit-roster-day="${escapeHtml(day.date)}">Edit actual day / notes</button></div>`:''}</div>
      </details>`;
  }

  function weekLeaveType(wcDate){
    try{const map=JSON.parse(localStorage.getItem('rosterbot-week-leave-v1')||'{}')||{};if(map[wcDate])return typeof map[wcDate]==='string'?map[wcDate]:(map[wcDate].type||'');const annual=JSON.parse(localStorage.getItem('rosterbot-diary-annual-leave-v1')||'[]')||[];if(annual.includes(wcDate))return 'annual'}catch(_){}
    return '';
  }
  function weekActionsHtml(week){
    if(!isDiaryMode())return '';
    const locked=!!week.locked,leave=weekLeaveType(week.wcDate),leaveLabel={annual:'Annual leave',personal:'Personal leave',unpaid:'Unpaid leave'}[leave]||'';
    return `<div class="week-actions-wrap"><button type="button" class="secondary week-change-btn week-actions-toggle" data-week-menu="${escapeHtml(week.wcDate)}">Week actions ▾</button><div class="week-actions-menu" data-week-menu-panel="${escapeHtml(week.wcDate)}" hidden>${locked?'':`<button type="button" data-week-override="${escapeHtml(week.wcDate)}">Change roster line</button><button type="button" data-week-leave-open="${escapeHtml(week.wcDate)}">Mark as leave${leaveLabel?` · ${escapeHtml(leaveLabel)}`:''} ›</button><div class="week-leave-submenu" data-week-leave-menu="${escapeHtml(week.wcDate)}" hidden><button type="button" data-week-leave-type="annual" data-week="${escapeHtml(week.wcDate)}">Annual leave</button><button type="button" data-week-leave-type="personal" data-week="${escapeHtml(week.wcDate)}">Personal leave</button><button type="button" data-week-leave-type="unpaid" data-week="${escapeHtml(week.wcDate)}">Unpaid leave</button>${leave?`<button type="button" data-week-leave-type="remove" data-week="${escapeHtml(week.wcDate)}">Remove week leave</button>`:''}</div>`}<hr><button type="button" data-week-lock="${escapeHtml(week.wcDate)}">${locked?'Unlock week':'Lock week'}</button>${week.isWeekOverride&&!locked?`<button type="button" data-week-restore="${escapeHtml(week.wcDate)}">Remove line override</button>`:''}</div></div>`;
  }

  function renderCompactWeek(week, selectedStartDate) {
    const locked=!!week.locked;
    const header = `
        <header class="week-card-header">
          <div><div class="line-label">${week.depot&&week.depot!=='SCS'?`<span class="depot-tag">${escapeHtml(week.depot)} · </span>`:''}<span class="roster-name">${escapeHtml(week.roster==='MAIN'?'MAIN':week.roster)}</span> · LINE ${week.line}${week.isWeekOverride?' · OVERRIDE':''}${locked?' · <span class="week-lock-state">LOCKED ✓</span>':''}</div><div class="wc-label">WC ${escapeHtml(E.formatDateLong(week.wcDate))}</div>${week.futureWarning?'<span class="week-warning">⚠ Forecast beyond expected Nov 2026 roster change — verify against the current roster.</span>':''}</div>
          <div class="week-header-actions">${weekLeaveType(week.wcDate)?`<span class="week-leave-badge">${escapeHtml(({annual:'Annual leave',personal:'Personal leave',unpaid:'Unpaid leave'})[weekLeaveType(week.wcDate)]||'Leave')}</span>`:''}${weekActionsHtml(week)}</div>
        </header>`;
    if (week.isAnnualLeave) {
      const end = E.addDays(week.wcDate, 6);
      return `<article class="week-card compact-week annual-leave-week${locked?' locked-week':''}">${header}<div class="annual-leave-banner"><strong>ANNUAL LEAVE</strong><span>${escapeHtml(E.formatDateLong(week.wcDate))} – ${escapeHtml(E.formatDateLong(end))}</span>${locked?'<span class="locked-note">Historical facts protected from accidental editing.</span>':''}</div></article>`;
    }
    return `<article class="week-card compact-week${locked?' locked-week':''}">${header}<div class="compact-day-list">${week.days.map(day => renderCompactDay(day, week, selectedStartDate)).join('')}</div>${locked?'<div class="locked-note">LOCKED · click a day to view; unlock the week to amend historical facts.</div>':''}</article>`;
  }

  function renderWeek(week, selectedStartDate) {
    const locked=!!week.locked;
    const header = `
        <header class="week-card-header">
          <div><div class="line-label">${week.depot&&week.depot!=='SCS'?`<span class="depot-tag">${escapeHtml(week.depot)} · </span>`:''}<span class="roster-name">${escapeHtml(week.roster==='MAIN'?'MAIN':week.roster)}</span> · LINE ${week.line}${week.isWeekOverride?' · OVERRIDE':''}${locked?' · <span class="week-lock-state">LOCKED ✓</span>':''}</div><div class="wc-label">WC ${escapeHtml(E.formatDateLong(week.wcDate))}</div>${week.futureWarning?'<span class="week-warning">⚠ Forecast beyond expected Nov 2026 roster change — verify against the current roster.</span>':''}</div>
          <div class="week-header-actions">${weekLeaveType(week.wcDate)?`<span class="week-leave-badge">${escapeHtml(({annual:'Annual leave',personal:'Personal leave',unpaid:'Unpaid leave'})[weekLeaveType(week.wcDate)]||'Leave')}</span>`:''}${weekActionsHtml(week)}</div>
        </header>`;

    if (week.isAnnualLeave) {
      const end = E.addDays(week.wcDate, 6);
      return `
      <article class="week-card annual-leave-week${locked?' locked-week':''}">
        ${header}
        <div class="annual-leave-banner">
          <strong>ANNUAL LEAVE</strong>
          <span>${escapeHtml(E.formatDateLong(week.wcDate))} – ${escapeHtml(E.formatDateLong(end))}</span>
          ${locked?'<span class="locked-note">Historical facts protected from accidental editing.</span>':''}
        </div>
      </article>`;
    }

    const columns = week.days.map(day => {
      const pre = week.weekIndex === 0 && E.compareIsoDates(day.date, selectedStartDate) < 0;
      const outside=isDisplayDimmedDate(day.date),isToday=day.date===localTodayIso();
      return `
        <div class="day-column${outside?' range-outside':''}${isToday?' today-marker':''}${day.holidayName?' public-holiday-day':''}" data-roster-day="${escapeHtml(day.date)}">
          <div class="day-head">
            <strong>${day.dayLabel}${isToday?'<span class="today-tag">TODAY</span>':''}</strong>
            <span>${escapeHtml(E.formatDateShort(day.date))}${day.holidayName?`<span class="holiday-name">${escapeHtml(day.holidayName)}</span>`:""}</span>
          </div>
          ${renderCell(day.cell, pre, day)}
        </div>`;
    }).join('');

    return `
      <article class="week-card${locked?' locked-week':''}">
        ${header}
        <div class="table-scroll"><div class="roster-grid">${columns}</div></div>
        ${locked?'<div class="locked-note">LOCKED · click a day to view; unlock the week to amend historical facts.</div>':''}
      </article>`;
  }

  let historyViewYear=Number((viewFromDate.value||localTodayIso()).slice(0,4))||new Date().getFullYear();
  function payVarianceEntries(){const checks=payCheckMap();return Object.entries(checks).map(([start,c])=>({start,actual:+c.actualGross||0,expected:+c.grossAtCheck||0,diff:Math.round(((+c.actualGross||0)-(+c.grossAtCheck||0))*100)/100,checkedAt:c.checkedAt||''})).filter(x=>Math.abs(x.diff)>.004).sort((a,b)=>b.start.localeCompare(a.start))}
  function payCyclesEndingInMonth(year,month){const mm=String(month).padStart(2,'0'),first=`${year}-${mm}-01`,lastDay=new Date(Date.UTC(year,month,0)).getUTCDate(),last=`${year}-${mm}-${String(lastDay).padStart(2,'0')}`,seed=snapPayPeriodIso(first),out=[];for(let k=-1;k<=3;k++){const start=E.addDays(seed,k*14),end=E.addDays(start,13);if(end>=first&&end<=last)out.push({start,end})}return out.sort((a,b)=>a.end.localeCompare(b.end))}
  function renderHistoryStrip(){const y=$('historyYear'),months=$('historyMonths');if(!y||!months)return;y.textContent=String(historyViewYear);const checks=payCheckMap(),locks=readJson('rosterbot-week-locks-v1',{}),today=localTodayIso(),labels=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];months.innerHTML=labels.map((m,i)=>{const mm=String(i+1).padStart(2,'0'),prefix=`${historyViewYear}-${mm}`,active=(monthFocusFrom||viewFromDate.value||'').startsWith(prefix),cycles=payCyclesEndingInMonth(historyViewYear,i+1),diaryDots=cycles.map(c=>{const complete=!!locks[c.start]&&!!locks[E.addDays(c.start,7)],future=c.end>today;return `<i class="history-cycle-dot diary${complete?' complete':''}${future?' future':''}" title="Diary ${E.formatDateLong(c.start)} – ${E.formatDateLong(c.end)}: ${complete?'complete (both weeks locked)':'incomplete'}"></i>`}).join(''),payDots=cycles.map(c=>{const complete=!!checks[c.start],future=c.end>today;return `<i class="history-cycle-dot pay${complete?' complete':''}${future?' future':''}" title="Payslip ${E.formatDateLong(c.start)} – ${E.formatDateLong(c.end)}: ${complete?'checked':'not checked'}"></i>`}).join(''),doneDiary=cycles.filter(c=>!!locks[c.start]&&!!locks[E.addDays(c.start,7)]).length,donePay=cycles.filter(c=>!!checks[c.start]).length,title=`${m} ${historyViewYear}: ${doneDiary}/${cycles.length} diary fortnights complete · ${donePay}/${cycles.length} payslips checked`;return `<button type="button" class="history-month${active?' active':''}" data-history-month="${i+1}" title="${title}"><span>${m}</span><span class="history-cycle-markers" aria-hidden="true"><span class="history-cycle-row">${diaryDots}</span><span class="history-cycle-row">${payDots}</span></span></button>`}).join('')}
  function nextShiftFromToday(){
    if(!isDiaryMode()||!hasSavedTimeline())return null;const today=localTodayIso();
    try{const weeks=E.buildWeeks(data,{...engineSettingsForView(today),viewStartDate:today},12);for(const w of weeks)for(const d of w.days||[]){if(E.compareIsoDates(d.date,today)<0)continue;const a=d.actualOverride||null;if(a&&['annual','personal','unpaid','or','ph_credit'].includes(a.status))continue;const c=d.cell||{},worked=a?['worked','worked_or'].includes(a.status):c.type==='shift';if(!worked)continue;const code=a?.actualCode||c.shift||'SHIFT',start=a?.actualStart||c.start||'',end=a?.actualEnd||c.finish||'';return {date:d.date,code,start,end}}}catch(_){}return null;
  }
  function updateHomeDashboard(weeks){if(!isDiaryMode())return;const groups=payPeriodGroups(weeks||[]),g=groups[0],title=$('homePeriodTitle'),pos=$('homePosition'),monthMode=!!monthFocusFrom;if(title){if(monthMode){const dt=isoUtc(monthFocusFrom);title.textContent=dt.toLocaleDateString('en-AU',{timeZone:'UTC',month:'long',year:'numeric'})}else title.textContent=g?`${E.formatDateLong(g.start)} – ${E.formatDateLong(g.end)}`:`${E.formatDateLong(activeViewFrom)} – ${E.formatDateLong(activeViewTo)}`}if(pos)pos.textContent=monthMode?`${groups.length} complete pay cycle${groups.length===1?'':'s'} shown · outside-month days dimmed`:(currentRosterPosition?.textContent||'Personal diary');
    const ns=nextShiftFromToday();if($('homeNextShift'))$('homeNextShift').textContent=ns?`${ns.code} · ${ns.start||'—'}`:'No upcoming shift';if($('homeNextShiftMeta'))$('homeNextShiftMeta').textContent=ns?`${E.formatDateLong(ns.date)}${ns.end?` · ${ns.start}–${ns.end}`:''}`:'Within the next 12 weeks';if($('homeNextShiftCard'))$('homeNextShiftCard').dataset.jumpDate=ns?.date||'';
    if(g){const results=groups.map(x=>window.PayBotCombined?.previewFortnight?.(x.start)),ready=results.every(r=>r?.available&&r.unresolved===0);if(ready){const gross=results.reduce((a,r)=>a+(+r.gross||0),0),ph=results.reduce((a,r)=>a+(+r.phMove||0),0);$('homeExpectedPay').textContent=moneyAud(gross);$('homePhMovement').textContent=`${ph>=0?'+':''}${Number(ph).toFixed(2)} h`;if($('homePayCard'))$('homePayCard').dataset.payStart=g.start;if($('homePayMeta'))$('homePayMeta').textContent=monthMode?`${groups.length} complete pay cycles shown`:'Current displayed fortnight'}else{$('homeExpectedPay').textContent='—';$('homePhMovement').textContent='—'}}
    const issues=payVarianceEntries();if($('homeIssues'))$('homeIssues').textContent=String(issues.length);if($('homeIssuesMeta'))$('homeIssuesMeta').textContent=issues.length?`${issues.length} checked difference${issues.length===1?'':'s'} · tap to review`:'No checked variances';renderHistoryStrip();
  }
  function updateClassicRosterHead(){const from=viewFromDate.value,to=viewToDate.value;if($('v27ClassicPeriod'))$('v27ClassicPeriod').textContent=from&&to?`${E.formatDateLong(from)} – ${E.formatDateLong(to)}`:'Your roster';if($('v27ClassicPosition'))$('v27ClassicPosition').textContent=$('homePosition')?.textContent||''}
  function jumpToMonth(month){const mm=String(month).padStart(2,'0'),first=`${historyViewYear}-${mm}-01`,d=new Date(Date.UTC(historyViewYear,month,0)),last=`${historyViewYear}-${mm}-${String(d.getUTCDate()).padStart(2,'0')}`,cycles=payCyclesEndingInMonth(historyViewYear,month);monthFocusFrom=first;monthFocusTo=last;if(cycles.length)setViewRange(cycles[0].start,cycles[cycles.length-1].end,true,{preserveMonthFocus:true});else{const p=snapPayPeriodIso(first);setViewRange(p,E.addDays(p,13),true,{preserveMonthFocus:true})}renderHistoryStrip();document.documentElement.classList.remove('v27-dashboard-active');document.documentElement.classList.remove('v27-view-week','v27-view-fortnight','v27-view-calendar');document.documentElement.classList.add('v27-drilldown-active','v27-view-month');updateClassicRosterHead();setTimeout(()=>$('outputSection')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
  function openIssuesPanel(){let panel=$('payIssuesPanel');if(!panel){panel=document.createElement('section');panel.id='payIssuesPanel';panel.className='pay-issues-panel';document.body.appendChild(panel)}const rows=payVarianceEntries();panel.innerHTML=`<div class="pay-issues-head"><div><div class="eyebrow">PAY AUDIT</div><strong>Checked pay variances</strong></div><button type="button" data-close-pay-issues>×</button></div>${rows.length?rows.map(x=>`<button type="button" class="pay-issue-row" data-issue-start="${x.start}"><strong class="${x.diff<0?'negative':'positive'}">${x.diff>0?'+':''}${moneyAud(x.diff)}</strong><span>${E.formatDateLong(x.start)} – ${E.formatDateLong(E.addDays(x.start,13))}</span></button>`).join(''):'<p class="muted">No checked pay-cycle variances are saved.</p>'}`;panel.hidden=false}
  function searchResults(q){const raw=String(q||'').trim(),out=[];if(!raw)return out;const lc=raw.toLowerCase(),hhmmDigits=/^\d{4}$/.test(lc)?lc:'',matches=parts=>{const hay=parts.join(' ').toLowerCase();return hay.includes(lc)||(hhmmDigits&&hay.replace(/:/g,'').includes(hhmmDigits))},dateMatch=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(dateMatch)out.push({kind:'date',title:E.formatDateLong(raw),meta:'Jump to this pay fortnight',date:raw});
    const dayMap=readJson('rosterbot-day-overrides-v1',{});for(const [date,a] of Object.entries(dayMap)){const diaryMatch=hhmmDigits?String(a.actualStart||'').replace(/:/g,'')===hhmmDigits:matches([date,a.actualCode,a.notes,a.status,a.actualStart,a.actualEnd]);if(diaryMatch)out.push({kind:'diary',title:`${date} · ${a.actualCode||String(a.status||'').toUpperCase()}`,meta:a.notes||`${a.actualStart||''}${a.actualEnd?`–${a.actualEnd}`:''}`,date})}
    const fnNotes=fortnightNotesMap();for(const [start,note] of Object.entries(fnNotes)){if(matches([start,note]))out.push({kind:'diary',title:`Fortnight note · ${E.formatDateLong(start)}`,meta:String(note).slice(0,180),date:start})}
    const checks=payVarianceEntries();if(/under|variance|pay|difference/i.test(raw))for(const x of checks)out.push({kind:'pay',title:`${x.diff>0?'+':''}${moneyAud(x.diff)} · ${E.formatDateLong(x.start)}`,meta:'Checked pay variance',date:x.start});
    const seen=new Set();for(const [dsKey,ds] of Object.entries(window.ROSTERBOT_OFFICIAL_DATA?.datasets||{})){for(const j of ds.jobs||[]){const dutyMatch=hhmmDigits?String(j.start||'').replace(/:/g,'')===hhmmDigits:matches([j.code,j.start,j.end,j.hours,j.depot,j.book,j.detail]);if(!dutyMatch)continue;const key=`${j.code}|${j.start}|${j.end}|${j.depot}`;if(seen.has(key))continue;seen.add(key);out.push({kind:'duty',title:`${j.code} · ${j.start}–${j.end} · ${j.hours||''}`,meta:`${j.depot||''}${j.book?` · ${j.book}`:''}`,detail:j.detail||'',dataset:dsKey});if(out.length>40)break}if(out.length>40)break}
    return out.slice(0,30)}
  function renderUniversalSearch(q){const box=$('universalSearchResults');if(!box)return;const rows=searchResults(q);if(!String(q||'').trim()){box.hidden=true;box.innerHTML='';return}let html='';let last='';for(const r of rows){if(r.kind!==last){last=r.kind;html+=`<div class="search-section-label">${{date:'DATE',diary:'DIARY',pay:'PAY CHECKS',duty:'DUTIES'}[r.kind]||'RESULTS'}</div>`}html+=`<button type="button" class="search-result" ${r.date?`data-search-date="${r.date}"`:''}><strong>${escapeHtml(r.title)}</strong>${r.meta?`<span>${escapeHtml(r.meta)}</span>`:''}${r.detail?`<small>${escapeHtml(r.detail.slice(0,320))}${r.detail.length>320?'…':''}</small>`:''}</button>`}box.innerHTML=html||'<div class="search-result"><span>No matching roster data found.</span></div>';box.hidden=false}

  function generateDisplay(shouldScroll = true, options = {}) {
    let from=viewFromDate.value||startDate.value||localTodayIso(),to=viewToDate.value||E.addDays(from,6);
    if(E.compareIsoDates(to,from)<0)[from,to]=[to,from];
    activeViewFrom=from;activeViewTo=to;viewFromDate.value=from;viewToDate.value=to;
    const startWC=E.weekCommencing(from),endWC=E.weekCommencing(to),count=Math.min(5200,Math.max(1,Math.floor(daysBetween(startWC,endWC)/7)+1));
    displayWeeks.value=String(count);
    const settings = engineSettingsForView(from);
    const weeks = E.buildWeeks(data, settings, count);
    const persist = options.persist !== false && !document.documentElement.classList.contains('v28-lookup-active');
    if(persist){
      window.ROSTERBOT_SHARED = { settings, weeks, updatedAt: Date.now(), viewFrom:from, viewTo:to, experienceMode };
      try { localStorage.setItem('rosterbot-shared-settings-v1', JSON.stringify(settings)); } catch (_) {}
      saveRosterSession();
      try { window.dispatchEvent(new CustomEvent('rosterbot:forecast', { detail: { settings } })); } catch (_) {}
    }
    updateRosterViewButtons();
    rosterOutput.innerHTML = payPeriodGroups(weeks).map(g=>renderFortnightGroup(g,from)).join('');
    outputTitle.textContent = `${E.formatDateLong(from)} – ${E.formatDateLong(to)}`;
    viewRangeSummary.textContent=`${daysBetween(from,to)+1} day${daysBetween(from,to)===0?'':'s'} · ${count} WC week${count===1?'':'s'}`;
    outputSection.hidden = false;
    if(persist){updateDiaryPosition();refreshPayPreviews();updateHomeDashboard(weeks);}
    if (shouldScroll) outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return {settings,weeks,from,to,persist};
  }

  window.RosterBotUI = {
    refresh(){ if (!outputSection.hidden) generateDisplay(false); },
    generate(){ generateDisplay(true); },
    currentSettings,
    engineSettingsForView,
    isDiaryMode,
    setExperience,
    saveCurrentAsMyRoster,
    saveSession: saveRosterSession,
    restoreSession: restoreRosterSession,
    refreshPayPreviews,
    updateDiaryPosition
  };

  function selectedRadio(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function downloadText(filename, textOrBlob, mime) {
    const blob = textOrBlob instanceof Blob ? textOrBlob : new Blob([textOrBlob], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  function calendarWebFile(file) {
    try {
      return new File([file.ics], file.filename, { type: 'text/calendar' });
    } catch (_) {
      return null;
    }
  }

  function canShareFileObjects(files) {
    if (!navigator.share || !files.length) return false;
    if (typeof navigator.canShare !== 'function') return true;
    try { return navigator.canShare({ files }); } catch (_) { return false; }
  }

  async function sharePreparedCalendarFile(file) {
    const webFile = calendarWebFile(file);
    if (webFile && canShareFileObjects([webFile])) {
      try {
        await navigator.share({ files: [webFile], title: file.label });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
        console.warn('RosterBot file share failed; falling back to download.', error);
      }
    }
    downloadText(file.filename, file.ics, 'text/calendar;charset=utf-8');
  }

  const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const b of bytes) crc = CRC32_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function zipDosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31);
    const dosDate = (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
    return { dosTime, dosDate };
  }

  function createZipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    let centralSize = 0;
    const now = zipDosDateTime();

    for (const file of files) {
      const name = encoder.encode(file.filename);
      const body = encoder.encode(file.ics);
      const crc = crc32(body);
      const local = new Uint8Array(30 + name.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true); // UTF-8 names
      lv.setUint16(8, 0, true);      // stored, no compression
      lv.setUint16(10, now.dosTime, true);
      lv.setUint16(12, now.dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, body.length, true);
      lv.setUint32(22, body.length, true);
      lv.setUint16(26, name.length, true);
      lv.setUint16(28, 0, true);
      local.set(name, 30);
      localParts.push(local, body);

      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, now.dosTime, true);
      cv.setUint16(14, now.dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, body.length, true);
      cv.setUint32(24, body.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, localOffset, true);
      central.set(name, 46);
      centralParts.push(central);
      centralSize += central.length;
      localOffset += local.length + body.length;
    }

    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, localOffset, true);
    ev.setUint16(20, 0, true);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  function calendarZipFilename() {
    return 'RosterBot-calendar-files.zip';
  }

  async function shareAllPreparedCalendarFiles() {
    if (!preparedCalendarFiles.length) return;
    const webFiles = preparedCalendarFiles.map(calendarWebFile).filter(Boolean);
    if (webFiles.length === preparedCalendarFiles.length && canShareFileObjects(webFiles)) {
      try {
        await navigator.share({ files: webFiles, title: 'RosterBot calendar files' });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
        console.warn('RosterBot multi-file share failed; trying ZIP.', error);
      }
    }

    const zip = createZipBlob(preparedCalendarFiles);
    let zipFile = null;
    try { zipFile = new File([zip], calendarZipFilename(), { type: 'application/zip' }); } catch (_) {}
    if (zipFile && canShareFileObjects([zipFile])) {
      try {
        await navigator.share({ files: [zipFile], title: 'RosterBot calendar files' });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    downloadText(calendarZipFilename(), zip, 'application/zip');
  }

  function downloadPreparedZip() {
    if (!preparedCalendarFiles.length) return;
    downloadText(calendarZipFilename(), createZipBlob(preparedCalendarFiles), 'application/zip');
  }

  function safeFilenamePart(value) {
    return String(value).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function addPreparedFile(files, data, settings, baseOptions, spec) {
    const doc = E.generateIcsDocument(data, settings, {
      ...baseOptions,
      eventKinds: spec.eventKinds,
      weekParity: spec.weekParity,
      calendarName: spec.calendarName
    });
    if (doc.eventCount < 1) return;
    files.push({
      label: spec.label,
      filename: spec.filename,
      ics: doc.ics,
      eventCount: doc.eventCount
    });
  }

  function renderPreparedCalendarFiles() {
    calendarFileList.replaceChildren();
    if (!preparedCalendarFiles.length) {
      const empty = document.createElement('div');
      empty.className = 'calendar-file-empty';
      empty.textContent = 'No calendar events were generated for these settings.';
      calendarFileList.appendChild(empty);
    } else {
      preparedCalendarFiles.forEach((file, index) => {
        const row = document.createElement('div');
        row.className = 'calendar-file-row';
        const meta = document.createElement('div');
        meta.className = 'calendar-file-meta';
        const title = document.createElement('strong');
        title.textContent = file.label;
        const detail = document.createElement('small');
        detail.textContent = `${file.filename} · ${file.eventCount} event${file.eventCount === 1 ? '' : 's'}`;
        meta.append(title, detail);
        const actions = document.createElement('div');
        actions.className = 'calendar-file-actions';

        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'secondary';
        addButton.textContent = 'Add to Calendar';
        addButton.dataset.calendarFileIndex = String(index);
        addButton.dataset.calendarAction = 'add';

        const shareButton = document.createElement('button');
        shareButton.type = 'button';
        shareButton.className = 'secondary';
        shareButton.textContent = 'Share / Save';
        shareButton.dataset.calendarFileIndex = String(index);
        shareButton.dataset.calendarAction = 'share';

        actions.append(addButton, shareButton);
        row.append(meta, actions);
        calendarFileList.appendChild(row);
      });
    }
    if (calendarBundleActions) calendarBundleActions.hidden = preparedCalendarFiles.length < 1;
    calendarFilesPanel.hidden = false;
    calendarFilesPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function prepareIcsFiles() {
    const exportStart=viewFromDate.value||currentSettings().startDate||localTodayIso();
    const settings = engineSettingsForView(exportStart);
    const count = E.clampInt(exportWeeks.value, 1, 5200, 8);
    exportWeeks.value = String(count);
    const includeOr = selectedRadio('orMode') === 'allDay';
    const separateOr = includeOr && splitOr.checked;
    const separateLeave = settings.annualLeaveWeeks.length > 0 && splitAnnualLeave.checked;
    const wc = E.weekCommencing(exportStart);
    const base = `rosterbot-${wc}-${count}w`;
    const baseOptions = {
      exportWeeks: count,
      durationMode: selectedRadio('durationMode') || 'actual'
    };
    const mainKinds = ['shift', 'alr'];
    if (includeOr && !separateOr) mainKinds.push('or');
    if (!separateLeave) mainKinds.push('annualLeave');

    const files = [];
    if (splitAlternating.checked) {
      addPreparedFile(files, data, settings, baseOptions, {
        label: 'RosterBot — Week A',
        filename: `${base}-week-a.ics`,
        eventKinds: mainKinds,
        weekParity: 0,
        calendarName: 'RosterBot - Week A'
      });
      if (count > 1) {
        addPreparedFile(files, data, settings, baseOptions, {
          label: 'RosterBot — Week B',
          filename: `${base}-week-b.ics`,
          eventKinds: mainKinds,
          weekParity: 1,
          calendarName: 'RosterBot - Week B'
        });
      }
    } else {
      addPreparedFile(files, data, settings, baseOptions, {
        label: 'RosterBot — Roster',
        filename: `${base}.ics`,
        eventKinds: mainKinds,
        weekParity: null,
        calendarName: 'RosterBot - Roster'
      });
    }

    if (separateOr) {
      addPreparedFile(files, data, settings, baseOptions, {
        label: 'RosterBot — OR',
        filename: `${base}-or.ics`,
        eventKinds: ['or'],
        weekParity: null,
        calendarName: 'RosterBot - OR'
      });
    }

    if (separateLeave) {
      addPreparedFile(files, data, settings, baseOptions, {
        label: 'RosterBot — Annual Leave',
        filename: `${base}-annual-leave.ics`,
        eventKinds: ['annualLeave'],
        weekParity: null,
        calendarName: 'RosterBot - Annual Leave'
      });
    }

    preparedCalendarFiles = files;
    renderPreparedCalendarFiles();
  }

  initialiseTheme();
  updateRosterViewButtons();
  styleSelect.addEventListener('change', () => applyTheme(styleSelect.value));
  calendarViewBtn?.addEventListener('click', () => setRosterViewMode('calendar'));
  compactViewBtn?.addEventListener('click', () => setRosterViewMode('compact'));

  startDate.value = localTodayIso();
  populateDepotSelect(startDepot,'SCS'); populateDepotSelect(swapDepot,'SCS'); populateRosterSelect(startRoster,'A',startDepot.value); populateRosterSelect(swapRoster,'C',swapDepot.value); populateLineSelect(startLine,startRoster.value,1,startDepot.value); populateLineSelect(swapLine,swapRoster.value,1,swapDepot.value);
  annualLeaveDate.value = E.weekCommencing(startDate.value); renderAnnualLeaveList(); updateExportOptionStates();
  const restoredRosterSession = restoreRosterSession(); if (!restoredRosterSession) updateStartHints();
  updateExperienceUI();
  if(restoredRosterSession){if(isDiaryMode()&&hasSavedTimeline()){setCurrentPayCycle(false);setupPanel.hidden=true;generateDisplay(false)}else{const w=E.weekCommencing(startDate.value);viewFromDate.value=restoredRosterSession&&readJson('rosterbot-session-settings-v1',{})?.lastViewedFrom||w;viewToDate.value=restoredRosterSession&&readJson('rosterbot-session-settings-v1',{})?.lastViewedTo||E.addDays(w,13);setupPanel.hidden=false;generateDisplay(false)}}else{viewFromDate.value=E.weekCommencing(startDate.value);viewToDate.value=E.addDays(viewFromDate.value,13);setupPanel.hidden=!isDiaryMode();updateDiaryPosition()}

  startDate.addEventListener('change', () => {
    const sd=startDepot?.value||'SCS',sr=startRoster.value,xd=swapDepot?.value||sd,xr=swapRoster.value;populateDepotSelect(startDepot,sd,startDate.value);populateRosterSelect(startRoster,sr,startDepot.value,startDate.value);populateLineSelect(startLine,startRoster.value,startLine.value,startDepot.value,startDate.value);populateDepotSelect(swapDepot,xd,startDate.value);populateRosterSelect(swapRoster,xr,swapDepot.value,startDate.value);populateLineSelect(swapLine,swapRoster.value,swapLine.value,swapDepot.value,startDate.value);updateStartHints();
    if (!annualLeaveWeeks.size) annualLeaveDate.value = E.weekCommencing(startDate.value);
    clearPreparedCalendarFiles();
  });
  startDepot?.addEventListener('change',()=>{populateRosterSelect(startRoster,startRoster.value,startDepot.value,startDate.value);populateLineSelect(startLine,startRoster.value,1,startDepot.value,startDate.value);updateStartHints();updateSequencePreview();clearPreparedCalendarFiles()});
  startRoster.addEventListener('change', () => {
    populateLineSelect(startLine, startRoster.value, startLine.value,startDepot?.value||'SCS',startDate.value);
    updateStartHints();
    updateSequencePreview();
    clearPreparedCalendarFiles();
  });
  startLine.addEventListener('change', () => { updateSequencePreview(); clearPreparedCalendarFiles(); });
  hasSwap.addEventListener('change', () => {
    swapFields.hidden = !hasSwap.checked;
    updateSequencePreview();
    clearPreparedCalendarFiles();
  });
  swapDepot?.addEventListener('change',()=>{populateRosterSelect(swapRoster,swapRoster.value,swapDepot.value,startDate.value);populateLineSelect(swapLine,swapRoster.value,1,swapDepot.value,startDate.value);updateSequencePreview();clearPreparedCalendarFiles()});
  swapRoster.addEventListener('change', () => {
    populateLineSelect(swapLine, swapRoster.value, swapLine.value,swapDepot?.value||'SCS',startDate.value);
    updateSequencePreview();
    clearPreparedCalendarFiles();
  });
  swapLine.addEventListener('change', () => { updateSequencePreview(); clearPreparedCalendarFiles(); });

  hasAnnualLeave.addEventListener('change', () => {
    annualLeaveFields.hidden = !hasAnnualLeave.checked;
    updateExportOptionStates();
    clearPreparedCalendarFiles();
    refreshDisplayIfVisible();
  });
  addAnnualLeaveBtn.addEventListener('click', addAnnualLeaveWeek);
  addFourAnnualLeaveBtn?.addEventListener('click', () => {
    if (!annualLeaveDate.value) return;
    let wc = E.weekCommencing(annualLeaveDate.value);
    for (let i=0;i<4;i++) annualLeaveWeeks.add(E.addDays(wc,i*7));
    hasAnnualLeave.checked=true; annualLeaveFields.hidden=false; renderAnnualLeaveList(); saveRosterSession(); refreshDisplayIfVisible();
  });
  annualLeaveDate.addEventListener('change', () => {
    if (annualLeaveDate.value) annualLeaveDate.value = E.weekCommencing(annualLeaveDate.value);
  });
  annualLeaveList.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-leave]');
    if (!button) return;
    annualLeaveWeeks.delete(button.dataset.removeLeave);
    renderAnnualLeaveList();
    saveRosterSession();
    refreshDisplayIfVisible();
  });

  document.querySelectorAll('input[name="orMode"]').forEach(el => el.addEventListener('change', () => {
    updateExportOptionStates();
    clearPreparedCalendarFiles();
  }));
  document.querySelectorAll('input[name="durationMode"]').forEach(el => el.addEventListener('change', clearPreparedCalendarFiles));
  [exportWeeks, splitAlternating, splitOr, splitAnnualLeave].forEach(el => el.addEventListener('change', clearPreparedCalendarFiles));

  [startDate,startRoster,startLine,displayWeeks,hasSwap,swapRoster,swapLine,hasAnnualLeave].forEach(el=>el.addEventListener('change',saveRosterSession));
  generateBtn.addEventListener('click', () => {
    const onboarding=document.documentElement.classList.contains('v28-onboarding-active');
    if(onboarding){
      if(!startDate.value||!startDepot?.value||!startRoster.value||!startLine.value){alert('Choose a starting date, depot, roster and line first.');return}
      const lookup=document.documentElement.classList.contains('v28-lookup-active');
      const w=E.weekCommencing(startDate.value);viewFromDate.value=w;viewToDate.value=E.addDays(w,13);generateDisplay(false,{persist:!lookup});
      document.documentElement.classList.add('v28-onboarding-preview');const c=$('v28PreviewConfirm');if(c)c.hidden=lookup;
      if(outputTitle)outputTitle.textContent=lookup?'Roster lookup':'Preview your roster';
      setTimeout(()=>outputSection.scrollIntoView({behavior:'smooth',block:'start'}),40);return;
    }
    if(!viewFromDate.value){const w=E.weekCommencing(startDate.value);viewFromDate.value=w;viewToDate.value=E.addDays(w,13)}if(isDiaryMode()&&!hasSavedTimeline()){window.RosterBotDiary?.showAdvanced?.();return}generateDisplay(true);
  });
  quickModeBtn?.addEventListener('click',()=>setExperience('quick'));diaryModeBtn?.addEventListener('click',()=>setExperience('diary'));
  convertQuickToDiaryBtn?.addEventListener('click',()=>{if(!saveCurrentAsMyRoster()){alert('Choose a valid roster start date, roster and line first.');return}});
  displayRangeBtn?.addEventListener('click',()=>{if(isDiaryMode()&&!hasSavedTimeline()){window.RosterBotDiary?.showAdvanced?.();return}generateDisplay(true)});
  thisWeekView?.addEventListener('click',()=>{setCurrentWeek(true);syncQuickCalendar(viewFromDate.value)});thisPayCycleView?.addEventListener('click',()=>setCurrentPayCycle(true));prevFortnightView?.addEventListener('click',()=>shiftViewPayCycle(-1));nextFortnightView?.addEventListener('click',()=>shiftViewPayCycle(1));
  $('homePrevFortnight')?.addEventListener('click',()=>shiftViewPayCycle(-1));$('homeNextFortnight')?.addEventListener('click',()=>shiftViewPayCycle(1));$('homeToday')?.addEventListener('click',()=>setCurrentPayCycle(true));$('homeCalendarView')?.addEventListener('click',()=>calendarViewBtn?.click());$('homeCompactView')?.addEventListener('click',()=>compactViewBtn?.click());$('homeHistory')?.addEventListener('click',()=>window.RosterBotDiary?.showAdvanced?.());
  let historyYearAnimating=false;
  async function changeHistoryYear(delta){
    delta=Number(delta)||0;if(!delta||historyYearAnimating)return;
    const yearEl=$('historyYear'),months=$('historyMonths'),reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const renderNext=()=>{historyViewYear+=delta;renderHistoryStrip()};
    if(reduce||!yearEl||!months||typeof months.animate!=='function'){renderNext();return}
    historyYearAnimating=true;
    const outX=delta>0?'-18%':'18%',inX=delta>0?'18%':'-18%';
    try{
      const out=[
        yearEl.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${delta>0?'-14px':'14px'})`,opacity:0}],{duration:105,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'}),
        months.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${outX})`,opacity:0}],{duration:105,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'})
      ];
      await Promise.all(out.map(a=>a.finished.catch(()=>{})));
      out.forEach(a=>a.cancel());
      renderNext();
      const incoming=[
        yearEl.animate([{transform:`translateX(${delta>0?'14px':'-14px'})`,opacity:0},{transform:'translateX(0)',opacity:1}],{duration:210,easing:'cubic-bezier(.18,.78,.22,1)'}),
        months.animate([{transform:`translateX(${inX})`,opacity:0},{transform:'translateX(0)',opacity:1}],{duration:210,easing:'cubic-bezier(.18,.78,.22,1)'})
      ];
      await Promise.all(incoming.map(a=>a.finished.catch(()=>{})));
    }finally{historyYearAnimating=false}
  }
  $('historyPrevYear')?.addEventListener('click',()=>changeHistoryYear(-1));$('historyNextYear')?.addEventListener('click',()=>changeHistoryYear(1));$('historyMonths')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-history-month]');if(b)jumpToMonth(+b.dataset.historyMonth)});
  $('universalSearch')?.addEventListener('input',e=>renderUniversalSearch(e.target.value));$('universalSearch')?.addEventListener('focus',e=>{if(e.target.value)renderUniversalSearch(e.target.value)});$('universalSearchClear')?.addEventListener('click',()=>{$('universalSearch').value='';renderUniversalSearch('');$('universalSearch').focus()});$('universalSearchResults')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-search-date]');if(!b)return;const d=b.dataset.searchDate,start=snapPayPeriodIso(d);setViewRange(start,E.addDays(start,13),true);$('universalSearchResults').hidden=true});
  $('homeNextShiftCard')?.addEventListener('click',()=>{const d=$('homeNextShiftCard').dataset.jumpDate;if(d){const start=snapPayPeriodIso(d);setViewRange(start,E.addDays(start,13),true);setTimeout(()=>document.querySelector(`[data-roster-day="${d}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}),80)}});$('homePayCard')?.addEventListener('click',()=>{const start=$('homePayCard').dataset.payStart,b=document.querySelector(`[data-pay-details="${start}"]`);b?.click();b?.scrollIntoView({behavior:'smooth',block:'center'})});$('homeIssuesCard')?.addEventListener('click',openIssuesPanel);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-close-pay-issues]')){$('payIssuesPanel').hidden=true;return}const issue=e.target.closest?.('[data-issue-start]');if(issue){const start=issue.dataset.issueStart;setViewRange(start,E.addDays(start,13),true);$('payIssuesPanel').hidden=true;return}if(!e.target.closest?.('.universal-search-wrap')){const box=$('universalSearchResults');if(box)box.hidden=true}});

  quickCalendarBtn?.addEventListener('click',openQuickCalendar);quickCalPrev?.addEventListener('click',()=>moveQuickCalendarMonth(-1));quickCalNext?.addEventListener('click',()=>moveQuickCalendarMonth(1));quickCalMonth?.addEventListener('change',()=>{quickCalCursor.month=+quickCalMonth.value;renderQuickCalendar()});quickCalYear?.addEventListener('change',()=>{quickCalCursor.year=+quickCalYear.value;renderQuickCalendar()});quickCalGrid?.addEventListener('click',e=>{const b=e.target.closest?.('[data-quick-cal-date]');if(b)chooseQuickCalendarDate(b.dataset.quickCalDate)});document.addEventListener('click',e=>{if(!quickCalendar||quickCalendar.hidden)return;if(e.target.closest?.('#quickCalendar,#quickCalendarBtn'))return;closeQuickCalendar()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!quickCalendar?.hidden)closeQuickCalendar()});
  editSetupBtn?.addEventListener('click',()=>{setupPanel.hidden=!setupPanel.hidden;if(!setupPanel.hidden)setupPanel.scrollIntoView({behavior:'smooth',block:'start'})});
  diaryHistoryBtn?.addEventListener('click',()=>window.RosterBotDiary?.showAdvanced?.());
  [viewFromDate,viewToDate].forEach(el=>el?.addEventListener('change',()=>{if(viewFromDate.value&&viewToDate.value&&E.compareIsoDates(viewToDate.value,viewFromDate.value)<0)viewToDate.value=viewFromDate.value;if(el===viewFromDate&&viewFromDate.value)syncQuickCalendar(viewFromDate.value)}));
  window.addEventListener('paybot:ready',refreshPayPreviews);
  rosterOutput.addEventListener('input',e=>{const note=e.target.closest?.('[data-fn-note]');if(note){saveFortnightNote(note.dataset.fnNote,note.value);return}const el=e.target.closest?.('[data-fn-allow]');if(!el)return;saveFortnightAllowanceField(el.dataset.fnStart,el.dataset.fnAllow,el.value)});
  rosterOutput.addEventListener('change',e=>{const el=e.target.closest?.('[data-fn-allow]');if(!el)return;saveFortnightAllowanceField(el.dataset.fnStart,el.dataset.fnAllow,el.value)});
  rosterOutput.addEventListener('click',e=>{const pd=e.target.closest?.('[data-pay-details]');if(pd){const start=pd.dataset.payDetails,panel=rosterOutput.querySelector(`[data-pay-detail-panel=\"${start}\"]`);if(panel&&!panel.hidden){panel.hidden=true;pd.classList.remove('active')}else{inlinePayDetails(start,'summary');pd.classList.add('active')}return}const tab=e.target.closest?.('[data-pay-detail-tab]');if(tab){inlinePayDetails(tab.dataset.start,tab.dataset.payDetailTab);return}const chk=e.target.closest?.('[data-pay-check]');if(chk){showPayCheck(chk.dataset.payCheck);return}});
  payCheckClose?.addEventListener('click',hidePayCheck);payCheckModal?.addEventListener('click',e=>{if(e.target===payCheckModal)hidePayCheck()});payCheckActual?.addEventListener('input',updatePayCheckDifference);payCheckSave?.addEventListener('click',savePayCheck);payCheckReopen?.addEventListener('click',clearPayCheck);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&payCheckModal&&!payCheckModal.hidden)hidePayCheck()});

  downloadIcsBtn.addEventListener('click', prepareIcsFiles);
  calendarFileList.addEventListener('click', async event => {
    const button = event.target.closest('[data-calendar-file-index]');
    if (!button) return;
    const file = preparedCalendarFiles[Number(button.dataset.calendarFileIndex)];
    if (!file) return;
    if (button.dataset.calendarAction === 'share') {
      await sharePreparedCalendarFile(file);
    } else {
      // On iPhone/iPad Safari this intentionally opens the Apple Calendar
      // import preview. On desktop browsers it generally downloads the .ics.
      downloadText(file.filename, file.ics, 'text/calendar;charset=utf-8');
    }
  });
  shareAllCalendarBtn?.addEventListener('click', shareAllPreparedCalendarFiles);
  downloadZipBtn?.addEventListener('click', downloadPreparedZip);
})();
