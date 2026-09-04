// KRÄVER: `npm i --no-save playwright-core` + byggd `dist-atlas2/` (körs ej av test/bygge).
//
// Verifierar HELA kedjan i en riktig webbläsare, inte i jsdom:
//   1. varför-frågan dyker upp efter ett pass som avviker mot historiken
//   2. svaret hamnar PÅ passet i lagringen (atlas.v3.sessions)
//   3. ett loggat pass går att öppna och rätta — och rättningen räknas om
//   4. radering kräver bekräftelse och tar bort passet på riktigt
//
// Varför en riktig webbläsare: lagring, hydrering och omladdning är precis det
// jsdom fejkar bort. Ett pass som ser rätt ut i minnet men inte överlever en
// reload är fortfarande en bugg.
import { chromium } from "playwright-core";
import http from "http";
import { readFileSync, existsSync, readdirSync } from "fs";

// Chromium ligger inte på samma sökväg i alla containrar: ibland
// /opt/pw-browsers/chromium, ibland /opt/pw-browsers/chromium-<rev>/chrome-linux/chrome.
// De äldre verify-skripten hårdkodar den första och dör i en container som har
// den andra — därför letas den upp här i stället.
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
await new Promise(r => srv.listen(8935, r));

const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage();
const fel = [];
page.on("pageerror", e => fel.push("pageerror: " + e.message));
page.on("console", m => {
  const t = m.text();
  if (m.type() === "error" && !/ERR_CONNECTION_RESET|unsupported MIME|Failed to load resource/.test(t)) fel.push("console: " + t.slice(0, 200));
});

const klick = async (t) => {
  const ok = await page.evaluate((txt) => {
    const b = [...document.querySelectorAll("button")].find(x => (x.innerText || "").toLowerCase().includes(txt.toLowerCase()));
    if (b) { b.click(); return true; } return false;
  }, t);
  if (!ok) throw new Error("Hittade ingen knapp: " + t);
};
const finns = (t) => page.evaluate((txt) => (document.body.innerText || "").toLowerCase().includes(txt.toLowerCase()), t);
const pass = () => page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.sessions") || "[]"));
const steg = [];
const kolla = async (namn, v) => steg.push(`${(await v) ? "OK " : "FEL"} ${namn}`);

// Vikt- och repsstegen skrivs till React-tillstånd. Klickar man 20 gånger i
// SAMMA evaluate hinner tillståndet aldrig uppdateras emellan — alla klick
// räknar från samma gamla värde och stegen försvinner. Därför ett klick i taget.
const stega = async (riktning, n) => {
  for (let i = 0; i < n; i++) {
    await page.evaluate((r) => {
      const b = [...document.querySelectorAll("button")].find(x => x.getAttribute("aria-label") === r);
      if (b) b.click();
    }, riktning);
    await page.waitForTimeout(45);
  }
  await page.waitForTimeout(200);
};
const knappaUpp = n => stega("Öka", n);
const knappaNer = n => stega("Minska", n);

// ── Onboarding → riktigt läge, program valt ──────────────────────────────────
await page.goto("http://localhost:8935/");
await page.waitForTimeout(700);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Riktig profil"); await page.waitForTimeout(500);
await klick("Välj program"); await page.waitForTimeout(400);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => /pass\/vecka/i.test(x.innerText || ""));
  b.click();
});
await page.waitForTimeout(400);
await klick("Tillbaka till hem"); await page.waitForTimeout(400);

// ── Pass 1: bygg historik ────────────────────────────────────────────────────
await klick("Starta"); await page.waitForTimeout(500);
// Utan historik finns inget viktförslag — och ett set utan vikt SKA vara spärrat
// (annars räknas passet som noll last). Alltså måste vikten knappas in.
await knappaUpp(20);
await klick("Avsluta set"); await page.waitForTimeout(400);
await klick("Avsluta i förtid"); await page.waitForTimeout(500);
await kolla("kvitto efter passet visas", finns("Passet är loggat"));
await kolla("sammanfattningen (post-session-motorn) renderas", finns("Sammanfattning"));

