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

describe("ATLAS 2.0 — coachens faktakälla", () => {
  const pass = (dagarSen, laster, vol = 3000) => ({
    completedAt: Date.now() - dagarSen * 864e5, muscleLoads: laster, totalVolume: vol, sets: [],
  });

  it("tom vikthistorik tystar INTE coachen om kroppen", async () => {
    const { coachFacts, recommendation } = await import("../atlas2/facts.js");
    // Riktig bugg, hittad i bygget: tilliten togs som globalt minimum över alla
    // block, så en tom vikthistorik gjorde att coachen påstod sig veta
    // ingenting trots 42 loggade pass. Att jag inte vet vad du väger säger
    // ingenting om dina muskler.
    const sessions = [pass(1, { pectoralis_major: 500 }), pass(4, { quadriceps: 600 }), pass(8, { latissimus_dorsi: 400 })];
    const f = coachFacts({ sessions, weights: [] });
    expect(f.datalage.svagast).not.toBe("ingen");
    expect(recommendation(f).rubrik).not.toMatch(/logga ett pass/i);
    expect(f.datalage.perBlock.vikt).toBe("ingen");   // vikten är fortfarande svag
  });

  it("utan pass säger coachen rakt ut att den inte vet", async () => {
    const { coachFacts, recommendation } = await import("../atlas2/facts.js");
    const f = coachFacts({ sessions: [], weights: [] });
    expect(f.kropp.readiness).toBe(null);
    expect(recommendation(f).rubrik).toMatch(/logga ett pass/i);
    expect(recommendation(f).skäl).toEqual([]);
  });

  it("rekommendationen bär alltid sina skäl när den uttalar sig", async () => {
    const { coachFacts, recommendation } = await import("../atlas2/facts.js");
    const sessions = [pass(1, { quadriceps: 900 }), pass(3, { pectoralis_major: 400 }), pass(9, { latissimus_dorsi: 300 })];
    const r = recommendation(coachFacts({ sessions, weights: [] }));
    expect(r.skäl.length).toBeGreaterThan(0);
  });

  it("svagt underlag ger reservation, inte tystnad", async () => {
    const { coachFacts, recommendation } = await import("../atlas2/facts.js");
    const r = recommendation(coachFacts({ sessions: [pass(1, { pectoralis_major: 500 })], weights: [] }));
    expect(r.reservation).toBe(true);
  });
});

describe("ATLAS 2.0 — volym räknas ur seten", () => {
  it("ett pass utan totalVolume får ändå rätt volym", async () => {
    const { sessionVolume } = await import("../atlas2/store.js");
    // buildSession sätter aldrig totalVolume. Läser man det fältet blir alla
    // riktiga pass noll — bara demofixturen ser rätt ut. Volymen måste komma
    // ur seten.
    const s = { sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 6 }] };
    expect(sessionVolume(s)).toBe(840);
  });

  it("gamla poster med totalVolume men utan set faller tillbaka på fältet", async () => {
    const { sessionVolume } = await import("../atlas2/store.js");
    expect(sessionVolume({ sets: [], totalVolume: 5000 })).toBe(5000);
  });

  it("tomt pass ger noll, inte NaN", async () => {
    const { sessionVolume } = await import("../atlas2/store.js");
    expect(sessionVolume({})).toBe(0);
    expect(sessionVolume(null)).toBe(0);
  });
});

describe("ATLAS 2.0 — mat", () => {
  it("recept räknar näring ur ingredienserna, inte ur ett fält som saknas", async () => {
    const { RECIPES } = await import("../data/recipes.js");
    const { FOOD_INDEX } = await import("../data/foods.js");
    // Recepten bär `i: [{id, g}]`, aldrig färdiga kcal. Läser man r.kcal blir
    // varje recept 0 — samma klass av bugg som totalVolume.
    const r = RECIPES[0];
    expect(r.kcal).toBeUndefined();
    expect(Array.isArray(r.i)).toBe(true);
    const kcal = r.i.reduce((a, ing) => {
      const f = FOOD_INDEX.find(x => x.id === ing.id);
      return a + (f ? f.kcal * (ing.g || 0) / 100 : 0);
    }, 0) / (r.servings || 1);
    expect(kcal).toBeGreaterThan(0);
  });

  it("nutritionsfältet heter kcal, aldrig calories", async () => {
    const { FOOD_INDEX } = await import("../data/foods.js");
    const f = FOOD_INDEX[0];
    expect(f.kcal).toBeGreaterThan(0);
    expect(f.calories).toBeUndefined();
  });
});

