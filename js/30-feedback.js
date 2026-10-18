try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/30-feedback.js','rb-build:eaba3e509f3f5d22e9daa35d3db2a07ce1883957b439dc82655338843c17aeb8')}catch(error){throw error}
(function () {
  'use strict';
  const ENDPOINT = 'https://formspree.io/f/xwlkvlyl';
  const VERSION = '1.9';
  const modal = document.getElementById('feedbackModal');
  const openBtn = document.getElementById('feedbackOpenBtn');
  const closeBtn = document.getElementById('feedbackCloseBtn');
  const form = document.getElementById('feedbackForm');
  const type = document.getElementById('feedbackType');
  const message = document.getElementById('feedbackMessage');
  const includeSetup = document.getElementById('feedbackIncludeSetup');
  const submitBtn = document.getElementById('feedbackSubmitBtn');
  const status = document.getElementById('feedbackStatus');
  let lastFocused = null;

  if (!modal || !openBtn || !closeBtn || !form) return;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('feedback-modal-open');
    status.textContent = '';
    status.className = 'feedback-status';
    window.setTimeout(() => type.focus(), 0);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('feedback-modal-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function value(id, fallback = '') {
    const el = document.getElementById(id);
    if (!el) return fallback;
    if (el.type === 'checkbox') return el.checked ? 'yes' : 'no';
    return String(el.value ?? fallback);
  }

  function selectedRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  }

  function diagnostics() {
    const hasSwap = document.getElementById('hasSwap')?.checked;
    const theme = document.documentElement.dataset.theme || value('styleSelect', '1');
    const setup = {
      'RosterBot version': VERSION,
      'Theme': theme,
      'Viewport': `${window.innerWidth}x${window.innerHeight}`,
      'Browser': navigator.userAgent,
      'Start date': value('startDate'),
      'Start roster': value('startRoster'),
      'Start line': value('startLine'),
      'Permanent swap': hasSwap ? 'yes' : 'no',
      'View from': value('viewFromDate'),
      'View to': value('viewToDate'),
      'ICS weeks': value('exportWeeks'),
      'ICS duration mode': selectedRadio('durationMode'),
      'OR export mode': selectedRadio('orMode'),
      'Annual leave enabled': value('hasAnnualLeave'),
      'Annual leave weeks': Array.from(document.querySelectorAll('[data-remove-leave]')).map(el => el.dataset.removeLeave).join(', ') || 'none',
      'Split alternating weeks': value('splitAlternating'),
      'Separate OR file': value('splitOr'),
      'Separate Annual Leave file': value('splitAnnualLeave')
    };
    if (hasSwap) {
      setup['Swap roster'] = value('swapRoster');
      setup['Swap line'] = value('swapLine');
    }
    return Object.entries(setup).map(([k, v]) => `${k}: ${v || '—'}`).join('\n');
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    status.textContent = 'Sending feedback…';
    status.className = 'feedback-status';

    const payload = new FormData(form);
    payload.set('_subject', `RosterBot feedback — ${type.value}`);
    payload.set('rosterbot_version', VERSION);
    if (includeSetup.checked) payload.set('diagnostics', diagnostics());

    try {
      if (navigator.onLine === false) throw Object.assign(new Error('offline'), { code: 'FEEDBACK_OFFLINE' });
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        body: payload,
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          if (body && Array.isArray(body.errors)) detail = body.errors.map(e => e.message).filter(Boolean).join(' ');
        } catch (_) {}
        throw new Error(detail || `Form service returned ${response.status}`);
      }

      form.reset();
      includeSetup.checked = true;
      type.value = 'Bug report';
      status.textContent = 'Sent — thank you! 🤖';
      status.className = 'feedback-status success';
      window.setTimeout(() => {
        if (!modal.hidden) closeModal();
      }, 1300);
    } catch (error) {
      status.textContent = navigator.onLine === false ? 'You are offline. Feedback was not queued or sent; try again when you are connected.' : 'Could not send feedback. Check your connection and try again. Nothing was queued.';
      status.className = 'feedback-status error';
      console.error('RosterBot feedback error:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send feedback';
    }
  });
})();
