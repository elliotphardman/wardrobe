# Wardrobe Outfit App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable iPhone web app that stores a photographed wardrobe on-device, generates occasion-appropriate outfits (top + trousers + shoes), and learns the user's taste from swipes.

**Architecture:** A static site with no build step, written as native ES modules and served from GitHub Pages. Pure logic lives in `src/core/` (colours, occasions, base rules, taste model, generator, backup zip) and is unit-tested with Node's built-in test runner. `src/data/db.js` wraps IndexedDB. `src/ui/` holds one module per screen, rendered with plain DOM.

**Tech Stack:** Vanilla JS (ES2022 modules), IndexedDB, Service Worker + Web App Manifest, `fflate` (vendored, for zip), `node --test`, `fake-indexeddb` (dev only).

**Spec:** `docs/superpowers/specs/2026-11-22-wardrobe-outfit-app-design.md`

## Global Constraints

- Target: iPhone Safari, installed to the home screen. Test on iOS Safari first.
- Must work offline once installed. No server-side logic; all data on-device in IndexedDB.
- Works under a GitHub Pages subpath `/<repo-name>/`: every URL relative (`./`), including manifest `start_url`, `scope` and service worker registration.
- Outfit = exactly one `top`, one `trousers`, one `shoes`.
- Dressiness is an integer 1 (very casual) to 5 (formal).
- Photos compressed to well under 200 KB each (target max dimension 1024 px, JPEG quality 0.8).
- Camera: `<input type="file" accept="image/*" capture="environment">`, plus a separate library picker without `capture`.
- Call `navigator.storage.persist()`. Show an "Add to Home Screen" prompt when not running standalone.
- Export: a zip delivered through the Web Share API (`navigator.share({files})`), falling back to a download link. Nudge a backup after every 20 new items.
- "Another one" on the Outfit screen is not a dislike.
- Learned-taste weight ramps up over about the first 75 swipes.
- No runtime dependencies except vendored `fflate`. No frameworks, no bundler.

## Review Focus

1. **Wardrobe can't make an outfit for an occasion** (no shoes rated 4+, or an empty slot): the user expects a message naming the missing slot(s), not a blank screen. Test: `generate reports missing slots` (Task 4).
2. **Small wardrobe exhausts the training deck**: once every possible outfit is rated, show "You've rated every outfit" instead of looping or repeating forever. Test: `training deck returns null when exhausted` (Task 4).
3. **Item deleted after it was swiped**: the taste model skips swipes that reference missing items, with no crash and no stale scores for the deleted item. Test: `buildModel ignores swipes with missing items` (Task 3).
4. **Importing a wrong or corrupt file**: show an error and leave existing data untouched. Test: `readBackup rejects non-backup zip` (Task 5); the UI replaces data only after a successful parse (Task 11).
5. **Locked piece outside the occasion's range**: the locked piece is kept as-is; only the other slots are filtered by the occasion. Test: `locked piece is kept even outside occasion range` (Task 4).

---

## Shared data shapes (used across tasks)

```js
// Slot = 'top' | 'trousers' | 'shoes'
// Item   = { id: string, type: Slot, colour: ColourId, dressiness: 1..5, name: string, photo: Blob, createdAt: number }
// Outfit = { top: Item, trousers: Item, shoes: Item }
// Swipe  = { id: string, itemIds: { top: string, trousers: string, shoes: string }, liked: boolean, at: number }
// Core functions accept items without `photo` (they never read it).
```

`SLOTS = ['top', 'trousers', 'shoes']` is exported from `src/core/occasions.js` (Task 2).

---

### Task 1: Project scaffold and colours module

**Files:**
- Create: `package.json`, `.gitignore`, `src/core/colours.js`
- Test: `tests/colours.test.js`

**Interfaces:**
- Produces:
  - `PALETTE: Array<{ id: ColourId, label: string, rgb: [number, number, number], neutral: boolean }>`, containing exactly these ids: `black, white, grey, navy, blue, light-blue, beige, brown, olive, green, red, burgundy, pink, yellow, orange, purple, pattern`. Neutral: `black, white, grey, navy, beige, brown`. `pattern` has `rgb: null` and is never returned by `nearestColour`.
  - `nearestColour(rgb: [r,g,b]): ColourId` (nearest by Euclidean RGB distance among non-pattern entries)
  - `averageCentre(pixels: Uint8ClampedArray, width: number, height: number): [r,g,b]`, averaging the RGBA pixels inside the central 50% × 50% box
  - `isNeutral(id: ColourId): boolean`

