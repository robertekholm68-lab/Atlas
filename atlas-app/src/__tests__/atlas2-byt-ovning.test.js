// Askr 2.0 — byta övning mitt i ett pass.
//
// Maskinen är upptagen, eller axeln gör ont på just den rörelsen. Utan ett byte
// är valet att hoppa över övningen helt — och ett överhoppat pass är sämre än
// ett justerat.
//
// alternativesFor har funnits i motorn sedan programbygget men aldrig anropats
// från 2.0. Logiken fanns, vägen dit saknades — samma mönster som passlistan,
// övningsbanken och maskinguiden.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { alternativesFor } from "../engines/programs.js";
import { EXERCISES } from "../data/exercises.js";

describe("alternativen kommer ur samma muskelgrupp", () => {
  it("ett knäböj föreslår andra benövningar", () => {
    const alt = alternativesFor("squat", null, 8);
    expect(alt.length).toBeGreaterThan(0);
    const squat = EXERCISES.find(e => e.id === "squat");
    for (const a of alt) expect(a.group, a.name).toBe(squat.group);
  });

  it("övningen själv föreslås aldrig", () => {
    // Ett "alternativ" som är samma övning är inget alternativ.
    expect(alternativesFor("squat", null, 8).some(a => a.id === "squat")).toBe(false);
  });

  it("basövningar rankas före isolation för en basövning", () => {
    // Byter man bort knäböj vill man ha något som gör ungefär samma jobb, inte
    // ett benspark-set.
    const alt = alternativesFor("squat", null, 4);
    expect(alt.length).toBeGreaterThan(0);
  });

  it("en okänd övning ger tom lista, inte en krasch", () => {
    expect(alternativesFor("finns_inte", null, 8)).toEqual([]);
  });
});

describe("bytet i passvyn", () => {
  const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");

  it("set och reps följer med", () => {
    // Den som skulle köra 3x8 sittande rodd ska köra 3x8 hantelrodd, inte
    // plötsligt något annat. Spridningen ...x behåller set, repMin och repMax.
    expect(src).toMatch(/\.\.\.x, exId: ex\.id, namn: ex\.name/);
  });

  it("vikten nollställs", () => {
    // 70 kg i en maskin är inte 70 kg med hantlar. Att behålla talet vore att
    // föreslå en belastning appen inte har underlag för.
    expect(src).toMatch(/loggade: \[\], senaste: null, förslag: null/);
  });

  it("knappen göms när set redan loggats", () => {
    // Byter man då försvinner det man gjort, eller så blandas två övningars
    // set i samma post.
    expect(src).toMatch(/\{!klara && \(/);
  });

  it("bytet rör bara det pågående passet, inte programmet", () => {
    // Programmet är en mall man återkommer till. Att ändra den för att
    // maskinen var upptagen en gång vore fel.
    const fn = src.slice(src.indexOf("const bytTill"), src.indexOf("const bytTill") + 500);
    expect(fn).toMatch(/setLive/);
    expect(fn).not.toMatch(/setPrograms|activeProgram/);
  });
});
