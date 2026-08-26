// @vitest-environment jsdom
// MUSKELKARTAN SKRIVER INGA NAMN.
//
// Kartan hade två namnvisningar: en <title> per region (webbläsarens gula ruta
// vid hovring) och en textrad under figuren med muskelns namn och dess
// readiness-siffra. Båda är borttagna på Roberts begäran — kartan ska läsas som
// en bild, och den som vill ha siffran öppnar muskelarket.
//
// Testet finns för att namnet är lätt att lägga tillbaka av misstag: en <title>
// är ett vanligt tillgänglighetsgrepp, och nästa som ser en region utan namn kan
// tro att det är ett förbiseende. Det är det inte.
//
// Att <title> inte behövs för skärmläsare är mätbart och står i BodyMap2:
// svg:n bär role="img", vilket gör hela kartan till EN grafik i
// tillgänglighetsträdet — barnen exponeras aldrig.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { BodyMap2, REGIONNAMN } from "../atlas2/BodyMap2.jsx";

const states = {
  quadriceps: { status: "recovering", readiness: 40 },
  gluteals: { status: "ready", readiness: 90 },
};

describe("kartan visar inga muskelnamn", () => {
  let host, root;
  beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); });

  const rita = sex => act(() => root.render(createElement(BodyMap2, { muscleStates: states, sex, legend: false })));

  it("ingen region har en <title>", () => {
    rita("f");
    // Förutsättningen mäts med: 0 titlar är sant även på en tom karta.
    expect(host.querySelectorAll("g[data-region]").length).toBe(22);
    expect(host.querySelectorAll("title").length).toBe(0);
  });

  it("inget svenskt muskelnamn står i kartans text", () => {
    rita("f");
    const text = host.textContent;
    const hittade = Object.values(REGIONNAMN).filter(n => text.includes(n));
    expect(hittade, `kartan skriver ut ${hittade.join(", ")}`).toEqual([]);
  });

  it("gäller mansfiguren också", () => {
    rita(null);
    expect(host.querySelectorAll("g[data-region]").length).toBe(22);
    expect(host.querySelectorAll("title").length).toBe(0);
    expect(Object.values(REGIONNAMN).filter(n => host.textContent.includes(n))).toEqual([]);
  });

  it("MuscleSheet behåller namnen — det är DÄR de hör hemma", () => {
    // REGIONNAMN får inte städas bort som "oanvänd" när kartan slutat läsa den.
    // Arket är hela skälet till att kartan kan vara ordlös.
    const sheet = readFileSync(resolve(process.cwd(), "src/atlas2/MuscleSheet.jsx"), "utf8");
    expect(sheet).toMatch(/REGIONNAMN\[regionId\]/);
    expect(REGIONNAMN.quadriceps).toBe("Framsida lår");
  });

  it("regionen går fortfarande att klicka", () => {
    // Namnet är borta, inte interaktionen. Kroppen är gränssnittet.
    const klickade = [];
    act(() => root.render(createElement(BodyMap2, {
      muscleStates: states, sex: "f", legend: false, onSelect: id => klickade.push(id),
    })));
    const g = host.querySelector('g[data-region="quadriceps"]');
    act(() => { g.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(klickade).toEqual(["quadriceps"]);
  });
});
