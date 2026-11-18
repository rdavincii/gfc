// Background removal that runs on the device (no upload). A small U2-Net model finds the person,
// a guided filter then snaps that rough mask to the real edges of the photo at full resolution.
(function () {
  const BASE = 'vendor/bgremove/', N = 320;
  let sessionP = null;
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Could not load the cut-out engine.')); document.head.appendChild(s); });
  async function readAll(res, onProgress) {
    const total = +res.headers.get('content-length') || 0;
    if (!res.body || !total) return new Uint8Array(await res.arrayBuffer());
    const reader = res.body.getReader(), out = new Uint8Array(total); let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; out.set(value, got); got += value.length; onProgress && onProgress(got / total); }
    return got === total ? out : out.slice(0, got);
  }
  function session(onProgress) {
    if (!sessionP) sessionP = (async () => {
      if (!window.ort) await loadScript(BASE + 'ort.min.js');
      ort.env.wasm.wasmPaths = new URL(BASE, document.baseURI).href; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
      let bytes = null;
      for (const name of ['silueta.onnx', 'u2netp.onnx']) { try { const r = await fetch(BASE + name); if (r.ok) { bytes = await readAll(r, onProgress); break; } } catch { /* try the next model */ } }
      if (!bytes) throw new Error('The cut-out model is not available. Check your connection and try again.');
      return ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
    })().catch(e => { sessionP = null; throw e; });
    return sessionP;
  }
  // Rough person mask, N x N, values 0..1.
  async function predict(source, onProgress) {
    const s = await session(onProgress), c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(source, 0, 0, N, N);
    const px = x.getImageData(0, 0, N, N).data, f = new Float32Array(3 * N * N), mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
    let mx = 1; for (let i = 0; i < N * N; i++) mx = Math.max(mx, px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    for (let i = 0; i < N * N; i++) for (let k = 0; k < 3; k++) f[k * N * N + i] = (px[i * 4 + k] / mx - mean[k]) / std[k];
    const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', f, [1, 3, N, N]) });
    const m = Float32Array.from(out[s.outputNames[0]].data.slice(0, N * N)); let lo = Infinity, hi = -Infinity;
    for (const v of m) { if (v < lo) lo = v; if (v > hi) hi = v; }
    for (let i = 0; i < m.length; i++) m[i] = (m[i] - lo) / (hi - lo || 1);
    return m;
  }
  const upsample = (m, w, h) => {
    const o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { const fy = Math.min(N - 1.001, (y + .5) * N / h - .5), y0 = Math.max(0, Math.floor(fy)), ty = Math.max(0, fy - y0);
      for (let x = 0; x < w; x++) { const fx = Math.min(N - 1.001, (x + .5) * N / w - .5), x0 = Math.max(0, Math.floor(fx)), tx = Math.max(0, fx - x0), i = y0 * N + x0;
        o[y * w + x] = (m[i] * (1 - tx) + m[i + 1] * tx) * (1 - ty) + (m[i + N] * (1 - tx) + m[i + N + 1] * tx) * ty; } }
    return o;
  };
  function box(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let s = 0, o = y * w; for (let x = -r; x <= r; x++) s += src[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { tmp[o + x] = s; s += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
    const k = 1 / ((2 * r + 1) * (2 * r + 1));
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = s * k; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    return out;
  }
  function guided(I, p, w, h, r, eps) {
    const mI = box(I, w, h, r), mp = box(p, w, h, r), II = new Float32Array(w * h), Ip = new Float32Array(w * h);
    for (let i = 0; i < II.length; i++) { II[i] = I[i] * I[i]; Ip[i] = I[i] * p[i]; }
    const cII = box(II, w, h, r), cIp = box(Ip, w, h, r), a = II, b = Ip;
    for (let i = 0; i < a.length; i++) { const v = cII[i] - mI[i] * mI[i], c = cIp[i] - mI[i] * mp[i]; a[i] = c / (v + eps); b[i] = mp[i] - a[i] * mI[i]; }
    const ma = box(a, w, h, r), mb = box(b, w, h, r), q = new Float32Array(w * h);
    for (let i = 0; i < q.length; i++) q[i] = Math.min(1, Math.max(0, ma[i] * I[i] + mb[i]));
    return q;
  }
  // Rough mask -> soft matte that follows the photo's real edges. img is ImageData.
  function refine(img, mask) {
    const { width: w, height: h, data } = img, I = new Float32Array(w * h);
    for (let i = 0; i < I.length; i++) I[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
    const side = Math.max(w, h); let a = upsample(mask, w, h);
    a = guided(I, a, w, h, Math.max(3, Math.round(side * 0.012)), 4e-4);
    a = guided(I, a, w, h, Math.max(2, Math.round(side * 0.004)), 1e-4);
    return a;
  }
  // Keep only the biggest person-shaped blob (drops runners and bystanders behind the player).
  function keepMain(a, w, h) {
    const g = 240 / Math.max(w, h), gw = Math.max(1, Math.round(w * g)), gh = Math.max(1, Math.round(h * g)), lab = new Int32Array(gw * gh), area = [0];
    const on = i => { const x = i % gw, y = (i / gw) | 0; return a[Math.min(h - 1, Math.floor((y + .5) / g)) * w + Math.min(w - 1, Math.floor((x + .5) / g))] > 0.5; };
    let n = 0; const st = [];
    for (let i = 0; i < lab.length; i++) { if (lab[i] || !on(i)) continue; n++; area[n] = 0; lab[i] = n; st.push(i);
      while (st.length) { const j = st.pop(); area[n]++; const x = j % gw, y = (j / gw) | 0;
        for (const k of [x > 0 ? j - 1 : -1, x < gw - 1 ? j + 1 : -1, y > 0 ? j - gw : -1, y < gh - 1 ? j + gw : -1]) if (k >= 0 && !lab[k] && on(k)) { lab[k] = n; st.push(k); } } }
    if (n < 2) return a;
    let best = 1; for (let k = 2; k <= n; k++) if (area[k] > area[best]) best = k;
    let keep = new Uint8Array(gw * gh); for (let i = 0; i < keep.length; i++) keep[i] = lab[i] === best ? 1 : 0;
    for (let pass = 0; pass < 4; pass++) { const nx = keep.slice(); for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (keep[y * gw + x]) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) nx[yy * gw + xx] = 1; } } keep = nx; }
    const o = new Float32Array(a.length);
    for (let y = 0; y < h; y++) { const gy = Math.min(gh - 1, Math.floor(y * g)); for (let x = 0; x < w; x++) if (keep[gy * gw + Math.min(gw - 1, Math.floor(x * g))]) o[y * w + x] = a[y * w + x]; }
    return o;
  }
  // sharp 0..100 (how hard the edge is), edge -50..50 (negative eats into the person, positive grows it)
  function curve(a, sharp, edge) {
    const c = 0.5 - edge / 200, hw = 0.42 - 0.39 * sharp / 100, lo = c - hw, hi = c + hw, o = new Uint8ClampedArray(a.length);
    for (let i = 0; i < a.length; i++) { const t = Math.min(1, Math.max(0, (a[i] - lo) / (hi - lo))); o[i] = 255 * t * t * (3 - 2 * t); }
    return o;
  }
  window.GFC_BG = { predict, refine, keepMain, curve, session, upsample, guided };
})();
