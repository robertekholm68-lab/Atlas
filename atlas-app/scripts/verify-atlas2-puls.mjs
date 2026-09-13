// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar pulsbandet i passvyn i en riktig webbläsare — utan ett riktigt
// band. Web Bluetooth ersätts med en FEJKAD GATT via addInitScript: samma
// anrop som ett riktigt band (requestDevice → gatt.connect → service →
// characteristic → notifications), bara datan är påhittad. Det prövar hela
// kedjan från knapptryck till sparat pass, som jsdom inte kan: riktig layout,
// riktig lagring, riktig omladdning.
//
// Löftena:
//   · utan Bluetooth ger trycket ett SKÄL, inte en krasch
//   · med band visas pulsen i rubrikraden — utan att raden växer
//   · pulsen syns under vilan
//   · snitt och max hamnar på passet, syns på kvittot och överlever i lagringen
//   · passvyn ryms fortfarande utan scroll på iPhone SE med chipet på plats

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

// Porten står som literal: dom-skript-portar.test.js läser den ur källan.
const html = readFileSync("dist-atlas2/atlas2.html", "utf8");
const srv = http.createServer((q, s) => { s.setHeader("Content-Type", "text/html"); s.end(html); });
await new Promise(r => srv.listen(8975, r));
const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });

const steg = [];
const fel = [];
const ok = (namn, villkor, extra = "") => steg.push(`${villkor ? "OK " : "FEL"} ${namn}${extra ? ` (${extra})` : ""}`);

/** Fejkat band. Avger ett Heart Rate Measurement-paket var 150:e ms. */
const FEJKAT_BAND = () => {
  const lyssnare = {};
  let timer = null;
  const ch = {
    addEventListener: (t, f) => { lyssnare[t] = f; },
    removeEventListener: () => {},
    startNotifications: async () => {
      let i = 0;
      timer = setInterval(() => {
        const dv = new DataView(new ArrayBuffer(2));
        dv.setUint8(0, 0); dv.setUint8(1, 120 + (i++ % 5) * 5);   // 120,125,130,135,140,…
        lyssnare.characteristicvaluechanged && lyssnare.characteristicvaluechanged({ target: { value: dv } });
      }, 150);
    },
    stopNotifications: async () => { clearInterval(timer); },
  };
  const device = {
    name: "Fejkband",
    gatt: {
      connected: true,
      connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => ch }) }),
      disconnect: () => { clearInterval(timer); device.gatt.connected = false; },
    },
    addEventListener: () => {}, removeEventListener: () => {},
  };
  Object.defineProperty(navigator, "bluetooth", { value: { requestDevice: async () => device }, configurable: true });
};

/** Startar ett program och ett pass. Samma väg som verify-atlas2-pass.mjs. */
async function startaPass(page) {
  const klick = async t => {
    const hit = await page.evaluate(x => {
      const b = [...document.querySelectorAll("button")].find(k => (k.innerText || "").toLowerCase().includes(x.toLowerCase()));
      if (b) { b.click(); return true; } return false;
    }, t);
    if (!hit) throw new Error("saknar knapp: " + t);
  };
  await page.goto("http://localhost:8975/"); await page.waitForTimeout(700);
  await klick("Kom igång"); await page.waitForTimeout(300);
  await klick("Riktig profil"); await page.waitForTimeout(500);
  await klick("Välj program"); await page.waitForTimeout(400);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(x => /pass\/vecka/i.test(x.innerText || ""));
    b && b.click();
  });
  await page.waitForTimeout(400);
  await klick("Tillbaka till hem"); await page.waitForTimeout(400);
  await klick("Starta"); await page.waitForTimeout(600);
  return klick;
}
const text = page => page.evaluate(() => document.body.innerText || "");
const finns = (page, sel) => page.evaluate(s => !!document.querySelector(s), sel);
const koppla = page => page.on("pageerror", e => fel.push("pageerror: " + e.message));

