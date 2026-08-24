// Målresan som DAGLIGT besked — kopplingen delmål → coachens resonemang.
// Ärlighetsgrindarna är själva testet: går läget inte att mäta ska det sägas,
// aldrig extrapoleras.
import { describe, it, expect } from "vitest";
import { coachFacts, målfokus } from "../engines/facts.js";
import { byggMålFrånPlan } from "../engines/intervju.js";

const DAG = 864e5;
const NU = Date.now();
const START = NU - 28 * DAG;

const planeratMål = () => byggMålFrånPlan({
  klar: true, namn: "Bröllop", typ: "fatloss",
  målDatum: new Date(START + 112 * DAG).toISOString().slice(0, 10),
  beskrivning: "x",
  viktmål: { startKg: 96, målKg: 90 },   // efter 28 dagar förväntas 94,5
  passPerVecka: 3, cardioPerVecka: 0,
  dimensioner: { träning: "a", kost: "b", cardio: "c", vila: "d", sömn: "e" },
}, { nu: START });

// Mål satt gamla vägen — utan plan.
const gammaltMål = { id: "g1", typ: "muscle", namn: "Muskelmassa", startDatum: START, målDatum: START + 84 * DAG, passPerVecka: 3 };

// Tolv pass jämnt fördelade = exakt i fas med 3/vecka i fyra veckor.
const passIFas = Array.from({ length: 12 }, (_, i) => ({ completedAt: START + (i + 1) * 2.3 * DAG, sets: [{ weight: 60, reps: 8 }], muscleLoads: { chest: 4 } }));

describe("facts.målresa med plan", () => {
  it("planläget följer med när målet har en plan", () => {
    const f = coachFacts({ sessions: passIFas, goal: planeratMål(), weights: [{ ts: NU - DAG, kg: 94.5 }] });
    expect(f.målresa.harPlan).toBe(true);
    expect(f.målresa.förväntadVikt).toBe(94.5);
    expect(f.målresa.viktAvvikelse).toBe(0);
    expect(f.målresa.nästaMätbara).not.toBeNull();
    expect(f.målresa.dimensioner.sömn).toBe("e");
  });
  it("ett mål UTAN plan får harPlan false och inga planfält", () => {
    const f = coachFacts({ sessions: passIFas, goal: gammaltMål, weights: [] });
    expect(f.målresa.namn).toBe("Muskelmassa");
    expect(f.målresa.harPlan).toBe(false);
    expect(f.målresa.viktAvvikelse).toBe(null);
    // Fasdelmålen finns kvar — gamla vägen är oförändrad.
    expect(f.målresa.fas).toBeTruthy();
  });
  it("utan mål alls är blocket tomt", () => {
    const f = coachFacts({ sessions: passIFas });
    expect(f.målresa.namn).toBe(null);
    expect(f.målresa.harPlan).toBe(false);
  });
});

