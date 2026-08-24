// Målresan → programval. Bron mellan planen och programmotorn.
import { describe, it, expect } from "vitest";
import { programkriterier, programförslag, passarAktivtProgram } from "../engines/malprogram.js";
import { byggMålFrånPlan } from "../engines/intervju.js";
import { ALL_TEMPLATES } from "../engines/programs.js";

const DAG = 864e5;
const NU = Date.now();

const mål = (över = {}) => byggMålFrånPlan({
  klar: true, namn: "Bröllop", typ: "fatloss",
  målDatum: new Date(NU + 112 * DAG).toISOString().slice(0, 10),
  beskrivning: "x",
  viktmål: { startKg: 96, målKg: 90 },
  passPerVecka: 3, cardioPerVecka: 2,
  dimensioner: { träning: "a", kost: "b", cardio: "c", vila: "d", sömn: "e" },
  ...över,
}, { nu: NU });

const gammaltMål = { id: "g1", typ: "muscle", namn: "Muskelmassa", startDatum: NU, målDatum: NU + 84 * DAG, passPerVecka: 3 };

describe("programkriterier", () => {
  it("översätter måltyp, planens dagar och profilens nivå", () => {
    const k = programkriterier(mål(), { level: "intermediate" });
    expect(k.goal).toBe("General");           // fatloss → General
    expect(k.days).toBe(3);
    expect(k.level).toBe("Intermediate");
    expect(k.cardioPerVecka).toBe(2);
  });
  it("viktningen speglar ett sammansatt mål, inte bara en etikett", () => {
    const k = programkriterier(mål(), {});
    expect(k.weights.fatloss).toBe(100);
    expect(k.weights.conditioning).toBeGreaterThan(0);
    // Styrketräning behålls som skydd av muskelmassa i underskott.
    expect(k.weights.muscle).toBeGreaterThan(0);
  });
  it("styrkemål ger Strength, muskelmål ger Hypertrophy", () => {
    expect(programkriterier(mål({ typ: "strength" }), {}).goal).toBe("Strength");
    expect(programkriterier(mål({ typ: "muscle" }), {}).goal).toBe("Hypertrophy");
  });
  it("event har ingen egen inriktning — datum säger inget om VAD som ska tränas", () => {
    expect(programkriterier(mål({ typ: "event" }), {}).goal).toBe(null);
  });
  it("null utan mål och utan plan — väljaren ska se ut som förut", () => {
    expect(programkriterier(null, {})).toBeNull();
    expect(programkriterier(gammaltMål, {})).toBeNull();
  });
  it("utan profilnivå blir level null — motorn gissar då ur historiken", () => {
    expect(programkriterier(mål(), {}).level).toBe(null);
  });
});

describe("programförslag", () => {
  it("ger rankade förslag med utskrivna skäl", () => {
    const r = programförslag({ mål: mål(), profile: { level: "intermediate" }, sessions: [] });
    expect(r.förslag.length).toBe(3);
    expect(r.förslag[0].skäl.length).toBeGreaterThan(0);
    // Varje förslag är en riktig mall.
    r.förslag.forEach(f => expect(ALL_TEMPLATES.some(t => t.id === f.mall.id)).toBe(true));
  });

  it("planens dagar styr: 3 pass/vecka lyfter treprogram", () => {
    const r = programförslag({ mål: mål({ passPerVecka: 3 }), profile: { level: "intermediate" }, sessions: [] });
    expect(r.förslag[0].mall.daysPerWeek).toBe(3);
    expect(r.förslag[0].skäl.join(" ")).toMatch(/precis som planen/);
  });

  it("ett styrkemål och ett fettmål ger INTE samma toppförslag", () => {
    const a = programförslag({ mål: mål({ typ: "strength" }), profile: { level: "intermediate" }, sessions: [] });
    const b = programförslag({ mål: mål({ typ: "fatloss" }), profile: { level: "intermediate" }, sessions: [] });
    expect(a.förslag[0].mall.goal).not.toBe(b.förslag[0].mall.goal);
  });

  it("ÄRLIGHET: kan planens dagar inte matchas sägs det", () => {
    // 7 pass/vecka finns inte som mall.
    const r = programförslag({ mål: mål({ passPerVecka: 7 }), profile: { level: "intermediate" }, sessions: [] });
    expect(r.varning).toMatch(/Ingen mall ligger på exakt 7/);
  });

  it("cardio räknas in i veckans totala belastning", () => {
    // 5 styrkepass + 3 cardio = 8 träningsdagar.
    const r = programförslag({ mål: mål({ passPerVecka: 5, cardioPerVecka: 3 }), profile: { level: "advanced" }, sessions: [] });
    if (r.förslag[0].mall.daysPerWeek === 5) {
      expect(r.varning).toMatch(/träningsdagar i veckan/);
    }
  });

  it("null utan plan", () => {
    expect(programförslag({ mål: gammaltMål, profile: {}, sessions: [] })).toBeNull();
    expect(programförslag({ mål: null, profile: {}, sessions: [] })).toBeNull();
  });
});

describe("passarAktivtProgram", () => {
  it("ett program som matchar planen får klartecken", () => {
    const p = { name: "X", daysPerWeek: 3, goal: "General" };
    const r = passarAktivtProgram(p, mål(), { level: "intermediate" });
    expect(r.passar).toBe(true);
    expect(r.avvikelser).toEqual([]);
  });
  it("avvikelser namnges — men formuleras som upplysning, inte tillsägelse", () => {
    const p = { name: "X", daysPerWeek: 5, goal: "Strength" };
    const r = passarAktivtProgram(p, mål(), {});
    expect(r.passar).toBe(false);
    expect(r.avvikelser.length).toBe(2);
    expect(r.text).toMatch(/kan vara medvetet/);
    // Ingen skuldbeläggande formulering.
    expect(r.text).not.toMatch(/fel|borde|måste/i);
  });
  it("null när underlag saknas — aldrig ett svävande kanske", () => {
    expect(passarAktivtProgram(null, mål(), {})).toBeNull();
    expect(passarAktivtProgram({ daysPerWeek: 3 }, gammaltMål, {})).toBeNull();
  });
});
