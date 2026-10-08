// Capture exact raw values before any feature module can create defaults. The
// recovery preflight compares this immutable view with IndexedDB.
try {
  var rosterbotStartupStorage = {};
  for (var rosterbotStorageIndex = 0; rosterbotStorageIndex < localStorage.length; rosterbotStorageIndex++) {
    var rosterbotStorageKey = localStorage.key(rosterbotStorageIndex);
    if (rosterbotStorageKey != null) rosterbotStartupStorage[rosterbotStorageKey] = localStorage.getItem(rosterbotStorageKey);
  }
  window.__rosterbotLocalStateAtStartup = Object.freeze(rosterbotStartupStorage);
  window.__rosterbotLocalKeysAtStartup = Object.freeze(Object.keys(rosterbotStartupStorage));
} catch (error) {
  window.__rosterbotLocalStateAtStartup = null;
  window.__rosterbotLocalKeysAtStartup = null;
  try { if (window.RosterBotBootDiagnostics) window.RosterBotBootDiagnostics.capture('capability', error, { module: 'startup-storage-probe' }); } catch (_) {}
}

window.addEventListener('error', function (event) {
  // Browsers/extensions can emit an opaque cross-origin "Script error." with no
  // useful filename/line information. Do not present that as a RosterBot failure.
  if (event && event.message === 'Script error.' && !event.filename && !event.lineno) return;
  var diagnostics = window.RosterBotBootDiagnostics;
  var first = diagnostics && diagnostics.getFirstError ? diagnostics.getFirstError() : null;
  if (first && first.foundational) { diagnostics.show(); return; }
  var box = document.getElementById('fatalError');
  if (!box) return;
  box.hidden = false;
  var where = event && event.lineno ? ' (line ' + event.lineno + ')' : '';
  box.textContent = 'RosterBot error: ' + ((event && event.message) || 'unknown JavaScript error') + where;
});
