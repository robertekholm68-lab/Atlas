# Askr – aktuellt bygge

Datalagret. Här slås siffror, struktur, status och backlog upp. Koden i
`atlas-app/` är ground truth — den här filen sammanfattar, den bestämmer inte.
Uppdatera filen när bygget ändras.

*Senast verifierad mot koden: 2026-07-21 (kväll). Alla siffror nedan är avlästa
ur källan, inte ihågkomna.*

## Namnet

Produkten heter **Askr**. Tagline: **"Fråga kroppen."** ATLAS var upptaget av
mängder av bolag i träning, teknik och logistik och gick inte att äga.

**Lagringsnycklarna heter fortfarande `atlas.*`** — `atlas.v1/v2/v3/mobile` plus
lösa nycklar, 31 stycken. Det är ett medvetet val, inte slarv: ingen användare
ser localStorage-nycklar, och ett byte utan migrering raderar all loggad träning
tyst. Rör dem inte utan backup och ett eget migreringssteg.

**Repo-namn och Pages-adress är också kvar.** Android-skalet har adressen
hårdkodad; byts repo-namnet slutar varje installerad app att fungera. Rätt
ordning den dagen: köp domänen `askr.body`, peka appen dit, byt repo sist.

Bytet var mekaniskt säkert eftersom produktnamnet är VERSALT (`ATLAS`),
nycklarna gemena (`atlas.v3.`) och adressen blandad (`/Atlas/`) — endast det
versala byttes. `__ATLAS_BUILD__` undantogs; den definieras i vite-configen.

**Varumärke:** TMview 2026-07-21, lydelse `askr`, klass 9/41/44. Inget levande
märke med exakt lydelse i EU eller Sverige. Klass 41 (träning) är helt ren. Ett
märke att vara medveten om: `askR.ai`, levande EU-märke i klass 9, annan
marknad (företagsdataanalys). Bör granskas av ombud före kommersiell lansering.

## Byggmål

Modulär **Vite + React 18** (`atlas-app/`) → fristående single-file HTML via
`vite-plugin-singlefile`. Ingen TS i appkoden (jsx). Testas med **vitest**.

**Tre** byggmål som delar samma motorer:

| Mål | Config | Entré | Utdata | Namnrymd |
|---|---|---|---|---|
| Desktop | `vite.config.js` | `index.html` | `dist/index.html` | `atlas.v2.*` |
| Mobil-PWA | `vite.mobile.config.js` | `mobile.html` | `dist-mobile/mobile.html` + `sw.js` | `atlas.mobile.*` |
| **Askr 2.0** | `vite.atlas2.config.js` | `atlas2.html` | `dist-atlas2/atlas2.html` + `sw-atlas2.js` + `atlas2.webmanifest` | `atlas.v3.*` |

```
npm install
npm run dev
npm run build                              # desktop
npx vite build --config vite.mobile.config.js
npx vite build --config vite.atlas2.config.js
npm test                                   # vitest
```

Container nollställs mellan sessioner. Varaktig källa = repot
`robertekholm68-lab/Atlas`. Saknas källan: be Robert ladda upp senaste zip.

## Körlägen & lagring

- **Demo Mode** – seedad demodata (`data/demo.js`).
- **Real Mode** – tom profil. Allt härleds ur loggad historik via
  motorfunktioner, aldrig ur fixtures.
- Legacy v1→v2-migrering i `persist.js`.
- **Askr 2.0 har EGEN namnrymd** (`atlas.v3.*`) och rör aldrig de andra.
  Import från v2/mobile finns i `atlas2/import.js` — läser, skriver aldrig
  tillbaka.
- **`store.load/save` är asynkrona** (localStorage kvar som rygg) — sömmen en
  framtida enhetssynk behöver. `App2` hydreras en gång efter montering. Poster
  bär synkfält (`id`, `userId`, `deviceId`, `updatedAt`); se synk-form i
  backloggen. Näringsmål under `atlas.v3.nutritionTargets`.

## Aktuella siffror (avlästa 2026-07-22)

| Sak | Antal |
|---|---|
| Övningar | 160 |
| Maskiner | 124 |
| Muskler (taxonomi) | 21 |
| Programmallar | 31 |
| Livsmedel, SLV-databasen | 2606 |
| Livsmedel, kuraterade | 74 |
| Recept | 276 |
| Tester (vitest) | 632 i 61 filer |

Program **genereras**: familj × nivå × mål × utrustning × passlängd.
Sporter med cardio-load: innebandy, Muay Thai.

