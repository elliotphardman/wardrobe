import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, OCCASIONS, getOccasion, fitsOccasion } from '../src/core/occasions.js';

test('slots and occasions', () => {
  assert.deepEqual(SLOTS, ['top', 'trousers', 'shoes']);
  assert.equal(OCCASIONS.length, 7);
  assert.deepEqual(OCCASIONS.map(o => o.id), ['lounging', 'casual', 'work', 'smart', 'date', 'night', 'formal']);
  const f = getOccasion('formal');
  assert.equal(f.min, 4);
  assert.equal(f.max, 5);
  assert.throws(() => getOccasion('nope'));
});

test('fitsOccasion checks dressiness range', () => {
  assert.equal(fitsOccasion({ dressiness: 3 }, getOccasion('work')), true);
  assert.equal(fitsOccasion({ dressiness: 5 }, getOccasion('work')), false);
});