describe("ATLAS 2.0 — import av befintlig historik", () => {
  let box;
  const D = 864e5;
  beforeEach(() => {
    box = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: k => (k in box ? box[k] : null), setItem: (k, v) => { box[k] = String(v); }, removeItem: k => { delete box[k]; } },
    });
  });
  afterEach(() => { delete globalThis.localStorage; });

  const pass = (id, dagar, titel, nu) => ({ id, title: titel, completedAt: nu - dagar * D, sets: [], muscleLoads: { pectoralis_major: 300 } });

  it("samma pass i båda källorna importeras EN gång", async () => {
    const { förbered } = await import("../atlas2/import.js");
    const nu = Date.now();
    box["atlas.v2.sessions"] = JSON.stringify([pass("s1", 3, "Push", nu), pass("s2", 6, "Ben", nu)]);
    box["atlas.mobile.sessions"] = JSON.stringify([pass("s2", 6, "Ben", nu), pass("m1", 1, "Pull", nu)]);
    const plan = förbered([]);
    expect(plan.nya.map(s => s.id).sort()).toEqual(["m1", "s1", "s2"]);
    expect(plan.dubbletter).toBe(1);
  });

  it("liknande pass utan gemensamt id avgörs INTE automatiskt", async () => {
    const { förbered } = await import("../atlas2/import.js");
    const nu = Date.now();
    const redan = [pass("a1", 3, "Push", nu)];
    // Samma titel, en halvtimme isär, olika id — kan vara samma pass loggat på
    // två enheter, eller två riktiga pass. Appen ska inte gissa: en felaktig
    // dubblett dubblar muskellasten och får readiness att ljuga.
    box["atlas.mobile.sessions"] = JSON.stringify([{ ...pass("b1", 3, "Push", nu), completedAt: nu - 3 * D + 18e5 }]);
    const plan = förbered(redan);
    expect(plan.nya.length).toBe(0);
    expect(plan.misstänkta.length).toBe(1);
  });

  it("importen skriver aldrig till v2 eller mobile", async () => {
    const { förbered, genomför } = await import("../atlas2/import.js");
    const nu = Date.now();
    box["atlas.v2.sessions"] = JSON.stringify([pass("s1", 2, "Push", nu)]);
    const före = box["atlas.v2.sessions"];
    const r = genomför(förbered([]), [], { sessions: [] });
    expect(r.sessions.length).toBe(1);
    expect(box["atlas.v2.sessions"]).toBe(före);   // originalet orört
  });

  it("spårfältet _källa följer inte med in i sparad data", async () => {
    const { förbered, genomför } = await import("../atlas2/import.js");
    const nu = Date.now();
    box["atlas.v2.sessions"] = JSON.stringify([pass("s1", 2, "Push", nu)]);
    const r = genomför(förbered([]), [], { sessions: [] });
    expect(r.sessions[0]._källa).toBeUndefined();
  });

  it("vikter dedupliceras på tidsstämpel", async () => {
    const { förbered } = await import("../atlas2/import.js");
    const nu = Date.now();
    box["atlas.v2.weights"] = JSON.stringify([{ ts: nu - 5 * D, kg: 82 }, { ts: nu - D, kg: 81 }]);
    box["atlas.mobile.weights"] = JSON.stringify([{ ts: nu - D, kg: 81 }, { ts: nu, kg: 80.8 }]);
    expect(förbered([]).vikter.length).toBe(3);
  });
});
