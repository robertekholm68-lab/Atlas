// @vitest-environment jsdom
// Askr 2.0 — händelsedrivna påminnelser.
//
// Det som bevakas hårdast är när påminnelsen ska TIGA. En påminnelse som dyker
// upp när den inte gäller är inte en hjälp utan en tjatmaskin, och en tjatmaskin
// lär man sig svepa bort — varpå även de relevanta försvinner.
//
// Fyra sätt den ska tiga på: när inget pass loggats, när det gått för kort eller
// för lång tid, när mat redan loggats efter passet, och när användaren avfärdat
// just den händelsen.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { buildNudges, activeNudges, pruneDismissed } from "../engines/nudges.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const MIN = 60000;
// Klockslaget pinnas till kl 20 samma dag. Flera fall loggar mat upp till tio
// timmar bakåt och räknar den till DAGENS mål; med den riktiga klockan hamnade
// den måltiden på gårdagen när sviten kördes före kl 10, och testet föll varje
// natt och morgon — även i CI, där det stoppar en publicering. Datumet är
// fortfarande dagens, så dygnsgränslogiken prövas som vanligt.
const NU = (() => { const d = new Date(); d.setHours(20, 0, 0, 0); return d.getTime(); })();
const MÅL = { kcal: 2400, protein: 180 };
const pass = (minSedan, id = "s1") => ({ id, completedAt: NU - minSedan * MIN, sets: [] });
const mat = (minSedan, protein = 30) => ({ id: "f" + minSedan, ts: NU - minSedan * MIN, protein, kcal: 400 });

