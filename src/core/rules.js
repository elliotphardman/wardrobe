// Day-one style rules: colour harmony and dressiness consistency.
import { isNeutral } from './colours.js';

const CLASHES = new Set([
  'red|pink', 'red|orange', 'purple|orange', 'green|red', 'black|navy', 'black|brown', 'pink|orange',
].map(p => p.split('|').sort().join('|')));

export function baseScore(outfit) {
  const items = [outfit.top, outfit.trousers, outfit.shoes];
  const colours = items.map(i => i.colour);
  let score = 1.0;

  const distinct = [...new Set(colours)];
  for (let i = 0; i < distinct.length; i++) {
    for (let j = i + 1; j < distinct.length; j++) {
      if (CLASHES.has([distinct[i], distinct[j]].sort().join('|'))) score -= 0.5;
    }
  }

  const nonNeutral = distinct.filter(c => !isNeutral(c));
  if (nonNeutral.length >= 3) score -= 0.6;

  const patterns = colours.filter(c => c === 'pattern').length;
  if (patterns >= 2) score -= 0.5 * (patterns - 1);

  const d = items.map(i => i.dressiness);
  const spread = Math.max(...d) - Math.min(...d);
  if (spread > 1) score -= 0.25 * (spread - 1);

  return score;
}
