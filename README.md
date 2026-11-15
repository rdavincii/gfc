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

The app bundles the circular logo from Logo/GFC Circle.jpg and finished player card exports from FIFA_Card_Project/Cards.

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

## v5.2 · Card templates
- Match cards has a template gallery: Standard tiers (Bronze, Silver, Gold, Rare gold) and Special editions (Matchday, Captain, Icon, Hero, Team of the Year, Rising star, Night match, Golden hour). They are original GFC designs (colours, pattern, shape, label); tap one to apply it, then keep tweaking.
- "Tier by rating" gives each rated player the Bronze/Silver/Gold/Rare template for their rating (<65, 65–74, 75–84, 85+); unrated players keep the chosen design. "Shine effect" toggles the gloss.
- Templates are stored as normal edition values (`tpl`, `autoTier`, `shine`), so they save into saved styles and work on line-up posters.
- Test: `tests/card-templates-ui.test.js`.
