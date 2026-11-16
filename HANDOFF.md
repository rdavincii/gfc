# GFC Club Manager — Handoff Notes

## App location

This is a self-contained local browser app for Gamuda Football Club. Open `index.html` or serve this folder locally. It uses vanilla HTML, CSS, and JavaScript; no build step or package install is required.

## Current features

- Matches, results, poster studio, squad, formation board, club growth log, and Instagram planning.
- Poster studio uses GFC red/black art direction, supplied match photos, and the bundled Winner Cond font.
- Squad starts with 21 imported GFC player card artworks and the circular club logo.
- Formation screen is a responsive game-style tactics board. Player cards can be dragged or tapped into positions, swapped, or moved back to substitutes.
- Squad menu includes a card-template studio. Import a PSD/PSB composite or PNG/JPG background, arrange dynamic photo/logo/name/number/position/rating/text layers, choose fonts/colors/crop, and save a reusable template.
- Template edits redraw every player assigned to that template. The roster can be filtered by template. Individual card PNG export is available.
- Club data is stored in the browser's IndexedDB (`gfc-club-desk` / `kv`), with `localStorage` only as the legacy source and a fallback. Failed saves roll back, show a message, and leave the save indicator on "Not saved". Restore from backup asks first and validates the file.
- Formation changes keep the line-up; auto-fill assigns forwards to the top line and defenders to the back line (line roles were previously inverted).

## PSD and PSB behavior

`psd-import.js` reads a flattened composite from standard 8-bit RGB or grayscale PSD/PSB files. It does not import Photoshop layer groups, masks, smart objects, text layers, or effects as editable layers. The card workshop creates its own movable app layers over the composite. If the PSD contains sample player artwork or variable text, hide those layers in Photoshop before importing. Unsupported color mode or bit depth produces an error that recommends exporting a PNG.

## Main files

- `index.html`: application shell and script loading order.
- `app.js`: app state, views, card-template editor, PSD/image import, card generation, formation interactions, and other features.
- `styles.css`, `base.css`, `tokens.css`: GFC visual styling and responsive layouts.
- `psd-import.js`: PSD/PSB merged-composite decoder.
- `initial-data.js`: initial 21-player roster.
- `assets/`: club logos, match image, fonts, portraits, and finished player card artwork.

## Local storage keys

- IndexedDB `gfc-club-desk` → store `kv` → key `gfc-club-desk-v1`: all app data, including imported template artwork data URLs. The same key in `localStorage` is read once for migration and used only if the database is unavailable. The newest copy (by `savedAt`) wins on load.

Generated template player cards are rendered from template metadata rather than stored as flattened copies. This lets later template edits flow through to those players and avoids storing duplicate generated card PNGs.

## Suggested next steps

1. Import the club's blank card artwork and position the photo, crest, and text layers.
2. Try it with a single player and confirm the output matches the intended design.
3. Apply it to the squad once the template is ready.
4. If individual Photoshop layers must transfer automatically, replace the composite-only PSD reader with a layer-aware PSD parser and map PSD layer names to app fields.
5. Supply the full-resolution card and player images for final-quality exports (the handoff copy is downscaled).

## Current verification

`node --check app.js` and `node --check psd-import.js` pass. Automated Chromium (Playwright) checks passed for template import/edit/save/assign/filter/export, error paths, simulated storage failure, formation drag/touch/responsive layouts at 320–1280 px, and fixtures/poster/growth/Instagram/backup regressions.

## Compact handoff asset note

To stay within Claude's upload limit, this handoff copy downsizes bundled card PNGs to 640 px wide and player cutouts to at most 320 px wide while preserving transparency. The working app and full-resolution assets in the Codex workspace are unchanged. Use the full-resolution originals for production card/poster exports.

## Update: Team A/B line-ups and font library
- Data: `data.lineups[matchId|'practice'][A|B]={size,shape,slots}`, `data.formation={matchId,team,colors}`, `data.fonts=[{name,src}]`. Old single board migrates to `lineups.practice.A`; old `template.fonts` migrate to `data.fonts`.
- Poster line-up type draws pitches from the board (`drawLineupPoster`). Tests: scratchpad t5 (new), t2-t4 adapted.
- Instagram art direction not studied: the account can't be fetched. Needs screenshots from the user.
- Line-up poster restyled from the Instagram grid: crimson-to-black gradient with grain, giant cropped "FORMATION" heading, white pitch lines, player cards on the pitch, formation label bottom-left, team bottom-right. Default is one team per poster (matches the A/B post pairs); "Team A and Team B" is still available. Brush-script headings seen on the feed ("Match Day", scores) are not bundled: add a script font via Manage fonts.
- Match pack page: `data.packs[matchId]={bg,fx,fy,tint,shade,vignette,grain,primary,font,format,layouts:{kind:{elementId:{x,y,s,text,hide}}}}`. Elements come from `packElements(kind,match)`; `renderPack` paints; drag/selection in `bindPack`. Formation board's "Create formation poster" opens the pack when a match is chosen. Test: scratchpad t6.

- v3: removed Poster studio (`data.studio` gone), added `data.progress={seen,exports,days}`, `lineups[..][team].pos` (free card positions as pitch fractions), `slotXY()`, new formation view/handlers, Hub view, Club tabs, `ui.css`. Tests: scratchpad t7 (new UI), t2, t4, t5, t6.
- Known debt: old pitch/poster-studio/sidebar rules in `styles.css` are now dead and can be deleted.

## v4 handoff
See README "v4". Key places: `game.js` (engine), `app.js` → `homeView`, `matchdayView`, `gameView`, `resultDialog`/`resultScreen`, `playerProfile`, `analyticsView`, `checkProgress`. Tests in `tests/`. Known gaps: substitutes picker, opponent logos, season-XP track, dead CSS in styles.css.


## v5.6 update: Card Studio
Built-in card templates (TEMPLATES, tier-by-rating) were removed. Users now build templates in the full-screen studio (app.js `openStudio`, cards.js `drawDesign`/`blendImageData`). See README v5.6 for behaviour and data fields. Not yet tested on a real phone; Pages must be enabled manually in repo Settings.
