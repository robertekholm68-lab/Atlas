// @vitest-environment jsdom
// ATLAS 2.0 — bevakar att det NYA gränssnittet ärver den GAMLA sanningen.
// Utseendet får ändras fritt; det här är reglerna som inte får ändras.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bodyState, todaysMessage, weekSessions, lastSessionLabel, load, save } from "../atlas2/store.js";
import { C, orDash, DASH, statusColor } from "../atlas2/design.js";

const DAG = 864e5;

describe("ATLAS 2.0 — utan underlag hittas ingenting på", () => {
  it("tom historik ger overall null, inte noll", () => {
    const r = bodyState([], Date.now());
    // En nolla påstår att beredskapen är mätt och blev noll. Null säger att vi
    // inte vet. Skillnaden är hela produktens själ.
    expect(r.overall).toBe(null);
    expect(r.covered).toBe(0);
  });

  it("beskedet säger rakt ut att historik saknas", () => {
    const r = bodyState([], Date.now());
    const m = todaysMessage(r.states, 0);
    expect(m.empty).toBe(true);
    expect(m.text).toMatch(/ingen historik/i);
  });

  it("alla muskler rapporterar no_data utan pass", () => {
    const r = bodyState([], Date.now());
    const statusar = new Set(Object.values(r.states).map(s => s.status));
    expect([...statusar]).toEqual(["no_data"]);
  });

  it("orDash ger streck för null, undefined och NaN — men behåller nollan", () => {
    expect(orDash(null)).toBe(DASH);
    expect(orDash(undefined)).toBe(DASH);
    expect(orDash(NaN)).toBe(DASH);
    expect(orDash(0)).toBe(0);       // en RIKTIG nolla ska visas som nolla
  });

  it("senaste pass är null utan historik, inte 'idag'", () => {
    expect(lastSessionLabel([])).toBe(null);
  });
});

describe("ATLAS 2.0 — med underlag härleds allt ur loggen", () => {
  const pass = (dagarSen, laster) => ({
    id: "s" + dagarSen, completedAt: Date.now() - dagarSen * DAG, muscleLoads: laster, sets: [],
  });

  it("en loggad muskel får en siffra, resten förblir no_data", () => {
    const r = bodyState([pass(1, { pectoralis_major: 400 })], Date.now());
    expect(r.states.pectoralis_major.status).not.toBe("no_data");
    expect(r.overall).not.toBe(null);
    expect(r.covered).toBe(1);
  });

  it("veckans pass räknas per kalendervecka, inte rullande sju dagar", () => {
    // Måndag 06:00. Ett pass i söndags tillhör FÖRRA veckan, inte denna.
    const måndag = new Date(2026, 6, 20, 6, 0).getTime();
    const söndag = måndag - 12 * 3600e3;
    const v = weekSessions([{ completedAt: söndag }, { completedAt: måndag - 3600e3 }], måndag);
    expect(v.length).toBe(1);
  });

  it("igår heter 'Igår', inte '1 dgr'", () => {
    const nu = new Date(2026, 6, 21, 10, 0).getTime();
    expect(lastSessionLabel([{ completedAt: nu - DAG }], nu)).toBe("Igår");
  });
});

describe("ATLAS 2.0 — designsystemet", () => {
  it("statusfärger är egna färger, aldrig accenten", () => {
    for (const s of ["ready", "recovering", "critical", "undertrained", "no_data"]) {
      expect(statusColor(s)).not.toBe(C.lime);
    }
  });

  it("okänd status faller tillbaka på ingen-data-grått", () => {
    expect(statusColor("nonsens")).toBe(C.nodata);
  });
});

describe("ATLAS 2.0 — egen namnrymd skyddar befintlig data", () => {
  let box;
  beforeEach(() => {
    box = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: k => (k in box ? box[k] : null),
        setItem: (k, v) => { box[k] = String(v); },
        removeItem: k => { delete box[k]; },
      },
    });
  });
  afterEach(() => { delete globalThis.localStorage; });

  it("skriver under atlas.v3. och rör inte v2 eller mobile", () => {
    box["atlas.v2.sessions"] = JSON.stringify([{ id: "gammal" }]);
    box["atlas.mobile.sessions"] = JSON.stringify([{ id: "mobil" }]);
    save("sessions", [{ id: "ny" }]);
    expect(box["atlas.v3.sessions"]).toBeTruthy();
    expect(JSON.parse(box["atlas.v2.sessions"])[0].id).toBe("gammal");
    expect(JSON.parse(box["atlas.mobile.sessions"])[0].id).toBe("mobil");
  });

  it("läser inte gammal data av misstag", () => {
    box["atlas.v2.sessions"] = JSON.stringify([{ id: "gammal" }]);
    expect(load("sessions", [])).toEqual([]);
  });
});

describe("ATLAS 2.0 — muskelkartans regioner", () => {
  it("en region färgas efter den MINST återhämtade muskeln", async () => {
    const { regionState } = await import("../atlas2/BodyMap2.jsx");
    // Axelregionen är EN form men tre muskler i taxonomin. Är en av dem trött
    // ska det synas — en utvilad delmuskel får aldrig dölja en sliten.
    const states = {
      deltoid_anterior: { status: "ready", readiness: 90 },
      deltoid_lateral: { status: "critical", readiness: 22 },
      deltoid_posterior: { status: "ready", readiness: 88 },
    };
    expect(regionState("deltoids", states).readiness).toBe(22);
  });

  it("region utan underlag ger null, inte ett påhittat medelvärde", async () => {
    const { regionState } = await import("../atlas2/BodyMap2.jsx");
    const states = { deltoid_anterior: { status: "no_data", readiness: null } };
    expect(regionState("deltoids", states)).toBe(null);
  });

  it("varje region mappar mot riktiga muskel-id ur taxonomin", async () => {
    const { REGION_MAP } = await import("../atlas2/BodyMap2.jsx");
    const { MUSCLES } = await import("../data/muscles.js");
    Object.values(REGION_MAP).flat().forEach(id => {
      expect(MUSCLES[id], `${id} finns inte i taxonomin`).toBeTruthy();
    });
  });
});
