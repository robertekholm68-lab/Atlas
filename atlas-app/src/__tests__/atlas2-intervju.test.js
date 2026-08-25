// Målintervjun — motorn som validerar modellens plan och genererar delmålen.
// Modellen testas inte här (den är inte deterministisk); allt runt den är det.
import { describe, it, expect } from "vitest";
import {
  viktbana, byggIntervjuUnderlag, intervjuMeddelande, tolkaIntervjuSvar,
  valideraPlan, genereraDelmål, byggMålFrånPlan, SÄKRA_TAKTER, INTERVJU_SYSTEMPROMPT,
} from "../engines/intervju.js";
import { resa } from "../engines/journey.js";

const DAG = 864e5;
const NU = new Date("2026-08-24T12:00:00").getTime();
const veckorFram = v => NU + v * 7 * DAG;
const iso = ms => new Date(ms).toISOString().slice(0, 10);

const okPlan = (över = {}) => ({
  klar: true, namn: "Bröllop", typ: "fatloss", målDatum: iso(veckorFram(16)),
  beskrivning: "Ner i vikt till bröllopet.",
  viktmål: { startKg: 96, målKg: 90 },
  passPerVecka: 3, cardioPerVecka: 2,
  dimensioner: { träning: "a", kost: "b", cardio: "c", vila: "d", sömn: "e" },
  ...över,
});
const transkript = [{ från: "du", text: "Jag väger 96 och vill ner till 90 innan bröllopet" }];

describe("viktbana", () => {
  it("godkänner en rimlig takt", () => {
    const b = viktbana({ startKg: 96, målKg: 90, målDatum: veckorFram(16), nu: NU });
    expect(b.ok).toBe(true);
    expect(b.ner).toBe(true);
    expect(b.pctPerVecka).toBeLessThan(SÄKRA_TAKTER.nerMaxPct);
  });
  it("underkänner en orealistisk deadline och räknar fram tidigast rimliga datum", () => {
    const b = viktbana({ startKg: 96, målKg: 88, målDatum: veckorFram(3), nu: NU });
    expect(b.ok).toBe(false);
    // 8 kg i rekommenderad takt (0,6 % av 96 ≈ 0,58 kg/v) ≈ 14 veckor
    expect(b.tidigasteDatum).toBeGreaterThan(veckorFram(12));
  });
  it("uppbyggnad har egna, snävare gränser", () => {
    const b = viktbana({ startKg: 70, målKg: 76, målDatum: veckorFram(8), nu: NU });
    expect(b.ner).toBe(false);
    expect(b.ok).toBe(false); // 6 kg upp på 8 veckor > 0,5 %/v
  });
});

describe("tolkaIntervjuSvar", () => {
  it("en fråga är en fråga", () => {
    const r = tolkaIntervjuSvar("När är bröllopet?");
    expect(r.typ).toBe("fråga");
    expect(r.text).toBe("När är bröllopet?");
  });
  it("hittar planen även inuti kodstaket och kringtext", () => {
    const r = tolkaIntervjuSvar('Här är planen:\n```json\n' + JSON.stringify(okPlan()) + "\n```");
    expect(r.typ).toBe("plan");
    expect(r.plan.namn).toBe("Bröllop");
  });
  it("trasig JSON blir ogiltig, inte en krasch", () => {
    const r = tolkaIntervjuSvar('{"klar": true, "namn": ');
    expect(r.typ).toBe("ogiltig");
  });
  it("tomt svar rapporteras som tomt", () => {
    expect(tolkaIntervjuSvar("").typ).toBe("tomt");
  });
});

