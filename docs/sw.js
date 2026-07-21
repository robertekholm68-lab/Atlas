
const CACHE = "atlas-mobile-202607211040";
self.addEventListener("install", () => { self.skipWaiting(); });
// Receptbilder ligger som separata filer bredvid appen. De hämtas en gång och
// ligger sedan kvar i cachen även när en ny appversion rullas ut.
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const isDoc = e.request.mode === "navigate" || e.request.destination === "document";
  if (isDoc) {
    // Network-first: annars fastnar testare på en gammal version.
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { try { c.put(e.request, copy); } catch (x) {} });
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("./mobile.html")))
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(e.request).then((hit) =>
        hit || fetch(e.request).then((res) => { try { c.put(e.request, res.clone()); } catch (x) {} return res; }).catch(() => hit)
      )
    )
  );
});
