try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/31-changelog.js','rb-build:f975cefad1b130c09a48db7d44c56aa072049034ff6b25b2e3c31a935cbc3ae8')}catch(error){throw error}
(function () {
  'use strict';
  const modal = document.getElementById('changelogModal');
  const openBtn = document.getElementById('changelogOpenBtn');
  const closeBtn = document.getElementById('changelogCloseBtn');
  let lastFocused = null;
  if (!modal || !openBtn || !closeBtn) return;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('feedback-modal-open');
    window.setTimeout(() => closeBtn.focus(), 0);
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('feedback-modal-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
})();
