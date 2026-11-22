// IndexedDB storage for items (with photo Blobs) and swipes.

let conn = null;
let connName = null;

export function openDb(name = 'wardrobe') {
  if (conn && connName === name) return conn;
  connName = name;
  conn = new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('items')) d.createObjectStore('items', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('swipes')) d.createObjectStore('swipes', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { conn = null; reject(req.error); };
  });
  return conn;
}

const done = tx => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
});

const result = req => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function read(store, fn) {
  const d = await openDb(connName ?? undefined);
  return result(fn(d.transaction(store, 'readonly').objectStore(store)));
}

async function write(stores, fn) {
  const d = await openDb(connName ?? undefined);
  const tx = d.transaction(stores, 'readwrite');
  const finished = done(tx);
  try {
    fn(tx);
  } catch (e) {
    tx.abort();
    finished.catch(() => {});
    throw e;
  }
  return finished;
}

export const listItems = () => read('items', s => s.getAll());
export const getItem = id => read('items', s => s.get(id));
export const saveItem = item => write('items', tx => tx.objectStore('items').put(item));
export const deleteItem = id => write('items', tx => tx.objectStore('items').delete(id));

export const listSwipes = () => read('swipes', s => s.getAll());
export const addSwipe = swipe => write('swipes', tx => tx.objectStore('swipes').put(swipe));
export const deleteSwipe = id => write('swipes', tx => tx.objectStore('swipes').delete(id));
export const clearSwipes = () => write('swipes', tx => tx.objectStore('swipes').clear());

export const replaceAll = ({ items, swipes }) => write(['items', 'swipes'], tx => {
  const is = tx.objectStore('items'), ss = tx.objectStore('swipes');
  is.clear(); ss.clear();
  for (const i of items) is.put(i);
  for (const s of swipes) ss.put(s);
});

export const newId = () => crypto.randomUUID();
