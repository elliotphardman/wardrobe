// Asks iPhone users to add the app to their home screen, so Safari won't clear its data.
const KEY = 'installPromptDismissed';

function isStandalone() {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export function maybeShowInstallPrompt() {
  if (isStandalone()) return;
  try { if (localStorage.getItem(KEY)) return; } catch { /* storage unavailable */ }
  const el = document.getElementById('install-banner');
  el.innerHTML = '<p>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, to keep your wardrobe safe.</p><button aria-label="Dismiss">✕</button>';
  el.hidden = false;
  el.querySelector('button').addEventListener('click', () => {
    el.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  });
}
