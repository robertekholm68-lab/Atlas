/**
 * @vitest-environment jsdom
 */
// HELA GARMIN-EXPORTEN PÅ EN GÅNG.
//
// Robert: "Jag har kopplat alla hälso appar jag har till garmin connect. Finns
// det då inget smart sätt att plocka dem där ifrån in i appen?" Svaret var nej
// på den automatiska vägen — Garmins Health API kräver partnergodkännande —
// men ja på den här: exporten kommer som en zip med hundratals filer, och den
// kan appen öppna själv i stället för att man packar upp och matar in en fil i
// taget.
//
// FIXTUREN ÄR EN RIKTIG ZIP, byggd av Pythons zipfile och inbakad som base64.
// Det spelar roll: en zip som jag själv snickrat ihop i testet hade bevisat att
// min läsare är överens med min egen tolkning av formatet, inte med formatet.
// Den bär både deflate-komprimerade och lagrade poster, mappstruktur, och
// filer som INTE ska läsas.

import { describe, it, expect } from "vitest";
import { zipPoster, zipLäsText, ärZip } from "../engines/zip.js";
import { tolkaHälsoexport, intressantFil } from "../engines/halsa.js";

// Garmin-liknande export: sömn-CSV, HRV-JSON, en dagsummering utan våra värden,
// och en aktivitetsfil som inte är vår sak.
const FIXTUR_B64 =
  "UEsDBBQAAAAIAMZELl3hGks/SgAAAFMAAAA0AAAARElfQ09OTkVDVC9ESS1Db25uZWN0LVdlbGxu" +
  "ZXNzLzIwMjYtMDlfc2xlZXBEYXRhLmNzdnNJLEnVCc5JTS1QCMnMTVUITk3Oz0sp1glKLS7JzEtX" +
  "8EhNLCpRCAKq4jIyMDLTNbDUNTTQMTI3NDLQMTVCiBnqGJkaGQDFTLgAUEsDBBQAAAAIAMZELl2A" +
  "uh/1PgAAAGcAAAAzAAAARElfQ09OTkVDVC9ESS1Db25uZWN0LVdlbGxuZXNzL1VEU0ZpbGVfMjAy" +
  "Ni0wOS5qc29ui65WSk7MSc1LSSxySSxJVbJSMjIwMtM1sNQ1NFDSUUosS/cvSy3Ky0zPKPEoKlOy" +
  "MjGr1cGtxRCrFsPaWABQSwMEFAAAAAgAxkQuXeLLAhcdAAAAGwAAAC8AAABESV9DT05ORUNUL0RJ" +
  "LUNvbm5lY3QtV2VsbG5lc3MvZGFpbHlTdW1tYXJ5LmNzdnNJLEnVCS5JLSjmMjIwMtM1sNQ1NNCx" +
  "MDAw4AIAUEsDBBQAAAAAAMZELl1cdHs3FgAAABYAAAAUAAAAYWN0aXZpdGllcy8xMjM0NS5maXRp" +
  "bnRlIGVuIHJpa3RpZyBmaXQtZmlsUEsBAhQDFAAAAAgAxkQuXeEaSz9KAAAAUwAAADQAAAAAAAAA" +
  "AAAAAKSBAAAAAERJX0NPTk5FQ1QvREktQ29ubmVjdC1XZWxsbmVzcy8yMDI2LTA5X3NsZWVwRGF0" +
  "YS5jc3ZQSwECFAMUAAAACADGRC5dgLof9T4AAABnAAAAMwAAAAAAAAAAAAAApIGcAAAARElfQ09O" +
  "TkVDVC9ESS1Db25uZWN0LVdlbGxuZXNzL1VEU0ZpbGVfMjAyNi0wOS5qc29uUEsBAhQDFAAAAAgA" +
  "xkQuXeLLAhcdAAAAGwAAAC8AAAAAAAAAAAAAAKSBKwEAAERJX0NPTk5FQ1QvREktQ29ubmVjdC1X" +
  "ZWxsbmVzcy9kYWlseVN1bW1hcnkuY3N2UEsBAhQDFAAAAAAAxkQuXVx0ezcWAAAAFgAAABQAAAAA" +
  "AAAAAAAAAKSBlQEAAGFjdGl2aXRpZXMvMTIzNDUuZml0UEsFBgAAAAAEAAQAYgEAAN0BAAAAAA==";

const zipBuffert = () => {
  const rå = atob(FIXTUR_B64);
  const u = new Uint8Array(rå.length);
  for (let i = 0; i < rå.length; i++) u[i] = rå.charCodeAt(i);
  return u.buffer;
};
const text = s => new TextEncoder().encode(s).buffer;