- [ ] **Step 1: Scaffold.** `git init`. `package.json` with `"type": "module"`, `"private": true`, and scripts `"test": "node --test tests/"` and `"vendor": "node scripts/vendor.js"` (the script is added in Task 5). `.gitignore`: `node_modules/`.
- [ ] **Step 2: Write failing tests** in `tests/colours.test.js`:
  - `nearestColour([250,250,250]) === 'white'`, `nearestColour([10,10,10]) === 'black'`, `nearestColour([20,30,90]) === 'navy'`, `nearestColour([200,30,30]) === 'red'`
  - `averageCentre` on a 4×4 image whose central 2×2 is `[255,0,0,255]` and whose border is `[0,0,255,255]` returns `[255,0,0]`
  - `isNeutral('navy') === true`, `isNeutral('red') === false`, `isNeutral('pattern') === false`
  - every `PALETTE` id is unique, and the list matches the 17 ids above
- [ ] **Step 3: Run** `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement** `src/core/colours.js`. Pick each RGB so the tests pass (e.g. navy `[31,41,84]`, light-blue `[166,200,235]`, beige `[222,203,164]`).
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: project scaffold and colour palette`.

### Task 2: Occasions and base style rules

**Files:**
- Create: `src/core/occasions.js`, `src/core/rules.js`
- Test: `tests/occasions.test.js`, `tests/rules.test.js`

**Interfaces:**
- Consumes: `isNeutral` (Task 1)
- Produces:
  - `SLOTS: ['top','trousers','shoes']`
  - `OCCASIONS: Array<{ id: string, label: string, min: number, max: number }>`, in this order: `lounging` "Lounging / errands" 1–2; `casual` "Casual day out" 1–3; `work` "Work / office" 3–4; `smart` "Smart casual / dinner" 3–4; `date` "Date night" 2–4; `night` "Night out" 2–4; `formal` "Formal / wedding" 4–5
  - `getOccasion(id: string): Occasion` (throws on an unknown id)
  - `fitsOccasion(item: Item, occasion: Occasion): boolean`
  - `baseScore(outfit: Outfit): number`

`baseScore` algorithm (exact):
```
score = 1.0
colours = [top.colour, trousers.colour, shoes.colour]
for each unordered pair of distinct colours in CLASHES: score -= 0.5
  CLASHES = {red|pink, red|orange, purple|orange, green|red, black|navy, black|brown, pink|orange}
nonNeutral = distinct colours with !isNeutral (pattern counts as non-neutral)
if nonNeutral.size >= 3: score -= 0.6
patterns = count of 'pattern' among colours; if patterns >= 2: score -= 0.5 * (patterns - 1)
spread = max(dressiness) - min(dressiness); if spread > 1: score -= 0.25 * (spread - 1)
return score
```

