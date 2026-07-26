// @vitest-environment jsdom
//
// Sport- och cardiologgning i Askr 2.0.
//
// Det som skyddas här är inte utseendet utan tre påståenden:
//   1. Passformen är densamma som gamla appen skriver, plus ett id — annars
//      tappar v3-backupen posten och synken ser den aldrig.
//   2. Belastningen kommer ur motorn, inte ur vyn.
//   3. Ärligheten: ett kategoriestimat får inte se ut som en mätning, och
//      appen gissar aldrig kalorier.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { SportView, byggSportpass, aktiviteterPerKategori } from "../atlas2/SportView.jsx";
import { resolveActivity, SPORT_INTENSITY } from "../data/exercises.js";
import { computeSportLoad, computeCardioLoad } from "../engines/index.js";
import { SPORT_META } from "../data/sportLibrary.js";

describe("sport: passformen", () => {
  const löpning = () => resolveActivity("running");

  it("bär de fält 2.0 och gamla appen är överens om", () => {
    const p = byggSportpass(löpning(), 45, "Medel", false, 1000);
    expect(p.sport).toBe(true);
    expect(p.source).toBe("sport");
    expect(p.completedAt).toBe(1000);
    expect(p.hiit).toBe(false);
    expect(typeof p.cardioLoad).toBe("number");
    expect(p.muscleLoads).toBeTruthy();
  });

  it("har INGA sets — ett sportpass loggas inte set för set", () => {
    const p = byggSportpass(löpning(), 45, "Medel", false);
    expect(p.sets).toEqual([]);
  });

  it("har ett id, annars tappar backupen passet", () => {
    const p = byggSportpass(löpning(), 30, "Medel", false);
    expect(p.id).toBeTruthy();
    expect(typeof p.id).toBe("string");
  });

  it("två pass får skilda id", () => {
    const a = byggSportpass(löpning(), 30, "Medel", false);
    const b = byggSportpass(löpning(), 30, "Medel", false);
    expect(a.id).not.toBe(b.id);
  });

  it("sparar minuterna — utan dem går tiden inte att visa efteråt", () => {
    expect(byggSportpass(löpning(), 75, "Medel", false).minutes).toBe(75);
  });

  it("HIIT syns i titeln", () => {
    expect(byggSportpass(löpning(), 30, "Medel", true).title).toMatch(/hiit/i);
    expect(byggSportpass(löpning(), 30, "Medel", false).title).not.toMatch(/hiit/i);
  });

  it("utan aktivitet eller tid byggs inget pass", () => {
    expect(byggSportpass(null, 45, "Medel", false)).toBeNull();
    expect(byggSportpass(löpning(), 0, "Medel", false)).toBeNull();
    expect(byggSportpass(löpning(), 45, "Finns inte", false)).toBeNull();
  });

  it("uppskattar ALDRIG kalorier — appen har ingen energimodell för aktivitet", () => {
    const p = byggSportpass(löpning(), 60, "Hård", true);
    expect(p.kcal).toBeUndefined();
    expect(p.calories).toBeUndefined();
    expect(p.energy).toBeUndefined();
  });
});

describe("sport: lasten kommer ur motorn", () => {
  it("cardioLoad är exakt computeCardioLoad", () => {
    const a = resolveActivity("running");
    const im = SPORT_INTENSITY["Medel"];
    expect(byggSportpass(a, 45, "Medel", false).cardioLoad)
      .toBe(computeCardioLoad(a, 45, im, false));
  });

  it("muscleLoads är exakt computeSportLoad", () => {
    const a = resolveActivity("running");
    const im = SPORT_INTENSITY["Medel"];
    expect(byggSportpass(a, 45, "Medel", false).muscleLoads)
      .toEqual(computeSportLoad(a, 45, im, false));
  });

  it("längre pass ger högre konditionslast", () => {
    const a = resolveActivity("running");
    expect(byggSportpass(a, 60, "Medel", false).cardioLoad)
      .toBeGreaterThan(byggSportpass(a, 30, "Medel", false).cardioLoad);
  });

  it("HIIT lastar hårdare än jämnt tempo på samma tid", () => {
    const a = resolveActivity("running");
    expect(byggSportpass(a, 30, "Medel", true).cardioLoad)
      .toBeGreaterThan(byggSportpass(a, 30, "Medel", false).cardioLoad);
  });

  it("passet belastar muskler, så kartan får något att färga", () => {
    const p = byggSportpass(resolveActivity("running"), 45, "Medel", false);
    expect(Object.keys(p.muscleLoads).length).toBeGreaterThan(0);
  });
});

