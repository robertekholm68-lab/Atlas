// KRÄVER: `npm i --no-save playwright-core` + byggd `dist-atlas2/` (körs ej av test/bygge).
// Headless verifiering av röstknappen i pågående pass (kräver valt program).
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
await new Promise(r => srv.listen(8932, r));

const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage();
const fel = [];
page.on("pageerror", e => fel.push("pageerror: " + e.message));

const klickText = async (t) => {
  const ok = await page.evaluate((txt) => {
    const b = [...document.querySelectorAll("button")].find(x => (x.innerText || "").toLowerCase().includes(txt.toLowerCase()));
    if (b) { b.click(); return true; } return false;
  }, t);
  if (!ok) throw new Error("Hittade ingen knapp: " + t);
};
const finnsText = (t) => page.evaluate((txt) =>
  (document.body.innerText || "").toLowerCase().includes(txt.toLowerCase()), t);
const steg = [];
const kolla = async (namn, v) => steg.push(`${(await v) ? "OK " : "FEL"} ${namn}`);

await page.goto("http://localhost:8932/");
await page.waitForTimeout(700);
await klickText("Kom igång"); await page.waitForTimeout(300);
await klickText("Riktig profil"); await page.waitForTimeout(500);

// Välj program via hem-knappen
await klickText("Välj program"); await page.waitForTimeout(400);
await page.evaluate(() => {
  // Första programmallen i arket
  const b = [...document.querySelectorAll("button")].find(x => /pass\/vecka/i.test(x.innerText || ""));
  b.click();
});
await page.waitForTimeout(400);
await klickText("Tillbaka till hem"); await page.waitForTimeout(400);
await kolla("program aktivt: föreslaget pass syns", finnsText("Föreslaget:"));

await klickText("Starta"); await page.waitForTimeout(500);
await kolla("pass igång: pågående pass", finnsText("Pågående pass"));
await kolla("röstknapp i passet renderas", finnsText("Säg set"));

// Röst i osäker miljö: klick ska ge ÄRLIG not, inte krasch (ingen mic i headless)
await klickText("Säg set"); await page.waitForTimeout(1200);
await kolla("röstklick kraschar inte vyn", finnsText("Pågående pass"));

// VIKTRASTRET. Buggen som gav det här skyddet hittades med telefonen i handen
// på ett gym: displayen visade 61,3 och 61,8 — vikter som inte finns. Enhets-
// testerna täcker roundInc och formatWeight; det här täcker att det som
// faktiskt RENDERAS är en läggbar vikt, och att steglängden går att byta.
const läsVikt = () => page.evaluate(() => {
  const b = [...document.querySelectorAll("button")]
    .find(x => /^Vikt /.test(x.getAttribute("aria-label") || ""));
  return b ? { text: (b.innerText || "").trim(), etikett: b.getAttribute("aria-label") } : null;
});
// Första raden i knappen är talet, andra är "kg ±steg" (versaliserat via CSS).
const talet = v => ((v && v.text) || "").split("\n")[0].trim();
const påRastret = t => /^\d+(,(25|5|75))?$/.test(t);

const öka = () => page.evaluate(() => {
  const p = [...document.querySelectorAll("button")].find(x => x.getAttribute("aria-label") === "Öka");
  p && p.click();
});

const v0 = await läsVikt();
await kolla("vikten är en knapp med läsbar etikett", !!v0 && /steglängd/i.test(v0.etikett));
// Utan historik finns inget förslag — och då ska det stå streck, inte en
// påhittad nolla. (Ärlighetsregeln: hellre tomt än fejkat.)
await kolla("utan förslag står det streck, inte 0", talet(v0) === "—");
await kolla("steglängden syns vid enheten (±2,5 från start)", /±2,5/.test((v0 && v0.text) || ""));
await öka(); await page.waitForTimeout(120);
await kolla(`första klivet ger en läggbar vikt (${talet(await läsVikt())})`, påRastret(talet(await läsVikt())));

// Tryck på siffran → nästa steglängd. Tre tryck ska vara ett varv.
const bytSteg = () => page.evaluate(() => {
  const b = [...document.querySelectorAll("button")]
    .find(x => /^Vikt /.test(x.getAttribute("aria-label") || ""));
  b && b.click();
});
await bytSteg(); await page.waitForTimeout(120);
await kolla("tryck på siffran ger 1,25", /±1,25/.test(((await läsVikt()) || {}).text || ""));
await bytSteg(); await page.waitForTimeout(120);
await kolla("nästa tryck ger 0,25 — finjustering finns", /±0,25/.test(((await läsVikt()) || {}).text || ""));

// Ett kliv om 0,25 ska ge exakt 0,25 mer, inte en avrundad decimalsoppa.
const före = talet(await läsVikt());
await öka(); await page.waitForTimeout(120);
const efter = talet(await läsVikt());
const tal = t => parseFloat(t.replace(",", "."));
await kolla(`0,25-klivet landar rätt (${före} → ${efter})`,
  påRastret(efter) && Math.abs(tal(efter) - tal(före) - 0.25) < 1e-9);

await bytSteg(); await page.waitForTimeout(120);
await kolla("varvet är slutet — tillbaka på 2,5", /±2,5/.test(((await läsVikt()) || {}).text || ""));

// Stega vikt + logga ett set som vanligt (rösten är aldrig enda vägen)
await page.evaluate(() => {
  const plus = [...document.querySelectorAll("button")].filter(x => x.getAttribute("aria-label") === "Öka");
  for (let i = 0; i < 4; i++) plus[0] && plus[0].click();
});
await page.waitForTimeout(200);
const kunde = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => (x.innerText || "").toLowerCase().includes("avsluta set"));
  if (b && !b.disabled) { b.click(); return true; } return false;
});
steg.push(`${kunde ? "OK " : "FEL"} set loggat med knapp (vila startade)`);
await page.waitForTimeout(300);
await kolla("vilotimern visas efter set", finnsText("VILA"));

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
