// Askr 2.0 — helkroppsreadiness och överbelastningströskeln.
//
// Robert: "jag tränade två övningar ben i tisdags, 7 set och ändå visas min
// readiness bara som 67 [...] det känns som den överdriver lite" och "det blir
// konstigt 0% om det bara är en muskelgrupp som tränats efter passet. är det
// inte hela kroppens readiness som ska räknas?"
//
// Han hade rätt på båda punkterna, och båda gick att mäta.

import { describe, it, expect } from "vitest";
import { bodyState } from "../atlas2/store.js";
import { computeReadiness, normalWeeklyLoad, computeSessionLoad } from "../engines/index.js";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const NU = Date.now();
const pass = (sets, timmarSedan) => ({
  id: "s" + timmarSedan, completedAt: NU - timmarSedan * 36e5, sets,
  muscleLoads: computeSessionLoad(sets, EXERCISES),
});
const benpass = n => [...Array(n)].map(() => ({ exerciseId: "squat", weight: 100, reps: 8 }));

describe("hela kroppen räknas, inte bara det tränade", () => {
  it("otränade muskler bidrar i stället för att uteslutas", () => {
    // Förut räknades bara muskler MED data. Tränade man bara ben blev
    // helkroppssiffran snittet av tre trötta benmuskler — bröst, rygg och axlar
    // var fullt utvilade men bidrog med ingenting alls.
    const b = bodyState([pass(benpass(7), 72)], NU);
    expect(b.covered).toBeLessThan(Object.keys(MUSCLES).length);
    // Mätt före fixen: 68. Med hela kroppen inräknad ska den ligga klart högre.
    expect(b.overall).toBeGreaterThan(85);
  });

  it("men benen syns fortfarande som trötta", () => {
    // Poängen är inte att gömma tröttheten — den ska ligga på rätt muskel.
    const b = bodyState([pass(benpass(7), 24)], NU);
    expect(b.states.quadriceps.readiness).toBeLessThan(40);
    expect(b.states.pectoralis_major.status).toBe("no_data");
  });

  it("ingen historik ger fortfarande null, inte ett påhittat snitt", () => {
    // Ärlighetsprincipen: utan underlag säger appen att den inte vet.
    expect(bodyState([], NU).overall).toBe(null);
  });

  it("ett färskt pass ger lägre siffra än ett tre dygn gammalt", () => {
    const igår = bodyState([pass(benpass(7), 24)], NU).overall;
    const treDygn = bodyState([pass(benpass(7), 72)], NU).overall;
    expect(igår).toBeLessThan(treDygn);
  });

  it("otränade muskler bidrar med HALV vikt", () => {
    // Full vikt gjorde att de utvilade dominerade snittet. Kroppen man faktiskt
    // belastat ska väga tyngst.
    const src = readFileSync(resolve("src/atlas2/store.js"), "utf8");
    expect(src).toMatch(/vikt \* 0\.5/);
  });
});

describe("överbelastningströskeln skalas efter egen historik", () => {
  it("fast tröskel 1000 maxade redan vid tre set", () => {
    // Lasten är vikt × reps × aktivering. Mätt: 3 set 60 kg gav 1440 —
    // halva straffet. 7 set gav 4480, alltså MAXAT. 15 set gav 11520 och exakt
    // samma avdrag. Ett normalt pass och ett extremt var omöjliga att skilja åt.
    const tre = computeSessionLoad(
      [...Array(3)].map(() => ({ exerciseId: "squat", weight: 60, reps: 10 })), EXERCISES);
    expect(tre.quadriceps).toBeGreaterThan(1000);
  });

  it("utan historik används en rimligare fallback", () => {
    // 4000 motsvarar ett normalt benpass i den här skalan.
    const utan = computeReadiness(80, 4480, 1);
    const gammal = 80 - Math.min(20, (4480 - 1000) / 1000 * 20);
    expect(utan).toBeGreaterThan(gammal);
  });

  it("en normal vecka ger inget straff", () => {
    // Överbelastning är att göra mer än man BRUKAR, inte att passera ett tal
    // någon annan satt.
    expect(computeReadiness(80, 4000, 1, 4000)).toBe(80);
  });

  it("en dubbel vecka straffas", () => {
    expect(computeReadiness(80, 12000, 1, 4000)).toBeLessThan(80);
  });

  it("den starke straffas inte för att lyfta tyngre", () => {
    // Samma antal set, dubbel vikt: lasten dubblas men så gör också normalen.
    const lätt = computeReadiness(80, 2000, 1, 2000);
    const tung = computeReadiness(80, 8000, 1, 8000);
    expect(tung).toBe(lätt);
  });
});

describe("normalWeeklyLoad", () => {
  it("median, inte medel", () => {
    // En enstaka extrem vecka ska inte flytta vad "normalt" betyder — det är
    // just avvikelsen från det normala som ska straffas.
    const veckor = [1000, 1000, 1000, 50000].map((last, i) => ({
      completedAt: NU - i * 6048e5 - 1000, muscleLoads: { quadriceps: last },
    }));
    const n = normalWeeklyLoad(veckor, "quadriceps", NU);
    expect(n).toBeLessThan(5000);
  });

  it("för lite data ger 0 — då används fallbacken", () => {
    // Färre än två veckor säger inget om vad som är normalt.
    expect(normalWeeklyLoad([{ completedAt: NU - 1000, muscleLoads: { quadriceps: 4000 } }], "quadriceps", NU)).toBe(0);
    expect(normalWeeklyLoad([], "quadriceps", NU)).toBe(0);
  });
});
