// Askr — skyddet mot odefinierade referenser.
//
// Två gånger på två dagar användes en identifierare som aldrig importerats:
// `volt` i App2.jsx och `btnText` i ProgramSheet.jsx. Båda byggena gick igenom,
// båda testsviterna var gröna, och felet syntes först som "X is not defined" i
// webbläsaren — med en tom vy som följd.
//
// En trasig referens i en gren som inget test monterar fångas varken av Vite
// eller av vitest. Det här testet vaktar att kontrollen finns kvar och är
// inkopplad; själva kontrollen gör eslint.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("lint finns och är inkopplad", () => {
  it("konfigurationen finns", () => {
    expect(existsSync(resolve("eslint.config.js"))).toBe(true);
  });

  it("no-undef är på — det är hela skälet till att linten finns", () => {
    const cfg = readFileSync(resolve("eslint.config.js"), "utf8");
    expect(cfg).toMatch(/"no-undef":\s*"error"/);
  });

  it("npm run lint finns", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    expect(pkg.scripts.lint).toMatch(/eslint/);
  });

  it("linten är smal — en regel som klagar på allt blir avstängd", () => {
    // Stil och formatering hör inte hit. En lint med tjugo åsikter om kodsmak
    // stängs av inom en vecka, och då skyddar den ingenting alls.
    const cfg = readFileSync(resolve("eslint.config.js"), "utf8");
    const regler = (cfg.match(/"[a-z-]+\/?[a-z-]*":\s*"(error|warn)"/g) || []);
    expect(regler.length).toBeLessThanOrEqual(3);
  });

  it("__ATLAS_BUILD__ är känd — Vite ersätter den vid bygget", () => {
    // Utan den skulle linten fela på versionsstämpeln, som inte finns i källan.
    expect(readFileSync(resolve("eslint.config.js"), "utf8")).toMatch(/__ATLAS_BUILD__/);
  });
});
