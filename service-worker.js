const CACHE_NAME = "qr-logbook-v5";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./vendor/qrcode.min.js",
  "./vendor/jsQR.js",
  "./vendor/jsqr-LICENSE.txt",
  "./7057_1566490658_9825_-removebg-preview.png",
  "./Classe365_qrcode-removebg-preview.png",
  "./Gemini_Generated_Image_aklx79aklx79aklx.png",
  "./Assets/_Image_c53utdc53utdc53u.jpg"
];

self.addEventListener("install", event => {
  // Cache each file separately so one missing file cannot stop the whole install.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(APP_FILES.map(file => cache.add(file))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("qr-logbook-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Network first, so updated files always replace old cached ones. The cache is used when offline.
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached =>
          cached || (request.mode === "navigate" ? caches.match("./index.html") : Response.error())
        )
      )
  );
});