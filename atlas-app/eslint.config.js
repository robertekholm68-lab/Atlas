// ESLint — smal med flit.
//
// VARFÖR DEN HÄR FILEN FINNS: två gånger på två dagar användes en identifierare
// som aldrig importerats — `volt` i App2.jsx och `btnText` i ProgramSheet.jsx.
// Båda byggena gick igenom, båda testsviterna var gröna, och felet syntes först
// som "X is not defined" i webbläsaren med en tom vy som följd.
//
// En trasig referens i en gren som inget test monterar fångas varken av Vite
// eller av vitest. Det är inte otur två gånger, det är ett hål — och hål stängs
// med en kontroll, inte med en föresats att vara mer uppmärksam.
//
// Konfigurationen har därför EN regel som felar: no-undef. Ingen stil, ingen
// formatering, inga åsikter om kodsmak. En lint som klagar på tusen saker blir
// avstängd inom en vecka, och då skyddar den ingenting alls.

import globals from "globals";

export default [
  {
    files: ["src/**/*.js", "src/**/*.jsx", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        // Vite ersätter den vid bygget; den finns inte i källan.
        __ATLAS_BUILD__: "readonly",
        // vitest-globaler i testfiler.
        describe: "readonly", it: "readonly", expect: "readonly",
        vi: "readonly", beforeEach: "readonly", afterEach: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      // Gamla eslint-disable-kommentarer pekar på regler vi inte laddar. Det är
      // arv från en tidigare uppsättning, inte fel i koden.
      reportUnusedDisableDirectives: false,
    },
    rules: {
      "no-undef": "error",
    },
  },
];
