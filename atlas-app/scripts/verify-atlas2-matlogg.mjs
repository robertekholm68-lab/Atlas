// KRÄVER: `npm i --no-save playwright-core` + byggt `dist-atlas2/`.
//
// Verifierar att matloggen går att föra BAKÅT I TIDEN i en riktig webbläsare.
// Det som prövas är löftena:
//
//   · dagsväljaren står på Idag och kan inte gå framåt förbi idag
//   · en post loggad på en vald dag hamnar på DEN dagen, inte på dagens datum
//   · klockslaget följer med (aldrig 00:00) — måltidstypen härleds ur timmen
//   · posten syns inte i dagens lista och ÖVERLEVER en omladdning
//   · en loggad post kan flyttas i tiden ur redigeringen
//   · dagsväljaren orsakar ingen sidscroll på 390 px
//
// Att köra det HÄR och inte i jsdom är hela poängen för två av punkterna:
// omladdningen och lagringen är precis det jsdom fejkar bort, och sidscroll
// finns inte alls utan riktig layout.

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

// Porten står som en literal, inte i en konstant: src/__tests__/
// dom-skript-portar.test.js läser den ur källan för att kunna bevisa att inga
// två skript delar port. En port som testet inte kan läsa kan det inte skydda.
const html = readFileSync("dist-atlas2/atlas2.html", "utf8");
const srv = http.createServer((q, s) => { s.setHeader("Content-Type", "text/html"); s.end(html); });
await new Promise(r => srv.listen(8973, r));
const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const fel = [];
page.on("pageerror", e => fel.push("pageerror: " + e.message));
page.on("console", m => {
  const t = m.text();
  if (m.type() === "error" && !/ERR_CONNECTION_RESET|unsupported MIME|Failed to load resource/.test(t))
    fel.push("console: " + t.slice(0, 160));
});

// hdr()/label() versaliserar via CSS och innerText speglar det — ALLA
// textkontroller här är skiftlägesokänsliga med flit.
const klick = async t => {
  const ok = await page.evaluate(x => {
    const b = [...document.querySelectorAll("button")].find(k => (k.innerText || "").toLowerCase().includes(x.toLowerCase()));
    if (b) { b.click(); return true; } return false;
  }, t);
  if (!ok) throw new Error("saknar knapp: " + t);
};
const text = () => page.evaluate(() => document.body.innerText);
const dagNamn = () => page.evaluate(() => {
  const d = document.querySelector('[data-dag-namn="1"]');
  // Gemener med flit: hdr() versaliserar via CSS och innerText speglar det.
  // Att jämföra mot "Idag" ger ett falskt FEL — fallgropen står i CLAUDE.md.
  return d ? (d.innerText || "").trim().toLowerCase() : null;
});
const loggen = () => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem("atlas.v3.foodLog") || "[]"); } catch { return []; }
});
const steg = [];
const ok = (namn, villkor, extra = "") =>
  steg.push(`${villkor ? "OK " : "FEL"} ${namn}${extra ? ` (${extra})` : ""}`);

await page.goto("http://localhost:8973/"); await page.waitForTimeout(800);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Demo"); await page.waitForTimeout(900);
await klick("Mat"); await page.waitForTimeout(600);

ok("dagsväljaren står på Idag", (await dagNamn()) === "idag", await dagNamn());
ok("framåt är avstängt på idag",
  await page.evaluate(() => { const b = document.querySelector('[data-dag-fram="1"]'); return !!b && b.disabled; }));
ok("ingen väg-tillbaka-knapp när man redan är på idag",
  await page.evaluate(() => !document.querySelector('[data-till-idag="1"]')));

// ── BAKÅT ────────────────────────────────────────────────────────────────
const förePosterIdag = (await loggen()).length;
await page.click('[data-dag-bak="1"]'); await page.waitForTimeout(400);
const bakåtNamn = await dagNamn();
ok("bakåtpilen byter dag", bakåtNamn && bakåtNamn !== "idag", bakåtNamn);
ok("vägen tillbaka till idag dyker upp",
  await page.evaluate(() => !!document.querySelector('[data-till-idag="1"]')));
ok("ingen sidscroll på 390 px",
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  await page.evaluate(() => `${document.documentElement.scrollWidth} px`));

