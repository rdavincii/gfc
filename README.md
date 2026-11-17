# GFC Club Desk

A local club workspace for Gamuda Football Club, styled around the crest, red-and-black player cards, and match photography in the supplied GFC folder.

## Start the app

1. Open this folder in File Explorer.
2. In the address bar, type `powershell` and press Enter.
3. Run `python -m http.server 4173`.
4. Open `http://localhost:4173` in your browser.
5. Keep the PowerShell window open while using the app. Press Ctrl+C when finished.

Your fixtures, squad edits, growth snapshots, formations, post plans, and imported template artwork are saved in that browser's database (IndexedDB) on this device. Always open the app through `http://localhost:4173`; opening `index.html` directly (file://) blocks card previews and PNG export. Data saved by earlier versions is moved across automatically on first load. Use **Export club backup** regularly to keep a portable copy. Restore accepts a backup JSON from this app.

## What is included

- Fixtures, venues, kick-off times, and scores
- GFC editorial poster studio inspired by your warm-paper/red match posters and Winner Cond font, with feed (4:5) and Story/Reel (9:16) formats; image crop or full-frame fit preserves photo proportions; 2K PNG export
- Squad template studio imports PNG, JPG, PSD, and PSB composite art. Arrange photo, crest, name, number, position, rating, and custom text layers by dragging them on the canvas or adjusting the controls; style text with GFC or imported fonts. Template edits redraw every player assigned to that template. Corner handles resize, arrow keys nudge, and the layer list controls order and visibility; photo zoom/position can be set per template and per player. Save a template, save it as a copy, duplicate or delete it (affected players return to their original card or GFC Red & Black). Assign a template to one player from their card, apply it to the whole squad, filter the roster by template, or export any card as a 902 × 1389 PNG. Imports that are not card-shaped show a fit/crop preview first, and unsupported files get a plain explanation. PSD/PSB artwork imports as a flattened composite; Photoshop layer stacks and effects are not imported. For the cleanest result, hide sample player and variable text layers before importing
- 7-a-side and 11-a-side game-style formation layouts with draggable/tappable GFC player cards, substitutes, position-based auto-fill, responsive pitch spacing, and editable GFC pitch colours
- Club growth snapshots for followers, squad size, attendance, and post reach
- Instagram content reminders, caption drafts, posted status, and calendar (`.ics`) export

## Instagram publishing

This first version does not publish directly to Instagram. Automatic publishing requires an authorised Meta business account, app configuration, and server-side credentials. The planner can prepare reminders and captions; download the poster and publish it through Instagram, then mark it posted here.

## Notes

- The Instagram profile could not be read from this session, so the app follows the local GFC brand assets.
- The player roster starts from `FIFA_Card_Project/Data/player_cards.csv` and its player portrait files.
- The uploaded poster background photo is temporary for the current browser session. Choose it again after refreshing.
- There is no cloud sync or shared multi-user account in this local version.

## Included club artwork

The app bundles the club logo (`assets/brand/gfc-logo.png`) and finished player card exports from FIFA_Card_Project/Cards. Those finished card images still contain the old logo baked in.

## Match line-ups and fonts
- Formation board: choose a match (or the practice board), then build **Team A** and **Team B**. A player can only be in one team per match. "Create formation poster" opens the Poster studio on the Line-up type with the match filled in; choose Team A, Team B or both.
- Fonts: **Manage fonts** (Poster studio and Squad) adds TTF/OTF/WOFF/WOFF2 files (3 MB max) or removes them. Added fonts are saved in the club data and used by poster headings and card templates. Removing a font switches anything using it to Winner GFC.

## Match pack
Each match has one art style (background from a PSD/PSB/PNG/JPG, red tint, darken, vignette, grain, accent colour, heading font, feed or story size) shared by seven posters: Next match, Matchday, Full time, Line-up A/B and Squad list A/B. Drag any text on the poster, edit its words, size and position, hide it, or reset it. "Copy style from" reuses another match's look. Exports are 1080 px PNGs. A PSD is flattened into one background; its layers are not kept.

