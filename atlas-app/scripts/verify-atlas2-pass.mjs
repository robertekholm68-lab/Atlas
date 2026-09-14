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

// ── COACHEN UNDER PASSET, MED HISTORIK ──────────────────────────────────────
//
// Egen sida i iPhone SE:s mått (375×667), för det här handlar lika mycket om
// höjd som om text. Enhetstesterna täcker vad coachen SÄGER; det här täcker att
// den når skärmen och att skärmen fortfarande rymmer passet.
//
// Historiken seedas i lagringen i stället för att loggas genom gränssnittet —
// ett helt föregående pass via knappar är dussintals klick, och det som prövas
// är vyn, inte loggningen.
{
  const sida = await browser.newPage({ viewport: { width: 375, height: 667 } });
  sida.on("pageerror", e => fel.push("pageerror (vila): " + e.message));
  const tryck = async t => sida.evaluate(x => {
    const b = [...document.querySelectorAll("button")].find(k => (k.innerText || "").toLowerCase().includes(x.toLowerCase()));
    if (b && !b.disabled) { b.click(); return true; } return false;
  }, t);

  await sida.goto("http://localhost:8932/"); await sida.waitForTimeout(800);
  await tryck("Kom igång"); await sida.waitForTimeout(300);
  await tryck("Riktig profil"); await sida.waitForTimeout(600);
  await tryck("Välj program"); await sida.waitForTimeout(500);
  await sida.evaluate(() => [...document.querySelectorAll("button")].find(x => /pass\/vecka/i.test(x.innerText || "")).click());
  await sida.waitForTimeout(600);
  await tryck("Tillbaka till hem"); await sida.waitForTimeout(600);

  // INGET workoutId i det seedade passet: `nextWorkout` börjar då om på pass 1,
  // så historiken gäller just den övning passet öppnar med. Med workoutId satt
  // startas pass 2 och övningen har ingen historik — då mäter man ingenting.
  await sida.evaluate(() => {
    const progs = JSON.parse(localStorage.getItem("atlas.v3.programs") || "[]");
    const pid = JSON.parse(localStorage.getItem("atlas.v3.activeProgramId") || "null");
    const p = progs.find(x => x.id === pid) || progs[0];
    const w = p.workouts[0], ex = w.exercises[0];
    localStorage.setItem("atlas.v3.sessions", JSON.stringify([{
      id: "tidigare", programId: p.id, title: w.name, completedAt: Date.now() - 3 * 864e5,
      sets: [{ exerciseId: ex.exId, weight: 80, reps: 8 }, { exerciseId: ex.exId, weight: 80, reps: 8 }, { exerciseId: ex.exId, weight: 80, reps: 7 }],
      muscleLoads: { quadriceps: 150 },
    }]));
  });
  await sida.reload(); await sida.waitForTimeout(1400);
  await tryck("Starta"); await sida.waitForTimeout(900);

  const läge = () => sida.evaluate(() => {
    const d = document.documentElement;
    const text = s => { const e = document.querySelector(s); return e && e.innerText.replace(/\n/g, " "); };
    const hoppa = [...document.querySelectorAll("button")].find(b => /hoppa över vilan/i.test(b.innerText || ""));
    return {
      över: d.scrollHeight - window.innerHeight,
      sist: text('[data-sist-rad="1"]'),
      coach: text('[data-coach-rad="1"]'),
      hoppaSynlig: hoppa ? Math.round(hoppa.getBoundingClientRect().bottom) <= window.innerHeight : false,
    };
  });

  // FÖRE FÖRSTA SETET står förra passets set där. Raden delar plats med
  // "Förra setet: …" och får därför inte kosta höjd.
  const start = await läge();
  steg.push(`${/^Sist: 80 kg × 8, 8, 7$/.test(start.sist || "") ? "OK " : "FEL"} förra passets set syns före första setet (${start.sist})`);
  steg.push(`${start.över <= 4 ? "OK " : "FEL"} passvyn ryms med raden (över ${start.över} px)`);

  // Logga övningen klar med SAMMA vikt som förra passet. Då tiger coachen om
  // de enskilda seten — och talar först när övningen är slut.
  const tillEttiKg = async () => {
    const kg = await sida.evaluate(() => {
      const l = [...document.querySelectorAll("button")].map(b => b.getAttribute("aria-label") || "").find(x => /^Vikt /.test(x));
      return parseFloat(((l || "").match(/Vikt ([\d,.]+)/) || [])[1].replace(",", "."));
    });
    const kliv = Math.round((kg - 80) / 2.5);
    for (let i = 0; i < Math.abs(kliv); i++) {
      await sida.evaluate(r => {
        const b = [...document.querySelectorAll("button")].filter(k => k.getAttribute("aria-label") === r)[0];
        if (b) b.click();
      }, kliv > 0 ? "Minska" : "Öka");
      await sida.waitForTimeout(45);
    }
  };
  const antalSet = await sida.evaluate(() => {
    const t = [...document.querySelectorAll("span")].map(s => s.innerText).find(x => /^Set \d+ av \d+/.test(x || ""));
    return parseInt((t.match(/av (\d+)/) || [])[1], 10);
  });
  let sista = null;
  for (let i = 1; i <= antalSet; i++) {
    await tillEttiKg();
    await tryck("Avsluta set"); await sida.waitForTimeout(600);
    sista = await läge();
    if (i < antalSet) {
      steg.push(`${sista.coach === null ? "OK " : "FEL"} set ${i} av ${antalSet}: tystnad när setet är som sist`);
      await sida.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /hoppa över vilan/i.test(x.innerText || "")); if (b) b.click(); });
      await sida.waitForTimeout(500);
    }
  }
  // SISTA SETET: coachen byter nivå och sammanfattar hela övningen.
  steg.push(`${/^Övningen klar: .*kg/.test(sista.coach || "") ? "OK " : "FEL"} sista setet ger övningens summa (${sista.coach})`);
  // VILOVYNS HÖJD MÄTS MEN FÄLLER INTE BYGGET — samma hållning som kvittot i
  // layoutvakten. Skälet är detsamma: höjden beror på hur lång coachens mening
  // blev, och en mening som wrappar en rad extra i CI:s Chrome (som renderar
  // text större än en utvecklingsmaskin) vore ett rött bygge utan att något
  // blivit sämre. Talet loggas så att en verklig tillväxt syns.
  //
  // DET SOM FAKTISKT LOVAS är raden under: att "Hoppa över vilan" går att nå
  // utan att scrolla. Det är knappen man trycker på med händerna upptagna, och
  // den låg under skärmkanten (+70 px) så fort coachen sa något innan ringen
  // började ge plats.
  steg.push(`OK  vilovyn med coachens rad: över ${sista.över} px (får scrolla — mäts, lovas inte)`);
  steg.push(`${sista.hoppaSynlig ? "OK " : "FEL"} "Hoppa över vilan" syns utan att scrolla`);
  await sida.close();
}

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
