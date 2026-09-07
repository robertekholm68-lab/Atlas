// @vitest-environment jsdom
// LOGGA MAT BAKÅT I TIDEN, OCH FLYTTA LOGGAD MAT.
//
// Redigering av en post fanns redan — namn, gram, kcal, måltidstyp, skalning
// och radering. Det som saknades var TIDEN: matvyn var låst till dagens datum
// och varje loggväg stämplade Date.now().
//
// Två saker testas särskilt hårt:
//
//   1. KLOCKSLAGET FÖLJER MED när dygnet byts. `måltidAvTid()` härleder
//      frukost/lunch/mellanmål/middag ur timmen, så en post som backdateras
//      till midnatt hade bytt måltidstyp på köpet.
//
//   2. OMSTÄMPLINGEN SKER PÅ ETT STÄLLE. Sju loggvägar bygger sin post med
//      Date.now() och skickar den till `lägg`. Skulle var och en känna till
//      den valda dagen vore det sju ställen att glömma på.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { dagStart, sammaDygn, stämplaDag, flyttaPost, dagarMedLogg, buildEstimatedEntry } from "../atlas2/foodlog.js";
import { måltidAvTid } from "../engines/recipes.js";
import { dagensNutrition } from "../atlas2/store.js";

const DAG = 864e5;

describe("dygnsgränser", () => {
  it("dagStart är lokal midnatt", () => {
    const d = new Date(2026, 7, 26, 19, 34, 12);
    const start = new Date(dagStart(d.getTime()));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getDate()).toBe(26);
  });

  it("sammaDygn skiljer på 23:59 och 00:01", () => {
    const sent = new Date(2026, 7, 26, 23, 59).getTime();
    const tidigt = new Date(2026, 7, 27, 0, 1).getTime();
    expect(sammaDygn(sent, sent)).toBe(true);
    expect(sammaDygn(sent, tidigt)).toBe(false);
  });
});

describe("stämpla en post på en vald dag", () => {
  it("vald dag = idag ger nu, orört", () => {
    const nu = new Date(2026, 7, 26, 19, 34).getTime();
    expect(stämplaDag(dagStart(nu), nu)).toBe(nu);
    expect(stämplaDag(null, nu)).toBe(nu);
  });

  it("KLOCKSLAGET FÖLJER MED till den valda dagen", () => {
    const nu = new Date(2026, 7, 26, 19, 34).getTime();
    const igår = dagStart(nu - DAG);
    const ts = stämplaDag(igår, nu);
    const d = new Date(ts);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(34);
  });

  it("måltidstypen bevaras när en middag backdateras", () => {
    // Hela skälet till att klockslaget följer med. Med midnatt hade posten
    // blivit frukost.
    const middagIkväll = new Date(2026, 7, 26, 19, 34).getTime();
    expect(måltidAvTid(middagIkväll)).toBe("dinner");
    const igår = dagStart(middagIkväll - DAG);
    expect(måltidAvTid(stämplaDag(igår, middagIkväll))).toBe("dinner");
    // Kontroll att testet mäter något: midnatt hade gett frukost.
    expect(måltidAvTid(igår)).toBe("breakfast");
  });

  it("fungerar över en månadsgräns", () => {
    const nu = new Date(2026, 8, 1, 8, 15).getTime();     // 1 sep
    const ts = stämplaDag(dagStart(nu - DAG), nu);        // 31 aug
    const d = new Date(ts);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(31);
    expect(d.getHours()).toBe(8);
  });
});

describe("flytta en loggad post", () => {
  const post = { id: "f_1", name: "Keso", kcal: 120, ts: new Date(2026, 7, 26, 19, 0).getTime() };

  it("byter både datum och klockslag", () => {
    const ut = flyttaPost(post, "2026-08-24", "12:30");
    const d = new Date(ut.ts);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(24);
    expect(d.getHours()).toBe(12);
    expect(d.getMinutes()).toBe(30);
  });

  it("övriga fält är orörda", () => {
    const ut = flyttaPost(post, "2026-08-24", "12:30");
    expect(ut.id).toBe("f_1");
    expect(ut.name).toBe("Keso");
    expect(ut.kcal).toBe(120);
  });

  it("saknad tid ger mitt på dagen, inte midnatt", () => {
    // Midnatt hade gjort posten till frukost. Klockan 12 är ett neutralt val
    // som inte påstår något om vilken måltid det var.
    const ut = flyttaPost(post, "2026-08-24", "");
    expect(new Date(ut.ts).getHours()).toBe(12);
  });

  it("OGILTIGT DATUM LÄMNAR POSTEN ORÖRD", () => {
    // En felskriven tid ska inte kunna kasta en måltid till 1970.
    expect(flyttaPost(post, "", "12:30").ts).toBe(post.ts);
    expect(flyttaPost(post, "hej", "12:30").ts).toBe(post.ts);
    expect(flyttaPost(post, "2026-8-4", "12:30").ts).toBe(post.ts);
    expect(flyttaPost(null, "2026-08-24", "12:30")).toBe(null);
  });
});

