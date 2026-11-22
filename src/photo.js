// Photo compression and centre-colour sampling.
import { averageCentre } from './core/colours.js';

export async function compressImage(file, maxDim = 1024, quality = 0.8) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await loadViaImg(file);
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const centreRgb = averageCentre(ctx.getImageData(0, 0, w, h).data, w, h);
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not compress photo'))), 'image/jpeg', quality));
  return { blob, centreRgb };
}

function loadViaImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that photo")); };
    img.src = url;
  });
}

// Tracks object URLs for a screen so they can be revoked on re-render.
export function urlPool() {
  const urls = [];
  return {
    url(blob) { const u = URL.createObjectURL(blob); urls.push(u); return u; },
    clear() { urls.splice(0).forEach(u => URL.revokeObjectURL(u)); },
  };
}
