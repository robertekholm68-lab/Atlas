// Askr 2.0 — distans på konditionspass.
//
// Fynd från riktig användning: gick inte att logga hur långt man sprang. Passet
// sparade tid, intensitet och belastning — men inte det man faktiskt minns av
// en löprunda.
//
// Två gränser bevakas här. Distansen får bara finnas där den betyder något
// (ingen loggar segling i kilometer), och den får INTE påverka belastningen:
// cardioLoad räknas ur tid och intensitet, och att låta kilometer styra hade
// krävt en modell för hur snabbt just den här personen springer.

import { describe, it, expect } from "vitest";
import { harDistans, tempoPerKm, DISTANS_SPORTER } from "../data/sportLibrary.js";
import { SPORT_META } from "../data/sportLibrary.js";
import { byggSportpass } from "../atlas2/SportView.jsx";
import { resolveActivity } from "../data/exercises.js";

describe("vilka aktiviteter har distans", () => {
  it("löpning, cykling och simning har det", () => {
    ["running", "cycling", "swimming", "rowing", "cross-country-skiing"]
      .forEach(id => expect(harDistans(id), id).toBe(true));
  });

  it("segling, curling och yoga har det INTE", () => {
    // Kategorin duger inte som filter — segling ligger i samma grupp som
    // simning, och curling i samma som längdskidåkning.
    ["sailing", "curling", "yoga", "strength", "boxing"]
      .forEach(id => expect(harDistans(id), id).toBe(false));
  });

  it("varje id i listan finns på riktigt i sportbiblioteket", () => {
    // Ett id som stavats fel skulle tyst göra att fältet aldrig dyker upp.
    const okända = [...DISTANS_SPORTER].filter(id => !SPORT_META[id]);
    expect(okända).toEqual([]);
  });

  it("löpbandet räknas också — man springer lika långt inomhus", () => {
    expect(harDistans("cardio-treadmill")).toBe(true);
    expect(harDistans("cardio-rowing-machine")).toBe(true);
  });

  it("VYN frågar på det id resolveActivity ger, inte på biblioteks-id:t", () => {
    // DEN VERKLIGA GRINDEN. `DISTANS_SPORTER` innehåller biblioteks-id:n, men
    // vyn skriver `harDistans(a.libId || a.id)` — och för appens EGNA
    // cardio-poster går resolveActivity via `LEGACY_MAP`: id:t blir "lopning"
    // och libId "running". Pekar mappningen fel, eller försvinner den när
    // sportLibrary.js genereras om, dyker fältet aldrig upp för löpning —
    // appens viktigaste distanspass — och kontrollen mot SPORT_META ovan hade
    // fortfarande varit grön. Därför testas de id:n användaren faktiskt väljer.
    ["lopning", "cykling", "simning", "rodd", "gang", "crosstrainer", // appens egna
     "running", "cycling", "swimming", "cardio-treadmill",            // bibliotekets
    ].forEach(id => {
      const a = resolveActivity(id);
      expect(a, id).toBeTruthy();
      expect(harDistans(a.libId || a.id), `${id} → ${a.libId || a.id}`).toBe(true);
    });
  });

  it("trappmaskinen får INTE distans, vilken väg man än når den", () => {
    // Steg är inte kilometer. Att sätta likhetstecken mellan "cardiomaskin" och
    // "distans" vore samma kategorifel som segling och simning.
    ["trappmaskin", "cardio-stair-climber"].forEach(id => {
      const a = resolveActivity(id);
      expect(harDistans(a.libId || a.id), id).toBe(false);
    });
  });
});

describe("tempot", () => {
  it("räknas som minuter per kilometer", () => {
    expect(tempoPerKm(10, 55)).toBe("5:30");
    expect(tempoPerKm(5, 25)).toBe("5:00");
    expect(tempoPerKm(21.1, 105)).toBe("4:59");
  });

  it("saknas något påstås inget tempo", () => {
    // Ett tempo räknat på en gissad distans vore värre än inget tempo.
    expect(tempoPerKm(0, 30)).toBe(null);
    expect(tempoPerKm(5, 0)).toBe(null);
    expect(tempoPerKm(null, 30)).toBe(null);
    expect(tempoPerKm(undefined, undefined)).toBe(null);
  });
});

describe("passet som sparas", () => {
  const löpning = resolveActivity("running");

  it("bär distansen när den angetts", () => {
    const p = byggSportpass(löpning, 55, "Medel", false, Date.now(), 10);
    expect(p.distanceKm).toBe(10);
    expect(p.minutes).toBe(55);
  });

  it("saknar fältet helt när distans inte angetts — ingen nolla", () => {
    const p = byggSportpass(löpning, 55, "Medel", false, Date.now(), null);
    expect("distanceKm" in p).toBe(false);
  });

  it("kvittot visar distansen i stället för muskelräkningen", () => {
    // Man loggar tio kilometer och kvittot säger "Muskler 6 belastade". Det är
    // sant men inte det man frågade efter. Cellen byts, den läggs inte till —
    // fyra celler blir för trånga på en liten telefon.
    const p = byggSportpass(löpning, 55, "Medel", false, 1000, 10);
    expect(p.distanceKm).toBe(10);
    expect(tempoPerKm(p.distanceKm, p.minutes)).toBe("5:30");
  });

  it("distansen ändrar INTE belastningen", () => {
    // Samma tid och intensitet ska ge samma cardioLoad oavsett distans.
    const utan = byggSportpass(löpning, 55, "Medel", false, 1000, null);
    const kort = byggSportpass(löpning, 55, "Medel", false, 1000, 5);
    const lång = byggSportpass(löpning, 55, "Medel", false, 1000, 15);
    expect(kort.cardioLoad).toBe(utan.cardioLoad);
    expect(lång.cardioLoad).toBe(utan.cardioLoad);
    expect(lång.muscleLoads).toEqual(utan.muscleLoads);
  });
});
