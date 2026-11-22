// Outfit screen: pick an occasion, get an outfit, lock pieces, ask for another.
import { OCCASIONS, SLOTS, getOccasion } from '../core/occasions.js';
import { PALETTE } from '../core/colours.js';
import { buildModel, outfitKey } from '../core/taste.js';
import { generateOutfit } from '../core/generator.js';
import { urlPool } from '../photo.js';
import { el } from './item-editor.js';
import { state, showScreen, dataVersion } from '../app.js';

const KEY = 'lastOccasion';
const SLOT_LABEL = { top: 'Top', trousers: 'Trousers', shoes: 'Shoes' };
const SLOT_PLURAL = { top: 'tops', trousers: 'trousers', shoes: 'shoes' };
const pool = urlPool();
const ICON = 'viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const LOCK_CLOSED = `<svg ${ICON}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
const LOCK_OPEN = `<svg ${ICON}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>`;

let occasionId = loadOccasion();
let locked = {};
let shown = new Set();
let current = null;
let seenVersion = -1;

function loadOccasion() {
  try {
    const v = localStorage.getItem(KEY);
    if (v && OCCASIONS.some(o => o.id === v)) return v;
  } catch { /* ignore */ }
  return 'casual';
}

function setOccasion(id) {
  occasionId = id;
  locked = {};
  shown = new Set();
  current = null;
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
}

const colourLabel = id => PALETTE.find(c => c.id === id)?.label ?? id;

function next() {
  const byId = new Map(state.items.map(i => [i.id, i]));
  // Refresh locks to the latest copy of each piece; drop deleted ones.
  for (const s of SLOTS) {
    if (!locked[s]) continue;
    const fresh = byId.get(locked[s].id);
    if (fresh) locked[s] = fresh; else delete locked[s];
  }
  const model = buildModel(state.swipes, byId);
  const result = generateOutfit(state.items, occasionId, model, { locked, avoidKeys: shown });
  if (result.outfit) shown.add(outfitKey(result.outfit));
  current = result;
}

export function render(root) {
  pool.clear();
  root.replaceChildren();

  if (!state.items.length) {
    root.append(el('div', { class: 'empty' }, [
      el('h2', {}, 'No clothes yet'),
      el('p', {}, 'Add some tops, trousers and shoes to your wardrobe first.'),
      el('button', { class: 'btn', onclick: () => showScreen('wardrobe') }, 'Go to wardrobe'),
    ]));
    return;
  }

  root.append(el('div', { class: 'tape', role: 'tablist', 'aria-label': 'Occasion' }, [
    el('div', { class: 'tape-strip' }, OCCASIONS.map(o => el('button', {
      class: o.id === occasionId ? 'active' : '',
      role: 'tab',
      'aria-selected': String(o.id === occasionId),
      onclick: () => { setOccasion(o.id); render(root); },
    }, o.label))),
  ]));
  root.querySelector('.tape .active')?.scrollIntoView({ inline: 'center', block: 'nearest' });

  // Regenerate if there's no outfit yet, or the wardrobe changed since the last one.
  if (!current?.outfit || seenVersion !== dataVersion) {
    seenVersion = dataVersion;
    next();
  }

  if (!current.outfit) {
    const occ = getOccasion(occasionId);
    const lines = current.missing.map(s =>
      `Add some ${SLOT_PLURAL[s]} rated ${occ.min}–${occ.max} to dress for ${occ.label}.`);
    root.append(el('div', { class: 'empty' }, [
      el('h2', {}, 'Not enough to work with'),
      ...lines.map(t => el('p', {}, t)),
      el('button', { class: 'btn', onclick: () => showScreen('wardrobe') }, 'Go to wardrobe'),
    ]));
    return;
  }

  const outfit = current.outfit;
  root.append(el('div', { class: 'look' }, SLOTS.map(s => {
    const item = outfit[s];
    const isLocked = locked[s]?.id === item.id;
    const name = item.name || `${colourLabel(item.colour)} ${SLOT_LABEL[s].toLowerCase()}`;
    const lock = el('button', {
      class: `lock${isLocked ? ' on' : ''}`,
      'aria-pressed': String(isLocked),
      'aria-label': isLocked ? `Unlock ${name}` : `Keep ${name}`,
      onclick: () => {
        if (isLocked) delete locked[s]; else locked[s] = item;
        render(root);
      },
    });
    lock.innerHTML = isLocked ? LOCK_CLOSED : LOCK_OPEN;
    return el('div', { class: 'look-piece' }, [
      el('img', { src: pool.url(item.photo), alt: '' }),
      el('span', { class: 'look-label' }, name),
      lock,
    ]);
  })));

  root.append(el('div', { class: 'outfit-actions' }, [
    el('button', { class: 'btn block', onclick: () => { next(); render(root); } }, 'Another one'),
  ]));
}
