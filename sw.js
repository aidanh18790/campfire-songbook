/* Campfire Songbook service worker
   Caches the app shell, fonts, and Firebase SDK so the page opens with no
   signal after the first visit. Live database AND auth endpoints are left
   alone so sign-in and sync work normally. */
const CACHE = "campfire-v30";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./style.css", "./app.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never intercept live database, auth, or telemetry traffic.
  if (/firestore\.googleapis\.com|firebasedatabase|firebaseinstallations|firebaseremoteconfig|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|accounts\.google\.com|apis\.google\.com|firebaseapp\.com|google-analytics|googletagmanager/.test(url.hostname + url.pathname)) {
    return;
  }

  // Stale-while-revalidate for app shell, fonts, and Firebase SDK modules.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        try { if (res) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } } catch (_) {}
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
