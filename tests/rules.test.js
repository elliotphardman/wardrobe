import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseScore } from '../src/core/rules.js';

const outfit = ([c1, c2, c3], [d1, d2, d3] = [3, 3, 3]) => ({
  top: { colour: c1, dressiness: d1 },
  trousers: { colour: c2, dressiness: d2 },
  shoes: { colour: c3, dressiness: d3 },
});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('all neutral, same dressiness scores 1', () => close(baseScore(outfit(['white', 'navy', 'brown'])), 1.0));
test('one clash costs 0.5', () => close(baseScore(outfit(['red', 'pink', 'white'])), 0.5));
test('clash plus three non-neutrals', () => close(baseScore(outfit(['red', 'green', 'yellow'])), 1.0 - 0.5 - 0.6));
test('two patterns cost 0.5', () => close(baseScore(outfit(['pattern', 'pattern', 'black'])), 0.5));
test('dressiness spread of 4 costs 0.75', () => close(baseScore(outfit(['white', 'navy', 'brown'], [1, 3, 5])), 0.25));
