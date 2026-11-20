// GFC player portal API (Cloudflare Worker + D1 + R2). The admin app stays the source of truth for squad and fixtures and
// pushes them here; players sign in with club code + PIN, read announcements, RSVP to matches and report payments.
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function pinHash(pin, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, k, 256));
}
const now = () => Math.floor(Date.now() / 1000);
const SESSION_DAYS = 60, MAX_FAILS = 5, LOCK_SECONDS = 900, MAX_PROOF = 3 * 1024 * 1024, MAX_JSON = 300 * 1024;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (m, s = 400) => { throw new HttpError(s, m); };
const str = (v, max, req = false) => { const s = typeof v === 'string' ? v.trim().slice(0, max) : v == null ? '' : String(v).trim().slice(0, max); if (req && !s) bad('Missing field'); return s; };
const oneOf = (v, list) => (list.includes(v) ? v : bad('Invalid value'));

const cors = (env) => ({ 'access-control-allow-origin': env.ALLOWED_ORIGIN || '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS', 'access-control-max-age': '86400', vary: 'origin' });
const json = (env, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(env) } });

async function readJson(req) {
  const text = await req.text();
  if (text.length > MAX_JSON) bad('Request too large', 413);
  try { const v = JSON.parse(text || '{}'); return v && typeof v === 'object' ? v : bad('Invalid JSON'); } catch (e) { if (e instanceof HttpError) throw e; bad('Invalid JSON'); }
}
const bearer = (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
async function isAdmin(req, env) { const t = bearer(req); return !!t && !!env.ADMIN_KEY && same(await sha(t), await sha(env.ADMIN_KEY)); }
async function playerFrom(req, env) {
  const t = bearer(req); if (!t) return null;
  return env.DB.prepare('SELECT p.id, p.name, p.number, p.position FROM sessions s JOIN players p ON p.id = s.player_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(await sha(t), now()).first();
}
const needAdmin = async (req, env) => { if (!(await isAdmin(req, env))) bad('Admin key required', 401); };
const needPlayer = async (req, env) => (await playerFrom(req, env)) || bad('Please sign in again', 401);
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const batch = async (env, stmts) => { for (const c of chunks(stmts, 50)) await env.DB.batch(c); };

function sniffImage(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp';
  return '';
}

const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:([a-z]+)/g, '(?<$1>[^/]+)') + '$'), fn });

// ---------- public ----------
route('GET', '/api/health', async (c) => json(c.env, { ok: true }));
route('GET', '/api/roster', async (c) => {
  const code = c.url.searchParams.get('code') || '';
  if (!c.env.CLUB_CODE || !same(await sha(code.toUpperCase()), await sha(c.env.CLUB_CODE.toUpperCase()))) bad('Wrong club code', 403);
  const { results } = await c.env.DB.prepare('SELECT id, name, number FROM players WHERE pin_hash IS NOT NULL ORDER BY name').all();
  return json(c.env, { players: results });
});
route('POST', '/api/login', async (c) => {
  const b = await readJson(c.req), code = str(b.code, 40, true), id = str(b.playerId, 60, true), pin = str(b.pin, 12, true);
  if (!c.env.CLUB_CODE || !same(await sha(code.toUpperCase()), await sha(c.env.CLUB_CODE.toUpperCase()))) bad('Wrong club code', 403);
  const p = await c.env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(id).first();
  if (!p || !p.pin_hash) bad('Wrong PIN', 403);
  if (p.locked_until > now()) bad('Too many tries. Wait 15 minutes or ask the admin to reset your PIN.', 429);
  if (!same(await pinHash(pin, p.pin_salt), p.pin_hash)) {
    const fails = p.fails + 1;
    await c.env.DB.prepare('UPDATE players SET fails = ?, locked_until = ? WHERE id = ?').bind(fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? now() + LOCK_SECONDS : 0, id).run();
    bad('Wrong PIN', 403);
  }
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE players SET fails = 0, locked_until = 0 WHERE id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now()),
    c.env.DB.prepare('INSERT INTO sessions (token_hash, player_id, expires_at) VALUES (?, ?, ?)').bind(await sha(token), id, now() + SESSION_DAYS * 86400),
  ]);
  return json(c.env, { token, player: { id: p.id, name: p.name, number: p.number, position: p.position } });
});

