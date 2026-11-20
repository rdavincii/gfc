// Integration test for api/worker.js. Start it first: cd api && npx wrangler dev --local --port 8787 (with .dev.vars: ADMIN_KEY=test-admin-key-123, CLUB_CODE=GFC26)
const B = 'http://localhost:8787', ADMIN = 'test-admin-key-123', CODE = 'GFC26';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const call = async (method, path, { token, body, form } = {}) => {
  const r = await fetch(B + path, { method, headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: form || (body ? JSON.stringify(body) : undefined) });
  const ct = r.headers.get('content-type') || ''; return { s: r.status, j: ct.includes('json') ? await r.json() : null, r };
};
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
(async () => {
  const today = new Date().toISOString().slice(0, 10), nextWeek = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  ok((await call('GET', '/api/admin/inbox')).s === 401, 'admin routes reject no key');
  ok((await call('GET', '/api/admin/inbox', { token: 'wrong' })).s === 401, 'admin routes reject a wrong key');
  const sync = await call('PUT', '/api/admin/sync', { token: ADMIN, body: { players: [{ id: 'p1', name: 'MIKA', number: '9', position: 'ST' }, { id: 'p2', name: 'BART', number: '4', position: 'CB' }, { id: 'p3', name: 'GONE', number: '1', position: 'GK' }], matches: [{ id: 'm1', opponent: 'Blue FC', date: nextWeek, time: '20:00', venue: 'Pitch 1', competition: 'Friendly' }, { id: 'm2', opponent: 'Done FC', date: today, home: 2, away: 1 }] } });
  ok(sync.s === 200 && sync.j.players === 3, 'admin sync stores squad and fixtures');
  ok((await call('PUT', '/api/admin/pins', { token: ADMIN, body: { pins: { p1: '1234', p2: '5678', p3: '1111' } } })).j.updated === 3, 'admin sets PINs');
  ok((await call('PUT', '/api/admin/pins', { token: ADMIN, body: { pins: { p1: 'abc' } } })).s === 400, 'bad PIN format rejected');
  ok((await call('GET', '/api/roster?code=NOPE')).s === 403, 'roster hidden without the club code');
  const ro = await call('GET', '/api/roster?code=gfc26'); ok(ro.s === 200 && ro.j.players.length === 3 && !('pin_hash' in ro.j.players[0]), 'roster lists names for the right code (case-insensitive), no secrets');
  ok((await call('POST', '/api/login', { body: { code: CODE, playerId: 'p1', pin: '0000' } })).s === 403, 'wrong PIN rejected');
  const lg = await call('POST', '/api/login', { body: { code: CODE, playerId: 'p1', pin: '1234' } }); ok(lg.s === 200 && lg.j.token?.length === 64, 'player signs in');
  const t1 = lg.j.token, t2 = (await call('POST', '/api/login', { body: { code: CODE, playerId: 'p2', pin: '5678' } })).j.token;
  ok((await call('GET', '/api/me/feed')).s === 401, 'feed needs a session');
  ok((await call('POST', '/api/admin/announcements', { token: t1, body: { title: 'x' } })).s === 401, 'a player token cannot use admin routes');
  ok((await call('POST', '/api/admin/announcements', { token: ADMIN, body: { title: 'Training moved', body: 'Thursday 9pm', pinned: true } })).s === 201, 'admin posts an announcement');
  ok((await call('PUT', '/api/me/rsvp', { token: t1, body: { matchId: 'm1', status: 'in', note: 'Late 10 min' } })).s === 200, 'player RSVPs in');
  ok((await call('PUT', '/api/me/rsvp', { token: t2, body: { matchId: 'm1', status: 'maybe' } })).s === 200, 'second player says maybe');
  ok((await call('PUT', '/api/me/rsvp', { token: t1, body: { matchId: 'm1', status: 'nope' } })).s === 400, 'invalid RSVP rejected');
  ok((await call('PUT', '/api/me/rsvp', { token: t1, body: { matchId: 'm2', status: 'in' } })).s === 409, 'cannot RSVP to a finished match');
  const feed = await call('GET', '/api/me/feed', { token: t1 }); const m1 = feed.j.matches.find((m) => m.id === 'm1');
  ok(feed.j.announcements[0]?.title === 'Training moved' && m1.mine.status === 'in' && m1.counts.in === 1 && m1.counts.maybe === 1 && m1.going[0] === 'MIKA', 'feed has announcement, my RSVP, counts and who is going');
  const f1 = new FormData(); f1.set('amount', '15'); f1.set('matchId', 'm1'); f1.set('note', 'Match fee'); f1.set('proof', new Blob([png], { type: 'image/png' }), 'p.png');
  const pay = await call('POST', '/api/me/payments', { token: t1, form: f1 }); ok(pay.s === 201, 'payment with proof image');
  const f2 = new FormData(); f2.set('amount', '10'); const pay2 = await call('POST', '/api/me/payments', { token: t1, form: f2 }); ok(pay2.s === 201, 'payment without proof (optional)');
  const f3 = new FormData(); f3.set('amount', '5'); f3.set('proof', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'x.png'); ok((await call('POST', '/api/me/payments', { token: t1, form: f3 })).s === 400, 'non-image upload rejected by content, not by label');
  const f4 = new FormData(); f4.set('amount', '-5'); ok((await call('POST', '/api/me/payments', { token: t1, form: f4 })).s === 400, 'negative amount rejected');
  ok((await call('GET', `/api/proofs/${pay.j.id}`, { token: t1 })).s === 200, 'owner can view their proof');
  ok((await call('GET', `/api/proofs/${pay.j.id}`, { token: t2 })).s === 403, 'other players cannot view it');
  ok((await call('GET', `/api/proofs/${pay.j.id}`, { token: ADMIN })).s === 200, 'admin can view it');
  const inbox = await call('GET', '/api/admin/inbox', { token: ADMIN });
  ok(inbox.j.rsvps.length === 2 && inbox.j.payments.length === 2 && inbox.j.payments.every((p) => p.name), 'admin inbox lists RSVPs and payments with names');
  ok((await call('PATCH', `/api/admin/payments/${pay.j.id}`, { token: ADMIN, body: { status: 'confirmed' } })).s === 200, 'admin confirms a payment');
  ok((await call('GET', '/api/me/feed', { token: t1 })).j.payments.find((p) => p.id === pay.j.id).status === 'confirmed', 'player sees it confirmed');
  // lockout
  for (let i = 0; i < 5; i++) await call('POST', '/api/login', { body: { code: CODE, playerId: 'p2', pin: '0000' } });
  const lk = await call('POST', '/api/login', { body: { code: CODE, playerId: 'p2', pin: '5678' } }); ok(lk.s === 429, 'PIN locks after 5 wrong tries');
  ok((await call('PUT', '/api/admin/pins', { token: ADMIN, body: { pins: { p2: '2468' } } })).s === 200 && (await call('POST', '/api/login', { body: { code: CODE, playerId: 'p2', pin: '2468' } })).s === 200, 'admin PIN reset unlocks and works');
  // removal via sync
  await call('PUT', '/api/admin/sync', { token: ADMIN, body: { players: [{ id: 'p1', name: 'MIKA' }], matches: [{ id: 'm1', opponent: 'Blue FC', date: nextWeek }] } });
  ok((await call('GET', '/api/roster?code=' + CODE)).j.players.length === 1, 'players removed in the admin app disappear from the portal');
  ok((await call('GET', '/api/me/feed', { token: t2 })).s === 401, 'removed player is signed out');
  ok((await call('GET', '/nope')).s === 404, 'unknown route is 404');
  console.log('fails', fails); process.exit(fails ? 1 : 0);
})();
