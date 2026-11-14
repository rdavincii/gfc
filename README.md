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
