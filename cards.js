/* GFC match card editions: draws Ultimate-Team-style player cards on a canvas.
   Every match gets its own look (a preset + a pattern, picked from the match id unless you customise it).
   Pure drawing code: no data is invented. Missing rating/stats are drawn as "--". */
(function (root) {
  const PRESETS = [
    { id: 'gfc-red', name: 'GFC Red', c1: '#2a060b', c2: '#ed1c24', accent: '#ffd9d2', ink: '#ffffff' },
    { id: 'midnight', name: 'Midnight', c1: '#07123f', c2: '#1f4fd8', accent: '#e8c872', ink: '#f6e7b4' },
    { id: 'gold', name: 'Gold rush', c1: '#9c6f1a', c2: '#f6dc8a', accent: '#3a2606', ink: '#2a1b04' },
    { id: 'icon', name: 'Black icon', c1: '#08080a', c2: '#2c2c33', accent: '#f3c969', ink: '#ffffff' },
    { id: 'emerald', name: 'Emerald', c1: '#03281d', c2: '#14a56a', accent: '#d9ffe8', ink: '#ffffff' },
    { id: 'violet', name: 'Violet night', c1: '#1c0638', c2: '#8a3cff', accent: '#ffe1ff', ink: '#ffffff' },
    { id: 'ice', name: 'Ice', c1: '#bfe3ff', c2: '#5aa9ff', accent: '#0a2a55', ink: '#08224a' },
    { id: 'sunset', name: 'Sunset', c1: '#4a0c27', c2: '#ff7a2f', accent: '#fff0d0', ink: '#ffffff' }
  ];
  const PATTERNS = [['rays', 'Rays'], ['rings', 'Rings'], ['hex', 'Hex'], ['stripes', 'Stripes'], ['waves', 'Waves'], ['dots', 'Dots']];
  const SHAPES = [['shield', 'Shield'], ['classic', 'Classic'], ['angled', 'GFC cut'], ['rounded', 'Rounded'], ['hex', 'Hexagon'], ['arch', 'Arch']];
  const LABELS = { pace: 'PAC', shooting: 'SHO', passing: 'PAS', dribbling: 'DRI', defending: 'DEF', physical: 'PHY', diving: 'DIV', handling: 'HAN', kicking: 'KIC', reflexes: 'REF', speed: 'SPD', positioning: 'POS' };
  const RATIO = 1.54;
  const FONT = (f) => `"${f || 'Winner GFC'}","Bebas GFC",sans-serif`;

  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const hex = (c) => /^#[0-9a-f]{6}$/i.test(c) ? c : null;
  // The look of a match: stored overrides on top of a preset; with nothing stored the match id picks a preset and pattern.
  function resolve(matchId, stored) {
    const s = stored || {}, h = hash(matchId);
    const preset = PRESETS.find((p) => p.id === s.preset) || PRESETS[h % PRESETS.length];
    const pattern = PATTERNS.some((p) => p[0] === s.pattern) ? s.pattern : PATTERNS[(h >>> 4) % PATTERNS.length][0];
    const img = (v) => (typeof v === 'string' && v.startsWith('data:image/') ? v : '');
    const shapeImg = img(s.shapeImg);
    return {
      preset: preset.id, pattern, shape: shapeImg ? 'custom' : (SHAPES.some((q) => q[0] === s.shape) ? s.shape : 'shield'), shapeImg, bg: img(s.bg), frame: img(s.frame), frameTop: s.frameTop === true,
      c1: hex(s.c1) || preset.c1, c2: hex(s.c2) || preset.c2, accent: hex(s.accent) || preset.accent, ink: hex(s.ink) || preset.ink,
      shine: s.shine !== false,
      label: typeof s.label === 'string' ? s.label.slice(0, 18) : 'MATCHDAY', stats: s.stats !== false, font: s.font || ''
    };
  }
  const shuffle = () => ({ preset: PRESETS[Math.floor(Math.random() * PRESETS.length)].id, pattern: PATTERNS[Math.floor(Math.random() * PATTERNS.length)][0] });

  // Outline of the card. Every shape fits the same w x h box.
  function shield(ctx, x, y, w, h, kind = 'shield') {
    const c = w * 0.16, P = (a, b) => [x + w * a, y + h * b];
    ctx.beginPath();
    if (kind === 'classic') { const pts = [[0.1, 0], [0.9, 0], [1, 0.07], [1, 0.82], [0.5, 1], [0, 0.82], [0, 0.07]]; pts.forEach(([a, b], i) => ctx[i ? 'lineTo' : 'moveTo'](...P(a, b))); }
    else if (kind === 'angled') { [[0, 0], [0.79, 0], [1, 0.16], [1, 0.83], [0.52, 1], [0, 0.84]].forEach(([a, b], i) => ctx[i ? 'lineTo' : 'moveTo'](...P(a, b))); }
    else if (kind === 'hex') { [[0.5, 0], [1, 0.1], [1, 0.9], [0.5, 1], [0, 0.9], [0, 0.1]].forEach(([a, b], i) => ctx[i ? 'lineTo' : 'moveTo'](...P(a, b))); }
    else if (kind === 'rounded') { const r = w * 0.18; ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); }
    else if (kind === 'arch') { ctx.moveTo(x, y + h * 0.92); ctx.lineTo(x, y + w * 0.5); ctx.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h * 0.92); ctx.lineTo(x + w * 0.88, y + h); ctx.lineTo(x + w * 0.12, y + h); }
    else if (kind === 'rect') { ctx.rect(x, y, w, h); }
    else {
      ctx.moveTo(x + c, y); ctx.lineTo(x + w * 0.5 - w * 0.08, y); ctx.lineTo(x + w * 0.5, y + h * 0.012); ctx.lineTo(x + w * 0.5 + w * 0.08, y); ctx.lineTo(x + w - c, y);
      ctx.lineTo(x + w, y + c * 1.1); ctx.lineTo(x + w, y + h * 0.80);
      ctx.quadraticCurveTo(x + w, y + h * 0.90, x + w * 0.5, y + h);
      ctx.quadraticCurveTo(x, y + h * 0.90, x, y + h * 0.80);
      ctx.lineTo(x, y + c * 1.1);
    }
    ctx.closePath();
  }

  function pattern(ctx, kind, x, y, w, h, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.globalAlpha = 0.16; ctx.lineWidth = Math.max(1, w * 0.012);
    const cx = x + w * 0.5, cy = y + h * 0.3;
    if (kind === 'rays') { for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, h, a, a + Math.PI / 24); ctx.closePath(); if (i % 2) ctx.fill(); } }
    else if (kind === 'rings') { for (let r = w * 0.1; r < h; r += w * 0.11) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); } }
    else if (kind === 'hex') { const s = w * 0.1, hh = s * Math.sqrt(3); for (let row = -1; row < h / hh + 1; row++) for (let col2 = -1; col2 < w / (s * 1.5) + 1; col2++) { const px = x + col2 * s * 1.5, py = y + row * hh + (col2 % 2 ? hh / 2 : 0); ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; ctx.lineTo(px + s * Math.cos(a), py + s * Math.sin(a)); } ctx.closePath(); ctx.stroke(); } }
    else if (kind === 'stripes') { for (let i = -h; i < w + h; i += w * 0.14) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + w * 0.07, y); ctx.lineTo(x + i + w * 0.07 - h * 0.6, y + h); ctx.lineTo(x + i - h * 0.6, y + h); ctx.closePath(); ctx.fill(); } }
    else if (kind === 'waves') { for (let yy = y + h * 0.05; yy < y + h; yy += w * 0.09) { ctx.beginPath(); for (let xx = 0; xx <= w; xx += 4) { const v = yy + Math.sin(xx / w * Math.PI * 4 + yy * 0.02) * w * 0.03; xx ? ctx.lineTo(x + xx, v) : ctx.moveTo(x + xx, v); } ctx.stroke(); } }
    else { for (let yy = y + w * 0.05; yy < y + h; yy += w * 0.075) for (let xx = x + w * 0.05; xx < x + w; xx += w * 0.075) { ctx.beginPath(); ctx.arc(xx, yy, w * 0.011, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
  }

  // opts: photo (Image|null), crest (Image|null), attrKeys[], potm (bool)
  // opts: photo, crest, bgImage (Image|null), shapeImage (Image|null, used as an alpha mask when ed.shape === 'custom'), attrKeys, potm
  function drawCard(ctx, x, y, w, player, ed, opts = {}) {
    if (ed.design) return drawDesign(ctx, x, y, w, player, ed, opts);
    const h = w * RATIO;
    if (ed.shape === 'custom' && opts.shapeImage) {
      const W = Math.ceil(w), H = Math.ceil(h), mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      const look = opts.potm ? '#f6dc8a' : ed.accent;
      const rim = mk(), rc = rim.getContext('2d'); rc.drawImage(opts.shapeImage, 0, 0, W, H); rc.globalCompositeOperation = 'source-in'; rc.fillStyle = look; rc.fillRect(0, 0, W, H);
      const body = mk(), bc = body.getContext('2d'); paintCard(bc, 0, 0, W, player, ed, { ...opts, bare: true }); bc.globalCompositeOperation = 'destination-in'; bc.drawImage(opts.shapeImage, 0, 0, W, H);
      if (opts.frameImage) ctx.drawImage(body, x, y, w, h); // the frame artwork is its own rim
      else { ctx.drawImage(rim, x, y, w, h); const k = 0.955; ctx.drawImage(body, x + w * (1 - k) / 2, y + h * (1 - k) / 2, w * k, h * k); }
      return;
    }
    paintCard(ctx, x, y, w, player, ed, opts);
  }
  function paintCard(ctx, x, y, w, player, ed, opts) {
    const h = w * RATIO, potm = !!opts.potm, kind = opts.bare ? 'rect' : (ed.shape === 'custom' ? 'shield' : ed.shape || 'shield');
    const look = potm ? { ...ed, c1: '#7a5412', c2: '#f6dc8a', accent: '#3a2606', ink: '#2a1b04' } : ed;
    ctx.save();
    shield(ctx, x, y, w, h, kind); ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h); g.addColorStop(0, look.c2); g.addColorStop(0.55, look.c1); g.addColorStop(1, look.c1);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const bgi = opts.bgImage;
    if (bgi) { const sc = Math.max(w / bgi.width, h / bgi.height), sw = w / sc, sh = h / sc; ctx.drawImage(bgi, (bgi.width - sw) / 2, (bgi.height - sh) / 2, sw, sh, x, y, w, h); }
    else pattern(ctx, ed.pattern, x, y, w, h, look.accent);
    const sOff = !ed.stats, nameY = sOff ? 0.81 : 0.705, fr = opts.frameImage;
    if (fr && !ed.frameTop) ctx.drawImage(fr, x, y, w, h);
    const sheen = ctx.createLinearGradient(x, y, x + w, y + h * 0.5); sheen.addColorStop(0, 'rgba(255,255,255,.22)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0)'); if (ed.shine) { ctx.fillStyle = sheen; ctx.fillRect(x, y, w, h); const st = ctx.createLinearGradient(x, y + h * 0.1, x + w, y + h * 0.9); st.addColorStop(0.38, 'rgba(255,255,255,0)'); st.addColorStop(0.5, 'rgba(255,255,255,.16)'); st.addColorStop(0.62, 'rgba(255,255,255,0)'); ctx.fillStyle = st; ctx.fillRect(x, y, w, h); }
    // photo (bottom fades into the card)
    const px = x + w * 0.2, py = y + h * 0.06, pw = w * 0.8, ph = h * (sOff ? 0.68 : 0.58);
    if (opts.photo) {
      const im = opts.photo, sc = Math.max(pw / im.width, ph / im.height), sw = pw / sc, sh = ph / sc;
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); ctx.drawImage(im, (im.width - sw) / 2, Math.max(0, (im.height - sh) * 0.15), sw, sh, px, py, pw, ph);
      ctx.restore();
    } else if (opts.crest) { ctx.save(); ctx.globalAlpha = 0.35; const s = Math.min(pw, ph) * 0.8; ctx.drawImage(opts.crest, px + (pw - s) / 2, py + (ph - s) / 2, s, s); ctx.restore(); }
    // bottom shade so the name and stats stay readable over any photo
    const sy0 = nameY - 0.18, shade = ctx.createLinearGradient(0, y + h * sy0, 0, y + h * (nameY - 0.02)); shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, bgi ? 'rgba(0,0,0,.72)' : look.c1); ctx.fillStyle = shade; ctx.fillRect(x, y + h * sy0, w, h * (1 - sy0));
    if (fr && ed.frameTop) ctx.drawImage(fr, x, y, w, h);
    ctx.restore();

    // frame (custom shapes get their rim from drawCard)
    if (!opts.bare && !fr) { ctx.save(); shield(ctx, x, y, w, h, kind); ctx.lineWidth = w * 0.022; ctx.strokeStyle = look.accent; ctx.stroke();
    shield(ctx, x + w * 0.035, y + w * 0.035, w * 0.93, h - w * 0.07, kind); ctx.lineWidth = w * 0.006; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.restore(); }

    const f = FONT(ed.font), ink = look.ink;
    ctx.save(); ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
    // rating + position + number + crest, left column
    ctx.textAlign = 'center'; const lx = x + w * 0.17;
    ctx.font = `700 ${w * 0.25}px ${f}`; ctx.fillText(player.rating == null ? '--' : String(player.rating), lx, y + h * 0.185);
    ctx.font = `700 ${w * 0.1}px ${f}`; ctx.fillText(String(player.position || '').toUpperCase(), lx, y + h * 0.238);
    ctx.fillStyle = look.accent; ctx.fillRect(lx - w * 0.07, y + h * 0.256, w * 0.14, Math.max(1, w * 0.007));
    ctx.fillStyle = ink; ctx.font = `700 ${w * 0.075}px ${f}`; ctx.fillText('#' + (player.number ?? ''), lx, y + h * 0.3);
    if (opts.crest) { const s = w * 0.15, cy = y + h * 0.325 + s / 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, cy, s / 2, 0, Math.PI * 2); ctx.fill(); ctx.drawImage(opts.crest, lx - s / 2, cy - s / 2, s, s); }
    // edition label
    if (ed.label && !potm) { ctx.globalAlpha = 0.9; ctx.font = `700 ${w * 0.055}px ${f}`; ctx.fillStyle = look.accent; ctx.fillText(String(ed.label).toUpperCase(), x + w * 0.62, y + h * 0.075); ctx.globalAlpha = 1; }
    if (potm) { ctx.fillStyle = look.accent; ctx.font = `700 ${w * 0.055}px ${f}`; ctx.fillText('★ PLAYER OF THE MATCH', x + w * 0.62, y + h * 0.075); }
    // name
    ctx.fillStyle = ink; let fs = w * (sOff ? 0.16 : 0.14); const name = String(player.name || '').toUpperCase(); ctx.font = `700 ${fs}px ${f}`; while (ctx.measureText(name).width > w * 0.78 && fs > 8) { fs *= 0.94; ctx.font = `700 ${fs}px ${f}`; }
    ctx.fillText(name, x + w * 0.5, y + h * nameY);
    ctx.fillStyle = look.accent; ctx.fillRect(x + w * 0.2, y + h * (nameY + 0.015), w * 0.6, Math.max(1, w * 0.007));
    // stats
    if (ed.stats) {
      const keys = opts.attrKeys || [], a = player.attrs || {};
      keys.forEach((k, i) => {
        const col = i % 2, row = Math.floor(i / 2), sx = x + w * (col ? 0.58 : 0.18), sy = y + h * (0.765 + row * 0.06);
        ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.font = `700 ${w * 0.085}px ${f}`; ctx.fillText(a[k] == null ? '--' : String(a[k]), sx, sy);
        ctx.fillStyle = look.accent; ctx.font = `700 ${w * 0.065}px ${f}`; ctx.fillText(LABELS[k] || '', sx + w * 0.115, sy);
      });
      ctx.fillStyle = look.accent; ctx.globalAlpha = 0.5; ctx.fillRect(x + w * 0.5 - w * 0.004, y + h * 0.725, w * 0.008, h * 0.17); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // Poster with many cards in one grid (4 per row), styled like the match's edition.
  function sheetSize(n) { const rows = Math.max(1, Math.ceil(n / 4)); return { w: 1080, h: 330 + rows * 364 + 130 }; }
  function drawSheet(ctx, w, h, info, items, ed, opts = {}) {
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, ed.c2); g.addColorStop(0.5, ed.c1); g.addColorStop(1, '#050305'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    pattern(ctx, ed.pattern, 0, 0, w, h, ed.accent);
    const f = FONT(ed.font);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    let fs = 118; const title = info.title.toUpperCase(); ctx.font = `700 ${fs}px ${f}`; while (ctx.measureText(title).width > w - 140 && fs > 40) { fs -= 4; ctx.font = `700 ${fs}px ${f}`; }
    ctx.fillText(title, 64, 150);
    ctx.fillStyle = ed.accent; ctx.font = `700 40px ${f}`; ctx.fillText(info.sub.toUpperCase(), 64, 215);
    ctx.fillRect(64, 240, 160, 6);
    const cw = 220, gap = 24, n = items.length, rows = Math.ceil(n / 4);
    items.forEach((it, i) => {
      const r = Math.floor(i / 4), inRow = Math.min(4, n - r * 4), c = i % 4, rowW = inRow * cw + (inRow - 1) * gap, sx = (w - rowW) / 2 + c * (cw + gap), sy = 290 + r * 364;
      drawCard(ctx, sx, sy, cw, it.player, ed, it.opts);
    });
    if (opts.crest) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(96, h - 76, 32, 0, Math.PI * 2); ctx.fill(); ctx.drawImage(opts.crest, 64, h - 108, 64, 64); }
    ctx.fillStyle = '#fff'; ctx.font = `700 34px ${f}`; ctx.fillText('GAMUDA FOOTBALL CLUB', 144, h - 62);
  }

  // Makes a plain white / black (or the corner colour) background transparent. Edits img.data in place; returns how many pixels became see-through.
  // edgesOnly: only background connected to the picture's border is removed, so light or dark areas inside the artwork stay.
  function removeBackground(img, { mode = 'white', tol = 30, edgesOnly = true, soft = 14 } = {}) {
    const { data: d, width: W, height: H } = img, n = W * H;
    let tr = 255, tg = 255, tb = 255;
    if (mode === 'black') tr = tg = tb = 0;
    else if (mode === 'auto') { const c = [0, W - 1, (H - 1) * W, n - 1].map((i) => i * 4); tr = tg = tb = 0; c.forEach((i) => { tr += d[i]; tg += d[i + 1]; tb += d[i + 2]; }); tr /= 4; tg /= 4; tb /= 4; }
    const t = tol * 2.55, dist = (i) => Math.max(Math.abs(d[i * 4] - tr), Math.abs(d[i * 4 + 1] - tg), Math.abs(d[i * 4 + 2] - tb));
    const reach = t + soft, inside = new Uint8Array(n);
    if (edgesOnly) {
      const q = [], push = (i) => { if (!inside[i] && dist(i) <= reach) { inside[i] = 1; q.push(i); } };
      for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); } for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
      while (q.length) { const i = q.pop(), x = i % W, y = (i / W) | 0; if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W); }
    } else for (let i = 0; i < n; i++) if (dist(i) <= reach) inside[i] = 1;
    let cleared = 0;
    for (let i = 0; i < n; i++) {
      if (!inside[i]) continue;
      const k = Math.min(1, Math.max(0, (dist(i) - t) / Math.max(1, soft))), a = Math.round(d[i * 4 + 3] * k);
      if (a < d[i * 4 + 3]) { d[i * 4 + 3] = a; if (a < 16) cleared++; }
    }
    return cleared;
  }

  // Hollows out a full card picture so only the border is left: whatever lies deeper than `thickness` (% of the width) from the outside edge becomes transparent.
  function extractFrame(img, { thickness = 7, soft = 3 } = {}) {
    const { data: d, width: W, height: H } = img, n = W * H, out = new Uint8Array(n), q = [];
    const push = (i) => { if (!out[i] && d[i * 4 + 3] < 16) { out[i] = 1; q.push(i); } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); } for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (q.length) { const i = q.pop(), x = i % W, y = (i / W) | 0; if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W); }
    const dist = new Float32Array(n), BIG = 1e9, S = Math.SQRT2;
    for (let i = 0; i < n; i++) dist[i] = out[i] ? 0 : BIG;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = dist[i]; if (x > 0) v = Math.min(v, dist[i - 1] + 1); if (y > 0) { v = Math.min(v, dist[i - W] + 1); if (x > 0) v = Math.min(v, dist[i - W - 1] + S); if (x < W - 1) v = Math.min(v, dist[i - W + 1] + S); } dist[i] = v; }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = dist[i]; if (x < W - 1) v = Math.min(v, dist[i + 1] + 1); if (y < H - 1) { v = Math.min(v, dist[i + W] + 1); if (x < W - 1) v = Math.min(v, dist[i + W + 1] + S); if (x > 0) v = Math.min(v, dist[i + W - 1] + S); } dist[i] = v; }
    const t = W * thickness / 100; let cleared = 0;
    for (let i = 0; i < n; i++) { if (out[i]) continue; const k = Math.min(1, Math.max(0, (dist[i] - t) / Math.max(1, soft))); if (k > 0) { d[i * 4 + 3] = Math.round(d[i * 4 + 3] * (1 - k)); if (k === 1) cleared++; } }
    return cleared;
  }


  // ===== User-made card templates ("designs"): a background picture plus movable items, drawn the same way for every player =====
  const blendDefaults = () => ({ preset: 'none', color: '#1f4fd8', amount: 0, contrast: 100, saturation: 100, brightness: 100 });
  // Face guide: the circle every player's face is fitted into (x,y centre and s diameter as fractions of the card). Fade: colour rising from the bottom so the photo melts in and the name has clear space.
  const faceDefaults = () => ({ on: true, x: 0.5, y: 0.3, s: 0.36 });
  const FACE_GUESS = { x: 0.5, y: 0.22, s: 0.34 };
  const fadeDefaults = () => ({ on: true, color: '', amount: 88, height: 46 });
  const defaultLayers = () => [
    { id: 'photo', type: 'photo', label: 'Player photo', x: 0.56, y: 0.4, s: 0.82, visible: true },
    { id: 'rating', type: 'rating', label: 'Rating', x: 0.17, y: 0.16, s: 0.24, color: '#ffffff', font: '', shadow: true, visible: true },
    { id: 'position', type: 'position', label: 'Position', x: 0.17, y: 0.235, s: 0.1, color: '#ffffff', font: '', shadow: true, visible: true },
    { id: 'number', type: 'number', label: 'Number', x: 0.17, y: 0.3, s: 0.08, color: '#ffffff', font: '', shadow: true, visible: true },
    { id: 'logo', type: 'logo', label: 'Club logo', x: 0.17, y: 0.375, s: 0.14, visible: true },
    { id: 'name', type: 'name', label: 'Name', x: 0.5, y: 0.71, s: 0.13, color: '#ffffff', font: '', shadow: true, visible: true },
    { id: 'attrs', type: 'attrs', label: 'Attributes', x: 0.5, y: 0.84, s: 0.07, color: '#ffffff', font: '', shadow: true, visible: true }
  ];
  const rgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const n = m ? parseInt(m[1], 16) : 0x1f4fd8; return [n >> 16, (n >> 8) & 255, n & 255]; };
  const blendActive = (b) => b && (b.amount > 0 || b.contrast !== 100 || b.saturation !== 100 || b.brightness !== 100);
  // Same grade for every photo: brightness, contrast, saturation, then a colour wash that keeps each pixel's own brightness.
  function blendImageData(img, b) {
    const d = img.data, [tr, tg, tb] = rgb(b.color), a = b.amount / 100, ct = b.contrast / 100, sat = b.saturation / 100, br = b.brightness / 100, tl = 0.299 * tr + 0.587 * tg + 0.114 * tb || 1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let r = d[i] * br, g = d[i + 1] * br, bl = d[i + 2] * br;
      r = (r - 128) * ct + 128; g = (g - 128) * ct + 128; bl = (bl - 128) * ct + 128;
      let l = 0.299 * r + 0.587 * g + 0.114 * bl; r = l + (r - l) * sat; g = l + (g - l) * sat; bl = l + (bl - l) * sat;
      if (a > 0) { l = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * bl)); const k = l / tl; r = r * (1 - a) + Math.min(255, tr * k) * a; g = g * (1 - a) + Math.min(255, tg * k) * a; bl = bl * (1 - a) + Math.min(255, tb * k) * a; }
      d[i] = r < 0 ? 0 : r > 255 ? 255 : r; d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; d[i + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
    }
  }
  const blendCache = new WeakMap();
  function gradedPhoto(im, b) {
    if (!blendActive(b)) return im;
    const key = [b.color, b.amount, b.contrast, b.saturation, b.brightness].join('|');
    let m = blendCache.get(im); if (!m) { m = new Map(); blendCache.set(im, m); }
    if (m.has(key)) return m.get(key);
    const sc = Math.min(1, 700 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, c.width, c.height); const id = g.getImageData(0, 0, c.width, c.height); blendImageData(id, b); g.putImageData(id, 0, 0);
    if (m.size > 12) m.clear(); m.set(key, c); return c;
  }
  // Draws a player with a saved design; returns the on-canvas box of every item so an editor can hit-test and select them.
  function drawDesign(ctx, x, y, w, player, ed, opts = {}) {
    const d = ed.design, h = w * RATIO;
    if (d.shapeImg && opts.shapeImage) {
      const W = Math.ceil(w), H = Math.ceil(h), c = document.createElement('canvas'); c.width = W; c.height = H;
      const bc = c.getContext('2d'), boxes = paintDesign(bc, 0, 0, W, player, ed, opts, 'rect');
      bc.globalCompositeOperation = 'destination-in'; bc.drawImage(opts.shapeImage, 0, 0, W, H);
      ctx.drawImage(c, x, y, w, h); return boxes.map((b) => ({ ...b, x: b.x + x, y: b.y + y }));
    }
    return paintDesign(ctx, x, y, w, player, ed, opts, d.shape || 'shield');
  }
  function paintDesign(ctx, x, y, w, player, ed, opts, kind) {
    const d = ed.design, h = w * RATIO, boxes = [], f = FONT(d.font || ed.font), fr = opts.frameImage, bgi = opts.bgImage;
    ctx.save(); shield(ctx, x, y, w, h, kind); ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h); g.addColorStop(0, d.color2 || '#ed1c24'); g.addColorStop(1, d.color1 || '#2a060b'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (bgi) { const sc = Math.max(w / bgi.width, h / bgi.height), sw = w / sc, sh = h / sc; ctx.drawImage(bgi, (bgi.width - sw) / 2, (bgi.height - sh) / 2, sw, sh, x, y, w, h); }
    if (fr && !d.frameTop) ctx.drawImage(fr, x, y, w, h);
    const layers = d.layers || [], photoL = layers.find((l) => l.type === 'photo' && l.visible !== false);
    if (photoL) {
      const im = opts.photo, gd = d.face && d.face.on ? d.face : null;
      let cx = x + photoL.x * w, cy = y + photoL.y * h, pw = photoL.s * w;
      if (gd) { const pf = player.face || FACE_GUESS, ar = im ? im.height / im.width : 1.2; pw = gd.s * w / pf.s; cx = x + gd.x * w - (pf.x - 0.5) * pw; cy = y + gd.y * h - (pf.y - 0.5) * pw * ar; }
      if (im) { const src = gradedPhoto(im, d.blend), ph = pw * src.height / src.width; ctx.drawImage(src, cx - pw / 2, cy - ph / 2, pw, ph); boxes.push({ id: photoL.id, x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph }); }
      else { const s = pw * 0.6; if (opts.crest) { ctx.save(); ctx.globalAlpha = 0.3; ctx.drawImage(opts.crest, cx - s / 2, cy - s / 2, s, s); ctx.restore(); } boxes.push({ id: photoL.id, x: cx - pw / 2, y: cy - pw * 0.6, w: pw, h: pw * 1.2 }); }
    }
    const fd = d.fade;
    if (fd && fd.on && fd.amount > 0) {
      const [r, g2, b] = rgb(fd.color || d.color1), a = fd.amount / 100, fh = h * fd.height / 100, gr = ctx.createLinearGradient(0, y + h, 0, y + h - fh);
      gr.addColorStop(0, `rgba(${r},${g2},${b},${a})`); gr.addColorStop(0.45, `rgba(${r},${g2},${b},${a * 0.72})`); gr.addColorStop(1, `rgba(${r},${g2},${b},0)`);
      ctx.fillStyle = gr; ctx.fillRect(x, y + h - fh, w, fh + 1);
    }
    if (fr && d.frameTop) ctx.drawImage(fr, x, y, w, h);
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const l of layers) {
      if (l.type === 'photo' || l.visible === false) continue;
      const cx = x + l.x * w, cy = y + l.y * h, lf = l.font ? FONT(l.font) : f;
      ctx.save(); ctx.fillStyle = l.color || '#fff';
      if (l.shadow) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = Math.max(2, l.s * w * 0.16); ctx.shadowOffsetY = Math.max(1, l.s * w * 0.04); }
      if (l.type === 'logo') {
        const s = l.s * w; if (opts.crest) { ctx.shadowColor = 'transparent'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, Math.PI * 2); ctx.fill(); ctx.drawImage(opts.crest, cx - s / 2, cy - s / 2, s, s); }
        boxes.push({ id: l.id, x: cx - s / 2, y: cy - s / 2, w: s, h: s });
      } else if (l.type === 'attrs') {
        const keys = opts.attrKeys || [], a = player.attrs || {}, fs = l.s * w, rowH = fs * 1.5;
        ctx.font = `700 ${fs}px ${lf}`;
        keys.forEach((k, i) => { const col = i % 2, row = Math.floor(i / 2), px = cx + (col ? 0.2 : -0.2) * w, py = cy + (row - 1) * rowH; ctx.textAlign = 'right'; ctx.fillText(a[k] == null ? '--' : String(a[k]), px - fs * 0.15, py); ctx.textAlign = 'left'; ctx.globalAlpha = 0.85; ctx.fillText(LABELS[k] || '', px + fs * 0.15, py); ctx.globalAlpha = 1; });
        ctx.textAlign = 'center'; boxes.push({ id: l.id, x: cx - 0.4 * w, y: cy - rowH * 1.6, w: 0.8 * w, h: rowH * 3.2 });
      } else {
        let txt = l.type === 'name' ? String(player.name || '').toUpperCase() : l.type === 'number' ? String(player.number ?? '') : l.type === 'position' ? String(player.position || '').toUpperCase() : l.type === 'rating' ? (player.rating == null ? '--' : String(player.rating)) : String(l.text || '');
        let fs = l.s * w; ctx.font = `700 ${fs}px ${lf}`; while (ctx.measureText(txt).width > w * 0.9 && fs > 6) { fs *= 0.94; ctx.font = `700 ${fs}px ${lf}`; }
        ctx.fillText(txt, cx, cy); const tw = Math.max(ctx.measureText(txt).width, fs * 0.8); boxes.push({ id: l.id, x: cx - tw / 2, y: cy - fs * 0.6, w: tw, h: fs * 1.2 });
      }
      ctx.restore();
    }
    ctx.restore(); return boxes;
  }

  const api = { removeBackground, extractFrame, blendDefaults, defaultLayers, faceDefaults, fadeDefaults, drawDesign, PRESETS, PATTERNS, SHAPES, RATIO, resolve, shuffle, drawCard, drawSheet, sheetSize };
  root.GFC_CARDS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
