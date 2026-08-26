// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar profilvyn ("Om dig"):
//   1. Luckorna redovisas ÄRLIGT — vad som saknas och vad det blockerar.
//   2. Fälten går att sätta och överlever en omladdning.
//   3. Luckkortet försvinner när allt obligatoriskt är ifyllt.
//   4. Vikten går INTE att redigera här — den är loggad data.
//
// OBS: hdr()/label() versaliserar via CSS — textkontroller skiftlägesokänsliga.
// OBS: Meny-knappen är en ikonknapp med aria-label, bara på Hem i mobilläget.

import { chromium } from "playwright-core";
import http from "http";
import { readFileSync, existsSync, readdirSync } from "fs";

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
await new Promise(r => srv.listen(8967, r));
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
const öppnaMeny = async () => {
  await page.evaluate(() => document.querySelector('button[aria-label="Meny"]').click());
  await page.waitForTimeout(350);
};
const text = () => page.evaluate(() => document.body.innerText);
const steg = [];

await page.goto("http://localhost:8967/"); await page.waitForTimeout(800);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Demo"); await page.waitForTimeout(900);

// ── 1. Luckkortet i menyn ───────────────────────────────────────────────────
await öppnaMeny();
let t = await text();
steg.push(`${/om dig/i.test(t) ? "OK " : "FEL"} profilen nås ur menyn`);
steg.push(`${/jag saknar/i.test(t) ? "OK " : "FEL"} luckkortet säger vad som saknas`);

// ── 2. Vyn redovisar följden av luckorna ────────────────────────────────────
await klick("Om dig"); await page.waitForTimeout(450);
t = await text();
steg.push(`${/detta räknar jag inte ut/i.test(t) ? "OK " : "FEL"} luckorna redovisas med sin följd`);
steg.push(`${/kroppsfett/i.test(t) ? "OK " : "FEL"} blockerad funktion namnges`);
steg.push(`${/järn/i.test(t) ? "OK " : "FEL"} könets faktiska betydelse förklaras`);
steg.push(`${/vikten kommer ur dina vägningar/i.test(t) ? "OK " : "FEL"} vikten är loggad data, inte en inställning`);
// Vikten får INTE ha ett redigerbart fält här.
const viktInput = await page.evaluate(() =>
  [...document.querySelectorAll("input")].filter(i => i.type === "number").length);
steg.push(`${viktInput === 2 ? "OK " : "FEL"} exakt två talfält (ålder, längd) — vikten är inte redigerbar (fann ${viktInput})`);

// ── 3. Fyll i och spara ─────────────────────────────────────────────────────
await klick("Kvinna"); await page.waitForTimeout(150);
await page.evaluate(() => {
  const s = [...document.querySelectorAll("input")].filter(i => i.type === "number");
  const sätt = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  sätt(s[0], 34); sätt(s[1], 168);
});
await page.waitForTimeout(200);
await klick("Van"); await page.waitForTimeout(150);
await klick("Vegetarian"); await page.waitForTimeout(150);
t = await text();
steg.push(`${!/detta räknar jag inte ut/i.test(t) ? "OK " : "FEL"} luckrapporten försvinner när allt är ifyllt`);
await klick("Spara"); await page.waitForTimeout(500);

// ── 4. Överlever omladdning, och normaliseringen har satt gender ────────────
await page.reload(); await page.waitForTimeout(900);
const sparad = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.profile") || "{}"));
steg.push(`${sparad.sex === "f" ? "OK " : "FEL"} könet sparat (${sparad.sex})`);
steg.push(`${sparad.age === 34 ? "OK " : "FEL"} åldern sparad (${sparad.age})`);
steg.push(`${sparad.height === 168 ? "OK " : "FEL"} längden sparad (${sparad.height})`);
steg.push(`${sparad.level === "intermediate" ? "OK " : "FEL"} träningsvanan sparad (${sparad.level})`);
steg.push(`${sparad.diet === "vegetarian" ? "OK " : "FEL"} kosthållningen sparad (${sparad.diet})`);

await öppnaMeny();
t = await text();
steg.push(`${!/jag saknar/i.test(t) ? "OK " : "FEL"} luckkortet borta ur menyn när profilen är hel`);

await browser.close(); srv.close();
console.log(steg.join("\n"));
if (fel.length) { console.log("\nSIDFEL:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
console.log("\nAlla steg OK.");