describe("dagar med logg", () => {
  it("listar unika dygn, nyast först", () => {
    const d = (dag, tim) => new Date(2026, 7, dag, tim).getTime();
    const logg = [
      { ts: d(24, 8) }, { ts: d(24, 19) }, { ts: d(26, 12) }, { ts: d(20, 9) },
    ];
    const dagar = dagarMedLogg(logg);
    expect(dagar.length).toBe(3);
    expect(new Date(dagar[0]).getDate()).toBe(26);
    expect(new Date(dagar[2]).getDate()).toBe(20);
  });

  it("tål poster utan ts", () => {
    expect(dagarMedLogg([{ ts: null }, {}, null])).toEqual([]);
    expect(dagarMedLogg(undefined)).toEqual([]);
  });
});

describe("näringen räknas per dygn, oavsett när posten skrevs in", () => {
  it("en backdaterad post räknas på SIN dag, inte på idag", () => {
    const nu = new Date(2026, 7, 26, 19, 0).getTime();
    const igår = new Date(2026, 7, 25, 19, 0).getTime();
    const logg = [
      { id: "a", name: "Idag", kcal: 500, protein: 30, carbs: 40, fat: 20, ts: nu },
      { id: "b", name: "Igår", kcal: 700, protein: 50, carbs: 60, fat: 25, ts: igår },
    ];
    expect(dagensNutrition(logg, nu).kcal).toBe(500);
    expect(dagensNutrition(logg, igår).kcal).toBe(700);
  });

  it("summeringen coachen läser är samma funktion", () => {
    // dagensNutrition tog redan ett `now` — vyn skickar nu den valda dagen dit
    // i stället för Date.now(). Ingen andra summering byggdes.
    const nu = new Date(2026, 7, 26, 12, 0).getTime();
    const logg = [{ id: "a", name: "X", kcal: 300, protein: 20, carbs: 30, fat: 10, ts: nu }];
    expect(dagensNutrition(logg, nu).kcal).toBe(300);
    expect(dagensNutrition(logg, nu - DAG).kcal).toBe(0);
  });
});

describe("uppskattade poster kan också backdateras", () => {
  it("buildEstimatedEntry tar en tidpunkt, och den överlever omstämpling", () => {
    const nu = new Date(2026, 7, 26, 19, 30).getTime();
    const est = { kcal: 600, protein: 35, carbs: 55, fat: 22, estimateLow: 500, estimateHigh: 700, hits: 0 };
    const post = buildEstimatedEntry("köttbullar", est, nu);
    expect(post.ts).toBe(nu);
    expect(post.quality).toBe("estimated");

    const igår = dagStart(nu - DAG);
    const flyttad = { ...post, ts: stämplaDag(igår, post.ts) };
    expect(new Date(flyttad.ts).getDate()).toBe(25);
    expect(new Date(flyttad.ts).getHours()).toBe(19);
    // Osäkerheten följer med — en backdaterad uppskattning är fortfarande en
    // uppskattning.
    expect(flyttad.quality).toBe("estimated");
    expect(flyttad.estimateLow).toBe(500);
  });
});

