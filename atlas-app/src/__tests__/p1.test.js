import { describe, it, expect } from "vitest";
import { metricSeries, latestMetric, currentWeight } from "../engines/index.js";

const M = [
  { date: 300, weight: 82.4, waist: 84, bodyFat: 18.0 },
  { date: 100, weight: 83.4, waist: 85 },              // saknar bodyFat
  { date: 200, weight: 82.9, bodyFat: 18.6 },
];

describe("P1 — kanonisk tidsserie", () => {
  it("metricSeries sorterar och filtrerar bort saknade värden", () => {
    expect(metricSeries(M, "bodyFat")).toEqual([{ date: 200, value: 18.6 }, { date: 300, value: 18.0 }]);
  });
  it("metricSeries för vikt behåller alla tre, sorterade", () => {
    expect(metricSeries(M, "weight").map(x => x.value)).toEqual([83.4, 82.9, 82.4]);
  });
  it("latestMetric ger senaste per datum", () => {
    expect(latestMetric(M, "weight")).toBe(82.4);
    expect(latestMetric(M, "bodyFat")).toBe(18.0);
  });
  it("latestMetric = null när metriken saknas", () => {
    expect(latestMetric(M, "hrv")).toBeNull();
  });
  it("currentWeight läser från tidsserien (enda källan)", () => {
    expect(currentWeight({ weight: 99 }, M)).toBe(82.4);
  });
});
