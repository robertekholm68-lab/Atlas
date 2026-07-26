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
    // Identitetsbilderna (ordmärke, symbol, kroppsfigurerna) bäddas IN i bygget.
    // De syns på varje skärm, och som systerfiler hann de aldrig laddas innan
    // vyn ritades — headern blinkade förbi som textfallback, och muskelkartan
    // ritade färgformerna utan anatomin under. En fristående HTML-fil visade
    // dem aldrig alls.
    //
    // Receptbilderna ligger kvar UTANFÖR bygget: de är ~150 stycken och skulle
    // spränga HTML:en. Det är hela skälet till att den här funktionen finns.
    // Skillnaden är alltså inte filformat utan ROLL: identitet bäddas in,
    // innehåll ligger utanför.
    assetsInlineLimit: (filePath) =>
      /assets[\\/]brand[\\/]/i.test(filePath) || !/\.(webp|png|jpe?g|avif)$/i.test(filePath),
    assetsDir: "",   // filerna måste ligga bredvid HTML:en — koden refererar dem relativt
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { environment: "node", setupFiles: ["./src/__tests__/setup.js"] },
});