## v3 revamp (game-style UI)
- New look: top bar with six pages (Hub, Matches, Squad, Formation, Match pack, Club), a level chip, and angled panels. Styles live in `ui.css` (loaded after `styles.css`). On phones the nav moves to a bottom bar.
- Hub: next match with countdown, club level and XP, daily streak, top-rated cards, achievements, backup and restore.
- Formation: EA FC-style pitch. Drag a card anywhere; drop on a card to swap, on the bench to take it off. Bench cards dropped on the pitch join the nearest empty position. "Reset positions" snaps everyone back to the formation.
- Poster studio is gone: Match pack covers it. Growth and the Instagram planner are tabs under Club.
- XP is worked out from your data (achievements, posters exported); streak counts days the app was opened.

## v4 · Club progression and game layer
- Navigation: Home · Squad · Tactics · Matchday · Club · Analytics. Club holds Game Center, History, Growth, Match pack posters and the Instagram planner.
- `game.js` is the pure rules engine (`window.GFC_GAME`): XP rules, levels (player step 250, club step 300 × level), achievements, objectives, rewards, team ratings (attack 30% / midfield 35% / defence 35%, "Balanced" within 4 points), analytics. Edit constants at the top of the file, or change XP values in-app under Game Center → XP rules.
- Everything is derived from real records. A missing value shows "Not recorded"; 0 is shown only once stats or training exist. No coins, loot boxes or purchases.
- New data fields: player `foot/attrs/joined/history`, match `stats{played,goals,assists,potm}`, `data.training`, `data.rules`, `data.progress{unlocked,claimed,exports}`, lineup `captain`, `settings.pitchTheme`. Older backups load and are normalised.
- Tests (Playwright, app served on :4173): `tests/game-ui.test.js`, `tests/game.unit.js`.
- Not built yet: dedicated substitutes picker, opponent logos, separate season-XP track, settings page; `styles.css` still has dead legacy rules.

## v5 · Match cards (Ultimate-Team-style editions)
- Club → Match cards (or "Cards" on any match in Matchday). Every match gets its own card design automatically (preset + pattern chosen from the match id); change the look, pattern, 4 colours, edition label, font and attribute visibility. Shuffle for a new design, Reset to go back to auto.
- Generates a card for every player in the chosen scope (line-ups, played, whole squad). Export one card, a TOTS-style sheet poster, or save all cards. The match's player of the match gets a gold card.
- `cards.js` is the canvas renderer (`window.GFC_CARDS`); designs are stored in `data.editions[matchId]`. Missing ratings/attributes draw as "--". The older template card studio in Squad is unchanged.
- Test: `tests/cards-ui.test.js`.

## v5.1 · Card shapes, imported backgrounds, saved styles
- Match cards now offer six shapes (Shield, Classic, GFC cut, Rounded, Hexagon, Arch) or an imported shape: a PNG/SVG with a see-through background, used as the card outline. It is stretched to the card's 1:1.54 ratio.
- Import a background picture (PNG/JPG/WEBP) per match; pictures are shrunk before storing.
- With attributes off the name moves lower and the photo grows to fill the space.
- "Save style" stores the whole look (including imported pictures) in `data.cardStyles` (max 24). Apply it to any match from the Saved styles row. Match pack → "Player cards on line-up posters" picks the match's style or any saved style for formation posters; deleting a style resets posters that used it.
- Test: `tests/card-styles-ui.test.js` (uses `tests/shape.png`, `tests/bg.jpg`).

## v5.2 · (replaced in v5.6)
The built-in template gallery was removed; see v5.6.

## v5.3 · Card frames and layout
- Match cards → "Import card frame": a PNG with see-through edges (your own artwork). The card outline is worked out from the frame automatically (everything enclosed by it counts as inside), so no separate shape file is needed. "Frame over the photo" chooses whether the frame sits under or over the player photo; a full-card template picture works under the photo, a hollow border works over it. Frames save into styles and work on line-up posters.
- Layout tuned toward the Ultimate Team arrangement: bigger rating, position beneath it, club crest, larger photo, bigger name, tighter two-column stats. EA's official card artwork is not included or copied.
- Test: `tests/card-frame-ui.test.js` (uses `tests/frame.png`).

