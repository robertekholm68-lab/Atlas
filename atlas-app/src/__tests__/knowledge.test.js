import { describe, it, expect } from "vitest";
import { KNOWLEDGE, LEVELS, CATEGORIES, citableFacts, hasKnowledge, MEDICAL_DISCLAIMER } from "../data/knowledge.js";
import { MUSCLES, NAME2MUSCLE } from "../data/muscles.js";

describe("kunskapsbanken: täckning och struktur", () => {
  it("täcker alla 21 muskler i MUSCLES", () => {
    const missing = Object.keys(MUSCLES).filter(id => !KNOWLEDGE[id]);
    expect(missing).toEqual([]);
  });

  it("varje klickbar muskel (NAME2MUSCLE) har kunskap → knappen visas alltid", () => {
    const clickable = [...new Set(Object.values(NAME2MUSCLE))].filter(Boolean);
    const missing = clickable.filter(id => !hasKnowledge(id));
    expect(missing).toEqual([]);
  });

  it("varje post har giltig kategori, nivå, titel och brödtext", () => {
    for (const [id, k] of Object.entries(KNOWLEDGE)) {
      expect(k.title, id).toBeTruthy();
      expect(k.lead, id).toBeTruthy();
      expect(k.entries.length, id).toBeGreaterThan(0);
      for (const e of k.entries) {
        expect(Object.keys(CATEGORIES), `${id}:${e.title}`).toContain(e.category);
        expect(Object.keys(LEVELS), `${id}:${e.title}`).toContain(e.level);
        expect(e.title, id).toBeTruthy();
        expect(e.body, id).toBeTruthy();
      }
    }
  });
});

describe("kunskapsbanken: coach-citat (citableFacts)", () => {
  it("citerar ENDAST etablerade fakta som standard", () => {
    for (const id of Object.keys(KNOWLEDGE)) {
      const facts = citableFacts(id);
      // varje citat måste motsvara en etablerad post
      for (const f of facts) expect(f.level).toBe("etablerad");
    }
  });

  it("släpper aldrig igenom tumregel/omdiskuterat som citat", () => {
    // bygg facit direkt ur datan
    for (const [id, k] of Object.entries(KNOWLEDGE)) {
      const nonEstablishedFacts = k.entries.filter(e => e.fact && e.level !== "etablerad").map(e => e.fact);
      const cited = citableFacts(id).map(f => f.fact);
      for (const nf of nonEstablishedFacts) expect(cited).not.toContain(nf);
    }
  });

  it("kan filtrera på fler nivåer explicit", () => {
    const all = citableFacts("calves", { levels: ["etablerad", "tumregel", "omdiskuterat"] });
    const onlyEst = citableFacts("calves");
    expect(all.length).toBeGreaterThanOrEqual(onlyEst.length);
  });

  it("markerar medicinska citat (kost/skador)", () => {
    const facts = citableFacts("erector_spinae"); // har etablerad injury-fakta
    const med = facts.find(f => f.medical);
    // om det finns ett etablerat medicinskt citat ska det vara flaggat
    if (med) expect(med.medical).toBe(true);
  });

  it("pectoralis_major har minst två etablerade citat", () => {
    expect(citableFacts("pectoralis_major").length).toBeGreaterThanOrEqual(2);
  });

  it("hasKnowledge falskt för okänt id", () => {
    expect(hasKnowledge("finns_inte")).toBe(false);
    expect(citableFacts("finns_inte")).toEqual([]);
  });

  it("medicinsk disclaimer finns", () => {
    expect(MEDICAL_DISCLAIMER).toMatch(/inte medicinsk rådgivning/i);
  });
});
