// On-device taste model learned from swipes.
import { SLOTS } from './occasions.js';

const W_ITEM = 0.5, W_PAIR = 1.5, W_CPAIR = 1.0, W_SLOT = 0.5;
const SLOT_PAIRS = [[0, 1], [0, 2], [1, 2]];

export function outfitKey(o) {
  return SLOTS.map(s => (typeof o[s] === 'string' ? o[s] : o[s].id)).join('|');
}

export function featuresOf(outfit) {
  const items = SLOTS.map(s => outfit[s]);
  const f = [];
  for (const it of items) f.push({ key: `item:${it.id}`, weight: W_ITEM });
  for (const [a, b] of SLOT_PAIRS) {
    const ids = [items[a].id, items[b].id].sort();
    f.push({ key: `pair:${ids[0]}|${ids[1]}`, weight: W_PAIR });
    f.push({ key: `cpair:${SLOTS[a]}=${items[a].colour}|${SLOTS[b]}=${items[b].colour}`, weight: W_CPAIR });
  }
  SLOTS.forEach((s, i) => f.push({ key: `slot:${s}=${items[i].colour}`, weight: W_SLOT }));
  return f;
}

export function buildModel(swipes, itemsById) {
  const scores = new Map();
  let count = 0;
  for (const sw of swipes) {
    const outfit = {};
    let ok = true;
    for (const s of SLOTS) {
      const it = itemsById.get(sw.itemIds[s]);
      if (!it) { ok = false; break; }
      outfit[s] = it;
    }
    if (!ok) continue;
    count++;
    const delta = sw.liked ? 1 : -1;
    for (const { key } of featuresOf(outfit)) scores.set(key, (scores.get(key) ?? 0) + delta);
  }
  return { scores, count };
}

export function tasteScore(model, outfit) {
  let sum = 0;
  for (const { key, weight } of featuresOf(outfit)) sum += weight * (model.scores.get(key) ?? 0);
  return Math.tanh(sum / 3);
}

export function tasteWeight(count) {
  return Math.min(1, count / 75);
}
