// @vitest-environment jsdom
// Askr 2.0 — layoutlägen: telefon och skrivbord.
//
// Det som bevakas är inte pixlar utan BESLUTEN: att brytpunkten ligger där den
// ligger, att kartan får ytan som blir över i stället för en fast höjd, att
// bottennav och sidopanel läser SAMMA flikar, och att skrivbordsläget inte
// smugit in en andra sanning i form av egna vyer.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { layoutFor, DESKTOP_MIN, MOBIL_MAX, NAV_HÖJD, UTAN_NAV, FULL_HÖJD } from "../atlas2/layout.js";
import { FLIKAR } from "../atlas2/Nav.jsx";
import { Shell } from "../atlas2/Shell.jsx";
import { BodyMap2 } from "../atlas2/BodyMap2.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const sättBredd = w => Object.defineProperty(window, "innerWidth", { value: w, configurable: true, writable: true });

describe("layoutFor — var gränsen går", () => {
  it("under brytpunkten är appen en telefon, på och över den ett skrivbord", () => {
    expect(layoutFor(DESKTOP_MIN - 1).mobil).toBe(true);
    expect(layoutFor(DESKTOP_MIN).desktop).toBe(true);
    expect(layoutFor(375).läge).toBe("mobil");
    expect(layoutFor(1440).läge).toBe("desktop");
  });

  it("mobil är EN spalt, skrivbord två — kartan ska aldrig trängas ihop", () => {
    expect(layoutFor(390).spalter).toBe(1);
    expect(layoutFor(1440).spalter).toBe(2);
  });

  it("färgnyckeln kortas bara på riktigt smala skärmar", () => {
    expect(layoutFor(375).kompaktNyckel).toBe(true);
    expect(layoutFor(430).kompaktNyckel).toBe(false);
  });

  it("saknad eller trasig bredd ger mobil — hellre för smalt än för brett", () => {
    expect(layoutFor(undefined).mobil).toBe(true);
    expect(layoutFor(0).mobil).toBe(true);
  });
});

describe("höjden räknas mot dvh, inte vh", () => {
  it("full höjd använder dvh — vh ljuger i mobil webbläsare", () => {
    // 100vh räknar in adressfältet på iOS. En vy som exakt fyller skärmen får
    // då ändå en scrollbar, vilket är precis felet som skulle bort.
    expect(FULL_HÖJD).toBe("100dvh");
  });

  it("en flik får skärmen minus naven, och naven är 62 px — inte 90", () => {
    expect(NAV_HÖJD).toBe(62);
    expect(UTAN_NAV).toContain("100dvh");
    expect(UTAN_NAV).toContain("62px");
    expect(UTAN_NAV).toContain("safe-area-inset-bottom");
  });
});

describe("kartan tar ytan som blir över", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async props => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(BodyMap2, props)); });
    return el;
  };

  it("utan fyll behåller kartan sin bestämda höjd", async () => {
    const el = await rendera({ muscleStates: {}, height: 300 });
    const figurer = el.firstChild.firstChild;
    expect(figurer.style.height).toBe("300px");
    expect(figurer.style.flex).toBe("");
  });

  it("med fyll blir kartan flex:1 och FÅR krympa (minHeight 0)", async () => {
    // minHeight:0 är hela knuten — utan den vägrar en flex-child krympa och
    // växer i stället ut ur skärmen, vilket är exakt det scrollproblem som
    // skulle lösas.
    const el = await rendera({ muscleStates: {}, fyll: true });
    // CSS normaliserar `flex: 1` till long-handen "1 1 0%" — det är samma sak.
    expect(el.firstChild.style.flex).toBe("1 1 0%");
    expect(el.firstChild.style.minHeight).toBe("0px");
    expect(el.firstChild.firstChild.style.flex).toBe("1 1 0%");
    expect(el.firstChild.firstChild.style.minHeight).toBe("0px");
  });

  it("färgnyckeln finns kvar även i kompakt läge — färgerna ÄR avläsningen", async () => {
    const kompakt = await rendera({ muscleStates: {}, fyll: true, kompakt: true });
    const text = kompakt.textContent;
    // Kortare ord, samma fem betydelser. Nyckeln får bantas, aldrig strykas.
    expect(text).toContain("Redo");
    expect(text).toContain("Överbelastad");
    expect(text).toContain("Ingen data");
  });

  it("legend=false tar bort nyckeln bara där den uttryckligen inte önskas", async () => {
    const el = await rendera({ muscleStates: {}, height: 200, legend: false });
    expect(el.textContent).not.toContain("Överbelastad");
  });
});

