// Offline copy of the app. Pages: newest from the network when it answers within 3 s, else the saved copy.
// Icons, manifest and fonts: saved copy first. A new version name clears the old copy.
// Updates: open app windows are told about the new version. A window that answers switches itself at a quiet moment;
// a window that does not answer runs an older copy without that check, so it is reloaded here (it writes its data on closing).
const VER = '29a5388a0d', C = 'kitchen-' + VER;
const CORE = ['./index.html', './manifest.json', './icon-192.png', './apple-touch-icon.png'];   // one copy of the page (pages are served from ./index.html)
const fresh = u => new Request(u, { cache: 'reload' });   // past the browser's own cache (GitHub Pages keeps files 10 minutes)
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE.map(fresh))).then(() => self.skipWaiting())); });
const told = new Set();
self.addEventListener('message', e => { const d = e.data || {}, s = e.source; if (!s) return; if (d.t === 'kv') told.add(s.id); else if (d.t === 'ver?') s.postMessage({ t: 'kv?', v: VER }); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => { oldWindows(); })); });
/* after activating (a reload asked for while still activating would wait for this worker forever) */
async function oldWindows() {
  const ws = await self.clients.matchAll({ type: 'window' }); if (!ws.length) return;
  ws.forEach(w => { try { w.postMessage({ t: 'kv?', v: VER }); } catch (x) {} });
  await new Promise(ok => setTimeout(ok, 8000));   // time to answer even while the page is busy (a PDF being made)
  ws.filter(w => !told.has(w.id) && w.navigate).forEach(w => w.navigate(w.url).catch(() => null));
}
const keep = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(C).then(c => c.put(req, cp)); } return res; };
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.pathname.endsWith('/access.txt')) return;  // the admin's list: always from the network, never saved
  if (r.mode === 'navigate') {
    const net = fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => res.redirected ? fetch(r) : res).then(res => keep('./index.html', res));
    const slow = new Promise(ok => setTimeout(ok, 3000)).then(() => caches.match('./index.html'));
    e.respondWith(Promise.race([net.catch(() => caches.match('./index.html')), slow.then(m => m || net)]));
    return;
  }
  if (u.origin === location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => keep(r, res))));
  }
});
