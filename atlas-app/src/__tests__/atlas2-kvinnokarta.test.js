// @vitest-environment jsdom
// Askr 2.0 — kvinnofigurens muskelkarta.
//
// Byggd ur MASKBILDER med samma metod som mansfiguren: en fotorealistisk figur
// (fram + bak) och en bild per muskel där muskeln fyllts i magenta. Skriptet
// (`scripts/masker-till-regioner-kvinna.py`) tröskar magentan,
// städar komponenter, spårar kanten med potrace och skriver samma schema som
// body_regions.json. Regionerna bär samma id:n som mansfiguren, så MAP, NAMN
// och regionState är oförändrade — bara formerna och basbilderna är nya.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import KVINNA from "../atlas2/body_regions_female.json";
import MAN from "../atlas2/body_regions.json";
import { MUSCLES } from "../data/muscles.js";
import { REGION_MAP, FIGURER, BodyMap2 } from "../atlas2/BodyMap2.jsx";

describe("kvinnofigurens regioner", () => {
  it("elva regioner per vy — samma som mansfiguren", () => {
    expect(KVINNA.front.regions.length).toBe(11);
    expect(KVINNA.back.regions.length).toBe(11);
  });

  it("vyerna delar koordinatsystem", () => {
    // Båda basbilderna är beskurna till EN gemensam ram, annars byter figuren
    // storlek när man tittar på baksidan.
    expect(KVINNA.front.viewBox).toBe(KVINNA.back.viewBox);
  });

  it("varje region-id är ett muskel-id eller en känd aggregering", () => {
    const undantag = new Set(["deltoids", "teres_major", "rotator_cuff"]);
    for (const vy of ["front", "back"]) {
      for (const r of KVINNA[vy].regions) {
        if (undantag.has(r.id)) continue;
        expect(MUSCLES[r.id] || REGION_MAP[r.id], `${vy}/${r.id}`).toBeTruthy();
      }
    }
  });

  it("inga id:n utanför mansfigurens uppsättning", () => {
    // Samma namn i båda figurerna är det som gör att MuscleSheet, coach och
    // regionState inte behöver veta vilken figur som visas.
    const mans = new Set([...MAN.front.regions, ...MAN.back.regions].map(r => r.id));
    for (const vy of ["front", "back"]) {
      for (const r of KVINNA[vy].regions) expect(mans.has(r.id), `${vy}/${r.id}`).toBe(true);
    }
  });

  it("figurerna bär EXAKT samma regioner, per vy", () => {
    // Delmängd i en riktning räcker inte. Mannen är referensfiguren och
    // redigeras först: växer hans karta med en region saknar kvinnan den tyst,
    // och kontrollen ovan är fortfarande grön eftersom kvinnan bara blivit en
    // mindre delmängd. Då tappar kvinnofiguren en muskel utan att något faller.
    // Antalet står inte hårdkodat här heller, av samma skäl: en hårdkodad elva
    // blir grön när mannen fått tolv.
    for (const vy of ["front", "back"]) {
      const kvinna = KVINNA[vy].regions.map(r => r.id).sort();
      const man = MAN[vy].regions.map(r => r.id).sort();
      expect(kvinna, `${vy}: kvinnan saknar ${man.filter(id => !kvinna.includes(id)).join(",") || "inget"}`).toEqual(man);
    }
  });

  it("inga tomma former, absoluta koordinater", () => {
    for (const vy of ["front", "back"]) {
      for (const r of KVINNA[vy].regions) {
        expect(r.d.length, `${vy}/${r.id}`).toBeGreaterThan(0);
        for (const d of r.d) expect(d.startsWith("M "), `${vy}/${r.id}`).toBe(true);
      }
    }
  });

  it("formerna ligger inom ramen", () => {
    const [, , w, h] = KVINNA.front.viewBox.split(" ").map(Number);
    for (const vy of ["front", "back"]) {
      for (const r of KVINNA[vy].regions) {
        const tal = r.d.join(" ").match(/-?\d+(\.\d+)?/g).map(Number);
        for (let i = 0; i < tal.length; i += 2) {
          expect(tal[i], `${vy}/${r.id} x`).toBeGreaterThanOrEqual(-1);
          expect(tal[i], `${vy}/${r.id} x`).toBeLessThanOrEqual(w + 1);
          expect(tal[i + 1], `${vy}/${r.id} y`).toBeGreaterThanOrEqual(-1);
          expect(tal[i + 1], `${vy}/${r.id} y`).toBeLessThanOrEqual(h + 1);
        }
      }
    }
  });

  it("bilaterala muskler har en form per sida", () => {
    // Om potrace slår ihop vänster och höger (eller tappar en sida) syns det
    // här innan det syns på skärmen.
    const par = { quadriceps: 2, biceps_brachii: 2, deltoids: 2, tibialis_anterior: 2, hamstrings: 2, calves: 2, triceps_brachii: 2, latissimus_dorsi: 2, erector_spinae: 2, forearms: 2 };
    for (const vy of ["front", "back"]) {
      for (const r of KVINNA[vy].regions) {
        if (par[r.id]) expect(r.d.length, `${vy}/${r.id}`).toBe(par[r.id]);
      }
    }
  });
});

