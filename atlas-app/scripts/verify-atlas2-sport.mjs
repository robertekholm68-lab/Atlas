// KRÄVER: `npm i --no-save playwright-core` + byggd `dist-atlas2/` (körs ej av test/bygge).
// Headless DOM-verifiering av sport- och cardiologgningen: hela kedjan från
// Pass-fliken till att readiness faktiskt sjunker.
//
// Det som prövas är inte utseendet utan att loggningen NÅR FRAM: passet ska
// hamna i atlas.v3.sessions med id, bära muscleLoads som färgar kartan, och
// dra ner readiness via cardioPenalty. Går något av det förlorat är vyn
// meningslös oavsett hur den ser ut.
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
await new Promise(r => srv.listen(8939, r));

const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fel = [];
page.on("pageerror", e => fel.push("pageerror: " + e.message));

// OBS: hdr()/label() versaliserar via CSS — matcha ALLTID skiftlägesokänsligt.
const klickText = async (t) => {
  const ok = await page.evaluate((txt) => {
    const alla = [...document.querySelectorAll("button")];
    const b = alla.find(x => ((x.getAttribute("aria-label") || "") + " " + (x.innerText || ""))
      .toLowerCase().includes(txt.toLowerCase()));
    if (b) { b.click(); return true; }
    return false;
  }, t);
  if (!ok) throw new Error("Hittade ingen knapp: " + t);
  // React batchar klickserier i page.evaluate — ett klick i taget, med paus.
  await page.waitForTimeout(220);
};
const finnsText = (t) => page.evaluate((txt) =>
  (document.body.innerText || "").toLowerCase().includes(txt.toLowerCase()), t);

const steg = [];
const kolla = async (namn, v) => steg.push(`${(await v) ? "OK " : "FEL"} ${namn}`);

await page.goto("http://localhost:8939/");
await page.waitForTimeout(700);

// Startsida → riktig profil (tom historik, inget påhittat)
await klickText("Kom igång");
await klickText("Riktig profil");
await page.waitForTimeout(400);

// Läs readiness FÖRE, så effekten går att mäta i stället för att antas.
// Talet renderas utan procenttecken direkt under etiketten READINESS, och är
// "—" när underlag saknas. Läs det som appen faktiskt skriver.
const läsReadiness = () => page.evaluate(() => {
  const m = (document.body.innerText || "").match(/READINESS\s*\n\s*([^\n]+)/i);
  if (!m) return null;
  const v = m[1].trim();
  return /^\d+$/.test(v) ? Number(v) : null;
});
const readinessFöre = await läsReadiness();

// ── PASS-FLIKEN: ingången ska finnas ──
await klickText("Pass");
await page.waitForTimeout(300);
await kolla("pass: ingång till aktivitetsloggning finns", finnsText("Logga aktivitet"));

// Pass-fliken står i layoutskriptets MÅSTE_RYMMAS — ingången får inte
// göra vyn scrollande på den minsta skärmen.
await page.setViewportSize({ width: 375, height: 667 });
await page.waitForTimeout(300);
await kolla("pass: ryms fortfarande på 375×667", page.evaluate(() =>
  document.documentElement.scrollHeight <= window.innerHeight + 2));
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(250);

// ── LOGGNINGSVYN ──
await klickText("Logga aktivitet");
await page.waitForTimeout(400);
await kolla("arket öppnas med aktivitetsval", finnsText("Aktivitet"));
await kolla("ingen förhandsvisning innan en aktivitet valts", page.evaluate(() =>
  !(document.body.innerText || "").toLowerCase().includes("så här belastas du")));

await klickText("Kondition & uthållighet");
await klickText("Löpning");
await kolla("förhandsvisning visas INNAN passet sparas", finnsText("Så här belastas du"));
await kolla("konditionslasten visas", finnsText("konditionslast"));
await kolla("muskler listas i förhandsvisningen", page.evaluate(() =>
  /quadriceps|calves|hamstrings|gluteal/i.test(document.body.innerText || "")));

// ÄRLIGHET: ingen kaloriuppskattning någonstans i vyn.
await kolla("inga kalorier gissas", page.evaluate(() =>
  !/kcal|kalori/i.test(document.body.innerText || "")));

// ── DISTANS ──
// Löpning når vyn via appens EGET id ("lopning" → libId "running"), så det här
// steget prövar samma väg som en användare tar — inte biblioteks-id:t direkt.
const distansfält = () => page.evaluate(() =>
  !![...document.querySelectorAll("input")].some(i => (i.getAttribute("aria-label") || "").includes("Distans")));
await kolla("löpning får ett distansfält", distansfält());
await kolla("ingen nolla i fältet — distans är valfritt", page.evaluate(() => {
  const i = [...document.querySelectorAll("input")].find(x => (x.getAttribute("aria-label") || "").includes("Distans"));
  return !!i && i.value === "";
}));
await kolla("inget tempo påstås innan distansen finns", page.evaluate(() =>
  !/min\/km/i.test(document.body.innerText || "")));

