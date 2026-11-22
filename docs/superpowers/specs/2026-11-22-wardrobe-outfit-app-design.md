# Wardrobe Outfit App: Design

Date: 2026-11-22

## Intent

A personal app for one person to digitize their own wardrobe and get outfit suggestions made only from clothes they own. They choose an occasion, and the app builds a coherent outfit (top, trousers, shoes) that suits the occasion **and their personal taste**.

"Stylish" means *what this person likes*, not generic fashion rules. Taste is learned with a swipe feature: the app shows outfits from the user's wardrobe, and the user swipes right (like) or left (dislike).

## Goals

- Add clothing by photographing it **straight from the app** using the phone camera.
- Store each piece with a photo, type, colour and dressiness.
- Choose an occasion and get a full outfit: one top, one pair of trousers, one pair of shoes.
- A swipe deck of generated outfits that trains the app's sense of the user's taste.
- Suggestions get noticeably closer to the user's taste as swipes pile up.
- Works on the user's phone and feels like an app (home-screen icon, full screen).

## Non-goals (v1)

- Categories beyond top / trousers / shoes (jackets, dresses, accessories, layering). The data model should not block adding them later.
- AI photo tagging or AI outfit judging (Approach B). Keep the code shaped so it can be added later.
- Accounts, cloud sync, multiple users, sharing.
- Weather, calendar, laundry tracking, wear history.
- App store distribution.

## Anti-goals (failure even if it "works")

- Random-looking outfits, especially before any training.
- Adding a piece takes long enough that the user gives up digitizing their wardrobe. Target: about 10 seconds per item after the photo.
- Swipes that don't visibly change what gets suggested.
- Losing the wardrobe (photos and tags) with no way to recover it.

## Key decisions (from the user)

- **Swipes mean "I like this outfit"**, not "I like it for this occasion." Taste is learned across all occasions. Occasion fit comes from each item's dressiness.
- **Approach A** chosen (see below).
- **In-app camera** for adding pieces.

## Approaches considered

- **A. Phone web app, all on-device (chosen).** Installable web app (PWA). Data and learning live on the phone. Free, private, no running costs, quickest to build. Cost: manual tagging (colour is auto-detected), and data lives on one device, so an export/import backup is required.
- **B. A plus Claude AI** for auto-tagging photos and judging outfits. Less typing, smarter judgement. Needs an API key, costs per use, and sends photos to Anthropic. Deferred; could be added later.
- **C. Native app-store app.** Ruled out: much more work and setup for no gain for a single user.

## Design

### Platform

- Static web app, installable as a PWA (manifest + service worker for offline use and home-screen install).
- Must be served over HTTPS to install on the phone and to use the camera.
- All data stored on-device in IndexedDB.

### Adding a piece

1. Tap "Add" and the phone camera opens. The user can also pick an existing photo from the gallery.
2. The photo is downscaled and compressed before saving, to keep storage small.
3. The app detects the main colour from the centre of the photo and pre-fills it. The user can correct it from a palette of named colours (e.g. black, white, grey, navy, blue, light blue, beige, brown, olive, green, red, burgundy, pink, yellow, orange, purple, plus "pattern/multi").
4. The user taps the type (top / trousers / shoes) and the dressiness (1 = very casual to 5 = formal).
5. Optional: a name ("white oxford shirt").
6. Save. Items can be edited or deleted from the wardrobe list.

### Occasions

A preset list, each mapped to a dressiness range. Every piece in an outfit must fall in the range.

| Occasion | Dressiness |
|---|---|
| Lounging / errands | 1–2 |
| Casual day out | 1–3 |
| Work / office | 3–4 |
| Smart casual / dinner | 3–4 |
| Date night | 2–4 |
| Night out | 2–4 |
| Formal / wedding | 4–5 |

