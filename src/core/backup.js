// Backup format: a zip holding data.json plus photos/<id>.jpg.
import { zipSync, unzipSync, strToU8, strFromU8 } from '../../vendor/fflate.js';

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
  if (!data || data.app !== APP || data.version !== VERSION || !Array.isArray(data.items) || !Array.isArray(data.swipes)) {
    throw invalid();
  }
  const items = data.items.map(({ photoPath, ...rest }) => {
    const photoBytes = files[photoPath];
    if (!photoBytes) throw invalid();
    return { ...rest, photoBytes };
  });
  return { items, swipes: data.swipes };
}
