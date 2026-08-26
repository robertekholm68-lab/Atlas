// KRÄVER: `npm i --no-save playwright-core` + byggd `dist-atlas2/` (körs ej av test/bygge).
// Headless DOM-verifiering: kvinnofiguren i muskelkartan.
//   Kvinna + demo → kvinnofigurens viewBox, egna basbilder, 22 regioner, färg
//   där underlag finns. Man + demo → oförändrad mansfigur. Riktig profil →
//   ingen färg (ärlighet) oavsett figur.
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

const KVINNA = JSON.parse(readFileSync("src/atlas2/body_regions_female.json", "utf8"));
const MAN = JSON.parse(readFileSync("src/atlas2/body_regions.json", "utf8"));
const html = readFileSync("dist-atlas2/atlas2.html", "utf8");
const srv = http.createServer((req, res) => { res.setHeader("Content-Type", "text/html"); res.end(html); });
await new Promise(r => srv.listen(8969, r));

const browser = await chromium.launch({ executablePath: chromiumBin(), headless: true });
const fel = [];
const steg = [];
const kolla = async (namn, v) => steg.push(`${(await v) ? "OK " : "FEL"} ${namn}`);

async function starta(kön, läge, bredd = 390) {
  const page = await browser.newPage({ viewport: { width: bredd, height: 844 } });
  page.on("pageerror", e => fel.push("pageerror: " + e.message));
  await page.goto("http://localhost:8969/");
  await page.waitForTimeout(600);
  const klickText = async (t) => {
    const ok = await page.evaluate((txt) => {
      const b = [...document.querySelectorAll("button")].find(x => (x.innerText || "").toLowerCase().trim() === txt.toLowerCase() || (x.innerText || "").toLowerCase().includes(txt.toLowerCase()));
      if (b) { b.click(); return true; } return false;
    }, t);
    if (!ok) throw new Error("Hittade ingen knapp: " + t);
  };
  if (kön) { await klickText(kön); await page.waitForTimeout(200); }
  await klickText("Kom igång"); await page.waitForTimeout(300);
  await klickText(läge); await page.waitForTimeout(900);
  return page;
}

const läsKarta = (page) => page.evaluate(() => {
  const svgs = [...document.querySelectorAll("svg[aria-label^='Muskelkarta']")];
  const imgs = svgs.map(s => s.parentElement.querySelector("img")).map(i => i && i.getAttribute("src"));
  const regioner = [...document.querySelectorAll("g[data-region]")].map(g => g.dataset.region);
  const färgade = [...document.querySelectorAll("g[data-region] path")].filter(p => Number(p.getAttribute("fill-opacity")) > 0).length;
  const lägen = [...new Set([...document.querySelectorAll("g[data-region] path")].map(p => p.style.mixBlendMode))];
  return { viewBox: svgs.map(s => s.getAttribute("viewBox")), imgs, regioner, färgade, lägen };
});