// ---------- player ----------
route('GET', '/api/me/feed', async (c) => {
  const me = await needPlayer(c.req, c.env), db = c.env.DB, since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [ann, matches, rsvps, pay] = await Promise.all([
    db.prepare('SELECT id, title, body, pinned, created_at FROM announcements ORDER BY pinned DESC, created_at DESC LIMIT 30').all(),
    db.prepare('SELECT * FROM matches WHERE date >= ? ORDER BY date, time').bind(since).all(),
    db.prepare('SELECT r.match_id, r.status, r.note, r.player_id, p.name FROM rsvps r JOIN players p ON p.id = r.player_id').all(),
    db.prepare('SELECT id, match_id, amount, note, status, created_at, proof_key IS NOT NULL AS has_proof FROM payments WHERE player_id = ? ORDER BY created_at DESC LIMIT 30').bind(me.id).all(),
  ]);
  const by = {}; for (const r of rsvps.results) (by[r.match_id] ||= []).push(r);
  const out = matches.results.map((m) => {
    const rs = by[m.id] || [], mine = rs.find((r) => r.player_id === me.id);
    return { ...m, closed: m.home != null && m.away != null, mine: mine ? { status: mine.status, note: mine.note } : null, counts: { in: rs.filter((r) => r.status === 'in').length, maybe: rs.filter((r) => r.status === 'maybe').length, out: rs.filter((r) => r.status === 'out').length }, going: rs.filter((r) => r.status === 'in').map((r) => r.name) };
  });
  return json(c.env, { me, announcements: ann.results, matches: out, payments: pay.results });
});
route('PUT', '/api/me/rsvp', async (c) => {
  const me = await needPlayer(c.req, c.env), b = await readJson(c.req), id = str(b.matchId, 60, true), status = oneOf(b.status, ['in', 'out', 'maybe']), note = str(b.note, 120);
  const m = await c.env.DB.prepare('SELECT home, away FROM matches WHERE id = ?').bind(id).first();
  if (!m) bad('Match not found', 404);
  if (m.home != null && m.away != null) bad('This match is finished', 409);
  await c.env.DB.prepare('INSERT INTO rsvps (match_id, player_id, status, note, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (match_id, player_id) DO UPDATE SET status = excluded.status, note = excluded.note, updated_at = excluded.updated_at').bind(id, me.id, status, note, now()).run();
  return json(c.env, { ok: true });
});
route('POST', '/api/me/payments', async (c) => {
  const me = await needPlayer(c.req, c.env), form = await c.req.formData().catch(() => bad('Invalid form'));
  const amount = Number(form.get('amount')), matchId = str(form.get('matchId'), 60), note = str(form.get('note'), 200), file = form.get('proof');
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) bad('Enter a valid amount');
  if (matchId && !(await c.env.DB.prepare('SELECT 1 FROM matches WHERE id = ?').bind(matchId).first())) bad('Match not found', 404);
  const open = await c.env.DB.prepare("SELECT COUNT(*) n FROM payments WHERE player_id = ? AND status = 'pending'").bind(me.id).first();
  if (open.n >= 20) bad('Too many pending payments. Wait for the admin to review them.', 429);
  const id = crypto.randomUUID();
  let key = null;
  if (file && typeof file === 'object' && file.size > 0) {
    if (file.size > MAX_PROOF) bad('Proof image is too large (max 3 MB)', 413);
    const bytes = await file.arrayBuffer(), type = sniffImage(bytes);
    if (!type) bad('Proof must be a JPG, PNG or WebP image');
    key = `proofs/${id}`;
    await c.env.PROOFS.put(key, bytes, { httpMetadata: { contentType: type } });
  }
  await c.env.DB.prepare('INSERT INTO payments (id, player_id, match_id, amount, note, proof_key, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, me.id, matchId || null, amount, note, key, 'pending', now()).run();
  return json(c.env, { ok: true, id }, 201);
});
route('GET', '/api/proofs/:id', async (c) => {
  const pay = await c.env.DB.prepare('SELECT player_id, proof_key FROM payments WHERE id = ?').bind(c.params.id).first();
  if (!pay || !pay.proof_key) bad('Not found', 404);
  const admin = await isAdmin(c.req, c.env), me = admin ? null : await playerFrom(c.req, c.env);
  if (!admin && (!me || me.id !== pay.player_id)) bad('Not allowed', 403);
  const obj = await c.env.PROOFS.get(pay.proof_key);
  if (!obj) bad('Not found', 404);
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'image/jpeg', 'cache-control': 'private, max-age=300', 'x-content-type-options': 'nosniff', ...cors(c.env) } });
});

