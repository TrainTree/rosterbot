// IndexedDB recovery runs after the feature modules have loaded. Remember the
// real starting keys so module-created defaults cannot mask a saved mirror value.
try { window.__rosterbotLocalKeysAtStartup = Object.keys(localStorage); } catch (_) { window.__rosterbotLocalKeysAtStartup = null; }

window.addEventListener('error', function (event) {
  // Browsers/extensions can emit an opaque cross-origin "Script error." with no
  // useful filename/line information. Do not present that as a RosterBot failure.
  if (event && event.message === 'Script error.' && !event.filename && !event.lineno) return;
  var box = document.getElementById('fatalError');
  if (!box) return;
  box.hidden = false;
  var where = event && event.lineno ? ' (line ' + event.lineno + ')' : '';
  box.textContent = 'RosterBot error: ' + ((event && event.message) || 'unknown JavaScript error') + where;
});
