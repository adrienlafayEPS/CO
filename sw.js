"use strict";

/** Incrémenter après mise à jour d’index.html pour forcer le rechargement du cache navigateur. */
const CACHE_NAME = "co-eps-v1";
const PRECACHE_URLS = ["./index.html", "./manifest.webmanifest", "./logo-co.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

function indexUrl() {
  return new URL("./index.html", self.location).href;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigate = req.mode === "navigate";

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (isNavigate) {
        try {
          const fresh = await fetch(req);
          if (fresh.ok && fresh.type === "basic") {
            await cache.put(indexUrl(), fresh.clone());
          }
          return fresh;
        } catch {
          const fallback = await cache.match(indexUrl());
          return (
            fallback ||
            new Response("Application non disponible hors ligne (ouvrez-la une fois en ligne).", {
              status: 503,
              statusText: "Offline",
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            })
          );
        }
      }

      let cached = await cache.match(req);
      if (cached) return cached;
      cached = await cache.match(url.pathname);
      if (cached) return cached;

      try {
        return await fetch(req);
      } catch {
        return new Response("", { status: 503 });
      }
    })()
  );
});