describe("figurvalet", () => {
  it("f ger kvinnofiguren, allt annat mannen", () => {
    expect(FIGURER.f.regions).toBe(KVINNA);
    expect(FIGURER.m.regions).toBe(MAN);
    // Kvinnofiguren har egna basbilder — inte mannens.
    expect(FIGURER.f.bild.front).not.toBe(FIGURER.m.bild.front);
    expect(FIGURER.f.bild.back).not.toBe(FIGURER.m.bild.back);
  });

  it("båda figurerna färgas med foto-receptet", () => {
    // Mannen bar multiply 0,62 så länge han var en ljus illustration. Han är
    // numera samma sorts fotorealistiska, solbruna figur som kvinnan, och
    // multiply mot brun hud gör grönt till oliv — då slutar färgen vara data.
    for (const kön of ["m", "f"]) {
      expect(FIGURER[kön].lager, kön).toEqual([["color", 0.9, 1], ["normal", 0.28, 0.4]]);
    }
  });

  it("båda figurerna har ett normal-lager så färgen syns över svarta kläder", () => {
    for (const kön of ["m", "f"]) {
      expect(FIGURER[kön].lager.map(l => l[0]), kön).toContain("normal");
    }
  });

  it("App2 skickar profilens sex till kartan", () => {
    const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
    // Varje <BodyMap2 …>-anrop ska bära sex={sex} på samma rad som taggen
    // öppnas. (Pilfunktionerna i onSelect innehåller ">" — därför radvis.)
    const rader = src.split("\n").filter(r => r.includes("<BodyMap2 "));
    expect(rader.length).toBeGreaterThan(0);
    for (const r of rader) expect(r).toMatch(/sex=\{sex\}/);
  });
});

describe("rendering", () => {
  let host, root;
  beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); });

  const states = { quadriceps: { status: "recovering", readiness: 40 }, gluteals: { status: "ready", readiness: 90 } };

  it("sex='f' ritar kvinnofigurens regioner och basbilder", () => {
    act(() => root.render(createElement(BodyMap2, { muscleStates: states, sex: "f", legend: false })));
    const ids = [...host.querySelectorAll("g[data-region]")].map(g => g.dataset.region);
    expect(ids.length).toBe(22);
    expect(ids).toContain("latissimus_dorsi");
    expect(ids.filter(i => i === "forearms").length).toBe(2);
    expect(ids).toContain("teres_major");
    const svg = host.querySelector("svg");
    expect(svg.getAttribute("viewBox")).toBe(KVINNA.front.viewBox);
    const bilder = [...host.querySelectorAll("img")].map(i => i.getAttribute("src"));
    expect(bilder.length).toBe(2);
    expect(bilder[0]).toBe(FIGURER.f.bild.front);
    expect(bilder[1]).toBe(FIGURER.f.bild.back);
  });

  it("utan sex ritas mannen", () => {
    act(() => root.render(createElement(BodyMap2, { muscleStates: states, legend: false })));
    expect(host.querySelector("svg").getAttribute("viewBox")).toBe(MAN.front.viewBox);
    expect(host.querySelectorAll("g[data-region]").length).toBe(22);
    // Två lager per form, samma recept som kvinnan.
    const quads = host.querySelector('g[data-region="quadriceps"]');
    expect(quads.querySelectorAll("path").length).toBe(MAN.front.regions.find(r => r.id === "quadriceps").d.length * 2);
  });

  it("kvinnofiguren: två lager per form, ofärgad muskel är osynlig i båda", () => {
    act(() => root.render(createElement(BodyMap2, { muscleStates: states, sex: "f", legend: false })));
    const quads = host.querySelector('g[data-region="quadriceps"]');
    const former = KVINNA.front.regions.find(r => r.id === "quadriceps").d.length;
    const paths = [...quads.querySelectorAll("path")];
    expect(paths.length).toBe(former * 2);
    // Med underlag: lager 1 = color 0,9, lager 2 = normal 0,28.
    expect(paths[0].getAttribute("fill-opacity")).toBe("0.9");
    expect(paths[1].getAttribute("fill-opacity")).toBe("0.28");
    // Utan underlag: noll i båda lagren — ärlighet, ingen påhittad färg.
    const biceps = [...host.querySelector('g[data-region="biceps_brachii"]').querySelectorAll("path")];
    for (const p of biceps) expect(p.getAttribute("fill-opacity")).toBe("0");
  });
});
