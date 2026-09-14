// SÖMN, VILOPULS OCH HRV UR EN EXPORTFIL — steg 2 av klockkopplingen.
//
// Steg 1 var livepuls över Bluetooth (verifierad med HRM 600 2026-09-14).
// Det här är den data som faktiskt kan göra readiness till mer än en
// träningsbaserad skattning: sömn, vilopuls, HRV. Vägen är filexport, för den
// är den enda som är öppen för alla märken — Garmins API kräver
// partnergodkännande och Apple Hälsa går bara att nå från en native app.
//
// FIXTURERNA ÄR KONSTRUERADE, INTE RIKTIGA EXPORTER. De speglar formerna vi
// vet förekommer (kolumnrubriker på engelska och svenska, sekunder och "7h 32m",
// Garmins nästlade JSON) — men ingen riktig Garmin-fil har passerat den här
// koden än. Det är skillnaden mellan "tolerant mot kända former" och
// "verifierad mot verkligheten", och den skillnaden ska stå kvar tills Robert
// kört en riktig fil.

import { describe, it, expect } from "vitest";
import {
  tolkaSömnMin, byggHälsodag, tolkaHälsofil, slåIhopHälsa,
  hälsoSerie, senasteHälsa, hälsoSnitt, visaSömn, hälsoUnderlag,
} from "../engines/halsa.js";

const dag = (å, m, d) => new Date(å, m - 1, d, 12, 0, 0).getTime();
const midnatt = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

describe("sömn till minuter", () => {
  it("läser de former exporterna faktiskt använder", () => {
    expect(tolkaSömnMin("7h 32m")).toBe(452);
    expect(tolkaSömnMin("7 tim 32 min")).toBe(452);
    expect(tolkaSömnMin("7:32")).toBe(452);
    expect(tolkaSömnMin("7:32:00")).toBe(452);
    expect(tolkaSömnMin("452 min")).toBe(452);
  });

  it("gissar enheten ur storleken när talet är blankt", () => {
    expect(tolkaSömnMin(7.5)).toBe(450);        // timmar
    expect(tolkaSömnMin("7,5")).toBe(450);      // svenskt decimaltecken
    expect(tolkaSömnMin(452)).toBe(452);        // minuter
    expect(tolkaSömnMin(27120)).toBe(452);      // sekunder
    // GRÄNSFALLET, dokumenterat: 1440 läses som en dags minuter, inte som
    // 24 minuters sekunder. Rätt gissning — 24 minuter är ingen natt.
    expect(tolkaSömnMin(1440)).toBe(1440);
  });

  it("tomt är tomt, inte noll", () => {
    expect(tolkaSömnMin(null)).toBeNull();
    expect(tolkaSömnMin("")).toBeNull();
    expect(tolkaSömnMin("–")).toBeNull();
    expect(tolkaSömnMin(0)).toBeNull();
  });
});

describe("byggHälsodag", () => {
  it("stämplar på kalenderdygnet, inte på klockslaget", () => {
    const p = byggHälsodag({ dag: dag(2026, 9, 12), sömnMin: 452 });
    expect(p.dag).toBe(midnatt(dag(2026, 9, 12)));
  });

  it("orimliga värden sparas inte — hellre lucka än påhittat tal", () => {
    // 18 timmar (1100 min) är en veckosumma eller fel enhet, inte en natt;
    // vilopuls 12 är en tom cell som blivit en nolla.
    expect(byggHälsodag({ dag: dag(2026, 9, 12), sömnMin: 1100 })).toBeNull();
    // Men 13 timmar är en lång natt när man är sjuk — den ska sparas.
    expect(byggHälsodag({ dag: dag(2026, 9, 12), sömnMin: 780 }).sömnMin).toBe(780);
    expect(byggHälsodag({ dag: dag(2026, 9, 12), vilopuls: 12 })).toBeNull();
    expect(byggHälsodag({ dag: dag(2026, 9, 12), hrv: 900 })).toBeNull();
    // Men ett rimligt värde bredvid ett orimligt räddar posten — utan det dåliga.
    const p = byggHälsodag({ dag: dag(2026, 9, 12), sömnMin: 452, vilopuls: 12 });
    expect(p.sömnMin).toBe(452);
    expect(p.vilopuls).toBeNull();
  });

  it("en dag utan ett enda värde är ingen post", () => {
    expect(byggHälsodag({ dag: dag(2026, 9, 12) })).toBeNull();
    expect(byggHälsodag({ sömnMin: 452 })).toBeNull();
  });
});

