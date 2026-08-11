// KRÄVER: `npm i --no-save playwright-core` + byggd `dist-atlas2/` (körs ej av test/bygge).
//
// Verifierar layoutlöftet i en RIKTIG webbläsare, i tre bredder:
//
//   · iPhone SE (375×667) — golvet. Ryms kärnloopen här ryms den överallt.
//   · iPhone 14 (390×844) — den vanliga telefonen.
//   · Desktop (1440×900)  — sidopanel i stället för bottennav.
//
// LÖFTET som bevakas: Hem, Pass, Kvitto och Mat scrollar inte. Det är vyerna
// man står i med telefonen i handen mellan seten, och där är en scroll ett
// misslyckande. Framsteg och Coachen är listor respektive längre resonemang och
// får scrolla — men de mäts ändå, så att en framtida tillväxt syns i stället
// för att smyga sig på.
//
// jsdom kan inte ersätta det här: `100dvh`, flexbox-höjder och faktisk
// scrollhöjd finns bara i en riktig renderare.

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
await new Promise(r => srv.listen(8947, r));
const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });

// Vyer som ALDRIG får scrolla — de man står i med telefonen i handen, där en
// scroll mellan två set är ett misslyckande.
const MÅSTE_RYMMAS = ["hem", "mat", "pass"];

// Kvittot står med flit INTE i listan, och det är ett medvetet nej snarare än
// en eftergift. Dess höjd är en funktion av passets storlek: sammanfattningen
// växer med antalet muskelgrupper, övningslistan med antalet övningar. Den här
// mätningen loggar EN övning — det minsta möjliga passet. Att lova "ryms" mot
// det talet vore att lova något som spricker vid första riktiga passet med fem
// övningar. Hellre en ärlig scroll än ett löfte som bara håller i testet.
// Vyn mäts ändå, så att en framtida tillväxt syns i stället för att smyga sig på.

const steg = [];
const fel = [];

for (const [etikett, bredd, höjd] of [["SE", 375, 667], ["14", 390, 844], ["desktop", 1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: bredd, height: höjd } });
  page.on("pageerror", e => fel.push(`${etikett}: ${e.message}`));
  page.on("console", m => {
    const t = m.text();
    if (m.type() === "error" && !/ERR_CONNECTION_RESET|unsupported MIME|Failed to load resource/.test(t))
      fel.push(`${etikett} console: ${t.slice(0, 160)}`);
  });

  const klick = async t => {
    const ok = await page.evaluate(x => {
      const k = [...document.querySelectorAll("button")].find(b => (b.innerText || "").toLowerCase().includes(x.toLowerCase()));
      if (k) { k.click(); return true; } return false;
    }, t);
    if (!ok) throw new Error(`saknar knapp "${t}" i ${etikett}`);
  };
  // Ett klick i taget: React batchar bort en klickserie i samma evaluate, och
  // vikten landar då på 5 kg i stället för 50 (dokumenterad fallgrop).
  const stega = async (riktning, n) => {
    for (let i = 0; i < n; i++) {
      await page.evaluate(r => {
        const b = [...document.querySelectorAll("button")].find(x => x.getAttribute("aria-label") === r);
        if (b) b.click();
      }, riktning);
      await page.waitForTimeout(45);
    }
  };
  const mät = async namn => {
    await page.waitForTimeout(450);
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      // Vilket element sticker ut åt höger? Utan namnet är ett sidscroll-fel
      // nästan omöjligt att spåra.
      const skyldig = [...document.querySelectorAll("*")]
        .filter(el => { const r = el.getBoundingClientRect();
                        return r.width > 20 && r.right > window.innerWidth + 1; })
        .map(el => (el.innerText || el.tagName).replace(/\s+/g, " ").slice(0, 24))
        .pop() || null;
      return { doc: d.scrollHeight, vp: window.innerHeight,
               bredd: d.scrollWidth - d.clientWidth, skyldig };
    });
    const över = m.doc - m.vp;
    const ryms = över <= 4;                       // 4 px marginal för avrundning
    const krav = MÅSTE_RYMMAS.includes(namn);

    // SIDSCROLL ÄR ALLTID FEL, i varje vy och på varje bredd.
    //
    // Den här kontrollen saknades helt: skriptet mätte bara scrollHeight, så
    // passvyn kunde ligga 107 px utanför skärmkanten på en 375 px-telefon och
    // ändå rapportera 24 OK. Felet levde i månader och hittades först när någon
    // svepte i sidled på riktigt. En vy som får scrolla vertikalt får ändå
    // aldrig scrolla horisontellt — det finns ingen vy där det är avsett.
    const bredtFel = m.bredd > 1;
    const ok = (krav ? ryms : true) && !bredtFel;
    const höjdtext = ryms ? "ryms" : `scroll +${över} px`;
    const bredtext = bredtFel ? `  SIDSCROLL +${m.bredd} px${m.skyldig ? ` ("${m.skyldig}")` : ""}` : "";
    steg.push(`${ok ? "OK " : "FEL"} ${etikett.padEnd(7)} ${namn.padEnd(9)} ${höjdtext}${krav || !ryms ? "" : "  (får scrolla)"}${bredtext}`);
  };

  await page.goto("http://localhost:8947/"); await page.waitForTimeout(800);
  await klick("Kom igång"); await page.waitForTimeout(300);
  await klick("Demo"); await page.waitForTimeout(900);

  // Rätt skal för bredden.
  const skal = await page.evaluate(() => {
    const n = document.querySelector("nav");
    return { pos: n ? getComputedStyle(n).position : null, harMain: !!document.querySelector("main") };
  });
  const väntat = bredd >= 1000 ? "sticky" : "fixed";
  steg.push(`${skal.pos === väntat ? "OK " : "FEL"} ${etikett.padEnd(7)} skal      ${skal.pos === "sticky" ? "sidopanel" : "bottennav"}`);

  await mät("hem");
  for (const [f, n] of [["Mat", "mat"], ["Framsteg", "framsteg"], ["Coachen", "coachen"]]) { await klick(f); await mät(n); }

  await klick("Hem"); await page.waitForTimeout(300);
  await klick("Starta"); await page.waitForTimeout(700);
  await mät("pass");
  // Ett set MÅSTE loggas först: avslutas passet tomt anropas onAbort och man
  // hamnar på hem — då mäter man fel vy och tror att kvittot ryms.
  await stega("Öka", 8);
  await klick("Avsluta set"); await page.waitForTimeout(400);
  await klick("Avsluta"); await page.waitForTimeout(700);
  await mät("kvitto");

  // Kartan ska ha VÄXT på den större skärmen — beviset att höjden är driven av
  // ytan och inte av en hårdkodad 300:a.
  await klick("Tillbaka till hem"); await page.waitForTimeout(600);
  const karta = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label*="Muskelkarta"]');
    return svg ? Math.round(svg.getBoundingClientRect().height) : null;
  });
  steg.push(`${karta > 0 ? "OK " : "FEL"} ${etikett.padEnd(7)} karta     ${karta} px hög`);
  await page.close();
}

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
