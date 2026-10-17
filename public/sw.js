// Offline cache: the shell is cached on install, everything else (hashed
// assets, Pixi chunks, Google Fonts) is cached as it is first used.
const CACHE = "ne-vedys-v1"
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./favicon.png"]

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})

const cacheable = (url) =>
  url.origin === self.location.origin || url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com"

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (!cacheable(url)) return
  // Pages: network first so updates arrive; cache when offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return res })
      .catch(() => caches.match("./index.html")))
    return
  }
  // Assets: answer from cache at once, refresh in the background.
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req)
    const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res }).catch(() => hit)
    return hit ?? net
  }))
})
