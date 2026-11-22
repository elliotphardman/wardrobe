// Full-screen sheet for adding or editing a piece of clothing.
import { PALETTE } from '../core/colours.js';
import { saveItem, deleteItem, newId } from '../data/db.js';
import { state, reload, toast } from '../app.js';

const TYPES = [['top', 'Top'], ['trousers', 'Trousers'], ['shoes', 'Shoes']];
const DRESS_LABELS = ['Very casual', 'Casual', 'Smart casual', 'Smart', 'Formal'];
export const BACKUP_EVERY = 20;

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) e.append(c);
  return e;
}

// Opens the editor. `item` = existing piece; `photo` + `colour` = new piece from the camera.
// Resolves when the sheet closes; true if something changed.
export function openItemEditor({ item = null, photo = null, colour = 'black' } = {}) {
  return new Promise(resolve => {
    const draft = item
      ? { ...item }
      : { id: newId(), type: null, colour, dressiness: 2, name: '', photo, createdAt: Date.now() };
    const isNew = !item;
    const photoUrl = URL.createObjectURL(draft.photo);

    const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-label': isNew ? 'Add piece' : 'Edit piece' });
    const close = changed => {
      URL.revokeObjectURL(photoUrl);
      sheet.remove();
      resolve(changed);
    };

    const save = el('button', { class: 'btn block' }, isNew ? 'Save piece' : 'Save changes');
    const refresh = () => {
      save.disabled = !draft.type;
      typeSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === draft.type));
      dressSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', Number(b.dataset.v) === draft.dressiness));
      dressLabel.textContent = DRESS_LABELS[draft.dressiness - 1];
      swatches.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === draft.colour));
      colourLabel.textContent = PALETTE.find(c => c.id === draft.colour)?.label ?? '';
    };

    const typeSeg = el('div', { class: 'seg' }, TYPES.map(([v, label]) =>
      el('button', { 'data-v': v, onclick: () => { draft.type = v; refresh(); } }, label)));

    const dressSeg = el('div', { class: 'seg' }, [1, 2, 3, 4, 5].map(n =>
      el('button', { 'data-v': String(n), onclick: () => { draft.dressiness = n; refresh(); } }, String(n))));
    const dressLabel = el('div', { class: 'swatch-label' });

    const swatches = el('div', { class: 'swatches' }, PALETTE.map(c => el('button', {
      class: 'swatch', 'data-v': c.id, 'aria-label': c.label,
      style: c.rgb ? `background: rgb(${c.rgb.join(',')})` : 'background: conic-gradient(#c46242, #f0d23c, #328c46, #2d5fb9, #6e3c96, #c46242)',
      onclick: () => { draft.colour = c.id; refresh(); },
    })));
    const colourLabel = el('div', { class: 'swatch-label' });

    const name = el('input', { class: 'text-input', type: 'text', placeholder: 'e.g. White oxford shirt', maxlength: '60' });
    name.value = draft.name;
    name.addEventListener('input', () => { draft.name = name.value.trim(); });

    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        await saveItem(draft);
        await reload();
        if (isNew && state.items.length % BACKUP_EVERY === 0) toast('Time for a backup: Settings → Export');
        close(true);
      } catch (e) {
        toast(`Couldn't save: ${e.message}`);
        save.disabled = false;
      }
    });

    const actions = el('div', { class: 'sheet-actions' }, [save]);
    if (!isNew) {
      actions.append(el('button', {
        class: 'btn danger block',
        onclick: async () => {
          if (!confirm('Delete this piece?')) return;
          try {
            await deleteItem(draft.id);
            await reload();
            close(true);
          } catch (e) {
            toast(`Couldn't delete: ${e.message}`);
          }
        },
      }, 'Delete piece'));
    }

    sheet.append(
      el('div', { class: 'sheet-head' }, [
        el('h2', {}, isNew ? 'New piece' : 'Edit piece'),
        el('button', { class: 'btn secondary', onclick: () => close(false) }, 'Cancel'),
      ]),
      el('img', { class: 'preview', src: photoUrl, alt: '' }),
      el('div', { class: 'section-title' }, 'Type'), typeSeg,
      el('div', { class: 'section-title' }, 'Colour'), swatches, colourLabel,
      el('div', { class: 'section-title' }, 'How dressy?'), dressSeg, dressLabel,
      el('div', { class: 'section-title' }, 'Name (optional)'), name,
      actions,
    );
    document.body.append(sheet);
    refresh();
  });
}

export { el };
