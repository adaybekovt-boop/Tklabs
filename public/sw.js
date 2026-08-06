const CACHE_PREFIX = "tklabs";
const CACHE_VERSION = "v0.12.0";
const STATIC_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/images/brand/tk-app-icon.svg",
  "/images/brand/tk-logo.png",
  "/images/home/hero-lab.svg",
  "/images/home/lab-cluster.svg",
];

function canStore(response) {
  if (!response || !response.ok) return false;
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (/no-store|private/i.test(cacheControl)) return false;
  if (response.headers.has("set-cookie")) return false;
  return response.type === "basic" || response.type === "cors";
}

async function putSafe(cache, request, response) {
  if (!canStore(response)) return;
  await cache.put(request, response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      const request = new Request(url, { cache: "reload" });
      const response = await fetch(request);
      await putSafe(cache, request, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && key !== STATIC_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.match(OFFLINE_URL)) ?? Response.error();
      }
    })());
    return;
  }

  const isPrivateOrDynamic =
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/admin/");
  if (isPrivateOrDynamic) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:css|js|mjs|png|jpe?g|webp|avif|svg|ico|woff2?)$/i.test(url.pathname);

  if (!isStaticAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request).then(async (response) => {
      await putSafe(cache, request, response);
      return response;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(network.then(() => undefined));
      return cached;
    }

    return (await network) ?? Response.error();
  })());
});
