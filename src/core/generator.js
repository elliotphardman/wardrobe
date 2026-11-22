// Builds outfits for an occasion and picks outfits for the training deck.
import { SLOTS, getOccasion, fitsOccasion } from './occasions.js';
import { baseScore } from './rules.js';
import { tasteScore, tasteWeight, outfitKey } from './taste.js';

const MAX_EXHAUSTIVE = 5000;
const SAMPLE_SIZE = 2000;
const TOP_N = 5;
const PICK_TEMPERATURE = 0.1;

export function totalScore(outfit, model) {
  const w = tasteWeight(model.count);
  return (1 - 0.7 * w) * baseScore(outfit) + 2 * w * tasteScore(model, outfit);
}

function combos(pools, rng) {
  const [a, b, c] = SLOTS.map(s => pools[s]);
  const out = [];
  if (a.length * b.length * c.length <= MAX_EXHAUSTIVE) {
    for (const top of a) for (const trousers of b) for (const shoes of c) out.push({ top, trousers, shoes });
  } else {
    const pick = arr => arr[Math.floor(rng() * arr.length)];
    for (let i = 0; i < SAMPLE_SIZE; i++) out.push({ top: pick(a), trousers: pick(b), shoes: pick(c) });
  }
  return out;
}

// Highest score first; equal scores in random order so ties don't favour the newest items.
const byScore = (x, y) => y.score - x.score || x.tie - y.tie;

const byType = (items, slot) => items.filter(i => i.type === slot);
const spread = o => {
  const d = SLOTS.map(s => o[s].dressiness);
  return Math.max(...d) - Math.min(...d);
};

// Pick among the top candidates, favouring higher scores (equal scores -> uniform).
function pickWeighted(scored, rng) {
  const best = scored[0].score;
  const weights = scored.map(c => Math.exp((c.score - best) / PICK_TEMPERATURE));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i];
    if (r <= 0) return scored[i].outfit;
  }
  return scored[scored.length - 1].outfit;
}

export function generateOutfit(items, occasionId, model, opts = {}) {
  const { locked = {}, avoidKeys = new Set(), rng = Math.random } = opts;
  const occasion = getOccasion(occasionId);
  const pools = {};
  for (const s of SLOTS) {
    pools[s] = locked[s] ? [locked[s]] : byType(items, s).filter(i => fitsOccasion(i, occasion));
  }
  const missing = SLOTS.filter(s => pools[s].length === 0);
  if (missing.length) return { outfit: null, missing };

  let candidates = combos(pools, rng);
  const fresh = candidates.filter(o => !avoidKeys.has(outfitKey(o)));
  if (fresh.length) candidates = fresh;

  const scored = candidates
    .map(outfit => ({ outfit, score: totalScore(outfit, model), tie: rng() }))
    .sort(byScore)
    .slice(0, TOP_N);
  return { outfit: pickWeighted(scored, rng), missing: [] };
}

export function nextTrainingOutfit(items, model, swipedKeys, rng = Math.random) {
  const pools = {};
  for (const s of SLOTS) pools[s] = byType(items, s);
  if (SLOTS.some(s => pools[s].length === 0)) return null;

  const candidates = combos(pools, rng).filter(o => spread(o) <= 1 && !swipedKeys.has(outfitKey(o)));
  if (!candidates.length) return null;

  if (rng() < 0.7) {
    const top = candidates
      .map(outfit => ({ outfit, score: totalScore(outfit, model), tie: rng() }))
      .sort(byScore)
      .slice(0, 10);
    return top[Math.floor(rng() * top.length)].outfit;
  }
  return candidates[Math.floor(rng() * candidates.length)];
}

// Why nextTrainingOutfit has nothing to offer: 'missing' (a slot is empty),
// 'no-consistent' (no outfit has pieces within 1 dressiness of each other),
// 'exhausted' (every consistent outfit is rated), or null (there is one).
export function trainingBlocker(items, swipedKeys) {
  const pools = {};
  for (const s of SLOTS) pools[s] = byType(items, s);
  if (SLOTS.some(s => pools[s].length === 0)) return 'missing';
  const consistent = combos(pools, Math.random).filter(o => spread(o) <= 1);
  if (!consistent.length) return 'no-consistent';
  return consistent.some(o => !swipedKeys.has(outfitKey(o))) ? null : 'exhausted';
}
