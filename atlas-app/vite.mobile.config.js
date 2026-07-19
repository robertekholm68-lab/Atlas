import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

// Separat bygge för mobilkompanjonen → egen single-file HTML (atlas-mobile.html).
// Återanvänder samma motorer (src/engines) som webben; egen UI + egen localStorage-namnrymd.
const BUILD = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);

// Service workern MÅSTE vara en riktig fil på http(s) — specifikationen förbjuder
// registrering från blob:-adresser, och webbläsaren avvisar den tyst. Därför emitteras
// sw.js som en separat fil vid sidan av mobile.html.
const SW_SOURCE = `
const CACHE = "atlas-mobile-${BUILD}";
self.addEventListener("install", () => { self.skipWaiting(); });
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
`;

const emitServiceWorker = () => ({
  name: "atlas-emit-sw",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "sw.js", source: SW_SOURCE });
  },
});

export default defineConfig({
  base: "./",
  define: { __ATLAS_BUILD__: JSON.stringify(BUILD) },
  plugins: [react(), viteSingleFile(), emitServiceWorker()],
  build: {
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    outDir: "dist-mobile",
    rollupOptions: { input: resolve(process.cwd(), "mobile.html") },
  },
});