describe("valideraPlan", () => {
  const underlag = { senasteViktKg: 96 };

  it("släpper igenom en komplett, rimlig plan", () => {
    const v = valideraPlan(okPlan(), { underlag, transkript, nu: NU });
    expect(v.fel).toEqual([]);
    expect(v.ok).toBe(true);
    expect(v.bana.ok).toBe(true);
  });
  it("kräver måldatum", () => {
    const v = valideraPlan(okPlan({ målDatum: null }), { underlag, transkript, nu: NU });
    expect(v.ok).toBe(false);
    expect(v.fel.join()).toMatch(/målDatum/);
  });
  it("underkänner datum bakåt i tiden", () => {
    const v = valideraPlan(okPlan({ målDatum: iso(NU - 30 * DAG) }), { underlag, transkript, nu: NU });
    expect(v.ok).toBe(false);
  });
  it("underkänner en osäker viktbana med besked om tidigast rimliga datum", () => {
    const v = valideraPlan(okPlan({ målDatum: iso(veckorFram(3)), viktmål: { startKg: 96, målKg: 88 } }),
      { underlag, transkript: [{ från: "du", text: "96 till 88" }], nu: NU });
    expect(v.ok).toBe(false);
    expect(v.fel.join()).toMatch(/säker gräns/);
  });
  it("SPÅRBARHET: en startvikt modellen hittat på fälls", () => {
    // Ingen mätdata, och användaren har aldrig sagt 95.
    const v = valideraPlan(okPlan({ viktmål: { startKg: 95, målKg: 90 } }),
      { underlag: { senasteViktKg: null }, transkript: [{ från: "du", text: "vill ner till 90" }], nu: NU });
    expect(v.ok).toBe(false);
    expect(v.fel.join()).toMatch(/startKg/);
  });
  it("startvikt ur användarens egna ord godkänns utan mätdata", () => {
    const v = valideraPlan(okPlan(), { underlag: { senasteViktKg: null }, transkript, nu: NU });
    expect(v.ok).toBe(true);
  });
  it("kräver alla fem dimensioner", () => {
    const p = okPlan(); delete p.dimensioner.sömn;
    const v = valideraPlan(p, { underlag, transkript, nu: NU });
    expect(v.fel.join()).toMatch(/sömn/);
  });
  it("passPerVecka utanför 1–7 fälls", () => {
    const v = valideraPlan(okPlan({ passPerVecka: 9 }), { underlag, transkript, nu: NU });
    expect(v.ok).toBe(false);
  });
});

describe("genereraDelmål", () => {
  it("delmålen är daterade, sorterade och slutar på målvärdet", () => {
    const dm = genereraDelmål(okPlan(), { nu: NU });
    const vikt = dm.filter(d => d.metric === "vikt");
    expect(vikt.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < dm.length; i++) expect(dm[i].datum).toBeGreaterThanOrEqual(dm[i - 1].datum);
    expect(vikt[vikt.length - 1].target).toBe(90);
    // Monotont fallande mot målet — inga hopp uppåt på vägen ner.
    for (let i = 1; i < vikt.length; i++) expect(vikt[i].target).toBeLessThanOrEqual(vikt[i - 1].target);
    expect(vikt[0].riktning).toBe("ner");
  });
  it("pass-delmålen är ackumulerade ur pass per vecka", () => {
    const dm = genereraDelmål(okPlan(), { nu: NU });
    const pass = dm.filter(d => d.metric === "pass");
    const sista = pass[pass.length - 1];
    expect(sista.target).toBe(Math.round(16 * 3)); // 16 veckor × 3 pass
  });
  it("utan cardio i planen genereras inga cardio-delmål", () => {
    const dm = genereraDelmål(okPlan({ cardioPerVecka: 0 }), { nu: NU });
    expect(dm.filter(d => d.metric === "cardio")).toEqual([]);
  });
  it("SÖMN OCH VILA FÅR ALDRIG DELMÅL — ingen datakälla, inga påhittade mätpunkter", () => {
    const dm = genereraDelmål(okPlan(), { nu: NU });
    expect(dm.every(d => ["vikt", "pass", "cardio"].includes(d.metric))).toBe(true);
  });
});

describe("byggMålFrånPlan", () => {
  it("bygger ett mål som journey-motorn kan räkna resa på", () => {
    const mål = byggMålFrånPlan(okPlan(), { nu: NU });
    expect(mål.typ).toBe("fatloss");
    expect(mål.plan.dimensioner.sömn).toBe("e");
    expect(mål.delmål.length).toBeGreaterThan(0);
    const r = resa(mål, [], NU + DAG);
    expect(r).not.toBeNull();
    expect(r.veckorKvar).toBeGreaterThan(10);
    expect(r.aktivFas).toBeTruthy();
  });
});

