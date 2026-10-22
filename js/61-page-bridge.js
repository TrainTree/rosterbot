try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/61-page-bridge.js','rb-build:2728bcf33cf6cbf956a12acfdcbe2b9809a16dba23e3c947049eaeb869171404')}catch(error){throw error}
(function(){
  'use strict';
  const rosterPage=document.getElementById('rosterbotPage');
  const payPage=document.getElementById('paybotPage');
  const payBtn=document.getElementById('paybotNavBtn');
  const rosterBtn=document.getElementById('rosterbotNavBtn');
  function showPay(){
    rosterPage.hidden=true;payPage.hidden=false;payBtn.hidden=true;rosterBtn.hidden=false;
    if(window.PayBotCombined?.syncFromRosterBot && (window.ROSTERBOT_SHARED?.settings || localStorage.getItem('rosterbot-shared-settings-v1'))){window.PayBotCombined.syncFromRosterBot();}
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function showRoster(){payPage.hidden=true;rosterPage.hidden=false;rosterBtn.hidden=true;payBtn.hidden=false;window.scrollTo({top:0,behavior:'smooth'});}
  payBtn?.addEventListener('click',showPay);rosterBtn?.addEventListener('click',showRoster);
})();
