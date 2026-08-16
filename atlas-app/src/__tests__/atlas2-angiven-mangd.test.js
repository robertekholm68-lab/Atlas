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
    // Två former sedan antal styck stöds: "Räknat på 100 g som du angav" och
    // "Räknat på 2 knäckebröd (22 g)". Testet vaktar att raden finns, inte
    // exakt vilken av dem som visas.
    expect(src).toMatch(/Räknat på \$\{est\.angiv/);
  });
});

describe("antal styck räknas", () => {
  it("2 knäckebröd är en mängd, inte samma som knäckebröd", () => {
    // Antalet ignorerades helt: "2 knäckebröd" gav samma svar som
    // "knäckebröd", alltså gruppens schablonportion. Man loggade fel mängd
    // utan att något avslöjade det.
    const två = estimateMeal("2 knäckebröd");
    expect(två.angivetAntal).toBeTruthy();
    expect(två.angivetAntal.antal).toBe(2);
    expect(två.angivenMängd).toBe(22);
  });

  it("räkneord i bokstäver fungerar", () => {
    expect(estimateMeal("ett äpple").angivenMängd).toBe(130);
    expect(estimateMeal("tre ägg").angivenMängd).toBe(174);
  });

  it("bara saker man räknar i styck", () => {
    // "2 ris" betyder ingenting. Listan ska växa när någon rapporterar att en
    // vara saknas, inte fyllas med gissningar i förväg.
    expect(estimateMeal("2 ris").angivetAntal).toBe(null);
  });

  it("gramangivelse vinner över antal", () => {
    // "2 knäckebröd 30 g" betyder att man vägt, inte att man räknat.
    expect(estimateMeal("100 g knäckebröd").angivenMängd).toBe(100);
  });

  it("orimliga antal ignoreras", () => {
    expect(estimateMeal("99 knäckebröd").angivetAntal).toBe(null);
  });
});

describe("produktvalet ersätter portionsfrågan", () => {
  it("lätta ger ett val mellan sorterna", () => {
    // Lätta 39 % och Mini Lätta 30 % ligger 17 % isär i energi. Storleken är
    // inte det osäkra där — sorten är det.
    const pv = estimateMeal("2 knäckebröd med lätta").produktval;
    expect(pv).toBeTruthy();
    expect(pv.ord).toBe("lätta");
    expect(pv.alternativ.length).toBeGreaterThanOrEqual(2);
  });

  it("råvaror frågar vi aldrig om", () => {
    // "kyckling" matchar kokt, grillad, lever och lår. Den som skriver
    // "kyckling med ris" vill logga en måltid, inte gå igenom en katalog.
    for (const t of ["kyckling med ris", "mjölk", "yoghurt", "2 ägg och bröd"]) {
      expect(estimateMeal(t).produktval, t).toBe(null);
    }
  });

  it("frågan ställs bara när alternativen skiljer sig", () => {
    // Under 15 % i energi är valet inte värt ett avbrott — osäkerheten i
    // mängden är då ändå större än skillnaden mellan sorterna.
    const pv = estimateMeal("2 knäckebröd med lätta").produktval;
    const kcal = pv.alternativ.map(a => a.kcal);
    const min = Math.min(...kcal), max = Math.max(...kcal);
    expect((max - min) / min).toBeGreaterThanOrEqual(0.15);
  });

  it("högst fyra alternativ — annars är det en katalog", () => {
    const pv = estimateMeal("kaffe med bregott").produktval;
    if (pv) expect(pv.alternativ.length).toBeLessThanOrEqual(4);
  });
});

describe("utskrivna enheter — det man säger, inte det man förkortar", () => {
  it("deciliter fungerar som dl", () => {
    // Röstinmatning ger "2 deciliter mellanmjölk", inte "2 dl". Rösten är den
    // snabbaste vägen in i matloggen, så det är just den formen som måste
    // fungera — annars tappade allt man pratade in sin mängd.
    expect(estimateMeal("2 deciliter mellanmjölk").angivenMängd).toBe(200);
    expect(estimateMeal("2 dl mellanmjölk").angivenMängd).toBe(200);
  });

  it("centiliter och milliliter", () => {
    expect(estimateMeal("5 centiliter grädde").angivenMängd).toBe(50);
    expect(estimateMeal("50 milliliter mjölk").angivenMängd).toBe(50);
  });

  it("gram och kilo", () => {
    expect(estimateMeal("100 gram keso").angivenMängd).toBe(100);
    expect(estimateMeal("1 kilo potatis").angivenMängd).toBe(1000);
  });

  it("längsta enheten matchas först", () => {
    // Utan ordningen i alternationen matchar "dl" mot början av "deciliter"
    // och ordgränsen faller på fel ställe.
    expect(estimateMeal("3 deciliter mjölk").angivenMängd).toBe(300);
  });
});
