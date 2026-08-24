// Askr 2.0 — viktförslaget nådde aldrig fältet i ett tomt pass.
//
// Robert: "nu när jag startade appen och la till back squat som övning så
// föreslog inte appen någon vikt. det ska den väl göra".
//
// MOTORN RÄKNADE RÄTT HELA TIDEN. progressionSuggestion gav 80 kg ur förra
// veckans pass, och buildLive satte det på övningen. Mätt i webbläsaren.
//
// Men effekten som flyttar förslaget till inmatningsfältet lyssnade bara på
// live.idx. I ett tomt pass är idx redan 0 när första övningen läggs till —
// idx ändras alltså inte, effekten körde aldrig, och vikten stod kvar på det
// null den fick av useState när listan var tom.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { buildSession } from "../engines/session.js";
import { progressionSuggestion, lastPerformance } from "../engines/index.js";

const NU = Date.now();
const pass = (weight, reps, rpe) => {
  const sets = [...Array(4)].map(() => ({ exerciseId: "squat", weight, reps, rpe, ts: NU - 7 * 864e5 }));
  return buildSession({ sets, source: "training", title: "Benpass", completedAt: NU - 7 * 864e5 });
};

describe("förslaget bygger på förra passet", () => {
  it("ett pass i förra veckan ger ett förslag", () => {
    const s = progressionSuggestion("squat", [pass(80, 8)], 8);
    expect(s).toBeTruthy();
    expect(s.weight).toBeGreaterThanOrEqual(80);
  });

  it("utan historik finns inget att räkna på", () => {
    // Ett gissat startförslag är farligare än inget: samma person kan höra
    // hemma på 40 kg eller 140.
    expect(progressionSuggestion("squat", [], 8)).toBe(null);
  });

  it("lastPerformance hittar setet ur ett byggt pass", () => {
    // Kedjan buildSession → lastPerformance måste hålla; fältet heter
    // exerciseId på båda sidor.
    expect(lastPerformance([pass(80, 8)], "squat").weight).toBe(80);
  });
});

describe("ökning föreslås på reps och marginal", () => {
  it("målrepsen nådda ger ökning", () => {
    const s = progressionSuggestion("squat", [pass(80, 8)], 8);
    expect(s.riktning).toBe("upp");
  });

  it("under målet håller vikten", () => {
    // "Sikta på en rep till på samma vikt" — inte en ökning man inte förtjänat.
    const s = progressionSuggestion("squat", [pass(80, 6)], 8);
    expect(s.riktning).toBe("håll");
    expect(s.weight).toBe(80);
  });

  it("många reps ger ett större kliv", () => {
    // Ett fast steg gav samma förslag för 8 reps som för 20 på samma vikt.
    const lite = progressionSuggestion("squat", [pass(80, 8)], 8);
    const många = progressionSuggestion("squat", [pass(80, 12)], 8);
    expect(många.weight).toBeGreaterThan(lite.weight);
  });

  it("tungt sist backar", () => {
    const s = progressionSuggestion("squat", [pass(80, 8, 9.5)], 8);
    expect(s.riktning).toBe("ner");
  });
});

describe("effekten når fältet även i ett tomt pass", () => {
  const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");

  it("lyssnar på övningens id, inte bara idx", () => {
    // idx ändras inte när första övningen läggs till i ett tomt pass.
    expect(src).toMatch(/\}, \[live\.idx, aktivId\]\);/);
    expect(src).toMatch(/const aktivId = it \? it\.exId : null;/);
  });

  it("buildLive faller tillbaka på senaste vikten utan förslag", () => {
    // Finns historik men inget progressionsförslag ska den gamla vikten visas
    // hellre än ett tomt fält.
    expect(src).toMatch(/vikt: sug \? sug\.weight : \(lp && lp\.weight \? lp\.weight : null\)/);
  });
});
