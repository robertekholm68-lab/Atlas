// Uppföljning av delmål mot loggad data — ärlighetsgrindarna är själva testet.
import { describe, it, expect } from "vitest";
import { delmålStatus, planLäge, nästaDelmål, aktuellVikt } from "../engines/malplan.js";
import { byggMålFrånPlan } from "../engines/intervju.js";

const DAG = 864e5;
const NU = new Date("2026-08-24T12:00:00").getTime();
const START = NU - 28 * DAG;

const mål = () => byggMålFrånPlan({
  klar: true, namn: "Bröllop", typ: "fatloss",
  målDatum: new Date(START + 112 * DAG).toISOString().slice(0, 10),
  beskrivning: "x",
  viktmål: { startKg: 96, målKg: 90 },
  passPerVecka: 3, cardioPerVecka: 0,
  dimensioner: { träning: "a", kost: "b", cardio: "c", vila: "d", sömn: "e" },
}, { nu: START });

describe("delmålStatus", () => {
  it("kommande delmål är kommande — ingen prognos", () => {
    const dm = { id: "x", datum: NU + 14 * DAG, metric: "vikt", target: 94, riktning: "ner" };
    const s = delmålStatus(dm, { weights: [], sessions: [], startDatum: START }, NU);
    expect(s.status).toBe("kommande");
    expect(s.uppmätt).toBe(null);
  });
  it("passerat viktdelmål UTAN vägning nära datumet = ingen_mätning, aldrig en gissning", () => {
    const dm = { id: "x", datum: NU - 10 * DAG, metric: "vikt", target: 94, riktning: "ner" };
    // Enda vägningen ligger 20 dagar från delmålsdatumet — utanför fönstret.
    const s = delmålStatus(dm, { weights: [{ ts: NU - 30 * DAG, kg: 95 }], sessions: [], startDatum: START }, NU);
    expect(s.status).toBe("ingen_mätning");
  });
  it("viktdelmål på väg ner: uppnått vid target eller under, med brusmarginal", () => {
    const dm = { id: "x", datum: NU - 3 * DAG, metric: "vikt", target: 94, riktning: "ner" };
    const bra = delmålStatus(dm, { weights: [{ ts: NU - 3 * DAG, kg: 93.8 }], sessions: [], startDatum: START }, NU);
    expect(bra.status).toBe("uppnått");
    const marginal = delmålStatus(dm, { weights: [{ ts: NU - 3 * DAG, kg: 94.4 }], sessions: [], startDatum: START }, NU);
    expect(marginal.status).toBe("uppnått");
    const dåligt = delmålStatus(dm, { weights: [{ ts: NU - 3 * DAG, kg: 95.6 }], sessions: [], startDatum: START }, NU);
    expect(dåligt.status).toBe("missat");
  });
  it("viktdelmål på väg upp vänder logiken", () => {
    const dm = { id: "x", datum: NU - 3 * DAG, metric: "vikt", target: 74, riktning: "upp" };
    const s = delmålStatus(dm, { weights: [{ ts: NU - 2 * DAG, kg: 74.2 }], sessions: [], startDatum: START }, NU);
    expect(s.status).toBe("uppnått");
  });
  it("pass-delmål räknar ackumulerade styrkepass sedan resans start", () => {
    const dm = { id: "x", datum: NU - DAG, metric: "pass", target: 3 };
    const sessions = [
      { completedAt: START + 2 * DAG }, { completedAt: START + 9 * DAG },
      { completedAt: START + 16 * DAG }, { completedAt: START + 5 * DAG, source: "sport" },
    ];
    const s = delmålStatus(dm, { weights: [], sessions, startDatum: START }, NU);
    expect(s.status).toBe("uppnått");
    expect(s.uppmätt).toBe(3); // sportpasset räknas inte som styrkepass
  });
});

describe("aktuellVikt — färskhetsgrinden", () => {
  it("en vägning äldre än fjorton dagar är inget nuläge", () => {
    const a = aktuellVikt([{ ts: NU - 20 * DAG, kg: 95 }], NU);
    expect(a.kg).toBe(null);
    expect(a.skäl).toMatch(/väg dig/);
  });
  it("ingen vägning alls sägs rakt ut", () => {
    expect(aktuellVikt([], NU).skäl).toMatch(/ingen vägning/);
  });
});

describe("planLäge", () => {
  it("avvikelsen räknas mot planens interpolerade kurva", () => {
    const m = mål(); // 96 → 90 på 112 dagar; efter 28 dagar förväntas 94,5
    const läge = planLäge(m, { weights: [{ ts: NU - DAG, kg: 95.0 }], sessions: [] }, NU);
    expect(läge.förväntadVikt).toBe(94.5);
    expect(läge.viktAvvikelse).toBe(0.5);
  });
  it("gammal vägning ger skäl i stället för siffra", () => {
    const läge = planLäge(mål(), { weights: [{ ts: NU - 20 * DAG, kg: 95 }], sessions: [] }, NU);
    expect(läge.viktAvvikelse).toBe(null);
    expect(läge.viktSkäl).toMatch(/väg dig/);
  });
  it("passavvikelsen är loggat minus förväntat", () => {
    const sessions = [{ completedAt: START + 2 * DAG }, { completedAt: START + 9 * DAG }];
    const läge = planLäge(mål(), { weights: [], sessions }, NU);
    expect(läge.passAvvikelse).toBe(2 - 12); // 4 veckor × 3 pass förväntat
  });
  it("nästa delmål är det närmast framtida", () => {
    const n = nästaDelmål(mål(), NU);
    expect(n).not.toBeNull();
    expect(n.datum).toBeGreaterThan(NU);
  });
});
