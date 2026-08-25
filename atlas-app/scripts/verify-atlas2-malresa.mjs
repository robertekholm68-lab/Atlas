// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar målresan med plan och delmål:
//   1. Coachchatten erbjuder "Sätt ett mål med coachen" (intervjuns ingång).
//      Själva LLM-samtalet verifieras INTE här — det går mot en levande proxy
//      och är inte deterministiskt. Motorn runt det är vitest-testad.
//   2. Ett coachplanerat mål (byggt av samma motor som appen använder) renderas
//      i Målresa-arket: delmål med datum, planens dimensioner inklusive sömn,
//      och ärlighetsraden när färsk vägning saknas.
//
// OBS: hdr()/label() versaliserar via CSS — alla textkontroller skiftlägesokänsliga.
// OBS: Meny-knappen finns bara på Hem-vyn i mobilläget.

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
await new Promise(r => srv.listen(8961, r));
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
// FLIKBYTE MÅSTE MATCHA EXAKT. Delsträngen "coachen" träffar numera målradens
// text på hemvyn ("Coachen planerar träning, kost och vila mot ett datum") och
// startar då intervjun i stället för att byta flik. Samma fälla som "pass" mot
// "Starta pass".
const flik = async namn => {
  const ok = await page.evaluate(n => {
    const b = [...document.querySelectorAll("button")].find(k => (k.innerText || "").trim().toUpperCase() === n);
    if (b) { b.click(); return true; } return false;
  }, namn.toUpperCase());
  if (!ok) throw new Error("saknar flik: " + namn);
};
const text = () => page.evaluate(() => document.body.textContent || "");
const steg = [];

await page.goto("http://localhost:8961/"); await page.waitForTimeout(800);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Demo"); await page.waitForTimeout(900);

// ── 1. Intervjuingången i coachchatten ──────────────────────────────────────
await flik("Coachen"); await page.waitForTimeout(500);
await klick("Fråga coachen"); await page.waitForTimeout(400);
let t = await text();
steg.push(`${/sätt ett mål med coachen|planera om målet/i.test(t) ? "OK " : "FEL"} chatten erbjuder målintervjun`);

await klick("mål med coachen").catch(() => klick("Planera om målet")); await page.waitForTimeout(400);
t = await text();
steg.push(`${/berätta vad du siktar på/i.test(t) ? "OK " : "FEL"} intervjun öppnar med en inbjudan`);
// UNDERLAGET SKA SYNAS. Att coachen "ser" värden hjälper inte om användaren
// inte kan se att den gör det — det var precis Roberts invändning.
steg.push(`${/det här ser jag|nästan ingen data/i.test(t) ? "OK " : "FEL"} öppningen redovisar vad appen vet`);
steg.push(`${/kg|styrkepass|readiness|saknar/i.test(t) ? "OK " : "FEL"} konkreta värden eller uttalade luckor nämns`);
steg.push(`${/avbryt intervjun/i.test(t) ? "OK " : "FEL"} intervjun går att avbryta`);
await klick("Avbryt intervjun"); await page.waitForTimeout(300);

// ── 2. Ett coachplanerat mål renderas med delmål och plan ──────────────────
// Målet byggs av SAMMA motorfunktion som appen använder — skriptet hittar inte
// på ett format som appen råkar tåla.
const mål = byggMålFrånPlan({
  klar: true, namn: "Bröllop i juni", typ: "fatloss",
  målDatum: new Date(Date.now() + 112 * 864e5).toISOString().slice(0, 10),
  beskrivning: "Ner i vikt till bröllopet.",
  viktmål: { startKg: 96, målKg: 90 },
  passPerVecka: 3, cardioPerVecka: 2,
  dimensioner: {
    träning: "Tre helkroppspass i veckan med progression.",
    kost: "Måttligt kaloriunderskott, högt protein.",
    cardio: "Två lugna konditionspass.",
    vila: "Minst en vilodag mellan tunga pass.",
    sömn: "Regelbunden läggtid — appen kan inte mäta sömn, detta är en riktlinje.",
  },
});
await page.evaluate(m => localStorage.setItem("atlas.v3.goal", JSON.stringify(m)), mål);
await page.reload(); await page.waitForTimeout(900);

// Målresa-arket öppnas från coachvyns Målresa-kort (onOpenGoal), inte menyn.
await flik("Coachen"); await page.waitForTimeout(500);
await klick("Målresa"); await page.waitForTimeout(500);
t = await text();
steg.push(`${/bröllop i juni/i.test(t) ? "OK " : "FEL"} målet visas med sitt namn`);
steg.push(`${/delmål/i.test(t) ? "OK " : "FEL"} delmålssektionen finns`);
steg.push(`${/styrkepass/i.test(t) ? "OK " : "FEL"} pass-delmål listas`);
steg.push(`${/planen/i.test(t) ? "OK " : "FEL"} plansektionen finns`);
steg.push(`${/sömn/i.test(t) ? "OK " : "FEL"} sömn står med som riktlinje`);
steg.push(`${/regelbunden läggtid/i.test(t) ? "OK " : "FEL"} dimensionstexten renderas`);
// Demoläget saknar färsk vägning i förhållande till det injicerade målet —
// då ska ärligheten synas, inte en påhittad kurva. (Har demodatan en färsk
// vägning visas i stället läget mot kurvan; båda är rätt svar.)
steg.push(`${/väg dig|planens kurva|ingen vägning/i.test(t) ? "OK " : "FEL"} viktläget redovisas ärligt (kurva eller "väg dig")`);