(Builder's call: exact list and ranges; keep them easy to edit in one place.)

### Generating an outfit

1. Filter items by the occasion's dressiness range.
2. Build candidate outfits (top × trousers × shoes, sampled if the wardrobe is large).
3. Score each candidate as **base rules + learned taste**:
   - *Base rules* (the day-one fallback): colour harmony between pieces (neutrals go with anything, avoid known clashes, limit to one or two non-neutral colours) and dressiness consistency (pieces close together in dressiness).
   - *Learned taste*: see below. Its weight grows with the number of swipes, so personal taste gradually overrides the base rules.
4. Pick from the top-scoring candidates with a little randomness so repeated requests aren't identical.
5. The screen shows the three photos together. Actions: "Another one" (next suggestion), and **lock a piece** (keep this top, regenerate the rest).
6. If the occasion has no valid outfit (e.g. no shoes rated 4+), say exactly what's missing.

### Swipe training

- A deck of outfit cards from the whole wardrobe (any dressiness, but pieces in each outfit kept dressiness-consistent).
- Swipe right = like, left = dislike. Buttons as well as swipe gestures. An undo for the last swipe.
- The deck mixes outfits the app thinks you'll like with exploratory ones, so it keeps learning instead of only confirming what it already knows.
- The Outfit screen has no swipes, and "Another one" is not treated as a dislike. (Builder's call: whether to add an explicit thumbs-up/down there that feeds the same learning.)

### Learning model (on-device)

Keep it simple and explainable. Each swipe updates scores for features of the outfit:

- each individual item (likes this shirt)
- each pair of items (this shirt with these trousers)
- each pair of colours across pieces (navy top + beige trousers)
- each colour in each slot (white shoes)

An outfit's taste score = sum of its feature scores, with item-pair and colour-pair features weighted most. Pair features generalise to new items through colour. Store all swipes raw too, so the model can be rebuilt if the scoring changes.

### Backup

- Export the whole wardrobe (items, photos, swipes) as one file the user can save.
- Import from that file to restore or move to a new phone.

### Screens

1. **Wardrobe**: grid of pieces, filter by type, tap to edit, "Add" button opens the camera.
2. **Outfit**: occasion picker, outfit display, "Another one", lock buttons.
3. **Train**: swipe deck.
4. **Settings**: export/import, reset training.

Bottom tab bar for the first three; settings behind an icon.

## Constraints

- Single user, single phone. No server-side logic.
- Must work offline once installed.
- Phone browser storage limits: compress photos (target well under 200 KB each).

## Left to the builder

- Framework and tooling (keep it light; a single static site is enough).
- Exact colour palette, harmony rules and scoring weights.
- Card and screen visual design.
- Deployment setup on GitHub Pages (see Hosting below).

## Calls made without the user (check these)

- **Wardrobe size:** assume 50–300 items. Generate candidates exhaustively when small, sample when large.
- **Export format:** a zip (JSON data + image files), not one big JSON with base64 photos, so a 300-item backup stays manageable.
- **Learned-taste weight:** ramps up over roughly the first 50–100 swipes.

## Target device (decided: iPhone)

- Target iPhone Safari, installed to the home screen. Test on iOS Safari first.
- Storage: call `navigator.storage.persist()`. On first open in the browser, prompt the user to "Add to Home Screen", since Safari can clear data for sites that aren't installed. Nudge the user to export a backup periodically (e.g. after every 20 new items).
- Camera: use a file input with `accept="image/*" capture="environment"`. This opens the camera directly from an installed iOS web app. A second "Choose from library" input without `capture` covers existing photos.
- Export: deliver the zip through the Web Share API (share sheet, then "Save to Files"), with a download link as fallback.
- Import: a file picker that reads the zip back from Files.

## Hosting (decided: GitHub Pages)

- Host as a static site on GitHub Pages (free HTTPS). A public URL is acceptable: the site holds no user data.
- The user needs a GitHub account. Use relative paths so the site works under the `/<repo-name>/` subpath, including the manifest `start_url` and service worker scope.
