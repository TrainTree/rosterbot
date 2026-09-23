(function(root){
  'use strict';
  const DATA=root.ROSTERBOT_PAY_RATE_DATA;
  function keyFor(date){return typeof date==='string'?date:`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`}
  function entitlementEvents(code){return DATA?.entitlementRates?.[code]||DATA?.verifiedPayrollRates?.[code]||[]}
  function payrollEvents(code){return DATA?.payrollAppliedRates?.[code]||DATA?.verifiedPayrollRates?.[code]||[]}
  function eventFrom(list,date){
    const k=keyFor(date),a=list||[];if(!a.length)return null;
    let hit=null;for(const e of a){if(k>=e.effectivePayPeriodStart)hit=e;else break}
    if(hit)return {...hit,queryDate:k,beforeEarliest:false};
    return {...a[0],queryDate:k,beforeEarliest:true};
  }
  function eventFor(code,date){return eventFrom(entitlementEvents(code),date)}
  function payrollEventFor(code,date){return eventFrom(payrollEvents(code),date)}
  function rate(code,date){return eventFor(code,date)?.rate??null}
  function payrollRate(code,date){return payrollEventFor(code,date)?.rate??null}
  function displayLabel(code,date){const e=eventFor(code,date);return e?`${e.source||'pay entitlement'} · from ${e.effectivePayPeriodStart}`:''}
  root.PayRateOfficial={data:DATA,eventFor,payrollEventFor,rate,payrollRate,displayLabel,entitlementEvents,payrollEvents};
})(window);
