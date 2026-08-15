// @vitest-environment jsdom
// Askr 2.0 — övningsbanken.
//
// 160 övningar har funnits i datan hela tiden, men utan väg in: EXERCISES
// användes bara för att slå upp NAMN i andra vyer. Man kunde inte bläddra, söka
// eller se vad en övning faktiskt belastar.
//
// Samma mönster som passlistan och programvalet — funktionen fanns, vägen dit
// saknades. Fyra fynd i rad med samma form.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { ExerciseBank } from "../atlas2/ExerciseBank.jsx";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("banken visar allt som finns", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(ExerciseBank, {})); });
    return el;
  };
  const sök = async (el, q) => {
    const f = el.querySelector('input[aria-label="Sök bland övningar"]');
    await act(async () => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(f, q);
      f.dispatchEvent(new Event("input", { bubbles: true }));
    });
    return el.querySelectorAll('button[data-övning="1"]');
  };

  it("alla 160 övningar listas — ingen gräns, ingen 'visa fler'", async () => {
    const el = await rendera();
    expect(el.querySelectorAll('button[data-övning="1"]').length).toBe(EXERCISES.length);
  });

  it("svenska sökord hittar engelska övningsnamn", async () => {
    // Banken är engelsk, appen svensk. Utan bryggan ger "bänk" noll träffar,
    // vilket är det första en svensk användare skriver.
    const el = await rendera();
    for (const [q, väntad] of [["bänk", /bench/i], ["knäböj", /squat/i], ["marklyft", /deadlift/i]]) {
      const träffar = await sök(el, q);
      expect(träffar.length, q).toBeGreaterThan(0);
      expect(träffar[0].textContent, q).toMatch(väntad);
    }
  });

  it("man kan söka på muskel och redskap, inte bara namn", async () => {
    const el = await rendera();
    expect((await sök(el, "hantlar")).length).toBeGreaterThan(10);
    expect((await sök(el, "biceps")).length).toBeGreaterThan(5);
  });

  it("tomt resultat föreslår vad man kan prova i stället", async () => {
    // "Inga träffar" utan väg vidare är en återvändsgränd.
    const el = await rendera();
    await sök(el, "xyzzy");
    expect(el.textContent).toMatch(/Prova ett redskap/i);
  });
});

describe("aktiveringen är motorns tal, inte en illustration", () => {
  it("varje övning bär aktivering med giltiga muskel-ID", () => {
    // Samma vektor driver muskelkartan och recovery. Visas något annat här
    // skulle appen säga två olika saker om samma övning.
    for (const e of EXERCISES) {
      expect((e.activation || []).length, e.name).toBeGreaterThan(0);
      for (const a of e.activation) {
        expect(MUSCLES[a.muscleId], `${e.name} → ${a.muscleId}`).toBeTruthy();
        expect(a.factor).toBeGreaterThan(0);
        expect(a.factor).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ingen övning påstår sig ha en instruktion den inte har", () => {
    // Datan saknar teknikbeskrivningar. En påhittad sådan i en träningsapp är
    // värre än ingen alls — därför visar banken ingen.
    const src = require("fs").readFileSync(require("path").resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    expect(src).not.toMatch(/instruktion:|teknik:|Utför:/i);
  });
});
