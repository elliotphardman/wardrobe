// Occasions and the dressiness range each one allows (1 = very casual, 5 = formal).

export const SLOTS = ['top', 'trousers', 'shoes'];

export const OCCASIONS = [
  { id: 'lounging', label: 'Lounging / errands', min: 1, max: 2 },
  { id: 'casual', label: 'Casual day out', min: 1, max: 3 },
  { id: 'work', label: 'Work / office', min: 3, max: 4 },
  { id: 'smart', label: 'Smart casual / dinner', min: 3, max: 4 },
  { id: 'date', label: 'Date night', min: 2, max: 4 },
  { id: 'night', label: 'Night out', min: 2, max: 4 },
  { id: 'formal', label: 'Formal / wedding', min: 4, max: 5 },
];

export function getOccasion(id) {
  const o = OCCASIONS.find(o => o.id === id);
  if (!o) throw new Error(`Unknown occasion: ${id}`);
  return o;
}

export function fitsOccasion(item, occasion) {
  return item.dressiness >= occasion.min && item.dressiness <= occasion.max;
}