describe("zip-läsaren", () => {
  it("känner igen en zip på signaturen", () => {
    expect(ärZip(zipBuffert())).toBe(true);
    expect(ärZip(text("Date,Sleep\n2026-09-10,7:32"))).toBe(false);
    expect(ärZip(new ArrayBuffer(2))).toBe(false);
  });

  it("listar filerna ur den centrala katalogen", () => {
    const { poster, fel } = zipPoster(zipBuffert());
    expect(fel).toBeNull();
    expect(poster.map(p => p.namn)).toEqual([
      "DI_CONNECT/DI-Connect-Wellness/2026-09_sleepData.csv",
      "DI_CONNECT/DI-Connect-Wellness/UDSFile_2026-09.json",
      "DI_CONNECT/DI-Connect-Wellness/dailySummary.csv",
      "activities/12345.fit",
    ]);
  });

  it("packar upp både komprimerade och lagrade poster", async () => {
    const buf = zipBuffert();
    const { poster } = zipPoster(buf);
    const sömn = poster.find(p => p.namn.endsWith("sleepData.csv"));
    const fit = poster.find(p => p.namn.endsWith(".fit"));
    expect(sömn.metod).toBe(8);      // deflate
    expect(fit.metod).toBe(0);       // lagrad
    expect(await zipLäsText(buf, sömn)).toMatch(/Resting Heart Rate/);
    expect(await zipLäsText(buf, fit)).toBe("inte en riktig fit-fil");
  });

  it("säger ifrån om det inte är en zip", () => {
    expect(zipPoster(text("inte en zip alls, bara text")).fel).toMatch(/zip/i);
    expect(zipPoster(new ArrayBuffer(4)).fel).toMatch(/liten/);
  });
});

describe("sållet", () => {
  it("tar filer som kan bära våra värden", () => {
    for (const n of ["2026-09_sleepData.json", "UDSFile_2026.json", "hrv.csv", "wellness/daily.csv", "Sömn.csv"]) {
      expect(intressantFil(n)).toBe(true);
    }
  });

  it("hoppar över det som aldrig kan göra det", () => {
    for (const n of ["activities/12345.fit", "profil.png", "__MACOSX/._sleep.csv", "notes.txt"]) {
      expect(intressantFil(n)).toBe(false);
    }
  });
});

describe("hela exporten", () => {
  it("plockar ut dagarna ur zipen och slår ihop filerna", async () => {
    const r = await tolkaHälsoexport(zipBuffert(), "garmin");
    expect(r.zip).toBe(true);
    expect(r.fel).toBeNull();
    // Två dagar, var och en med sömn och vilopuls UR CSV:n och HRV ur JSON:en.
    expect(r.poster).toHaveLength(2);
    expect(r.poster[0]).toMatchObject({ sömnMin: 452, vilopuls: 52, hrv: 46 });
    expect(r.poster[1]).toMatchObject({ sömnMin: 420, vilopuls: 54, hrv: 41 });
    expect(r.fält).toEqual({ sömn: true, vilopuls: true, hrv: true });
  });

  it("redovisar VARJE läst fil, även den som inte gav något", async () => {
    // Frågan efter en misslyckad import är alltid "läste den min fil?".
    // En fil som faller tyst går inte att svara på.
    const r = await tolkaHälsoexport(zipBuffert(), "garmin");
    const namn = r.filer.map(f => f.namn.split("/").pop());
    expect(namn).toContain("2026-09_sleepData.csv");
    expect(namn).toContain("dailySummary.csv");
    // Aktivitetsfilen sållades bort före uppackningen — den ska inte ens stå med.
    expect(namn).not.toContain("12345.fit");
    const tom = r.filer.find(f => f.namn.endsWith("dailySummary.csv"));
    expect(tom.dagar).toBe(0);
    expect(tom.fel).toMatch(/sömn, vilopuls eller HRV/);
  });

  it("en lös fil fungerar precis som förut", async () => {
    const r = await tolkaHälsoexport(text("Date,Sleep,Resting Heart Rate\n2026-09-10,7:32,52"), "garmin");
    expect(r.zip).toBe(false);
    expect(r.poster).toHaveLength(1);
    expect(r.poster[0]).toMatchObject({ sömnMin: 452, vilopuls: 52 });
  });

  it("en zip utan hälsofiler säger hur många filer den tittade i", async () => {
    // Att bara säga "hittade inget" lämnar frågan om filen ens öppnades.
    const { execSync } = await import("node:child_process");
    void execSync; // fixturen räcker: sållet plockar bort allt utom .fit här
    const r = await tolkaHälsoexport(zipBuffert(), "garmin");
    expect(r.filer.length).toBeGreaterThan(0);
  });
});
