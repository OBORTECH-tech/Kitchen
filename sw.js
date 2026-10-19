// Offline copy of the app. Pages: newest from the network when it answers within 3 s, else the saved copy.
// Icons, manifest and fonts: saved copy first. A new version name clears the old copy.
const C = 'kitchen-a5f7a1ad15';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const keep = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(C).then(c => c.put(req, cp)); } return res; };
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {
    const net = fetch(r).then(res => keep('./index.html', res));
    const slow = new Promise(ok => setTimeout(ok, 3000)).then(() => caches.match('./index.html'));
    e.respondWith(Promise.race([net.catch(() => caches.match('./index.html')), slow.then(m => m || net)]));
    return;
  }
  if (u.origin === location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => keep(r, res))));
  }
});