// ── 3. Målläget vägs in i coachens rekommendation ──────────────────────────
// Vägning som ligger EFTER planens kurva ska ge ett besked om det, inne i
// rekommendationskortet — inte i ett eget kort man läser förbi.
await page.evaluate(() => {
  const v = JSON.parse(localStorage.getItem("atlas.v3.weights") || "[]");
  v.push({ ts: Date.now() - 864e5, kg: 96.5 });
  localStorage.setItem("atlas.v3.weights", JSON.stringify(v));
});
await page.reload(); await page.waitForTimeout(900);
await klick("Coachen"); await page.waitForTimeout(600);
t = await text();
steg.push(`${/bröllop i juni/i.test(t) ? "OK " : "FEL"} målet nämns i coachvyn`);
steg.push(`${/efter planen|i fas|före planen|kan inte säga/i.test(t) ? "OK " : "FEL"} coachen ger ett besked om planläget`);
steg.push(`${/nästa delmål/i.test(t) ? "OK " : "FEL"} nästa delmål visas`);

// ── 4. INGÅNGEN LIGGER FRAMME PÅ HEMVYN ────────────────────────────────────
// Rapporterat problem: intervjun gick bara att nå genom att fälla ut
// chattkortet inuti coachvyn — två klick ned i en vy man inte gissar.
await page.evaluate(() => localStorage.removeItem("atlas.v3.goal"));
await page.reload(); await page.waitForTimeout(900);
t = await text();
steg.push(`${/sätt ett mål/i.test(t) ? "OK " : "FEL"} målraden syns direkt på hemvyn utan mål`);
// Hemvyn är låst till skärmhöjden — målraden får inte skapa scroll.
const spill = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
steg.push(`${spill <= 1 ? "OK " : "FEL"} hemvyn spiller inte över (${Math.round(spill)} px)`);

// Ett klick ska landa i coachvyn med intervjun IGÅNG, inte i en hopfälld chatt.
await klick("Sätt ett mål"); await page.waitForTimeout(900);
t = await text();
steg.push(`${/berätta vad du siktar på/i.test(t) ? "OK " : "FEL"} klicket startar intervjun direkt`);

// ── 5. INTERVJUN ÖVERLEVER ATT MAN LÄMNAR VYN ──────────────────────────────
// Rapporterat problem: coachen "glömde vad vi sagt". CoachChat renderas bara
// när chattkortet är utfällt, så tillstånd i useState RADERADES vid
// avmontering. Nu ligger det i lagringen.
const sparadIntervju = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.intervju") || "null"));
steg.push(`${sparadIntervju && sparadIntervju.transkript && sparadIntervju.transkript.length ? "OK " : "FEL"} intervjun sparas i lagringen`);

await flik("Hem"); await page.waitForTimeout(400);
await flik("Coachen"); await page.waitForTimeout(700);
t = await text();
steg.push(`${/berätta vad du siktar på/i.test(t) ? "OK " : "FEL"} intervjun finns kvar efter flikbyte`);

await page.reload(); await page.waitForTimeout(1000);
await flik("Coachen"); await page.waitForTimeout(800);
const efterOmladdning = await page.evaluate(() => document.body.innerText);
steg.push(`${/berätta vad du siktar på/i.test(efterOmladdning) ? "OK " : "FEL"} intervjun överlever omladdning`);

// ── 4. FEL SYNS I KLARTEXT ──────────────────────────────────────────────────
// Tidigare blev varje fel samma intetsägande mening, och i vanliga chatten
// visades ingenting alls. Här bryts proxyn med flit: orsaken ska stå i chatten.
await page.route("**/api/coach", r => r.fulfill({
  status: 503, contentType: "application/json",
  body: JSON.stringify({ fel: "proxyn är nere för underhåll" }),
}));
// Målet rensas: med ett mål satt visar chippen "Planera om målet".
await page.evaluate(() => { localStorage.removeItem("atlas.v3.goal"); localStorage.removeItem("atlas.v3.intervju"); });
await page.reload(); await page.waitForTimeout(900);
await flik("Coachen"); await page.waitForTimeout(600);
await klick("Fråga coachen"); await page.waitForTimeout(500);
await klick("Sätt ett mål med coachen"); await page.waitForTimeout(600);
if (process.env.DEBUG) console.log("EFTER START:", (await text()).includes("Berätta vad du siktar på") ? "intervjun öppnad" : "INTE öppnad");
await page.evaluate(() => {
  // Chattfältet saknar type-attribut, så input[type=text] matchar det INTE.
  const kandidater = [...document.querySelectorAll("input")].filter(x => x.type !== "number" && x.type !== "file");
  const i = kandidater[kandidater.length - 1];
  if (!i) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(i, "Jag vill gå ner till 75 kilo");
  i.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(200);
// EXAKT matchning: delsträngen "fråga" träffar rubrikknappen "FRÅGA COACHEN"
// och FÄLLER IHOP kortet i stället för att skicka. Samma fälla som "pass".
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(k => (k.innerText || "").trim() === "Fråga");
  if (b) b.click();
});
await page.waitForTimeout(2500);
t = await text();
if (process.env.DEBUG) {
  console.log("SIDFEL SÅ HÄR LÅNGT:", JSON.stringify(fel));
  console.log("KNAPPAR:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("button")].map(x => x.innerText.trim().slice(0, 26)).filter(Boolean))));
}
if (process.env.DEBUG) console.log("--- CHATTEXT ---\n" + t.slice(-900));
steg.push(`${/underhåll|503|gick inte att nå/i.test(t) ? "OK " : "FEL"} felets ORSAK står i chatten, inte en tom mening`);
steg.push(`${/samtalet finns kvar/i.test(t) ? "OK " : "FEL"} användaren får veta att samtalet inte gått förlorat`);

await browser.close(); srv.close();
console.log(steg.join("\n"));
if (fel.length) { console.log("\nSIDFEL:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
console.log("\nAlla steg OK.");
