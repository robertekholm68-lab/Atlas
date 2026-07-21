// @vitest-environment jsdom
// Askr 2.0 — bevakar att det NYA gränssnittet ärver den GAMLA sanningen.
// Utseendet får ändras fritt; det här är reglerna som inte får ändras.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bodyState, todaysMessage, weekSessions, lastSessionLabel, load, save, dagensNutrition, nutritionCtx } from "../atlas2/store.js";
import { C, orDash, DASH, statusColor } from "../atlas2/design.js";
import { backAction, harBakåtmål } from "../atlas2/backnav.js";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";

const DAG = 864e5;

describe("Askr 2.0 — utan underlag hittas ingenting på", () => {
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

describe("Askr 2.0 — med underlag härleds allt ur loggen", () => {
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

describe("Askr 2.0 — designsystemet", () => {
  it("statusfärger är egna färger, aldrig accenten", () => {
    for (const s of ["ready", "recovering", "critical", "undertrained", "no_data"]) {
      expect(statusColor(s)).not.toBe(C.lime);
    }
  });

  it("okänd status faller tillbaka på ingen-data-grått", () => {
    expect(statusColor("nonsens")).toBe(C.nodata);
  });
});

describe("Askr 2.0 — egen namnrymd skyddar befintlig data", () => {
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

describe("Askr 2.0 — muskelkartans regioner", () => {
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

describe("Askr 2.0 — coachens faktakälla", () => {
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

describe("Askr 2.0 — volym räknas ur seten", () => {
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

describe("Askr 2.0 — mat", () => {
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

describe("Askr 2.0 — import av befintlig historik", () => {
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

describe("mobilen — volymbuggen", () => {
  it("ett riktigt pass från buildSession saknar totalVolume", async () => {
    const { buildSession } = await import("../engines/session.js");
    const s = buildSession({
      sets: [{ exerciseId: "barbell_bench_press", weight: 60, reps: 8 }],
      source: "training", title: "Test", completedAt: Date.now(),
    });
    // Grunden till buggen: fältet finns helt enkelt inte. All kod som summerar
    // `totalVolume` får därför noll för varje riktigt pass.
    expect(s.totalVolume).toBeUndefined();
    expect((s.sets || []).length).toBe(1);
  });
});

describe("Askr 2.0 — muskeldetalj", () => {
  it("regionens delmuskler visas var för sig, inte som medelvärde", async () => {
    const { REGION_MAP } = await import("../atlas2/BodyMap2.jsx");
    // Ett medelvärde hade dolt att en delmuskel är sliten medan de andra är
    // utvilade — samma resonemang som färgningen på kartan.
    expect(REGION_MAP.deltoids.length).toBe(3);
  });

  it("varje regionnamn är på svenska", async () => {
    const { REGIONNAMN, REGION_MAP } = await import("../atlas2/BodyMap2.jsx");
    Object.keys(REGION_MAP).forEach(id => {
      expect(REGIONNAMN[id], `${id} saknar svenskt namn`).toBeTruthy();
    });
  });
});

describe("Askr 2.0 — målresan", () => {
  const V = 6048e5;

  it("faserna täcker hela blocket utan glapp eller överlapp", async () => {
    const { skapaMål, faser } = await import("../atlas2/journey.js");
    const start = new Date(2026, 0, 1).getTime();
    const m = skapaMål({ typ: "strength", startDatum: start, målDatum: start + 16 * V });
    const fs = faser(m);
    expect(fs.length).toBe(4);
    expect(fs[0].från).toBe(start);
    expect(fs[fs.length - 1].till).toBe(m.målDatum);
    // Varje fas ska börja exakt där föregående slutade.
    fs.slice(1).forEach((f, i) => expect(f.från).toBe(fs[i].till));
  });

  it("fasindelningen håller för både korta och långa block", async () => {
    const { skapaMål, faser } = await import("../atlas2/journey.js");
    // Andelar, inte fasta veckor — annars går modellen sönder vid ytterlägena.
    [5, 40].forEach(v => {
      const m = skapaMål({ typ: "muscle", startDatum: 0, målDatum: v * V });
      const fs = faser(m);
      expect(fs.length).toBe(4);
      expect(fs.every(f => f.veckor >= 1)).toBe(true);
    });
  });

  it("mål utan måldatum ger ingen resa, inte en tom attrapp", async () => {
    const { resa } = await import("../atlas2/journey.js");
    expect(resa(null)).toBe(null);
    expect(resa({ namn: "X", startDatum: 0 })).toBe(null);
  });

  it("passerat måldatum sägs rakt ut", async () => {
    const { skapaMål, resa, resansText } = await import("../atlas2/journey.js");
    const start = Date.now() - 20 * V;
    const m = skapaMål({ typ: "muscle", startDatum: start, målDatum: start + 10 * V });
    const r = resa(m, [], Date.now());
    expect(r.passerat).toBe(true);
    expect(r.veckorKvar).toBe(0);
    expect(resansText(r)).toMatch(/passerat/i);
  });

  it("följsamhet visas inte under första veckan", async () => {
    const { skapaMål, resa } = await import("../atlas2/journey.js");
    const nu = Date.now();
    const m = skapaMål({ typ: "muscle", startDatum: nu - 2 * 864e5, målDatum: nu + 12 * V });
    // Två dagar in säger "0 %" ingenting sant om följsamheten.
    expect(resa(m, [], nu).följsamhet).toBe(null);
  });

  it("följsamhet räknas mot förväntat antal pass", async () => {
    const { skapaMål, resa } = await import("../atlas2/journey.js");
    const nu = Date.now();
    const start = nu - 4 * V;
    const m = skapaMål({ typ: "muscle", startDatum: start, målDatum: nu + 8 * V, passPerVecka: 3 });
    const sessions = Array.from({ length: 12 }, (_, i) => ({ completedAt: start + i * 2 * 864e5 }));
    const r = resa(m, sessions, nu);
    expect(r.passFörväntade).toBe(12);
    expect(r.följsamhet).toBe(100);
  });

  it("coachen får ett målblock först när ett mål finns", async () => {
    const { coachFacts } = await import("../atlas2/facts.js");
    expect(coachFacts({ sessions: [] }).målresa.namn).toBe(null);
    const { skapaMål } = await import("../atlas2/journey.js");
    const nu = Date.now();
    const m = skapaMål({ typ: "strength", namn: "Styrka", startDatum: nu, målDatum: nu + 12 * V });
    expect(coachFacts({ sessions: [], goal: m }, nu).målresa.namn).toBe("Styrka");
  });
});

describe("§13 buildCoachFacts finns i motorlagret", () => {
  it("går att importera från engines, inte bara från atlas2", async () => {
    // Projektfilen påstod i flera sessioner att den fanns här. Den gjorde inte
    // det. Det här testet ser till att påståendet inte kan bli falskt igen.
    const m = await import("../engines/facts.js");
    expect(typeof m.buildCoachFacts).toBe("function");
    expect(m.buildCoachFacts).toBe(m.coachFacts);
  });

  it("målresans motor ligger också i engines", async () => {
    const m = await import("../engines/journey.js");
    expect(typeof m.skapaMål).toBe("function");
    expect(typeof m.resa).toBe("function");
  });

  it("gamla importvägen fungerar fortfarande", async () => {
    const gammal = await import("../atlas2/facts.js");
    const ny = await import("../engines/facts.js");
    expect(gammal.coachFacts).toBe(ny.coachFacts);
  });
});

describe("Coachen skiljer utvilad från otränad", () => {
  const nu = Date.now();
  const ctx = dagar => ({
    overallReadiness: 98,
    muscleStates: { quadriceps: { recoveryScore: 99 } },
    sessions: [{ completedAt: nu - dagar * 864e5, muscleLoads: { quadriceps: 400 }, sets: [] }],
    activeProgram: null, goalProfile: null, measurements: [],
  });

  it("varnar när senaste passet ligger långt tillbaka", async () => {
    const { coachReply } = await import("../features/ai-coach/index.jsx");
    // Hög readiness efter en månads uppehåll är avträning, inte form.
    const r = coachReply("hur ser återhämtningen ut?", ctx(32));
    expect(r.text).toMatch(/inte belastats/i);
  });

  it("lägger inte till förbehållet när träningen är aktuell", async () => {
    const { coachReply } = await import("../features/ai-coach/index.jsx");
    const r = coachReply("hur ser återhämtningen ut?", ctx(2));
    expect(r.text).not.toMatch(/inte belastats/i);
  });

  it("helt utan pass sägs det rakt ut", async () => {
    const { readinessFörbehåll, buildCoachFacts } = await import("../engines/facts.js");
    expect(readinessFörbehåll(buildCoachFacts({ sessions: [] }))).toMatch(/inga loggade pass/i);
  });
});

describe("Motorn tål ofullständiga pass", () => {
  it("pass utan muscleLoads kraschar inte återhämtningen", async () => {
    const { computeRecovery } = await import("../engines/index.js");
    // Äldre importerad data saknar fältet. Noll last, inte krasch.
    expect(() => computeRecovery([{ completedAt: Date.now() }], "quadriceps", Date.now())).not.toThrow();
  });
});

describe("Släpande muskel kräver underlag", () => {
  const nu = Date.now();
  const pass = (dagarSedan) => ({
    completedAt: nu - dagarSedan * 864e5,
    muscleLoads: { pectoralis_major: 300 },
    sets: [{ exerciseId: "bench_press", weight: 60, reps: 8 }],
  });

  it("uttalar sig inte om veckovolym efter ett enda pass", async () => {
    const { laggingMuscleAdvice } = await import("../engines/index.js");
    const t = laggingMuscleAdvice([pass(2)], "pectoralis_major");
    // Ett pass säger ingenting om veckovolym.
    expect(t).toMatch(/för lite loggad träning/i);
    expect(t).not.toMatch(/under minsta effektiva volym/i);
  });

  it("ger fortfarande de generella råden", async () => {
    const { laggingMuscleAdvice } = await import("../engines/index.js");
    const t = laggingMuscleAdvice([pass(2)], "pectoralis_major");
    // Principerna gäller oavsett data — det är bara diagnosen som utelämnas.
    expect(t).toMatch(/progressiv överbelastning/i);
  });

  it("uttalar sig när underlaget räcker", async () => {
    const { laggingMuscleAdvice } = await import("../engines/index.js");
    const sessions = [2, 5, 9, 13, 17, 21].map(pass);
    const t = laggingMuscleAdvice(sessions, "pectoralis_major");
    expect(t).not.toMatch(/för lite loggad träning/i);
    expect(t).toMatch(/set\/vecka/i);
  });
});

describe("Askr 2.0 — fråga coachen", () => {
  it("utan loggad träning erbjuds ingen readiness-siffra", async () => {
    const { coachReply } = await import("../features/ai-coach/index.jsx");
    const { bodyState } = await import("../atlas2/store.js");
    const { states, overall, covered } = bodyState([]);
    // Samma gating som CoachChat gör: utan täckning skickas null vidare.
    const svar = coachReply("hur ser återhämtningen ut?", {
      overallReadiness: covered ? Math.round(overall) : null,
      muscleStates: states, sessions: [], activeProgram: null,
    });
    // `covered` är ett ANTAL täckta muskler, inte en boolean. Noll är falskt,
    // så gatingen fungerar — men namnet inbjuder till missförstånd.
    expect(covered).toBeFalsy();
    expect(svar.text).toMatch(/ingen readiness|logga några pass/i);
    expect(svar.text).not.toMatch(/\d+%/);
  });

  it("chatten återanvänder coachReply i stället för egen logik", async () => {
    // Två coacher hade betytt två sanningar om samma kropp.
    const fs = await import("fs");
    const src = fs.readFileSync("src/atlas2/CoachChat.jsx", "utf8");
    expect(src).toMatch(/import \{ coachReply \}/);
    expect(src).not.toMatch(/function coachReply/);
  });
});

describe("Askr 2.0 — OS-bakåtknappen (beslutet)", () => {
  it("hem utan ark har inget internt bakåtmål — bakåt får lämna appen", () => {
    expect(harBakåtmål({ sheet: null, flik: "hem" })).toBe(false);
    expect(backAction({ sheet: null, flik: "hem" })).toBe("lämna");
  });

  it("öppet ark ligger överst: bakåt stänger arket, inget annat", () => {
    expect(harBakåtmål({ sheet: "import", flik: "hem" })).toBe(true);
    expect(backAction({ sheet: "import", flik: "hem" })).toBe("stäng-ark");
    // Även när man står på en annan flik vinner arket — det stängs först.
    expect(backAction({ sheet: "mal", flik: "coachen" })).toBe("stäng-ark");
    expect(backAction({ sheet: "muskel:pectoralis_major", flik: "framsteg" })).toBe("stäng-ark");
  });

  it("annan flik än hem utan ark: bakåt går till hem", () => {
    for (const flik of ["coachen", "framsteg", "mat", "pass"]) {
      expect(harBakåtmål({ sheet: null, flik })).toBe(true);
      expect(backAction({ sheet: null, flik })).toBe("till-hem");
    }
  });

  it("ett pågående pass kastas aldrig av bakåt — det pausas till hem", () => {
    // Passvyn är flik "pass". Bakåt därifrån ger "till-hem", ALDRIG någon
    // kasta-åtgärd. live-passet ligger kvar i state och atlas.v3.live, så att gå
    // hem pausar passet i stället för att slänga loggade set — samma skydd som
    // mobilens avbryt-dialog, fast utan att något går förlorat.
    expect(backAction({ sheet: null, flik: "pass" })).toBe("till-hem");
    expect(backAction({ sheet: null, flik: "pass" })).not.toBe("lämna");
  });
});

describe("Askr 2.0 — OS-bakåtknappen (kopplad till historiken)", () => {
  const roots = [];
  let box;
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;   // tystar act()-varningen
    // Tidigare block i filen gör `delete globalThis.localStorage` i sin afterEach,
    // så jsdom-lagringen är borta här. Lägg tillbaka en egen i minnet — samma
    // mönster som namnrymds-blocken ovan.
    box = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: k => (k in box ? box[k] : null),
        setItem: (k, v) => { box[k] = String(v); },
        removeItem: k => { delete box[k]; },
        clear: () => { box = {}; },
      },
    });
  });
  afterEach(async () => {
    // Omonterade rötter läcker mellan testfall (se CLAUDE.md) — montera av alla.
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
    delete globalThis.localStorage;
  });

  const mount = async () => {
    // Preset av läget gör att appen startar direkt i "app"-steget, förbi
    // onboarding — det är där flik/ark/historik-kopplingen lever.
    localStorage.setItem("atlas.v3.mode", JSON.stringify("demo"));
    const { Atlas2 } = await import("../atlas2/App2.jsx");
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(Atlas2)); });
    await new Promise(x => setTimeout(x, 80));
    return el;
  };
  const pop = async () => { await act(async () => { window.dispatchEvent(new PopStateEvent("popstate")); }); await new Promise(x => setTimeout(x, 40)); };
  const klick = async (el, pred) => {
    const b = [...el.querySelectorAll("button")].find(pred);
    if (!b) throw new Error("hittar ingen matchande knapp");
    await act(async () => { b.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await new Promise(x => setTimeout(x, 40));
  };
  const harMeny = el => el.querySelectorAll('[aria-label="Meny"]').length > 0;   // bara hem har meny-knappen

  it("bakåt stänger ett öppet ark och lämnar appen orörd i övrigt", async () => {
    const el = await mount();
    await klick(el, b => b.getAttribute("aria-label") === "Meny");
    expect(/hämta din historik/i.test(el.textContent)).toBe(true);   // arket är öppet
    await pop();
    expect(/hämta din historik/i.test(el.textContent)).toBe(false);  // arket stängt
    expect(harMeny(el)).toBe(true);                                   // fortfarande på hem
  });

  it("bakåt från en annan flik går till hem", async () => {
    const el = await mount();
    await klick(el, b => /^framsteg$/i.test(b.textContent.trim()));
    expect(harMeny(el)).toBe(false);   // framsteg-fliken har ingen meny-knapp
    await pop();
    expect(harMeny(el)).toBe(true);    // åter på hem
  });

  it("att växla flik fram och tillbaka bygger inte upp historik", async () => {
    const el = await mount();
    // Efter mount ligger EN vaktpost i historiken. Fler flikbyten får inte lägga
    // fler poster — annars måste bakåt tryckas en gång per byte för att komma ut.
    const längd = window.history.length;
    for (const namn of ["framsteg", "coachen", "hem", "framsteg", "hem"]) {
      await klick(el, b => new RegExp(`^${namn}$`, "i").test(b.textContent.trim()));
    }
    expect(window.history.length).toBe(längd);
  });
});

describe("Askr 2.0 — näringsmål i v3", () => {
  const NU = new Date(2026, 6, 21, 12, 0).getTime();
  // Fritextpost med kcal/protein direkt (ingen FOOD_INDEX-uppslagning behövs).
  const post = (dagarSen, extra = {}) => ({ kcal: 500, protein: 40, carbs: 50, fat: 15, ts: NU - dagarSen * 864e5, ...extra });

  it("dagens totaler summeras till kcal-fält, aldrig calories", () => {
    const t = dagensNutrition([post(0), post(0), post(3)], NU);
    expect(t.kcal).toBe(1000);      // två poster idag; den tre dagar gamla räknas inte
    expect(t.protein).toBe(80);
    expect(t.total).toBe(2);
    expect(t.calories).toBeUndefined();
  });

  it("utan mål hittas ingenting på — targets och totals är null", () => {
    const ctx = nutritionCtx([], null, NU);
    expect(ctx.nutritionTargets).toBe(null);
    expect(ctx.nutritionTotals).toBe(null);
    expect(ctx.nutritionDays).toBe(0);
  });

  it("mål satt men inget loggat idag ger totals=null, INTE nollor", () => {
    // Noll loggat ≠ noll ätet. En nolla hade fått coachen att påstå ett kraftigt
    // underskott. Gårdagens post räknas inte som idag.
    const ctx = nutritionCtx([post(1)], { kcal: 2200, protein: 170 }, NU);
    expect(ctx.nutritionTargets).toEqual({ kcal: 2200, protein: 170 });
    expect(ctx.nutritionTotals).toBe(null);
  });

  it("mål satt och loggat idag ger riktiga totaler i samma fältnamn", () => {
    const ctx = nutritionCtx([post(0), post(0)], { kcal: 2200, protein: 170 }, NU);
    expect(ctx.nutritionTotals.kcal).toBe(1000);
    expect(ctx.nutritionTotals.protein).toBe(80);
    expect(ctx.nutritionDays).toBeGreaterThan(0);
  });
});

describe("Askr 2.0 — coachen skiljer kosttillstånd", () => {
  const NU = Date.now();
  const post = () => ({ kcal: 600, protein: 45, ts: NU });
  const fråga = async (foodLog, targets) => {
    const { coachReply } = await import("../features/ai-coach/index.jsx");
    // Samma gating som CoachChat gör: nutritionCtx matar rätt data, coachen tolkar.
    return coachReply("Hur mycket protein?", {
      sessions: [], muscleStates: {}, overallReadiness: null,
      ...nutritionCtx(foodLog, targets, NU),
    });
  };

  it("inget mål satt: coachen säger rakt ut att den saknar kostmål", async () => {
    const r = await fråga([], null);
    expect(r.text).toMatch(/inga kostmål/i);
  });

  it("mål satt men inget loggat idag: coachen anger målet utan att fejka dagens intag", async () => {
    const r = await fråga([], { protein: 170, kcal: 2200 });
    expect(r.text).not.toMatch(/inga kostmål/i);   // ett ANNAT svar än utan mål
    expect(r.text).toMatch(/proteinmål/i);
    expect(r.text).not.toMatch(/idag/i);           // ingen påhittad dagssiffra, inget 0-underskott
  });

  it("mål satt och loggat idag: coachen räknar mot dagens intag", async () => {
    const r = await fråga([post()], { protein: 170, kcal: 2200 });
    expect(r.text).toMatch(/proteinmål/i);
    expect(r.text).toMatch(/idag/i);               // dagens siffra vägs in
  });
});
