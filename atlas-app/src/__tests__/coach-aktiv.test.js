// Askr 2.0 — coachen mer aktiv, nivå 1 och 2.
//
// Robert: "Jag funderar på om vi kan göra coachen mer aktiv". Coachen var
// reaktiv: den svarade när man öppnade fliken. Den enda proaktiva delen var
// en nudge om protein efter pass.
//
// NIVÅ 1: fyra nya nudges på hemvyn, byggda i den motor som redan fanns.
// NIVÅ 2: coachen kommenterar varje set under passet.

import { describe, it, expect } from "vitest";
import { buildNudges } from "../engines/nudges.js";
import { coachKommentar, förraPassetRad } from "../engines/coachKommentar.js";
import { epley1RM, progressionskarta, styrkeKurva } from "../engines/utveckling.js";
import { epley1RM as epleyUrIndex } from "../engines/index.js";
import { MAIN_LIFTS } from "../data/exercises.js";

const nu = Date.now(); const D = 864e5;
const p = (d, ex, w, reps = 8, id) => ({
  id: id || `${ex}${d}`, completedAt: nu - d * D,
  sets: [{ exerciseId: ex, weight: w, reps }, { exerciseId: ex, weight: w, reps }],
});

describe("nivå 1 — nudges på hemvyn", () => {
  it("rekord dagen efter, bara stora lyft", () => {
    const ss = [p(20, "squat", 80), p(10, "squat", 85), p(1, "squat", 90)];
    const n = buildNudges({ sessions: ss, now: nu });
    expect(n[0].kind).toBe("rekord");
    expect(n[0].text).toMatch(/Back Squat.*114 kg.*upp från 108/);
    expect(n[0].ctaMål).toBe("utveckling");
  });

  it("dagsordet kommer ur kalendern, inte ur timfönstret", () => {
    // FÖNSTRET ÄR 12–36 TIMMAR, MEN TEXTEN PÅSTÅR ETT DYGN. Det stämde inte
    // i båda ändarna, mätt före rättelsen:
    //
    //   pass 07:00 + app 19:30 SAMMA dag (12,5 h)  → sa "i går" om i morse
    //   pass mån 20:00 + app ons 08:00 (36 h)      → sa "i går" om i förrgår
    //
    // Fasta klockslag med flit: med Date.now() hade fallet bara fallit vissa
    // tider på dygnet, vilket är värre än att inte testa alls.
    const kl = (dag, timme, min = 0) => new Date(2026, 8, dag, timme, min, 0).getTime();
    const pass = (slut, w) => ({ id: "p" + slut, completedAt: slut, sets: [{ exerciseId: "squat", weight: w, reps: 8 }] });
    const gammalt = pass(kl(1, 18), 80);

    const sammaDag = buildNudges({ sessions: [gammalt, pass(kl(7, 7), 100)], now: kl(7, 19, 30) });
    expect(sammaDag[0].kind).toBe("rekord");
    expect(sammaDag[0].text).toContain("i dag");

    const iFörrgår = buildNudges({ sessions: [gammalt, pass(kl(7, 20), 100)], now: kl(9, 8) });
    expect(iFörrgår[0].kind).toBe("rekord");
    expect(iFörrgår[0].text).toContain("i förrgår");

    // Och det vanliga fallet ska fortfarande heta i går.
    const iGår = buildNudges({ sessions: [gammalt, pass(kl(7, 18), 100)], now: kl(8, 9) });
    expect(iGår[0].text).toContain("i går");
  });

  it("rekord kräver ett tidigare värde att slå", () => {
    // Första passet är per definition ett rekord — att fira det vore att fira
    // ingenting.
    const n = buildNudges({ sessions: [p(1, "squat", 90)], now: nu });
    expect(n.find(x => x.kind === "rekord")).toBeUndefined();
  });

  it("frånvaro kräver återhämtade muskler, inte bara dagar", () => {
    // Regel 1 i nudge-motorn: händelse, inte tidpunkt. Den som vilar för att
    // kroppen behöver det ska inte skuldbeläggas.
    const ss = [p(5, "squat", 90)];
    const utan = buildNudges({ sessions: ss, now: nu });
    expect(utan.find(x => x.kind === "franvaro")).toBeUndefined();
    const med = buildNudges({ sessions: ss, muscleStates: { quadriceps: { readiness: 90 }, pectoralis_major: { readiness: 92 }, gluteals: { readiness: 88 } }, now: nu });
    expect(med[0].kind).toBe("franvaro");
    expect(med[0].text).toMatch(/5 dagar/);
  });

  it("frånvaro nämner stora muskler, inte de som råkar stå först", () => {
    // Mätt: utan sortering blev det "Anterior Neck och Trapezius".
    const ms = { anterior_neck: { readiness: 95 }, trapezius: { readiness: 95 }, quadriceps: { readiness: 90 }, pectoralis_major: { readiness: 90 } };
    const n = buildNudges({ sessions: [p(5, "squat", 90)], muscleStates: ms, now: nu });
    expect(n[0].text).toMatch(/^5 dagar.*Quadriceps och Pectoralis/);
  });

  it("stagnation efter tre pass utan framsteg", () => {
    // Två pass kan vara en dålig dag; tre är ett mönster.
    const ss = [p(30, "squat", 90), p(20, "squat", 90), p(10, "squat", 90), p(1, "squat", 88)];
    const n = buildNudges({ sessions: ss, now: nu + 2 * D });
    expect(n[0].kind).toBe("stagnation");
    expect(n[0].ctaMål).toBe("program");
  });

  it("obalans när en grupp tränas tre gånger oftare än sin motpart", () => {
    // Stigande vikt, så stagnation inte triggar först — den rankas högre, och
    // med fyra pass på samma vikt hade den vunnit. Rätt beteende.
    const ss = [p(12, "bench_press", 80), p(9, "bench_press", 82.5), p(6, "bench_press", 85), p(3, "bench_press", 87.5), p(7, "wide_pulldown", 60)];
    const n = buildNudges({ sessions: ss, now: nu + 2 * D });
    expect(n[0].kind).toBe("obalans");
    expect(n[0].text).toMatch(/4 pass bröst.*1 rygg/);
  });

  it("max en nudge åt gången, prioriterad", () => {
    // Två samtidigt är brus. Frånvaro (beslut) slår rekord (information).
    const ss = [p(20, "squat", 80), p(10, "squat", 85), p(5, "squat", 90)];
    const ms = { quadriceps: { readiness: 90 }, pectoralis_major: { readiness: 90 }, gluteals: { readiness: 88 } };
    const n = buildNudges({ sessions: ss, muscleStates: ms, now: nu });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("franvaro");
  });

  it("MAIN_LIFTS är [id, namn]-par och packas upp", () => {
    // Rekord och stagnation var TYSTA tills detta upptäcktes: loopen
    // itererade över paren, inte id:na. Samma bugg i progressionskartan.
    expect(Array.isArray(MAIN_LIFTS[0])).toBe(true);
    const k = progressionskarta([p(20, "squat", 80), p(1, "squat", 90)], "styrka", MAIN_LIFTS);
    expect(k.find(r => r.id === "squat").stort).toBe(true);
  });
});

