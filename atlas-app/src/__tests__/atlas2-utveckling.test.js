// Askr 2.0 — utveckling: kropp och styrka över tid.
//
// Robert: "jag vill ha en sida för utveckling. vikt, fettprocent,
// muskelprocent styrka" och "omron visar vikt, fett även viceralt och muskler.
// styrka blir väl 1rm bäst".
//
// VIKTEN ENSAM LJUGER. Går den ner kan det vara fett eller muskel, och det är
// skillnaden som avgör om en deff går bra eller illa.

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";
import {
  byggMätning, massor, trend, tolkaOmronCsv, slåIhopMätningar,
  bästa1RM, styrkeKurva, övningarMedKurva, progressionskarta, volymKurva, kurvTrend,
} from "../engines/utveckling.js";

const NU = Date.now();

describe("mätningen tar emot Omrons fält", () => {
  it("vikt, fett, muskel och visceralt", () => {
    const m = byggMätning({ kg: 82.4, fat: 18.2, muscle: 38.1, visceral: 7 });
    expect(m.kg).toBe(82.4);
    expect(m.fat).toBe(18.2);
    expect(m.muscle).toBe(38.1);
    expect(m.visceral).toBe(7);
  });

  it("komma fungerar som decimaltecken", () => {
    expect(byggMätning({ kg: "82,4" }).kg).toBe(82.4);
  });

  it("saknade fält blir null, inte 0", () => {
    // En vanlig badrumsvåg ger bara kg. En post utan fettprocent ska inte se ut
    // som en post med 0 % fett.
    const m = byggMätning({ kg: 82 });
    expect(m.fat).toBe(null);
    expect(m.muscle).toBe(null);
  });

  it("orimliga värden avvisas", () => {
    // Under 3 % kroppsfett är dödligt, över 70 % finns inte. En felskrivning
    // ska inte bli en datapunkt.
    expect(byggMätning({ kg: 82, fat: 95 }).fat).toBe(null);
    expect(byggMätning({ kg: 82, fat: 1 }).fat).toBe(null);
    expect(byggMätning({ kg: 5 })).toBe(null);
  });

  it("utan NÅGOT värde finns ingen mätning", () => {
    // REGELN ÄNDRADES när kroppsmåtten kom. Förut krävdes vikt: `byggMätning`
    // returnerade null utan kg, och en mätning med bara midja eller bara
    // kroppsfett avvisades tyst. Det var en rest från när det här bara var en
    // våglogg.
    //
    // Nu räcker ett värde. Det som fortfarande avvisas är den helt tomma
    // posten — den betyder att användaren tryckte Spara utan att fylla i
    // något, och då finns ingenting att spara.
    expect(byggMätning({})).toBe(null);
    expect(byggMätning({ kg: "", fat: "", muscle: "" })).toBe(null);
    expect(byggMätning({ fat: 18 })).toBeTruthy();
    expect(byggMätning({ fat: 18 }).kg).toBe(null);
    expect(byggMätning({ matt: { midja: 91.5 } })).toBeTruthy();
  });
});

describe("massorna härleds bara ur känd data", () => {
  it("fettfri massa ur vikt och fettprocent", () => {
    const m = massor(byggMätning({ kg: 82.4, fat: 18.2 }));
    expect(m.fettMassa).toBe(15);
    expect(m.fettfriMassa).toBe(67.4);
  });

  it("utan fettprocent finns ingen fettfri massa", () => {
    // Att gissa den vore att visa ett härlett tal som ser mätt ut.
    const m = massor(byggMätning({ kg: 82.4 }));
    expect(m.fettfriMassa).toBe(null);
  });
});

describe("trenden kräver två punkter", () => {
  const serie = [
    byggMätning({ ts: NU - 60 * 864e5, kg: 86, fat: 22 }),
    byggMätning({ ts: NU, kg: 82, fat: 18 }),
  ];

  it("räknar skillnad och takt per vecka", () => {
    const t = trend(serie, "kg");
    expect(t.diff).toBe(-4);
    expect(t.punkter).toBe(2);
    expect(t.perVecka).toBeLessThan(0);
  });

  it("en enda mätning ger ingen trend", () => {
    // "0 kg" vore att påstå att inget hänt när sanningen är att vi inte vet.
    expect(trend([serie[0]], "kg")).toBe(null);
  });

  it("fält som saknas i posterna ger null", () => {
    expect(trend([byggMätning({ kg: 80 }), byggMätning({ kg: 79 })], "muscle")).toBe(null);
  });
});

