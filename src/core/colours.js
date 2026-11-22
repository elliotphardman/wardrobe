// Colour palette and colour detection helpers.

export const PALETTE = [
  { id: 'black', label: 'Black', rgb: [20, 20, 20], neutral: true },
  { id: 'white', label: 'White', rgb: [245, 245, 242], neutral: true },
  { id: 'grey', label: 'Grey', rgb: [140, 140, 140], neutral: true },
  { id: 'navy', label: 'Navy', rgb: [31, 41, 84], neutral: true },
  { id: 'blue', label: 'Blue', rgb: [45, 95, 185], neutral: false },
  { id: 'light-blue', label: 'Light blue', rgb: [166, 200, 235], neutral: false },
  { id: 'beige', label: 'Beige', rgb: [222, 203, 164], neutral: true },
  { id: 'brown', label: 'Brown', rgb: [110, 72, 45], neutral: true },
  { id: 'olive', label: 'Olive', rgb: [110, 115, 55], neutral: false },
  { id: 'green', label: 'Green', rgb: [50, 140, 70], neutral: false },
  { id: 'red', label: 'Red', rgb: [200, 35, 40], neutral: false },
  { id: 'burgundy', label: 'Burgundy', rgb: [110, 25, 45], neutral: false },
  { id: 'pink', label: 'Pink', rgb: [240, 160, 190], neutral: false },
  { id: 'yellow', label: 'Yellow', rgb: [240, 210, 60], neutral: false },
  { id: 'orange', label: 'Orange', rgb: [235, 125, 40], neutral: false },
  { id: 'purple', label: 'Purple', rgb: [110, 60, 150], neutral: false },
  { id: 'pattern', label: 'Pattern / multi', rgb: null, neutral: false },
];

const BY_ID = new Map(PALETTE.map(c => [c.id, c]));

export function isNeutral(id) {
  return BY_ID.get(id)?.neutral === true;
}

export function nearestColour([r, g, b]) {
  let best = null, bestDist = Infinity;
  for (const c of PALETTE) {
    if (!c.rgb) continue;
    const d = (c.rgb[0] - r) ** 2 + (c.rgb[1] - g) ** 2 + (c.rgb[2] - b) ** 2;
    if (d < bestDist) { bestDist = d; best = c.id; }
  }
  return best;
}

// Average RGB of the central 50% x 50% box of an RGBA pixel array.
export function averageCentre(pixels, width, height) {
  const x0 = Math.floor(width / 4), x1 = Math.ceil(width * 3 / 4);
  const y0 = Math.floor(height / 4), y1 = Math.ceil(height * 3 / 4);
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++;
    }
  }
  if (n === 0) return [0, 0, 0];
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}