- [ ] **Step 1: Write failing tests:**
  - `OCCASIONS.length === 7`; `getOccasion('formal')` gives `min 4, max 5`; `getOccasion('nope')` throws
  - `fitsOccasion({dressiness:3}, getOccasion('work')) === true`, and with `dressiness:5` it is `false`
  - `baseScore` of white / navy / brown, all dressiness 3, `=== 1.0`
  - `baseScore` of red / pink / white, all 3, `=== 0.5`
  - `baseScore` of red / green / yellow `=== 1.0 - 0.5 - 0.6` (red|green clash plus three non-neutrals)
  - `baseScore` of pattern / pattern / black `=== 0.5`
  - `baseScore` of neutral colours with dressiness 1 / 3 / 5 `=== 0.25`
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: occasions and base style rules`.

### Task 3: Taste model

**Files:**
- Create: `src/core/taste.js`
- Test: `tests/taste.test.js`

**Interfaces:**
- Consumes: `SLOTS` (Task 2)
- Produces:
  - `featuresOf(outfit: Outfit): Array<{ key: string, weight: number }>`
  - `buildModel(swipes: Swipe[], itemsById: Map<string, Item>): { scores: Map<string, number>, count: number }`
  - `tasteScore(model, outfit: Outfit): number` (range −1..1)
  - `tasteWeight(count: number): number` = `Math.min(1, count / 75)`
  - `outfitKey(outfitOrItemIds): string` = `${top}|${trousers}|${shoes}` ids (accepts either an `Outfit` or `Swipe.itemIds`)

Features and weights (exact):
- `item:<id>` for each of the 3 items, weight 0.5
- `pair:<idA>|<idB>` for each of the 3 item pairs (ids sorted), weight 1.5
- `cpair:<slotA>=<colA>|<slotB>=<colB>` for each of the 3 slot pairs (in SLOTS order), weight 1.0
- `slot:<slot>=<colour>` for each slot, weight 0.5

`buildModel`: skip any swipe where an item id isn't in `itemsById`. For the rest, add +1 (liked) or −1 (disliked) to the score of every feature key, using the colours of the items **as they are now**. `count` = number of swipes used.
`tasteScore` = `Math.tanh(sum(weight × (scores.get(key) ?? 0)) / 3)`.

- [ ] **Step 1: Write failing tests:**
  - `featuresOf` returns 12 features, with 3 `pair:` keys whose ids are sorted
  - after one liked swipe of outfit O, `tasteScore(model, O) > 0`; after one disliked swipe, `< 0`; with an empty model it is `0`
  - **`buildModel ignores swipes with missing items`**: a swipe referencing a deleted id gives `count === 0`, and no `item:<deletedId>` key is in `scores`
  - generalisation: liking (white top, navy trousers, brown shoes) gives a positive `tasteScore` for a *different* white top with the same trousers and shoes
  - `tasteWeight(0) === 0`, `tasteWeight(75) === 1`, `tasteWeight(300) === 1`
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/core/taste.js`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: on-device taste model`.

### Task 4: Outfit generator and training deck

**Files:**
- Create: `src/core/generator.js`
- Test: `tests/generator.test.js`

**Interfaces:**
- Consumes: `SLOTS, getOccasion, fitsOccasion` (Task 2), `baseScore` (Task 2), `tasteScore, tasteWeight, outfitKey` (Task 3)
- Produces:
  - `totalScore(outfit, model): number` = `(1 - 0.7*w) * baseScore(outfit) + 2*w * tasteScore(model, outfit)`, where `w = tasteWeight(model.count)`
  - `generateOutfit(items: Item[], occasionId: string, model, opts?: { locked?: Partial<Record<Slot, Item>>, avoidKeys?: Set<string>, rng?: () => number }): { outfit: Outfit | null, missing: Slot[] }`
  - `nextTrainingOutfit(items: Item[], model, swipedKeys: Set<string>, rng?: () => number): Outfit | null`

`generateOutfit` algorithm:
1. Each slot's pool = `[locked[slot]]` if locked (kept even when it doesn't fit the occasion), else the items of that type that `fitsOccasion`.
2. `missing` = slots with an empty pool; if any, return `{ outfit: null, missing }`.
3. If the product of pool sizes is ≤ 5000, enumerate every combination; otherwise sample 2000 random combinations.
4. Drop candidates whose `outfitKey` is in `avoidKeys`, unless that would leave none.
5. Sort by `totalScore` descending, take the top 5, and pick one uniformly with `rng`.

`nextTrainingOutfit` algorithm:
1. Return `null` if any slot has no items.
2. Candidates = every combination (or 2000 samples if more than 5000) with dressiness spread ≤ 1, excluding `swipedKeys`.
3. If there are none, return `null`.
4. With probability 0.7 pick uniformly from the top 10 by `totalScore` (exploit); otherwise pick uniformly from all candidates (explore).

Tests use a seeded `rng` (a tiny mulberry32 in the test file) and a fixture wardrobe of plain objects.

- [ ] **Step 1: Write failing tests:**
  - **`generate reports missing slots`**: a wardrobe with no shoes rated ≥ 4, occasion `formal`, gives `{ outfit: null, missing: ['shoes'] }`; an empty wardrobe gives `missing` equal to all 3 slots
  - every generated outfit's items `fitsOccasion` for `work`
  - **`locked piece is kept even outside occasion range`**: locking a dressiness-1 top with `formal` still returns an outfit with that top, while trousers and shoes are 4–5
  - `avoidKeys` containing the only top-scoring outfit's key yields a different outfit when an alternative exists
  - with a model that strongly likes outfit X (20 liked swipes), `generateOutfit` returns X in at least 15 of 20 seeded runs
  - **`training deck returns null when exhausted`**: 1 top, 1 trousers, 1 shoes, with that one outfit in `swipedKeys`, gives `null`
  - training outfits always have dressiness spread ≤ 1
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/core/generator.js`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: outfit generator and training deck`.

### Task 5: Backup zip format

**Files:**
- Create: `scripts/vendor.js`, `vendor/fflate.js` (generated), `src/core/backup.js`
- Test: `tests/backup.test.js`

**Interfaces:**
- Produces:
  - `buildBackup({ items: Array<Item & { photoBytes: Uint8Array }>, swipes: Swipe[] }): Uint8Array` (zip)
  - `readBackup(bytes: Uint8Array): { items: Array<Item & { photoBytes: Uint8Array }>, swipes: Swipe[] }`, which throws `Error('Not a wardrobe backup')` on anything invalid

Zip layout: `data.json` = `{ app: 'wardrobe', version: 1, items: [ ...item fields without photo, photoPath: 'photos/<id>.jpg' ], swipes }`, plus `photos/<id>.jpg` for each item. Store photos uncompressed (they're already JPEG); deflate `data.json`.

- [ ] **Step 1: Vendor fflate.** `npm i -D fflate fake-indexeddb`. `scripts/vendor.js` copies `node_modules/fflate/esm/browser.js` to `vendor/fflate.js`. Run `npm run vendor` and commit `vendor/fflate.js`, so the site needs no npm on GitHub Pages.
- [ ] **Step 2: Write failing tests:**
  - a round trip of 2 items (with 3-byte `photoBytes`) and 1 swipe deep-equals the input
  - **`readBackup rejects non-backup zip`**: a zip with no `data.json`, a zip whose `data.json` has `app !== 'wardrobe'`, and random bytes all throw `Not a wardrobe backup`
  - an item whose `photoPath` file is missing throws the same error
- [ ] **Step 3: Run** `npm test`. Expected: FAIL.
- [ ] **Step 4: Implement** `src/core/backup.js` with `zipSync`/`unzipSync`/`strToU8`/`strFromU8` from `../../vendor/fflate.js`.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: backup zip format`.

