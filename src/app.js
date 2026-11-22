// App bootstrap: shared state, screen switching, toasts, service worker.
import * as db from './data/db.js';
import * as wardrobe from './ui/wardrobe.js';
import * as outfit from './ui/outfit.js';
import * as train from './ui/train.js';
import * as settings from './ui/settings.js';
import { maybeShowInstallPrompt } from './ui/install-prompt.js';

export const APP_VERSION = '1.0.0';
export const state = { items: [], swipes: [] };

const screens = { wardrobe, outfit, train, settings };
const titles = { wardrobe: 'Wardrobe', outfit: 'Outfit', train: 'Train', settings: 'Settings' };
let current = null;

export async function reload() {
  const [items, swipes] = await Promise.all([db.listItems(), db.listSwipes()]);
  state.items = items.sort((a, b) => b.createdAt - a.createdAt);
  state.swipes = swipes.sort((a, b) => a.at - b.at);
}

export async function showScreen(name) {
  current = name;
  document.getElementById('title').textContent = titles[name];
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.screen === name);
  const root = document.getElementById('screen');
  root.replaceChildren();
  window.scrollTo(0, 0);
  await screens[name].render(root);
}

export const currentScreen = () => current;

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

async function start() {
  for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => showScreen(t.dataset.screen));
  document.getElementById('settings-btn').addEventListener('click', () => showScreen('settings'));

  navigator.storage?.persist?.().catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  maybeShowInstallPrompt();

  try {
    await reload();
  } catch (e) {
    toast(`Couldn't open storage: ${e.message}`);
  }
  await showScreen(state.items.length ? 'outfit' : 'wardrobe');
}

start();
