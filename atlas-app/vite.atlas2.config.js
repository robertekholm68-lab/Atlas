import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

// ATLAS 2.0 — eget byggmål. Nytt gränssnitt, samma motorer.
// Egen entrépunkt betyder att 2.0 kan växa utan att röra den fungerande appen;
// blir det fel är rollbacken att helt enkelt inte skeppa filen.
const BUILD = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);

export default defineConfig({
  base: "./",
  define: { __ATLAS_BUILD__: JSON.stringify(BUILD) },
  plugins: [react(), viteSingleFile({ useRecommendedBuildConfig: false })],
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
