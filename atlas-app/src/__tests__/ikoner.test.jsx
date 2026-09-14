/**
 * @vitest-environment jsdom
 */
// IKONERNA — EN LINJESTIL, INGA TECKEN UR TECKENSNITTET.
//
// Puls, musik och passikonen ritades förut som ♥, ♫ och en böjd arm som inte
// gick att läsa i 23 px. Det som bevakas här är inte hur de SER ut — det avgörs
// med ögat i rätt storlek — utan de två regler som gör att de hänger ihop:
// samma linjevikt genomgående, och inga glyfer smugna tillbaka in i vyerna.

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { Ikon, LINJE } from "../atlas2/ikoner.jsx";
import { C } from "../atlas2/design.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const NAMN = ["hem", "pass", "mat", "utveckling", "coachen", "puls", "musik"];

describe("ikonerna", () => {
  let root, el;
  afterEach(() => { if (root) act(() => root.unmount()); if (el) el.remove(); root = null; el = null; });

  const rita = props => {
    el = document.createElement("div"); document.body.appendChild(el);
    root = createRoot(el);
    act(() => { root.render(createElement(Ikon, props)); });
    return el.querySelector("svg");
  };

  it("varje namn ger en svg i rätt storlek", () => {
    for (const name of NAMN) {
      const svg = rita({ name, size: 23 });
      expect(svg, name).toBeTruthy();
      expect(svg.getAttribute("width"), name).toBe("23");
      expect(svg.getAttribute("viewBox"), name).toBe("0 0 24 24");
      act(() => root.unmount()); el.remove(); root = null; el = null;
    }
  });

  it("samma linjevikt i alla — det är det som gör dem till en uppsättning", () => {
    for (const name of NAMN) {
      const svg = rita({ name, size: 23 });
      const former = [...svg.querySelectorAll("path, rect, circle, ellipse")];
      expect(former.length, name).toBeGreaterThan(0);
      former.forEach(f => expect(f.getAttribute("stroke-width"), name).toBe(String(LINJE.strokeWidth)));
      act(() => root.unmount()); el.remove(); root = null; el = null;
    }
  });

  it("färgen följer med, så aktiv flik kan bli lime", () => {
    const svg = rita({ name: "hem", color: C.lime });
    expect(svg.querySelector("path").getAttribute("stroke")).toBe(C.lime);
  });

  it("pulsen fylls BARA när bandet är kopplat", () => {
    // Fyllningen är ett tillstånd, inte dekor: den betyder "kopplat".
    const av = rita({ name: "puls", color: C.critical });
    expect(av.querySelector("path").getAttribute("fill")).toBe("none");
    act(() => root.unmount()); el.remove(); root = null; el = null;

    const på = rita({ name: "puls", color: C.critical, fylld: true });
    expect(på.querySelector("path").getAttribute("fill")).toBe(C.critical);
  });

  it("ingen ikon är fylld av bara farten", () => {
    for (const name of NAMN) {
      const svg = rita({ name, size: 23 });
      [...svg.querySelectorAll("path, rect, circle, ellipse")]
        .forEach(f => expect(f.getAttribute("fill"), name).toBe("none"));
      act(() => root.unmount()); el.remove(); root = null; el = null;
    }
  });

  it("ett okänt namn ger coachen, inte ett tomt hål", () => {
    expect(rita({ name: "finns-inte" })).toBeTruthy();
  });
});

describe("vyerna ritar ikoner, inte tecken", () => {
  // ♥ ♡ ♫ ärver inte linjevikten, sitter på egna baslinjer och ser olika ut på
  // varje telefon. Kommer de tillbaka ska det synas här och inte på en skärm.
  const filer = ["WorkoutView.jsx", "SportView.jsx", "Nav.jsx", "Shell.jsx"];
  it.each(filer)("%s använder inga glyfikoner", fil => {
    const src = readFileSync(resolve("src/atlas2", fil), "utf8");
    expect(src).not.toMatch(/[♥♡♫♪]/);
  });

  it("passikonen är en hantel, inte den oläsbara armen", () => {
    // Armen lästes som en historiksymbol i 23 px. Kommer kurvan tillbaka är det
    // med flit och då får den här raden falla.
    const src = readFileSync(resolve("src/atlas2/ikoner.jsx"), "utf8");
    expect(src).not.toMatch(/M5 9 q4 -4 9 -3/);
  });
});