describe("Omron-CSV läses in", () => {
  const CSV = "Date,Weight(kg),Body Fat(%),Skeletal Muscle(%),Visceral Fat\n"
    + "2026-08-01 07:12,86.2,22.4,36.1,8\n2026-08-15 07:05,84.1,20.8,37.2,7";

  it("alla fyra fälten hittas", () => {
    const r = tolkaOmronCsv(CSV);
    expect(r.poster.length).toBe(2);
    expect(r.fält).toEqual({ fett: true, muskel: true, visceral: true });
    expect(r.poster[0].kg).toBe(86.2);
    expect(r.poster[0].visceral).toBe(8);
  });

  it("källan märks som omron", () => {
    // dataConfidence ska kunna skilja en vågmätning från en handskriven.
    expect(tolkaOmronCsv(CSV).poster[0].källa).toBe("omron");
  });

  it("bara vikt fungerar också", () => {
    const r = tolkaOmronCsv("Date,Weight\n2026-08-01,82.5");
    expect(r.poster.length).toBe(1);
    expect(r.poster[0].fat).toBe(null);
  });

  it("fel filformat ger ett begripligt fel", () => {
    expect(tolkaOmronCsv("hej,då\n1,2").fel).toMatch(/Omron-export/);
    expect(tolkaOmronCsv("").fel).toBeTruthy();
  });

  it("visceralt förväxlas inte med kroppsfett", () => {
    // "body fat" matchas före "fat" — annars fångas visceralkolumnen fel.
    const r = tolkaOmronCsv(CSV);
    expect(r.poster[0].fat).toBe(22.4);
    expect(r.poster[0].visceral).toBe(8);
  });
});

describe("dubbelimport ger inte dubbla poster", () => {
  it("samma mätning matchas inom en timme", () => {
    // Man importerar samma export igen — man minns inte var man slutade.
    const a = byggMätning({ ts: NU, kg: 82 });
    const b = byggMätning({ ts: NU + 60e3, kg: 82, fat: 18 });
    const ut = slåIhopMätningar([a], [b]);
    expect(ut.length).toBe(1);
    // Den nya vinner — den kan ha fler fält ifyllda.
    expect(ut[0].fat).toBe(18);
  });

  it("olika dagar blir olika poster", () => {
    const a = byggMätning({ ts: NU - 864e5, kg: 83 });
    const b = byggMätning({ ts: NU, kg: 82 });
    expect(slåIhopMätningar([a], [b]).length).toBe(2);
  });
});

describe("styrka som uppskattat 1RM", () => {
  const pass = (dagarSedan, w, reps) => ({
    completedAt: NU - dagarSedan * 864e5,
    sets: [{ exerciseId: "squat", weight: w, reps }],
  });

  it("Epley: 100 kg × 5 reps ger 117", () => {
    expect(bästa1RM([pass(0, 100, 5)], "squat").oneRM).toBe(117);
  });

  it("set över 12 reps räknas inte", () => {
    // Vid många reps mäter man uthållighet, inte maxstyrka. Bättre att sakna
    // en punkt än att rita en falsk topp.
    expect(bästa1RM([pass(0, 40, 20)], "squat")).toBe(null);
  });

  it("kurvan ger en punkt per pass", () => {
    const k = styrkeKurva([pass(28, 75, 8), pass(14, 80, 8), pass(3, 85, 8)], "squat");
    expect(k.length).toBe(3);
    expect(k[2].oneRM).toBeGreaterThan(k[0].oneRM);
  });

  it("bara övningar med minst två punkter listas", () => {
    // En punkt är ingen kurva.
    const ss = [pass(10, 80, 8), pass(3, 85, 8)];
    expect(övningarMedKurva(ss)).toContain("squat");
    expect(övningarMedKurva([pass(3, 85, 8)], 3)).toEqual([]);
  });
});

