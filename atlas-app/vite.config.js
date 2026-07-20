import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile({ useRecommendedBuildConfig: false })],
  build: {
    // JS och CSS bakas in av viteSingleFile. Bilder hålls medvetet UTANFÖR bygget:
    // inbakade bilder skulle laddas ner på nytt vid varje appuppdatering, medan
    // separata filer ligger kvar i service workerns cache mellan versioner.
    // Allt bakas in UTOM receptbilderna. Inbakade bilder skulle laddas ner på nytt
    // vid varje appuppdatering; separata filer ligger kvar i service workerns cache.
    assetsInlineLimit: (filePath) => !/\.(webp|png|jpe?g|avif)$/i.test(filePath),
    assetsDir: "",   // filerna måste ligga bredvid HTML:en — koden refererar dem relativt
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { environment: "node", setupFiles: ["./src/__tests__/setup.js"] },
});