describe("CSV", () => {
  it("läser engelska rubriker med sekunder", () => {
    const csv = [
      "Date,Sleep Time Seconds,Resting Heart Rate,HRV",
      "2026-09-12,27120,52,46",
      "2026-09-13,25200,54,41",
    ].join("\n");
    const r = tolkaHälsofil(csv, "garmin");
    expect(r.format).toBe("csv");
    expect(r.fel).toBeNull();
    expect(r.poster).toHaveLength(2);
    expect(r.poster[0]).toMatchObject({ sömnMin: 452, vilopuls: 52, hrv: 46, källa: "garmin" });
    expect(r.fält).toEqual({ sömn: true, vilopuls: true, hrv: true });
  });

  it("läser svenska rubriker och '7h 32m'", () => {
    const csv = "Datum;Sömn;Vilopuls\n2026-09-12;7h 32m;52";
    const r = tolkaHälsofil(csv);
    expect(r.poster[0]).toMatchObject({ sömnMin: 452, vilopuls: 52 });
    expect(r.poster[0].hrv).toBeNull();
  });

  it("sömnPOÄNG är inte sömnLÄNGD", () => {
    // "Sleep Score 82" hade blivit 82 minuters sömn utan undantaget.
    const r = tolkaHälsofil("Date,Sleep Score,Resting Heart Rate\n2026-09-12,82,52");
    expect(r.poster[0].sömnMin).toBeNull();
    expect(r.poster[0].vilopuls).toBe(52);
  });

  it("en oläsbar rad hoppas över, resten tolkas", () => {
    const csv = "Date,Sleep\n2026-09-12,7:30\ntrasig rad utan datum,x\n2026-09-13,8:00";
    expect(tolkaHälsofil(csv).poster).toHaveLength(2);
  });

  it("säger vad som saknas i stället för att returnera tomt", () => {
    expect(tolkaHälsofil("Steps,Calories\n1000,2000").fel).toMatch(/datumkolumn/);
    expect(tolkaHälsofil("Date,Steps\n2026-09-12,1000").fel).toMatch(/sömn, vilopuls eller HRV/);
    expect(tolkaHälsofil("").fel).toMatch(/tom/);
  });
});

describe("JSON", () => {
  it("hittar dagposter djupt i Garmins form", () => {
    const json = JSON.stringify({
      userProfile: "robert",
      dailySummaries: [
        { calendarDate: "2026-09-12", restingHeartRate: 52, sleepTimeSeconds: 27120 },
        { calendarDate: "2026-09-13", restingHeartRate: 54, sleepTimeSeconds: 25200 },
      ],
    });
    const r = tolkaHälsofil(json, "garmin");
    expect(r.format).toBe("json");
    expect(r.poster).toHaveLength(2);
    expect(r.poster[0]).toMatchObject({ sömnMin: 452, vilopuls: 52 });
  });

  it("tar HRV ur en annan fil med annan nyckel", () => {
    const r = tolkaHälsofil(JSON.stringify([{ date: "2026-09-12", avgOvernightHrv: 46 }]));
    expect(r.poster[0].hrv).toBe(46);
    expect(r.fält).toEqual({ sömn: false, vilopuls: false, hrv: true });
  });

  it("tål sekundstämplar som tal", () => {
    const ts = Math.floor(dag(2026, 9, 12) / 1000);
    const r = tolkaHälsofil(JSON.stringify([{ timestamp: ts, restingHeartRate: 52 }]));
    expect(r.poster[0].dag).toBe(midnatt(dag(2026, 9, 12)));
  });

  it("trasig JSON säger att den är trasig", () => {
    expect(tolkaHälsofil("{ inte json").fel).toBeTruthy();
  });
});

