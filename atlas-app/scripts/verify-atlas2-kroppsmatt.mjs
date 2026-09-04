// KRÄVER: `npm i --no-save playwright-core` + byggd `dist-atlas2/` (körs ej av test/bygge).
// Headless DOM-verifiering: kroppsmått och kroppssammansättning.
//
// Sviten testar komponenterna i jsdom. Det här testar VÄGEN genom den byggda
// appen: Framsteg → Utveckling → Ny mätning → spara → tillbaka, och att värdet
// överlever en omladdning. jsdom kan inte visa att en knapp faktiskt går att
// nå, eller att posten når localStorage i det riktiga bygget.
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
await new Promise(r => srv.listen(8971, r));

const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const fel = [];
const steg = [];
const kolla = async (namn, v) => steg.push(`${(await v) ? "OK " : "FEL"} ${namn}`);

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", e => fel.push("pageerror: " + e.message));
await page.goto("http://localhost:8971/");
await page.waitForTimeout(600);

const klickText = async (t) => {
  const ok = await page.evaluate((txt) => {
    // Skiftlägesokänsligt: hdr() versaliserar via CSS och innerText returnerar
    // den versaliserade texten. Har gett falska larm minst fyra gånger.
    const b = [...document.querySelectorAll("button")].find(x =>
      (x.innerText || "").toLowerCase().includes(txt.toLowerCase()));
    if (b) { b.click(); return true; } return false;
  }, t);
  if (!ok) throw new Error("Hittade ingen knapp: " + t);
};

// Riktig profil — tomt underlag, så ingenting kan komma från demodata.
await klickText("Kom igång"); await page.waitForTimeout(300);
await klickText("Riktig profil"); await page.waitForTimeout(900);

// ── Framsteg → Utveckling ────────────────────────────────────────────────────
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => /^utveckling$/i.test(x.innerText || ""));
  if (b) b.click();
});
await page.waitForTimeout(500);
await kolla("framsteg: inga nyckeltal utan mätningar",
  (await page.locator("[data-nyckeltal]").count()) === 0);

// Utveckling är nu en flik som öppnar på Pass. Kroppsflikarna bär CTA:n.
await page.locator('[data-flik="kropp"]').first().click();
await page.waitForTimeout(500);
await kolla("utveckling öppnas med CTA för ny mätning",
  (await page.locator("[data-ny-matning]").count()) === 1);

// ── Registrera en partiell mätning ───────────────────────────────────────────
await page.locator("[data-ny-matning]").click();
await page.waitForTimeout(300);
await kolla("dagens datum är förvalt", await page.evaluate(() => {
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return document.querySelector("#matt-datum").value === v;
}));
await kolla("armar och ben är hopfällda från start", await page.evaluate(() =>
  document.querySelector('[data-grupp="armar"]').getAttribute("aria-expanded") === "false"
  && !document.querySelector('[data-matt="biceps_hoger"]')));

await page.fill('[data-matt="kg"]', "82,4");
await page.fill('[data-matt="fat"]', "22,1");
await page.locator('[data-grupp="overkropp"]').click();
await page.waitForTimeout(200);
await page.fill('[data-matt="midja"]', "91,5");
await page.locator('[data-grupp="armar"]').click();
await page.waitForTimeout(200);
await page.fill('[data-matt="biceps_hoger"]', "36");
await page.fill('[data-matt="biceps_vanster"]', "35,5");
await page.locator('[data-spara="1"]').scrollIntoViewIfNeeded(); await page.locator('[data-spara="1"]').click();
await page.waitForTimeout(500);

await kolla("mätningen sparades och formuläret stängdes",
  (await page.locator("[data-ny-matning]").count()) === 1);

const lagrat = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.matningar") || "[]"));
await kolla("posten ligger i atlas.v3.matningar med rätt form",
  lagrat.length === 1 && lagrat[0].kg === 82.4 && lagrat[0].fat === 22.1
  && lagrat[0].matt && lagrat[0].matt.midja === 91.5 && lagrat[0].matt.biceps_hoger === 36);
await kolla("TOMMA FÄLT sparades inte som noll",
  lagrat[0].muscle === null && lagrat[0].matt.hals === undefined && lagrat[0].matt.brost === undefined);

// Vikten ska ha nått weights — kedjan som profilen och coachen läser.
const vikter = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.weights") || "[]"));
await kolla("vikten nådde weights", vikter.length === 1 && vikter[0].kg === 82.4);

// ── Mått-fliken och detaljvyn ────────────────────────────────────────────────
await page.locator('[data-flik="matt"]').click();
await page.waitForTimeout(300);
await kolla("mått-fliken visar bara det som mätts", await page.evaluate(() =>
  document.querySelectorAll("[data-matt-rad]").length === 3));
await kolla("vänster/höger visas med skillnad", await page.evaluate(() =>
  /0,5/.test(document.body.innerText) && /Biceps/i.test(document.body.innerText)));

