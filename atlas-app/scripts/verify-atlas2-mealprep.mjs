// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar meal prep i riktig webbläsare. Tyngdpunkten ligger på det som INTE
// får gå fel: att ett kostval slår igenom i både veckomenyn och receptlistan,
// och att det överlever en omladdning. En veckomeny är ett löfte om sju dagars
// mat — bryter den mot en angiven allergi är det inte ett skönhetsfel.
//
// OBS: hdr()/label() versaliserar via CSS och innerText speglar det, så ALLA
// textkontroller här är skiftlägesokänsliga. (Dokumenterad fallgrop.)

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
await new Promise(r => srv.listen(8956, r));
const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const fel = [];
page.on("pageerror", e => fel.push("pageerror: " + e.message));
page.on("console", m => {
  const t = m.text();
  if (m.type() === "error" && !/ERR_CONNECTION_RESET|unsupported MIME|Failed to load resource/.test(t))
    fel.push("console: " + t.slice(0, 160));
});
const klick = async t => {
  const ok = await page.evaluate(x => {
    const b = [...document.querySelectorAll("button")].find(k => (k.innerText || "").toLowerCase().includes(x.toLowerCase()));
    if (b) { b.click(); return true; } return false;
  }, t);
  if (!ok) throw new Error("saknar knapp: " + t);
};
const text = () => page.evaluate(() => document.body.innerText);
const steg = [];

await page.goto("http://localhost:8956/"); await page.waitForTimeout(800);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Demo"); await page.waitForTimeout(900);
await klick("Mat"); await page.waitForTimeout(500);
await klick("Recept"); await page.waitForTimeout(500);

let t = await text();
steg.push(`${/veckomeny/i.test(t) ? "OK " : "FEL"} receptfliken erbjuder veckomeny`);

await klick("Veckomeny"); await page.waitForTimeout(700);
t = await text();
steg.push(`${/måndag/i.test(t) && /söndag/i.test(t) ? "OK " : "FEL"} sju dagar visas`);
steg.push(`${/recept passar din kost/i.test(t) ? "OK " : "FEL"} underlaget redovisas`);
const förstaVeckan = t.slice(0, 1200);

await klick("Ny vecka"); await page.waitForTimeout(600);
steg.push(`${(await text()).slice(0, 1200) !== förstaVeckan ? "OK " : "FEL"} ny vecka ger en annan meny`);

await klick("Inköpslista"); await page.waitForTimeout(500);
t = await text();
steg.push(`${/\d+\s*g\b/.test(t) ? "OK " : "FEL"} inköpslistan har mängder`);
steg.push(`${/runda upp/i.test(t) ? "OK " : "FEL"} mängderna förklaras (råvara, ej förpackning)`);

// Kostvalet: slår det igenom, och överlever det en omladdning?
await klick("Ändra kost"); await page.waitForTimeout(400);
await klick("Vegan"); await page.waitForTimeout(800);
const sparad = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.profile") || "{}").diet);
steg.push(`${sparad === "vegan" ? "OK " : "FEL"} kostvalet skrivs till profilen (${sparad})`);

await page.reload(); await page.waitForTimeout(1100);
await klick("Mat"); await page.waitForTimeout(400);
await klick("Recept"); await page.waitForTimeout(400);
await klick("Veckomeny"); await page.waitForTimeout(700);
t = await text();
steg.push(`${/vegan/i.test(t) ? "OK " : "FEL"} kostvalet överlever omladdning`);

// Allergi: utbudet ska KRYMPA och varningen ska stå där.
const antalFöre = (await text()).match(/(\d+) recept passar/i);
await klick("Ändra kost"); await page.waitForTimeout(400);
await klick("Nötallergi"); await page.waitForTimeout(800);
t = await text();
const antalEfter = t.match(/(\d+) recept passar/i);
const krympte = antalFöre && antalEfter && Number(antalEfter[1]) < Number(antalFöre[1]);
steg.push(`${krympte ? "OK " : "FEL"} allergi krymper utbudet (${antalFöre && antalFöre[1]} → ${antalEfter && antalEfter[1]})`);
steg.push(`${/kan inte lova att de är fria/i.test(t) ? "OK " : "FEL"} varför utbudet krymper förklaras`);

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