describe("sammanslagning", () => {
  it("två filer fyller SAMMA dag, inte två poster", () => {
    // Sömnfilen först, vilopulsfilen sedan — dagen ska bära båda.
    const a = tolkaHälsofil("Date,Sleep\n2026-09-12,7:32").poster;
    const b = tolkaHälsofil("Date,Resting Heart Rate\n2026-09-12,52").poster;
    const ut = slåIhopHälsa(slåIhopHälsa([], a), b);
    expect(ut).toHaveLength(1);
    expect(ut[0]).toMatchObject({ sömnMin: 452, vilopuls: 52 });
  });

  it("ett tomt fält skriver ALDRIG över ett ifyllt", () => {
    const bef = [{ dag: midnatt(dag(2026, 9, 12)), sömnMin: 452, vilopuls: 52, hrv: 46 }];
    const ut = slåIhopHälsa(bef, [{ dag: midnatt(dag(2026, 9, 12)), sömnMin: null, vilopuls: 50, hrv: null }]);
    expect(ut[0]).toMatchObject({ sömnMin: 452, vilopuls: 50, hrv: 46 });
  });

  it("samma fil två gånger ger samma antal dagar", () => {
    const p = tolkaHälsofil("Date,Sleep,Resting Heart Rate\n2026-09-12,7:32,52\n2026-09-13,8:00,54").poster;
    expect(slåIhopHälsa(slåIhopHälsa([], p), p)).toHaveLength(2);
  });

  it("sorterar äldst först", () => {
    const ut = slåIhopHälsa([], [
      byggHälsodag({ dag: dag(2026, 9, 13), vilopuls: 54 }),
      byggHälsodag({ dag: dag(2026, 9, 11), vilopuls: 52 }),
    ]);
    expect(ut.map(p => p.vilopuls)).toEqual([52, 54]);
  });
});

describe("avläsning", () => {
  const nu = dag(2026, 9, 14);
  const poster = [
    byggHälsodag({ dag: dag(2026, 9, 10), sömnMin: 420, vilopuls: 55 }),
    byggHälsodag({ dag: dag(2026, 9, 11), sömnMin: 450, vilopuls: 53 }),
    byggHälsodag({ dag: dag(2026, 9, 12), sömnMin: 480, vilopuls: 52 }),
    byggHälsodag({ dag: dag(2026, 9, 13), vilopuls: 52 }),
  ];

  it("serien tar bara dagar som har värdet", () => {
    expect(hälsoSerie(poster, "sömnMin", 30, nu)).toHaveLength(3);
    expect(hälsoSerie(poster, "vilopuls", 30, nu)).toHaveLength(4);
    expect(hälsoSerie(poster, "hrv", 30, nu)).toHaveLength(0);
  });

  it("senaste är senaste MED värdet, inte senaste posten", () => {
    expect(senasteHälsa(poster, "sömnMin").dag).toBe(midnatt(dag(2026, 9, 12)));
    expect(senasteHälsa(poster, "hrv")).toBeNull();
  });

  it("snittet kräver underlag", () => {
    expect(hälsoSnitt(poster, "sömnMin", 7, nu)).toBe(450);
    // Två nätter är inte ett snitt — det är två nätter.
    expect(hälsoSnitt(poster.slice(0, 2), "sömnMin", 7, nu)).toBeNull();
    expect(hälsoSnitt(poster, "hrv", 7, nu)).toBeNull();
  });

  it("underlaget säger vad som finns och vad som saknas", () => {
    const u = hälsoUnderlag(poster, nu);
    expect(u.finns).toEqual(["sömn", "vilopuls"]);
    expect(u.saknas).toEqual(["HRV"]);
    // Gammal data räknas inte som underlag för i dag.
    const gammal = [byggHälsodag({ dag: dag(2026, 8, 1), sömnMin: 450 })];
    expect(hälsoUnderlag(gammal, nu).finns).toEqual([]);
  });

  it("visaSömn är för ögat, minuterna är sanningen", () => {
    expect(visaSömn(452)).toBe("7 h 32 min");
    expect(visaSömn(480)).toBe("8 h");
    expect(visaSömn(null)).toBeNull();
  });
});

describe("readiness rörs inte av det här", () => {
  it("motorn exporterar inget som räknar om readiness", async () => {
    // Att börja väga in sömn i ett tal användaren redan känner igen är ett
    // eget beslut. Importen tar det inte i tysthet — och det här testet
    // faller den dag någon lägger till det utan att säga det.
    const m = await import("../engines/halsa.js");
    expect(Object.keys(m).some(k => /readiness/i.test(k))).toBe(false);
  });
});
