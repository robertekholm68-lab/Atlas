// DOM-SKRIPTENS PORTAR MÅSTE VARA UNIKA.
//
// Skripten i scripts/ startar var sin http-server och körs samtidigt — i CI som
// en matris, lokalt när man kör dem parallellt. Delar två skript port kan bara
// det ena binda den; det andra dör på EADDRINUSE.
//
// I CI syns det INTE, eftersom varje matrisjobb får en egen runner med en egen
// nätverksstack. Kollisionen är alltså grön i CI och trasig lokalt — den
// sortens fel som får en att tro att den egna maskinen är sönder.
//
// Det hände: verify-atlas2-profil.mjs (2026-08-24) tog 8963, som
// verify-atlas2-tillskott.mjs hållit sedan 2026-08-16. current-build.md
// motiverade samtidig körning med att skripten binder "tio olika portar" —
// påståendet var falskt i en månad utan att någon körning avslöjade det.
//
// Testet läser portarna ur källan i stället för att lita på en lista, så det
// kan inte bli grönt av att någon glömmer uppdatera det.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KATALOG = join(process.cwd(), "scripts");
const SKRIPT = readdirSync(KATALOG).filter(f => /^verify-atlas2.*\.mjs$/.test(f));

/** Porten skriptet lyssnar på, läst ur srv.listen(...). */
function portenI(fil) {
  const src = readFileSync(join(KATALOG, fil), "utf8");
  const m = /\.listen\(\s*(\d{2,5})\s*,/.exec(src);
  return m ? Number(m[1]) : null;
}

describe("DOM-skriptens portar", () => {
  it("hittar skripten över huvud taget", () => {
    // Utan det här kan hela sviten bli grön av att katalogen bytt namn.
    expect(SKRIPT.length).toBeGreaterThanOrEqual(13);
  });

  it("varje skript binder en port som går att läsa ut", () => {
    const utan = SKRIPT.filter(f => portenI(f) == null);
    expect(utan).toEqual([]);
  });

  it("ingen port delas av två skript", () => {
    const perPort = new Map();
    for (const f of SKRIPT) {
      const p = portenI(f);
      if (!perPort.has(p)) perPort.set(p, []);
      perPort.get(p).push(f);
    }
    const krockar = [...perPort.entries()]
      .filter(([, filer]) => filer.length > 1)
      .map(([p, filer]) => `${p}: ${filer.join(" + ")}`);
    expect(krockar).toEqual([]);
  });

  it("skriptet surfar till samma port som det lyssnar på", () => {
    // En halv flytt är värre än ingen: servern på ny port, webbläsaren på den
    // gamla. Då står skriptet och väntar på en sida som aldrig kommer.
    const fel = [];
    for (const f of SKRIPT) {
      const src = readFileSync(join(KATALOG, f), "utf8");
      const lyssnar = portenI(f);
      const surfar = [...src.matchAll(/localhost:(\d{2,5})/g)].map(m => Number(m[1]));
      for (const s of new Set(surfar)) if (s !== lyssnar) fel.push(`${f}: lyssnar ${lyssnar}, surfar ${s}`);
    }
    expect(fel).toEqual([]);
  });
});
