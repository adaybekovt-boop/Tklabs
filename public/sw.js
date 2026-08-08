/* global self, caches, Request, Response, fetch, URL */

const CACHE_PREFIX = "tklabs";
const CACHE_VERSION = "v0.20.9";
const CACHE_REVISION = "trust-architecture-r1";
const STATIC_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}-${CACHE_REVISION}-static`;
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/images/brand/tk-app-icon.svg", "/images/brand/tk-logo.png", "/images/home/hero-lab.svg", "/images/home/lab-cluster.svg"];
function canStore(response) { if (!response || !response.ok) return false; const cacheControl = response.headers.get("cache-control") ?? ""; if (/no-store|private/i.test(cacheControl)) return false; if (response.headers.has("set-cookie")) return false; return response.type === "basic" || response.type === "cors"; }
async function putSafe(cache, request, response) { if (!canStore(response)) return; await cache.put(request, response.clone()); }
self.addEventListener("install", (event) => { event.waitUntil((async () => { const cache = await caches.open(STATIC_CACHE); await Promise.allSettled(PRECACHE_URLS.map(async (url) => { const request = new Request(url, { cache: "reload" }); const response = await fetch(request); await putSafe(cache, request, response); })); })()); });
self.addEventListener("activate", (event) => { event.waitUntil((async () => { const keys = await caches.keys(); await Promise.all(keys.filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && key !== STATIC_CACHE).map((key) => caches.delete(key))); await self.clients.claim(); })()); });
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") void self.skipWaiting(); });
function isNavigation(request) { return request.mode === "navigate" || request.destination === "document"; }
function isStaticAsset(request, url) { return request.method === "GET" && url.origin === self.location.origin && ["style", "script", "image", "font", "manifest"].includes(request.destination); }
async function networkFirstPage(request) { try { const response = await fetch(request); if (canStore(response)) { const cache = await caches.open(STATIC_CACHE); await putSafe(cache, request, response); } return response; } catch { const cached = await caches.match(request); if (cached) return cached; const offline = await caches.match(OFFLINE_URL); return offline ?? new Response("Offline", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }); } }
async function staleWhileRevalidate(request) { const cache = await caches.open(STATIC_CACHE); const cached = await cache.match(request); const refresh = fetch(request).then(async (response) => { await putSafe(cache, request, response); return response; }).catch(() => null); return cached ?? (await refresh) ?? new Response("Unavailable", { status: 503 }); }
self.addEventListener("fetch", (event) => { const request = event.request; if (request.method !== "GET") return; const url = new URL(request.url); if (isNavigation(request)) { event.respondWith(networkFirstPage(request)); return; } if (isStaticAsset(request, url)) event.respondWith(staleWhileRevalidate(request)); });
