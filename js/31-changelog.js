try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/31-changelog.js','rb-build:8d8e916e93ef645d84ebcbe44470e83eaef73980dca6c286292a9c717ef79da9')}catch(error){throw error}
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
