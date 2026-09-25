(function(){
  'use strict';
  const E=window.RosterEngine,data=window.ROSTER_DATA;if(!E||!data)return;
  const K={timeline:'rosterbot-timeline-v1',leave:'rosterbot-diary-annual-leave-v1',weekLeave:'rosterbot-week-leave-v1',weeks:'rosterbot-week-overrides-v1',days:'rosterbot-day-overrides-v1',locks:'rosterbot-week-locks-v1',checks:'rosterbot-pay-checks-v1',employment:'rosterbot-employment-profile-v1',manualSchedule:'rosterbot-manual-schedule-v1',schema:'rosterbot-db-schema-v1',cleared:'rosterbot-cleared-v1'};
  const PERSONAL_KEYS=[K.timeline,K.leave,K.weekLeave,K.weeks,K.days,K.locks,K.checks,K.employment,K.manualSchedule,'rosterbot-session-settings-v1','rosterbot-shared-settings-v1','rosterbot-theme-v1.9','rosterbot-view-mode-v1','paybot-editor-view-v1','paybot-auto-next-v1','paybot-v06-state','rosterbot-last-backup-v1','rosterbot-first-use-v1','rosterbot-experience-v1','rosterbot-fortnight-allowances-v1','rosterbot-fortnight-notes-v1',K.schema];
  const $=id=>document.getElementById(id),json=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch(_){return fallback}},put=(key,v)=>{localStorage.setItem(key,JSON.stringify(v));scheduleMirror();window.RosterBotCloudSync?.notifyLocalChange?.(key);},wc=x=>E.weekCommencing(x),todayIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  let mirrorTimer=null,dbPromise=null;
  function openDb(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{if(!('indexedDB'in window)){resolve(null);return}const req=indexedDB.open('RosterBotPersonalDB',1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv',{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise;}
  async function mirrorNow(){
    try{const db=await openDb();if(!db)return false;const tx=db.transaction('kv','readwrite'),store=tx.objectStore('kv');for(const key of PERSONAL_KEYS){const value=localStorage.getItem(key);if(value!=null)store.put({key,value,updatedAt:new Date().toISOString()});else store.delete(key)}await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=()=>j(tx.error)});const meaningful=[K.timeline,K.weeks,K.days,K.locks,K.checks,K.employment,K.manualSchedule,'rosterbot-session-settings-v1','paybot-v06-state'].some(k=>localStorage.getItem(k));if(meaningful)localStorage.removeItem(K.cleared);return true}catch(e){console.warn('RosterBot IndexedDB mirror failed',e);return false}
  }
  function scheduleMirror(){clearTimeout(mirrorTimer);mirrorTimer=setTimeout(mirrorNow,250)}
  async function recoverFromDb(){
    if(localStorage.getItem(K.cleared))return false;
    try{const db=await openDb();if(!db)return false;const tx=db.transaction('kv','readonly'),store=tx.objectStore('kv');const rows=await new Promise((r,j)=>{const q=store.getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>j(q.error)});let restored=false;for(const row of rows){if(PERSONAL_KEYS.includes(row.key)&&localStorage.getItem(row.key)==null){localStorage.setItem(row.key,row.value);restored=true}}return restored}catch(_){return false}
  }
  async function clearDatabase(){try{const db=await openDb();try{db?.close()}catch(_){}dbPromise=null;await new Promise(resolve=>{const q=indexedDB.deleteDatabase('RosterBotPersonalDB');q.onsuccess=q.onerror=q.onblocked=()=>resolve()})}catch(_){}return true}
  function settings(){return window.RosterBotUI?.currentSettings?.()||json('rosterbot-session-settings-v1',null)||{};}
  function baseArrangement(){const s=settings();return {id:'base-'+Date.now(),startWC:wc(s.startDate||todayIso()),mode:s.hasSwap?'swap':'single',trackA:{depot:s.startDepot||'SCS',roster:s.startRoster||'A',line:+s.startLine||1},trackB:s.hasSwap?{depot:s.swapDepot||s.startDepot||'SCS',roster:s.swapRoster||'C',line:+s.swapLine||1}:null,createdAt:new Date().toISOString()};}
  function timeline(){return json(K.timeline,[]).filter(Boolean).sort((a,b)=>a.startWC.localeCompare(b.startWC));}
  function effectiveTimeline(){return timeline();}
  function isWeekLocked(date){return !!json(K.locks,{})[wc(date)]}
  function toggleWeekLock(date){const key=wc(date),all=json(K.locks,{});if(all[key])delete all[key];else all[key]={lockedAt:new Date().toISOString()};put(K.locks,all);refresh();window.RosterBotDataUI?.updateBackupUI?.()}
  function positionAt(date,t=effectiveTimeline()){try{return E.buildWeeks(data,{...settings(),viewStartDate:date,timelineMode:'diary',rosterTimeline:t,weekOverrides:{},dayOverrides:{},weekLocks:{}},1)?.[0]||null}catch(_){return null}}
  function depotFill(sel,chosen,date){if(!sel)return;const names=window.RosterOfficial?.depotNames?.(date||settings().startDate||todayIso())||['SCS'];sel.innerHTML=names.map(d=>`<option value="${d}" ${d===(chosen||'SCS')?'selected':''}>${d==='SCS'?'Southern Cross (SCS)':d}</option>`).join('');if(!names.includes(sel.value))sel.value=names.includes(chosen)?chosen:(names.includes('SCS')?'SCS':names[0])}
  function rosterFill(sel,chosen,depot='SCS',date){if(!sel)return;const names=window.RosterOfficial?.rosterNames?.(date||settings().startDate||todayIso(),depot)||[];sel.innerHTML=names.map(r=>`<option value="${r}" ${r===chosen?'selected':''}>${r==='FLEX'?'FLEX':r==='MAIN'?'Main rotation':r==='CABCOM'?'Cab Committee':r+' Roster'}</option>`).join('');if(!names.includes(sel.value)&&names.length)sel.value=names[0]}
  function lineFill(sel,roster,chosen,depot='SCS',date){if(!sel)return;const n=window.RosterOfficial?.lineCount?.(date||settings().startDate||todayIso(),depot,roster)||1;sel.innerHTML=Array.from({length:n},(_,i)=>`<option value="${i+1}" ${(i+1)==chosen?'selected':''}>${i+1}</option>`).join('')}
  function trackText(t){
    if(!t)return '—';const depot=t.depot&&t.depot!=='SCS'?`${t.depot} · `:'';return `${depot}${t.roster||'ROSTER'}${t.line||'—'}`;
  }
  function arrangementText(a){
    if(a?.mode==='manual')return a.manualType==='adhoc'?'No default work pattern · manual fortnight entry':'Personal manual work pattern';
    const ta=trackText(a.trackA),tb=a.trackB?trackText(a.trackB):'';
    if(a.mode==='swap'&&a.trackB)return `${ta} ↔ ${tb}`;
    return ta;
  }
  function arrangementTypeText(a){
    if(a?.mode==='manual')return 'USER-ENTERED WORK SCHEDULE';
    if(/replaced active alternating track/i.test(String(a?.source||'')))return 'CHANGED ONE SIDE OF ALTERNATING ROSTER';
    return a.mode==='swap'&&a.trackB?'ALTERNATING ROSTER':'ROSTER / LINE';
  }
  function setBasicLock(){const note=$('timelineActiveNote');if(note)note.remove();['startDepot','startRoster','startLine','hasSwap','swapDepot','swapRoster','swapLine'].forEach(id=>{const el=$(id);if(el)el.disabled=false});}
  let editingArrangementId='',builderDirty=false,editorContext='change';
  function timelineWithoutEditing(){return timeline().filter(x=>x.id!==editingArrangementId)}
  function setTimelineFormState(text=''){
    const box=$('timelineFormState');if(box){box.hidden=!text;box.textContent=text}
  }
  function setTimelineEditorVisible(on){const panel=$('timelineEditorPanel');if(panel)panel.hidden=!on}
  function inferIntent(a){if(/replaced active alternating track/i.test(String(a?.source||'')))return 'replace';return a?.mode==='swap'?'swap':'single'}
  function updateIntentUi(){
    const type=$('timelineChangeType')?.value||'single';
    document.querySelectorAll('[data-timeline-intent]').forEach(b=>{const on=b.dataset.timelineIntent===type;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
    const help=$('timelineIntentHelp'),depot=$('timelineDepotLabel'),roster=$('timelineRosterLabel'),line=$('timelineLineLabel');
    if(type==='swap'){
      if(help)help.textContent='Enter the two roster positions you alternate between. RosterBot keeps the existing alternating rotation logic underneath.';
      if(depot)depot.textContent='First depot';if(roster)roster.textContent='First roster';if(line)line.textContent='First starting line';
    }else if(type==='replace'){
      if(help)help.textContent='Enter the new position for the side that changed. RosterBot keeps the other side of your existing alternating roster.';
      if(depot)depot.textContent='New depot for this side';if(roster)roster.textContent='New roster for this side';if(line)line.textContent='New starting line for this side';
    }else{
      if(help)help.textContent='Choose the permanent roster position that started from this date.';
      if(depot)depot.textContent='New depot';if(roster)roster.textContent='New roster';if(line)line.textContent='New starting line';
    }
  }
  function setChangeIntent(type,{dirty=false}={}){
    if(!['single','swap','replace'].includes(type))type='single';const sel=$('timelineChangeType');if(sel)sel.value=type;if(dirty)builderDirty=true;refreshChangeFields();
  }
  function fillArrangementForm(a){
    if(!a)return;
    $('timelineChangeDate').value=a.startWC;
    $('timelineChangeType').value=inferIntent(a);
    depotFill($('timelineDepot'),a.trackA.depot||'SCS',a.startWC);rosterFill($('timelineRoster'),a.trackA.roster,$('timelineDepot').value,a.startWC);$('timelineRoster').value=a.trackA.roster;lineFill($('timelineLine'),a.trackA.roster,a.trackA.line,$('timelineDepot').value,a.startWC);
    if(a.trackB){depotFill($('timelineSwapDepot'),a.trackB.depot||a.trackA.depot||'SCS',a.startWC);rosterFill($('timelineSwapRoster'),a.trackB.roster,$('timelineSwapDepot').value,a.startWC);$('timelineSwapRoster').value=a.trackB.roster;lineFill($('timelineSwapLine'),a.trackB.roster,a.trackB.line,$('timelineSwapDepot').value,a.startWC)}
    refreshChangeFields();
  }
  function resetTimelineForm(date=''){
    editingArrangementId='';builderDirty=false;editorContext='change';
    const title=$('timelineFormTitle');if(title)title.textContent='Add roster change';
    const btn=$('timelineAddBtn');if(btn)btn.textContent='Save roster change';
    setTimelineFormState('');
    $('timelineChangeType').value='single';
    const chosenDate=date||todayIso(),hit=positionAt(chosenDate),s=settings(),primary=hit&&!hit.timelineMissing&&hit.roster!=='MANUAL'?hit:null;
    $('timelineChangeDate').value=chosenDate;
    depotFill($('timelineDepot'),primary?.depot||s.startDepot||'SCS',chosenDate);rosterFill($('timelineRoster'),primary?.roster||s.startRoster||'A',$('timelineDepot').value,chosenDate);if(primary?.roster)$('timelineRoster').value=primary.roster;lineFill($('timelineLine'),$('timelineRoster').value,+primary?.line||+s.startLine||1,$('timelineDepot').value,chosenDate);
    const other=positionAt(E.addDays(chosenDate,7));
    depotFill($('timelineSwapDepot'),other?.depot||s.swapDepot||s.startDepot||'SCS',chosenDate);rosterFill($('timelineSwapRoster'),other?.roster||s.swapRoster||'C',$('timelineSwapDepot').value,chosenDate);if(other?.roster)$('timelineSwapRoster').value=other.roster;lineFill($('timelineSwapLine'),$('timelineSwapRoster').value,+other?.line||+s.swapLine||1,$('timelineSwapDepot').value,chosenDate);
    refreshChangeFields();
  }
  function closeTimelineEditor(){builderDirty=false;editingArrangementId='';setTimelineEditorVisible(false);setTimelineFormState('')}
  function openNewChange(which='later'){
    const t=timeline();let d=t.length?(which==='earlier'?E.addDays(t[0].startWC,-7):wc(todayIso())):(settings().startDate||todayIso());
    if(which!=='earlier'&&t.length&&d<=t[t.length-1].startWC)d=E.addDays(t[t.length-1].startWC,7);
    resetTimelineForm(d);editorContext=which==='earlier'?'previous':'change';
    const title=$('timelineFormTitle');if(title)title.textContent=which==='earlier'?'Add previous roster':'Add roster change';
    const btn=$('timelineAddBtn');if(btn)btn.textContent=which==='earlier'?'Save previous roster':'Save roster change';
    if(which==='earlier')setTimelineFormState('Add what you were rostered on before your earliest saved roster. Later saved changes will stay anchored where they are.');
    setTimelineEditorVisible(true);setTimeout(()=>$('timelineEditorPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
  }
  function beginEdit(id){
    const a=timeline().find(x=>x.id===id);if(!a)return;if(a.mode==='manual'){hideAdvanced(false);window.RosterBotEmployment?.open?.();return}editingArrangementId=id;editorContext='edit';builderDirty=false;
    const title=$('timelineFormTitle');if(title)title.textContent='Edit roster change';
    const btn=$('timelineAddBtn');if(btn)btn.textContent='Update roster change';
    setTimelineFormState(`Editing the roster entry that begins WC ${a.startWC}. Later saved changes keep their own starting positions.`);
    fillArrangementForm(a);setTimelineEditorVisible(true);setTimeout(()=>$('timelineEditorPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
  }
  function renderTimeline(){
    const list=$('rosterTimelineList'),t=timeline(),empty=$('timelineEmptyState'),useCurrent=$('timelineUseQuickBtn');if(!list)return;if(empty)empty.hidden=t.length>0;if(useCurrent)useCurrent.hidden=t.length>0;
    if(!t.length){list.innerHTML='';return}
    const today=todayIso(),active=[...t].filter(x=>x.startWC<=today).pop()||null;
    list.innerHTML=t.map((a,i)=>{const next=t[i+1],end=next?E.addDays(next.startWC,-1):'',current=a.id===active?.id,range=end?`${E.formatDateLong(a.startWC)} – ${E.formatDateLong(end)}`:`From ${E.formatDateLong(a.startWC)}`;return `<article class="timeline-entry${current?' current':''}"><div class="timeline-entry-head"><div class="timeline-entry-body"><div class="timeline-entry-range"><strong>${range}</strong>${current?'<span class="timeline-current-pill">Current</span>':''}</div><span class="timeline-entry-type">${arrangementTypeText(a)}</span><span class="timeline-entry-sequence">${arrangementText(a)}</span><small class="timeline-entry-note">Anchored to WC ${a.startWC}. Editing earlier history will not move later saved changes.</small></div><div class="timeline-entry-actions"><button type="button" class="secondary" data-edit-arr="${a.id}">${a.mode==='manual'?'Edit work pattern':'Edit'}</button><button type="button" class="secondary danger-data-btn" data-remove-arr="${a.id}">Remove</button></div></div></article>`}).join('');
    list.querySelectorAll('[data-edit-arr]').forEach(b=>b.addEventListener('click',()=>beginEdit(b.dataset.editArr)));
    list.querySelectorAll('[data-remove-arr]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.removeArr,a=t.find(x=>x.id===id);if(!a)return;if(!confirm(`Remove the roster entry beginning WC ${a.startWC}? Later saved changes remain in place. Actual-day records and notes are not deleted.`))return;put(K.timeline,t.filter(x=>x.id!==id));if(editingArrangementId===id)closeTimelineEditor();setBasicLock();renderTimeline();refresh();window.RosterBotDataUI?.updateBackupUI?.()}));
  }
  function refreshChangeFields(){
    const type=$('timelineChangeType')?.value||'single',d=$('timelineDepot')?.value||'SCS',r=$('timelineRoster')?.value||'A',sd=$('timelineSwapDepot')?.value||d,sr=$('timelineSwapRoster')?.value||'C',dt=$('timelineChangeDate')?.value||settings().startDate||todayIso();
    lineFill($('timelineLine'),r,$('timelineLine')?.value||1,d,dt);lineFill($('timelineSwapLine'),sr,$('timelineSwapLine')?.value||1,sd,dt);
    if($('timelineSwapDepotField'))$('timelineSwapDepotField').hidden=type!=='swap';if($('timelineSwapRosterField'))$('timelineSwapRosterField').hidden=type!=='swap';if($('timelineSwapLineField'))$('timelineSwapLineField').hidden=type!=='swap';updateIntentUi();previewChange();
  }
  function contextForReplace(start){
    const t=timelineWithoutEditing().filter(x=>x.startWC<start).sort((a,b)=>a.startWC.localeCompare(b.startWC));
    const active=t[t.length-1];if(!active||active.mode!=='swap'||!active.trackB)return null;
    const current=positionAt(start,t),other=positionAt(E.addDays(start,7),t);if(!current||!other||current.timelineMissing||other.timelineMissing)return null;
    return {active,current,other};
  }
  function candidateFromForm(){
    const raw=$('timelineChangeDate')?.value;if(!raw)return {error:'Choose when this roster change started.'};
    const start=wc(raw),type=$('timelineChangeType')?.value||'single',depot=$('timelineDepot')?.value||'SCS',r=$('timelineRoster')?.value||'A',line=+$('timelineLine')?.value||1;
    let a={id:editingArrangementId||('arr-'+Date.now()),startWC:start,mode:'single',trackA:{depot,roster:r,line},trackB:null,createdAt:editingArrangementId?(timeline().find(x=>x.id===editingArrangementId)?.createdAt||new Date().toISOString()):new Date().toISOString(),source:'roster history editor'};
    if(type==='swap')a={...a,mode:'swap',trackB:{depot:$('timelineSwapDepot')?.value||depot,roster:$('timelineSwapRoster')?.value||'C',line:+$('timelineSwapLine')?.value||1}};
    if(type==='replace'){
      const ctx=contextForReplace(start);if(!ctx)return {error:'RosterBot cannot find an alternating roster immediately before this date. Choose “Roster, line or depot” or “Started alternating”, or change the date.'};
      a={...a,mode:'swap',trackB:{depot:ctx.other.depot||'SCS',roster:ctx.other.roster,line:+ctx.other.line},source:'roster history editor · replaced active alternating track'};
    }
    return {a,type};
  }
  function previewChange(){
    const raw=$('timelineChangeDate')?.value;if(!raw)return;const start=wc(raw);if($('timelineWcHint'))$('timelineWcHint').textContent=`RosterBot will anchor this to WC ${start}.`;
    const built=candidateFromForm();if(built.error){if($('timelinePreview'))$('timelinePreview').textContent=built.error;return}const candidate=built.a;
    let base=timelineWithoutEditing().filter(x=>x.startWC!==start),merged=[...base,candidate].sort((a,b)=>a.startWC.localeCompare(b.startWC)),rows=[];
    try{rows=E.buildWeeks(data,{...settings(),viewStartDate:E.addDays(start,-7),timelineMode:'diary',rosterTimeline:merged,weekOverrides:{},dayOverrides:{},weekLocks:{}},6)}catch(_){}
    if($('timelinePreview'))$('timelinePreview').textContent=rows.map(w=>`${w.wcDate}  ${w.timelineMissing?'NO DATA':w.roster+w.line}${w.wcDate===start?'  ← starts here':''}`).join('   →   ');
  }
  function saveChange(){
    const built=candidateFromForm();if(built.error){alert(built.error);return}const a=built.a,t=timeline(),collision=t.find(x=>x.startWC===a.startWC&&x.id!==editingArrangementId);
    if(collision&&!confirm(`A saved roster entry already begins WC ${a.startWC}. Replace that entry with this one?`))return;
    const next=t.filter(x=>x.id!==editingArrangementId&&x.id!==collision?.id);put(K.timeline,[...next,a].sort((x,y)=>x.startWC.localeCompare(y.startWC)));try{localStorage.setItem(K.schema,'4')}catch(_){}
    window.RosterBotUI?.setExperience?.('diary',{display:false});setBasicLock();renderTimeline();closeTimelineEditor();refresh();window.RosterBotDataUI?.updateBackupUI?.();
  }
  function useQuickAsPeriod(){
    const a=baseArrangement();a.id='arr-'+Date.now();a.source='converted from setup';const t=timeline(),collision=t.find(x=>x.startWC===a.startWC);
    if(collision&&!confirm(`A saved roster entry already begins WC ${a.startWC}. Replace it with the current setup?`))return;
    put(K.timeline,[...t.filter(x=>x.id!==collision?.id),a].sort((x,y)=>x.startWC.localeCompare(y.startWC)));mergeQuickLeaveIntoDiary();window.RosterBotUI?.setExperience?.('diary',{display:false});setBasicLock();renderTimeline();closeTimelineEditor();refresh();window.RosterBotDataUI?.updateBackupUI?.();
  }
  function helperPeriod(which){openNewChange(which==='earlier'?'earlier':'later')}
  function diaryLeave(){return json(K.leave,[]).filter(Boolean).map(wc).filter((v,i,a)=>a.indexOf(v)===i).sort()}
  function renderDiaryLeave(){const list=$('timelineLeaveList');if(!list)return;const arr=diaryLeave();list.innerHTML=arr.length?arr.map(x=>`<span class="leave-chip">WC ${E.formatDateLong(x)} <button type="button" data-remove-diary-leave="${x}" aria-label="Remove annual leave WC ${x}">×</button></span>`).join(''):'<span class="muted">No annual-leave weeks saved.</span>';list.querySelectorAll('[data-remove-diary-leave]').forEach(b=>b.addEventListener('click',()=>{put(K.leave,arr.filter(x=>x!==b.dataset.removeDiaryLeave));renderDiaryLeave();refresh();window.RosterBotDataUI?.updateBackupUI?.()}))}
  function toggleDiaryLeave(date){const key=wc(date),set=new Set(diaryLeave());if(set.has(key))set.delete(key);else set.add(key);put(K.leave,[...set].sort());renderDiaryLeave();refresh();window.RosterBotDataUI?.updateBackupUI?.()}
  function weekLeaveRecord(date){const key=wc(date),m=json(K.weekLeave,{}),v=m[key];return v?(typeof v==='string'?{type:v,previous:{}}:v):null}
  function restoreWeekLeavePrevious(key,rec,all){for(let i=0;i<7;i++){const d=E.addDays(key,i);if(rec?.previous&&Object.prototype.hasOwnProperty.call(rec.previous,d))all[d]=rec.previous[d];else if(all[d]?.weekLeaveGenerated)delete all[d]}}
  function setWeekLeave(date,type){const key=wc(date);if(isWeekLocked(key)){alert('This week is locked. Unlock it before changing leave.');return}const map=json(K.weekLeave,{}),existing=weekLeaveRecord(key),all=json(K.days,{}),previous=existing?.previous||{};
    if(!existing){for(let i=0;i<7;i++){const d=E.addDays(key,i);if(all[d]&&!all[d].weekLeaveGenerated)previous[d]=JSON.parse(JSON.stringify(all[d]))}}
    restoreWeekLeavePrevious(key,existing,all);let annual=new Set(diaryLeave());annual.delete(key);
    if(type==='remove'){delete map[key];put(K.days,all);put(K.leave,[...annual].sort());put(K.weekLeave,map);renderDiaryLeave();refresh();window.RosterBotDataUI?.updateBackupUI?.();return}
    map[key]={type,previous,editedAt:new Date().toISOString()};
    if(type==='annual'){annual.add(key)}else{
      let base=null;try{base=E.buildWeeks(data,{...settings(),viewStartDate:key,timelineMode:'diary',annualLeaveWeeks:[],dayOverrides:{}},1)?.[0]}catch(_){}
      for(const d of base?.days||[]){const c=d.cell||{},eligible=!['off','alr','unknown'].includes(c.type);if(!eligible)continue;const holiday=d.holidayName||window.ROSTERBOT_HOLIDAYS?.[d.date]||'';all[d.date]={date:d.date,status:type,actualCode:'',actualStart:'',actualEnd:'',notes:'',pdtCurrent:false,phMode:type==='personal'&&holiday?'personal':'',allowances:{A640:{on:false,qty:1}},editedAt:new Date().toISOString(),source:`week leave · ${type}`,weekLeaveGenerated:true,weekLeaveWC:key};}
    }
    put(K.days,all);put(K.leave,[...annual].sort());put(K.weekLeave,map);renderDiaryLeave();refresh();window.RosterBotDataUI?.updateBackupUI?.();
  }
  function clearLineOverride(date){const key=wc(date);if(isWeekLocked(key))return;const all=json(K.weeks,{});delete all[key];put(K.weeks,all);refresh()}
  function addDiaryLeave(count=1){const raw=$('timelineLeaveDate')?.value;if(!raw){alert('Choose an annual leave date.');return}const start=wc(raw),set=new Set(diaryLeave());for(let i=0;i<count;i++)set.add(E.addDays(start,i*7));put(K.leave,[...set].sort());$('timelineLeaveDate').value=start;renderDiaryLeave();refresh();window.RosterBotDataUI?.updateBackupUI?.()}
  function mergeQuickLeaveIntoDiary(){const q=settings().annualLeaveWeeks||[];if(!q.length)return;put(K.leave,[...new Set([...diaryLeave(),...q.map(wc)])].sort())}
  function showAdvanced(options={}){
    renderTimeline();renderDiaryLeave();if($('timelineLeaveDate')&&!$('timelineLeaveDate').value)$('timelineLeaveDate').value=wc(todayIso());closeTimelineEditor();
    $('advancedRosterModal').hidden=false;document.body.classList.add('feedback-modal-open');
    if(options?.action==='change')openNewChange('later');else if(options?.action==='previous')openNewChange('earlier');
  }
  function hideAdvanced(force=false){if(!force&&builderDirty&&!confirm('This roster change has unsaved changes. Close without saving them?'))return false;closeTimelineEditor();$('advancedRosterModal').hidden=true;document.body.classList.remove('feedback-modal-open');return true}
  function refresh(){window.RosterBotUI?.saveSession?.();window.RosterBotUI?.refresh?.();try{window.dispatchEvent(new CustomEvent('rosterbot:forecast'))}catch(_){}scheduleMirror()}
  function findDay(date){let weeks=window.ROSTERBOT_SHARED?.weeks||[];for(const w of weeks){const d=w.days?.find(x=>x.date===date);if(d)return {week:w,day:d}}try{const s=settings(),one=E.buildWeeks(data,{...s,viewStartDate:date,timelineMode:'diary'},1),w=one[0],d=w?.days?.find(x=>x.date===date);return d?{week:w,day:d}:null}catch(_){return null}}
  function rosteredSummary(hit){if(!hit)return 'Rostered data unavailable.';const c=hit.day.cell||{},duty=c.type==='shift'?(c.shift||'SHIFT'):c.type==='off'?'OR':c.type==='alr'?'ALR':'NO DATA',time=c.start?` · ${c.start}${c.finish?`–${c.finish}`:''}`:'';return `${hit.day.date} · ${hit.week.roster}${hit.week.line} · ${duty}${time}`}
  let editingDate='';
  const DAY_ALLOWANCE_CODES=['A640'];
  const LEGACY_DAY_ALLOWANCE_CODES=['A641','A703','A700'];
  function setDayAllowanceUI(a={}){DAY_ALLOWANCE_CODES.forEach(code=>{const st=a?.[code]||{},on=document.querySelector(`[data-day-allow="${code}"]`),qty=document.querySelector(`[data-day-qty="${code}"]`);if(on)on.checked=!!st.on;if(qty)qty.value=String(st.qty!=null?st.qty:1)})}
  function readDayAllowances(){const existing=json(K.days,{})[editingDate]?.allowances||{},out={};LEGACY_DAY_ALLOWANCE_CODES.forEach(code=>{if(existing?.[code])out[code]=JSON.parse(JSON.stringify(existing[code]))});DAY_ALLOWANCE_CODES.forEach(code=>{const on=document.querySelector(`[data-day-allow="${code}"]`),qty=document.querySelector(`[data-day-qty="${code}"]`),q=Math.max(0,+qty?.value||0);out[code]={on:!!on?.checked,qty:q}});return out}
  function dayShiftMatches(q){return window.PayBotCombined?.lookupShifts?.(editingDate,q)||[]}
  function renderDayShiftSuggestions(q){const panel=$('dayShiftSuggestions'),msg=$('dayLookupMsg');if(!panel)return[];const raw=String(q||'').trim();if(!raw){panel.innerHTML='';if(msg)msg.textContent='Type duty digits (e.g. 613), a full code (SP613), or a 4-digit sign-on time (0613). Results update as you type.';return[]}const matches=dayShiftMatches(raw);if(!matches.length){panel.innerHTML='';if(msg)msg.textContent='No matching supplied duty found for this date. You can still enter the duty and times manually.';return[]}panel.innerHTML=matches.slice(0,12).map((r,i)=>`<button type="button" class="secondary day-shift-suggestion" data-day-shift="${i}"><strong>${r.code}</strong><span>${r.start}–${r.end}</span><small>${r.book||r.dataset||''}</small></button>`).join('');panel._matches=matches;if(msg)msg.textContent=matches.length===1?'1 matching duty found.':'Choose the duty you actually worked.';return matches}
  function renderDayDutyDetails(record,hit){const box=$('dayDutyDetails'),body=$('dayDutyDetailsBody');if(!box||!body)return;const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));let r=record||null;if(!r&&hit){const a=json(K.days,{})[hit.day.date]||{},code=(['worked','worked_or'].includes(a.status)?a.actualCode:'')||hit.day.cell?.shift||'',start=(['worked','worked_or'].includes(a.status)?a.actualStart:'')||hit.day.cell?.start||'';if(/^SP\d/i.test(code)){const m=window.RosterOfficial?.searchJobs?.(hit.day.date,code,80)||[];r=m.find(x=>String(x.code).toUpperCase()===String(code).toUpperCase()&&(!start||x.start===start))||m.find(x=>String(x.code).toUpperCase()===String(code).toUpperCase())||null;if(!r){for(const ds of Object.values(window.ROSTERBOT_OFFICIAL_DATA?.datasets||{})){const hitJob=(ds.jobs||[]).find(x=>String(x.code).toUpperCase()===String(code).toUpperCase()&&(!start||x.start===start));if(hitJob){r=hitJob;break}}}}if(!r&&hit.day.cell?.bookContents)r={code,start:hit.day.cell.start,end:hit.day.cell.finish,hours:hit.day.cell.bookHours||'',depot:hit.week.depot||'',book:hit.day.cell.bookCorridor||'',detail:hit.day.cell.bookContents}}
    if(!r){box.hidden=true;body.innerHTML='';return}box.hidden=false;body.innerHTML=`<div class="day-duty-title"><strong>${esc(r.code||'SHIFT')}</strong><span>${esc(r.start||'—')}–${esc(r.end||'—')} · ${esc(r.hours||'')}</span></div>${r.detail?`<p class="day-duty-copy">${esc(r.detail)}</p>`:'<p class="day-duty-copy muted">No full roster-book description is available for this duty.</p>'}<div class="day-duty-meta">${esc([r.depot,r.book,r.dataset].filter(Boolean).join(' · '))}</div>`}
  function chooseDayShift(r){if(!r)return;$('dayActualCode').value=r.code||'';$('dayActualStart').value=r.start||'';$('dayActualEnd').value=r.end||'';const st=$('dayActualStatus');if(st&&['or','alr'].includes(st.value))st.value='worked';$('dayShiftSuggestions').innerHTML='';if($('dayLookupMsg'))$('dayLookupMsg').textContent=`Loaded ${r.code} · ${r.start}–${r.end}${r.book?` · ${r.book}`:''}`;renderDayDutyDetails(r,null)}
  function showDay(date){
    const hit=findDay(date);if(!hit)return;editingDate=date;const a=json(K.days,{})[date]||{},locked=isWeekLocked(date),holiday=hit.day.holidayName||window.ROSTERBOT_HOLIDAYS?.[date]||'';
    $('dayEditorTitle').textContent=`${locked?'View':'Edit'} ${hit.day.dayLabel} ${E.formatDateLong(date)}`;$('dayRosteredSummary').innerHTML=`ROSTERED: ${rosteredSummary(hit)}${hit.day.cell?.phConversion?`<br><strong>PH conversion applied:</strong> ${hit.day.cell.phConversion.outcome==='job'?(hit.day.cell.shift||'Job'):hit.day.cell.phConversion.outcome.toUpperCase()}${hit.day.cell.conversionWarning?` · ⚠ ${hit.day.cell.conversionWarning}`:''}`:''}`;$('dayActualStatus').value=a.status||((hit.day.cell?.type==='off')?'or':hit.day.cell?.type==='alr'?'alr':'worked');$('dayActualCode').value=a.actualCode||'';$('dayActualStart').value=a.actualStart||'';$('dayActualEnd').value=a.actualEnd||'';$('dayNotes').value=a.notes||'';$('dayPdtCurrent').checked=!!a.pdtCurrent;const dayStatus=a.status||((hit.day.cell?.type==='off')?'or':hit.day.cell?.type==='alr'?'alr':'worked'),savedPh=(hit.day.cell?.type==='av'&&['worked','worked_or'].includes(dayStatus)&&(!a.phMode||a.phMode==='job'))?'av_called':a.phMode;$('dayPhMode').value=savedPh&&savedPh!=='choose'?savedPh:(holiday?(hit.day.cell?.type==='av'&&['worked','worked_or'].includes(dayStatus)?'av_called':window.RosterOfficial?.defaultPhMode?.(hit.day.cell,true)||'choose'):'choose');$('dayPhModeField').hidden=!holiday;$('dayPhName').textContent=holiday?`Detected automatically: ${holiday}`:'';setDayAllowanceUI(a.allowances||{});$('dayShiftSuggestions').innerHTML='';$('dayLookupMsg').textContent='Type duty digits (e.g. 613), a full code (SP613), or a 4-digit sign-on time (0613). Results update as you type.';$('dayEditedMeta').textContent=a.editedAt?`Last edited ${new Date(a.editedAt).toLocaleString()} · Source: ${a.source||'manual entry'}`:'No retrospective actual record saved yet.';renderDayDutyDetails(null,hit);
    const modal=$('dayEditorModal'),warn=$('dayLockWarning');modal?.classList.toggle('day-editor-readonly',locked);if(warn)warn.hidden=!locked;modal.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=locked);modal.querySelectorAll('[data-day-shift],#dayLookupBtn,#dayPlus8Btn').forEach(el=>el.disabled=locked);modal.hidden=false;document.body.classList.add('feedback-modal-open')
  }
  function hideDay(){$('dayEditorModal').hidden=true;document.body.classList.remove('feedback-modal-open')}
  function normTime(v){const s=String(v||'').trim();if(!s)return '';const d=s.replace(/\D/g,'');let h,m;if(/^\d{1,2}:\d{1,2}$/.test(s)){[h,m]=s.split(':').map(Number)}else if(d.length<=2){h=0;m=+d}else if(d.length===3){h=+d[0];m=+d.slice(1)}else if(d.length===4){h=+d.slice(0,2);m=+d.slice(2)}else return null;if(h<0||h>23||m<0||m>59)return null;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
  function add8ToDay(){const start=normTime($('dayActualStart').value);if(!start){alert('Enter a valid sign-on time first.');return}const [h,m]=start.split(':').map(Number),mins=(h*60+m+480)%(24*60);$('dayActualStart').value=start;$('dayActualEnd').value=`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`}
  function saveDay(){if(!editingDate)return;if(isWeekLocked(editingDate)){alert('This week is locked. Unlock it before changing historical facts.');return}const hit=findDay(editingDate),holiday=hit?.day?.holidayName||window.ROSTERBOT_HOLIDAYS?.[editingDate]||'',status=$('dayActualStatus').value,start=normTime($('dayActualStart').value),end=normTime($('dayActualEnd').value);if(start===null||end===null){alert('Enter sign-on/sign-off as HHMM or HH:MM.');return}const c=hit?.day?.cell||{},obj={date:editingDate,status,actualCode:$('dayActualCode').value.trim()||(['worked','worked_or'].includes(status)&&c.type==='shift'?c.shift||'':''),actualStart:start||(['worked','worked_or'].includes(status)?c.start||'':''),actualEnd:end||(['worked','worked_or'].includes(status)?c.finish||'':''),notes:$('dayNotes').value.slice(0,1000).trim(),pdtCurrent:!!$('dayPdtCurrent').checked,phMode:$('dayPhModeField').hidden?'':($('dayPhMode').value==='choose'&&holiday?(c.type==='av'&&['worked','worked_or'].includes(status)?'av_called':window.RosterOfficial?.defaultPhMode?.(hit?.day?.cell,true)||'job'):$('dayPhMode').value),allowances:readDayAllowances(),editedAt:new Date().toISOString(),source:'manual roster diary'};const all=json(K.days,{});all[editingDate]=obj;put(K.days,all);hideDay();refresh();window.RosterBotDataUI?.updateBackupUI?.()}
  function clearDay(){if(!editingDate)return;if(isWeekLocked(editingDate)){alert('This week is locked. Unlock it before changing historical facts.');return}const all=json(K.days,{});delete all[editingDate];put(K.days,all);hideDay();refresh()}
  let weekDate='';
  function showWeek(date){if(isWeekLocked(date)){alert('This week is locked. Unlock it before changing the roster line.');return}weekDate=date;const hit=positionAt(date);if(hit?.roster==='MANUAL'){window.RosterBotEmployment?.open?.();return}const ov=json(K.weeks,{})[date]||{};$('weekOverrideTitle').textContent=`Change WC ${E.formatDateLong(date)}`;$('weekOverrideDate').textContent=`Underlying position: ${hit?`${hit.roster}${hit.line}`:'NO DATA'}. This override affects this week only.`;depotFill($('weekOverrideDepot'),ov.depot||hit?.depot||'SCS',date);rosterFill($('weekOverrideRoster'),ov.roster||hit?.roster||'A',$('weekOverrideDepot').value,date);lineFill($('weekOverrideLine'),$('weekOverrideRoster').value,ov.line||hit?.line||1,$('weekOverrideDepot').value,date);$('weekOverrideModal').hidden=false;document.body.classList.add('feedback-modal-open')}
  function hideWeek(){$('weekOverrideModal').hidden=true;document.body.classList.remove('feedback-modal-open')}
  function saveWeek(){if(!weekDate)return;if(isWeekLocked(weekDate)){alert('This week is locked.');return}const all=json(K.weeks,{});all[weekDate]={depot:$('weekOverrideDepot')?.value||'SCS',roster:$('weekOverrideRoster').value,line:+$('weekOverrideLine').value,editedAt:new Date().toISOString()};put(K.weeks,all);hideWeek();refresh()}
  function clearWeek(){if(!weekDate)return;if(isWeekLocked(weekDate)){alert('This week is locked.');return}const all=json(K.weeks,{});delete all[weekDate];put(K.weeks,all);hideWeek();refresh()}
  $('advancedRosterBtn')?.addEventListener('click',showAdvanced);$('advancedRosterClose')?.addEventListener('click',()=>hideAdvanced(false));$('advancedRosterSaveClose')?.addEventListener('click',()=>hideAdvanced(false));$('advancedRosterModal')?.addEventListener('click',e=>{if(e.target===$('advancedRosterModal'))hideAdvanced()});
  $('timelineChangeDate')?.addEventListener('change',()=>{builderDirty=true;refreshChangeFields()});$('timelineChangeType')?.addEventListener('change',()=>{builderDirty=true;refreshChangeFields()});$('timelineDepot')?.addEventListener('change',()=>{builderDirty=true;rosterFill($('timelineRoster'),$('timelineRoster').value,$('timelineDepot').value,$('timelineChangeDate').value);lineFill($('timelineLine'),$('timelineRoster').value,1,$('timelineDepot').value,$('timelineChangeDate').value);previewChange()});$('timelineRoster')?.addEventListener('change',()=>{builderDirty=true;lineFill($('timelineLine'),$('timelineRoster').value,1,$('timelineDepot')?.value||'SCS',$('timelineChangeDate').value);previewChange()});$('timelineLine')?.addEventListener('change',()=>{builderDirty=true;previewChange()});$('timelineSwapDepot')?.addEventListener('change',()=>{builderDirty=true;rosterFill($('timelineSwapRoster'),$('timelineSwapRoster').value,$('timelineSwapDepot').value,$('timelineChangeDate').value);lineFill($('timelineSwapLine'),$('timelineSwapRoster').value,1,$('timelineSwapDepot').value,$('timelineChangeDate').value);previewChange()});$('timelineSwapRoster')?.addEventListener('change',()=>{builderDirty=true;lineFill($('timelineSwapLine'),$('timelineSwapRoster').value,1,$('timelineSwapDepot')?.value||'SCS',$('timelineChangeDate').value);previewChange()});$('timelineSwapLine')?.addEventListener('change',()=>{builderDirty=true;previewChange()});$('timelineAddBtn')?.addEventListener('click',saveChange);
  document.querySelectorAll('[data-timeline-intent]').forEach(b=>b.addEventListener('click',()=>setChangeIntent(b.dataset.timelineIntent,{dirty:true})));
  $('timelineEditorClose')?.addEventListener('click',()=>{if(builderDirty&&!confirm('Discard this unsaved roster change?'))return;closeTimelineEditor()});$('timelineCancelEditBtn')?.addEventListener('click',()=>{if(builderDirty&&!confirm('Discard this unsaved roster change?'))return;closeTimelineEditor()});$('timelineUseQuickBtn')?.addEventListener('click',useQuickAsPeriod);$('timelineEarlierBtn')?.addEventListener('click',()=>helperPeriod('earlier'));$('timelineLaterBtn')?.addEventListener('click',()=>helperPeriod('later'));
  $('timelineLeaveDate')?.addEventListener('change',()=>{if($('timelineLeaveDate').value)$('timelineLeaveDate').value=wc($('timelineLeaveDate').value)});$('timelineLeaveAddOne')?.addEventListener('click',()=>addDiaryLeave(1));$('timelineLeaveAddFour')?.addEventListener('click',()=>addDiaryLeave(4));
  $('timelineResetBtn')?.addEventListener('click',()=>{if(!timeline().length){alert('There is no saved roster history to clear.');return}if(!confirm('Clear all saved roster-history periods? Retrospective actual-day records, notes, week locks and pay-check history are kept, but the diary will have no underlying roster until you add a period again.'))return;localStorage.removeItem(K.timeline);scheduleMirror();closeTimelineEditor();setBasicLock();renderTimeline();refresh();window.RosterBotDataUI?.updateBackupUI?.()});
  $('dayEditorClose')?.addEventListener('click',hideDay);$('daySaveCloseBtn')?.addEventListener('click',saveDay);$('dayEditorModal')?.addEventListener('click',e=>{if(e.target===$('dayEditorModal'))hideDay()});$('daySaveBtn')?.addEventListener('click',saveDay);$('dayUseRosteredBtn')?.addEventListener('click',clearDay);$('dayClearActualBtn')?.addEventListener('click',clearDay);$('dayPlus8Btn')?.addEventListener('click',add8ToDay);$('dayLookupBtn')?.addEventListener('click',()=>{const m=renderDayShiftSuggestions($('dayActualCode').value);if(m.length===1)chooseDayShift(m[0])});$('dayActualCode')?.addEventListener('input',()=>renderDayShiftSuggestions($('dayActualCode').value));$('dayActualCode')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const m=renderDayShiftSuggestions($('dayActualCode').value);if(m.length===1)chooseDayShift(m[0])}});$('dayShiftSuggestions')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-day-shift]');if(!b)return;chooseDayShift($('dayShiftSuggestions')._matches?.[+b.dataset.dayShift])});
  $('weekOverrideClose')?.addEventListener('click',hideWeek);$('weekOverrideModal')?.addEventListener('click',e=>{if(e.target===$('weekOverrideModal'))hideWeek()});$('weekOverrideDepot')?.addEventListener('change',()=>{rosterFill($('weekOverrideRoster'),$('weekOverrideRoster').value,$('weekOverrideDepot').value,weekDate);lineFill($('weekOverrideLine'),$('weekOverrideRoster').value,1,$('weekOverrideDepot').value,weekDate)});$('weekOverrideRoster')?.addEventListener('change',()=>lineFill($('weekOverrideLine'),$('weekOverrideRoster').value,1,$('weekOverrideDepot')?.value||'SCS',weekDate));$('weekOverrideSave')?.addEventListener('click',saveWeek);$('weekOverrideRemove')?.addEventListener('click',clearWeek);
  document.addEventListener('click',e=>{if(!window.RosterBotUI?.isDiaryMode?.())return;const menu=e.target.closest?.('[data-week-menu]');if(menu){e.preventDefault();e.stopPropagation();const p=document.querySelector(`[data-week-menu-panel="${menu.dataset.weekMenu}"]`),card=menu.closest('.week-card');document.querySelectorAll('.week-actions-menu').forEach(x=>{if(x!==p)x.hidden=true});document.querySelectorAll('.week-card.week-menu-open').forEach(x=>{if(x!==card)x.classList.remove('week-menu-open')});if(p){p.hidden=!p.hidden;card?.classList.toggle('week-menu-open',!p.hidden)}return}const leaveOpen=e.target.closest?.('[data-week-leave-open]');if(leaveOpen){e.preventDefault();e.stopPropagation();const p=document.querySelector(`[data-week-leave-menu="${leaveOpen.dataset.weekLeaveOpen}"]`);if(p)p.hidden=!p.hidden;return}const lt=e.target.closest?.('[data-week-leave-type]');if(lt){e.preventDefault();e.stopPropagation();setWeekLeave(lt.dataset.week,lt.dataset.weekLeaveType);return}const restore=e.target.closest?.('[data-week-restore]');if(restore){e.preventDefault();e.stopPropagation();clearLineOverride(restore.dataset.weekRestore);return}const lb=e.target.closest?.('[data-week-lock]');if(lb){e.preventDefault();e.stopPropagation();toggleWeekLock(lb.dataset.weekLock);return}const wb=e.target.closest?.('[data-week-override]');if(wb){e.preventDefault();e.stopPropagation();showWeek(wb.dataset.weekOverride);return}const eb=e.target.closest?.('[data-edit-roster-day]');if(eb){e.preventDefault();e.stopPropagation();showDay(eb.dataset.editRosterDay);return}const col=e.target.closest?.('.day-column[data-roster-day]');if(col&&!e.target.closest('button,input,select,a')){showDay(col.dataset.rosterDay);return}if(!e.target.closest?.('.week-actions-wrap')){document.querySelectorAll('.week-actions-menu').forEach(x=>x.hidden=true);document.querySelectorAll('.week-card.week-menu-open').forEach(x=>x.classList.remove('week-menu-open'))}});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('dayEditorModal')?.hidden)hideDay();else if(!$('weekOverrideModal')?.hidden)hideWeek();else if(!$('advancedRosterModal')?.hidden)hideAdvanced()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')mirrorNow()});window.addEventListener('pagehide',()=>mirrorNow());
  document.getElementById('timelineEmploymentProfileBtn')?.addEventListener('click',()=>{hideAdvanced();window.RosterBotEmployment?.open?.();});
window.RosterBotDiary={mirrorNow,clearDatabase,showDay,showWeek,showAdvanced,isWeekLocked,toggleWeekLock};
  function signalDiaryReady(){window.__rosterbotLocalReady=true;try{window.dispatchEvent(new CustomEvent('rosterbot:local-ready'))}catch(_){}}
  (async()=>{const restored=await recoverFromDb();try{localStorage.setItem(K.schema,'4')}catch(_){}if(timeline().length&&localStorage.getItem(K.leave)==null){const legacy=settings().annualLeaveWeeks||[];localStorage.setItem(K.leave,JSON.stringify(legacy.map(wc)))}setBasicLock();if(restored){window.RosterBotDataUI?.updateBackupUI?.();signalDiaryReady();setTimeout(()=>location.reload(),80);return}if(window.ROSTERBOT_SHARED?.weeks?.length)window.RosterBotUI?.refresh?.();scheduleMirror();signalDiaryReady();})().catch(e=>console.warn('RosterBot diary initialization failed before sync readiness',e));
})();
