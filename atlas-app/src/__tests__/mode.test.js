// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { getMode, setModeStored, saveState, loadState, clearModeData, newId, SCHEMA_VERSION } from "../app/persist.js";

beforeEach(() => { try { window.localStorage.clear(); } catch (e) {} });

describe("Läges- och storage-separation (Fas 1)", () => {
  it("läge sparas och läses", () => {
    expect(getMode()).toBe(null);
    setModeStored("real"); expect(getMode()).toBe("real");
    setModeStored(null); expect(getMode()).toBe(null);
  });
  it("demo och real använder separata namespaces — blandas aldrig", () => {
    saveState("sessions", [{ id: "a" }], "demo");
    saveState("sessions", [{ id: "b" }], "real");
    expect(loadState("sessions", [], "demo")).toEqual([{ id: "a" }]);
    expect(loadState("sessions", [], "real")).toEqual([{ id: "b" }]);
  });
  it("clearModeData rensar bara ETT läge", () => {
    saveState("goals", [1], "demo"); saveState("goals", [2], "real");
    clearModeData("real");
    expect(loadState("goals", "TOM", "real")).toBe("TOM");   // rensat
    expect(loadState("goals", "TOM", "demo")).toEqual([1]);  // orört
  });
  it("real-läge saknar värde → faller tillbaka till tomt (ärver ej demo)", () => {
    saveState("foodLog", [{ id: "demo-meal" }], "demo");
    expect(loadState("foodLog", [], "real")).toEqual([]);
  });
  it("newId ger stabila unika ID:n", () => {
    const a = newId("workout"), b = newId("workout");
    expect(a).not.toBe(b);
    expect(a.startsWith("workout_")).toBe(true);
  });
  it("schemaversion är satt", () => { expect(SCHEMA_VERSION).toBe(2); });
});

import { clearDemoData, deleteRealProfile, ensureMeta, runMigrations, exportRealData } from "../app/persist.js";

describe("§4 scope:ad radering + §5 metadata/migrering + §11 export", () => {
  it("clearDemoData rör inte real; deleteRealProfile rör inte demo", () => {
    saveState("profile", { name: "demo" }, "demo");
    saveState("profile", { name: "real" }, "real");
    clearDemoData();
    expect(loadState("profile", null, "demo")).toBe(null);
    expect(loadState("profile", null, "real")).toEqual({ name: "real" });
    saveState("profile", { name: "demo2" }, "demo");
    deleteRealProfile();
    expect(loadState("profile", null, "real")).toBe(null);
    expect(loadState("profile", null, "demo")).toEqual({ name: "demo2" });
  });
  it("ensureMeta skapar strukturerad metadata", () => {
    const m = ensureMeta("real");
    expect(m.schemaVersion).toBe(2);
    expect(m.mode).toBe("real");
    expect(typeof m.userId).toBe("string");
    expect(typeof m.createdAt).toBe("string");
  });
  it("runMigrations är idempotent + rör inte legacy", () => {
    const a = runMigrations("real"), b = runMigrations("real");
    expect(a.migratedTo).toBe(2); expect(b.migratedTo).toBe(2);
    expect(ensureMeta("real").schemaVersion).toBe(2);
  });
  it("exportRealData exporterar bara real-data + metadata", () => {
    saveState("goals", [{ id: "g" }], "real");
    saveState("goals", [{ id: "demoG" }], "demo");
    const ex = exportRealData();
    expect(ex.schemaVersion).toBe(2);
    expect(ex.mode).toBe("real");
    expect(ex.data.goals).toEqual([{ id: "g" }]);
    expect(JSON.stringify(ex.data)).not.toMatch(/demoG/);
  });
});

describe("§2 onboarding-draft persistens (återuppta)", () => {
  it("draft sparas per real-läge och kan återupptas; finns ej i demo", () => {
    saveState("onboarding", { step: 3, name: "Anna", primaryGoal: "muscle" }, "real");
    expect(loadState("onboarding", { step: 0 }, "real")).toEqual({ step: 3, name: "Anna", primaryGoal: "muscle" });
    expect(loadState("onboarding", { step: 0 }, "demo")).toEqual({ step: 0 });
  });
});
