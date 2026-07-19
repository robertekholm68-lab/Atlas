import { describe, it, expect } from "vitest";
import { recommendPrograms } from "../engines/programs.js";

describe("recommendPrograms: målvikter påverkar rankningen", () => {
  const base = { equip: null, recovery: 70, history: [] };

  it("hög muskelvikt lyfter hypertrofi-program", () => {
    const recs = recommendPrograms({ ...base, weights: { muscle: 100, strength: 20, fatloss: 0, conditioning: 0 } });
    const top = recs.slice(0, 5).map(r => r.template.goal);
    expect(top).toContain("Hypertrophy");
  });

  it("hög styrkevikt lyfter styrkeprogram", () => {
    const recs = recommendPrograms({ ...base, weights: { muscle: 20, strength: 100, fatloss: 0, conditioning: 0 } });
    const top = recs.slice(0, 5).map(r => r.template.goal);
    expect(top).toContain("Strength");
  });

  it("hög fett/kondition-vikt ändrar toppförslaget jämfört med ren styrka", () => {
    const strengthTop = recommendPrograms({ ...base, weights: { muscle: 20, strength: 100, fatloss: 0, conditioning: 0 } })[0].template;
    const condTop = recommendPrograms({ ...base, weights: { muscle: 20, strength: 5, fatloss: 90, conditioning: 90 } })[0].template;
    // olika inriktning → sannolikt oler olika toppförslag (goal eller familj skiljer)
    expect(strengthTop.goal !== condTop.goal || strengthTop.family !== condTop.family).toBe(true);
  });

  it("fungerar utan vikter (bakåtkompatibelt)", () => {
    const recs = recommendPrograms({ goal: "Hypertrophy", ...base });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].template).toBeTruthy();
  });
});
