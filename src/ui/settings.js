// Settings: backup export/import and reset training.
import { buildBackup, readBackup } from '../core/backup.js';
import { listItems, listSwipes, replaceAll, clearSwipes } from '../data/db.js';
import { el } from './item-editor.js';
import { state, reload, toast, APP_VERSION, currentScreen } from '../app.js';
import { resetSession } from './train.js';

const today = () => new Date().toISOString().slice(0, 10);

export async function buildBackupFile() {
  const [items, swipes] = await Promise.all([listItems(), listSwipes()]);
  const withBytes = await Promise.all(items.map(async ({ photo, ...rest }) =>
    ({ ...rest, photoBytes: new Uint8Array(await photo.arrayBuffer()) })));
  const bytes = buildBackup({ items: withBytes, swipes });
  return new File([bytes], `wardrobe-backup-${today()}.zip`, { type: 'application/zip' });
}

const canShareFile = file => !!navigator.canShare?.({ files: [file] });

// Must be called straight from a tap: Safari only allows share() right after user input.
export async function shareOrDownload(file) {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (e.name !== 'NotAllowedError') throw e;
    }
  }
  download(file);
}

function download(file) {
  const url = URL.createObjectURL(file);
  const a = el('a', { href: url, download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function importBackup(file) {
  let data;
  try {
    data = readBackup(new Uint8Array(await file.arrayBuffer()));
  } catch {
    toast("That file isn't a wardrobe backup");
    return false;
  }
  const ok = confirm(`Replace your wardrobe (${state.items.length} items) with this backup (${data.items.length} items)?`);
  if (!ok) return false;
  const items = data.items.map(({ photoBytes, ...rest }) => ({ ...rest, photo: new Blob([photoBytes], { type: 'image/jpeg' }) }));
  await replaceAll({ items, swipes: data.swipes });
  resetSession();
  await reload();
  toast(`Restored ${items.length} items`);
  return true;
}

export function render(root) {
  root.replaceChildren();

  const picker = el('input', { type: 'file', accept: '.zip,application/zip', hidden: '' });
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    try {
      if (await importBackup(file) && currentScreen() === 'settings') render(root);
    } catch (e) {
      toast(`Import failed: ${e.message}`);
    }
  });

  // Export takes two taps: build the file, then share it (iPhone needs share() right after a tap).
  let built = null;
  const exportLabel = el('span', {}, 'Export backup');
  const exportRow = el('button', { class: 'row' }, [exportLabel, el('span', { class: 'muted' }, '›')]);
  const resetExport = () => { built = null; exportLabel.textContent = 'Export backup'; };
  exportRow.addEventListener('click', async () => {
    try {
      if (built) {
        const file = built;
        resetExport();
        await shareOrDownload(file);
        return;
      }
      exportLabel.textContent = 'Preparing backup…';
      const file = await buildBackupFile();
      if (canShareFile(file)) {
        built = file;
        exportLabel.textContent = 'Tap again to save backup file';
      } else {
        resetExport();
        download(file);
      }
    } catch (e) {
      resetExport();
      toast(`Export failed: ${e.message}`);
    }
  });

  const row = (label, onclick, cls = '') => el('button', { class: `row ${cls}`, onclick }, [el('span', {}, label), el('span', { class: 'muted' }, '›')]);

  root.append(
    picker,
    el('div', { class: 'section-title' }, 'Your data'),
    el('div', { class: 'list' }, [
      el('div', { class: 'row' }, [el('span', {}, 'Pieces'), el('span', { class: 'muted' }, String(state.items.length))]),
      el('div', { class: 'row' }, [el('span', {}, 'Outfits rated'), el('span', { class: 'muted' }, String(state.swipes.length))]),
    ]),
    el('div', { class: 'section-title' }, 'Backup'),
    el('div', { class: 'list' }, [
      exportRow,
      row('Import backup', () => picker.click()),
    ]),
    el('p', { class: 'muted', style: 'font-size: 14px; margin: 8px 4px 0' },
      'Export saves everything to one file. On iPhone choose "Save to Files". Import replaces what\'s on this phone.'),
    el('div', { class: 'section-title' }, 'Training'),
    el('div', { class: 'list' }, [
      row('Reset training', async () => {
        if (!confirm('Forget all your swipes? Your clothes stay.')) return;
        try {
          await clearSwipes();
          resetSession();
          await reload();
          toast('Training reset');
          if (currentScreen() === 'settings') render(root);
        } catch (e) {
          toast(`Reset failed: ${e.message}`);
        }
      }, 'danger'),
    ]),
    el('p', { class: 'muted', style: 'font-size: 13px; text-align: center; margin-top: 24px' }, `Wardrobe ${APP_VERSION}`),
  );
}
