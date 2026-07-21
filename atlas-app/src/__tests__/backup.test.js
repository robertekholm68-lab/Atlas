// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { buildBackup, inspectBackup, restoreBackup, atlasKeys, backupFilename, BACKUP_VERSION } from "../engines/backup.js";

beforeEach(() => localStorage.clear());

describe("backup", () => {
  it("fångar alla Askr-nycklar men rör inte andra sajters data", () => {
    localStorage.setItem("atlas.v2.real.sessions", JSON.stringify([{ id: "a" }, { id: "b" }]));
    localStorage.setItem("atlas.mobile.foodLog", JSON.stringify([{ id: "f" }]));
    localStorage.setItem("annan-app", "rör-mig-inte");
    const keys = atlasKeys();
    expect(keys).toContain("atlas.v2.real.sessions");
    expect(keys).toContain("atlas.mobile.foodLog");
    expect(keys).not.toContain("annan-app");
  });

  it("backupen sammanfattar innehållet ärligt", () => {
    localStorage.setItem("atlas.v2.real.sessions", JSON.stringify([{ id: "a" }, { id: "b" }, { id: "c" }]));
    localStorage.setItem("atlas.v2.real.foodLog", JSON.stringify([{ id: "f" }]));
    const b = buildBackup();
    expect(b.app).toBe("Askr");
    expect(b.summary.sessions).toBe(3);
    expect(b.summary.foodLog).toBe(1);
  });

  it("granskning avvisar skräp och främmande filer", () => {
    expect(inspectBackup("inte json").ok).toBe(false);
    expect(inspectBackup(JSON.stringify({ app: "NågotAnnat", data: {} })).ok).toBe(false);
    expect(inspectBackup(JSON.stringify({ app: "Askr", backupVersion: BACKUP_VERSION + 5, data: {} })).ok).toBe(false);
  });

  it("återläsning återställer exakt det som säkerhetskopierades", () => {
    localStorage.setItem("atlas.v2.real.sessions", JSON.stringify([{ id: "a" }]));
    const b = buildBackup();
    localStorage.clear();
    localStorage.setItem("atlas.v2.real.sessions", JSON.stringify([{ id: "annat" }]));
    const res = inspectBackup(JSON.stringify(b));
    expect(res.ok).toBe(true);
    restoreBackup(res.obj, { replace: true });
    expect(JSON.parse(localStorage.getItem("atlas.v2.real.sessions"))[0].id).toBe("a");
  });

  it("återläsning med replace rensar nycklar som inte finns i backupen", () => {
    localStorage.setItem("atlas.v2.real.sessions", JSON.stringify([{ id: "a" }]));
    const b = buildBackup();
    localStorage.setItem("atlas.v2.real.skrap", "x");
    restoreBackup(inspectBackup(JSON.stringify(b)).obj, { replace: true });
    expect(localStorage.getItem("atlas.v2.real.skrap")).toBe(null);
  });

  it("filnamnet har datum och tid", () => {
    expect(backupFilename(new Date("2026-07-18T06:05:00").getTime())).toMatch(/^atlas-backup-2026-07-18-\d{4}\.json$/);
  });
});