describe("skrivbordsskalet", () => {
  const roots = [];
  beforeEach(() => sättBredd(1440));
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async props => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(Shell, props)); });
    return el;
  };

  it("sidopanelen visar exakt samma flikar som bottennaven", async () => {
    const el = await rendera({ aktiv: "hem", onChange: () => {}, onMeny: () => {}, children: null });
    for (const [, etikett] of FLIKAR) expect(el.textContent).toContain(etikett);
  });

  it("aktiv flik markeras med volt-ram — det ENDA state som får det", async () => {
    const el = await rendera({ aktiv: "utveckling", onChange: () => {}, onMeny: () => {}, children: null });
    const knappar = [...el.querySelectorAll("button")];
    const aktiv = knappar.find(b => /utveckling/i.test(b.textContent));
    const passiv = knappar.find(b => /^hem$/i.test(b.textContent.trim()));
    expect(aktiv.getAttribute("aria-current")).toBe("page");
    // Volt #D4FF00 normaliseras till rgb av webbläsaren.
    expect(aktiv.style.border).toContain("rgb(212, 255, 0)");
    expect(passiv.getAttribute("aria-current")).toBe(null);
    expect(passiv.style.border).toContain("transparent");
  });

  it("flikbyte och meny går tillbaka till appen, skalet håller ingen egen sanning", async () => {
    let bytt = null, meny = 0;
    const el = await rendera({ aktiv: "hem", onChange: f => { bytt = f; }, onMeny: () => { meny++; }, children: null });
    const knapp = t => [...el.querySelectorAll("button")].find(b => t.test(b.textContent));
    await act(async () => { knapp(/coachen/i).click(); });
    expect(bytt).toBe("coachen");
    await act(async () => { el.querySelector('[aria-label="Meny"]').click(); });
    expect(meny).toBe(1);
  });

  it("innehållet renderas som det är — skalet lindar, det ersätter inte", async () => {
    const el = await rendera({
      aktiv: "hem", onChange: () => {}, onMeny: () => {},
      children: createElement("p", null, "vyn står här"),
    });
    expect(el.textContent).toContain("vyn står här");
  });
});

describe("appen väljer skal efter bredd", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
    localStorage.clear();
  });
  const mount = async bredd => {
    sättBredd(bredd);
    localStorage.setItem("atlas.v3.mode", JSON.stringify("real"));
    const { Atlas2 } = await import("../atlas2/App2.jsx");
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(Atlas2)); });
    for (let i = 0; i < 60 && el.querySelectorAll('[aria-label="Meny"]').length === 0; i++) {
      await act(async () => { await new Promise(x => setTimeout(x, 10)); });
    }
    return el;
  };

  it("på telefon finns bottennaven och telefonkolumnens maxbredd", async () => {
    const el = await mount(390);
    expect(el.querySelector("nav").style.position).toBe("fixed");     // bottennav
    expect(el.firstChild.style.maxWidth).toBe(MOBIL_MAX + "px");
  });

  it("på skrivbord finns sidopanelen i stället, och kolumnen släpps loss", async () => {
    const el = await mount(1440);
    expect(el.querySelector("nav").style.position).toBe("sticky");    // sidopanel
    expect(el.querySelector("main")).not.toBe(null);
    expect(el.firstChild.style.maxWidth).toBe("none");
  });

  it("BÅDA lägena renderar samma vy — inga egna desktopvyer smyger in", async () => {
    const mobil = await mount(390);
    const desktop = await mount(1440);
    // Hemvyns besked kommer ur samma todaysMessage i båda lägena.
    for (const el of [mobil, desktop]) expect(/logga ett pass/i.test(el.textContent)).toBe(true);
  });
});
