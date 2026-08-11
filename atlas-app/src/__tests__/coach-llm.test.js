// Askr — Claude som formulerare, inte som faktakälla.
//
// Hela poängen med modulen är EN regel: motorn räknar, modellen formulerar,
// modellen lägger aldrig till ett tal. En språkmodell producerar tal som LÅTER
// rimliga — "ungefär 80 procent" när motorn sagt 82 är inte en avrundning utan
// en andra sanning om samma kropp.
//
// Ett systemmeddelande är en önskan. Efterkontrollen är garantin, och det är
// den som testas här.

import { describe, it, expect } from "vitest";
import { påhittadeTal, tillåtnaTal, byggUnderlag, frågaCoachen } from "../engines/coach-llm.js";
import { coachFacts } from "../engines/facts.js";
import { buildSession } from "../engines/session.js";
import { EXERCISES } from "../data/exercises.js";

const DAG = 864e5;
const ÖVN = (EXERCISES.find(e => e.loadMode === "external") || {}).id;
const pass = d => buildSession({
  title: "Pass", source: "training", completedAt: Date.now() - d * DAG,
  sets: [{ exerciseId: ÖVN, weight: 80, reps: 8 }],
});
const facts = n => coachFacts({ sessions: Array.from({ length: n }, (_, i) => pass(i + 1)) });

describe("talkontrollen", () => {
  const underlag = { readiness: 82, volymIVeckan: 14200, utvilade: [{ muskel: "Bröst", värde: 84 }] };

  it("släpper igenom tal som finns i underlaget", () => {
    expect(påhittadeTal("Din readiness är 82 och bröstet ligger på 84.", underlag)).toEqual([]);
  });

  it("FÄLLER ett tal som modellen hittat på", () => {
    // Det klassiska felet: en avrundning som ser hjälpsam ut men inte är sann.
    expect(påhittadeTal("Din readiness är ungefär 80 procent.", underlag)).toContain("80");
  });

  it("fäller uppfunna volymer", () => {
    expect(påhittadeTal("Du lyfte 15000 kg den här veckan.", underlag)).toContain("15000");
  });

  it("komma och punkt räknas som samma tal", () => {
    // "82,5" ur svenskt språkbruk mot 82.5 i datan får inte bli ett falskt larm.
    expect(påhittadeTal("Ta 82,5 kg.", { vikt: 82.5 })).toEqual([]);
  });

  it("små tal tillåts — de är uppräkningar, inte mätvärden", () => {
    // "tre pass", "2 set". Att fälla dem skulle göra varje naturlig mening omöjlig.
    expect(påhittadeTal("Du har kört 3 pass med 2 set vardera.", underlag)).toEqual([]);
  });

  it("facit byggs ur objektet, inte ur en handskriven lista", () => {
    // En ny siffra i coachFacts ska inte tyst börja underkännas.
    const ok = tillåtnaTal({ nytt: { fält: 4711 } });
    expect(ok.has("4711")).toBe(true);
  });
});

describe("underlaget kommer ur motorn", () => {
  it("bär readiness och tillit från coachFacts", () => {
    const u = byggUnderlag(facts(12));
    expect(typeof u.readiness).toBe("number");
    expect(["ingen", "svag", "ok", "god"]).toContain(u.tillitTillUnderlaget);
  });

  it("utan pass finns ingen readiness att formulera kring", () => {
    const u = byggUnderlag(coachFacts({ sessions: [] }));
    expect(u.readiness).toBe(null);
    expect(u.tillitTillUnderlaget).toBe("ingen");
  });

  it("kostmål utelämnas helt när de saknas — inte som nollor", () => {
    // En nolla påstår att något mättes och blev noll.
    const u = byggUnderlag(facts(5));
    expect(u.proteinMål).toBe(null);
  });
});

describe("svaret förkastas hellre än visas fel", () => {
  const f = facts(12);

  it("ett svar med påhittat tal SLÄPPS INTE IGENOM", async () => {
    const r = await frågaCoachen({
      fråga: "hur är läget?", facts: f,
      hämtaSvar: async () => "Din readiness är 999 och du lyfte 88888 kg.",
    });
    expect(r.ok).toBe(false);
    expect(r.skäl).toBe("påhittade-tal");
    expect(r.påhittade.length).toBeGreaterThan(0);
  });

  it("ett rent svar går igenom", async () => {
    const r = await frågaCoachen({
      fråga: "hur är läget?", facts: f,
      hämtaSvar: async () => "Allt ser utvilat ut. Kör på som planerat.",
    });
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/utvilat/);
  });

  it("nätverksfel blir ett skäl, inte en krasch", async () => {
    const r = await frågaCoachen({
      fråga: "hej", facts: f,
      hämtaSvar: async () => { throw new Error("offline"); },
    });
    expect(r.ok).toBe(false);
    expect(r.skäl).toBe("nät");
  });

  it("utan koppling faller den tillbaka i stället för att gissa", async () => {
    const r = await frågaCoachen({ fråga: "hej", facts: f });
    expect(r.ok).toBe(false);
    expect(r.skäl).toBe("ingen-koppling");
  });

  it("tomt svar räknas inte som ett svar", async () => {
    const r = await frågaCoachen({ fråga: "hej", facts: f, hämtaSvar: async () => "   " });
    expect(r.ok).toBe(false);
    expect(r.skäl).toBe("tomt");
  });
});

describe("markdown städas i stället för att förkasta svaret", () => {
  // Första provet mot den skarpa proxyn gav "Du tränar **Push A** idag", trots
  // att prompten bad om ren text. Stjärnor är fult, inte farligt — att kasta
  // ett korrekt svar för formateringens skull vore fel avvägning.
  const f = coachFacts({ sessions: [] });

  it("fetstil plockas bort", async () => {
    const r = await frågaCoachen({ fråga: "hej", facts: f,
      hämtaSvar: async () => "Du tränar **Push A** idag." });
    expect(r.ok).toBe(true);
    expect(r.text).toBe("Du tränar Push A idag.");
  });

  it("rubriker och punktlistor plattas ut", async () => {
    const r = await frågaCoachen({ fråga: "hej", facts: f,
      hämtaSvar: async () => "## Dagens pass\n- Bänkpress\n- Axelpress" });
    expect(r.text).not.toMatch(/^#|^-\s/m);
  });

  it("men ett påhittat tal förkastas fortfarande — städning räddar inte det", async () => {
    const r = await frågaCoachen({ fråga: "hej", facts: f,
      hämtaSvar: async () => "**Readiness 4711.**" });
    expect(r.ok).toBe(false);
    expect(r.skäl).toBe("påhittade-tal");
  });
});