## Struktur

### `src/engines/` — rena funktioner
`index.js` (recovery, readiness, rekommendation, nutrition, systemisk fatigue,
dataConfidence), `session.js`, `programs.js`, `goal.js`, `mission.js`,
`bodyfat.js`, `machines.js`, `coach-programs.js`, `recipes.js`,
samt de som tidigare saknades i dokumentationen: `voice.js`, `post-session.js`,
`geofence.js`, `nfc.js`, `hr.js`, `platform.js`, `bridge.js`, `backup.js`,
`cues.js`.

### `src/features/` — nuvarande appen
dashboard, body-map, training, programs, nutrition, recipes, goals, ai-coach,
progress, calendar, profile, machines, chamber, onboarding, settings.

### `src/atlas2/` — Askr 2.0
`design.js` (alla visuella beslut på ett ställe), `store.js` (async v3-lagring +
härledda tillstånd + `sessionVolume` + synk-form), `import.js` (historikimport),
`BodyMap2.jsx`, `Nav.jsx`, `WorkoutView.jsx`, `FoodView.jsx`, `CoachView.jsx`,
`CoachChat.jsx`, `ProgressView.jsx`, `ProgramSheet.jsx`, `ImportSheet.jsx`,
`MuscleSheet.jsx`, `GoalSheet.jsx`, `NutritionSheet.jsx`, `backnav.js`
(OS-bakåtbeslut, rent), `App2.jsx`, `main2.jsx`, `body_regions.json`.
`facts.js` och `journey.js` är numera bara återexport — de riktiga filerna
ligger i `engines/`.

**PWA:** `vite.atlas2.config.js` emitterar `sw-atlas2.js` och
`atlas2.webmanifest` som riktiga filer. Service workers får enligt spec inte
registreras från blob:-adresser. Dokument hämtas network-first **med
`{ cache: "no-cache" }`** (revalidering, kringgår GitHub Pages 10-min HTTP-cache
så en ny publicering slår igenom utan hård omladdning); allt annat cache-first
för offlinestöd. Cachenamn `atlas2-<byggtid>`, gamla rensas vid `activate`.
Ikoner: `atlas-icon-192.png`, `-512.webp`, `-512-mask.webp` i `public/`, delade
med mobilen.

### `src/data/`
tokens, muscles (21-taxonomi + vektorpaths), exercises, machines, gyms, foods
(+ `assets/data/slv_food_db.json`), recipes, knowledge, coach, demo.

## Motorkonstanter (koden vinner)

- Recovery-decay: `load/35`.
- `undertrained`-regel finns; systemisk cardio-penalty på readiness.
- Nutrition-veckomål räknas per **kalendervecka (mån–sön)**, inte rullande
  7 dagar.
- Fältnamn: **`kcal`**, aldrig `calories`. Genomgående.
- `mergeProfileFromOnboarding` får **aldrig** radera viktshistorik, foton,
  mätvärden eller stabila användar-ID:n.

## Coachens faktakälla

**Historik:** filen påstod länge att §13 `buildCoachFacts` fanns i
`engines/index.js`. Den hade aldrig funnits, och beslut fattades på den
felaktiga uppgiften i flera sessioner.

**Nuläge:** `engines/facts.js` implementerar §13 på riktigt — ett faktablock
per domän (kropp, träning, program, vikt, målresa, kost), vart och ett med egen
tillit, plus `datalage.svagast` som styr hur bestämt coachen får uttala sig.
`buildCoachFacts` är exporterat som alias för `coachFacts` så att kod och
dokument talar samma språk. Ett test bevakar att funktionen finns, så
påståendet inte kan bli falskt igen.

**Omkopplingen är i praktiken klar.** `coachReply` läser nu **kropp-, tränings-,
vikt-, målresa-, kost- och program-grenarna** ur §13 — siffror plus
per-block-tillit, inte bara ärlighetsgrindar. Readiness-SIFFRAN (lastviktad bas +
cykel/kost) räknas i `facts.js`, så coach och karta visar exakt samma tal ur en
källa; apparna matar in sina egna modifierare (`ctx.cycle`, `ctx.nutRec`,
`ctx.readinessAdjust`). Program-grenen läser `facts.program`, där
`analyzeProgram`-förslagen är märkta **strukturella** (giltiga oavsett historik)
vs **historikberoende** (platå/deload/följsamhet — tillitsgatade). Kvar på ctx:
BARA mål-grenens **recomp-resonemang** (`goalReasoning`) — en egen sak från
programförslagen. Båda apparna gör samma bedömning av när data får uttalas om.

