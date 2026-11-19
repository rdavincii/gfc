// Apple-style touch behaviour: instant press feedback on iOS and a draggable sheet (follows the finger 1:1,
// then projects the flick to decide between dismissing and springing back).
(() => {
  document.addEventListener('touchstart', () => {}, { passive: true }); // iOS only shows :active when a touch listener exists
  const m = document.getElementById('modal'); if (!m) return;
  const mobile = () => matchMedia('(max-width:900px)').matches;
  const rubber = (d, dim = 400, c = .55) => (d * dim * c) / (dim + c * d);
  const project = (v, rate = .998) => (v / 1000) * rate / (1 - rate); // where a flick would come to rest
  let s = null;
  const reset = () => { m.classList.remove('is-dragging', 'is-settling'); m.style.transform = ''; s = null; };
  m.addEventListener('close', reset);
  m.addEventListener('pointerdown', e => {
    const h = e.target.closest('.dialog-header');
    if (!h || e.target.closest('button') || !mobile() || (e.pointerType === 'mouse' && e.button)) return;
    s = { id: e.pointerId, y0: e.clientY, hist: [[e.timeStamp, e.clientY]], dy: 0, h };
    h.setPointerCapture(e.pointerId); m.classList.remove('is-settling'); m.classList.add('is-dragging');
  });
  m.addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.id) return;
    const d = e.clientY - s.y0; s.dy = d < 0 ? -rubber(-d) : d; m.style.transform = `translateY(${s.dy}px)`;
    s.hist.push([e.timeStamp, e.clientY]); while (s.hist.length > 2 && e.timeStamp - s.hist[0][0] > 100) s.hist.shift();
  });
  const end = e => {
    if (!s || e.pointerId !== s.id) return;
    const [t0, y0] = s.hist[0], [t1, y1] = s.hist[s.hist.length - 1], v = t1 > t0 ? (y1 - y0) / (t1 - t0) * 1000 : 0;
    const projected = s.dy + project(v), h = m.getBoundingClientRect().height;
    m.classList.remove('is-dragging'); m.classList.add('is-settling');
    if (projected > h * .45 || v > 900) { m.style.transform = `translateY(${h + 20}px)`; setTimeout(() => { if (m.open) m.close(); }, 260); }
    else { m.style.transform = ''; setTimeout(reset, 460); }
    s = null;
  };
  m.addEventListener('pointerup', end); m.addEventListener('pointercancel', end);
})();