// Logga en måltid MEDAN vi står på den valda dagen.
await klick("Logga måltid"); await page.waitForTimeout(500);
await page.fill('input[placeholder*="kyckling"]', "100 g keso");
await page.waitForTimeout(200);
await klick("Uppskatta måltiden"); await page.waitForTimeout(600);
await klick("Lägg till"); await page.waitForTimeout(700);

const efter = await loggen();
ok("posten sparas", efter.length === förePosterIdag + 1, `${förePosterIdag} → ${efter.length}`);
const ny = efter[efter.length - 1];
const nuMs = await page.evaluate(() => Date.now());
const dygn = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
// Bakåtpilen hoppar till föregående dag SOM HAR LOGG, inte nödvändigtvis
// igår — demodata kan ligga var som helst. Därför prövas löftet som det
// faktiskt lyder: posten hamnar bakåt i tiden, inte på dagens datum. Att den
// hamnade på just den VALDA dagen bevisas av att den syns i dagens lista
// längre ned, eftersom listan filtreras på den valda dagen.
ok("posten hamnade bakåt i tiden, inte idag",
  !!ny && dygn(ny.ts) < dygn(nuMs),
  ny ? new Date(ny.ts).toISOString() : "ingen post");
if (bakåtNamn === "igår") {
  ok("och på exakt igår när det är dit pilen gick", !!ny && dygn(ny.ts) === dygn(nuMs) - 864e5);
}
ok("klockslaget följde med (inte midnatt)",
  !!ny && !(new Date(ny.ts).getHours() === 0 && new Date(ny.ts).getMinutes() === 0),
  ny ? `${new Date(ny.ts).getHours()}:${new Date(ny.ts).getMinutes()}` : "-");

await page.waitForTimeout(300);
ok("posten syns i den valda dagens lista", /keso/i.test(await text()));

// ── DEN FÅR INTE LÄCKA IN I IDAG ─────────────────────────────────────────
await page.click('[data-till-idag="1"]'); await page.waitForTimeout(500);
ok("tillbaka till idag", (await dagNamn()) === "idag", await dagNamn());
ok("gårdagens post syns inte i dagens lista", !/keso/i.test(await text()));

// ── ÖVERLEVER OMLADDNING ─────────────────────────────────────────────────
await page.reload(); await page.waitForTimeout(1100);
await klick("Mat"); await page.waitForTimeout(600);
await page.click('[data-dag-bak="1"]'); await page.waitForTimeout(500);
ok("posten finns kvar efter omladdning", /keso/i.test(await text()));

// ── FLYTTA I TIDEN ───────────────────────────────────────────────────────
const idPost = await page.evaluate(() => {
  try {
    const l = JSON.parse(localStorage.getItem("atlas.v3.foodLog") || "[]");
    const p = l.filter(e => /keso/i.test(e.name || "")).pop();
    return p ? p.id : null;
  } catch { return null; }
});
ok("posten går att peka ut", !!idPost, String(idPost));

if (idPost) {
  // Öppna redigeringen: raden är en knapp med postens namn.
  await klick("keso"); await page.waitForTimeout(400);
  const harFält = await page.evaluate(id => !!document.querySelector(`[data-flytta-datum="${id}"]`), idPost);
  ok("flytta-fälten finns i redigeringen", harFält);

  if (harFält) {
    const idagFält = await page.evaluate(() => {
      const d = new Date(), p = n => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    });
    ok("datumfältet kan inte peka framåt",
      (await page.evaluate(id => document.querySelector(`[data-flytta-datum="${id}"]`).max, idPost)) === idagFält);

    await page.fill(`[data-flytta-datum="${idPost}"]`, idagFält);
    await page.fill(`[data-flytta-tid="${idPost}"]`, "08:30");
    await page.click(`[data-flytta="${idPost}"]`); await page.waitForTimeout(600);

    const flyttad = (await loggen()).find(e => e.id === idPost);
    const d = flyttad ? new Date(flyttad.ts) : null;
    ok("posten flyttades till idag 08:30",
      !!d && dygn(flyttad.ts) === dygn(await page.evaluate(() => Date.now())) && d.getHours() === 8 && d.getMinutes() === 30,
      d ? d.toISOString() : "borta");
    ok("den försvann ur gårdagens lista", !/keso/i.test(await text()));
  }
}

console.log(steg.join("\n"));
if (fel.length) { console.log("\nPAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await browser.close(); srv.close();