**Readiness har EN aggregering.** Talet är ett **lastviktat snitt** (muskler du
belastar mer väger tyngre) + cykel/kost — överallt. Det gamla platta snittet
(`bodyState.overall`) visas inte längre någonstans; det finns kvar som en
coach-fallback som ändå skrivs över av `kropp.readiness` så fort passen har
muskellast. MEN samma formel räknas på tre ställen — `facts.js` (`kropp.readiness`,
källan för coach + karta), `App.jsx` och `MobileApp` (varsin egen headline).
Samma tal idag, men tre beräkningar som kan driva isär — se backloggen.

`readinessFörbehåll(facts)` skiljer **utvilad** från **otränad**. Hög readiness
betyder två helt olika saker beroende på historiken. Utan förbehållet svarade
coachen "beredskap 98 %, fräscha och redo" till någon som inte tränat på en
månad — avträning presenterad som form.

Tilliten är **per påstående**, inte ett globalt minimum. Första versionen tog
svagaste nivån över alla block, vilket gjorde att tom vikthistorik tystade
coachen om kroppen trots 42 loggade pass.

## Målresan (konceptets §7)

`engines/journey.js`. Helt deterministisk — vilken fas man är i och hur många
veckor som återstår är aritmetik, inte tolkning. En språkmodell kan senare
formulera sig kring dessa fakta men får aldrig hitta på dem.

Faser enligt klassisk periodisering: bas 30 %, uppbyggnad 35 %, intensifiering
25 %, nedtrappning 10 %. **Andelar, inte fasta veckor** — annars går modellen
sönder för ett mål 5 veckor bort respektive 40. Tester bevakar båda ytterlägena.

Följsamhet räknas mot förväntat antal pass men visas inte under första veckan:
"0 %" dag två säger ingenting sant.

## Android-app (`android-app/`)

Tunt WebView-skal som kör den publicerade appen. Ingen kod från `src/`
dupliceras. Ger ikon i applådan och **OS-bakåtknappen** (`onKeyDown` går bakåt i
historiken i stället för att stänga appen mitt i ett pass).

Laddar över **https**, inte `file:///android_asset/`: på `file://` blir
ursprunget "null", localStorage blir opålitligt och service workern vägrar
registrera sig. Priset är att första starten kräver nät.

**WebViewens lagring är skild från Chromes.** Data loggad i Chrome syns inte i
appen och tvärtom. Välj ett ställe att logga på.

**TWA valdes bort:** kräver `assetlinks.json` på domänens rot, som tillhör ett
annat repo. Blir möjlig med `askr.body`.

**Fallgrop:** `d8` i build-tools 34 kraschar på anonyma inre klasser här
(NPE i R8:s klassgraf). Därför namngivna `AtlasWebViewClient`/`AtlasChromeClient`
och en namngiven `Runnable` i stället för lambda. Kräver **JDK 17** — d8
fungerar inte under JDK 21. Se `android-app/BYGG.md`.

**Signeringsnyckeln ligger inte i repot.** Utan exakt samma nyckel går appen
inte att uppdatera. Paket-ID är fortfarande `se.atlas.app`; byte till
`body.askr.app` gör att Android ser det som en ny app — avinstallation krävs och
data i skalet försvinner.

## Deploy

**Automatisk sedan 2026-07-21:** GitHub Actions (`.github/workflows/deploy-pages.yml`)
bygger och publicerar vid varje push till `main`. Pages-källan är satt till
**GitHub Actions** (inte längre "deploy from a branch"). `file://` gör
localStorage opålitligt och blockerar service worker.

Flödet kör `npm ci`, `npm test` (upp till tre försök så att den kända
`p5-realmode`-flakigheten inte blockerar en korrekt publicering; rött i alla tre
stoppar deployen), bygger alla tre målen, sätter samman sajten i CI, skriver
`.nojekyll` och publicerar via `actions/deploy-pages`. **`docs/` checkas inte
längre in** — den byggs från noll i CI. Ett verifieringssteg kräver att
receptbilderna är 134 (samma som `src/assets/recipes/`); färre stoppar
publiceringen (då har `import.meta.glob` missat filer).

