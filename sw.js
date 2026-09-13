/* Service worker Bormand Wealth — cache l'app pour un usage 100% hors-ligne.
   Aucune donnée utilisateur ne transite ici : seuls les fichiers de l'app (HTML/JS/CSS/icônes)
   sont mis en cache. Les données vivent dans le localStorage de l'appareil. */
const CACHE_NAME = 'bormand-wealth-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './index.html'])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stratégie : réseau d'abord pour la page (pour récupérer les mises à jour),
// cache d'abord pour les assets fingerprintés (js/css/png immuables).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ex: CDN xlsx — jamais mis en cache ici

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy)); // jamais une page d'erreur
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)); // un 404 mis en cache bloquerait l'app
        return res;
      });
    })
  );
});
