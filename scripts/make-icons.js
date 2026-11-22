// Generates simple hanger icons as PNGs (no dependencies).
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function icon(size) {
  const bg = [196, 98, 66], fg = [251, 246, 238];
  const s = size / 100, w = 5 * s;
  // hanger: hook arc + body triangle (in 100x100 space)
  const segs = [[50, 38, 18, 66], [50, 38, 82, 66], [18, 66, 82, 66], [50, 38, 50, 30]];
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / s, v = y / s;
      let on = segs.some(([a, b, c, d]) => distToSeg(u, v, a, b, c, d) * s < w / 2);
      const r = Math.hypot(u - 50, v - 24);
      if (r * s > 6 * s - w / 2 && r * s < 6 * s + w / 2 && !(v > 24 && u < 50)) on = true;
      const px = on ? fg : bg;
      raw.set([...px, 255], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync('icons/icon-192.png', icon(192));
writeFileSync('icons/icon-512.png', icon(512));
writeFileSync('icons/apple-touch-icon.png', icon(180));
console.log('icons written');