Sajtens rot: `index.html` (landning, källa `atlas-app/landing/`), `app.html`
(desktop), `mobile.html` + `sw.js`, `atlas2.html` + `sw-atlas2.js` +
`atlas2.webmanifest`, receptbilder, `public/`-assets, `TESTARE.md`, `.nojekyll`.
**Adressen får inte ändras** — Android-skalet har `…/Atlas/atlas2.html`
hårdkodad. De döda TWA-resterna `manifest.webmanifest` och
`.well-known/assetlinks.json` (paket `com.atlas.twa`) togs bort.

Den gamla handbyggda `docs/` i repot är vilande och kan tas bort separat.

## Leverans

Artefakter till `/mnt/user-data/outputs/`, källa zippas exklusive
`node_modules/`, `dist*/`, `.git/`, cache. Tidsstämplade filnamn i svensk tid
(`TZ=Europe/Stockholm date +%Y-%m-%d-%H%M`).

Verifiering: headless Chromium / vitest framför visuell läsning.
**Fallgrop:** matcha alltid skiftlägesokänsligt mot knapptexter — `hdr()`
versaliserar via CSS, och `innerText` returnerar den versaliserade texten. Det
har gett falska larm om trasiga vyer minst fyra gånger.

## Backlog

**Askr 2.0 — klart:** startsida, lägesval, hem med anatomisk karta,
bottennavigering, pågående pass med riktig loggning, kvitto, programväljare,
matvy (översikt/logga/recept), coachvy med skäl, framstegsvy, historikimport,
muskeldetaljvy, målresa, installerbar PWA med offlinestöd.
- **OS-bakåtknappen** (`pushState`/`popstate`, `atlas2/backnav.js`): bakåt
  stänger öppet ark, går till hem från annan flik, backar genom onboarding-steg,
  och lämnar appen först på hem/start. Bygger inte upp historik vid flikbyten.
  Ett pågående pass kastas aldrig (live ligger kvar i `atlas.v3.live`).
- **Näringsmål OCH matlogg i v3 — INGEN öppen lucka.** `NutritionSheet.jsx`
  sätter näringsmål (`atlas.v3.nutritionTargets`); `FoodView.jsx` är en riktig
  matlogg med livsmedelsdatabas (`FOOD_INDEX`). Matvyn visar ring/återstående,
  coachen får riktiga värden via `nutritionCtx` och läser dem ur `facts.kost`.
  Coachen skickar `null` BARA i de ärliga tillstånden — "inget mål satt" och
  "mål satt men inget loggat idag" (aldrig påhittade nollor). Alltså: v3 saknar
  inte nutrition; att coachen ibland svarar "inga kostmål" är rätt beteende, inte
  en saknad funktion.
- **Async store + synk-form:** `store.load/save` är asynkrona (localStorage kvar
  som rygg); `App2` hydreras en gång. Varje post (pass, vikt, matlogg, mål) bär
  `id`, `userId`, `deviceId`, `updatedAt`. Nya poster får slumpat id vid
  skapandet; `migrera()` ger befintlig data utan id ett innehållsbaserat id
  (idempotent). Ingen server/inloggning/nätverkskod — bara formen.

**Askr 2.0 — kvar:**
- Koppla nuvarande appens coach till `engines/facts.js` — klart för kropp,
  träning, vikt, målresa, kost och program (siffror + per-block-tillit ur §13).
  Kvar: BARA mål-grenens recomp-resonemang (`goalReasoning`) — en egen sak från
  programförslagen (`analyzeProgram`, nu i `facts.program`).
- **Ena headline-readiness mot `kropp.readiness`.** `App.jsx` (`trainingBase` +
  `readinessBreakdown`) och `MobileApp.jsx` (rad 143) räknar sitt readiness-tal
  parallellt med en egen kopia av samma lastviktade formel. Samma tal som
  `facts.kropp.readiness` idag, men tre beräkningar som kan driva isär vid en
  framtida ändring. Låt båda läsa `kropp.readiness` direkt — precis som 2.0 redan
  gör (App2/CoachView/ProgressView) — så aggregeringen bara finns på ETT ställe.
- Knowledge-banken till coachen, så råd kan motiveras med källa via `SL()`.
- Måldriven LLM-coach ovanpå målresans fakta (BYOK finns).
- Tillgänglighetsgenomgång — åtgärdat: synlig tangentbordsfokus, ark som
  `role="dialog"` + Escape, aria på fält, AA-upplyst `nodata`/`border`,
  `prefers-reduced-motion`. Kvar: träffytor ≥44 px (matvyn, väntar på blick).
