# GFC player portal API

A small Cloudflare Worker (`worker.js`) that sits between the **player app** (`../player.html`) and the club data.
The admin app (`../index.html`) stays the source of truth: it pushes the squad and fixtures here, and reads back
RSVPs, payments and announcements. Players never touch your data directly.

```
Player phone ──► player.html ──┐
                               ├──► Worker API ──► D1 (data) + R2 (receipt photos)
Admin phone  ──► index.html  ──┘      (Bearer tokens: players = session, admin = ADMIN_KEY)
```

## Deploy (about 10 minutes, free tier is enough)

You need a Cloudflare account and Node 18+. From this folder:

```bash
npm install
npx wrangler login
npx wrangler d1 create gfc                 # copy the database_id it prints into wrangler.toml
npx wrangler r2 bucket create gfc-proofs   # receipt photos
npm run db:init                            # creates the tables
npx wrangler secret put ADMIN_KEY          # a long random password only you know
npx wrangler secret put CLUB_CODE          # short code players type once, e.g. GFC26
npx wrangler deploy                        # prints https://gfc-api.<you>.workers.dev
```

Then in the admin app: **Settings → Player portal**, enter the Worker address, the admin key and the club code,
tap **Save and send squad & fixtures**, and share each player's link + PIN (the **Send** button opens the share sheet).
Tap **Send squad & fixtures** again after you add players or fixtures so the portal stays current.

Recommended: set `ALLOWED_ORIGIN` in `wrangler.toml` to your site (for example `https://rdavincii.github.io`) so other
websites cannot call the API from a browser.

## What it does

| Who | Endpoint | Purpose |
| --- | --- | --- |
| public | `GET /api/roster?code=` | names for the sign-in picker (needs the club code) |
| public | `POST /api/login` | club code + player + PIN → session token (60 days). 5 wrong PINs lock that player for 15 min |
| player | `GET /api/me/feed` | announcements, fixtures with my RSVP and who is going, my payments |
| player | `PUT /api/me/rsvp` | in / maybe / out + note (not after a result is entered) |
| player | `POST /api/me/payments` | amount, note, optional match, **optional receipt photo** (JPG/PNG/WebP, 3 MB, checked by content) |
| player/admin | `GET /api/proofs/:id` | a receipt is visible to its owner and the admin only |
| admin | `PUT /api/admin/sync` | push squad + fixtures (players/fixtures you remove disappear; payments are kept) |
| admin | `PUT /api/admin/pins` | set/reset PINs (stored as salted PBKDF2 hashes) |
| admin | `GET /api/admin/inbox` | RSVPs, payments, announcements |
| admin | `POST/DELETE /api/admin/announcements`, `PATCH /api/admin/payments/:id` | post, remove, confirm/reject |

## Local development and tests

```bash
echo "ADMIN_KEY=test-admin-key-123
CLUB_CODE=GFC26" > .dev.vars              # git-ignored
npm run db:init:local && npm run dev       # API on http://localhost:8787
# in another terminal, from the repo root: python3 -m http.server 4173
node tests/api.test.js && node tests/player-ui.test.js && node tests/portal-admin-ui.test.js
```

## Limits to know about

- PINs are 4 digits by default, so they protect against casual snooping, not a determined attacker; the lock-out and club code help. Use 6–8 digits for more safety (set with `PUT /api/admin/pins`).
- The admin key is saved inside the admin app's data (and therefore inside backup files). Keep backups private.
- Sync is one-way for squad and fixtures (admin → server). RSVPs only change attendance when you tap **Use as attendance**.
- Payments here are records and receipts only. No money moves through the app.
