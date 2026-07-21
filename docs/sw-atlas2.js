
const CACHE = "atlas2-202607211145";
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const doc = e.request.mode === "navigate" || e.request.destination === "document";
  if (doc) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const kopia = res.clone();
        caches.open(CACHE).then(c => { try { c.put(e.request, kopia); } catch (x) {} });
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match("./atlas2.html")))
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(c =>
      c.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => { try { c.put(e.request, res.clone()); } catch (x) {} return res; }).catch(() => hit)
      )
    )
  );
});
