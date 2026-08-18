// Askr 2.0 — fritt pass ur övningsbanken.
//
// Robert: "jag vill kunna välja själv i listan av övningar även om jag bara kör
// en övning eller mixar fritt under passet."
//
// startaPass krävde ett aktivt program: utan ett sådant skickades man till
// programvalet. Men ett program är rätt när man FÖLJER en plan — ibland går man
// till gymmet och tar det som är ledigt, eller kör bara en enda övning. Utan den
// vägen tvingades man skapa ett program för att logga ett pass, och då loggade
// man inte alls.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { buildLive } from "../atlas2/WorkoutView.jsx";
import { EXERCISES } from "../data/exercises.js";

const övning = EXERCISES.find(e => e.loadMode === "external");

describe("buildLive tål ett pass utan program", () => {
  it("program=null ger programId null, inte en krasch", () => {
    // Utan vakten kastar program.id och passet startar aldrig — skärmen blir
    // blank utan felmeddelande, samma tysta fel som SyntheticEvent-buggen.
    const live = buildLive(null, {
      name: "Fritt pass",
      exercises: [{ exId: övning.id, sets: 3, repMin: 6, repMax: 12, restSec: 90 }],
    }, []);
    expect(live).toBeTruthy();
    expect(live.programId).toBe(null);
    expect(live.items.length).toBe(1);
  });

  it("progression och viktförslag räknas som vanligt", () => {
    // Samma buildLive som ett programpass, så muskellast och progression blir
    // identiska. Ett fritt pass ska inte vara en andra klassens logg.
    const live = buildLive(null, {
      name: "Fritt pass",
      exercises: [{ exId: övning.id, sets: 3, repMin: 6, repMax: 12, restSec: 90 }],
    }, []);
    const it0 = live.items[0];
    expect(it0.exId).toBe(övning.id);
    expect(it0.set).toBe(3);
    expect(it0.yttreVikt).toBe(true);
  });

  it("en enda övning fungerar", () => {
    // Robert nämnde det uttryckligen: "även om jag bara kör en övning".
    const live = buildLive(null, {
      name: "Fritt pass", exercises: [{ exId: övning.id, sets: 3, repMin: 6, repMax: 12, restSec: 90 }],
    }, []);
    expect(live.items.length).toBe(1);
  });
});

describe("övningsbanken kan välja", () => {
  const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");

  it("valknappen är skild från raden", () => {
    // Ett tryck på raden fäller ut fakta, ett tryck på plus lägger till i
    // passet — två olika avsikter som inte får dela knapp.
    expect(src).toMatch(/data-valj="1"/);
    expect(src).toMatch(/data-övning="1"/);
  });

  it("valet är valfritt — utan onStarta är banken ren uppslagning", () => {
    expect(src).toMatch(/\{onStarta && \(/);
    expect(src).toMatch(/onStarta && valda\.length > 0/);
  });

  it("startknappen står före listan", () => {
    // Efter 160 övningar hade den krävt att man scrollar tillbaka hela vägen
    // upp — samma lärdom som loggknappen i matvyn.
    const startIdx = src.indexOf('data-starta-fritt="1"');
    const listaIdx = src.indexOf("{träffar.map(e => {");
    expect(startIdx).toBeGreaterThan(0);
    expect(startIdx).toBeLessThan(listaIdx);
  });
});

describe("App2 bygger passet", () => {
  const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");

  it("startaFrittPass skickar null som program", () => {
    expect(src).toMatch(/buildLive\(null, workout, sessions\)/);
  });

  it("3x8 är förvalet — inte ett formulär att fylla i", () => {
    // Den som mixar fritt vill komma igång; set och reps går att ändra i
    // passvyn som vanligt.
    const fn = src.slice(src.indexOf("const startaFrittPass"), src.indexOf("const startaFrittPass") + 700);
    expect(fn).toMatch(/sets: 3/);
  });
});
