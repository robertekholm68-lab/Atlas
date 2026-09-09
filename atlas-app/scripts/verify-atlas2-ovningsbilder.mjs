// Headless verifiering av övningsbilderna.
//
// VARFÖR ETT EGET SKRIPT. Bilderna ligger i public/ovningar/ utanför bundeln,
// så ett grönt bygge säger ingenting om att de faktiskt laddas: img-taggen kan
// renderas med naturalWidth 0 utan ett enda fel i konsolen. Det hände en gång
// (bilder i src/assets/, se exerciseImages.js). Det enda som avslöjar det är
// att mäta naturalWidth i en riktig webbläsare mot en http-server som serverar
// både HTML:en och bildmappen — precis som GitHub Pages gör.
//
// Två delar:
//   1. Varje id i MED_BILD laddas och har naturalWidth > 0.
//   2. Navigeringen Pass → Muskelgrupper → grupp → övning visar bild OCH fyra
//      teknikpunkter för de id:n som anges på kommandoraden (senast tillagda).
//
// Kräver: npm i --no-save playwright-core + byggd dist-atlas2. Körs från atlas-app/.
//   node scripts/verify-atlas2-ovningsbilder.mjs Shoulders db_front_raise bb_front_raise
import { chromium } from "playwright-core";
import http from "http";
import { readFileSync, existsSync, readdirSync } from "fs";
import { MED_BILD } from "../src/data/exerciseImages.js";
import { EXERCISES, TEKNIK_CUES } from "../src/data/exercises.js";

function chromiumBin() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const raka = ["/opt/pw-browsers/chromium", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  for (const p of raka) if (existsSync(p)) return p;
  const bas = "/opt/pw-browsers";
  if (existsSync(bas)) {
    for (const d of readdirSync(bas)) {
      const p = `${bas}/${d}/chrome-linux/chrome`;
      if (/^chromium/.test(d) && existsSync(p)) return p;
    }
  }
  throw new Error("Hittar ingen Chromium — sätt PW_CHROMIUM till sökvägen.");
}

const [grupp = "Shoulders", ...senaste] = process.argv.slice(2);
const html = readFileSync("dist-atlas2/atlas2.html", "utf8");
const srv = http.createServer((q, s) => {
  const m = /^\/ovningar\/([a-z0-9_]+\.webp)$/.exec(q.url.split("?")[0]);
  if (m && existsSync(`public/ovningar/${m[1]}`)) { s.setHeader("Content-Type", "image/webp"); return s.end(readFileSync(`public/ovningar/${m[1]}`)); }
  if (m) { s.statusCode = 404; return s.end(); }
  s.setHeader("Content-Type", "text/html"); s.end(html);
});
await new Promise(r => srv.listen(8937, r));
const b = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
const fel = []; page.on("pageerror", e => fel.push(e.message));
const steg = []; const kolla = (n, v) => steg.push(`${v ? "OK " : "FEL"} ${n}`);

// Del 1: alla registrerade bilder laddas.
await page.goto("http://localhost:8937/"); await page.waitForTimeout(500);
const mått = await page.evaluate(ids => Promise.all(ids.map(id => new Promise(r => {
  const i = new Image(); i.onload = () => r([id, i.naturalWidth, i.naturalHeight]); i.onerror = () => r([id, 0, 0]);
  i.src = `/ovningar/${id}.webp`;
}))), MED_BILD);
for (const [id, w, h] of mått) kolla(`${id} laddas (${w}×${h})`, w > 0);

// Del 2: som en användare, till övningssidan.
// Flikbyten kräver EXAKT matchning — "pass" träffar annars "Starta pass" och
// startar ett pass i stället för att byta flik. Onboardingknapparna får
// delmatchning som i de andra skripten.
const klick = async (t, exakt = true) => { const ok = await page.evaluate(([x, ex]) => { const k = [...document.querySelectorAll("button")].find(b => { const s = (b.innerText || "").trim().toUpperCase(); return ex ? s === x.toUpperCase() : s.includes(x.toUpperCase()); }); if (k) { k.click(); return true; } return false; }, [t, exakt]); if (!ok) throw new Error("saknar knapp: " + t); };
await page.waitForTimeout(400);
await klick("Kom igång", false); await page.waitForTimeout(300);
await klick("Riktig profil", false); await page.waitForTimeout(500);
await klick("Pass"); await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('[data-ikon="muskelgrupper"]').click()); await page.waitForTimeout(400);
kolla("muskelgruppsvyn öppen", await page.evaluate(() => !!document.querySelector('[data-grupp="alla"]')));
await page.evaluate(g => document.querySelector(`[data-grupp="${g}"]`).click(), grupp); await page.waitForTimeout(400);
for (const id of senaste) {
  const e = EXERCISES.find(x => x.id === id);
  const ok = await page.evaluate(n => { const k = [...document.querySelectorAll("button, [role=button]")].find(b => (b.innerText || "").trim().toUpperCase().startsWith(n.toUpperCase())); if (k) { k.click(); return true; } return false; }, e.name);
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    // Två img på sidan: 44 px-miniatyren i rubriken och den stora med
    // teknikpunkterna. Bara den stora har alt-text.
    const img = [...document.querySelectorAll("img")].find(i => /ovningar\//.test(i.src) && /utförande/i.test(i.alt));
    // Med bild ligger punkterna som <ol><li> över bildens mörka fält;
    // utan bild i ett eget kort med rubriken Utförande. Räkna li:n i den
    // ol som ligger i samma behållare som bilden.
    const ol = img ? img.parentElement.querySelector("ol") : null;
    return { bild: img ? img.naturalWidth : 0, punkter: ol ? ol.querySelectorAll("li").length : 0 };
  });
  kolla(`${id}: sidan öppnad`, ok);
  kolla(`${id}: bild laddad i vyn (${m.bild} px)`, m.bild > 0);
  kolla(`${id}: fyra teknikpunkter över bilden (${m.punkter} i DOM, ${(TEKNIK_CUES[id] || []).length} i data)`, m.punkter === 4);
  await klick("Stäng"); await page.waitForTimeout(300);
}

await b.close(); srv.close();
for (const s of steg) console.log("  " + s);
if (fel.length) console.log("  SIDFEL:", fel.join(" | "));
const n = steg.filter(s => s.startsWith("OK")).length;
console.log(`  ${n}/${steg.length} steg OK`);
process.exit(n === steg.length && !fel.length ? 0 : 1);