describe("målfokus", () => {
  it("null utan mål och utan plan — anroparen visar fasvyn som förut", () => {
    expect(målfokus(coachFacts({ sessions: [] }))).toBeNull();
    expect(målfokus(coachFacts({ sessions: passIFas, goal: gammaltMål }))).toBeNull();
  });

  it("i fas: beskedet säger det, utan att skruva upp något", () => {
    const f = coachFacts({ sessions: passIFas, goal: planeratMål(), weights: [{ ts: NU - DAG, kg: 94.5 }] });
    const fokus = målfokus(f);
    expect(fokus.status).toBe("i_fas");
    expect(fokus.besked).toMatch(/i fas/i);
    expect(fokus.rader.join(" ")).toMatch(/kurva/);
  });

  it("efter plan: beskedet pekar på passet idag", () => {
    // 96,5 kg när 94,5 förväntas = 2 kg efter på vägen ner.
    const f = coachFacts({ sessions: passIFas, goal: planeratMål(), weights: [{ ts: NU - DAG, kg: 96.5 }] });
    const fokus = målfokus(f);
    expect(fokus.status).toBe("efter");
    expect(fokus.besked).toMatch(/efter planen/i);
    expect(fokus.rader.join(" ")).toMatch(/2 kg över kurvan/);
  });

  it("före plan: beskedet manar INTE på — håll takten", () => {
    const f = coachFacts({ sessions: passIFas, goal: planeratMål(), weights: [{ ts: NU - DAG, kg: 92.5 }] });
    const fokus = målfokus(f);
    expect(fokus.status).toBe("före");
    expect(fokus.besked).toMatch(/håll takten/i);
    expect(fokus.besked).not.toMatch(/mer|hårdare|öka/i);
  });

  it("BRUSTRÖSKELN: 0,3 kg är ingen avvikelse — det är i fas", () => {
    const f = coachFacts({ sessions: passIFas, goal: planeratMål(), weights: [{ ts: NU - DAG, kg: 94.8 }] });
    expect(målfokus(f).status).toBe("i_fas");
  });

  it("ÄRLIGHET: gammal vägning ger 'går inte att bedöma', aldrig extrapolering", () => {
    const f = coachFacts({ sessions: passIFas, goal: planeratMål(), weights: [{ ts: NU - 30 * DAG, kg: 96 }] });
    const fokus = målfokus(f);
    expect(fokus.status).toBe("omätbart");
    expect(fokus.besked).toMatch(/kan inte säga/i);
    expect(fokus.rader.join(" ")).toMatch(/väg dig/);
    // Ingen siffra om var vikten LIGGER — bara den förväntade får nämnas.
    expect(fokus.rader.join(" ")).not.toMatch(/kg över|kg under/);
  });

  it("passavvikelsen räknas med och kan ensam ge 'efter'", () => {
    const f = coachFacts({ sessions: [{ completedAt: START + 2 * DAG, sets: [] }], goal: planeratMål(), weights: [{ ts: NU - DAG, kg: 94.5 }] });
    const fokus = målfokus(f);
    expect(fokus.rader.join(" ")).toMatch(/pass efter plan/);
    expect(fokus.status).toBe("efter");
  });

  it("passerat måldatum får sitt eget besked", () => {
    const m = byggMålFrånPlan({
      klar: true, namn: "Klart", typ: "fatloss",
      målDatum: new Date(NU - 2 * DAG).toISOString().slice(0, 10),
      viktmål: null, passPerVecka: 3, cardioPerVecka: 0,
      dimensioner: { träning: "a", kost: "b", cardio: "c", vila: "d", sömn: "e" },
    }, { nu: NU - 100 * DAG });
    const fokus = målfokus(coachFacts({ sessions: passIFas, goal: m, weights: [] }));
    expect(fokus.status).toBe("passerat");
    expect(fokus.besked).toMatch(/nytt mål/i);
  });
});

describe("LLM-underlaget", () => {
  it("planläget följer med till modellen — och talen blir därmed tillåtna", async () => {
    const { byggUnderlag, tillåtnaTal } = await import("../engines/coach-llm.js");
    const f = coachFacts({ sessions: passIFas, goal: planeratMål(), weights: [{ ts: NU - DAG, kg: 96.5 }] });
    const u = byggUnderlag(f);
    expect(u.målresa).toBe("Bröllop");
    expect(u.nästaDelmål).not.toBeNull();
    expect(u.viktAvvikelseMotPlan).toBe(2);
    expect(u.planensRiktlinjer.sömn).toBe("e");
    // Talkontrollen ska godkänna ett svar som använder avvikelsen.
    expect(tillåtnaTal(u).has("2")).toBe(true);
  });
  it("utan plan skickas inga målfält — inga nollor modellen kan misstolka", async () => {
    const { byggUnderlag } = await import("../engines/coach-llm.js");
    const u = byggUnderlag(coachFacts({ sessions: passIFas, goal: gammaltMål, weights: [] }));
    expect("målresa" in u).toBe(false);
    expect("viktAvvikelseMotPlan" in u).toBe(false);
  });
});
