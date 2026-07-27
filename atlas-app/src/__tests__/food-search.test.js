// Askr — livsmedelssökningen.
//
// Bakgrunden är ett fynd från riktig användning: Robert skrev "fralla" i
// matloggen och fick ingenting. Undersökningen visade tre fel, varav ett
// direkt felaktigt: sökningen matchade INUTI ord, så "läsk" gav Fläskfilé som
// första träff och "fil" gav Kycklingfilé. Den som loggade fil fick kyckling.
//
// Testerna nedan är skrivna som de sökningar en människa faktiskt gör, mot den
// riktiga banken på 2 600+ poster — inte mot fixturer. En sökmotor som klarar
// konstruerade exempel men fallerar på "smör" är värdelös.

import { describe, it, expect } from "vitest";
import { FOOD_INDEX } from "../data/foods.js";
import { searchFoods, FOOD_SYNONYMS } from "../engines/foodSearch.js";

const först = q => {
  const r = searchFoods(q, FOOD_INDEX);
  return r.träffar[0] ? r.träffar[0].name : null;
};

describe("ordgränsen — felet som gjorde skada", () => {
  it("\"läsk\" ger läsk, inte fläskfilé", () => {
    expect(först("läsk")).toMatch(/^Läsk/i);
  });

  it("\"fil\" ger filmjölk, inte kycklingfilé", () => {
    expect(först("fil")).toMatch(/filmjölk/i);
  });

  it("\"smör\" ger smör, inte jordnötssmör", () => {
    expect(först("smör")).toBe("Smör");
  });

  it("\"korv\" ger korv, inte korvbröd", () => {
    expect(först("korv")).toMatch(/^Korv/i);
  });

  it("mitt-i-ordet får finnas kvar, men aldrig vinna över en ordträff", () => {
    // "gryn" ska fortfarande hitta Havregryn — substrängmatchning är inte
    // värdelös, den ska bara rangordnas sist.
    const r = searchFoods("gryn", FOOD_INDEX);
    expect(r.träffar.length).toBeGreaterThan(0);
  });
});

describe("rangordningen", () => {
  it("grundvaran slår den sammansatta rätten", () => {
    expect(först("mjölk")).toMatch(/^Mjölk/i);
    expect(först("ägg")).toBe("Ägg");
    expect(först("gurka")).toBe("Gurka");
  });

  it("obedd variant rankas ner — den som söker bröd menar sällan det glutenfria", () => {
    const r = searchFoods("bröd vitt", FOOD_INDEX);
    expect(r.träffar[0].name).not.toMatch(/glutenfri/i);
    // Men ber man om den ska den komma.
    const g = searchFoods("bröd glutenfritt", FOOD_INDEX);
    expect(g.träffar[0].name).toMatch(/glutenfri/i);
  });

  it("alla sökord måste finnas — inte bara något av dem", () => {
    const r = searchFoods("mjölk choklad", FOOD_INDEX);
    r.träffar.forEach(f => {
      const n = f.name.toLowerCase();
      expect(n.includes("mjölk") && n.includes("choklad")).toBe(true);
    });
  });

  it("för kort sökning ger inget — annars far hela banken förbi", () => {
    expect(searchFoods("b", FOOD_INDEX).träffar).toHaveLength(0);
    expect(searchFoods("", FOOD_INDEX).träffar).toHaveLength(0);
  });
});

describe("sammanskrivning — svenskan tillåter båda formerna", () => {
  it("\"pyttipanna\" hittar \"Pytt i panna\"", () => {
    // Andra fyndet från riktig användning. Registret har valt särskrivningen,
    // folk skriver ihop. Det drabbar varje rätt vars namn har mellanslag.
    const r = searchFoods("pyttipanna", FOOD_INDEX);
    expect(r.träffar.length).toBeGreaterThan(0);
    expect(r.träffar[0].name).toMatch(/^Pytt i panna/i);
  });

  it("båda formerna ger samma första träff", () => {
    expect(först("pyttipanna")).toBe(först("pytt i panna"));
  });

  it("fungerar för andra särskrivna rätter", () => {
    expect(först("janssonsfrestelse")).toMatch(/janssons frestelse/i);
  });

  it("sammanskrivningen matchar bara från BÖRJAN — annars återuppstår läsk-buggen", () => {
    // "fläskfilé" innehåller "läsk". Tilläts includes skulle Fläskfilé komma
    // tillbaka som träff på läsk, vilket var hela felet från början.
    expect(först("läsk")).toMatch(/^Läsk/i);
    expect(först("fil")).toMatch(/filmjölk/i);
  });

  it("kräver minst fyra tecken, så korta ord inte träffar allt", () => {
    const r = searchFoods("pyt", FOOD_INDEX);
    r.träffar.forEach(f => expect(f.name.toLowerCase()).toContain("pyt"));
  });
});

describe("vardagsspråket", () => {
  it("\"fralla\" hittar ljust matbröd", () => {
    const r = searchFoods("fralla", FOOD_INDEX);
    expect(r.träffar.length).toBeGreaterThan(0);
    expect(r.träffar[0].name).toMatch(/bröd vitt/i);
    expect(r.tolkatSom).toBe("bröd vitt fibrer");
  });

  it("översättningen redovisas så att den kan visas för användaren", () => {
    // Utan tolkatSom skulle vyn inte kunna säga vad den sökte på, och det
    // skulle se ut som magi.
    expect(searchFoods("macka", FOOD_INDEX).tolkatSom).toBe("bröd");
    expect(searchFoods("bröd", FOOD_INDEX).tolkatSom).toBe(null);
  });

  it("VARJE synonym pekar på något som finns i banken", () => {
    // Det här testet finns för att första utkastet hade tre synonymer som
    // pekade ut i tomma intet — och en av dem ("gurka") gjorde aktiv skada
    // genom att peka bort från en post som redan fanns.
    const trasiga = Object.keys(FOOD_SYNONYMS)
      .filter(ord => searchFoods(ord, FOOD_INDEX).träffar.length === 0);
    expect(trasiga).toEqual([]);
  });

  it("synonymer finns bara för ord registret INTE känner igen", () => {
    // En synonym som pekar bort från en fungerande post är skadlig.
    Object.keys(FOOD_SYNONYMS).forEach(ord => {
      const eget = FOOD_INDEX.filter(f => {
        const w = f.name.toLowerCase().split(/[^a-zà-ÿ0-9]+/);
        return w[0] === ord;
      });
      expect(eget, `"${ord}" finns redan som eget namn i banken`).toHaveLength(0);
    });
  });
});
