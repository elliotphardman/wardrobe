import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, nearestColour, averageCentre, isNeutral } from '../src/core/colours.js';

const IDS = ['black', 'white', 'grey', 'navy', 'blue', 'light-blue', 'beige', 'brown', 'olive',
  'green', 'red', 'burgundy', 'pink', 'yellow', 'orange', 'purple', 'pattern'];

test('nearestColour maps obvious colours', () => {
  assert.equal(nearestColour([250, 250, 250]), 'white');
  assert.equal(nearestColour([10, 10, 10]), 'black');
  assert.equal(nearestColour([20, 30, 90]), 'navy');
  assert.equal(nearestColour([200, 30, 30]), 'red');
});

test('averageCentre averages only the central box', () => {
  const w = 4, h = 4, px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const centre = x >= 1 && x <= 2 && y >= 1 && y <= 2;
    px.set(centre ? [255, 0, 0, 255] : [0, 0, 255, 255], i);
  }
  assert.deepEqual(averageCentre(px, w, h), [255, 0, 0]);
});

test('isNeutral', () => {
  assert.equal(isNeutral('navy'), true);
  assert.equal(isNeutral('red'), false);
  assert.equal(isNeutral('pattern'), false);
});

test('palette has exactly the 17 unique ids', () => {
  const ids = PALETTE.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, IDS);
});
