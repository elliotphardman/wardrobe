import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateOutfit, nextTrainingOutfit, totalScore } from '../src/core/generator.js';
import { buildModel, outfitKey } from '../src/core/taste.js';
import { getOccasion, fitsOccasion } from '../src/core/occasions.js';

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const it = (id, type, colour, dressiness) => ({ id, type, colour, dressiness });
const WARDROBE = [
  it('t1', 'top', 'white', 1), it('t2', 'top', 'light-blue', 3), it('t3', 'top', 'white', 4), it('t4', 'top', 'grey', 5),
  it('p1', 'trousers', 'blue', 1), it('p2', 'trousers', 'navy', 3), it('p3', 'trousers', 'grey', 4), it('p4', 'trousers', 'black', 5),
  it('s1', 'shoes', 'white', 1), it('s2', 'shoes', 'brown', 3), it('s3', 'shoes', 'brown', 4), it('s4', 'shoes', 'black', 5),
];
const byId = new Map(WARDROBE.map(i => [i.id, i]));
const empty = buildModel([], byId);
const spread = o => { const d = [o.top, o.trousers, o.shoes].map(i => i.dressiness); return Math.max(...d) - Math.min(...d); };

test('generate reports missing slots', () => {
  const noFormalShoes = WARDROBE.filter(i => !(i.type === 'shoes' && i.dressiness >= 4));
  assert.deepEqual(generateOutfit(noFormalShoes, 'formal', empty), { outfit: null, missing: ['shoes'] });
  assert.deepEqual(generateOutfit([], 'casual', empty).missing, ['top', 'trousers', 'shoes']);
});

test('generated outfits fit the occasion', () => {
  const rng = mulberry32(1), work = getOccasion('work');
  for (let n = 0; n < 20; n++) {
    const { outfit } = generateOutfit(WARDROBE, 'work', empty, { rng });
    for (const i of [outfit.top, outfit.trousers, outfit.shoes]) assert.ok(fitsOccasion(i, work));
  }
});

test('locked piece is kept even outside occasion range', () => {
  const { outfit } = generateOutfit(WARDROBE, 'formal', empty, { locked: { top: byId.get('t1') }, rng: mulberry32(2) });
  assert.equal(outfit.top.id, 't1');
  assert.ok(outfit.trousers.dressiness >= 4 && outfit.shoes.dressiness >= 4);
});

test('avoidKeys steers away from a shown outfit', () => {
  const first = generateOutfit(WARDROBE, 'formal', empty, { rng: mulberry32(3) }).outfit;
  const next = generateOutfit(WARDROBE, 'formal', empty, { avoidKeys: new Set([outfitKey(first)]), rng: mulberry32(3) }).outfit;
  assert.notEqual(outfitKey(next), outfitKey(first));
});

test('strong taste wins most of the time', () => {
  const X = { top: 't2', trousers: 'p3', shoes: 's2' };
  const swipes = Array.from({ length: 20 }, (_, i) => ({ id: 'w' + i, itemIds: X, liked: true, at: i }));
  const model = buildModel(swipes, byId);
  const rng = mulberry32(4);
  let hits = 0;
  for (let n = 0; n < 20; n++) if (outfitKey(generateOutfit(WARDROBE, 'work', model, { rng }).outfit) === outfitKey(X)) hits++;
  assert.ok(hits >= 15, `hits=${hits}`);
});

test('training deck returns null when exhausted', () => {
  const tiny = [it('a', 'top', 'white', 3), it('b', 'trousers', 'navy', 3), it('c', 'shoes', 'brown', 3)];
  const m = buildModel([], new Map(tiny.map(i => [i.id, i])));
  assert.ok(nextTrainingOutfit(tiny, m, new Set(), mulberry32(5)));
  assert.equal(nextTrainingOutfit(tiny, m, new Set(['a|b|c']), mulberry32(5)), null);
  assert.equal(nextTrainingOutfit(tiny.slice(0, 2), m, new Set(), mulberry32(5)), null);
});

test('training outfits keep dressiness spread within 1', () => {
  const rng = mulberry32(6);
  for (let n = 0; n < 30; n++) assert.ok(spread(nextTrainingOutfit(WARDROBE, empty, new Set(), rng)) <= 1);
});

test('totalScore equals baseScore with no swipes', () => {
  const o = { top: byId.get('t2'), trousers: byId.get('p2'), shoes: byId.get('s2') };
  assert.equal(totalScore(o, empty), 1.0);
});
