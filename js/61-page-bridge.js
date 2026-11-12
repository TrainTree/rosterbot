try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/61-page-bridge.js','rb-build:1dd75d9547321eaf27713ec6ca0e71166079208f1dc64263bb54492386adafca')}catch(error){throw error}
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
