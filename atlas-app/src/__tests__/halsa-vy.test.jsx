/**
 * @vitest-environment jsdom
 */
// HÄLSOKORTET I UTVECKLING → KROPP.
//
// Motorn prövas i halsa.test.js. Här prövas löftena i vyn: att kortet inte
// hittar på ett tal när underlaget saknas, att importen når listan, och att
// snittet håller tyst tills det finns något att räkna på.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { UtvecklingView } from "../atlas2/UtvecklingView.jsx";
import { byggHälsodag } from "../engines/halsa.js";

const dag = (å, m, d) => new Date(å, m - 1, d, 12, 0, 0).getTime();

describe("hälsokortet", () => {
  let root, el, hälsa, setHälsa;
  afterEach(() => { if (root) act(() => root.unmount()); if (el) el.remove(); root = null; el = null; });

  const montera = (poster = []) => {
    hälsa = poster;
    setHälsa = f => { hälsa = typeof f === "function" ? f(hälsa) : f; };
    el = document.createElement("div"); document.body.appendChild(el);
    root = createRoot(el);
    act(() => {
      root.render(createElement(UtvecklingView, {
        startFlik: "kropp", mätningar: [], setMätningar: () => {},
        hälsa: poster, setHälsa, sessions: [], profile: { age: 58 }, onClose: () => {},
      }));
    });
    return el.querySelector('[data-halsa="1"]');
  };

  it("utan data: en inbjudan, inga påhittade tal", () => {
    const kort = montera([]);
    expect(kort).toBeTruthy();
    expect(kort.textContent).toMatch(/importera/i);
    expect(kort.textContent).not.toMatch(/\d+ slag\/min/);
    expect(kort.textContent).not.toMatch(/ h \d+ min/);
    // Filväljaren finns även tom — det är den som är vägen in.
    expect(kort.querySelector('[data-halsofil="1"]')).toBeTruthy();
  });

  it("med data: senaste värdet per fält, och bara de fält som finns", () => {
    const kort = montera([
      byggHälsodag({ dag: dag(2026, 9, 12), sömnMin: 452, vilopuls: 52 }),
      byggHälsodag({ dag: dag(2026, 9, 13), sömnMin: 480, vilopuls: 51 }),
    ]);
    expect(kort.textContent).toMatch(/8 h/);          // senaste sömnen
    expect(kort.textContent).toMatch(/51 slag\/min/); // senaste vilopulsen
    // HRV saknas helt i datan — då ritas ingen HRV-kolumn. Kortets RUBRIK
    // nämner ändå alla tre ("Sömn, vilopuls och HRV"), så det som prövas är
    // frånvaron av ett VÄRDE, inte av ordet.
    expect(kort.textContent).not.toMatch(/\d+\s*ms/);
    expect(kort.textContent.match(/slag\/min/g)).toHaveLength(1);
  });

  it("snittet tiger tills det finns underlag", () => {
    // Två nätter: inget snitt, utan datumet för mätningen i stället.
    const två = montera([
      byggHälsodag({ dag: dag(2026, 9, 12), vilopuls: 52 }),
      byggHälsodag({ dag: dag(2026, 9, 13), vilopuls: 51 }),
    ]);
    expect(två.textContent).not.toMatch(/snitt/);
    act(() => root.unmount()); root = null; el.remove(); el = null;

    // Tre: nu räknas snittet, och det står att det ÄR ett snitt över 7 dagar.
    const tre = montera([
      byggHälsodag({ dag: Date.now() - 2 * 864e5, vilopuls: 54 }),
      byggHälsodag({ dag: Date.now() - 864e5, vilopuls: 52 }),
      byggHälsodag({ dag: Date.now(), vilopuls: 50 }),
    ]);
    expect(tre.textContent).toMatch(/snitt 7 d 52/);
  });

  it("importen når listan, och en trasig fil säger till", async () => {
    const kort = montera([]);
    const fält = kort.querySelector('[data-halsofil="1"]');

    const fil = t => ({ text: async () => t });
    // Vyn läser filen ur event.target.files; anropa handlern som webbläsaren gör.
    const läs = async innehåll => {
      const h = fält.onchange || (fält._valueTracker && null);
      void h;
      await act(async () => {
        Object.defineProperty(fält, "files", { value: [fil(innehåll)], configurable: true });
        fält.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };

    await läs("Date,Sleep,Resting Heart Rate\n2026-09-12,7:32,52");
    expect(hälsa).toHaveLength(1);
    expect(hälsa[0]).toMatchObject({ sömnMin: 452, vilopuls: 52 });
    expect(kort.textContent).toMatch(/1 dagar inlästa med sömn, vilopuls/);

    await läs("Steps,Calories\n1000,2000");
    expect(kort.textContent).toMatch(/datumkolumn/);
  });
});