// Skriv 10 km. Passet står på 45 minuter, alltså 4:30 min/km.
await page.evaluate(() => {
  const i = [...document.querySelectorAll("input")].find(x => (x.getAttribute("aria-label") || "").includes("Distans"));
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  s.call(i, "10"); i.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(250);
await kolla("tempot räknas ur distans och tid (4:30 min/km)", finnsText("4:30 min/km"));
// Distansen får INTE röra belastningen — den läses av innan och efter.
const lastFöre = await page.evaluate(() =>
  ((document.body.innerText || "").match(/(\d+)\s*konditionslast/i) || [])[1] || null);

// ── SPARA ──
await klickText("Logga löpning");
await page.waitForTimeout(600);
await kolla("kvitto visas efter sportpasset", finnsText("Passet är loggat"));
await kolla("kvittot kraschar inte utan set — visar kondition i stället",
  page.evaluate(() => /kondition/i.test(document.body.innerText || "")));
// Man loggade tio kilometer; kvittot ska nämna dem, inte bara antalet muskler.
await kolla("kvittot visar distansen", finnsText("Distans"));
await kolla("kvittot bär tempot som enhet", finnsText("4:30/km"));

// ── LAGRING: passet måste nå fram, med id ──
const sparat = await page.evaluate(() => {
  try {
    const l = JSON.parse(localStorage.getItem("atlas.v3.sessions") || "[]");
    const s = l.find(x => x && x.sport);
    return s ? { id: s.id, source: s.source, sets: (s.sets || []).length,
      muskler: Object.keys(s.muscleLoads || {}).length, cardio: s.cardioLoad, min: s.minutes,
      km: s.distanceKm } : null;
  } catch { return null; }
});
await kolla("passet ligger i atlas.v3.sessions", Promise.resolve(!!sparat));
await kolla("passet bär ett id (annars tappar backupen det)", Promise.resolve(!!(sparat && sparat.id)));
await kolla("passet är märkt som sport", Promise.resolve(!!(sparat && sparat.source === "sport")));
await kolla("passet har inga set", Promise.resolve(!!(sparat && sparat.sets === 0)));
await kolla("passet bär muskellast som kartan kan färga", Promise.resolve(!!(sparat && sparat.muskler > 0)));
await kolla("passet bär konditionslast", Promise.resolve(!!(sparat && sparat.cardio > 0)));
await kolla("passet bär minuterna", Promise.resolve(!!(sparat && sparat.min > 0)));
await kolla("passet bär distansen", Promise.resolve(!!(sparat && sparat.km === 10)));
// Grinden mot att kilometer smyger in i belastningen. Konditionslasten som
// stod i förhandsvisningen INNAN distansen skrevs in ska vara den som sparades.
await kolla(`distansen rörde inte belastningen (${lastFöre} kvar)`,
  Promise.resolve(lastFöre != null && Math.round(sparat.cardio) === Number(lastFöre)));

// ── FRAMSTEG: minuter i stället för "0 set" ──
// KVITTOT MÅSTE STÄNGAS FÖRST. App2 renderar `if (klart) return <DoneView/>`
// före fliklogiken, så ett klick i bottennavet gör ingenting medan kvittot
// ligger uppe. Utan det här steget mätte de två kontrollerna nedan KVITTOT och
// inte framstegsvyn — och gick igenom, eftersom kvittot också säger "Löpning"
// och "45 min". En grön rad som pekar på fel vy är värre än ingen rad alls.
await klickText("Tillbaka till hem");
await page.waitForTimeout(400);
await klickText("Framsteg");
await page.waitForTimeout(500);
await kolla("framstegsvyn är verkligen framme (inte kvittot kvar)", page.evaluate(() =>
  !/passet är loggat/i.test(document.body.innerText || "")));
await kolla("framsteg listar sportpasset", finnsText("Löpning"));
await kolla("framsteg visar minuter, inte '0 set'", page.evaluate(() => {
  const t = document.body.innerText || "";
  return /\d+\s*min/i.test(t) && !/0\s*set/i.test(t);
}));
await kolla("framsteg visar distansen bredvid tiden", page.evaluate(() =>
  /10 km/i.test(document.body.innerText || "")));

// ── EFFEKTEN: readiness ska faktiskt ha påverkats ──
await klickText("Hem");
await page.waitForTimeout(600);
const readinessEfter = await läsReadiness();
// DET HÄR ÄR HELA POÄNGEN: utan loggat pass finns ingen readiness alls ("—"),
// och efter ett sportpass finns en riktig siffra. Springer man en mil vet
// appen numera om det.
await kolla(`readiness saknades före (${readinessFöre === null ? "—" : readinessFöre})`,
  Promise.resolve(readinessFöre === null));
await kolla(`readiness finns efter sportpasset (${readinessEfter})`,
  Promise.resolve(typeof readinessEfter === "number"));
// Ärligheten ska följa med: ETT pass är tunt underlag och ska sägas rakt ut.
await kolla("och flaggas som osäkert underlag", finnsText("osäkert underlag"));
await kolla("kartan talar om sportpasset i klartext", page.evaluate(() =>
  !/ingen historik än/i.test(document.body.innerText || "")));

// ── RADERING via SessionSheet ──
await klickText("Framsteg");
await page.waitForTimeout(400);
await klickText("Löpning");
await page.waitForTimeout(400);
await kolla("passarket förklarar att sportpass saknar set", finnsText("Sportpass loggas utan enskilda set"));
await klickText("Ta bort");
await page.waitForTimeout(300);
await klickText("Ta bort");
await page.waitForTimeout(500);
await kolla("sportpasset går att radera", page.evaluate(() => {
  try {
    const l = JSON.parse(localStorage.getItem("atlas.v3.sessions") || "[]");
    return !l.some(x => x && x.sport);
  } catch { return false; }
}));

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
