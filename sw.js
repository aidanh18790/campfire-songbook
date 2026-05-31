/* Campfire Songbook service worker
   Caches the app shell, fonts, and Firebase SDK so the page opens with no
   signal after the first visit. Firestore data endpoints are left alone so
   the database's own offline cache and live sync keep working. */
const CACHE = "campfire-v2";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
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
  // Never intercept live database / telemetry traffic — let Firestore manage it.
  if (/firestore\.googleapis\.com|firebasedatabase|firebaseinstallations|firebaseremoteconfig|google-analytics|googletagmanager/.test(url.hostname)) {
    return;
  }

  // Stale-while-revalidate for app shell, fonts, and Firebase SDK modules.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        try {
          if (res) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
        } catch (_) {}
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
