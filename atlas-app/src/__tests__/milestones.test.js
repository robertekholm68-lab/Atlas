import { describe, it, expect } from "vitest";
import { milestones } from "../engines/index.js";
describe("milstolpar", () => {
  it("inga pass → inget upplåst, nästa = första passet", () => {
    const m = milestones([]);
    expect(m.earned).toBe(0);
    expect(m.next.target).toBe(1);
    expect(m.count).toBe(0);
  });
  it("12 pass → 1 och 10 upplåsta, nästa = 25", () => {
    const m = milestones(Array(12).fill({ completedAt: Date.now() }));
    expect(m.list.find(x => x.target === 1).reached).toBe(true);
    expect(m.list.find(x => x.target === 10).reached).toBe(true);
    expect(m.list.find(x => x.target === 25).reached).toBe(false);
    expect(m.next.target).toBe(25);
    expect(m.next.current).toBe(12);
  });
  it("100+ pass → allt upplåst, ingen nästa", () => {
    const m = milestones(Array(100).fill({}));
    expect(m.earned).toBe(m.total);
    expect(m.next).toBe(null);
  });
  it("räknar totalt antal pass (inte dagar i rad — vila bestraffas ej)", () => {
    expect(milestones(Array(25).fill({})).list.find(x => x.target === 25).reached).toBe(true);
  });
});
