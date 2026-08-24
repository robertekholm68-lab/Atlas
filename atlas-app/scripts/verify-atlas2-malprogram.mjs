// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar att målresan STYR programvalet:
//   1. Utan mål ser väljaren ut som förut — inga förslag, ingen förändring.
//   2. Med ett coachplanerat mål lyfts matchande program fram MED SKÄL.
//   3. Planens dagar följs, och kan de inte följas sägs det.
//   4. Ett aktivt program som avviker från planen redovisas — som upplysning.
//
// OBS: hdr()/label() versaliserar via CSS — textkontroller skiftlägesokänsliga.

import { chromium } from "playwright-core";
import http from "http";
import { readFileSync, existsSync, readdirSync } from "fs";
import { byggMålFrånPlan } from "../src/engines/intervju.js";

function chromiumBin() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  for (const p of ["/opt/pw-browsers/chromium", "/usr/bin/chromium", "/usr/bin/chromium-browser"])
    if (existsSync(p)) return p;
  const bas = "/opt/pw-browsers";
  if (existsSync(bas)) for (const d of readdirSync(bas)) {
    const p = `${bas}/${d}/chrome-linux/chrome`;
    if (/^chromium/.test(d) && existsSync(p)) return p;
  }
  throw new Error("Hittar ingen Chromium — sätt PW_CHROMIUM till sökvägen.");
}

const html = readFileSync("dist-atlas2/atlas2.html", "utf8");
const srv = http.createServer((q, s) => { s.setHeader("Content-Type", "text/html"); s.end(html); });
await new Promise(r => srv.listen(8965, r));
const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const fel = [];
page.on("pageerror", e => fel.push("pageerror: " + e.message));
const klick = async t => {
  const ok = await page.evaluate(x => {
    const b = [...document.querySelectorAll("button")].find(k => (k.innerText || "").toLowerCase().includes(x.toLowerCase()));
    if (b) { b.click(); return true; } return false;
  }, t);
  if (!ok) throw new Error("saknar knapp: " + t);
};
const text = () => page.evaluate(() => document.body.innerText);
// FLIKBYTE MÅSTE MATCHA EXAKT. Delsträngsmatchning på "pass" träffar
// "Starta pass" på hemvyn — och startar då ett pass i stället för att byta
// flik, varpå Pass-fliken visar träningsvyn och programlistan inte finns.
const flik = async namn => {
  const ok = await page.evaluate(n => {
    const b = [...document.querySelectorAll("button")].find(k => (k.innerText || "").trim().toUpperCase() === n);
    if (b) { b.click(); return true; } return false;
  }, namn.toUpperCase());
  if (!ok) throw new Error("saknar flik: " + namn);
};
const öppnaProgram = async () => {
  await flik("Pass"); await page.waitForTimeout(400);
  // Byt-knappen bär data-byt (aktivt program); annars finns "Välj program".
  const bytt = await page.evaluate(() => {
    const d = document.querySelector('button[data-byt="1"]');
    if (d) { d.click(); return true; }
    const b = [...document.querySelectorAll("button")].find(k => /välj program/i.test(k.innerText || ""));
    if (b) { b.click(); return true; } return false;
  });
  if (!bytt) throw new Error("hittar ingen väg till programväljaren");
  await page.waitForTimeout(500);
};
const steg = [];

await page.goto("http://localhost:8965/"); await page.waitForTimeout(800);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Demo"); await page.waitForTimeout(900);

// ── 1. Utan mål: väljaren oförändrad ────────────────────────────────────────
await page.evaluate(() => localStorage.removeItem("atlas.v3.goal"));
await page.reload(); await page.waitForTimeout(900);
await öppnaProgram();
let t = await text();
steg.push(`${!/passar din målresa/i.test(t) ? "OK " : "FEL"} utan mål visas inga förslag`);
steg.push(`${/välj program|byt program/i.test(t) ? "OK " : "FEL"} vanliga väljaren finns kvar`);

// ── 2. Med ett coachplanerat fettmål på 3 pass/vecka ────────────────────────
const mål = byggMålFrånPlan({
  klar: true, namn: "Bröllop i juni", typ: "fatloss",
  målDatum: new Date(Date.now() + 112 * 864e5).toISOString().slice(0, 10),
  beskrivning: "Ner i vikt till bröllopet.",
  viktmål: { startKg: 96, målKg: 90 },
  passPerVecka: 3, cardioPerVecka: 2,
  dimensioner: { träning: "a", kost: "b", cardio: "c", vila: "d", sömn: "e" },
});
await page.evaluate(m => {
  localStorage.setItem("atlas.v3.goal", JSON.stringify(m));
  // Profilnivå så kriterierna blir kompletta.
  const p = JSON.parse(localStorage.getItem("atlas.v3.profile") || "{}");
  localStorage.setItem("atlas.v3.profile", JSON.stringify({ ...p, level: "intermediate" }));
}, mål);
await page.reload(); await page.waitForTimeout(900);
await öppnaProgram();
t = await text();
steg.push(`${/passar din målresa/i.test(t) ? "OK " : "FEL"} förslagssektionen visas med ett mål`);
steg.push(`${/precis som planen|pass i veckan/i.test(t) ? "OK " : "FEL"} skälen står utskrivna`);
steg.push(`${/3 pass i veckan/i.test(t) ? "OK " : "FEL"} planens dagar syns i skälet`);
// Hela listan ska stå kvar — ett mål gömmer aldrig alternativen.
steg.push(`${/full body|välj program|byt program/i.test(t) ? "OK " : "FEL"} hela programlistan står kvar under förslagen`);

// ── 3. Avvikande aktivt program redovisas ───────────────────────────────────
// Demoläget har ett aktivt program; matchar det inte planen ska det sägas.
const avvikelse = /skiljer sig från planen/i.test(t);
const passar = /ligger i linje|precis som planen/i.test(t);
steg.push(`${avvikelse || passar ? "OK " : "FEL"} förhållandet till planen redovisas (avvikelse eller match)`);

await browser.close(); srv.close();
console.log(steg.join("\n"));
if (fel.length) { console.log("\nSIDFEL:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
console.log("\nAlla steg OK.");