- **Muskelkartans a11y (eget spår).** SVG-regionerna är klickbara men inte
  fokuserbara och saknar namn för skärmläsare. Kräver riktig interaktionsdesign
  (fokuserbara regioner, pilnavigering, muskelnamn) — kartan är för central för
  en snabbfix.
- **Synk-motorn:** `updatedAt` bumpas ännu inte vid *redigering* (sätts vid
  skapande/migrering), och programmen stämplas inte. Hör till själva
  synkmotorn, som medvetet inte byggts.
- **Struken:** återhämtningsvy (skiss 5). Sömn, HRV och vilopuls har ingen
  datakälla. En vy med tomma fält är sämre än ingen vy. Tas upp igen först när
  en klocka kopplas in.

**Namnbytet — kvar:**
- Android-appens etikett och paket-ID.
- `bildbank.md` och skill-filerna säger fortfarande ATLAS.
- @ATLAS-karaktären i bildpipelinen.
- Repo-namn och domän (vänta på `askr.body`, se ovan).

**Nuvarande appen:**
- Rösten avstängd i installerad Android-app (`engines/platform.js`,
  `isInstalledAndroid()`) tills mikrofonkraschen är verifierad. Fungerar i
  Chrome. **Pending: test på riktig telefon eller `adb logcat`.**
- Webbversionen har nya paletten men inte skissernas layout.
- OS-bakåtknapp (`pushState`/`popstate`): byggd i **2.0** (se ovan). Desktop och
  mobil-PWA har den inte än — samma mönster kan återanvändas ur `atlas2/backnav.js`.

**Kända luckor i kartan:** `serratus_anterior` och `hip_flexors` saknar egen
form i 2.0:s figur och ritas inte ut (räknas fortfarande i motorn).
Figurens regioner är grövre än taxonomin — `deltoids` är en form men tre
muskler. Regionen färgas efter den MINST återhämtade, så en trött delmuskel
aldrig göms bakom en utvilad.

## Fallgropar (lärt oss den hårda vägen)

- **Demo/Real-separation:** alla kort och all coach-logik måste demo-gatas.
  Mobilen hade hårdkodat `DEMO_PROGRAM` som användes även i Real Mode — stängt
  2026-07-21.
- **Fält som aldrig sätts:** `buildSession` sätter aldrig `totalVolume`, och
  recepten bär `i: [{id, g}]` utan `kcal`. Båda är numera skyddade — volym
  räknas ur seten (`sessionVolume`, även i mobilen), näring ur ingredienserna
  (`recipeMacros`). Mönstret är däremot värt att leta efter på fler ställen:
  ett läst men aldrig skrivet fält ger tysta nollor som ser ut som data.
  *Kontrollerat mot koden 2026-07-21 kväll — båda de namngivna är åtgärdade.*
- **Underlag före diagnos.** `laggingMuscleAdvice` påstod "~1 set/vecka, under
  minsta effektiva volym" utifrån ETT loggat pass. Kräver nu ≥4 pass över
  ≥14 dagar innan den uttalar sig om volym eller frekvens. De generella råden
  ges ändå — det är diagnosen som utelämnas, inte hjälpen.
- **Ofullständiga pass.** `muscleLoads` saknas i äldre importerad data. Sex
  oskyddade uppslag kraschade hela återhämtningsberäkningen; alla använder nu
  `(s.muscleLoads || {})`. Ett pass utan fältet ska ge noll last, inte krasch.
- **Falskt värde ≠ utelämnat värde.** `x || fallback` behandlar 0 som saknat.
  Samma rotorsak som ovan; träffade `skapaMål(startDatum)`. Använd
  `x != null ? x : fallback`.
- **Set utan vikt** ger noll muskellast, vilket får appen att påstå att inget
  pass finns. 2.0 spärrar loggning tills vikt är satt för yttre last.
- **Testförorening:** omonterade React-rötter läcker mellan testfall.
  `p5-realmode` är instabil och faller ibland i full svit men är grön isolerat.
- **Hooks efter villkorad return** ger React error #310. Alla hooks först.
- **GitHub PAT:** fine-grained tokens kräver **Contents: Read and write**
  explicit. Token bäddas i URL:en och rensas direkt efter push.
- **Paletten låg på fyra ställen** (`data/tokens.js`, `styles/global.css`,
  mobilens `C`, gradienter i `App.jsx`) och en omfärgning missade två tyst.
  Därför ligger 2.0:s palett samlad i `atlas2/design.js`.
