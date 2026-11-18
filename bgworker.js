// Runs the cut-out model off the main thread so the screen never freezes while it loads or thinks.
let sess = null;
async function load(base, models) {
  importScripts(base + 'ort.min.js');
  ort.env.wasm.wasmPaths = base; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
  for (const name of models) {
    try {
      const r = await fetch(base + name); if (!r.ok) continue;
      const total = +r.headers.get('content-length') || 0, rd = r.body.getReader(), parts = []; let got = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; if (total) postMessage({ type: 'progress', p: got / total }); }
      const bytes = new Uint8Array(got); let o = 0; for (const c of parts) { bytes.set(c, o); o += c.length; }
      return await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'basic' });
    } catch (e) { /* try the next model */ }
  }
  throw new Error('The cut-out model is not available. Check your connection and try again.');
}
onmessage = async ({ data }) => {
  try {
    if (!sess) sess = load(data.base, data.models).catch(e => { sess = null; throw e; });
    const s = await sess, N = data.n;
    const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', data.f, [1, 3, N, N]) });
    const m = Float32Array.from(out[s.outputNames[0]].data.slice(0, N * N));
    postMessage({ type: 'result', m }, [m.buffer]);
  } catch (e) { postMessage({ type: 'error', message: e.message || String(e) }); }
};
