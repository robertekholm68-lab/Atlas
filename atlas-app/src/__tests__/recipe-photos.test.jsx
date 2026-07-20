// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { RECIPES } from "../data/recipes.js";
import { recipePhoto, photoIdFromFilename } from "../features/recipes/index.jsx";

describe("receptfoton — sömmen mot bildfiler", () => {
  it("recept med bildfil får ett foto, övriga faller tillbaka på identiteten", () => {
    const medFoto = RECIPES.filter(r => recipePhoto(r));
    // minst de fyra vi lagt in ska hittas
    ["r_lax_quinoa_middag", "g_bowl_23", "g_soppa_01", "g_fruk_00"].forEach(id => {
      const r = RECIPES.find(x => x.id === id);
      expect(r, `receptet ${id} ska finnas`).toBeTruthy();
      expect(recipePhoto(r), `${id} ska ha ett foto`).toBeTruthy();
    });
    expect(medFoto.length).toBeGreaterThanOrEqual(4);
  });

  it("recept utan bildfil kraschar inte utan returnerar null", () => {
    const utan = RECIPES.filter(r => !recipePhoto(r));
    expect(utan.length).toBeGreaterThan(0);
    expect(recipePhoto(utan[0])).toBe(null);
  });

  it("läsbart tillägg efter dubbelt understreck ignoreras vid matchning", () => {
    expect(photoIdFromFilename("g_bowl_23__bowl-med-kikartor.webp")).toBe("g_bowl_23");
    expect(photoIdFromFilename("r_oat_berry.webp")).toBe("r_oat_berry");
    expect(photoIdFromFilename("g_soppa_01__linssoppa__v2.png")).toBe("g_soppa_01");
  });

  it("filnamnet måste matcha ett verkligt recept-id — annars syns bilden aldrig", async () => {
    const mods = import.meta.glob("../assets/recipes/*.{jpg,jpeg,png,webp,avif}", { eager: true });
    const ids = new Set(RECIPES.map(r => r.id));
    const foraldralosa = Object.keys(mods)
      .map(p => photoIdFromFilename(p.split("/").pop()))
      .filter(name => !ids.has(name));
    expect(foraldralosa, "bildfiler utan matchande recept").toEqual([]);
  });
});

describe("receptfoton — reservväg när bildfilen saknas", () => {
  it("en bild som inte går att ladda ersätts av den genererade identiteten", async () => {
    const { createRoot } = await import("react-dom/client");
    const { act } = await import("react-dom/test-utils");
    const React = (await import("react")).default;
    const { RecipeIdentity } = await import("../features/recipes/index.jsx");
    const recipe = RECIPES.find(r => recipePhoto(r));

    const el = document.createElement("div"); document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => { root.render(React.createElement(RecipeIdentity, { recipe })); });

    const img = el.querySelector("img");
    expect(img, "med foto ska en img renderas").toBeTruthy();
    expect(el.querySelector("svg")).toBe(null);

    // simulera att filen saknas (t.ex. HTML:en öppnad utan bildmappen)
    await act(async () => { img.dispatchEvent(new Event("error")); });

    expect(el.querySelector("img"), "den trasiga bilden ska försvinna").toBe(null);
    expect(el.querySelector("svg"), "identiteten ska ta över").toBeTruthy();

    await act(async () => { root.unmount(); });
    el.remove();
  });
});

describe("receptfoton — delade bilder mellan snarlika rätter", () => {
  it("varje alias pekar på ett recept som verkligen finns och har bild", async () => {
    const { PHOTO_ALIASES, recipePhoto } = await import("../features/recipes/index.jsx");
    const ids = new Set(RECIPES.map(r => r.id));
    Object.entries(PHOTO_ALIASES).forEach(([fran, till]) => {
      expect(ids.has(fran), `${fran} ska vara ett verkligt recept`).toBe(true);
      expect(ids.has(till), `${till} ska vara ett verkligt recept`).toBe(true);
      const kalla = RECIPES.find(r => r.id === till);
      expect(recipePhoto(kalla), `${till} måste ha en bildfil`).toBeTruthy();
    });
  });

  it("ett recept med alias får källans bild", async () => {
    const { PHOTO_ALIASES, recipePhoto } = await import("../features/recipes/index.jsx");
    const [fran, till] = Object.entries(PHOTO_ALIASES)[0];
    expect(recipePhoto(RECIPES.find(r => r.id === fran)))
      .toBe(recipePhoto(RECIPES.find(r => r.id === till)));
  });
});
