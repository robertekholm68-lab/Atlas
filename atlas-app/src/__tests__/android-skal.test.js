// Android-skalets två hårda regler, kontrollerade mot källan.
//
// Skalet har INGEN byggkontroll i det här repot — Java kompileras bara på en
// maskin med Android SDK och signeringsnyckeln. Ett fel här upptäcks alltså
// först när någon bygger en APK och installerar den på en telefon, vilket kan
// dröja veckor. De två reglerna nedan är billiga att kontrollera och har båda
// kostat tid tidigare.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const SKAL = resolve("android-app");
const KÄLLA = join(SKAL, "src/se/atlas/app");
const finns = existsSync(KÄLLA);

const javafiler = () => readdirSync(KÄLLA).filter(f => f.endsWith(".java"))
  .map(f => ({ namn: f, src: readFileSync(join(KÄLLA, f), "utf8") }));

describe.skipIf(!finns)("Android-skalet", () => {
  it("innehåller inga anonyma inre klasser", () => {
    // BYGG.md: d8 i build-tools 34 kraschar på anonyma inre klasser i det här
    // projektet (NullPointerException i R8:s klassgraf). Därför är
    // AtlasWebViewClient och AtlasChromeClient namngivna klasser i egna filer,
    // och behörighetshanteringens lambda är en namngiven Runnable.
    //
    // Regeln är lätt att bryta i god tro — en anonym Runnable är det man skriver
    // av vana — och konsekvensen är att bygget dör med ett fel som inte pekar på
    // orsaken.
    const brott = [];
    for (const { namn, src } of javafiler()) {
      const kod = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
      // `new Något(...) {` — konstruktoranrop följt av en klasskropp.
      for (const m of kod.matchAll(/new\s+[A-Za-z_$][\w$.]*\s*\([^;{)]*\)\s*\{/g)) {
        brott.push(`${namn}: ${m[0].replace(/\s+/g, " ").slice(0, 60)}`);
      }
      // Lambdor dexas till samma sorts syntetiska klasser.
      for (const m of kod.matchAll(/\([^();]*\)\s*->/g)) {
        brott.push(`${namn}: lambda ${m[0].replace(/\s+/g, " ").slice(0, 40)}`);
      }
    }
    expect(brott, "d8 (build-tools 34) kraschar på dessa — se android-app/BYGG.md").toEqual([]);
  });

  it("begär mikrofonen i körtid, inte bara i manifestet", () => {
    // RECORD_AUDIO är en "dangerous permission" sedan Android 6, och bygget
    // länkar med --target-sdk-version 34 (BYGG.md). Manifestdeklarationen räcker
    // alltså inte: appen måste fråga användaren. WebViewens onPermissionRequest
    // kan bevilja SIDANS begäran men kan inte ge appen en rättighet appen saknar
    // — det var den troliga roten till mikrofonkraschen.
    const manifest = readFileSync(join(SKAL, "AndroidManifest.xml"), "utf8");
    expect(manifest).toMatch(/android\.permission\.RECORD_AUDIO/);

    const allt = javafiler().map(f => f.src).join("\n");
    expect(allt, "manifestet deklarerar RECORD_AUDIO men ingen kod begär den")
      .toMatch(/requestPermissions\s*\(/);
    expect(allt).toMatch(/checkSelfPermission\s*\(/);

    // Och WebView-sidan måste fortfarande bevilja sin egen begäran — utan den
    // hjälper körtidsbehörigheten inte heller.
    expect(allt).toMatch(/onPermissionRequest/);
  });

  it("byggdokumentationen anger fortfarande en target-sdk som kräver körtidsfrågan", () => {
    // Faller den under 23 ges behörigheten vid installation, och kontrollen
    // ovan blir meningslös snarare än fel. Då ska någon läsa om resonemanget.
    const bygg = readFileSync(join(SKAL, "BYGG.md"), "utf8");
    const m = bygg.match(/--target-sdk-version\s+(\d+)/);
    expect(m, "BYGG.md saknar --target-sdk-version").toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(23);
  });
});
