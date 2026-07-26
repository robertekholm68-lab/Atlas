// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar att readiness går att fråga varför — och att grinden håller.
//
// Kärnan: med för få loggade matdagar ska kosten INTE räknas in, och appen ska
// säga att den inte gör det. Att tyst utelämna en faktor och ändå visa samma
// tal vore att ljuga med utelämnande. Testet matar in matlogg direkt i
// lagringen och laddar om, vilket är precis det jsdom fejkar bort.
//
// OBS: hdr()/label() versaliserar via CSS och innerText speglar det — alla
// textkontroller här är skiftlägesokänsliga.

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
await new Promise(r => srv.listen(8957, r));
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
const steg = [];

await page.goto("http://localhost:8957/"); await page.waitForTimeout(800);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Demo"); await page.waitForTimeout(900);

let t = await text();
steg.push(`${/varför/i.test(t) ? "OK " : "FEL"} readiness-talet erbjuder "varför"`);

await klick("Varför"); await page.waitForTimeout(500);
t = await text();
steg.push(`${/din readiness/i.test(t) ? "OK " : "FEL"} arket öppnas`);
steg.push(`${/träningsåterhämtning/i.test(t) ? "OK " : "FEL"} basen redovisas`);
steg.push(`${/så räknas det/i.test(t) ? "OK " : "FEL"} uppdelningen visas`);
steg.push(`${/vägledning, inte en diagnos/i.test(t) ? "OK " : "FEL"} readiness ramas in ärligt`);

// Utan matlogg: kosten ska stå som INTE inräknad.
steg.push(`${/räknas\s*inte\s*in/i.test(t) ? "OK " : "FEL"} kosten redovisas som utelämnad utan underlag`);

// Mata in fyra dagar med lågt protein och ladda om.
await page.evaluate(() => {
  const DAG = 864e5, nu = Date.now();
  const logg = [0, 1, 2, 3].map(i => ({ id: "f" + i, name: "mat", ts: nu - i * DAG, kcal: 1900, protein: 55 }));
  localStorage.setItem("atlas.v3.foodLog", JSON.stringify(logg));
  localStorage.setItem("atlas.v3.nutritionTargets", JSON.stringify({ kcal: 2400, protein: 180 }));
});
await page.reload(); await page.waitForTimeout(1100);
await klick("Varför"); await page.waitForTimeout(600);
t = await text();
steg.push(`${/räknas in/i.test(t) && !/räknas\s*inte\s*in/i.test(t) ? "OK " : "FEL"} kosten räknas in med fyra loggade dagar`);
steg.push(`${/protein/i.test(t) ? "OK " : "FEL"} protein-avdraget namnges`);
steg.push(`${/-\d/.test(t) ? "OK " : "FEL"} avdraget visas med tecken`);

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
