# Wardrobe

A personal iPhone web app. Photograph your clothes, pick an occasion, and get an outfit (top, trousers, shoes) made from what you own. Swipe through outfits to teach it your taste. Everything stays on your phone.

## Run locally

```
node scripts/serve.js 8080
```

Then open http://localhost:8080.

## Tests

```
npm install
npm test
```

## Project layout

- `src/core/`: pure logic (colours, occasions, style rules, taste model, outfit generator, backup format), unit-tested in `tests/`
- `src/data/db.js`: IndexedDB storage
- `src/ui/`: one module per screen
- `vendor/fflate.js`: zip library, copied from npm by `npm run vendor`
- `sw.js`: offline support. When you add a new app file, add it to `FILES` and bump `CACHE`.

## Publish to GitHub Pages

1. Create an empty public repository on GitHub (for example `wardrobe`).
2. Merge the `build/wardrobe-app` branch into `main`, then push `main` to it. (`.nojekyll` makes Pages serve the files untouched.)
3. On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, then choose `main` and `/ (root)`.
4. After a minute the app is live at `https://<your-username>.github.io/<repo>/`.

## iPhone checklist

- [ ] Open the Pages URL in Safari. The "Add to Home Screen" banner shows.
- [ ] Share → Add to Home Screen, then open the app from its icon (full screen, no Safari bars).
- [ ] Wardrobe → + Add → Take photo opens the camera. The photo saves, with a sensible colour pre-picked.
- [ ] Choose from library works too.
- [ ] Outfit: pick an occasion, get an outfit, lock a piece, tap "Another one".
- [ ] Train: swipe right and left, and undo.
- [ ] Turn on airplane mode, close and reopen the app. It still works.
- [ ] Settings → Export backup opens the share sheet → Save to Files works.
- [ ] Settings → Import backup restores from that file.
