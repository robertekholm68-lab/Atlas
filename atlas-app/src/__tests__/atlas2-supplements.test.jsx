// @vitest-environment jsdom
// Askr 2.0 — dagliga tillskott.
//
// Motorn mäter FÖLJSAMHET, inte tidpunkter. Kunskapsbanken säger att kreatin
// fylls av det dagliga intaget över tid — klockslaget spelar ingen roll, men
// att det blir taget gör det. Testerna speglar den skillnaden.
//
// Två saker bevakas särskilt:
//   · Att en obockad förmiddag INTE ser ut som en bruten vana. Räknades idag
//     som en missad dag skulle streaken nollas varje morgon, vilket vore både
//     fel och nedslående.
//   · Att det inte finns någon belöningsmekanik. Guiden säger nej till
//     gamification, och en följsamhetssiffra som firas blir något att jaga.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { takenToday, takenTodayIds, toggleToday, streak, adherence, pruneLog, startOfDay } from "../engines/supplements.js";
import { SupplementsPanel } from "../atlas2/SupplementsPanel.jsx";
import { SUPPLEMENTS } from "../data/supplements.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DAG = 864e5;
const NU = Date.now();
// Bock för `d` dagar sedan, mitt på dagen så testet inte spricker vid midnatt.
const bock = (id, d) => ({ id, ts: startOfDay(NU) - d * DAG + 12 * 3600e3 });

describe("bocka i och ur", () => {
  it("kryssar i, och en andra klick kryssar ur samma dag", () => {
    let logg = toggleToday([], "creatine", NU);
    expect(takenToday(logg, "creatine", NU)).toBe(true);
    logg = toggleToday(logg, "creatine", NU);
    expect(takenToday(logg, "creatine", NU)).toBe(false);
  });

  it("att kryssa ur idag lämnar gårdagens bock i fred", () => {
    const logg = [bock("creatine", 1), bock("creatine", 0)];
    const ut = toggleToday(logg, "creatine", NU);
    expect(takenToday(ut, "creatine", NU)).toBe(false);
    expect(ut.some(e => e.ts < startOfDay(NU))).toBe(true);       // historiken orörd
  });

  it("håller isär olika tillskott", () => {
    const logg = toggleToday([], "creatine", NU);
    expect(takenToday(logg, "creatine", NU)).toBe(true);
    expect(takenToday(logg, "vitd", NU)).toBe(false);
    expect(takenTodayIds(logg, NU)).toEqual(["creatine"]);
  });
});

describe("streak — en vana, inte ett spel", () => {
  it("räknar dagar i rad bakåt", () => {
    const logg = [0, 1, 2, 3].map(d => bock("creatine", d));
    expect(streak(logg, "creatine", NU)).toBe(4);
  });

  it("en obockad förmiddag bryter INTE streaken", () => {
    // Idag är inte bockat än. Räkningen ska börja igår — annars nollas
    // streaken varje morgon och siffran blir meningslös.
    const logg = [1, 2, 3].map(d => bock("creatine", d));
    expect(streak(logg, "creatine", NU)).toBe(3);
  });

  it("en missad dag bryter den", () => {
    const logg = [1, 3, 4].map(d => bock("creatine", d));       // dag 2 saknas
    expect(streak(logg, "creatine", NU)).toBe(1);
  });

  it("utan bockar alls är streaken noll, inte odefinierad", () => {
    expect(streak([], "creatine", NU)).toBe(0);
  });
});

describe("följsamhet redovisas som bråk, inte procent", () => {
  it("säger 5 av 7 i stället för 71 procent", () => {
    const logg = [0, 1, 2, 4, 6].map(d => bock("creatine", d));
    const a = adherence(logg, "creatine", 7, NU);
    // Ett bråk visar hur tunt underlaget är; en procent döljer det.
    expect(a).toEqual({ taken: 5, days: 7 });
  });

  it("räknar bara inom fönstret", () => {
    const logg = [0, 20].map(d => bock("creatine", d));
    expect(adherence(logg, "creatine", 7, NU).taken).toBe(1);
  });
});

describe("loggen växer inte för evigt", () => {
  it("poster äldre än gränsen städas bort", () => {
    const logg = [bock("creatine", 5), bock("creatine", 200)];
    expect(pruneLog(logg, 120, NU)).toHaveLength(1);
  });
});

describe("panelen", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async (props = {}) => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(SupplementsPanel, { mina: [], logg: [], onBocka: () => {}, onÄndra: () => {}, ...props }));
    });
    return el;
  };
  const knapp = (el, t) => [...el.querySelectorAll("button")].find(b => (b.textContent || "").toLowerCase().includes(t.toLowerCase()));

  it("utan valda tillskott bjuder den in i stället för att stå tom", async () => {
    const el = await rendera();
    expect(el.textContent).toMatch(/lägg till det du faktiskt tar/i);
    expect(el.textContent).toMatch(/inte när på dagen/i);
  });

  it("visar valda tillskott med dos och hur många som är kvar", async () => {
    const el = await rendera({ mina: ["creatine", "vitd"] });
    expect(el.textContent).toContain("Kreatin");
    expect(el.textContent).toMatch(/2 kvar idag/);
  });

  it("bockar av via klick", async () => {
    let bockad = null;
    const el = await rendera({ mina: ["creatine"], onBocka: id => { bockad = id; } });
    await act(async () => { el.querySelector('[aria-label*="Kreatin"]').click(); });
    expect(bockad).toBe("creatine");
  });

  it("säger att allt är taget när det är det", async () => {
    const el = await rendera({ mina: ["creatine"], logg: [bock("creatine", 0)] });
    expect(el.textContent).toMatch(/allt taget idag/i);
  });

  it("visar följsamhet först när det finns ett mönster — en etta är ingen vana", async () => {
    const tunt = await rendera({ mina: ["creatine"], logg: [bock("creatine", 0)] });
    expect(tunt.textContent).not.toMatch(/dgr/);
    const mönster = await rendera({ mina: ["creatine"], logg: [0, 1, 2].map(d => bock("creatine", d)) });
    expect(mönster.textContent).toMatch(/3 dgr i rad/);
  });

  it("innehåller ingen belöningsmekanik", async () => {
    const el = await rendera({ mina: ["creatine"], logg: [0, 1, 2, 3, 4].map(d => bock("creatine", d)) });
    // Guiden säger nej till gamification. Siffran är information, inte en poäng.
    expect(el.textContent).not.toMatch(/xp|poäng|nivå|bragd|medalj|grattis|snyggt/i);
  });

  it("går att ändra vilka tillskott man tar", async () => {
    let ändrad = null;
    const el = await rendera({ mina: ["creatine"], onÄndra: id => { ändrad = id; } });
    await act(async () => { knapp(el, "Ändra").click(); });
    expect(el.textContent).toContain("Välj tillskott");
    const rad = [...el.querySelectorAll("button")].find(b => /koffein/i.test(b.textContent));
    await act(async () => { rad.click(); });
    expect(ändrad).toBe("caffeine");
  });

  it("väljaren listar hela banken med dos och evidensnivå", async () => {
    const el = await rendera({ mina: [] });
    await act(async () => { knapp(el, "Välj tillskott").click(); });
    expect(el.textContent).toMatch(/evidens/);
    expect(SUPPLEMENTS.length).toBeGreaterThan(5);
  });
});
