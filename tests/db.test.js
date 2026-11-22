import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../src/data/db.js';

let n = 0;
const fresh = () => db.openDb('test-' + (n++));
const item = (id, name = '') => ({ id, type: 'top', colour: 'white', dressiness: 3, name, createdAt: 1 });
const swipe = id => ({ id, itemIds: { top: 'a', trousers: 'b', shoes: 'c' }, liked: true, at: 1 });

test('save, list, get and update items', async () => {
  await fresh();
  await db.saveItem(item('a'));
  assert.equal((await db.listItems()).length, 1);
  assert.equal((await db.getItem('a')).id, 'a');
  await db.saveItem(item('a', 'renamed'));
  assert.equal((await db.listItems()).length, 1);
  assert.equal((await db.getItem('a')).name, 'renamed');
});

test('deleteItem and clearSwipes', async () => {
  await fresh();
  await db.saveItem(item('a'));
  await db.addSwipe(swipe('w1'));
  await db.clearSwipes();
  assert.equal((await db.listSwipes()).length, 0);
  assert.equal((await db.listItems()).length, 1);
  await db.deleteItem('a');
  assert.equal((await db.listItems()).length, 0);
});

test('replaceAll swaps both stores', async () => {
  await fresh();
  await db.saveItem(item('old'));
  await db.addSwipe(swipe('wold'));
  await db.replaceAll({ items: [item('n1'), item('n2')], swipes: [swipe('wnew')] });
  assert.deepEqual((await db.listItems()).map(i => i.id).sort(), ['n1', 'n2']);
  assert.deepEqual((await db.listSwipes()).map(s => s.id), ['wnew']);
});

test('deleteSwipe removes exactly one', async () => {
  await fresh();
  await db.addSwipe(swipe('w1'));
  await db.addSwipe(swipe('w2'));
  await db.deleteSwipe('w1');
  assert.deepEqual((await db.listSwipes()).map(s => s.id), ['w2']);
});

test('newId returns unique strings', () => {
  assert.notEqual(db.newId(), db.newId());
});

test('replaceAll with a bad record leaves old data untouched', async () => {
  await fresh();
  await db.saveItem(item('old'));
  await assert.rejects(db.replaceAll({ items: [item('n1'), { type: 'top' }], swipes: [] }));
  assert.deepEqual((await db.listItems()).map(i => i.id), ['old']);
});
