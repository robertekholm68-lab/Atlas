// KRÄVER: `npm i --no-save playwright-core` + byggd `dist-atlas2/` (körs ej av test/bygge).
// Headless DOM-verifiering av Askr 2.0-bygget: mål-form, snabblogg, röstknapp.
// Körs mot dist-atlas2 över http (file:// gör localStorage opålitligt).
import { chromium } from "playwright-core";
import http from "http";
import { readFileSync, existsSync, readdirSync } from "fs";

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


const html = readFileSync("dist-atlas2/atlas2.html", "utf8");
const srv = http.createServer((req, res) => { res.setHeader("Content-Type", "text/html"); res.end(html); });
await new Promise(r => srv.listen(8931, r));

const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage();
const fel = [];
page.on("pageerror", e => fel.push("pageerror: " + e.message));

// OBS: hdr() versaliserar via CSS — matcha alltid skiftlägesokänsligt.
const klickText = async (t) => {
  const ok = await page.evaluate((txt) => {
    const alla = [...document.querySelectorAll("button")];
    const b = alla.find(x => (x.innerText || "").toLowerCase().includes(txt.toLowerCase()));
    if (b) { b.click(); return true; }
    return false;
  }, t);
  if (!ok) throw new Error("Hittade ingen knapp: " + t);
};
const finnsText = (t) => page.evaluate((txt) =>
  (document.body.innerText || "").toLowerCase().includes(txt.toLowerCase()), t);

const steg = [];
const kolla = async (namn, v) => steg.push(`${(await v) ? "OK " : "FEL"} ${namn}`);

await page.goto("http://localhost:8931/");
await page.waitForTimeout(700);

// Startsida → riktig profil
await klickText("Kom igång");
await page.waitForTimeout(300);
await klickText("Riktig profil");
await page.waitForTimeout(500);
await kolla("hem: tomt-tillstånd utan påhittad readiness", finnsText("Ingen historik än"));

// Mat-fliken
await klickText("Mat");
await page.waitForTimeout(400);
await kolla("mat: ärligt mål-tomtillstånd", finnsText("Inget kalorimål satt"));

// Sätt mål via NutritionSheet (arket "kost")
await klickText("Sätt ett mål");
await page.waitForTimeout(400);
await kolla("målark: ärlig skattningsspärr utan kroppsvikt", finnsText("Logga en kroppsvikt först"));
await page.evaluate(() => {
  const byLabel = t => [...document.querySelectorAll("input")].find(i => (i.getAttribute("aria-label") || "").startsWith(t));
  const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; s.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
  set(byLabel("Kalorier"), "2400"); set(byLabel("Protein"), "150");
});
await klickText("Spara mål");
await page.waitForTimeout(400);
await kolla("mål sparat: 2400 kcal syns i ringen", finnsText("/ 2400 KCAL"));
await kolla("mål sparat: ändra-länk finns", finnsText("Ändra mål"));

// Snabblogg: beskriv en måltid i text (rösten fyller samma fält)
await klickText("Logga måltid");
await page.waitForTimeout(300);
await kolla("snabblogg: fältet finns", finnsText("Beskriv eller säg vad du åt"));
await kolla("snabblogg: mikrofonknapp renderas", page.evaluate(() =>
  [...document.querySelectorAll("button")].some(b => (b.getAttribute("aria-label") || "").includes("Säg måltiden"))));
await page.evaluate(() => {
  const inp = [...document.querySelectorAll("input")].find(i => (i.placeholder || "").includes("kyckling"));
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  s.call(inp, "kyckling med ris och broccoli"); inp.dispatchEvent(new Event("input", { bubbles: true }));
});
await klickText("Uppskatta måltiden");
await page.waitForTimeout(300);
await kolla("snabblogg: uppskattning med intervall visas", finnsText("troligen"));
await klickText("Lägg till — uppskattat");
await page.waitForTimeout(400);
await kolla("snabblogg: posten ligger i dagens måltider som uppskattad", finnsText("uppskattat"));
await kolla("snabblogg: kcal räknas i översikten", page.evaluate(() =>
  !/^0$/.test((document.querySelector("svg text") || {}).textContent || "0")));

// Vag beskrivning → följdfråga
await klickText("Logga måltid");
await page.waitForTimeout(300);
await page.evaluate(() => {
  const inp = [...document.querySelectorAll("input")].find(i => (i.placeholder || "").includes("kyckling"));
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  s.call(inp, "lunch"); inp.dispatchEvent(new Event("input", { bubbles: true }));
});
await klickText("Uppskatta måltiden");
await page.waitForTimeout(300);
await kolla("snabblogg: vag beskrivning ger följdfråga", finnsText("hur stor måltid"));

// Coachen: kostfråga ska nu få underlagssvar (inte "kan inte svara")
await klickText("Coach");
await page.waitForTimeout(500);
const chip = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => (x.innerText || "").includes("protein"));
  if (b) { b.click(); return true; } return false;
});
await page.waitForTimeout(500);
if (chip) await kolla("coach: proteinsvar utan 'saknar matlogg'-blockering", page.evaluate(() =>
  !(document.body.innerText || "").toLowerCase().includes("kan inte svara på kostfrågor")));

// Passfliken: röstknappen kräver ett pågående pass med program — verifiera
// bara att fliken renderar utan fel.
await klickText("Pass");
await page.waitForTimeout(400);
await kolla("träna: vyn renderar", finnsText("pågående pass"));

// Persistens: ladda om — mål och matlogg ska ligga kvar i atlas.v3.*
await page.reload(); await page.waitForTimeout(700);
await klickText("Mat");
await page.waitForTimeout(400);
await kolla("persistens: mål kvar efter omladdning", finnsText("/ 2400 KCAL"));
await kolla("persistens: måltiden kvar efter omladdning", finnsText("kyckling med ris"));

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