describe("protein efter passet — när den talar", () => {
  it("dyker upp när ett pass loggats och inget ätits sedan dess", () => {
    const n = buildNudges({ sessions: [pass(45)], foodLog: [], nutritionTargets: MÅL, now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("protein");
    expect(n[0].text).toMatch(/45 min sedan/);
    expect(n[0].cta).toBe("Logga mat");
  });

  it("räknar ut hur mycket protein som är kvar på dagens mål", () => {
    const n = buildNudges({ sessions: [pass(45)], foodLog: [mat(600, 80)], nutritionTargets: MÅL, now: NU });
    expect(n[0].text).toMatch(/100 g protein kvar/);        // 180 − 80
  });

  it("utan proteinmål påstås ingen siffra — bara skälet", () => {
    const n = buildNudges({ sessions: [pass(45)], foodLog: [], nutritionTargets: null, now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].text).not.toMatch(/\d+ g protein kvar/);
    expect(n[0].text).toMatch(/bygger upp musklerna/);
  });
});

describe("när den ska tiga", () => {
  it("inget loggat pass — inget att påminna om", () => {
    expect(buildNudges({ sessions: [], foodLog: [], nutritionTargets: MÅL, now: NU })).toHaveLength(0);
  });

  it("för tidigt: fem minuter efter sista setet står man kvar i gymmet", () => {
    expect(buildNudges({ sessions: [pass(5)], foodLog: [], nutritionTargets: MÅL, now: NU })).toHaveLength(0);
  });

  it("för sent: efter tre timmar är påminnelsen meningslös", () => {
    expect(buildNudges({ sessions: [pass(200)], foodLog: [], nutritionTargets: MÅL, now: NU })).toHaveLength(0);
  });

  it("har man redan ätit efter passet är saken avklarad", () => {
    const n = buildNudges({ sessions: [pass(60)], foodLog: [mat(30)], nutritionTargets: MÅL, now: NU });
    expect(n).toHaveLength(0);
  });

  it("mat som loggats FÖRE passet räknas inte som avklarat", () => {
    const n = buildNudges({ sessions: [pass(60)], foodLog: [mat(90)], nutritionTargets: MÅL, now: NU });
    expect(n).toHaveLength(1);
  });
});

describe("avfärdande gäller händelsen, inte påminnelsen för alltid", () => {
  it("ett avfärdat pass tystas — men nästa pass talar igen", () => {
    const idag = buildNudges({ sessions: [pass(45, "s1")], foodLog: [], nutritionTargets: MÅL, now: NU });
    const avfärdat = { [idag[0].id]: NU };
    expect(activeNudges(idag, avfärdat, NU)).toHaveLength(0);

    // Nytt pass, nytt id — påminnelsen kommer tillbaka.
    const imorgon = buildNudges({ sessions: [pass(45, "s2")], foodLog: [], nutritionTargets: MÅL, now: NU });
    expect(activeNudges(imorgon, avfärdat, NU)).toHaveLength(1);
  });

  it("id:t bär passets id, så avfärdandet kan knytas till rätt händelse", () => {
    const n = buildNudges({ sessions: [pass(45, "abc")], foodLog: [], nutritionTargets: MÅL, now: NU });
    expect(n[0].id).toContain("abc");
  });

  it("utgångna påminnelser filtreras bort även utan avfärdande", () => {
    const n = buildNudges({ sessions: [pass(45)], foodLog: [], nutritionTargets: MÅL, now: NU });
    expect(activeNudges(n, {}, NU + 200 * MIN)).toHaveLength(0);
  });

  it("gamla avfärdanden städas bort — listan får inte växa för evigt", () => {
    const gammalt = { "protein:s1": NU - 30 * 864e5, "protein:s2": NU - 60000 };
    const kvar = pruneDismissed(gammalt, NU);
    expect(Object.keys(kvar)).toEqual(["protein:s2"]);
  });
});

// ── MÅLDRIVNA PÅMINNELSER ───────────────────────────────────────────────────
//
// De fyra äldre påminnelserna hänger på kroppen. De här hänger på PLANEN, och
// det som prövas hårdast är detsamma: när de ska tiga. En plan man redan följt
// i dag ska inte påminna om att den finns.
//
// Avvikelserna räknas av `planLäge` — samma motor som coachvyn. Testen nedan
// sätter därför upp riktiga mål med startdatum och delmål i stället för att
// mata in färdiga avvikelser; det är kopplingen till motorn som ska hålla.
const DAG = 864e5;
const passDag = (dagarSedan, extra = {}) =>
  ({ id: `p${dagarSedan}`, completedAt: NU - dagarSedan * DAG, sets: [], ...extra });
const vikt = (dagarSedan, kg) => ({ ts: NU - dagarSedan * DAG, kg });

/** Ett mål med plan. Utan viktmål som standard — då kan bara passgrenen tala. */
const målMed = (extra = {}) => ({
  namn: "Ner 5 kg",
  typ: "fatloss",
  passPerVecka: 3,
  startDatum: NU - 14 * DAG,
  målDatum: NU + 60 * DAG,
  plan: { dimensioner: {}, viktmål: null, cardioPerVecka: null },
  delmål: [],
  ...extra,
});

describe("målet: efter planen i antal pass", () => {
  // Två veckor, tre pass i veckan = sex förväntade. Fyra loggade ger −2.
  const fyraPass = [passDag(12), passDag(9), passDag(6), passDag(3)];

  it("säger hur många pass som fattas, och mot vilket mål", () => {
    const n = buildNudges({ sessions: fyraPass, goal: målMed(), now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("malpass");
    expect(n[0].text).toMatch(/2 pass efter planen mot Ner 5 kg/);
    expect(n[0].text).toMatch(/börjar stänga glappet/);   // flera pass efter
    expect(n[0].cta).toBe("Till passen");
  });

  it("ett enda pass efter: då stänger dagens pass glappet helt", () => {
    // Fem loggade av sex förväntade.
    const n = buildNudges({ sessions: [...fyraPass, passDag(1)], goal: målMed(), now: NU });
    expect(n[0].text).toMatch(/1 pass efter planen/);
    expect(n[0].text).toMatch(/Ett pass i dag stänger glappet/);
  });

  it("tiger när dagens pass redan är loggat — den som just tränat ligger inte efter", () => {
    const n = buildNudges({ sessions: [...fyraPass, passDag(0)], goal: målMed(), now: NU });
    expect(n).toHaveLength(0);
  });

  it("ett sportpass i dag stänger inte glappet i en styrkeplan", () => {
    // Samma filter som malplan.js: planens pass är styrkepass.
    const n = buildNudges({ sessions: [...fyraPass, passDag(0, { source: "sport" })], goal: målMed(), now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("malpass");
  });

  it("i fas eller före planen säger den ingenting", () => {
    const sju = [12, 11, 9, 8, 6, 4, 2].map(d => passDag(d));
    expect(buildNudges({ sessions: sju, goal: målMed(), now: NU })).toHaveLength(0);
  });

  it("första veckan sägs ingenting — 'två pass efter' dag ett är brus", () => {
    const n = buildNudges({ sessions: [], goal: målMed({ startDatum: NU - 3 * DAG }), now: NU });
    expect(n).toHaveLength(0);
  });

  it("ett glapp på mer än två veckor pekar på planen, inte på dagens pass", () => {
    // Sex veckor in i en plan på tre pass i veckan, fyra loggade: 14 pass
    // efter. Fjorton pass gör ingen ikapp — det åtgärdbara är takten.
    const n = buildNudges({ sessions: fyraPass, goal: målMed({ startDatum: NU - 42 * DAG }), now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("malpass");
    expect(n[0].text).toMatch(/14 pass efter planen/);
    expect(n[0].text).toMatch(/justera planen/);
    expect(n[0].text).not.toMatch(/Ett pass i dag/);
    expect(n[0].ctaMål).toBe("mal");
  });

  it("ett mål utan plan ger inga målpåminnelser alls", () => {
    const utanPlan = { namn: "Ner 5 kg", passPerVecka: 3, startDatum: NU - 14 * DAG, målDatum: NU + 60 * DAG };
    expect(buildNudges({ sessions: fyraPass, goal: utanPlan, now: NU })).toHaveLength(0);
  });
});

describe("målet: vikten som planen behöver", () => {
  // Startat för tre dagar sedan: under en vecka räknas ingen passavvikelse, så
  // bara viktgrenen kan tala. Det är den som prövas här.
  const medVikt = (delmål, extra = {}) => målMed({
    startDatum: NU - 3 * DAG,
    plan: { dimensioner: {}, viktmål: { startKg: 89, målKg: 84 }, cardioPerVecka: null },
    delmål,
    ...extra,
  });
  const delmålVikt = dagar => [{ id: "dm1", datum: NU + dagar * DAG, metric: "vikt", target: 87, unit: "kg", riktning: "ner" }];

  it("ett viktdelmål i morgon säger vad målet är och när", () => {
    const n = buildNudges({ sessions: [], goal: medVikt(delmålVikt(1)), weights: [vikt(3, 88.4)], now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("malvikt");
    expect(n[0].text).toMatch(/Delmål i morgon: 87 kg/);
    expect(n[0].cta).toBe("Logga vikt");
    // Med en färsk vägning behövs ingen uppmaning att väga sig.
    expect(n[0].text).not.toMatch(/Väg dig/);
  });

  it("utan färsk vägning ber den om en — delmålet går annars inte att följa upp", () => {
    const n = buildNudges({ sessions: [], goal: medVikt(delmålVikt(1)), weights: [], now: NU });
    expect(n[0].text).toMatch(/Väg dig så går det att följa upp/);
  });

  it("har man vägt sig i dag är saken gjord", () => {
    const n = buildNudges({ sessions: [], goal: medVikt(delmålVikt(1)), weights: [vikt(0, 88.1)], now: NU });
    expect(n).toHaveLength(0);
  });

  it("ett delmål långt bort är ingen påminnelse", () => {
    const n = buildNudges({ sessions: [], goal: medVikt(delmålVikt(9)), weights: [vikt(3, 88.4)], now: NU });
    expect(n).toHaveLength(0);
  });

  it("utan delmål nära: saknad vägning är ett eget besked, med motorns eget skäl", () => {
    const n = buildNudges({ sessions: [], goal: medVikt([]), weights: [], now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("malvikt");
    expect(n[0].text).toMatch(/går inte att följa: ingen vägning loggad/);
    // Veckovis id: avfärdar man den ska den inte stå där igen i morgon.
    expect(n[0].id).toMatch(/^malvikt:vag:/);
  });

  it("en för gammal vägning räknas som ingen — och skälet står utskrivet", () => {
    const n = buildNudges({ sessions: [], goal: medVikt([]), weights: [vikt(30, 89)], now: NU });
    expect(n[0].text).toMatch(/för gammal/);
  });

  it("ett mål utan viktmål i planen frågar aldrig efter vågen", () => {
    expect(buildNudges({ sessions: [], goal: målMed({ startDatum: NU - 3 * DAG }), weights: [], now: NU })).toHaveLength(0);
  });
});

describe("målet: datumet som passerat", () => {
  it("säger att resan är slut och att det är dags att utvärdera", () => {
    const gammalt = målMed({ startDatum: NU - 90 * DAG, målDatum: NU - 2 * DAG });
    const n = buildNudges({ sessions: [passDag(20)], goal: gammalt, now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("malslut");
    expect(n[0].text).toMatch(/Måldatumet för Ner 5 kg har passerat/);
    expect(n[0].ctaMål).toBe("mal");
  });

  it("inget annat sägs om en plan vars datum tagit slut — en avvikelse mot en avslutad kurva är inget beslut", () => {
    const gammalt = målMed({
      startDatum: NU - 90 * DAG, målDatum: NU - 2 * DAG,
      plan: { dimensioner: {}, viktmål: { startKg: 89, målKg: 84 }, cardioPerVecka: null },
    });
    // Både passunderskott och saknad vägning finns — ändå bara ett besked.
    const n = buildNudges({ sessions: [], goal: gammalt, weights: [], now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("malslut");
  });
});

describe("målet går före kroppens egna besked", () => {
  it("efter planen slår frånvaro: ett skäl är mer värt än en observation", () => {
    // Frånvaro gäller också — fem dagar sedan passet och tre utvilade muskler.
    const states = {
      quadriceps: { readiness: 92 }, pectoralis_major: { readiness: 90 }, latissimus_dorsi: { readiness: 88 },
    };
    const n = buildNudges({
      sessions: [passDag(12), passDag(9), passDag(6), passDag(5)],
      muscleStates: states, goal: målMed(), now: NU,
    });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("malpass");
  });

  it("utan mål är frånvaro fortfarande det som sägs", () => {
    const states = {
      quadriceps: { readiness: 92 }, pectoralis_major: { readiness: 90 }, latissimus_dorsi: { readiness: 88 },
    };
    const n = buildNudges({ sessions: [passDag(5)], muscleStates: states, now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("franvaro");
  });
});

describe("påminnelsen i hemvyn", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
    localStorage.clear();
  });

  it("tar dagens beskeds plats i stället för att lägga till höjd", async () => {
    // Hemskärmen ryms exakt på en liten telefon. Ett extra kort hade brutit
    // scrollfriheten, så påminnelsen delar slot med beskedet.
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true, writable: true });
    localStorage.setItem("atlas.v3.mode", JSON.stringify("demo"));
    const { Atlas2 } = await import("../atlas2/App2.jsx");
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(Atlas2)); });
    for (let i = 0; i < 60 && el.querySelectorAll('[aria-label="Meny"]').length === 0; i++) {
      await act(async () => { await new Promise(x => setTimeout(x, 10)); });
    }
    // Demoläget har inga pass som slutade för en timme sedan, så ingen
    // påminnelse ska visas — och beskedet ska stå kvar.
    expect(el.querySelector('[aria-label="Avfärda påminnelsen"]')).toBe(null);
    expect(el.textContent.length).toBeGreaterThan(50);
  });

  it("målet når ända fram till skärmen — inte bara till motorn", async () => {
    // Motorn prövas ovan. DET HÄR prövar KOPPLINGEN: att App2 faktiskt matar in
    // målet och vikterna, och att raden ritas. Den vägen har brustit förr —
    // `nutritionTargets` fanns i motorn långt innan någon vy skickade in det.
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true, writable: true });
    const dag = 864e5;
    const nu = Date.now();
    localStorage.setItem("atlas.v3.mode", JSON.stringify("real"));
    localStorage.setItem("atlas.v3.sessions", JSON.stringify(
      [12, 9, 6, 3].map(d => ({ id: `s${d}`, completedAt: nu - d * dag, title: "Pass", sets: [] }))
    ));
    localStorage.setItem("atlas.v3.goal", JSON.stringify({
      namn: "Ner 5 kg", typ: "fatloss", passPerVecka: 3,
      startDatum: nu - 14 * dag, målDatum: nu + 60 * dag,
      plan: { dimensioner: {}, viktmål: null, cardioPerVecka: null }, delmål: [],
    }));
    const { Atlas2 } = await import("../atlas2/App2.jsx");
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(Atlas2)); });
    for (let i = 0; i < 60 && !/pass efter planen/.test(el.textContent); i++) {
      await act(async () => { await new Promise(x => setTimeout(x, 10)); });
    }
    expect(el.textContent).toMatch(/2 pass efter planen mot Ner 5 kg/);
    // Knappen ska stå där och lova det den gör: den byter flik, den startar
    // inget pass. Samma regel som frånvaropåminnelsens knapp.
    expect(el.textContent).toMatch(/Till passen/);
    expect(el.querySelector('[aria-label="Avfärda påminnelsen"]')).toBeTruthy();
  });
});
