// Askr 2.0 — tomt pass som fylls på efterhand.
//
// Robert: "jag vill ha ett pass som är tomt som man fyller i övningar efterhand
// man tränar."
//
// Ett program och ett fritt pass kräver båda att man bestämmer allt i förväg.
// På gymmet vet man ofta inte: man tar det som är ledigt och bestämmer nästa
// övning när den förra är klar.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { buildLive } from "../atlas2/WorkoutView.jsx";
import { EXERCISES } from "../data/exercises.js";

const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");
const app = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");

describe("ett pass kan starta utan övningar", () => {
  it("buildLive tål en tom övningslista", () => {
    const l = buildLive(null, { name: "Fritt pass", exercises: [] }, []);
    expect(l).toBeTruthy();
    expect(l.items).toEqual([]);
  });

  it("render-raderna tål att it saknas", () => {
    // klara, förra och saknarVikt körs vid VARJE render — alltså även innan
    // tomvyn returneras. Utan skyddet kastar it.loggade och hela vyn blir
    // blank, vilket är precis det felet tomvyn skulle lösa.
    expect(src).toMatch(/const klara = it \? it\.loggade\.length : 0;/);
    expect(src).toMatch(/const förra = it && klara > 0/);
    expect(src).toMatch(/const saknarVikt = !!it &&/);
  });

  it("tomvyn ligger efter alla hooks", () => {
    // En tidig return före useMemo/useEffect gav React error #310: hooks
    // anropades i olika ordning mellan renderingar. Mätt i webbläsaren —
    // felet syntes bara där, testerna var gröna.
    const ret = src.indexOf("if (!it) return (");
    const sisteHook = src.lastIndexOf("useEffect(() => {", ret);
    expect(sisteHook).toBeLessThan(ret);
  });

  it("tomvyn bjuder in i stället för att vara blank", () => {
    expect(src).toMatch(/data-lagg-till-forsta="1"/);
    expect(src).toMatch(/Passet är igång/);
  });

  it("går att avsluta utan att lägga till något", () => {
    // Startar man ett tomt pass av misstag ska man inte behöva lägga till en
    // övning för att komma ur det.
    const block = src.slice(src.indexOf("if (!it) return ("), src.indexOf("if (!it) return (") + 2000);
    expect(block).toMatch(/onAbort/);
  });
});

describe("övningar läggs till under passets gång", () => {
  it("knappen finns även när passet redan har övningar", () => {
    // Poängen är att bestämma nästa övning när den förra är klar.
    expect(src).toMatch(/data-lagg-till-ovning="1"/);
  });

  it("tillägget får samma behandling som en planerad övning", () => {
    // buildLive återanvänds, så progression och muskellast räknas identiskt —
    // en övning tillagd mitt i passet ska inte vara en andra klassens post.
    expect(app).toMatch(/const tillägg = buildLive\(null, \{/);
  });

  it("villkoret läser inte live ur stängningen", () => {
    // Arket renderas i samma träd som passet; funktionen skapades i en render
    // där live kunde vara null, och `!live` slog då ut hela tillägget TYST —
    // övningen försvann utan felmeddelande.
    const fn = app.slice(app.indexOf("const läggTillÖvningIPass"), app.indexOf("const läggTillÖvningIPass") + 900);
    expect(fn).not.toMatch(/if \(!exIds \|\| !exIds\.length \|\| !live\)/);
    expect(fn).toMatch(/setLive\(l => \(l \?/);
  });

  it("loggade set rörs inte", () => {
    // Befintliga items behålls och de nya läggs sist — inget ersätts.
    const fn = app.slice(app.indexOf("const läggTillÖvningIPass"), app.indexOf("const läggTillÖvningIPass") + 1200);
    expect(fn).toContain("items: [...l.items, ...tillägg.items]");
  });
});

describe("banken vet vilket sammanhang den öppnats i", () => {
  const bank = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");

  it("knappen säger Lägg till i ett pågående pass", () => {
    expect(bank).toMatch(/iPågåendePass \? "Lägg till" : "Starta pass"/);
  });
});
