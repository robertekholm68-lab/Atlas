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
    // Network-first + no-cache (samma som 2.0): revalidera dokumentet mot servern
    // varje navigering och kringgå HTTP-cachens max-age. GitHub Pages serverar med
    // max-age=600, så en ren fetch kunde dölja en ny publicering i upp till 10 min
    // (gammalt app-skal tills man HÅRD-laddade om). "no-cache" ger 304 vid oförändrad
    // HTML (småbytes) och släpper igenom ny HTML direkt. Offlinestödet är orört:
    // .catch() faller fortfarande tillbaka på cachen, sedan mobile.html. Assets
    // (receptbilder) rörs INTE — de ligger kvar cache-first i grenen nedan.
    e.respondWith(
      fetch(e.request, { cache: "no-cache" }).then((res) => {
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
  plugins: [react(), viteSingleFile({ useRecommendedBuildConfig: false }), emitServiceWorker()],
  build: {
    // Se kommentaren i vite.config.js: bilder hålls utanför bygget så att en ny
    // appversion inte tvingar fram en ny nedladdning av hela bildbanken.
    // Allt bakas in UTOM receptbilderna. Inbakade bilder skulle laddas ner på nytt
    // vid varje appuppdatering; separata filer ligger kvar i service workerns cache.
    assetsInlineLimit: (filePath) => !/\.(webp|png|jpe?g|avif)$/i.test(filePath),
    assetsDir: "",   // filerna måste ligga bredvid HTML:en — koden refererar dem relativt
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: "dist-mobile",
    rollupOptions: { input: resolve(process.cwd(), "mobile.html"), output: { inlineDynamicImports: true } },
  },
});
