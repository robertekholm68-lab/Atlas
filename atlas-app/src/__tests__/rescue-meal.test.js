import { describe, it, expect } from "vitest";
import { recentIntakeSummary, nutritionProgress, buildRescue, interpretCrisis, startOfLocalDay } from "../engines/index.js";

const DAY = 864e5;
const now = new Date("2026-07-15T18:00:00").getTime();
const yday = startOfLocalDay(now) - DAY + 12 * 3600e3;
const dbefore = startOfLocalDay(now) - 2 * DAY + 12 * 3600e3;

describe("recentIntakeSummary — flerdagars intag", () => {
  it("ärligt tomt-läge utan loggade dagar", () => {
    expect(recentIntakeSummary([], { kcal: 2000 }, now).enough).toBe(false);
  });
  it("räknar snitt och trend mot mål (över)", () => {
    const log = [{ ts: yday, kcal: 2400, protein: 150 }, { ts: dbefore, kcal: 2400, protein: 150 }, { ts: now, kcal: 500, protein: 40 }];
    const r = recentIntakeSummary(log, { kcal: 2000, protein: 160 }, now);
    expect(r.enough).toBe(true);
    expect(r.loggedDays).toBe(2);
    expect(r.avgKcal).toBe(2400);
    expect(r.vsKcal).toBe(400);
    expect(r.trend).toBe("over");
    expect(r.todayKcal).toBe(500);   // dagens räknas separat, inte i snittet
  });
  it("trend under och on beroende på mål", () => {
    const log = [{ ts: yday, kcal: 2400 }, { ts: dbefore, kcal: 2400 }];
    expect(recentIntakeSummary(log, { kcal: 2800 }, now).trend).toBe("under");
    expect(recentIntakeSummary(log, { kcal: 2400 }, now).trend).toBe("on");
  });
});

describe("nutritionProgress — mål + viktutveckling", () => {
  it("härleder viktriktning ur measurements", () => {
    const meas = [{ date: now - 30 * DAY, weight: 82 }, { date: now, weight: 80 }];
    const p = nutritionProgress({ nutritionGoal: "cut" }, meas, now);
    expect(p.goal).toBe("cut");
    expect(p.weight.enough).toBe(true);
    expect(p.weight.dir).toBe("down");
    expect(p.weight.deltaKg).toBeCloseTo(-2, 1);
  });
  it("ärligt tomt utan tillräckliga mätpunkter", () => {
    expect(nutritionProgress({ nutritionGoal: "bulk" }, [{ date: now, weight: 80 }], now).weight.enough).toBe(false);
  });
});

describe("buildRescue — situationsspecifikt, mål-medvetet, stil-differentierat", () => {
  const remaining = { kcal: 600, protein: 40 };
  const recentOver = recentIntakeSummary([{ ts: yday, kcal: 2400 }, { ts: dbefore, kcal: 2400 }], { kcal: 2000 }, now);
  const progCut = nutritionProgress({ nutritionGoal: "cut" }, [], now);

  it("ger minst 3 förslag och kommenterar senaste intaget + målet", () => {
    const r = buildRescue("sweet", remaining, "focused", [], recentOver, progCut, now);
    expect(r.opts.length).toBeGreaterThanOrEqual(3);
    expect(r.context).toMatch(/över målet/);
    expect(r.coach).toMatch(/ner i vikt/);
  });
  it("olika strikthetsnivå ger olika coach- och guard-text", () => {
    const a = buildRescue("sweet", remaining, "focused", [], recentOver, progCut, now);
    const b = buildRescue("sweet", remaining, "flexible", [], recentOver, progCut, now);
    expect(a.coach).not.toBe(b.coach);
    expect(a.guard).not.toBe(b.guard);
  });
  it("olika situationer ger olika förslagspooler", () => {
    const hun = buildRescue("hungover", remaining, "balanced", [], recentOver, progCut, now);
    const swe = buildRescue("sweet", remaining, "balanced", [], recentOver, progCut, now);
    expect(hun.opts.map(o => o.title).join()).not.toBe(swe.opts.map(o => o.title).join());
  });
  it("ärligt läge när data saknas", () => {
    const r = buildRescue("hungry", remaining, "balanced", [], recentIntakeSummary([], { kcal: 2000 }, now), progCut, now);
    expect(r.context).toMatch(/för lite loggat/);
  });
});

describe("buildRescue — förtjänad indulgens styrs av strikthet + målkurva", () => {
  const rem = { kcal: 700, protein: 40 };
  const d3 = startOfLocalDay(now) - 3 * DAY + 12 * 3600e3;
  const recentGood = recentIntakeSummary([{ ts: yday, kcal: 1950 }, { ts: dbefore, kcal: 1980 }, { ts: d3, kcal: 1970 }], { kcal: 2000 }, now);
  const progGood = nutritionProgress({ nutritionGoal: "cut" }, [{ date: now - 30 * DAY, weight: 82 }, { date: now, weight: 80 }], now);
  const hasTreat = r => r.opts.some(o => o.treat);

  it("Fokuserad → aldrig indulgens, även när man ligger bra", () => {
    expect(hasTreat(buildRescue("hungry", rem, "focused", [], recentGood, progGood, now))).toBe(false);
  });
  it("Flexibel → indulgens finns och coachen erkänner marginalen", () => {
    const r = buildRescue("hungry", rem, "flexible", [], recentGood, progGood, now);
    expect(hasTreat(r)).toBe(true);
    expect(r.coach).toMatch(/marginal att unna dig/);
  });
  it("Balanserad + loggat bra + rätt i kurvan → indulgens erbjuds", () => {
    expect(hasTreat(buildRescue("hungry", rem, "balanced", [], recentGood, progGood, now))).toBe(true);
  });
  it("Balanserad men ligger över målet → ingen indulgens", () => {
    const recentOver = recentIntakeSummary([{ ts: yday, kcal: 2500 }, { ts: dbefore, kcal: 2500 }, { ts: d3, kcal: 2500 }], { kcal: 2000 }, now);
    expect(hasTreat(buildRescue("hungry", rem, "balanced", [], recentOver, progGood, now))).toBe(false);
  });
  it("Fokuserad vid pizza-läge → styr mot smart variant och förklarar stilen", () => {
    const r = buildRescue("pizza", rem, "focused", [], recentGood, progGood, now);
    expect(r.coach).toMatch(/Fokuserad stil/);
  });
});

describe("interpretCrisis — lokal fritext-tolkning", () => {
  it("mappar nyckelord till närmaste situation", () => {
    expect(interpretCrisis("jag är sugen på choklad")).toBe("sweet");
    expect(interpretCrisis("på väg till mcdonalds")).toBe("fastfood");
    expect(interpretCrisis("orkar inte laga något")).toBe("nocook");
    expect(interpretCrisis("helt utsvulten")).toBe("hungry");
    expect(interpretCrisis("qwerty zxcv")).toBe("custom");
    expect(interpretCrisis("")).toBe(null);
  });
});
