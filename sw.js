// GFC Club Manager service worker: the app opens offline. Bump VERSION on every release.
const VERSION = 'gfc-v7.0';
const SHELL = ['./', 'index.html', 'styles.css', 'ui.css', 'apple.css', 'apple.js', 'player.html', 'player.js', 'player.css', 'player.webmanifest', 'config.js', 'base.css', 'tokens.css', 'initial-data.js', 'psd-import.js', 'game.js', 'cards.js', 'bgremove.js', 'bgworker.js', 'app.js', 'manifest.webmanifest',
  'assets/brand/gfc-logo.png', 'assets/brand/icon-192.png', 'assets/brand/icon-512.png', 'assets/brand/apple-touch-icon.png', 'assets/fonts/bebas-regular.ttf', 'assets/fonts/winner-cond.otf'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  const big = url.pathname.includes('/assets/') || url.pathname.includes('/vendor/'); // pictures and fonts: cache first, saved when first seen
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (big && hit) return hit;
    // code and pages: show the saved copy straight away, refresh it in the background so the next open is current
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    if (hit) { fresh.catch(() => {}); return hit; }
    try { return await fresh; } catch { return req.mode === 'navigate' ? (await cache.match('index.html')) || Response.error() : Response.error(); }
  }));
});