// ---------- admin ----------
route('PUT', '/api/admin/sync', async (c) => {
  await needAdmin(c.req, c.env);
  const b = await readJson(c.req), db = c.env.DB;
  const players = (Array.isArray(b.players) ? b.players : []).slice(0, 200).map((p) => ({ id: str(p.id, 60, true), name: str(p.name, 60, true), number: str(p.number, 6), position: str(p.position, 6) }));
  const matches = (Array.isArray(b.matches) ? b.matches : []).slice(0, 500).map((m) => ({ id: str(m.id, 60, true), opponent: str(m.opponent, 60), date: str(m.date, 10), time: str(m.time, 5), venue: str(m.venue, 80), competition: str(m.competition, 60), home: Number.isFinite(+m.home) && m.home !== null && m.home !== '' ? +m.home : null, away: Number.isFinite(+m.away) && m.away !== null && m.away !== '' ? +m.away : null }));
  const pIds = players.map((p) => p.id), mIds = matches.map((m) => m.id), ph = (a) => a.map(() => '?').join(',') || "''";
  const st = [
    ...players.map((p) => db.prepare('INSERT INTO players (id, name, number, position) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name, number = excluded.number, position = excluded.position').bind(p.id, p.name, p.number, p.position)),
    ...matches.map((m) => db.prepare('INSERT INTO matches (id, opponent, date, time, venue, competition, home, away) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET opponent = excluded.opponent, date = excluded.date, time = excluded.time, venue = excluded.venue, competition = excluded.competition, home = excluded.home, away = excluded.away').bind(m.id, m.opponent, m.date, m.time, m.venue, m.competition, m.home, m.away)),
  ];
  await batch(c.env, st);
  // removed players / fixtures disappear from the portal (payments are kept as a record)
  if (pIds.length <= 90 && mIds.length <= 90) {
    await db.batch([
      db.prepare(`DELETE FROM sessions WHERE player_id NOT IN (${ph(pIds)})`).bind(...pIds),
      db.prepare(`DELETE FROM rsvps WHERE player_id NOT IN (${ph(pIds)}) OR match_id NOT IN (${ph(mIds)})`).bind(...pIds, ...mIds),
      db.prepare(`DELETE FROM players WHERE id NOT IN (${ph(pIds)})`).bind(...pIds),
      db.prepare(`DELETE FROM matches WHERE id NOT IN (${ph(mIds)})`).bind(...mIds),
    ]);
  }
  return json(c.env, { ok: true, players: players.length, matches: matches.length });
});
route('PUT', '/api/admin/pins', async (c) => {
  await needAdmin(c.req, c.env);
  const b = await readJson(c.req), pins = b.pins && typeof b.pins === 'object' ? Object.entries(b.pins).slice(0, 200) : [], db = c.env.DB;
  let n = 0;
  for (const [id, pin] of pins) {
    if (!/^\d{4,8}$/.test(String(pin))) bad('PINs are 4 to 8 digits');
    const salt = hex(crypto.getRandomValues(new Uint8Array(12)));
    await db.batch([
      db.prepare('UPDATE players SET pin_salt = ?, pin_hash = ?, fails = 0, locked_until = 0 WHERE id = ?').bind(salt, await pinHash(String(pin), salt), id),
      db.prepare('DELETE FROM sessions WHERE player_id = ?').bind(id),
    ]);
    n++;
  }
  return json(c.env, { ok: true, updated: n });
});
route('GET', '/api/admin/inbox', async (c) => {
  await needAdmin(c.req, c.env);
  const db = c.env.DB;
  const [rs, pay, ann] = await Promise.all([
    db.prepare('SELECT r.match_id, r.player_id, p.name, r.status, r.note, r.updated_at FROM rsvps r JOIN players p ON p.id = r.player_id ORDER BY r.updated_at DESC').all(),
    db.prepare('SELECT y.id, y.player_id, p.name, y.match_id, y.amount, y.note, y.status, y.created_at, y.proof_key IS NOT NULL AS has_proof FROM payments y LEFT JOIN players p ON p.id = y.player_id ORDER BY (y.status = \'pending\') DESC, y.created_at DESC LIMIT 100').all(),
    db.prepare('SELECT id, title, body, pinned, created_at FROM announcements ORDER BY created_at DESC LIMIT 30').all(),
  ]);
  return json(c.env, { rsvps: rs.results, payments: pay.results, announcements: ann.results });
});
route('POST', '/api/admin/announcements', async (c) => {
  await needAdmin(c.req, c.env);
  const b = await readJson(c.req), id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO announcements (id, title, body, pinned, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, str(b.title, 120, true), str(b.body, 2000), b.pinned ? 1 : 0, now()).run();
  return json(c.env, { ok: true, id }, 201);
});
route('DELETE', '/api/admin/announcements/:id', async (c) => { await needAdmin(c.req, c.env); await c.env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(c.params.id).run(); return json(c.env, { ok: true }); });
route('PATCH', '/api/admin/payments/:id', async (c) => {
  await needAdmin(c.req, c.env);
  const b = await readJson(c.req), r = await c.env.DB.prepare('UPDATE payments SET status = ? WHERE id = ?').bind(oneOf(b.status, ['pending', 'confirmed', 'rejected']), c.params.id).run();
  if (!r.meta.changes) bad('Not found', 404);
  return json(c.env, { ok: true });
});

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    const url = new URL(req.url);
    try {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = url.pathname.match(r.re);
        if (m) return await r.fn({ req, env, url, params: m.groups || {} });
      }
      return json(env, { error: 'Not found' }, 404);
    } catch (e) {
      if (e instanceof HttpError) return json(env, { error: e.message }, e.status);
      console.error(e);
      return json(env, { error: 'Server error' }, 500);
    }
  },
};
