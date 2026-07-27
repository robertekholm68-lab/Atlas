// Motorfunktioner som ANVÄNDS men aldrig IMPORTERAS.
//
// Hittat i skarpt läge: desktopappens träningsläge kraschade hela sidan så
// snart man valde en övning. `features/training/index.jsx` anropade
// `lastSessionSets(...)` på rad 324 utan att importera den —
// "ReferenceError: lastSessionSets is not defined", uppfångat av felgränsen som
// "Något gick fel". Vägen till viktstegaren var alltså helt blockerad.
//
// VARKEN SVITEN ELLER BYGGET FÅNGAR DET. En fri identifierare är fullt giltig
// JavaScript ända till körtid — Rollup buntar utan att knota, och sviten monterar
// inte varje vy. Det syns bara när en människa klickar sig dit. Därför den här
// statiska kontrollen.
//
// Den kompletterar de andra två skyddslagren: testgolvet ser att skydd
// försvinner, dataintegriteten ser hål i datan, och den här ser anrop som inte
// har någon definition.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";

const ROT = resolve("src");

/** Alla .js/.jsx under src/, utom testerna och motorn själv. */
function källfiler(dir = ROT, ut = []) {
  for (const namn of readdirSync(dir)) {
    const p = join(dir, namn);
    if (statSync(p).isDirectory()) {
      if (namn === "__tests__" || namn === "engines" || namn === "assets") continue;
      källfiler(p, ut);
    } else if (/\.jsx?$/.test(namn)) ut.push(p);
  }
  return ut;
}

/**
 * Tar bort kommentarer och stränginnehåll.
 *
 * Utan det här ger en JSDoc-rad som "@param logg logReliability(foodLog)" ett
 * falskt larm — den ser ut som ett anrop men är prosa. Ett skydd som ropar varg
 * blir avstängt, och då skyddar det ingenting.
 */
function utanKommentarerOchSträngar(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")      // blockkommentarer, inkl. JSDoc
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")  // radkommentarer (men inte "http://")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
  // MALLSTRÄNGAR LÄMNAS KVAR. Att blanka dem var frestande — de bär prosa — men
  // `${...}` innehåller körbar kod, och just där bor merparten av vyernas
  // kg-utskrifter. Den första versionen av det här skyddet blankade dem och
  // missade därför fem riktiga fall, bland dem `${formatVolume(...)} kg` i
  // MuscleSheet. Ett skydd med ett hål i är farligare än inget skydd, eftersom
  // det ser ut som ett skydd.
}

/** Namn som filen har tillgång till: importerade, deklarerade eller parametrar. */
function definierade(src) {
  const namn = new Set();
  for (const im of src.matchAll(/import\s*(?:\{([^}]*)\}|(\w+))[^;]*from/g)) {
    if (im[2]) namn.add(im[2]);
    for (const n of (im[1] || "").split(",")) {
      const rent = n.trim().split(/\s+as\s+/).pop().trim();
      if (rent) namn.add(rent);
    }
  }
  for (const d of src.matchAll(/(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) namn.add(d[1]);
  return namn;
}

const MOTOR = resolve("src/engines/index.js");
const EXPORTER = (() => {
  const m = readFileSync(MOTOR, "utf8").match(/^export \{([^}]*)\};/m);
  return m[1].split(",").map(s => s.trim()).filter(Boolean);
})();

describe("varje motorfunktion som anropas är också importerad", () => {
  it("motorns exportlista går att läsa (annars kontrollerar vi ingenting)", () => {
    // Skyddet för skyddet: slutar listan gå att läsa blir loopen nedan tom och
    // testet grönt av tomhet.
    expect(EXPORTER.length).toBeGreaterThan(50);
    expect(EXPORTER).toContain("lastSessionSets");
    expect(EXPORTER).toContain("formatWeight");
  });

  it("ingen vy anropar ett motornamn den inte importerat", () => {
    const brister = [];
    for (const fil of källfiler()) {
      const rå = readFileSync(fil, "utf8");
      const kod = utanKommentarerOchSträngar(rå);
      const har = definierade(kod);
      for (const namn of EXPORTER) {
        if (har.has(namn)) continue;
        // Anrop, inte bara omnämnande. Punkt före namnet utesluts så att
        // `obj.milestones(...)` inte förväxlas med motorns `milestones`.
        const anrop = new RegExp("(?<![\\w$.])" + namn + "\\s*\\(");
        if (!anrop.test(kod)) continue;
        const rad = rå.split("\n").findIndex(r => anrop.test(utanKommentarerOchSträngar(r))) + 1;
        brister.push(`${fil.replace(ROT + "/", "")}:${rad} anropar ${namn} utan import`);
      }
    }
    expect(brister, "anrop utan import kraschar vyn först när någon klickar sig dit").toEqual([]);
  });
});