// ── 1. UTAN BLUETOOTH: skälet, inte en krasch ────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  koppla(page);
  // Headless Chromium kan ha navigator.bluetooth utan att kunna visa en
  // väljare. Båda fallen ska sluta i en vy som lever — och saknas API:t helt
  // ska skälet nämna Web Bluetooth.
  await page.addInitScript(() => { try { delete navigator.bluetooth; Object.defineProperty(navigator, "bluetooth", { value: undefined, configurable: true }); } catch (e) { /* redan borta */ } });
  await startaPass(page);
  ok("pulsknappen finns i rubrikraden", await finns(page, '[data-puls="1"]'));
  const etikett = await page.evaluate(() => (document.querySelector('[data-puls="1"]') || {}).getAttribute?.("aria-label"));
  ok("okopplad säger vad ett tryck gör", etikett === "Koppla pulsband", String(etikett));
  await page.click('[data-puls="1"]'); await page.waitForTimeout(500);
  const not = await page.evaluate(() => { const n = document.querySelector('[data-puls-fel="1"]'); return n ? n.innerText : null; });
  ok("trycket ger ett skäl", !!not && /Web Bluetooth/i.test(not), String(not).slice(0, 60));
  ok("vyn lever efter trycket", /pågående pass/i.test(await text(page)));
  await page.close();
}

// ── 2. MED BAND: hela kedjan ─────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });   // iPhone SE — golvet
  koppla(page);
  await page.addInitScript(FEJKAT_BAND);
  const klick = await startaPass(page);

  const höjdFöre = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.click('[data-puls="1"]'); await page.waitForTimeout(900);
  const chip = await page.evaluate(() => { const b = document.querySelector('[data-puls="1"]'); return b ? { text: b.innerText, etikett: b.getAttribute("aria-label") } : null; });
  ok("pulsen visas i chipet", !!chip && /\d{3}/.test(chip.text), chip ? chip.text.replace(/\s+/g, " ") : "-");
  ok("etiketten säger puls och hur man kopplar ner", !!chip && /^Puls \d+/.test(chip.etikett));
  const höjdEfter = await page.evaluate(() => document.documentElement.scrollHeight);
  ok("rubrikraden växte inte av chipet", höjdEfter === höjdFöre, `${höjdFöre} → ${höjdEfter} px`);
  ok("passvyn ryms utan scroll på SE med band kopplat",
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1),
    `${höjdEfter} px av ${await page.evaluate(() => window.innerHeight)}`);

  // Logga ett set → vilan → pulsen under ringen.
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => { const p = [...document.querySelectorAll("button")].find(x => x.getAttribute("aria-label") === "Öka"); p && p.click(); });
    await page.waitForTimeout(60);
  }
  await klick("Avsluta set"); await page.waitForTimeout(500);
  ok("pulsen syns under vilan", await finns(page, '[data-puls-vila="1"]'));

  // Avsluta i förtid — och spara det som loggades.
  await klick("Hoppa över vilan"); await page.waitForTimeout(300);
  await klick("Avsluta i förtid"); await page.waitForTimeout(400);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(x => /spara det som loggades/i.test(x.innerText || ""));
    b && b.click();
  });
  await page.waitForTimeout(700);

  const kvitto = await page.evaluate(() => { const n = document.querySelector('[data-puls-kvitto="1"]'); return n ? n.innerText : null; });
  ok("kvittot visar snitt och max", !!kvitto && /Snitt \d+ · max \d+/.test(kvitto), String(kvitto).replace(/\s+/g, " ").slice(0, 50));

  const sparat = await page.evaluate(() => {
    try { const l = JSON.parse(localStorage.getItem("atlas.v3.sessions") || "[]"); const s = l[l.length - 1]; return s ? { avgHr: s.avgHr, maxHr: s.maxHr, n: s.hrSamples } : null; } catch (e) { return null; }
  });
  ok("passet i lagringen bär avgHr och maxHr", !!sparat && sparat.avgHr > 0 && sparat.maxHr >= sparat.avgHr, JSON.stringify(sparat));
  ok("snittet ligger inom det fejkade bandets spann (120–140)", !!sparat && sparat.avgHr >= 120 && sparat.avgHr <= 140);

  // Överlever omladdning: passet finns kvar med sin puls.
  await page.reload(); await page.waitForTimeout(1000);
  const efter = await page.evaluate(() => {
    try { const l = JSON.parse(localStorage.getItem("atlas.v3.sessions") || "[]"); const s = l[l.length - 1]; return s && s.avgHr; } catch (e) { return null; }
  });
  ok("pulsen på passet överlever omladdning", efter === (sparat && sparat.avgHr));
  await page.close();
}

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
