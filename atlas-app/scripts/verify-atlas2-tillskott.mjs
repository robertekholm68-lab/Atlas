// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar dagliga tillskott i riktig webbläsare. Kärnan är att bocken
// ÖVERLEVER en omladdning — en följsamhetsräkning som nollas när appen stängs
// är värdelös, och det är precis vad jsdom inte kan pröva.
//
// OBS: hdr()/label() versaliserar via CSS — alla textkontroller är /i.

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
await new Promise(r => srv.listen(8963, r));
const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage({ viewport: { width: 375, height: 667 } });

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

await page.goto("http://localhost:8963/"); await page.waitForTimeout(800);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Demo"); await page.waitForTimeout(900);
await klick("Mat"); await page.waitForTimeout(500);

steg.push(`${/tillskott/i.test(await text()) ? "OK " : "FEL"} matvyn har en Tillskott-flik`);
await klick("Tillskott"); await page.waitForTimeout(500);
let t = await text();
steg.push(`${/lägg till det du faktiskt tar/i.test(t) ? "OK " : "FEL"} tomt läge bjuder in`);
steg.push(`${/inte när på dagen/i.test(t) ? "OK " : "FEL"} säger att klockslaget inte spelar roll`);

await klick("Välj tillskott"); await page.waitForTimeout(400);
t = await text();
steg.push(`${/evidens/i.test(t) ? "OK " : "FEL"} väljaren redovisar evidensnivå`);

// Välj kreatin och gå tillbaka.
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => /kreatin/i.test(x.innerText || ""));
  if (b) b.click();
});
await page.waitForTimeout(400);
await klick("Klar"); await page.waitForTimeout(400);
t = await text();
steg.push(`${/1 kvar idag/i.test(t) ? "OK " : "FEL"} visar hur många som är kvar`);

// Bocka av.
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => /kreatin/i.test(x.getAttribute("aria-label") || ""));
  if (b) b.click();
});
await page.waitForTimeout(500);
t = await text();
steg.push(`${/allt taget idag/i.test(t) ? "OK " : "FEL"} bocken registreras`);

const sparat = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.supplementLog") || "[]").length);
steg.push(`${sparat === 1 ? "OK " : "FEL"} bocken skrivs till lagringen (${sparat} post)`);

// Det avgörande: överlever den en omladdning?
await page.reload(); await page.waitForTimeout(1100);
await klick("Mat"); await page.waitForTimeout(400);
await klick("Tillskott"); await page.waitForTimeout(500);
t = await text();
steg.push(`${/allt taget idag/i.test(t) ? "OK " : "FEL"} bocken överlever omladdning`);
steg.push(`${/kreatin/i.test(t) ? "OK " : "FEL"} valet av tillskott överlever omladdning`);

// Ingen belöningsmekanik, oavsett hur många dagar i rad.
await page.evaluate(() => {
  const DAG = 864e5, d0 = new Date(); d0.setHours(12, 0, 0, 0);
  const logg = [0, 1, 2, 3, 4].map(i => ({ id: "creatine", ts: d0.getTime() - i * DAG }));
  localStorage.setItem("atlas.v3.supplementLog", JSON.stringify(logg));
});
await page.reload(); await page.waitForTimeout(1100);
await klick("Mat"); await page.waitForTimeout(400);
await klick("Tillskott"); await page.waitForTimeout(500);
t = await text();
steg.push(`${/5 dgr i rad/i.test(t) ? "OK " : "FEL"} följsamheten visas som information`);
steg.push(`${!/xp|poäng|nivå|grattis|bragd/i.test(t) ? "OK " : "FEL"} ingen belöningsmekanik`);

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
