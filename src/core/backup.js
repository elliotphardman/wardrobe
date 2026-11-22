// Backup format: a zip holding data.json plus photos/<id>.jpg.
import { zipSync, unzipSync, strToU8, strFromU8 } from '../../vendor/fflate.js';
import { PALETTE } from './colours.js';
import { SLOTS } from './occasions.js';

const COLOURS = new Set(PALETTE.map(c => c.id));
const isStr = v => typeof v === 'string' && v.length > 0;
const validItem = i => i && isStr(i.id) && SLOTS.includes(i.type) && COLOURS.has(i.colour)
  && Number.isInteger(i.dressiness) && i.dressiness >= 1 && i.dressiness <= 5;
const validSwipe = s => s && isStr(s.id) && s.itemIds && SLOTS.every(k => isStr(s.itemIds[k]))
  && typeof s.liked === 'boolean';

const APP = 'wardrobe';
const VERSION = 1;

export function buildBackup({ items, swipes }) {
  const files = {};
  const meta = items.map(({ photoBytes, photo, ...rest }) => {
    const photoPath = `photos/${rest.id}.jpg`;
    files[photoPath] = [photoBytes, { level: 0 }];
    return { ...rest, photoPath };
  });
  files['data.json'] = strToU8(JSON.stringify({ app: APP, version: VERSION, items: meta, swipes }));
  return zipSync(files);
}

const invalid = () => new Error('Not a wardrobe backup');

export function readBackup(bytes) {
  let files, data;
  try {
    files = unzipSync(bytes);
    data = JSON.parse(strFromU8(files['data.json']));
  } catch {
    throw invalid();
  }
  if (!data || data.app !== APP || data.version !== VERSION || !Array.isArray(data.items) || !Array.isArray(data.swipes)
    || !data.items.every(validItem) || !data.swipes.every(validSwipe)) {
    throw invalid();
  }
  const items = data.items.map(({ photoPath, ...rest }) => {
    const photoBytes = files[photoPath];
    if (!photoBytes) throw invalid();
    return { ...rest, photoBytes };
  });
  return { items, swipes: data.swipes };
}
