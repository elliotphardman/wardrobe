// Asks iPhone users to add the app to their home screen, so Safari won't clear its data.
const KEY = 'installPromptDismissed';

function isStandalone() {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export function maybeShowInstallPrompt() {
  if (isStandalone()) return;
  try { if (localStorage.getItem(KEY)) return; } catch { /* storage unavailable */ }
  const el = document.getElementById('install-banner');
  el.innerHTML = '<p><strong>Install first:</strong> tap Share, then <strong>Add to Home Screen</strong>, and use the app from there. Clothes added here in Safari won\'t move to the Home Screen app.</p><button aria-label="Dismiss">✕</button>';
  el.hidden = false;
  el.querySelector('button').addEventListener('click', () => {
    el.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  });
}
