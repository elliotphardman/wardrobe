// Wardrobe screen: grid of pieces, filters, and adding new pieces from the camera.
import { PALETTE, nearestColour } from '../core/colours.js';
import { compressImage, urlPool } from '../photo.js';
import { openItemEditor, el } from './item-editor.js';
import { state, toast } from '../app.js';

const FILTERS = [['all', 'All'], ['top', 'Tops'], ['trousers', 'Trousers'], ['shoes', 'Shoes']];
const pool = urlPool();
let filter = 'all';

function swatchCss(colourId) {
  const c = PALETTE.find(p => p.id === colourId);
  return c?.rgb ? `rgb(${c.rgb.join(',')})` : 'conic-gradient(#c46242, #f0d23c, #328c46, #2d5fb9, #c46242)';
}

function fileInput(capture) {
  const input = el('input', { type: 'file', accept: 'image/*', hidden: '' });
  if (capture) input.setAttribute('capture', 'environment');
  return input;
}

async function addFromFile(file, root) {
  if (!file) return;
  let photo, colour;
  try {
    const { blob, centreRgb } = await compressImage(file);
    photo = blob;
    colour = nearestColour(centreRgb);
  } catch (e) {
    toast(e.message || "Couldn't read that photo");
    return;
  }
  if (await openItemEditor({ photo, colour })) render(root);
}

export function render(root) {
  pool.clear();
  root.replaceChildren();

  const camera = fileInput(true), library = fileInput(false);
  for (const input of [camera, library]) {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.value = '';
      addFromFile(file, root);
    });
  }

  const menu = el('div', { class: 'add-menu', hidden: '' }, [
    el('button', { class: 'btn block', onclick: () => camera.click() }, 'Take photo'),
    el('button', { class: 'btn secondary block', onclick: () => library.click() }, 'Choose from library'),
  ]);
  const addBtn = el('button', { class: 'btn', onclick: () => { menu.hidden = !menu.hidden; } }, '+ Add');

  const count = state.items.length;
  root.append(
    camera, library,
    el('div', { class: 'wardrobe-head' }, [
      el('div', { class: 'count' }, [
        `${count} piece${count === 1 ? '' : 's'}`,
        count ? el('span', {}, `${['top', 'trousers', 'shoes'].map(t =>
          `${state.items.filter(i => i.type === t).length} ${t === 'top' ? 'tops' : t}`).join(', ')}`) : '',
      ]),
      addBtn,
    ]),
    menu,
  );

  if (!count) {
    menu.hidden = false;
    root.append(el('div', { class: 'empty' }, [
      el('h2', {}, 'Start your wardrobe'),
      el('p', {}, 'Photograph each top, pair of trousers and pair of shoes on a plain background. Then tag what it is and how dressy it is.'),
    ]));
    return;
  }

  root.append(el('div', { class: 'chips' }, FILTERS.map(([v, label]) => el('button', {
    class: `chip${filter === v ? ' active' : ''}`,
    onclick: () => { filter = v; render(root); },
  }, label))));

  const shown = state.items.filter(i => filter === 'all' || i.type === filter);
  if (!shown.length) {
    root.append(el('div', { class: 'empty' }, [el('p', {}, 'Nothing here yet.')]));
    return;
  }
  root.append(el('div', { class: 'grid' }, shown.map(item => el('button', {
    class: 'thumb', 'aria-label': item.name || `${item.colour} ${item.type}`,
    onclick: async () => { if (await openItemEditor({ item })) render(root); },
  }, [
    el('img', { src: pool.url(item.photo), alt: '', loading: 'lazy' }),
    el('span', { class: 'dot', style: `background: ${swatchCss(item.colour)}` }),
  ]))));
}
