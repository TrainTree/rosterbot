try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/31-changelog.js','rb-build:c2a524028eaa3a2a239efd6bec965649f8f074896493ee11cd7721990f9a06e7')}catch(error){throw error}
(function () {
  'use strict';
  const modal = document.getElementById('changelogModal');
  const openBtn = document.getElementById('changelogOpenBtn');
  const closeBtn = document.getElementById('changelogCloseBtn');
  if (!modal || !openBtn || !closeBtn) return;

  function openModal() {
    window.RosterBotDialogs.open(modal,{invoker:document.activeElement,initialFocus:closeBtn,onRequestClose:closeModal});
  }
  function closeModal() {
    window.RosterBotDialogs.close(modal);
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
})();
