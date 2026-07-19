// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { saveState, loadState, clearAtlasData } from "../app/persist.js";

describe("P2 — localStorage-persistens", () => {
  beforeEach(() => window.localStorage.clear());
  it("saveState + loadState bevarar data", () => {
    saveState("sessions", [{ id: "x", w: 100 }]);
    expect(loadState("sessions", [])).toEqual([{ id: "x", w: 100 }]);
  });
  it("loadState ger fallback när nyckel saknas", () => {
    expect(loadState("saknas", "demo")).toBe("demo");
  });
  it("clearAtlasData rensar all atlas-data", () => {
    saveState("foodLog", [1, 2, 3]);
    clearAtlasData();
    expect(loadState("foodLog", "tom")).toBe("tom");
  });
});
