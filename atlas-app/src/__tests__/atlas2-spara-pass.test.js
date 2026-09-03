// Askr 2.0 — ändrade övningar sparas tillbaka till programmet.
//
// Robert: "även när jag valt ett pass så vill jag kunna ändra övningar i det.
// både före och under passet och då spara det som eget. t.ex jag kör helkropp
// två pass i veckan A och B. jag vill ha andra övningar än det som ligger i det
// färdiga passet. jag stuvar om och sparar som eget A och B."
//
// Bytet under passet ändrade bara live-passet — nästa gång var originalet
// tillbaka, och man fick byta igen.

import { describe, it, expect } from "vitest";
import { passetÄndrat, sparaPassTillProgram, ärInbyggt, kopieraSomEget } from "../engines/programs.js";
import { DEMO_PROGRAM } from "../data/demo.js";
import { buildLive } from "../atlas2/WorkoutView.jsx";
import { readFileSync } from "fs";
import { resolve } from "path";

const prog = () => JSON.parse(JSON.stringify(DEMO_PROGRAM));

describe("upptäcker om passet ändrats", () => {
  it("ett oförändrat pass är inte ändrat", () => {
    const p = prog();
    expect(passetÄndrat(buildLive(p, p.workouts[0], []), p)).toBe(false);
  });

  it("ett byte upptäcks", () => {
    const p = prog();
    const live = buildLive(p, p.workouts[0], []);
    live.items[0] = { ...live.items[0], exId: "incline_bench_bb" };
    expect(passetÄndrat(live, p)).toBe(true);
  });

  it("en tillagd övning upptäcks", () => {
    const p = prog();
    const live = buildLive(p, p.workouts[0], []);
    live.items.push({ ...live.items[0], exId: "cable_crossover" });
    expect(passetÄndrat(live, p)).toBe(true);
  });

  it("set och reps ignoreras", () => {
    // De justeras ändå per pass av progressionen. En användare som bytt övning
    // har inte nödvändigtvis ändrat setantalet.
    const p = prog();
    const live = buildLive(p, p.workouts[0], []);
    live.items[0] = { ...live.items[0], set: 5, reps: 3 };
    expect(passetÄndrat(live, p)).toBe(false);
  });

  it("fritt pass utan workoutId är aldrig ändrat", () => {
    expect(passetÄndrat({ items: [], workoutId: null }, prog())).toBe(false);
  });
});

describe("sparar tillbaka till programmet", () => {
  it("övningen byts i programmet", () => {
    const p = prog();
    const live = buildLive(p, p.workouts[0], []);
    live.items[0] = { ...live.items[0], exId: "incline_bench_bb" };
    const ny = sparaPassTillProgram(live, p);
    expect(ny.workouts[0].exercises[0].exId).toBe("incline_bench_bb");
  });

  it("programmet BYTER INTE id", () => {
    // Historiken pekar på programId + workoutId; ett nytt id skulle klippa av
    // progressionen — förra veckans knäböj skulle inte längre vara samma pass.
    const p = prog();
    const live = buildLive(p, p.workouts[0], []);
    live.items[0] = { ...live.items[0], exId: "incline_bench_bb" };
    expect(sparaPassTillProgram(live, p).id).toBe(p.id);
  });

  it("versioneras med not — ändringen går att ångra", () => {
    const p = prog();
    const live = buildLive(p, p.workouts[0], []);
    live.items[0] = { ...live.items[0], exId: "incline_bench_bb" };
    const ny = sparaPassTillProgram(live, p);
    expect(ny.version).toBe((p.version || 1) + 1);
    expect(ny.history.length).toBe(1);
    expect(ny._lastNote).toMatch(/Ändrade övningar i/);
  });

  it("set och reps behålls för övningar som fanns", () => {
    const p = prog();
    const orig = p.workouts[0].exercises[1];
    const live = buildLive(p, p.workouts[0], []);
    live.items[0] = { ...live.items[0], exId: "incline_bench_bb" };
    const ny = sparaPassTillProgram(live, p);
    expect(ny.workouts[0].exercises[1]).toEqual(orig);
  });

  it("andra pass i programmet rörs inte", () => {
    const p = prog();
    const live = buildLive(p, p.workouts[0], []);
    live.items[0] = { ...live.items[0], exId: "incline_bench_bb" };
    const ny = sparaPassTillProgram(live, p);
    expect(ny.workouts[1]).toEqual(p.workouts[1]);
  });
});

describe("inbyggda program kopieras i stället", () => {
  it("kopian får nytt id och (egen) i namnet", () => {
    const k = kopieraSomEget({ ...prog(), builtin: true });
    expect(k.id).toMatch(/^own_/);
    expect(k.name).toMatch(/\(egen\)$/);
    expect(k.builtin).toBeUndefined();
  });

  it("(egen) dubbleras inte", () => {
    const k = kopieraSomEget({ ...prog(), name: "PPL (egen)" });
    expect(k.name).toBe("PPL (egen)");
  });

  it("ärInbyggt känner igen flaggan", () => {
    expect(ärInbyggt({ id: "x", builtin: true })).toBe(true);
    expect(ärInbyggt({ id: "builtin_ppl" })).toBe(true);
    expect(ärInbyggt(prog())).toBe(false);
  });
});

describe("frågan ställs på kvittot, inte under passet", () => {
  const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");

  it("DoneView tar emot ändrat och onSparaÄndring", () => {
    expect(src).toMatch(/ändrat = false, onSparaÄndring/);
  });

  it("live-passet följer med i resultatet", () => {
    expect(src).toMatch(/onDone\(\{ session, minuter: Math\.max\(1, passMin\), live \}\)/);
  });

  it("bekräftelsen villkoras inte på ändrat", () => {
    // Så fort programmet uppdaterats matchar passet igen och ändrat blir
    // false — då försvann texten i samma ögonblick den skulle visas.
    expect(src).toMatch(/\{sparat && \(\n/);
    expect(src).not.toMatch(/\{sparat && ändrat && \(/);
  });
});
