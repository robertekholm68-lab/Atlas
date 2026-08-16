// Askr 2.0 — angiven mängd i snabbloggen.
//
// Robert: "När jag loggar 100 gram keso så måste jag ändå välja mellan liten
// mellan och stor."
//
// TVÅ FEL I ETT. estimateMeal läste inga gramtal alls — den matchade nyckelord
// och satte en schablonportion. "100 g keso" gav alltså samma 196 kcal som bara
// "keso", vilket är dubbelt så mycket som rätt svar (keso är 98 kcal/100 g),
// och ovanpå det frågade appen om portionsstorlek på ett tal användaren redan
// mätt upp.
//
// Frågan är rimlig för "keso". För "100 g keso" är den både överflödig och
// vilseledande.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { estimateMeal } from "../engines/index.js";

describe("mängden i texten styr beräkningen", () => {
  it("100 g keso räknas på 100 g, inte på schablonportionen", () => {
    // Keso är 98 kcal/100 g; schablonen är 200 g.
    const e = estimateMeal("100 g keso");
    expect(e.kcal).toBeLessThan(120);
    expect(e.angivenMängd).toBe(100);
  });

  it("utan mängd gäller schablonen som förut", () => {
    const e = estimateMeal("keso");
    expect(e.kcal).toBeGreaterThan(150);
    expect(e.angivenMängd).toBe(null);
  });

  it("mängden skalar linjärt", () => {
    expect(estimateMeal("200 g keso").kcal).toBe(estimateMeal("100 g keso").kcal * 2);
  });

  it("formerna 100g, 100 g och 100 gram fungerar", () => {
    const v = ["100g keso", "100 g keso", "100 gram keso"].map(t => estimateMeal(t).kcal);
    expect(new Set(v).size).toBe(1);
  });

  it("dl och cl räknas om till gram", () => {
    // 2 dl = 200 g. För dryck ligger densiteten nära 1 och näringsdatan anges
    // per 100 g även för flytande varor.
    expect(estimateMeal("2 dl mjölk").angivenMängd).toBe(200);
    expect(estimateMeal("5 cl grädde").angivenMängd).toBe(50);
  });
});

describe("flera komponenter skalas inte", () => {
  it("100 g keso och bröd sätter ingen mängd", () => {
    // Texten säger inte hur mycket bröd. Att lägga 100 g på båda vore att
    // hitta på en siffra användaren aldrig angav.
    expect(estimateMeal("100 g keso och bröd").angivenMängd).toBe(null);
  });
});

describe("orimliga tal ignoreras", () => {
  it("över tre kilo tolkas inte som en portion", () => {
    expect(estimateMeal("9000 g keso").angivenMängd).toBe(null);
  });
});

describe("vyn döljer portionsfrågan när mängden är känd", () => {
  const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");

  it("knapparna villkoras på angivenMängd", () => {
    expect(src).toMatch(/est\.angivenMängd \?/);
  });

  it("och det sägs vad som räknats på", () => {
    // Utan raden vet man inte om appen tog hänsyn till gramtalet eller inte.
    expect(src).toMatch(/Räknat på \{est\.angivenMängd\} g/);
  });
});