describe("progressionskartan — alla övningar på en gång", () => {
  const nu = Date.now();
  const p = (d, ex, w, reps = 8) => ({
    completedAt: nu - d * 864e5,
    sets: [{ exerciseId: ex, weight: w, reps }, { exerciseId: ex, weight: w, reps }],
  });
  const ss = [
    p(40, "squat", 80), p(20, "squat", 85), p(3, "squat", 90),
    p(40, "bench_press", 70), p(20, "bench_press", 70), p(3, "bench_press", 67.5),
    p(40, "lateral_raise", 10), p(3, "lateral_raise", 12),
    p(40, "deadlift", 120), p(3, "deadlift", 120),
  ];

  it("sorterad efter förändring, störst rörelse först", () => {
    // Oavsett riktning: en nedgång är något att se, och den ska inte hamna
    // sist bara för att den är negativ.
    const k = progressionskarta(ss, "styrka", ["squat", "bench_press", "deadlift"]);
    const ordning = k.map(r => r.id);
    expect(ordning.indexOf("squat")).toBeLessThan(ordning.indexOf("bench_press"));
    expect(ordning.indexOf("bench_press")).toBeLessThan(ordning.indexOf("deadlift"));
  });

  it("styrka och volym ger olika svar", () => {
    // 85 × 6 ger högre 1RM än 80 × 10, men lägre volym. De mäter olika saker.
    const s = progressionskarta(ss, "styrka").find(r => r.id === "squat");
    const v = progressionskarta(ss, "volym").find(r => r.id === "squat");
    expect(s.fält).toBe("oneRM");
    expect(v.fält).toBe("volym");
    expect(v.senaste).toBe(1440);
  });

  it("volymen räknar alla set, även höga reps", () => {
    // Volym är ett mätvärde, inte en uppskattning. 20 reps är lika mycket
    // arbete oavsett vad de säger om maxstyrka.
    const k = volymKurva([p(3, "squat", 40, 20)], "squat");
    expect(k[0].volym).toBe(1600);
  });

  it("trenden ser bara 8 veckor", () => {
    // Att jämföra dagens knäböj med den första för ett år sedan säger att man
    // blivit starkare — vilket man vet. Frågan är om det rör sig NU.
    const gammal = [p(200, "ohp", 40), p(3, "ohp", 50)];
    expect(kurvTrend(volymKurva(gammal, "ohp"), "volym")).toBe(null);
  });

  it("en punkt är ingen trend", () => {
    // "0 %" hade påstått stillastående när sanningen är att vi inte vet.
    expect(kurvTrend([{ ts: nu, volym: 100 }], "volym")).toBe(null);
  });

  it("stora lyft markeras", () => {
    const k = progressionskarta(ss, "styrka", ["squat"]);
    expect(k.find(r => r.id === "squat").stort).toBe(true);
    expect(k.find(r => r.id === "lateral_raise").stort).toBe(false);
  });
});

describe("kartan i vyn", () => {
  const src = readFileSync(resolve("src/atlas2/UtvecklingView.jsx"), "utf8");

  it("måttvalet sparas", () => {
    // Den som föredrar volym ska inte trycka varje gång.
    expect(src).toMatch(/save\("progressionsmatt", v\)/);
  });

  it("ingen förvald rad — kartan är översikten", () => {
    expect(src).toMatch(/const aktivÖvning = valdÖvning;/);
  });

  it("färgen bär riktningen", () => {
    expect(src).toMatch(/t\.procent > 0 \? C\.ready : C\.critical/);
  });

  it("1RM redovisas som uppskattat", () => {
    expect(src).toMatch(/Uppskattat ur Epleys formel — inte ett testat maxlyft/);
  });
});

describe("kurvan är inte skev", () => {
  const src = readFileSync(resolve("src/atlas2/UtvecklingView.jsx"), "utf8");

  it("viewBox matchar rutans bredd", () => {
    // Robert: "viktkurvan i utvecklingsvyn är lite skev".
    //
    // preserveAspectRatio="none" med viewBox 100 bred i en 364 px ruta gav
    // 3,6× horisontell utsträckning. Mätt: cirklarna blev 14,6×4,0 px —
    // ovaler — och linjen fick olika tjocklek beroende på lutning.
    // Med W=360 blir förhållandet ~1:1: 4,9×4,8 efter fixen.
    expect(src).toMatch(/const W = 360;/);
    expect(src).toMatch(/viewBox=\{`0 0 \$\{W\} \$\{höjd\}`\}/);
  });

  it("viktkurvan har ett golv för spännvidden", () => {
    // Med min/max ur datan blir 82,4 och 82,6 hela höjden — 0,2 kg ritas som
    // ett berg. Vikt varierar 0,5-1 kg dag till dag av vätska, och den
    // variationen är inte information.
    expect(src).toMatch(/minSpann=\{2\}/);
    expect(src).toMatch(/if \(max - min < minSpann\)/);
  });

  it("golvet centrerar kring datan", () => {
    // Inte runt 0 — en vikt på 82 ska inte ritas i en skala 0-84.
    const f = src.slice(src.indexOf("if (max - min < minSpann)"), src.indexOf("if (max - min < minSpann)") + 200);
    expect(f).toMatch(/const mitt = \(max \+ min\) \/ 2;/);
  });
});
