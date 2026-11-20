// GFC Player Portal: sign in with club code + PIN, read announcements, RSVP to matches, report payments (proof photo optional).
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const LS = { get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* private mode */ } } };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const q = new URLSearchParams(location.search);
  if (q.get('api')) LS.set('gfcApi', q.get('api').replace(/\/+$/, ''));
  if (q.get('code')) LS.set('gfcCode', q.get('code'));
  if (q.has('api') || q.has('code')) history.replaceState(null, '', location.pathname);
  const API = () => LS.get('gfcApi') || (window.GFC_API || '').replace(/\/+$/, '');
  const app = $('#app');
  let tab = 'news', feed = null, offline = false;
  try { feed = JSON.parse(LS.get('gfcFeed') || 'null'); } catch (e) { feed = null; }

  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
  async function api(path, { method = 'GET', body, form, auth = true } = {}) {
    if (!API()) throw new Error('No club server set yet.');
    const headers = {}; if (auth && LS.get('gfcToken')) headers.authorization = 'Bearer ' + LS.get('gfcToken');
    if (body) headers['content-type'] = 'application/json';
    let r; try { r = await fetch(API() + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) }); } catch (e) { const err = new Error('No connection. Check your internet and try again.'); err.net = true; throw err; }
    const data = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
    if (r.status === 401 && auth) { signOut(); throw new Error('Please sign in again.'); }
    if (!r.ok) throw new Error(data?.error || 'Something went wrong.');
    return data;
  }
  function signOut() { LS.set('gfcToken', ''); LS.set('gfcFeed', ''); feed = null; render(); }
  const when = (m) => { const d = new Date(m.date + 'T' + (m.time || '12:00')); return isNaN(d) ? '' : d.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' }) + (m.time ? ' · ' + m.time : ''); };
  const ago = (t) => { const s = Math.max(0, Date.now() / 1000 - t); return s < 3600 ? Math.max(1, Math.round(s / 60)) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : new Date(t * 1000).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }); };

  // ---------- screens ----------
  async function loginScreen() {
    const code = LS.get('gfcCode');
    app.innerHTML = `<div class="login"><img src="./assets/brand/gfc-logo.png" alt=""><h1>GFC Player Portal</h1><p class="muted">Sign in to see announcements, join matches and send payments.</p>
      <form id="lf">${API() ? '' : `<label>Club server address</label><input id="lApi" inputmode="url" autocapitalize="none" placeholder="https://…workers.dev">`}
      <label>Club code</label><input id="lCode" value="${esc(code)}" autocapitalize="characters" autocomplete="off" placeholder="Ask your admin">
      <label>Your name</label><select id="lName" disabled><option>Enter the club code first</option></select>
      <label>PIN</label><input id="lPin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" placeholder="4–8 digits">
      <button class="btn" id="lGo" type="submit">Sign in</button></form></div>`;
    const sel = $('#lName'), codeEl = $('#lCode');
    const loadRoster = async () => {
      const a = $('#lApi'); if (a && a.value) LS.set('gfcApi', a.value.trim().replace(/\/+$/, ''));
      const c = codeEl.value.trim(); if (!c || !API()) return;
      try { const r = await api('/api/roster?code=' + encodeURIComponent(c), { auth: false }); LS.set('gfcCode', c); sel.disabled = false; sel.innerHTML = r.players.length ? r.players.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.number ? ' · #' + esc(p.number) : ''}</option>`).join('') : '<option value="">No players have a PIN yet</option>'; }
      catch (e) { sel.disabled = true; sel.innerHTML = `<option>${esc(e.message)}</option>`; }
    };
    codeEl.addEventListener('change', loadRoster); if (code) loadRoster();
    $('#lf').onsubmit = async (e) => {
      e.preventDefault(); if (sel.disabled) await loadRoster(); const btn = $('#lGo'); btn.disabled = true;
      try { const r = await api('/api/login', { method: 'POST', auth: false, body: { code: codeEl.value.trim(), playerId: sel.value, pin: $('#lPin').value } }); LS.set('gfcToken', r.token); await refresh(true); }
      catch (err) { toast(err.message); } finally { btn.disabled = false; }
    };
  }

  const tabs = [['news', '📣', 'News'], ['matches', '⚽', 'Matches'], ['pay', '💳', 'Pay'], ['me', '👤', 'Me']];
  function shell(title, inner) {
    app.innerHTML = `<div class="top"><img src="./assets/brand/gfc-logo.png" alt=""><b>Gamuda FC</b><button id="rf" aria-label="Refresh">↻</button></div><h1>${title}</h1>${offline ? '<div class="banner">Offline: showing what was saved last time. You need internet to join a match or send a payment.</div>' : ''}${inner}
      <nav class="tabs">${tabs.map(([k, i, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}"><span>${i}</span>${l}</button>`).join('')}</nav>`;
    $('#rf').onclick = () => refresh(); app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); scrollTo(0, 0); }));
  }
  const news = () => {
    const next = feed.matches.find((m) => !m.closed);
    shell('News', `${next ? `<div class="card"><small>NEXT MATCH</small><div class="vs"><b>vs ${esc(next.opponent || 'TBC')}</b><small>${esc(when(next))}</small></div><p class="muted">${esc(next.venue || '')}${next.mine ? ` · You: ${next.mine.status === 'in' ? 'coming' : next.mine.status === 'out' ? "can't come" : 'maybe'}` : ' · You have not replied yet'}</p></div>` : ''}
      ${feed.announcements.length ? feed.announcements.map((a) => `<div class="card">${a.pinned ? '<span class="pin">PINNED</span>' : ''}<h3>${esc(a.title)}</h3>${a.body ? `<p class="msg">${esc(a.body)}</p>` : ''}<p class="muted" style="margin-top:8px">${ago(a.created_at)}</p></div>`).join('') : '<p class="empty">No announcements yet.</p>'}`);
  };
  const matches = () => {
    shell('Matches', feed.matches.length ? feed.matches.map((m) => `<div class="card" data-m="${esc(m.id)}"><div class="vs"><b>vs ${esc(m.opponent || 'TBC')}</b>${m.closed ? `<span class="score">${m.home}–${m.away}</span>` : ''}</div>
      <p class="muted">${esc(when(m))}${m.venue ? ' · ' + esc(m.venue) : ''}${m.competition ? ' · ' + esc(m.competition) : ''}</p>
      ${m.closed ? '' : `<div class="seg">${[['in', "I'm in"], ['maybe', 'Maybe'], ['out', "Can't"]].map(([s, l]) => `<button data-s="${s}" class="${m.mine?.status === s ? 'on' : ''}">${l}</button>`).join('')}</div><input class="note" maxlength="120" placeholder="Note for the coach (optional)" value="${esc(m.mine?.note || '')}">`}
      <p class="going"><b>${m.counts.in}</b> in · ${m.counts.maybe} maybe · ${m.counts.out} out${m.going.length ? '<br>Going: ' + m.going.map(esc).join(', ') : ''}</p></div>`).join('') : '<p class="empty">No matches scheduled yet.</p>');
    app.querySelectorAll('[data-m] .seg button').forEach((b) => (b.onclick = async () => {
      const card = b.closest('[data-m]'); try { await api('/api/me/rsvp', { method: 'PUT', body: { matchId: card.dataset.m, status: b.dataset.s, note: $('.note', card).value } }); toast('Saved'); await refresh(); } catch (e) { toast(e.message); }
    }));
  };
  const pay = () => {
    shell('Payments', `<div class="card"><h3>Send a payment</h3><p class="muted">Tell the admin you paid. A photo of the receipt is optional.</p><form id="pf">
      <label>Amount (RM)</label><input id="pAmt" type="number" inputmode="decimal" min="0" step="0.01" required>
      <label>For</label><select id="pMatch"><option value="">General (fees, kit, etc.)</option>${feed.matches.map((m) => `<option value="${esc(m.id)}">vs ${esc(m.opponent || 'TBC')} · ${esc(when(m))}</option>`).join('')}</select>
      <label>Note</label><input id="pNote" maxlength="200" placeholder="e.g. match fee + water">
      <label>Receipt photo (optional)</label><input id="pFile" type="file" accept="image/*">
      <button class="btn" id="pGo" type="submit">Send</button></form></div>
      <div class="card"><h3>My payments</h3>${feed.payments.length ? feed.payments.map((p) => `<div class="row"><div><b>RM ${Number(p.amount || 0).toFixed(2)}</b><br><small>${esc(p.note || 'No note')} · ${ago(p.created_at)}</small></div><div style="text-align:right"><span class="chip ${esc(p.status)}">${esc(p.status)}</span>${p.has_proof ? `<br><a href="#" data-proof="${esc(p.id)}" class="muted">View receipt</a>` : ''}</div></div>`).join('') : '<p class="muted">Nothing sent yet.</p>'}</div>`);
    $('#pf').onsubmit = async (e) => {
      e.preventDefault(); const btn = $('#pGo'); btn.disabled = true;
      try { const f = new FormData(); f.set('amount', $('#pAmt').value); f.set('matchId', $('#pMatch').value); f.set('note', $('#pNote').value); const file = $('#pFile').files[0]; if (file) f.set('proof', await shrink(file), 'receipt.jpg');
        await api('/api/me/payments', { method: 'POST', form: f }); toast('Sent to the admin'); await refresh(); } catch (err) { toast(err.message); } finally { btn.disabled = false; }
    };
    app.querySelectorAll('[data-proof]').forEach((a) => (a.onclick = async (e) => { e.preventDefault(); try { const r = await fetch(API() + '/api/proofs/' + a.dataset.proof, { headers: { authorization: 'Bearer ' + LS.get('gfcToken') } }); if (!r.ok) throw new Error('Could not load the receipt.'); const url = URL.createObjectURL(await r.blob()); const img = new Image(); img.className = 'proof'; img.src = url; a.replaceWith(img); } catch (err) { toast(err.message); } }));
  };
  const me = () => shell('Me', `<div class="card"><div class="me-av">${esc((feed.me.name || '?')[0])}</div><h3>${esc(feed.me.name)}</h3><p class="muted">${feed.me.number ? '#' + esc(feed.me.number) + ' · ' : ''}${esc(feed.me.position || '')}</p></div><button class="btn ghost" id="so">Sign out</button><p class="muted" style="text-align:center;margin-top:16px">GFC Player Portal</p>`);
  // phone photos are huge; a 1600 px JPEG is plenty for a receipt and keeps uploads quick
  async function shrink(file) {
    try { const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return await new Promise((ok) => c.toBlob((b) => ok(b || file), 'image/jpeg', .82)); } catch (e) { return file; }
  }
  function render() {
    if (!LS.get('gfcToken') || !feed) return loginScreen();
    ({ news, matches, pay, me })[tab]();
    if (tab === 'me') $('#so').onclick = signOut;
  }
  async function refresh(first) {
    if (!LS.get('gfcToken')) return render();
    const keep = scrollY, focus = document.activeElement && document.activeElement.id;
    try { feed = await api('/api/me/feed'); offline = false; LS.set('gfcFeed', JSON.stringify(feed)); }
    catch (e) { if (!e.net) { if (LS.get('gfcToken')) toast(e.message); return; } offline = true; if (!feed) return loginScreen(); }
    render(); if (!first) scrollTo(0, keep); if (focus) $('#' + focus)?.focus?.();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && LS.get('gfcToken')) refresh(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  LS.get('gfcToken') ? (feed ? render() : null, refresh(true)) : render();
})();