// ── Kvinna + demo ────────────────────────────────────────────────────────────
{
  const page = await starta("Kvinna", "Demo");
  const k = await läsKarta(page);
  await kolla("kvinna: två vyer med kvinnofigurens viewBox", k.viewBox.length === 2 && k.viewBox.every(v => v === KVINNA.front.viewBox));
  await kolla("kvinna: basbilderna är inbäddade (data-URI) och skilda fram/bak", k.imgs.length === 2 && k.imgs.every(s => s && s.startsWith("data:image/webp")) && k.imgs[0] !== k.imgs[1]);
  await kolla("kvinna: 22 regioner (11 fram + 11 bak)", k.regioner.length === 22);
  await kolla("kvinna: lats, teres och ryggresare finns bakifrån", ["latissimus_dorsi", "teres_major", "erector_spinae", "rotator_cuff", "forearms"].every(id => k.regioner.includes(id)));
  await kolla("kvinna: demo ger färgade former", k.färgade > 0);
  await kolla("kvinna: color + normal, inte multiply", k.lägen.includes("color") && k.lägen.includes("normal") && !k.lägen.includes("multiply"));
  // Hover ska INTE ge något muskelnamn. Raden under figuren är borttagen och
  // <title> likaså — kartan läses som en bild, siffran hämtas i arket.
  //
  // Riktig muspekare, inte ett syntetiskt mouseenter — React lyssnar på
  // mouseover/mouseout och reagerar inte på ett dispatchat mouseenter. Utan
  // det hovrar man aldrig på riktigt och kontrollen blir grön av tomhet.
  await page.locator('g[data-region="quadriceps"] path').first().hover({ force: true });
  await page.waitForTimeout(200);
  // ETT NEGATIVT PÅSTÅENDE MÅSTE KUNNA FALLA. "Namnet syns inte" är sant även
  // på en tom sida, så mätningen bär med sig sina egna förutsättningar:
  // regionerna ska finnas, sidan ska ha text, och den texten ska sakna namnet.
  const h = await page.evaluate(() => ({
    regioner: document.querySelectorAll("g[data-region]").length,
    titlar: document.querySelectorAll("g[data-region] title").length,
    text: document.body.innerText,
  }));
  await kolla("kvinna: hover ger INGET muskelnamn",
    h.regioner === 22 && h.text.length > 50 && !/FRAMSIDA LÅR/i.test(h.text));
  await kolla("kvinna: regionerna har ingen <title>", h.regioner === 22 && h.titlar === 0);
  await page.screenshot({ path: "dist-atlas2/verify-kvinnokarta-mobil.png" });
  await page.close();
}

// ── Kvinna + demo, skrivbord ─────────────────────────────────────────────────
{
  const page = await starta("Kvinna", "Demo", 1280);
  const k = await läsKarta(page);
  await kolla("kvinna skrivbord: kvinnofigurens viewBox", k.viewBox.every(v => v === KVINNA.front.viewBox));
  await page.screenshot({ path: "dist-atlas2/verify-kvinnokarta-desktop.png" });
  await page.close();
}

// ── Man + demo ───────────────────────────────────────────────────────────────
{
  const page = await starta("Man", "Demo");
  const k = await läsKarta(page);
  await kolla("man: mansfigurens viewBox", k.viewBox.every(v => v === MAN.front.viewBox));
  await kolla("man: 22 regioner", k.regioner.length === 22);
  await kolla("man: vader och baksida lår finns bakifrån", ["calves", "hamstrings", "gluteals", "erector_spinae"].every(id => k.regioner.includes(id)));
  // Mansfiguren är numera samma sorts foto som kvinnan — multiply gjorde grönt
  // till oliv mot solbränd hud.
  await kolla("man: color + normal, inte multiply", k.lägen.includes("color") && k.lägen.includes("normal") && !k.lägen.includes("multiply"));
  await page.screenshot({ path: "dist-atlas2/verify-manskarta-mobil.png" });
  await page.close();
}

// ── Inget kön valt + demo: mannen, som förut ─────────────────────────────────
{
  const page = await starta(null, "Demo");
  const k = await läsKarta(page);
  await kolla("inget kön: mansfiguren", k.viewBox.every(v => v === MAN.front.viewBox));
  await page.close();
}

// ── Kvinna + riktig profil: ingen färg utan underlag ─────────────────────────
{
  const page = await starta("Kvinna", "Riktig profil");
  const k = await läsKarta(page);
  await kolla("kvinna riktig: kvinnofiguren visas", k.viewBox.every(v => v === KVINNA.front.viewBox));
  await kolla("kvinna riktig: noll färgade former utan historik", k.färgade === 0);
  await page.close();
}

await browser.close();
srv.close();

console.log(steg.join("\n"));
if (fel.length) console.log("\nFEL:\n" + fel.join("\n"));
const antalFel = steg.filter(s => s.startsWith("FEL")).length + fel.length;
console.log(`\n${steg.length - antalFel}/${steg.length} steg OK`);
process.exit(antalFel ? 1 : 0);
