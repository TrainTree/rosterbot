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
