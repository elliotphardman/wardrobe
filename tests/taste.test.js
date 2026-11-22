import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featuresOf, buildModel, tasteScore, tasteWeight, outfitKey } from '../src/core/taste.js';

const item = (id, type, colour) => ({ id, type, colour, dressiness: 3 });
const T1 = item('t1', 'top', 'white'), T2 = item('t2', 'top', 'white');
const P1 = item('p1', 'trousers', 'navy'), S1 = item('s1', 'shoes', 'brown');
const O = { top: T1, trousers: P1, shoes: S1 };
const all = new Map([T1, T2, P1, S1].map(i => [i.id, i]));
const swipe = (o, liked, id = 'w' + Math.random()) =>
  ({ id, itemIds: { top: o.top.id, trousers: o.trousers.id, shoes: o.shoes.id }, liked, at: 0 });

test('featuresOf returns 12 features with sorted pair keys', () => {
  const f = featuresOf(O);
  assert.equal(f.length, 12);
  const pairs = f.filter(x => x.key.startsWith('pair:'));
  assert.equal(pairs.length, 3);
  for (const p of pairs) {
    const [a, b] = p.key.slice(5).split('|');
    assert.ok(a < b);
  }
});

test('like is positive, dislike negative, empty is zero', () => {
  assert.ok(tasteScore(buildModel([swipe(O, true)], all), O) > 0);
  assert.ok(tasteScore(buildModel([swipe(O, false)], all), O) < 0);
  assert.equal(tasteScore(buildModel([], all), O), 0);
});

test('buildModel ignores swipes with missing items', () => {
  const m = buildModel([{ id: 'x', itemIds: { top: 'gone', trousers: 'p1', shoes: 's1' }, liked: true, at: 0 }], all);
  assert.equal(m.count, 0);
  assert.equal(m.scores.has('item:gone'), false);
});

test('taste generalises to a new item of the same colour', () => {
  const m = buildModel([swipe(O, true)], all);
  assert.ok(tasteScore(m, { top: T2, trousers: P1, shoes: S1 }) > 0);
});

test('tasteWeight ramps to 1 at 75 swipes', () => {
  assert.equal(tasteWeight(0), 0);
  assert.equal(tasteWeight(75), 1);
  assert.equal(tasteWeight(300), 1);
});

test('outfitKey accepts outfits and itemIds', () => {
  assert.equal(outfitKey(O), 't1|p1|s1');
  assert.equal(outfitKey({ top: 't1', trousers: 'p1', shoes: 's1' }), 't1|p1|s1');
});
