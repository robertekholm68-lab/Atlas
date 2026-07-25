// Headless DOM-verifiering av v3-backupflödet (export/granska/ersätt/avvisa).
// Kräver: npm i --no-save playwright-core + byggd dist-atlas2. Körs från atlas-app/.
import { chromium } from "playwright-core";
import http from "http";
import { readFileSync, writeFileSync } from "fs";
const html = readFileSync("dist-atlas2/atlas2.html", "utf8");
const srv = http.createServer((q, s) => { s.setHeader("Content-Type", "text/html"); s.end(html); });
await new Promise(r => srv.listen(8934, r));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", headless: true });
const ctx = await b.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
const fel = []; page.on("pageerror", e => fel.push(e.message)); page.on("console", m => { const t = m.text(); if (m.type() === "error" && !/ERR_CONNECTION_RESET|unsupported MIME/.test(t)) fel.push("console: " + t.slice(0,200)); });
const klick = async t => { const ok = await page.evaluate(x => { const k = [...document.querySelectorAll("button")].find(b => (b.innerText||"").toLowerCase().includes(x.toLowerCase())); if (k) { k.click(); return true; } return false; }, t); if (!ok) throw new Error("saknar knapp: " + t); };
const finns = t => page.evaluate(x => (document.body.innerText||"").toLowerCase().includes(x.toLowerCase()), t);
const steg = []; const kolla = async (n, v) => steg.push(`${(await v) ? "OK " : "FEL"} ${n}`);

await page.goto("http://localhost:8934/"); await page.waitForTimeout(700);
await klick("Kom igång"); await page.waitForTimeout(300);
await klick("Riktig profil"); await page.waitForTimeout(500);
// seed lite v3-data direkt i lagringen
await page.evaluate(() => localStorage.setItem("atlas.v3.foodLog", JSON.stringify([{ id: "f_1", name: "testmål", kcal: 500, ts: Date.now() }])));
// öppna menyn (hamburgaren, aria-label Meny)
await page.evaluate(() => { const k = [...document.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === "Meny"); k.click(); });
await page.waitForTimeout(400);
await kolla("datasäkerhet-sektionen syns", finns("Datasäkerhet"));
// exportera → riktig nedladdning
const [dl] = await Promise.all([page.waitForEvent("download"), klick("Spara backup-fil")]);
const path = await dl.path();
const innehåll = JSON.parse(readFileSync(path, "utf8"));
steg.push(`${innehåll.scope === "v3" && innehåll.data["atlas.v3.foodLog"] ? "OK " : "FEL"} exportfilen bär v3-datan (${(await dl.suggestedFilename())})`);
// importera en annan backup — måltiden ska ersättas
const annan = { app: "Askr", scope: "v3", backupVersion: 1, createdAt: new Date().toISOString(), keys: 2, summary: { sessions: 0, foodLog: 1, weights: 0 }, data: { "atlas.v3.foodLog": JSON.stringify([{ id: "f_2", name: "återställd måltid", kcal: 321, ts: Date.now() }]), "atlas.v3.mode": JSON.stringify("real") } };
writeFileSync("/tmp/annan-backup.json", JSON.stringify(annan));
await page.setInputFiles('input[type="file"]', "/tmp/annan-backup.json");
await page.waitForTimeout(400);
await kolla("granskning före skrivning visas", finns("ERSÄTTER all Askr 2.0-data"));
await klick("Ersätt och läs in"); await page.waitForFunction(() => document.readyState === "complete" && (document.body.innerText || "").length > 10, { timeout: 25000 }).catch(() => console.log("VÄNTAN GAV UPP"));
await klick("Mat"); await page.waitForTimeout(400);
await kolla("återställd data efter omladdning", finns("återställd måltid"));
await kolla("gamla måltiden borta (ersatt, inte blandad)", (async () => !(await finns("testmål")))());
// fel fil avvisas ärligt — hamburgaren finns bara på Hem
await klick("Hem"); await page.waitForTimeout(400);
await page.evaluate(() => { const k = [...document.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === "Meny"); k.click(); });
await page.waitForTimeout(300);
writeFileSync("/tmp/v2-backup.json", JSON.stringify({ app: "Askr", backupVersion: 1, data: { "atlas.v2.real.sessions": "[]" } }));
await page.setInputFiles('input[type="file"]', "/tmp/v2-backup.json");
await page.waitForTimeout(300);
await kolla("v2-fil avvisas med förklaring", finns("nuvarande appen"));
console.log(steg.join("\n"));
if (fel.length) { console.log("PAGE ERRORS:\n" + fel.join("\n")); process.exit(1); }
if (steg.some(s => s.startsWith("FEL"))) process.exit(1);
await b.close(); srv.close();
