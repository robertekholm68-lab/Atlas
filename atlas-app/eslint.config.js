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
  // ── TDZ-skyddet: bara det AKTIVA bygget (2.0 + motorerna) ──
  //
  // `const` i temporal dead zone kastar "Cannot access before initialization" —
  // den är alltså inte hoistad till undefined som `var`. Tre gånger på två
  // paket lade jag en useMemo som läste en const längre ned i komponenten;
  // varje gång föll tio rendertester på ett fel som inte syns vid läsning,
  // eftersom App2 är för lång för att deklarationsordningen ska vara överblickbar.
  //
  // AVGRÄNSAD MED FLIT. Mot hela kodbasen gav regeln 70 träffar, samtliga
  // ofarliga: stilkonstanter i modulscope (`bigBtn`, `ghostBtnLg`) som används
  // inuti komponenter och alltså läses långt efter modulen laddats. Att rätta
  // 70 harmlösa ställen i gamla appen för att skydda den nya vore att betala
  // fel pris — och en regel som kräver städning i filer man inte rör blir
  // avstängd, precis som en lint med tusen åsikter.
  {
    files: ["src/atlas2/**/*.{js,jsx}", "src/engines/**/*.js"],
    rules: {
      "no-use-before-define": ["error", { functions: false, classes: false, variables: true }],
    },
  },
];
