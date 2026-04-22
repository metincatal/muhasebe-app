const CACHE_NAME = "muhasebe-pro-v9";

const STATIC_ASSETS = ["/offline"];

self.addEventListener("install", (event) => {
  // Eski SW varsa derhal devre dışı bırak — stale cache sorunlarını önler
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => { });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece http/https desteklenir — chrome-extension ve diğer şemaları atla
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Sadece GET isteklerini işle — POST, PUT vb. önbelleğe alınamaz
  if (request.method !== "GET") return;

  // Next.js HMR / geliştirme isteklerini atla
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Supabase API çağrılarını her zaman ağdan al
  if (url.hostname.includes("supabase")) {
    event.respondWith(fetch(request));
    return;
  }

  // Uygulama API route'larını ağdan al; hata varsa önbellekten dön
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Navigasyon: ağdan al, başarısızsa önbellek veya offline sayfası
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline"))
        )
    );
    return;
  }

  // Statik dosyalar: önce önbellek, sonra ağ
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Ağ hatası: önbellekte de yoksa boş 503 dön
        return new Response(null, { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});
