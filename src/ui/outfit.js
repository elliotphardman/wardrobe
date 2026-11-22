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

  root.append(el('div', { class: 'chips' }, OCCASIONS.map(o => el('button', {
    class: `chip${o.id === occasionId ? ' active' : ''}`,
    onclick: () => { setOccasion(o.id); render(root); },
  }, o.label))));
  root.querySelector('.chip.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });

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
  root.append(el('div', { class: 'outfit-stack' }, SLOTS.map(s => {
    const item = outfit[s];
    const isLocked = locked[s]?.id === item.id;
    return el('div', { class: 'piece' }, [
      el('img', { src: pool.url(item.photo), alt: '' }),
      el('div', { class: 'info' }, [
        el('div', { class: 'slot' }, SLOT_LABEL[s]),
        el('div', { class: 'name' }, item.name || `${colourLabel(item.colour)} ${SLOT_LABEL[s].toLowerCase()}`),
        el('div', { class: 'muted' }, colourLabel(item.colour)),
      ]),
      el('button', {
        class: `lock${isLocked ? ' on' : ''}`,
        'aria-pressed': String(isLocked),
        onclick: () => {
          if (isLocked) delete locked[s]; else locked[s] = item;
          render(root);
        },
      }, isLocked ? 'Locked' : 'Lock'),
    ]);
  })));

  root.append(el('div', { class: 'outfit-actions' }, [
    el('button', { class: 'btn block', onclick: () => { next(); render(root); } }, 'Another one'),
  ]));
}