describe("sport: aktivitetsbiblioteket", () => {
  it("grupperar hela biblioteket på kategori", () => {
    const kat = aktiviteterPerKategori();
    const summa = kat.reduce((n, k) => n + k.poster.length, 0);
    expect(summa).toBe(Object.keys(SPORT_META).length);
  });

  it("varje kategori har ett svenskt namn och minst en aktivitet", () => {
    aktiviteterPerKategori().forEach(k => {
      expect(k.sv).toBeTruthy();
      expect(k.poster.length).toBeGreaterThan(0);
    });
  });

  it("aktiviteter utan detaljmodell flaggas som kategoriestimat", () => {
    // Löpning HAR en detaljmodell; en godtycklig biblioteksaktivitet utan
    // sådan ska bära fromLibrary så vyn kan säga det rakt ut.
    const utan = Object.keys(SPORT_META)
      .map(resolveActivity).filter(Boolean).find(a => a.fromLibrary);
    expect(utan).toBeTruthy();
    expect(utan.fromLibrary).toBe(true);
  });
});

describe("sport: vyn", () => {
  let el, root;
  beforeEach(() => { el = document.createElement("div"); document.body.appendChild(el); root = createRoot(el); });
  afterEach(() => { act(() => root.unmount()); el.remove(); });

  const rendera = (props = {}) => act(() => root.render(<SportView onLogg={() => {}} onClose={() => {}} {...props} />));
  const txt = () => el.textContent.toLowerCase();
  // hdr()/label() versaliserar via CSS, sa matcha alltid skiftlagesokansligt.
  const knapp = re => [...el.querySelectorAll("button")]
    .find(b => re.test(((b.getAttribute("aria-label") || "") + " " + (b.textContent || "")).trim()));

  it("listar kategorierna", () => {
    rendera();
    expect(txt()).toContain("kondition");
  });

  it("utan vald aktivitet finns ingen sparaknapp — inget att spara", () => {
    rendera();
    expect(knapp(/^logga /i)).toBeFalsy();
  });

  it("visar förhandsvisning av belastningen INNAN passet sparas", () => {
    rendera();
    act(() => knapp(/kondition & uthållighet/i).click());
    act(() => knapp(/löpning/i).click());
    expect(txt()).toContain("så här belastas du");
    expect(txt()).toContain("konditionslast");
  });

  it("säger rakt ut när belastningen bara är ett kategoriestimat", () => {
    rendera();
    const utan = Object.keys(SPORT_META).map(id => ({ id, a: resolveActivity(id) }))
      .find(x => x.a && x.a.fromLibrary);
    const kat = aktiviteterPerKategori().find(k => k.poster.some(p => p.id === utan.id));
    const namn = SPORT_META[utan.id].sv;
    // Första kategorin är redan öppen. Fäll bara ut om aktiviteten inte
    // redan syns — annars stänger klicket den i stället för att öppna.
    if (!knapp(new RegExp("^" + namn, "i"))) {
      act(() => knapp(new RegExp("^" + kat.sv, "i")).click());
    }
    act(() => knapp(new RegExp("^" + namn, "i")).click());
    expect(txt()).toContain("kategoriestimat");
  });

  it("en aktivitet MED detaljmodell påstår inte att den är ett estimat", () => {
    rendera();
    act(() => knapp(/kondition & uthållighet/i).click());
    act(() => knapp(/löpning/i).click());
    expect(txt()).not.toContain("kategoriestimat");
  });

  it("nämner aldrig kalorier", () => {
    rendera();
    act(() => knapp(/kondition & uthållighet/i).click());
    act(() => knapp(/löpning/i).click());
    expect(txt()).not.toMatch(/kcal|kalori/);
  });

  it("lämnar ifrån sig ett färdigt pass när man sparar", () => {
    let sparat = null;
    rendera({ onLogg: p => { sparat = p; } });
    act(() => knapp(/kondition & uthållighet/i).click());
    act(() => knapp(/löpning/i).click());
    act(() => knapp(/^logga /i).click());
    expect(sparat).toBeTruthy();
    expect(sparat.sport).toBe(true);
    expect(sparat.id).toBeTruthy();
    expect(sparat.minutes).toBeGreaterThan(0);
  });

  it("tiden går att ändra och slår igenom i passet", () => {
    let sparat = null;
    rendera({ onLogg: p => { sparat = p; } });
    act(() => knapp(/kondition & uthållighet/i).click());
    act(() => knapp(/löpning/i).click());
    act(() => knapp(/öka tiden/i).click());
    act(() => knapp(/^logga /i).click());
    expect(sparat.minutes).toBe(50);
  });

  it("tiden går inte under fem minuter", () => {
    let sparat = null;
    rendera({ onLogg: p => { sparat = p; } });
    act(() => knapp(/kondition & uthållighet/i).click());
    act(() => knapp(/löpning/i).click());
    for (let i = 0; i < 20; i++) act(() => knapp(/minska tiden/i).click());
    act(() => knapp(/^logga /i).click());
    expect(sparat.minutes).toBe(5);
  });
});
