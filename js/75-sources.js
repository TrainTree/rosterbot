(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const modal=$('sourcesModal');
  if(!modal)return;
  let lastFocused=null;
  const ref=()=>window.ROSTERBOT_PAY_REFERENCE||{};
  const rateData=()=>window.ROSTERBOT_PAY_RATE_DATA||{};
  const aud=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:4}).format(Number(n)||0);
  const shortAud=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
  const dateFmt=iso=>{if(!iso)return '—';const [y,m,d]=String(iso).split('-').map(Number);if(!y||!m||!d)return iso;return new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'Australia/Melbourne'}).format(new Date(Date.UTC(y,m-1,d,12)))};
  function effectiveIndex(){
    const starts=ref().RATE_STARTS||[];
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    let idx=0;starts.forEach((s,i)=>{if(s==='0001-01-01'||s<=today)idx=i});return idx;
  }
  function makeHead(target,withBasis=false){
    const labels=ref().RATE_LABELS||[];const cur=effectiveIndex();
    target.innerHTML='<tr><th>Code</th><th>Description</th>'+(withBasis?'<th>Basis</th>':'')+labels.map((x,i)=>`<th class="${i===cur?'sources-current-col':''}">${x}${i===cur?'<small>Current schedule</small>':''}</th>`).join('')+'</tr>';
  }
  function renderGrades(){
    const R=ref(),cur=effectiveIndex(),head=$('sourcesGradeHead'),body=$('sourcesGradeBody');if(!head||!body)return;makeHead(head,false);
    body.innerHTML=Object.entries(R.GRADE_DATA||{}).map(([code,item])=>`<tr><td class="sources-code">${code}</td><td>${item.name}</td>${(item.rates||[]).map((v,i)=>`<td class="${i===cur?'sources-current-col':''}">${shortAud(v)}/hr</td>`).join('')}</tr>`).join('');
    const pb=R.GRADE_DATA?.PB205,current=$('sourcesCurrentRate');if(current&&pb){const e=(rateData().entitlementRates?.PB205||[]).filter(x=>x.effectivePayPeriodStart<=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())).at(-1);current.innerHTML=`<div><strong>Current Driver reference</strong><small>PB205 · Driver - V/L (All Purpose Rate)</small></div><div><span>${e?aud(e.rate):shortAud(pb.rates?.[cur])+'/hr'}</span><small>${e?`PayBot entitlement APR · effective pay period ${dateFmt(e.effectivePayPeriodStart)}`:`EA schedule · ${R.RATE_LABELS?.[cur]||''}`}</small></div>`;}
  }
  function renderEntitlement(){const body=$('sourcesEntitlementBody');if(!body)return;body.innerHTML=(rateData().entitlementRates?.PB205||[]).map(e=>`<tr><td>${dateFmt(e.effectivePayPeriodStart)}</td><td><strong>${aud(e.rate)}/hr</strong></td><td>${e.publishedReference||'Historical entitlement anchor'}</td><td>${e.source||'—'}${e.note?`<small>${e.note}</small>`:''}</td></tr>`).join('')}
  function renderAllowances(){const R=ref(),cur=effectiveIndex(),head=$('sourcesAllowanceHead'),body=$('sourcesAllowanceBody');if(!head||!body)return;makeHead(head,true);body.innerHTML=Object.entries(R.ALLOWANCES||{}).map(([code,item])=>`<tr><td class="sources-code">${code}</td><td>${item.name}</td><td>${item.basis==='hourly'?'Hourly':'Per occasion'}</td>${(item.rates||[]).map((v,i)=>`<td class="${i===cur?'sources-current-col':''}">${shortAud(v)}${item.basis==='hourly'?'/hr':''}</td>`).join('')}</tr>`).join('')}
  function render(){renderGrades();renderEntitlement();renderAllowances();const b=$('sourcesRateSourceBadge');if(b)b.textContent=rateData().publishedSchedule?.source?.replace('V/Line Rail Operations and Administrative Employees Agreement 2023, ','')||'Schedule A · Table 6'}
  function open(){lastFocused=document.activeElement;render();modal.hidden=false;document.body.classList.add('feedback-modal-open');setTimeout(()=>$('sourcesCloseBtn')?.focus(),0)}
  function close(){modal.hidden=true;document.body.classList.remove('feedback-modal-open');lastFocused?.focus?.()}
  $('sourcesCloseBtn')?.addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
  window.RosterBotSources={open,close,render};
})();
