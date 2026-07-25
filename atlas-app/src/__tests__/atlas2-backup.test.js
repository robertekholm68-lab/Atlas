// @vitest-environment jsdom
// Askr 2.0 — backup av v3-datan. Kärnan som bevakas: exporten fångar ALLT i
// atlas.v3.*, återställningen skriver ALDRIG utanför atlas.v3.*, och fel
// sorts fil avvisas med förklaring i stället för att halvt läsas in.

import { describe, it, expect, beforeEach } from "vitest";
import { buildV3Backup, inspectV3Backup, restoreV3Backup, v3Keys, v3BackupFilename, V3_BACKUP_VERSION } from "../atlas2/backup2.js";

beforeEach(() => localStorage.clear());

describe("v3-backup", () => {
  it("fångar alla v3-nycklar men rör varken v2, mobilen eller andra sajter", () => {
    localStorage.setItem("atlas.v3.sessions", JSON.stringify([{ id: "a" }, { id: "b" }]));
    localStorage.setItem("atlas.v3.foodLog", JSON.stringify([{ id: "f" }]));
    localStorage.setItem("atlas.v2.real.sessions", JSON.stringify([{ id: "x" }]));
    localStorage.setItem("atlas.mobile.sessions", JSON.stringify([{ id: "y" }]));
    localStorage.setItem("annan-app", "rör-mig-inte");
    const keys = v3Keys();
    expect(keys).toEqual(["atlas.v3.foodLog", "atlas.v3.sessions"]);
    const b = buildV3Backup();
    expect(b.scope).toBe("v3");
    expect(b.summary.sessions).toBe(2);
    expect(b.summary.foodLog).toBe(1);
    expect(Object.keys(b.data)).not.toContain("atlas.v2.real.sessions");
  });

  it("granskningen avvisar skräp, främmande filer och v2-backuper med förklaring", () => {
    expect(inspectV3Backup("inte json").ok).toBe(false);
    expect(inspectV3Backup(JSON.stringify({ app: "Annat", data: {} })).ok).toBe(false);
    expect(inspectV3Backup(JSON.stringify({ app: "Askr", backupVersion: V3_BACKUP_VERSION + 1, data: {} })).ok).toBe(false);
    // En v2-backup är en riktig Askr-fil — men fel scope. Ärligt nej med skäl.
    const v2 = inspectV3Backup(JSON.stringify({ app: "Askr", backupVersion: 1, data: { "atlas.v2.real.sessions": "[]" } }));
    expect(v2.ok).toBe(false);
    expect(v2.error).toContain("nuvarande appen");
  });

  it("roundtrip: export → rensa → återställ ger samma data tillbaka", () => {
    localStorage.setItem("atlas.v3.sessions", JSON.stringify([{ id: "a" }]));
    localStorage.setItem("atlas.v3.nutritionTargets", JSON.stringify({ kcal: 2400 }));
    const b = buildV3Backup();
    localStorage.clear();
    const insp = inspectV3Backup(JSON.stringify(b));
    expect(insp.ok).toBe(true);
    const r = restoreV3Backup(insp.obj);
    expect(r.written).toBe(2);
    expect(JSON.parse(localStorage.getItem("atlas.v3.nutritionTargets")).kcal).toBe(2400);
  });

  it("SPÄRREN: återställning skriver aldrig nycklar utanför atlas.v3.*", () => {
    localStorage.setItem("atlas.v2.real.sessions", JSON.stringify([{ id: "orörd" }]));
    const fientlig = {
      app: "Askr", scope: "v3", backupVersion: 1, createdAt: null,
      data: {
        "atlas.v3.sessions": "[]",
        "atlas.v2.real.sessions": "[]",     // försök att skriva över v2
        "atlas.mobile.sessions": "[]",      // och mobilen
        "helt-annan-nyckel": "x",
      },
    };
    const r = restoreV3Backup(fientlig);
    expect(r.written).toBe(1);
    expect(r.skipped).toBe(3);
    expect(JSON.parse(localStorage.getItem("atlas.v2.real.sessions"))[0].id).toBe("orörd");
    expect(localStorage.getItem("atlas.mobile.sessions")).toBeNull();
    expect(localStorage.getItem("helt-annan-nyckel")).toBeNull();
  });

  it("replace rensar gammal v3-data så en återställning inte blandar två liv", () => {
    localStorage.setItem("atlas.v3.gammalNyckel", "kvarleva");
    const r = restoreV3Backup({ app: "Askr", data: { "atlas.v3.sessions": "[]" } });
    expect(r.ok).toBe(true);
    expect(localStorage.getItem("atlas.v3.gammalNyckel")).toBeNull();
  });

  it("filnamnet är tidsstämplat och säger askr", () => {
    const n = v3BackupFilename(new Date("2026-07-24T21:30:00").getTime());
    expect(n).toBe("askr-backup-2026-07-24-2130.json");
  });
});
