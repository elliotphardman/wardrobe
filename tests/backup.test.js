import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from '../vendor/fflate.js';
import { buildBackup, readBackup } from '../src/core/backup.js';

const data = {
  items: [
    { id: 'a', type: 'top', colour: 'white', dressiness: 3, name: 'Shirt', createdAt: 1, photoBytes: new Uint8Array([1, 2, 3]) },
    { id: 'b', type: 'shoes', colour: 'brown', dressiness: 4, name: '', createdAt: 2, photoBytes: new Uint8Array([4, 5, 6]) },
  ],
  swipes: [{ id: 'w1', itemIds: { top: 'a', trousers: 'x', shoes: 'b' }, liked: true, at: 5 }],
};

test('backup round trip', () => {
  assert.deepEqual(readBackup(buildBackup(data)), data);
});

test('readBackup rejects non-backup zip', () => {
  const msg = /Not a wardrobe backup/;
  assert.throws(() => readBackup(zipSync({ 'other.txt': strToU8('hi') })), msg);
  assert.throws(() => readBackup(zipSync({ 'data.json': strToU8(JSON.stringify({ app: 'nope', version: 1 })) })), msg);
  assert.throws(() => readBackup(new Uint8Array([9, 8, 7, 6, 5])), msg);
});

test('readBackup rejects missing photo file', () => {
  const json = { app: 'wardrobe', version: 1, items: [{ id: 'a', type: 'top', colour: 'white', dressiness: 3, name: '', createdAt: 1, photoPath: 'photos/a.jpg' }], swipes: [] };
  assert.throws(() => readBackup(zipSync({ 'data.json': strToU8(JSON.stringify(json)) })), /Not a wardrobe backup/);
});
