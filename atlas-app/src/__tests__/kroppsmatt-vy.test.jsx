// @vitest-environment jsdom
// KROPPSMÅTT I GRÄNSSNITTET.
//
// Motorn är testad för sig i kroppsmatt.test.js. Det här testar vägen genom
// vyerna: att formuläret bygger rätt post, att en partiell registrering
// fungerar, att redigering och radering går fram, och att historiken visar ett
// mättillfälle med bara några värden.
//
// Persistensen testas mot samma store-API som appen använder (atlas.v3.*), inte
// mot en mock — nyckeln och formen ÄR kontraktet mot befintliga användares data.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { NyMatning, MattDetalj, Historik, Nyckeltal, Asymmetri } from "../atlas2/Kroppsmatt.jsx";
import { byggMätning, ändraMätning, raderaMätning, slåIhopMätningar, vikterUrMätningar } from "../engines/utveckling.js";
import { load, save } from "../atlas2/store.js";

const DAG = 864e5;
const NU = 1787000000000;
const T = d => NU - d * DAG;

let host, root;
const montera = el => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
};

const skriv = (id, v) => {
  const f = host.querySelector(`[data-matt="${id}"]`);
  if (!f) throw new Error(`fältet ${id} finns inte`);
  act(() => {
    // React lyssnar på input-eventet, inte på att value sätts. Utan
    // setter-tricket ändras DOM:en men komponentens state gör det inte, och
    // testet mäter sin egen inmatning i stället för appens.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(f, v);
    f.dispatchEvent(new Event("input", { bubbles: true }));
  });
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

describe("registrera en mätning", () => {
  it("dagens datum är förvalt", () => {
    montera(createElement(NyMatning, { onSpara: () => {} }));
    const idag = new Date();
    const väntat = `${idag.getFullYear()}-${String(idag.getMonth() + 1).padStart(2, "0")}-${String(idag.getDate()).padStart(2, "0")}`;
    expect(host.querySelector("#matt-datum").value).toBe(väntat);
  });

  it("full registrering ger en post med alla värden", () => {
    let sparad = null;
    montera(createElement(NyMatning, { onSpara: p => { sparad = p; } }));
    skriv("kg", "82,4");
    skriv("fat", "22,1");
    skriv("muscle", "37,4");
    klicka('[data-grupp="overkropp"]');
    skriv("midja", "91,5");
    skriv("brost", "103");
    klicka('[data-spara="1"]');
    expect(sparad.kg).toBe(82.4);
    expect(sparad.fat).toBe(22.1);
    expect(sparad.muscle).toBe(37.4);
    expect(sparad.matt).toEqual({ midja: 91.5, brost: 103 });
  });

  it("PARTIELL registrering — bara midja, inget annat", () => {
    let sparad = null;
    montera(createElement(NyMatning, { onSpara: p => { sparad = p; } }));
    klicka('[data-grupp="overkropp"]');
    skriv("midja", "91,5");
    klicka('[data-spara="1"]');
    expect(sparad).toBeTruthy();
    expect(sparad.kg).toBe(null);
    expect(sparad.matt).toEqual({ midja: 91.5 });
  });

  it("tomma fält sparas inte som noll", () => {
    let sparad = null;
    montera(createElement(NyMatning, { onSpara: p => { sparad = p; } }));
    skriv("kg", "82,4");
    klicka('[data-grupp="armar"]');
    skriv("biceps_hoger", "36");
    // biceps_vanster lämnas tomt
    klicka('[data-spara="1"]');
    expect(sparad.matt).toEqual({ biceps_hoger: 36 });
    expect("biceps_vanster" in sparad.matt).toBe(false);
    expect(sparad.fat).toBe(null);
  });

  it("helt tomt formulär sparar ingenting och säger till", () => {
    let sparad = null;
    montera(createElement(NyMatning, { onSpara: p => { sparad = p; } }));
    klicka('[data-spara="1"]');
    expect(sparad).toBe(null);
    expect(host.querySelector('[role="alert"]').textContent).toMatch(/minst ett värde/i);
  });

  it("decimaler går fram med komma", () => {
    let sparad = null;
    montera(createElement(NyMatning, { onSpara: p => { sparad = p; } }));
    klicka('[data-grupp="ben"]');
    skriv("vad_vanster", "37,5");
    klicka('[data-spara="1"]');
    expect(sparad.matt.vad_vanster).toBe(37.5);
  });

  it("fälten ger numeriskt tangentbord med decimaltecken", () => {
    // inputMode="decimal", inte type="number": det senare avvisar komma i
    // flera webbläsare och gör en svensk "91,5" till ingenting.
    montera(createElement(NyMatning, { onSpara: () => {} }));
    const kg = host.querySelector('[data-matt="kg"]');
    expect(kg.getAttribute("inputmode")).toBe("decimal");
    expect(kg.getAttribute("type")).not.toBe("number");
  });

  it("grupperna är hopfällda tills man öppnar dem", () => {
    montera(createElement(NyMatning, { onSpara: () => {} }));
    expect(host.querySelector('[data-grupp="armar"]').getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector('[data-matt="biceps_hoger"]')).toBe(null);
    klicka('[data-grupp="armar"]');
    expect(host.querySelector('[data-grupp="armar"]').getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelector('[data-matt="biceps_hoger"]')).toBeTruthy();
  });
});

describe("redigera och radera via vyn", () => {
  const post = byggMätning({ ts: T(5), kg: 84, matt: { midja: 95, brost: 103 } });

  it("formuläret fylls med postens värden", () => {
    montera(createElement(NyMatning, { befintlig: post, onSpara: () => {} }));
    expect(host.querySelector('[data-matt="kg"]').value).toBe("84");
    klicka('[data-grupp="overkropp"]');
    expect(host.querySelector('[data-matt="midja"]').value).toBe("95");
  });

  it("ändring skickar med den gamla tidpunkten så posten ersätts", () => {
    let sparad = null, ändraTs = null;
    montera(createElement(NyMatning, { befintlig: post, onSpara: (p, ts) => { sparad = p; ändraTs = ts; } }));
    skriv("kg", "83");
    klicka('[data-spara="1"]');
    expect(ändraTs).toBe(post.ts);
    expect(sparad.kg).toBe(83);
    const efter = ändraMätning([post], ändraTs, sparad);
    expect(efter.length).toBe(1);
    expect(efter[0].kg).toBe(83);
  });

  it("ett rensat fält försvinner vid redigering", () => {
    let sparad = null;
    montera(createElement(NyMatning, { befintlig: post, onSpara: p => { sparad = p; } }));
    klicka('[data-grupp="overkropp"]');
    skriv("brost", "");
    klicka('[data-spara="1"]');
    expect(sparad.matt).toEqual({ midja: 95 });
  });

  it("radera-knappen finns bara vid redigering och lämnar tidpunkten", () => {
    let raderad = null;
    montera(createElement(NyMatning, { onSpara: () => {}, onRadera: ts => { raderad = ts; } }));
    expect(host.querySelector('[data-radera="1"]')).toBe(null);
    act(() => root.unmount()); host.remove();

    montera(createElement(NyMatning, { befintlig: post, onSpara: () => {}, onRadera: ts => { raderad = ts; } }));
    klicka('[data-radera="1"]');
    expect(raderad).toBe(post.ts);
    expect(raderaMätning([post], raderad).length).toBe(0);
  });
});

describe("historik", () => {
  const historik = [
    byggMätning({ ts: T(14), kg: 83.1, matt: { midja: 92, brost: 103.5 } }),
    byggMätning({ ts: T(1), kg: 82.4, fat: 22.1, muscle: 37.4, matt: { midja: 91.5, biceps_hoger: 36 } }),
  ];

  it("visar ett tillfälle per mätning, senast först", () => {
    montera(createElement(Historik, { mätningar: historik }));
    const kort = [...host.querySelectorAll("[data-tillfalle]")];
    expect(kort.length).toBe(2);
    expect(Number(kort[0].dataset.tillfalle)).toBe(T(1));
  });

  it("ett tillfälle med bara några värden listar bara dem", () => {
    montera(createElement(Historik, { mätningar: historik }));
    const äldst = host.querySelector(`[data-tillfalle="${T(14)}"]`);
    expect(äldst.textContent).toContain("Vikt");
    expect(äldst.textContent).toContain("Midja");
    expect(äldst.textContent).toContain("Bröst");
    // Inga tomma rader för det som inte mättes.
    expect(äldst.textContent).not.toContain("Kroppsfett");
    expect(äldst.textContent).not.toContain("Biceps H");
  });

  it("tom historik säger det rakt ut", () => {
    montera(createElement(Historik, { mätningar: [] }));
    expect(host.textContent).toMatch(/Ingen mätning registrerad/i);
  });
});

describe("detaljvyn — samma komponent för alla mått", () => {
  // "Sedan start" räknas mot den FÖRSTA mätningen, inte mot den näst äldsta.
  //
  // Kravtextens exempel är självmotsägande på just den punkten: listan börjar
  // på 94,0 cm men rubriken säger −7,5 cm sedan start, och 91,5 − 94,0 är
  // −2,5. Implementationen räknar ur datan, så serien här börjar på 99 för att
  // −7,5 ska stämma med talet i exemplet.
  const m = [
    byggMätning({ ts: T(42), kg: 87.2, fat: 25.5, matt: { midja: 99 } }),
    byggMätning({ ts: T(28), matt: { midja: 93.2 } }),
    byggMätning({ ts: T(14), matt: { midja: 92.0 } }),
    byggMätning({ ts: T(1), kg: 82.4, fat: 22.1, matt: { midja: 91.5 } }),
  ];

  it("midja: värde, sedan start, senaste förändring och alla punkter", () => {
    montera(createElement(MattDetalj, { id: "midja", mätningar: m }));
    expect(host.textContent).toContain("Midja");
    expect(host.textContent).toContain("91,5");
    expect(host.textContent).toContain("−7,5 cm");   // sedan start
    expect(host.textContent).toContain("−0,5 cm");   // sedan senaste
    expect(host.querySelectorAll("svg").length).toBe(1);
  });

  it("SAMMA komponent för kroppsfett, med procentenheter", () => {
    montera(createElement(MattDetalj, { id: "fat", mätningar: m }));
    expect(host.textContent).toContain("Kroppsfett");
    expect(host.textContent).toContain("22,1");
    // −3,4 PROCENTENHETER, inte procent. Skillnaden är hela poängen.
    expect(host.textContent).toContain("−3,4 pp");
    expect(host.textContent).not.toContain("−3,4 %");
  });

  it("grafen fungerar med en enda mätning", () => {
    montera(createElement(MattDetalj, { id: "midja", mätningar: [m[0]] }));
    expect(host.querySelectorAll("svg").length).toBe(1);
    expect(host.querySelectorAll("svg circle").length).toBe(1);
    // Ingen linje mellan en punkt och sig själv.
    expect(host.querySelectorAll("svg polyline").length).toBe(0);
  });

  it("omätt mått säger det i stället för att visa nollor", () => {
    montera(createElement(MattDetalj, { id: "hals", mätningar: m }));
    expect(host.textContent).toMatch(/inte mätt än/i);
    expect(host.textContent).not.toContain("0 cm");
  });
});

describe("vänster och höger", () => {
  it("visar båda sidorna och skillnaden neutralt", () => {
    const m = [byggMätning({ ts: T(1), matt: { biceps_vanster: 35.5, biceps_hoger: 36 } })];
    montera(createElement(Asymmetri, { mätningar: m }));
    expect(host.textContent).toContain("Biceps");
    expect(host.textContent).toContain("35,5");
    expect(host.textContent).toContain("36");
    expect(host.textContent).toContain("0,5");
    // Ingen medicinsk bedömning.
    expect(host.textContent).not.toMatch(/obalans|varning|åtgärda|bör/i);
  });

  it("inget visas när bara en sida mätts", () => {
    const m = [byggMätning({ ts: T(1), matt: { biceps_hoger: 36 } })];
    const el = montera(createElement(Asymmetri, { mätningar: m }));
    expect(el.textContent).toBe("");
  });
});

describe("nyckeltal", () => {
  const m = [
    byggMätning({ ts: T(60), kg: 87.2, matt: { midja: 99 } }),
    byggMätning({ ts: T(1), kg: 82.4, matt: { midja: 91.5 } }),
  ];

  it("värde och förändring sedan start", () => {
    montera(createElement(Nyckeltal, { id: "kg", mätningar: m, onClick: () => {} }));
    expect(host.textContent).toContain("82,4");
    expect(host.textContent).toContain("−4,8 kg");
  });

  it("omätt mått är inte klickbart och visar streck", () => {
    let klickad = null;
    montera(createElement(Nyckeltal, { id: "hals", mätningar: m, onClick: id => { klickad = id; } }));
    expect(host.querySelector("button").disabled).toBe(true);
    klicka("button");
    expect(klickad).toBe(null);
    expect(host.textContent).toContain("ej mätt");
  });

  it("en enda mätning ger värde men ingen påhittad förändring", () => {
    montera(createElement(Nyckeltal, { id: "kg", mätningar: [m[0]], onClick: () => {} }));
    expect(host.textContent).toContain("87,2");
    expect(host.textContent).toContain("första mätningen");
    expect(host.textContent).not.toContain("0 kg");
  });
});

describe("persistens och befintlig data", () => {
  it("mätningar överlever en tur genom lagringen", async () => {
    const m = [
      byggMätning({ ts: T(5), kg: 84, matt: { midja: 95 } }),
      byggMätning({ ts: T(1), matt: { midja: 91.5, biceps_hoger: 36 } }),
    ];
    await save("matningar", m);
    const tillbaka = await load("matningar", []);
    expect(tillbaka).toEqual(m);
    // Nyckeln är den befintliga — byts den tappar varje nuvarande användare
    // sin historik.
    expect(localStorage.getItem("atlas.v3.matningar")).toBeTruthy();
  });

  it("GAMLA poster utan matt läses och renderas utan fel", async () => {
    // Exakt formen som ligger hos befintliga användare i dag.
    const gamla = [
      { ts: T(30), kg: 84.8, fat: 24, muscle: 36, visceral: 8, källa: "omron" },
      { ts: T(2), kg: 83.2, fat: 23.4, muscle: 36.4, visceral: 7, källa: "omron" },
    ];
    await save("matningar", gamla);
    const m = await load("matningar", []);
    montera(createElement(Historik, { mätningar: m }));
    expect(host.querySelectorAll("[data-tillfalle]").length).toBe(2);
    expect(host.textContent).toContain("84,8");
    expect(host.textContent).toContain("Kroppsfett");
  });

  it("nya kroppsmått kan läggas till på en gammal post utan att vikten tappas", () => {
    // Regressionen som testet finns för: en spread hade tagit med den nya
    // postens `kg: null` och nollat vägningen.
    const gammal = { ts: T(2), kg: 83.2, fat: 23.4, källa: "omron" };
    const nyMätning = byggMätning({ ts: T(2) + 6e5, matt: { midja: 92 } });
    const ut = slåIhopMätningar([gammal], [nyMätning]);
    expect(ut.length).toBe(1);
    expect(ut[0].kg).toBe(83.2);
    expect(ut[0].fat).toBe(23.4);
    expect(ut[0].matt).toEqual({ midja: 92 });
  });

  it("viktkedjan till weights är orörd av kroppsmåtten", () => {
    const m = [
      byggMätning({ ts: T(5), kg: 84, matt: { midja: 95 } }),
      byggMätning({ ts: T(1), matt: { midja: 91.5 } }),
    ];
    const w = vikterUrMätningar([], m);
    expect(w).toEqual([{ ts: T(5), kg: 84 }]);
  });
});
