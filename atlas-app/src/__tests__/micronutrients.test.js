import { describe, it, expect } from "vitest";
import { computeMicros, microRef } from "../engines/index.js";
import { FOOD_INDEX } from "../data/foods.js";
describe("mikronäring", () => {
  it("SLV-livsmedel bär micro-data", () => {
    const withMicro = FOOD_INDEX.filter(f => f.micro && typeof f.micro.iron === "number");
    expect(withMicro.length).toBeGreaterThan(1000);
  });
  it("computeMicros summerar järn ur loggen och skalar med gram", () => {
    const f = FOOD_INDEX.find(x => x.micro && x.micro.iron > 5);
    expect(f).toBeTruthy();
    const m = computeMicros([{ foodId: f.id, grams: 200 }]);
    expect(m.iron).toBeCloseTo(f.micro.iron * 2, 1);
  });
  it("microRef könsjusterar järn", () => {
    expect(microRef("iron", "female").ri).toBe(15);
    expect(microRef("iron", "male").ri).toBe(9);
    expect(microRef("calcium", "female").ri).toBe(800);
  });

  it("kurerade snabb-livsmedel har verifierad micro (kyckling, mjölk, spenat)", () => {
    const g = id => FOOD_INDEX.find(x => x.id === id);
    expect(g("chicken").micro.iron).toBeGreaterThan(0);
    expect(g("milk").micro.calcium).toBeGreaterThan(100);   // riktig mjölk ~120 mg
    expect(g("spinach").micro.iron).toBeGreaterThan(1.5);   // spenat järnrikt
    expect(g("almonds").micro.calcium).toBeGreaterThan(200);
  });
  it("fria-text-poster utan foodId ignoreras", () => {
    expect(computeMicros([{ kcal: 500, protein: 20 }])).toEqual({});
  });
});