## v5.4 · Remove white/black background
- Importing a card frame or shape now opens "Make the background transparent": Keep as is / Remove white / Remove black / Match corners, a strength slider and "Edges only" (removes only background connected to the picture's edge, so matching colours inside the artwork stay). Live preview on a checkerboard; Cancel stores nothing. The pure routine is `GFC_CARDS.removeBackground`.
- Test: `tests/cutout-ui.test.js` (uses `tests/cut-white.jpg`, `tests/cut-black.jpg`).

## v5.5 · Frame extraction and new logo
- Importing a card frame has "Extract the frame only": a full card picture (artwork inside the border) is hollowed out so only the border stays, with a thickness slider (2–25% of the width). It combines with "Remove white/black" and switches "Frame over the photo" on automatically. Pure routine: `GFC_CARDS.extractFrame`.
- The club logo is now `assets/brand/gfc-logo.png` (transparent PNG). The old `gfc-circle.jpg` and `gfc-crest.png` are deleted; old paths saved in a backup or in template layers are rewritten on load. The logo gets a white disc behind it on cards, posters and the top bar so the red stays readable.
- Fixed: on phones the bottom navigation was stuck under the top bar (the top bar's blur created a containing block for it).
- Test: `tests/frame-extract-logo.test.js`.

## v5.6 · Card Studio (your own templates)
Match cards → **＋ New template** opens a full-screen studio.
- Background: choose a picture from your gallery (Background chip). Optional frame PNG and shape.
- Items (player photo, name, number without #, position, rating, club logo, stats, extra text): drag them on the card. Dashed box = selected. Two fingers pinch to resize. Cyan guide lines snap to the centre, margins and other items. The bottom bar (size, colour, font, shadow, arrows, centre) never needs scrolling.
- Player photo from gallery: Player photo chip → picks a photo for the preview player (background removal dialog is offered).
- Filter chip: one grade (None, Match card, Warm, Cool, Mono, or custom tint/contrast/saturation/brightness) applied to every player photo so they look alike.
- Save: the template is stored in the app (max 12), applied to the match, and offered in each match pack poster's "Player cards" list. Edit, Duplicate, Delete and "Use for all matches" sit under the template chips.
- Quick looks (presets/patterns/colours) remain under a collapsed section and only apply when no template is chosen.
Data: `data.cardDesigns[]`, edition `designId` ('none' = off), `settings.defaultDesign`, pack `cardStyle: 'design:<id>'`. Tests: `tests/card-studio-ui.test.js`.

## v5.7 · Face guide and gradient
- **Face guide:** a dashed circle in the studio (Face guide chip). Drag/resize it once per template. Each player's face is marked in Squad → **Face** (drag the circle onto the face, set size, save). Every card then scales and shifts that player's photo so the face sits in the template's circle. Players without a saved face use a default guess. Turn "Fit photos to this circle" off to place the photo by hand as before. Old templates keep their hand placement.
- **Gradient:** Gradient chip fades a colour up from the bottom (strength, height, colour; "Card colour" or "Match background") so photos blend in and the name has clear space. On by default for new templates.
- Data: `design.face {on,x,y,s}`, `design.fade {on,color,amount,height}`, `player.face {x,y,s}` (s = face diameter as a fraction of photo width). Test: `tests/card-face-ui.test.js`. No automatic face detection (iOS Safari has none), so faces are set by hand.

## v5.8 · Face outline in Squad
Squad → **Face outline** on each player opens a dialog: drag the circle onto the face, set its size, and watch a live card (using your current template) update. **Save & next player** walks through the whole squad. Saved outlines are used by every template with "Fit photos to this circle" on, so cards update automatically.

## Phone link (GitHub Pages)
Repo → Settings → Pages → Build and deployment → Source "Deploy from a branch" → branch `main`, folder `/ (root)` → Save. The app is then at `https://rdavincii.github.io/gfc/`. Data stays on each device (browser storage), so use the in-app backup to move it.
