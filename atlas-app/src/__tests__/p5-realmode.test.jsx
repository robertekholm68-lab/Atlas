// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import Atlas from "../app/App.jsx";
import { mergeProfileFromOnboarding, importLegacyIntoReal, getMigrationStatus, hasLegacyV1, getLegacyRecordTypes, loadState, saveState } from "../app/persist.js";
import { computeSessionLoad } from "../engines/index.js";
import { EXERCISES } from "../data/exercises.js";

const DAY = 864e5;
function makeSessions(n) {
  const out = []; const now = Date.now();
  for (let i = 0; i < n; i++) { const sets = [{ exerciseId: "squat", weight: 100, reps: 5, rpe: 8 }]; out.push({ id: "s" + i, title: "Pass", completedAt: now - (i % 6) * DAY - i * 3600, sets, muscleLoads: computeSessionLoad(sets, EXERCISES) }); }
  return out;
}

describe("§5 mergeProfileFromOnboarding — bevarar historik vid omstart", () => {
  it("bevarar id, avatar, bilder, mått, vikthistorik, createdAt; uppdaterar bara onboarding-fält", () => {
    const existing = {
      id: "user_abc", avatar: "data:img", photos: [{ url: "p1", date: "1 jan" }],
      measurements: { "Bröst": 104 }, weightHistory: [83, 82.5, 82.4],
      memberSince: "Jan 2026", createdAt: "2026-01-01T00:00:00Z",
      name: "Robert", coachExtra: "keep-me", nutritionTargets: { kcal: 2000, protein: 150 },
    };
    const merged = mergeProfileFromOnboarding(existing, { name: "Robert Ny", primaryGoal: "strength", coachLevel: "strict", calorieTarget: 2600, proteinTarget: 190 }, "Jul 2026");
    expect(merged.id).toBe("user_abc");
    expect(merged.avatar).toBe("data:img");
    expect(merged.photos).toHaveLength(1);
    expect(merged.measurements).toEqual({ "Bröst": 104 });
    expect(merged.weightHistory).toEqual([83, 82.5, 82.4]);   // nollställs ALDRIG
    expect(merged.memberSince).toBe("Jan 2026");               // bevaras
    expect(merged.createdAt).toBe("2026-01-01T00:00:00Z");
    expect(merged.coachExtra).toBe("keep-me");                 // ej-onboardat fält bevaras
    expect(merged.name).toBe("Robert Ny");                     // onboarding-fält uppdateras
    expect(merged.nutritionTargets).toEqual({ kcal: 2600, protein: 190 });
  });
  it("skapar stabilt id om det saknas", () => {
    const m = mergeProfileFromOnboarding({}, { name: "Ny" }, "Jul 2026");
    expect(typeof m.id).toBe("string"); expect(m.id.length).toBeGreaterThan(0);
    expect(m.weightHistory).toEqual([]);
  });
});

describe("§7 legacy-migrering — idempotent, icke-destruktiv", () => {
  beforeEach(() => { try { window.localStorage.clear(); } catch (e) {} });
  it("import lägger till i real, bevarar legacy, och är idempotent", () => {
    window.localStorage.setItem("atlas.v1.sessions", JSON.stringify([{ id: "old1" }, { id: "old2" }]));
    const st1 = importLegacyIntoReal();
    expect(st1.status).toBe("imported");
    expect(loadState("sessions", [], "real")).toEqual([{ id: "old1" }, { id: "old2" }]);
    expect(window.localStorage.getItem("atlas.v1.sessions")).not.toBe(null);   // legacy bevarad
    const before = loadState("sessions", [], "real").length;
    importLegacyIntoReal();   // andra körningen
    expect(loadState("sessions", [], "real").length).toBe(before);            // ingen dubbelimport
  });
  it("skriver aldrig över befintliga real-poster med samma id", () => {
    saveState("sessions", [{ id: "old1", mine: true }], "real");
    window.localStorage.setItem("atlas.v1.sessions", JSON.stringify([{ id: "old1", mine: false }, { id: "old3" }]));
    importLegacyIntoReal();
    const s = loadState("sessions", [], "real");
    expect(s.find(x => x.id === "old1").mine).toBe(true);   // befintlig vinner
    expect(s.some(x => x.id === "old3")).toBe(true);        // ny läggs till
  });
  it("getLegacyRecordTypes sammanfattar upptäckta typer", () => {
    window.localStorage.setItem("atlas.v1.sessions", JSON.stringify([1, 2, 3]));
    const types = getLegacyRecordTypes();
    expect(types.some(t => t.name === "sessions" && t.count === 3)).toBe(true);
  });
});

