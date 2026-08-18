// Askr 2.0 — kunskapsbasen.
//
// 23 träningsartiklar (TOPICS) och 21 muskelbeskrivningar (KNOWLEDGE) har
// funnits i datalagret sedan 1.0 och aldrig nått 2.0 — samma mönster som
// musikknappen, passlistan och maskinguiden. Innehållet fanns, vägen dit
// saknades.
//
// EVIDENSNIVÅN SYNS PÅ VARJE STYCKE. Det är hela poängen med hur datan är
// skriven: "etablerad" är väldokumenterad fysiologi, "tumregel" en rimlig
// riktlinje, "omdiskuterat" något forskningen inte är enig om. Att visa dem
// likadant vore att påstå mer än vi vet.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { TOPICS, KNOWLEDGE, LEVELS } from "../data/knowledge.js";

const src = readFileSync(resolve("src/atlas2/KnowledgeView.jsx"), "utf8");

describe("båda samlingarna når vyn", () => {
  it("TOPICS och KNOWLEDGE läses", () => {
    // De svarar på olika frågor — "hur fungerar progressiv överbelastning" mot
    // "vad gör bröstmuskeln" — men båda är samma sorts uppslagsverk.
    expect(src).toMatch(/TOPICS/);
    expect(src).toMatch(/KNOWLEDGE/);
    expect(Object.keys(TOPICS).length).toBeGreaterThan(20);
    expect(Object.keys(KNOWLEDGE).length).toBeGreaterThan(20);
  });

  it("sections och entries hanteras som samma sak", () => {
    // TOPICS kallar dem sections, KNOWLEDGE kallar dem entries.
    expect(src).toMatch(/a\.sections \|\| a\.entries/);
  });
});

describe("evidensnivån visas", () => {
  it("alla tre nivåerna har en färg i datan", () => {
    for (const n of ["etablerad", "tumregel", "omdiskuterat"]) {
      expect(LEVELS[n], n).toBeTruthy();
      expect(LEVELS[n].c, n).toMatch(/^#/);
    }
  });

  it("vyn renderar nivån per stycke, inte per artikel", () => {
    // En artikel kan blanda etablerad fysiologi med tumregler — att sätta en
    // nivå på hela artikeln hade jämnat ut skillnaden.
    expect(src).toMatch(/<Nivå level=\{s\.level\}/);
  });
});

describe("källan är ett objekt, inte en sträng", () => {
  it("renderas via name och url", () => {
    // Att rendera { name, url } rakt av gav React error #31 och en HELT TOM
    // artikel — hela utfällningen försvann utan synligt felmeddelande.
    expect(src).toMatch(/s\.source\.url/);
    expect(src).toMatch(/s\.source\.name/);
    expect(src).not.toMatch(/\}>\{s\.source\}</);
  });

  it("datan har verkligen den formen", () => {
    const medKälla = Object.values(TOPICS)
      .flatMap(a => a.sections || [])
      .find(s => s.source);
    if (medKälla) expect(typeof medKälla.source).toBe("object");
  });
});

describe("sökningen går igenom brödtexten", () => {
  it("inte bara rubriker", () => {
    // Den som söker "protein" vill hitta stycket som nämner det, inte bara en
    // artikel som råkar heta så.
    expect(src).toMatch(/s\.title \+ " " \+ s\.body/);
  });
});
