import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

// Askr 2.0 — eget byggmål. Nytt gränssnitt, samma motorer.
// Egen entrépunkt betyder att 2.0 kan växa utan att röra den fungerande appen;
// blir det fel är rollbacken att helt enkelt inte skeppa filen.
const BUILD = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);

// Service workern MÅSTE vara en riktig fil på http(s) — specifikationen förbjuder
// registrering från blob:-adresser och webbläsaren avvisar den tyst. Samma
// lärdom som mobilbygget: därför emitteras sw-atlas2.js som egen fil.
//
// Network-first för dokumentet: annars fastnar man på en gammal version. Bilder
// och övrigt går cache-first så att anatomifigurerna inte hämtas om vid varje
// start.
const SW = `
const CACHE = "atlas2-${BUILD}";
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
`;

const MANIFEST = JSON.stringify({
  name: "Askr",
  short_name: "Askr",
  start_url: "./atlas2.html",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0A0A0A",
  theme_color: "#0A0A0A",
  icons: [
    { src: "./atlas-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "./atlas-icon-512.webp", sizes: "512x512", type: "image/webp", purpose: "any" },
    { src: "./atlas-icon-512-mask.webp", sizes: "512x512", type: "image/webp", purpose: "maskable" },
  ],
}, null, 2);

const emitPwa = () => ({
  name: "atlas2-pwa",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "sw-atlas2.js", source: SW });
    this.emitFile({ type: "asset", fileName: "atlas2.webmanifest", source: MANIFEST });
  },
});

export default defineConfig({
  base: "./",
  define: { __ATLAS_BUILD__: JSON.stringify(BUILD) },
  plugins: [react(), viteSingleFile({ useRecommendedBuildConfig: false }), emitPwa()],
  build: {
    // Bilder hålls utanför bygget, som i de andra målen: en ny appversion ska
    // inte tvinga fram en ny nedladdning av hela bildbanken.
    assetsInlineLimit: (filePath) => !/\.(webp|png|jpe?g|avif)$/i.test(filePath),
    assetsDir: "",
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: "dist-atlas2",
    rollupOptions: { input: resolve(process.cwd(), "atlas2.html"), output: { inlineDynamicImports: true } },
  },
});