### Task 6: IndexedDB storage

**Files:**
- Create: `src/data/db.js`
- Test: `tests/db.test.js`

**Interfaces:**
- Produces (all async): `openDb(name = 'wardrobe')`; `listItems()`, `getItem(id)`, `saveItem(item)` (insert or update), `deleteItem(id)`; `listSwipes()`, `addSwipe(swipe)`, `deleteSwipe(id)`, `clearSwipes()`; `replaceAll({ items, swipes })` (clears and writes both stores in **one transaction**); `newId(): string` (`crypto.randomUUID()`).
- DB version 1, object stores `items` and `swipes`, both keyed by `id`. Photos are stored as `Blob` inside items.
- Module-level connection: `openDb` caches it; the other functions call `openDb()` lazily.

- [ ] **Step 1: Write failing tests** (with `import 'fake-indexeddb/auto'` at the top, and a fresh db name per test):
  - save → list → get round trip; `saveItem` with an existing id updates it
  - `deleteItem` removes the item; `clearSwipes` empties swipes but leaves items
  - `replaceAll` swaps the contents of both stores
  - `deleteSwipe` removes exactly one swipe
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/data/db.js` with promise-wrapped raw IndexedDB (no library).
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: IndexedDB storage`.

### Task 7: App shell, PWA and install prompt

**Files:**
- Create: `index.html`, `styles.css`, `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png` (180×180), `src/app.js`, `src/ui/install-prompt.js`, `.claude/launch.json`

**Interfaces:**
- Produces:
  - `src/app.js` exports `showScreen(name: 'wardrobe' | 'outfit' | 'train' | 'settings')`, `toast(message: string)`, and `state = { items: Item[], swipes: Swipe[] }` loaded at startup from db, with `reload(): Promise<void>` to refresh `state` from db.
  - Each screen module exports `render(root: HTMLElement): void | Promise<void>`. `app.js` calls it when the tab is shown.

