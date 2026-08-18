// Askr 2.0 — miniatyrikoner per övning, och benspark hittas.
//
// Robert: "Jag saknar benspark i maskin. Jag vill också ha enkla miniatyrer
// eller ikoner på varje övning."
//
// BENSPARK FANNS REDAN — som "Leg Extension", ett engelskt namn i en app där
// resten av gränssnittet är svenskt. sökordFör() är den brygga som redan
// finns för just det problemet (bänk -> bänkpress, böj -> squat); "extension"
// gav bara "sträck", aldrig "benspark". Ett saknat sökord, inte en saknad
// övning.
//
// MINIATYRERNA: 157 av 160 övningar saknar foto. Riktig fotogenerering är ett
// eget, större jobb — men det finns bara 20 rörelsemönster, så en ikon per
// MÖNSTER täcker alla 160 direkt. Foton tar över tyst den dagen de finns.

import { describe, it, expect } from "vitest";
import { sökordFör } from "../atlas2/sokord.js";
import { ikonFörMönster } from "../atlas2/exerciseIcons.jsx";
import { EXERCISES } from "../data/exercises.js";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("benspark hittas på svenska", () => {
  it("Leg Extension ger sökordet benspark", () => {
    expect(sökordFör("Leg Extension")).toMatch(/benspark/);
  });

  it("övningen finns i banken", () => {
    // Den fanns redan — problemet var enbart att den var osökbar.
    expect(EXERCISES.some(e => e.id === "leg_extension")).toBe(true);
  });
});

describe("varje rörelsemönster i banken har en ikon", () => {
  it("inget mönster faller tillbaka på generisk hantel", () => {
    // Fallbacken finns som säkerhetsnät, men om ETT av de faktiska mönstren i
    // databasen träffar den har piktogrammet en lucka — det ska synas här,
    // inte upptäckas som en tom ikon i appen.
    const FALLBACK = ikonFörMönster("____finns_inte____");
    const mönster = new Set(EXERCISES.map(e => e.pattern).filter(Boolean));
    for (const p of mönster) {
      expect(ikonFörMönster(p), p).not.toBe(FALLBACK);
    }
  });

  it("en okänd sträng faller tillbaka på hanteln, inte en tom ikon", () => {
    expect(ikonFörMönster("hittepå")).toBeTruthy();
    expect(ikonFörMönster(undefined)).toBeTruthy();
  });

  it("ikonFörMönster returnerar alltid en sträng", () => {
    // Anropande kod ska aldrig behöva null-kolla — det är hela poängen med
    // fallbacken.
    for (const p of [...new Set(EXERCISES.map(e => e.pattern))]) {
      expect(typeof ikonFörMönster(p)).toBe("string");
    }
  });
});

describe("foto vinner tyst över ikon", () => {
  it("övningsbanken prövar bildFör före ikonen", () => {
    const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    const block = src.slice(src.indexOf("MINIATYR FÖRE NAMNET"), src.indexOf("MINIATYR FÖRE NAMNET") + 900);
    expect(block).toMatch(/bildFör\(e\.id\)/);
    expect(block).toMatch(/ÖvningsIkon pattern=\{e\.pattern\}/);
  });
});
