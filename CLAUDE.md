# Askr — projektregler

Läs den här filen först. Den är kort med flit. Föränderliga siffror, struktur
och backlog står i `atlas-app/current-build.md`, inte här.

## Vad Askr är

Svensk styrketräningsapp vars tes är **"kroppen är gränssnittet"**. Tagline:
**"Fråga kroppen."** En interaktiv muskelkarta är kärnan — återhämtning per
muskel, vad kroppen tål idag, och nästa bästa beslut.

Produkten hette ATLAS till 2026-07-21. Namnet var omöjligt att äga.

## Språk

- **Svenska** i all kommunikation, alla kommentarer och allt användaren ser.
- Kod, variabelnamn och tekniska termer på engelska går bra.
- Undvik å, ä, ö i **identifierare** som når byggverktyg utanför JS.

## Sanningskällor (vid konflikt vinner den högre upp)

1. **Koden i `atlas-app/src/`** — ground truth för allt appen gör.
2. **`atlas-app/current-build.md`** — bygge, struktur, siffror, backlog.
3. Den här filen — reglerna.

Läs aldrig av siffror ur minnet. Räkna dem ur koden.

## Hårda regler

- **Ärlighet framför påhittade siffror.** Real Mode utan underlag visar ett
  "för lite data"-tillstånd, aldrig en fejkad readiness-siffra. Mönstren
  `dataConfidence` och `hasRecentTraining` ska bevaras överallt.
- **Demodata får aldrig läcka in i Real Mode.** Allt i Real Mode härleds ur
  loggad historik via motorfunktioner, aldrig ur hårdkodade fixtures.
- **Underlag före diagnos.** Uttala dig inte om volym eller frekvens utan
  tillräckligt många pass över tillräckligt lång tid. Generella råd ges ändå —
  det är diagnosen som utelämnas, inte hjälpen.
- **En coach, inte två.** All coachlogik bor i `features/ai-coach`. Nya vyer
  återanvänder `coachReply`; de skriver inte egna svar. Två coacher betyder två
  sanningar om samma kropp.
- Muskelfakta är fakta, men **kopiera aldrig källtext ordagrant** — parafrasera
  och citera via `SL()`-helpern.
- **Kör testerna** (`npm test`) efter varje ändring i motorer eller rendering.
- Bygg **en** version först (desktop, mobil eller 2.0), fråga sedan om samma
  ändring gäller de andra.

## Rör inte det här

Namnbytet stannade medvetet vid ytan. Följande är kvar och ska förbli:

- **`atlas.*`-nycklarna i localStorage** (`atlas.v1/v2/v3/mobile`, 31 stycken).
  Byts de utan migrering raderas all loggad träning tyst. Ingen användare ser
  dem ändå.
- **Repo-namnet `Atlas` och Pages-adressen.** Android-skalet har adressen
  hårdkodad; byts repo-namnet slutar varje installerad app att fungera.
- **Källmappen `atlas-app/`, `atlas2.html`, `sw-atlas2.js`, `atlas-icon-*`.**
- **`__ATLAS_BUILD__`** — definieras i vite-configerna och måste matcha.

Rätt ordning den dag namnet ska bytas hela vägen: köp domänen `askr.body`, peka
appen dit, byt repo sist.

## Bygga

```bash
cd atlas-app
npm install
npm run dev                                   # utvecklingsserver
npm test                                      # vitest
npm run build                                 # desktop  → dist/index.html
npx vite build --config vite.mobile.config.js # mobil-PWA → dist-mobile/
npx vite build --config vite.atlas2.config.js # Askr 2.0  → dist-atlas2/
```

Tre byggmål delar samma motorer. Askr 2.0 (`src/atlas2/`) är den aktiva appen.

## Deploy

GitHub Pages från `docs/` på `main`. Bygg, kopiera artefakterna till `docs/`,
behåll `.nojekyll`. `file://` gör localStorage opålitligt och blockerar service
workern — testa alltid över http(s).

## Fallgropar som redan kostat tid

- **Matcha skiftlägesokänsligt mot knapptexter.** `hdr()` versaliserar via CSS
  och `innerText` returnerar den versaliserade texten. Har gett falska larm om
  trasiga vyer minst fyra gånger.
- **Fält som aldrig sätts.** `totalVolume` (från `buildSession`) och
  `recipe.kcal` läses på flera ställen men skrivs aldrig. Tysta nollor som ser
  ut som riktiga värden. Leta efter fler.
- **`covered` från `bodyState` är ett ANTAL, inte en boolean.** Gatingen
  fungerar eftersom noll är falskt, men namnet lurar.
- **Falskt värde ≠ utelämnat värde.** `x || fallback` behandlar 0 som saknat.
  Använd `x != null ? x : fallback`.
- **Ofullständiga pass.** `muscleLoads` saknas i äldre importerad data. Använd
  alltid `(s.muscleLoads || {})` — ett pass utan fältet ska ge noll last, inte
  krasch.
- **Hooks efter villkorad return** ger React error #310. Alla hooks först.
- **Omonterade React-rötter läcker mellan testfall.** Montera av dem.
- **Mät, gissa inte, om utseende.** Headless-rendering plus mätning slår
  visuell bedömning.

## Produktfilosofi

Djup före bredd. Muskelkartan och nästa-bästa-beslut ska dominera. Sluta växa
på bredden — stärk det som finns.
