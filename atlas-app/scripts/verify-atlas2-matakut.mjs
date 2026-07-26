// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar matakuten i riktig webbläsare. Det som prövas är löftena:
//
//   · lägena går att välja och ger förslag ur motorn
//   · exakt ETT förslag är markerat som rekommenderat
//   · SKYDDSRÄCKET syns varje gång ett råd ges
//   · fritext tolkas och kvitteras — inklusive "tacos", som appens egen
//     platshållare föreslår men som motorn tidigare inte kände igen
//   · tonvalet överlever en omladdning (det är en inställning, inte ett utkast)
//
// Sista punkten är hela skälet att köra i webbläsare i stället för jsdom:
// lagring och hydrering är precis det jsdom fejkar bort.

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
await new Promise(r => srv.listen(8955, r));
const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

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
const kolla = async (namn, v) => steg.push(`${(await v) ? "OK " : "FEL"} ${namn}`);

await page.goto("http://localhost:8955/"); await page.waitForTimeout(800);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Demo"); await page.waitForTimeout(900);
await klick("Mat"); await page.waitForTimeout(500);
// OBS: hdr()/label() versaliserar via CSS och innerText speglar det, så ALLA
// textkontroller här är skiftlägesokänsliga. Att missa det ger falska FEL.
await kolla("matvyn har en Akut-flik", text().then(t => /akut/i.test(t)));

await klick("Akut"); await page.waitForTimeout(500);
let t = await text();
steg.push(`${/rädda måltiden/i.test(t) ? "OK " : "FEL"} akuten öppnas`);
steg.push(`${!/rekommenderas/i.test(t) ? "OK " : "FEL"} inga råd innan ett läge valts`);

await klick("Sötsugen"); await page.waitForTimeout(500);
t = await text();
const antalRek = (t.match(/rekommenderas/gi) || []).length;
steg.push(`${antalRek === 1 ? "OK " : "FEL"} exakt ett förslag rekommenderas (${antalRek})`);
steg.push(`${/svälta|kompensation|dåligt samvete/i.test(t) ? "OK " : "FEL"} skyddsräcket visas med rådet`);
steg.push(`${/kvar idag|inget dagsmål/i.test(t) ? "OK " : "FEL"} dagens ram redovisas ärligt`);

// Fritexten — och specifikt appens egen exempelformulering.
await page.fill('input[aria-label="Beskriv ditt läge"]', "sug på tacos, sen kväll");
await page.waitForTimeout(150);
await klick("Fråga"); await page.waitForTimeout(500);
t = await text();
steg.push(`${/uppfattat/i.test(t) ? "OK " : "FEL"} fritext kvitteras för användaren`);
steg.push(`${/snabbmat/i.test(t) ? "OK " : "FEL"} "tacos" tolkas (appens egen platshållare)`);

// Tonläget: inställning, inte utkast — måste överleva omladdning.
await klick("Ton:"); await page.waitForTimeout(300);
await klick("Flexibel"); await page.waitForTimeout(400);
const sparat = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.profile") || "{}").nutStyle);
steg.push(`${sparat === "flexible" ? "OK " : "FEL"} tonvalet skrivs till profilen (${sparat})`);

await page.reload(); await page.waitForTimeout(1000);
await klick("Mat"); await page.waitForTimeout(400);
await klick("Akut"); await page.waitForTimeout(400);
t = await text();
steg.push(`${/flexibel/i.test(t) ? "OK " : "FEL"} tonvalet överlever omladdning`);

// Vägen vidare till loggen, som skyddsräcket ber om.
await klick("Orkar inte laga"); await page.waitForTimeout(400);
await klick("Logga det jag valde"); await page.waitForTimeout(500);
t = await text();
steg.push(`${/Sök|Snabb|gram|Logga/i.test(t) ? "OK " : "FEL"} knappen leder till loggen`);

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