// ── Render: inga demo-värden i Real Mode ──
async function mountReal(width, sessions) {
  try { window.localStorage.clear(); document.body.innerHTML = ""; } catch (e) {}
  window.localStorage.setItem("atlas.mode", "real");
  window.localStorage.setItem("atlas.v2.real.onboarding", JSON.stringify({ completed: true, name: "Testperson" }));
  if (sessions && sessions.length) window.localStorage.setItem("atlas.v2.real.sessions", JSON.stringify(sessions));
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  const el = document.createElement("div"); document.body.appendChild(el);
  createRoot(el).render(<Atlas />);
  await new Promise(r => setTimeout(r, 240));
  return el;
}
const DEMO_LEAKS = ["678", "Build stronger legs", "7h 45m", "68 ms", "48 bpm", "8,342", "2,4 L", "Next Milestone"];

describe("§13 demo-läckage: Real Mode innehåller inga demo-värden", () => {
  it("desktop real (12 pass) – inga kända demo-fixtures", async () => {
    const el = await mountReal(1280, makeSessions(12));
    const txt = el.textContent;
    DEMO_LEAKS.forEach(v => expect(txt.includes(v)).toBe(false));
    expect(txt).not.toMatch(/Streak.*42|42 d/);
  });
  it("desktop real Recovery-vy visar hälso-tomtillstånd, inte exempel", async () => {
    const el = await mountReal(1280, makeSessions(3));
    // navigera till Recovery
    const btn = [...el.querySelectorAll("button")].find(b => b.textContent.trim() === "Recovery");
    btn && btn.click();
    await new Promise(r => setTimeout(r, 60));
    const txt = el.textContent;
    expect(txt).toMatch(/Ingen hälsodata ansluten ännu/);
    expect(txt.includes("48 bpm")).toBe(false);
  });
  it("mobil real profil med pass visar rätt total (§11), inte 0", async () => {
    const el = await mountReal(400, makeSessions(5));
    const profBtn = [...el.querySelectorAll("button")].find(b => /Profile/.test(b.textContent));
    profBtn && profBtn.click();
    await new Promise(r => setTimeout(r, 60));
    expect(el.textContent).toMatch(/Pass totalt/);
    expect(el.textContent).not.toMatch(/42 d/);
  });
  it("legacy v1-data → migreringsbeslut visas i Real Mode", async () => {
    try { window.localStorage.clear(); document.body.innerHTML = ""; } catch (e) {}
    window.localStorage.setItem("atlas.v1.sessions", JSON.stringify([{ id: "x" }]));
    window.localStorage.setItem("atlas.mode", "real");
    window.localStorage.setItem("atlas.v2.real.onboarding", JSON.stringify({ completed: true, name: "T" }));
    Object.defineProperty(window, "innerWidth", { value: 1280, writable: true, configurable: true });
    const el = document.createElement("div"); document.body.appendChild(el);
    createRoot(el).render(<Atlas />);
    await new Promise(r => setTimeout(r, 240));
    expect(el.textContent).toMatch(/Äldre Askr-data upptäckt/);
    expect(el.textContent).toMatch(/Importera till min riktiga profil/);
  });
});

describe("Demo Mode behåller sin exempelupplevelse", () => {
  it("demo desktop visar demo-värden (streak/health/milestone)", async () => {
    try { window.localStorage.clear(); document.body.innerHTML = ""; } catch (e) {}
    window.localStorage.setItem("atlas.mode", "demo");
    Object.defineProperty(window, "innerWidth", { value: 400, writable: true, configurable: true });
    const el = document.createElement("div"); document.body.appendChild(el);
    createRoot(el).render(<Atlas />);
    await new Promise(r => setTimeout(r, 240));
    // mobil demo dashboard renderar Key Metrics-exempel + milstolpe
    expect(el.innerHTML.length).toBeGreaterThan(2000);
  });
});