describe("byggIntervjuUnderlag", () => {
  it("färsk vikt går in, gammal vikt blir ärligt 'saknas'", () => {
    const färsk = byggIntervjuUnderlag({ weights: [{ ts: NU - 2 * DAG, kg: 96 }], nu: NU });
    expect(färsk.senasteViktKg).toBe(96);
    expect(färsk.viktMätningSaknas).toBe(false);
    const gammal = byggIntervjuUnderlag({ weights: [{ ts: NU - 60 * DAG, kg: 96 }], nu: NU });
    expect(gammal.senasteViktKg).toBe(null);
    expect(gammal.viktMätningSaknas).toBe(true);
  });
  it("träningsrytmen räknas ur loggen, uppdelad på styrka och cardio", () => {
    const sessions = [
      { completedAt: NU - 3 * DAG, sets: [] },
      { completedAt: NU - 10 * DAG, sets: [] },
      { completedAt: NU - 5 * DAG, source: "sport" },
    ];
    const u = byggIntervjuUnderlag({ sessions, nu: NU });
    expect(u.styrkepassSenaste4v).toBe(2);
    expect(u.cardiopassSenaste4v).toBe(1);
  });
  it("meddelandet bär både underlag och transkript", () => {
    const m = intervjuMeddelande({ underlag: { idag: "2026-08-24" }, transkript });
    expect(m).toMatch(/2026-08-24/);
    expect(m).toMatch(/Användaren: Jag väger 96/);
  });
});

describe("underlaget bär användarens faktiska värden", () => {
  it("program, readiness, kostmål, kroppsfett och styrketrend följer med", () => {
    const u = byggIntervjuUnderlag({
      weights: [{ ts: NU - 50 * DAG, kg: 98 }, { ts: NU - DAG, kg: 95 }],
      sessions: [{ completedAt: NU - 3 * DAG, sets: [] }],
      profile: { sex: "m", gender: "male", age: 57, height: 180, level: "intermediate" },
      activeProgram: { name: "Upper/Lower", daysPerWeek: 4, goal: "Hypertrophy" },
      readiness: 65,
      nutritionTargets: { kcal: 2400, protein: 170 },
      styrketrend: { name: "Bänkpress", delta: 5 },
      nu: NU,
    });
    expect(u.aktivtProgram.namn).toBe("Upper/Lower");
    expect(u.aktivtProgram.passPerVecka).toBe(4);
    expect(u.readinessIdag).toBe(65);
    expect(u.kostmål).toEqual({ kcal: 2400, proteinG: 170 });
    expect(u.bästaStyrketrend).toEqual({ övning: "Bänkpress", förändring: 5 });
    // Viktriktningen åtta veckor tillbaka — vad kroppen FAKTISKT gjort.
    expect(u.viktförändring8vKg).toBe(-3);
  });

  it("saknade värden blir null, aldrig nollor — modellen ska se skillnad", () => {
    const u = byggIntervjuUnderlag({ nu: NU });
    expect(u.aktivtProgram).toBe(null);
    expect(u.readinessIdag).toBe(null);
    expect(u.kostmål).toBe(null);
    expect(u.bästaStyrketrend).toBe(null);
    expect(u.viktförändring8vKg).toBe(null);
    expect(u.kroppsfettProcent).toBe(null);
  });

  it("en enda vägning ger ingen trend — en punkt är ingen riktning", () => {
    const u = byggIntervjuUnderlag({ weights: [{ ts: NU - DAG, kg: 95 }], nu: NU });
    expect(u.senasteViktKg).toBe(95);
    expect(u.viktförändring8vKg).toBe(null);
  });

  it("prompten kräver att underlaget används aktivt", () => {
    expect(INTERVJU_SYSTEMPROMPT).toMatch(/ANVÄND UNDERLAGET AKTIVT/);
    expect(INTERVJU_SYSTEMPROMPT).toMatch(/generiskt samtal är ett misslyckande/);
  });
});