describe("nivå 2 — coachen under passet", () => {
  const övning = (senaste, loggade = 1, set = 4) => ({
    exId: "bench_press", senaste, set,
    loggade: Array(loggade).fill({ vikt: 80, reps: 8 }),
  });

  it("mer vikt än förra passet", () => {
    const r = coachKommentar({ vikt: 82.5, reps: 8 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe("2,5 kg mer än förra passet.");
  });

  it("mer vikt OCH fler reps", () => {
    const r = coachKommentar({ vikt: 82.5, reps: 9 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toMatch(/2,5 kg mer.*1 rep till/);
  });

  it("fler reps på samma vikt", () => {
    const r = coachKommentar({ vikt: 80, reps: 10 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe("2 reps mer än förra passet på samma vikt.");
  });

  it("exakt som sist → tystnad, inte 'samma som sist'", () => {
    // Regel 3: tystnad är ett giltigt svar.
    const r = coachKommentar({ vikt: 80, reps: 8 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe(null);
  });

  it("en rep mindre → tystnad. Dagsform, inte trend", () => {
    const r = coachKommentar({ vikt: 80, reps: 7 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe(null);
  });

  it("tydligt lättare sägs, utan skuld", () => {
    const r = coachKommentar({ vikt: 75, reps: 8 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe("5 kg lättare än sist. Tunga dagar finns.");
  });

  it("rekord slår allt annat", () => {
    const r = coachKommentar({ vikt: 85, reps: 8 }, övning([{ vikt: 80, reps: 8 }]), 100);
    expect(r).toMatch(/^Nytt bästa: 108 kg/);
  });

  it("rekord kräver ett tidigare värde", () => {
    const r = coachKommentar({ vikt: 85, reps: 8 }, övning(null), null);
    // Inget förra pass, inget rekord → läget i passet, eller tystnad
    expect(r === null || !/Nytt bästa/.test(r)).toBe(true);
  });

  it("jämför med samma setnummer, inte förra passets sista", () => {
    // Set 1 mot set 1. Annars säger den "2,5 kg mer" om ett uppvärmningsset
    // jämfört med förra passets tyngsta.
    const senaste = [{ vikt: 60, reps: 10 }, { vikt: 80, reps: 8 }];
    const r = coachKommentar({ vikt: 60, reps: 10 }, övning(senaste, 1));
    expect(r).toBe(null);
  });

  it("ett set kvar sägs bara om inget annat gäller", () => {
    const r = coachKommentar({ vikt: 80, reps: 8 }, övning(null, 3, 4));
    expect(r).toBe("Ett set kvar på den här.");
  });

  // ── Sista setet: coachen byter nivå, från setet till övningen ──────────────
  //
  // Ett enskilt set som är exakt som förra gången är ingen nyhet och ska tiga.
  // Men när övningen är KLAR är totalen ny information — den står ingenstans på
  // skärmen, och "lika mycket som sist" svarar på den fråga man bär med sig.
  describe("övningens summa när sista setet loggats", () => {
    const klar = (loggade, senaste = null, set = loggade.length) => ({
      exId: "bench_press", senaste, set, loggade,
    });
    const rad = (vikt, reps, n) => Array.from({ length: n }, () => ({ vikt, reps }));

    it("mer volym än förra passet, med differensen utskriven", () => {
      const r = coachKommentar({ vikt: 80, reps: 8 }, klar(rad(80, 8, 3), rad(75, 8, 3)));
      // 3 × 80 × 8 = 1 920 mot 3 × 75 × 8 = 1 800.
      expect(r).toMatch(/^Övningen klar: 1\s?920 kg, 120 kg mer än förra passet\.$/);
    });

    it("EXAKT LIKA SÄGS — det var hela poängen med att göra coachen aktiv", () => {
      const r = coachKommentar({ vikt: 80, reps: 8 }, klar(rad(80, 8, 3), rad(80, 8, 3)));
      expect(r).toBe(`Övningen klar: ${(1920).toLocaleString("sv-SE")} kg — exakt som förra passet.`);
    });

    it("mindre volym sägs rakt ut, utan skuld", () => {
      const r = coachKommentar({ vikt: 70, reps: 8 }, klar(rad(70, 8, 3), rad(80, 8, 3)));
      expect(r).toMatch(/^Övningen klar: 1\s?680 kg, 240 kg mindre än förra passet\.$/);
    });

    it("utan förra pass ges summan ensam, ingen påhittad jämförelse", () => {
      const r = coachKommentar({ vikt: 80, reps: 8 }, klar(rad(80, 8, 3), null));
      expect(r).toMatch(/^Övningen klar: 1\s?920 kg totalt\.$/);
      expect(r).not.toMatch(/förra passet/);
    });

    it("rekordet slår summan — det är sällsyntare och större", () => {
      const r = coachKommentar({ vikt: 85, reps: 8 }, klar(rad(85, 8, 3), rad(80, 8, 3)), 100);
      expect(r).toMatch(/^Nytt bästa/);
    });

    it("tystnaden gäller fortfarande MITT i övningen", () => {
      // Två av fyra set loggade, setet exakt som förra passets samma setnummer.
      const r = coachKommentar({ vikt: 80, reps: 8 }, klar(rad(80, 8, 2), rad(80, 8, 4), 4));
      expect(r).toBe(null);
    });

    it("kroppsvikt ger ingen nollvolym — 0 kg vore ett påhittat tal", () => {
      const r = coachKommentar({ vikt: 0, reps: 12 }, klar(rad(0, 12, 3), rad(0, 12, 3)));
      expect(r).toBe(null);
      // Även utan förra pass: ingen summa att visa.
      const utan = coachKommentar({ vikt: 0, reps: 12 }, klar(rad(0, 12, 3), null));
      expect(utan === null || !/0 kg/.test(utan)).toBe(true);
    });
  });

  // ── Förra passets set, visade före det första setet ────────────────────────
  describe("förraPassetRad", () => {
    it("samma vikt hela vägen skrivs en gång, repsen för sig", () => {
      expect(förraPassetRad([{ vikt: 80, reps: 8 }, { vikt: 80, reps: 8 }, { vikt: 80, reps: 7 }]))
        .toBe("Sist: 80 kg × 8, 8, 7");
    });

    it("olika vikter skrivs par för par", () => {
      expect(förraPassetRad([{ vikt: 60, reps: 10 }, { vikt: 80, reps: 8 }, { vikt: 90, reps: 6 }]))
        .toBe("Sist: 60×10 · 80×8 · 90×6");
    });

    it("kroppsvikt räknas i reps, inte i noll kilo", () => {
      expect(förraPassetRad([{ vikt: 0, reps: 12 }, { vikt: 0, reps: 10 }]))
        .toBe("Sist: 12, 10 reps");
    });

    it("halva kilon skrivs med komma, inte punkt", () => {
      expect(förraPassetRad([{ vikt: 82.5, reps: 8 }])).toBe("Sist: 82,5 kg × 8");
    });

    it("fler än sex set kortas — raden får inte wrappa i passvyn", () => {
      const åtta = Array.from({ length: 8 }, () => ({ vikt: 60, reps: 10 }));
      const r = förraPassetRad(åtta);
      expect(r).toBe("Sist: 60 kg × 10, 10, 10, 10, 10, 10 +2");
    });

    it("utan förra pass sägs ingenting", () => {
      expect(förraPassetRad(null)).toBe(null);
      expect(förraPassetRad([])).toBe(null);
      // Poster utan reps är inte set och ska inte räknas som sådana.
      expect(förraPassetRad([{ vikt: 80 }])).toBe(null);
    });
  });

  it("epley1RM är samma formel som kurvan", () => {
    expect(epley1RM(80, 8)).toBe(101);
    // ETT ENREPSSET ÄR MÄTT, INTE UPPSKATTAT.
    //
    // Testet låste tidigare 103 här. Epley är anpassad för flerrepsset och ger
    // vikt × 1,033 vid en rep — en uppskattning av något man faktiskt lyft.
    // Den som tar 100 kg en gång har ett 1RM på 100, inte 103.
    //
    // Undantaget fanns redan i index.js. Det var alltså de två formlerna som
    // inte var överens, och 103 var den som avvek.
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 0)).toBe(100);
  });

  it("båda motorerna räknar 1RM med SAMMA funktion", () => {
    // Formeln stod i tre exemplar: utveckling.js, index.js och inskriven rakt
    // i styrkeKurva. Att jämföra tal hade bara visat att de råkade vara lika
    // just nu — det här kräver att det är samma funktion, så de inte kan
    // driva isär igen.
    expect(epleyUrIndex).toBe(epley1RM);
    for (const [v, r] of [[100, 1], [80, 8], [120, 3], [60, 12]]) {
      expect(styrkeKurva([{ completedAt: 1, sets: [{ exerciseId: "x", weight: v, reps: r }] }], "x")[0].oneRM)
        .toBe(epley1RM(v, r));
    }
  });
});
