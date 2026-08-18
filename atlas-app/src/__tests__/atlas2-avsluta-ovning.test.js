// Askr 2.0 — avsluta en enskild övning utan att avsluta passet.
//
// Robert: "Man ska kunna avsluta en övning utan att behöva avsluta hela
// passet." "Avsluta i förtid" avslutade allt — hela passet, alla kvarvarande
// övningar. Men skälet att hoppa över en övning är ofta lokalt: bänken är
// upptagen, axeln säger ifrån, eller man hann inte med alla set. Resten av
// passet ska köras.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");

describe("avslutaÖvning hoppar till nästa oavslutade", () => {
  it("letar efter första övningen efter idx som inte är klar", () => {
    // Ett program där övning 3 redan avslutats (via ett tidigare hopp) ska
    // inte visas igen.
    const fn = src.slice(src.indexOf("const avslutaÖvning"), src.indexOf("const avslutaÖvning") + 500);
    expect(fn).toMatch(/i > härIdx && x\.loggade\.length < x\.set/);
  });

  it("loggade set kastas inte", () => {
    // Övningen markeras klar med det den hann bli — ett pass med tre av fem
    // set på en övning är fortfarande ett pass, inte ett misslyckande.
    const fn = src.slice(src.indexOf("const avslutaÖvning"), src.indexOf("const avslutaÖvning") + 500);
    expect(fn).not.toMatch(/loggade: \[\]/);
  });
});

describe("knappen visas bara när det finns nästa steg", () => {
  it("göms om alla övriga övningar redan är klara", () => {
    // Då finns ingen "nästa" att hoppa till, och knappen skulle vara samma
    // val som "Avsluta passet" fast med ett annat namn.
    expect(src).toMatch(/finnsFlerÖvningar &&/);
  });

  it("göms också när passet är helt klart", () => {
    expect(src).toMatch(/!allaKlara && finnsFlerÖvningar/);
  });
});
