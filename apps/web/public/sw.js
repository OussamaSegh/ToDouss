self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open("todouss-runtime-v1");
      const cached = await cache.match(event.request);
      return cached || Response.error();
    }),
  );
});