Details:
- `index.html`: viewport meta with `viewport-fit=cover`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`, manifest link, `<main id="screen">`, and a bottom tab bar (Wardrobe / Outfit / Train) plus a settings gear in the header. Respect `env(safe-area-inset-*)`.
- `manifest.webmanifest`: `name` "Wardrobe", `start_url` "./", `scope` "./", `display` "standalone", icons.
- `sw.js`: cache-first for an explicit list of app files (versioned cache name `wardrobe-v1`, deleting old caches on activate). Register it with `navigator.serviceWorker.register('./sw.js')`.
- Startup: `navigator.storage?.persist?.()`.
- `install-prompt.js`: `maybeShowInstallPrompt()` shows a dismissible banner ("Tap Share, then Add to Home Screen, to keep your wardrobe safe") when `!navigator.standalone && !matchMedia('(display-mode: standalone)').matches`. Remember dismissal in `localStorage` (wrapped in try/catch).
- Icons: generate simple placeholder PNGs (a hanger glyph or "W" on a solid colour) with a small Node script or a canvas page; commit the PNGs.
- `.claude/launch.json`: a static server config (`npx http-server -p 8080 -c-1`).

- [ ] **Step 1: Build** the files above, with stub screen modules that render their name.
- [ ] **Step 2: Verify in the browser preview** (`preview_start`): the tabs switch screens, the console has no errors, the service worker registers, and the manifest loads with no errors.
- [ ] **Step 3: Run** `npm test`. Expected: PASS (nothing broken).
- [ ] **Step 4: Commit** `feat: app shell, PWA manifest and service worker`.

### Task 8: Wardrobe screen and adding pieces

**Files:**
- Create: `src/photo.js`, `src/ui/wardrobe.js`, `src/ui/item-editor.js`
- Modify: `sw.js` (add the new files to the cache list)

**Interfaces:**
- Consumes: `db` (Task 6), `PALETTE, nearestColour, averageCentre` (Task 1), `state, reload, toast` (Task 7)
- Produces:
  - `compressImage(file: File, maxDim = 1024, quality = 0.8): Promise<{ blob: Blob, centreRgb: [r,g,b] }>`, using `createImageBitmap(file, { imageOrientation: 'from-image' })`, a canvas resize, then `toBlob('image/jpeg', quality)`. `centreRgb` comes from `averageCentre` on the resized canvas.
  - `openItemEditor({ item?: Item, file?: File }): Promise<void>`, a full-screen sheet

Behaviour:
- Wardrobe: a grid of photo thumbnails (object URLs, revoked on re-render), filter chips All / Tops / Trousers / Shoes, item count, and a large "Add" button. The empty state explains how to start.
- "Add" opens two choices: **Take photo** (a hidden `<input type="file" accept="image/*" capture="environment">`, which opens the camera directly on iOS) and **Choose from library** (the same input without `capture`). On change, compress the photo, then open the editor with the colour pre-selected from `nearestColour(centreRgb)`.
- Editor: photo preview; type buttons (Top / Trousers / Shoes, required); colour swatches from `PALETTE` (pre-selected, tappable); dressiness 1–5 buttons labelled "Very casual" … "Formal"; optional name; Save; and Delete when editing. Save is disabled until a type is chosen.
- Tapping a thumbnail opens the editor for that item.
- After saving the 20th, 40th, … new item, `toast` "Time for a backup: Settings → Export".
- A failed save (e.g. storage full) gives `toast` with the error. The editor stays open with nothing lost.

- [ ] **Step 1: Implement** the files above.
- [ ] **Step 2: Verify in the browser preview** with a few test images from the desktop file picker: the item appears in the grid, the colour is pre-filled sensibly, editing persists after reload, delete works, the filters work, and the console has no errors.
- [ ] **Step 3: Commit** `feat: wardrobe screen with camera capture and item editor`.

### Task 9: Outfit screen

**Files:**
- Modify: `src/ui/outfit.js` (replacing the stub), `sw.js`

**Interfaces:**
- Consumes: `OCCASIONS` (Task 2), `buildModel` (Task 3), `generateOutfit, outfitKey` (Task 4), `state` (Task 7)

Behaviour:
- Occasion chips (from `OCCASIONS`), remembering the last choice in `localStorage` (try/catch).
- Three stacked cards (top, trousers, shoes), each with a photo, name or colour label, and a lock toggle.
- "Another one" calls `generateOutfit` with `locked` and `avoidKeys` = the keys shown in this session for this occasion. It records nothing as a dislike.
- Changing the occasion clears locks and `avoidKeys`.
- `missing` non-empty → a message such as "Add some shoes rated 4–5 to dress for Formal / wedding", naming each missing slot and the occasion's range.
- The model is rebuilt from `state.swipes` when the screen renders.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser preview** with a wardrobe of at least 3 tops, 3 trousers and 3 shoes at varied dressiness: each occasion gives fitting pieces, a lock holds across "Another one", the missing-slot message appears for `formal` when no item is rated 4+, and the console has no errors.
- [ ] **Step 3: Commit** `feat: outfit screen with occasions and locks`.

### Task 10: Train (swipe) screen

**Files:**
- Modify: `src/ui/train.js` (replacing the stub), `sw.js`

**Interfaces:**
- Consumes: `buildModel, outfitKey` (Task 3), `nextTrainingOutfit` (Task 4), `addSwipe, deleteSwipe, newId` (Task 6), `state, reload` (Task 7)

Behaviour:
- One outfit card: a stacked view of three photos. Drag with pointer events: the card follows the finger and rotates slightly. Release past 30% of the card width to commit a like (right) or dislike (left); otherwise it snaps back. Show "LIKE" / "NOPE" overlays while dragging.
- ✕ and ♥ buttons do the same thing as the gestures. Undo removes the last swipe from this session (`deleteSwipe`) and shows that outfit again.
- After each swipe: save it, update `state`, rebuild the model, and fetch the next card with `swipedKeys` built from all swipes.
- `null` from `nextTrainingOutfit` → "You've rated every outfit. Add more clothes to keep training" (or, if a slot is empty, "Add at least one top, trousers and shoes").
- Show a small counter: "N outfits rated".
- Use `touch-action: none` on the card so the page doesn't scroll during a swipe.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser preview**: drag gestures with the mouse and the buttons both record swipes (check `state.swipes` with the JS tool), undo works, the exhausted message shows with a 1×1×1 wardrobe, and the console has no errors.
- [ ] **Step 3: Commit** `feat: swipe training screen`.

### Task 11: Settings: export, import, reset

**Files:**
- Modify: `src/ui/settings.js` (replacing the stub), `sw.js`

**Interfaces:**
- Consumes: `buildBackup, readBackup` (Task 5), `listItems, listSwipes, replaceAll, clearSwipes` (Task 6), `state, reload, toast` (Task 7)

Behaviour:
- **Export:** read every item, convert photo Blobs to `Uint8Array`, run `buildBackup`, and wrap the result in `File([bytes], 'wardrobe-backup-YYYY-MM-DD.zip', { type: 'application/zip' })`. If `navigator.canShare?.({ files: [file] })`, call `navigator.share({ files: [file] })`; otherwise create an `<a download>` link and click it. A `share` rejected with `AbortError` is silent.
- **Import:** a file input (`accept=".zip,application/zip"`) → `readBackup` → a confirm dialog "Replace your wardrobe (N items) with this backup (M items)?" → convert `photoBytes` to `Blob(type 'image/jpeg')` → `replaceAll` → `reload`. If `readBackup` throws, `toast` "That file isn't a wardrobe backup" and change nothing.
- **Reset training:** confirm, then `clearSwipes`, then `reload`.
- Show the item and swipe counts, plus the app version.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser preview**: export downloads a zip (desktop has no share sheet); importing it into a cleared app restores the items with photos and swipes; importing a random `.zip` shows the error and the data is unchanged; reset clears swipes only.
- [ ] **Step 3: Commit** `feat: settings with backup export/import and reset`.

### Task 12: Publish to GitHub Pages and check on iPhone

**Files:**
- Create: `README.md` (what it is, how to run tests, how to deploy)

- [ ] **Step 1:** Bump the `sw.js` cache name if any app file changed since Task 7, and confirm every app file is in its cache list.
- [ ] **Step 2: Run** `npm test`. Expected: PASS.
- [ ] **Step 3: User step** (the user signs in; Claude never handles the password): the user creates an empty public GitHub repo (e.g. `wardrobe`). Claude adds the remote and pushes `main` **after the user confirms the repo URL**. The user enables Pages: Settings → Pages → Deploy from branch `main` / root.
- [ ] **Step 4: Verify on the Pages URL** in the browser preview: the app loads under `/<repo>/`, the service worker registers, and the console has no errors.
- [ ] **Step 5: iPhone check by the user**, with a checklist in the README: open in Safari → install banner shows → Add to Home Screen → open from the icon → Add opens the camera → photo saves with a sensible colour → outfit generates → swipe works → airplane mode, reopen, still works → Export opens the share sheet → Save to Files works.
- [ ] **Step 6: Commit** `docs: README with deploy and iPhone checklist`.