// Gör om det loggade passet till HISTORIK: samma övningar, dubbla vikter, en
// vecka tillbaka. Då blir nästa pass en verklig sänkning — och först då ska
// frågan ställas. Passet självt tas bort så programmet börjar om på pass 1.
const ettPass = (await pass())[0];
if (!ettPass) { console.log("FEL inget pass sparades"); process.exit(1); }
await page.evaluate((p) => {
  const gammalt = {
    ...p, id: "hist_1", updatedAt: p.completedAt - 7 * 864e5,
    completedAt: p.completedAt - 7 * 864e5,
    // workoutId nollas med flit: nextWorkout roterar vidare utifrån SENASTE
    // passets workoutId, och då hade pass 2 blivit ett annat pass med andra
    // övningar — och då finns ingenting att jämföra mot.
    workoutId: null,
    sets: (p.sets || []).map((s, i) => ({ ...s, id: "hs" + i, weight: (s.weight || 20) * 2 })),
  };
  localStorage.setItem("atlas.v3.sessions", JSON.stringify([gammalt]));
  localStorage.removeItem("atlas.v3.live");
}, ettPass);
await page.reload(); await page.waitForTimeout(900);

// ── Pass 2: sänkt vikt → frågan ska ställas ──────────────────────────────────
await klick("Starta"); await page.waitForTimeout(600);
await knappaNer(14);                       // 14 × 2,5 kg — långt under förra gången
await klick("Avsluta set"); await page.waitForTimeout(400);
await klick("Avsluta"); await page.waitForTimeout(600);
await kolla("varför-frågan ställs efter en verklig avvikelse", finns("Vad berodde det på?"));

// Inget får antas innan användaren själv svarat.
const föreSvar = (await pass()).some(s => s.reason);
steg.push(`${!föreSvar ? "OK " : "FEL"} inget skäl sparat innan användaren svarat`);

await klick("Sov dåligt"); await page.waitForTimeout(500);
await kolla("kvittering efter svaret", finns("Tack"));
const medSvar = (await pass()).find(s => s.reason && s.reason.code === "somn");
steg.push(`${medSvar ? "OK " : "FEL"} svaret sparat på passet i atlas.v3.sessions`);
steg.push(`${medSvar && medSvar.id !== "hist_1" ? "OK " : "FEL"} svaret hamnade på RÄTT pass (det nyss loggade)`);

// ── Framsteg: passlistan är vägen in ─────────────────────────────────────────
await klick("Tillbaka till hem"); await page.waitForTimeout(400);
await klick("Utveckling"); await page.waitForTimeout(500);
await kolla("framstegsvyn listar loggade pass", finns("Loggade pass"));

const antalFöre = (await pass()).length;
// Öppna det ÖVERSTA passet i listan (senaste först).
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].filter(x => /\d+ set/.test(x.innerText || ""));
  b[0].click();
});
await page.waitForTimeout(500);
await kolla("redigeringsarket öppnas", finns("Redigera pass"));

// ── Rättning: vikten ändras och räknas om ────────────────────────────────────
const viktFöre = await page.evaluate(() => {
  const i = document.querySelector('input[aria-label="Vikt set 1"]');
  return i ? i.value : null;
});
await page.fill('input[aria-label="Vikt set 1"]', "42.5");
await page.waitForTimeout(300);
await klick("Spara ändringar"); await page.waitForTimeout(500);

const efterRättning = (await pass()).find(s => (s.sets || []).some(x => x.weight === 42.5));
steg.push(`${efterRättning ? "OK " : "FEL"} rättad vikt sparad (${viktFöre} → 42.5)`);
steg.push(`${efterRättning && Object.values(efterRättning.muscleLoads || {}).some(v => v > 0) ? "OK " : "FEL"} muskellasten omräknad efter rättningen`);
steg.push(`${efterRättning && efterRättning.updatedAt > (efterRättning.completedAt || 0) ? "OK " : "FEL"} updatedAt bumpad (synken ser en ÄNDRING)`);

// Överlever rättningen en omladdning?
await page.reload(); await page.waitForTimeout(900);
const kvarEfterReload = (await pass()).some(s => (s.sets || []).some(x => x.weight === 42.5));
steg.push(`${kvarEfterReload ? "OK " : "FEL"} rättningen överlever omladdning`);

// ── Radering: två steg, sedan borta ──────────────────────────────────────────
await klick("Utveckling"); await page.waitForTimeout(500);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].filter(x => /\d+ set/.test(x.innerText || ""));
  b[0].click();
});
await page.waitForTimeout(400);
await klick("Ta bort passet"); await page.waitForTimeout(300);
await kolla("radering varnar innan den utförs", finns("går inte att ångra"));
const efterVarning = (await pass()).length;
steg.push(`${efterVarning === antalFöre ? "OK " : "FEL"} inget raderat av enbart varningen`);

await klick("Ja, ta bort"); await page.waitForTimeout(600);
const efterRadering = (await pass()).length;
steg.push(`${efterRadering === antalFöre - 1 ? "OK " : "FEL"} exakt ett pass borttaget (${antalFöre} → ${efterRadering})`);

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