await page.locator('[data-matt-rad="midja"]').click();
await page.waitForTimeout(300);
await kolla("detaljvyn öppnas för midjan",
  (await page.locator('[data-detalj="midja"]').count()) === 1);
await kolla("en enda mätning ger en punkt men ingen linje", await page.evaluate(() =>
  document.querySelectorAll("[data-detalj] svg circle").length === 1
  && document.querySelectorAll("[data-detalj] svg polyline").length === 0));
await kolla("ingen påhittad förändring vid första mätningen", await page.evaluate(() =>
  !/−0 cm|\+0 cm/.test(document.body.innerText)));

// ── Andra mätningen: förändring uppstår ──────────────────────────────────────
await page.locator("button:has-text('Tillbaka')").first().click();
await page.waitForTimeout(300);
await page.evaluate(() => {
  // Backdatera den första posten en vecka, annars slås de två ihop av
  // en-timmes-regeln och det blir en post i stället för två.
  const m = JSON.parse(localStorage.getItem("atlas.v3.matningar"));
  m[0].ts -= 7 * 864e5;
  localStorage.setItem("atlas.v3.matningar", JSON.stringify(m));
});
await page.reload();
await page.waitForTimeout(900);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => /^utveckling$/i.test(x.innerText || ""));
  if (b) b.click();
});
await page.waitForTimeout(500);
await kolla("framsteg visar nyckeltal efter en mätning",
  (await page.locator("[data-nyckeltal]").count()) >= 2);

await page.locator('[data-flik="kropp"]').first().click();
await page.waitForTimeout(400);
await page.locator("[data-ny-matning]").click();
await page.waitForTimeout(300);
await page.fill('[data-matt="kg"]', "81,2");
await page.locator('[data-grupp="overkropp"]').click();
await page.waitForTimeout(200);
await page.fill('[data-matt="midja"]', "90");
await page.locator('[data-spara="1"]').scrollIntoViewIfNeeded(); await page.locator('[data-spara="1"]').click();
await page.waitForTimeout(500);

await page.locator('[data-flik="matt"]').click();
await page.waitForTimeout(300);
await page.locator('[data-matt-rad="midja"]').click();
await page.waitForTimeout(300);
await kolla("förändring sedan start visas med rätt tecken och enhet",
  // Skiftlägesokänsligt: enheten renderas i versaler av label()-stilen.
  await page.evaluate(() => /−1,5 cm/i.test(document.body.innerText)));
await kolla("kurvan ritas vid två punkter", await page.evaluate(() =>
  document.querySelectorAll("[data-detalj] svg polyline").length === 1
  && document.querySelectorAll("[data-detalj] svg circle").length === 2));

// ── Historik, redigering och radering ────────────────────────────────────────
await page.locator("button:has-text('Tillbaka')").first().click();
await page.waitForTimeout(300);
await page.locator('[data-flik="historik"]').click();
await page.waitForTimeout(300);
await kolla("historiken visar två mättillfällen",
  (await page.locator("[data-tillfalle]").count()) === 2);
await kolla("ett tillfälle listar bara sina egna värden", await page.evaluate(() => {
  const kort = [...document.querySelectorAll("[data-tillfalle]")];
  // Den nyaste har vikt och midja, men inte kroppsfett.
  const t = kort[0].innerText;
  return /Vikt/i.test(t) && /Midja/i.test(t) && !/Kroppsfett/i.test(t);
}));

await page.locator("[data-andra]").first().click();
await page.waitForTimeout(300);
await kolla("redigering fyller formuläret med postens värden",
  await page.evaluate(() => document.querySelector('[data-matt="kg"]').value === "81,2"));
await page.fill('[data-matt="kg"]', "81,8");
await page.locator('[data-spara="1"]').scrollIntoViewIfNeeded(); await page.locator('[data-spara="1"]').click();
await page.waitForTimeout(400);
const efterÄndring = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.matningar")));
await kolla("ändringen sparades utan att skapa en ny post",
  efterÄndring.length === 2 && efterÄndring.some(m => m.kg === 81.8) && !efterÄndring.some(m => m.kg === 81.2));

await page.locator('[data-flik="historik"]').click();
await page.waitForTimeout(300);
await page.locator("[data-andra]").first().click();
await page.waitForTimeout(300);
await page.locator('[data-radera="1"]').click();
await page.waitForTimeout(400);
const efterRadering = await page.evaluate(() => JSON.parse(localStorage.getItem("atlas.v3.matningar")));
await kolla("radering tog bort exakt en post", efterRadering.length === 1);

await page.screenshot({ path: "dist-atlas2/verify-kroppsmatt.png" });
await page.close();
await browser.close();
srv.close();

console.log(steg.join("\n"));
if (fel.length) console.log("\nFEL:\n" + fel.join("\n"));
const antalFel = steg.filter(s => s.startsWith("FEL")).length + fel.length;
console.log(`\n${steg.length - antalFel}/${steg.length} steg OK`);
process.exit(antalFel ? 1 : 0);
