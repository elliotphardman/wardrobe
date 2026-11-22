// Train screen: swipe right to like an outfit, left to dislike.
import { SLOTS } from '../core/occasions.js';
import { buildModel, outfitKey } from '../core/taste.js';
import { nextTrainingOutfit, trainingBlocker } from '../core/generator.js';
import { addSwipe, deleteSwipe, newId } from '../data/db.js';
import { urlPool } from '../photo.js';
import { el } from './item-editor.js';
import { state, reload, toast, showScreen, currentScreen } from '../app.js';

const COMMIT_FRACTION = 0.3;
const pool = urlPool();
let sessionStack = []; // swipes made in this session, for undo: { swipe, outfit }
let pending = null;    // outfit to show next (used by undo)

// Forget undo history (after a reset or import, it would point at stale data).
export function resetSession() {
  sessionStack = [];
  pending = null;
}

const rerender = root => { if (currentScreen() === 'train') render(root); };

function pickNext() {
  if (pending) { const o = pending; pending = null; return o; }
  const byId = new Map(state.items.map(i => [i.id, i]));
  const model = buildModel(state.swipes, byId);
  const swiped = new Set(state.swipes.map(s => outfitKey(s.itemIds)));
  return nextTrainingOutfit(state.items, model, swiped);
}

async function record(outfit, liked, root) {
  const swipe = {
    id: newId(),
    itemIds: Object.fromEntries(SLOTS.map(s => [s, outfit[s].id])),
    liked,
    at: Date.now(),
  };
  try {
    await addSwipe(swipe);
    await reload();
    sessionStack.push({ swipe, outfit });
  } catch (e) {
    toast(`Couldn't save swipe: ${e.message}`);
  }
  rerender(root);
}

async function undo(root) {
  const last = sessionStack.pop();
  if (!last) return;
  try {
    await deleteSwipe(last.swipe.id);
    await reload();
    pending = last.outfit;
  } catch (e) {
    toast(`Couldn't undo: ${e.message}`);
  }
  rerender(root);
}

function attachDrag(card, onCommit) {
  let startX = 0, startY = 0, dx = 0, dragging = false;
  const like = card.querySelector('.stamp.like'), nope = card.querySelector('.stamp.nope');

  const setPos = (x, animate) => {
    card.style.transition = animate ? 'transform .25s ease' : 'none';
    card.style.transform = `translateX(${x}px) rotate(${x / 18}deg)`;
    const f = Math.min(1, Math.abs(x) / (card.offsetWidth * COMMIT_FRACTION));
    like.style.opacity = x > 0 ? f : 0;
    nope.style.opacity = x < 0 ? f : 0;
  };

  card.addEventListener('pointerdown', e => {
    dragging = true; startX = e.clientX; startY = e.clientY; dx = 0;
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener('pointermove', e => {
    if (!dragging) return;
    dx = e.clientX - startX;
    setPos(dx, false);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(dx) > card.offsetWidth * COMMIT_FRACTION) {
      fling(card, dx > 0, onCommit);
    } else {
      setPos(0, true);
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
  return { setPos };
}

function fling(card, liked, onCommit) {
  const w = card.offsetWidth * 1.6 * (liked ? 1 : -1);
  card.style.transition = 'transform .25s ease';
  card.style.transform = `translateX(${w}px) rotate(${w / 18}deg)`;
  card.querySelector(liked ? '.stamp.like' : '.stamp.nope').style.opacity = 1;
  setTimeout(() => onCommit(liked), 220);
}

export function render(root) {
  pool.clear();
  root.replaceChildren();
  const n = state.swipes.length;

  const counter = el('div', { class: 'counter' }, `${n} outfit${n === 1 ? '' : 's'} rated`);
  const undoBtn = el('button', {
    class: 'round small', 'aria-label': 'Undo last swipe',
    onclick: () => undo(root),
  }, '↶');
  undoBtn.disabled = !sessionStack.length;
  if (undoBtn.disabled) undoBtn.style.opacity = 0.35;

  const outfit = pickNext();
  if (!outfit) {
    const swiped = new Set(state.swipes.map(s => outfitKey(s.itemIds)));
    const reason = trainingBlocker(state.items, swiped);
    const goWardrobe = () => el('button', { class: 'btn', onclick: () => showScreen('wardrobe') }, 'Go to wardrobe');
    const content = {
      exhausted: [el('h2', {}, "You've rated every outfit"), el('p', {}, 'Add more clothes to keep training.')],
      'no-consistent': [el('h2', {}, 'Nothing to swipe yet'),
        el('p', {}, 'Your pieces are too far apart in dressiness to make an outfit. Add a few pieces with similar ratings (e.g. trainers and jeans rated 1–2).'), goWardrobe()],
      missing: [el('h2', {}, 'Nothing to swipe yet'), el('p', {}, 'Add at least one top, one pair of trousers and one pair of shoes.'), goWardrobe()],
    }[reason] ?? [el('h2', {}, 'Nothing to swipe right now')];
    root.append(el('div', { class: 'empty' }, content));
    if (sessionStack.length) root.append(el('div', { class: 'train-buttons' }, [undoBtn]));
    root.append(counter);
    return;
  }

  const card = el('div', { class: 'card' }, [
    ...SLOTS.map(s => el('img', { src: pool.url(outfit[s].photo), alt: '', draggable: 'false' })),
    el('div', { class: 'stamp like' }, 'LIKE'),
    el('div', { class: 'stamp nope' }, 'NOPE'),
  ]);
  let committed = false;
  const commit = liked => {
    if (committed) return;
    committed = true;
    record(outfit, liked, root);
  };
  attachDrag(card, commit);

  root.append(
    el('div', { class: 'deck' }, [card]),
    el('div', { class: 'train-buttons' }, [
      el('button', { class: 'round nope', 'aria-label': 'Dislike', onclick: () => fling(card, false, commit) }, '✕'),
      undoBtn,
      el('button', { class: 'round like', 'aria-label': 'Like', onclick: () => fling(card, true, commit) }, '♥'),
    ]),
    counter,
  );
}
