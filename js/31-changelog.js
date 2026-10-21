try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/31-changelog.js','rb-build:d91aa0c876599cda1012204dc4b54bb23a35eeade4c6cc38c681cf173336d8b7')}catch(error){throw error}
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
