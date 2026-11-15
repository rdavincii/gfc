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
  // Original GFC card templates, grouped like a card creator's "official styles" (tiers first, then special editions).
  const T = (id, name, group, c1, c2, accent, ink, pattern, shape, label) => ({ id, name, group, ed: { c1, c2, accent, ink, pattern, shape, label } });
  const TEMPLATES = [
    T('bronze', 'Bronze', 'Standard', '#4a2a12', '#c98a52', '#f3d2a8', '#2b1608', 'dots', 'classic', 'BRONZE'),
    T('silver', 'Silver', 'Standard', '#4a5560', '#d7dee6', '#ffffff', '#1d252c', 'stripes', 'classic', 'SILVER'),
    T('gold', 'Gold', 'Standard', '#8a5f12', '#f6dc8a', '#fff3c4', '#2a1b04', 'rays', 'classic', 'GOLD'),
    T('rare', 'Rare gold', 'Standard', '#6e4a08', '#ffd25a', '#fff8d8', '#241503', 'rays', 'shield', 'RARE'),
    T('matchday', 'Matchday', 'Special', '#2a060b', '#ed1c24', '#ffd9d2', '#ffffff', 'stripes', 'angled', 'MATCHDAY'),
    T('captain', 'Captain', 'Special', '#08080a', '#2c2c33', '#f3c969', '#ffffff', 'rings', 'arch', 'CAPTAIN'),
    T('icon', 'Icon', 'Special', '#b9a36a', '#fdf6dc', '#6b5420', '#3a2c0c', 'waves', 'hex', 'ICON'),
    T('hero', 'Hero', 'Special', '#12063a', '#2fc7b8', '#e9fffb', '#ffffff', 'rays', 'shield', 'HERO'),
    T('toty', 'Team of the Year', 'Special', '#07123f', '#1f4fd8', '#e8c872', '#f6e7b4', 'hex', 'rounded', 'TEAM OF THE YEAR'),
    T('rising', 'Rising star', 'Special', '#03281d', '#14a56a', '#d9ffe8', '#ffffff', 'stripes', 'angled', 'RISING STAR'),
    T('night', 'Night match', 'Special', '#1c0638', '#8a3cff', '#ffe1ff', '#ffffff', 'dots', 'classic', 'NIGHT MATCH'),
    T('sunset', 'Golden hour', 'Special', '#4a0c27', '#ff7a2f', '#fff0d0', '#ffffff', 'waves', 'rounded', 'GOLDEN HOUR')
  ];
  const TIERS = [['bronze', 0], ['silver', 65], ['gold', 75], ['rare', 85]];
  // With "tier by rating" on, a rated player's card takes the Bronze/Silver/Gold/Rare template for their rating (other settings stay).
  function forPlayer(ed, player) {
    if (!ed.autoTier || player.rating == null) return ed;
    let id = 'bronze'; for (const [k, min] of TIERS) if (player.rating >= min) id = k;
    return { ...ed, ...TEMPLATES.find((x) => x.id === id).ed, shape: ed.shape === 'custom' ? 'custom' : TEMPLATES.find((x) => x.id === id).ed.shape };
  }
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
      tpl: TEMPLATES.some((q) => q.id === s.tpl) ? s.tpl : '', autoTier: s.autoTier === true, shine: s.shine !== false,
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
  function drawCard(ctx, x, y, w, player, ed0, opts = {}) {
    const ed = forPlayer(ed0, player), h = w * RATIO;
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
    if (opts.crest) { const s = w * 0.15; ctx.drawImage(opts.crest, lx - s / 2, y + h * 0.325, s, s); }
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
    if (opts.crest) ctx.drawImage(opts.crest, 64, h - 108, 64, 64);
    ctx.fillStyle = '#fff'; ctx.font = `700 34px ${f}`; ctx.fillText('GAMUDA FOOTBALL CLUB', 144, h - 62);
  }

  const api = { PRESETS, PATTERNS, SHAPES, TEMPLATES, forPlayer, RATIO, resolve, shuffle, drawCard, drawSheet, sheetSize };
  root.GFC_CARDS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