// ── Vyn ──────────────────────────────────────────────────────────────────────
describe("matvyn: dagsväljare och flytt", () => {
  let host, root;
  const montera = el => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(el));
    return host;
  };
  const klicka = sel => {
    const b = host.querySelector(sel);
    if (!b) throw new Error(`hittar inte ${sel}`);
    act(() => { b.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  };

  beforeEach(() => { localStorage.clear(); });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    host = root = null;
    localStorage.clear();
  });

  const nu = Date.now();
  const igårTs = nu - DAG;
  const logg = [
    { id: "f_idag", name: "Keso idag", kcal: 120, protein: 12, carbs: 4, fat: 3, ts: nu },
    { id: "f_igar", name: "Gröt igår", kcal: 300, protein: 10, carbs: 50, fat: 6, ts: igårTs },
  ];

  it("visar idag som förval och bara dagens poster", async () => {
    const { FoodView } = await import("../atlas2/FoodView.jsx");
    montera(createElement(FoodView, { foodLog: logg, setFoodLog: () => {} }));
    expect(host.querySelector("[data-dag-namn]").textContent).toBe("Idag");
    expect(host.textContent).toContain("Keso idag");
    expect(host.textContent).not.toContain("Gröt igår");
    // Framåtpilen är låst på idag — man loggar inte i morgon.
    expect(host.querySelector("[data-dag-fram]").disabled).toBe(true);
  });

  it("bakåtpilen visar gårdagens logg", async () => {
    const { FoodView } = await import("../atlas2/FoodView.jsx");
    montera(createElement(FoodView, { foodLog: logg, setFoodLog: () => {} }));
    klicka("[data-dag-bak]");
    expect(host.querySelector("[data-dag-namn]").textContent).toBe("Igår");
    expect(host.textContent).toContain("Gröt igår");
    expect(host.textContent).not.toContain("Keso idag");
    expect(host.querySelector("[data-dag-fram]").disabled).toBe(false);
  });

  it("vägen tillbaka till idag finns och syns bara när man är borta", async () => {
    const { FoodView } = await import("../atlas2/FoodView.jsx");
    montera(createElement(FoodView, { foodLog: logg, setFoodLog: () => {} }));
    expect(host.querySelector("[data-till-idag]")).toBe(null);
    klicka("[data-dag-bak]");
    expect(host.querySelector("[data-till-idag]")).toBeTruthy();
    klicka("[data-till-idag]");
    expect(host.querySelector("[data-dag-namn]").textContent).toBe("Idag");
  });

  it("en dag utan logg säger vilken dag som är tom", async () => {
    const { FoodView } = await import("../atlas2/FoodView.jsx");
    montera(createElement(FoodView, { foodLog: [logg[0]], setFoodLog: () => {} }));
    klicka("[data-dag-bak]");
    expect(host.textContent).toMatch(/Inget loggat/);
    expect(host.textContent).not.toContain("Inget loggat idag");
  });

  it("totalerna följer den valda dagen", async () => {
    const { FoodView } = await import("../atlas2/FoodView.jsx");
    montera(createElement(FoodView, {
      foodLog: logg, setFoodLog: () => {}, nutritionTargets: { kcal: 2000, protein: 150, carbs: 200, fat: 70 },
    }));
    expect(host.textContent).toContain("120");
    klicka("[data-dag-bak]");
    expect(host.textContent).toContain("300");
  });

  it("flytta-fälten finns i redigeringen och kan inte peka framåt", async () => {
    const { FoodView } = await import("../atlas2/FoodView.jsx");
    montera(createElement(FoodView, { foodLog: [logg[0]], setFoodLog: () => {} }));
    // Öppna redigeringen för posten.
    const rad = [...host.querySelectorAll("button")].find(b => /Keso idag/.test(b.textContent));
    act(() => { rad.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const datum = host.querySelector('[data-flytta-datum="f_idag"]');
    expect(datum).toBeTruthy();
    expect(host.querySelector('[data-flytta-tid="f_idag"]')).toBeTruthy();
    // max hindrar framtida datum i väljaren.
    const p = n => String(n).padStart(2, "0");
    const d = new Date();
    expect(datum.getAttribute("max")).toBe(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  });

  it("flytt skriver om postens ts utan att röra resten", async () => {
    const { FoodView } = await import("../atlas2/FoodView.jsx");
    let sparad = null;
    montera(createElement(FoodView, {
      foodLog: [logg[0]],
      setFoodLog: f => { sparad = typeof f === "function" ? f([logg[0]]) : f; },
    }));
    const rad = [...host.querySelectorAll("button")].find(b => /Keso idag/.test(b.textContent));
    act(() => { rad.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const datum = host.querySelector('[data-flytta-datum="f_idag"]');
    const tid = host.querySelector('[data-flytta-tid="f_idag"]');
    act(() => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(datum, "2026-08-20"); datum.dispatchEvent(new Event("input", { bubbles: true }));
      s.call(tid, "13:15"); tid.dispatchEvent(new Event("input", { bubbles: true }));
    });
    klicka('[data-flytta="f_idag"]');
    expect(sparad).toBeTruthy();
    const ut = sparad[0];
    expect(ut.name).toBe("Keso idag");
    expect(ut.kcal).toBe(120);
    const d = new Date(ut.ts);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(13);
    expect(d.getMinutes()).toBe(15);
  });
});
