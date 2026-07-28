# Askr – aktuellt bygge

> **DEN HÄR FILEN ÄR ENDA KÄLLAN för byggstatus, siffror, struktur och
> backlogg.** Håll ingen parallell statuslista någon annanstans — inte i en
> projektfil, inte i en molnsession, inte i ett samtal. En andra bokföring
> hinner alltid bli osann, och då byggs saker mot en bild som inte längre
> gäller. Det har hänt: coachvyns 99 px byggdes bort (#44) efter att posten
> redan var struken — beslutet var att coachen FÅR scrolla.
>
> Projektfiler utanför repot är överlämningar, inte status. Bär de siffror
> eller backlogg är de fel per definition.
>
> **HÅRD REGEL: molnpaket innehåller ALDRIG den här filen.** Beslutad
> 2026-07-27 efter fem tysta återställningar i rad. Skälet är strukturellt och
> går inte att disciplinera bort: molnet kan bara känna repots tillstånd vid
> PUSH, aldrig vid MERGE, och i det glappet skrivs allt som hänt emellan över.
> Git flaggar ingenting, eftersom raderna inte krockar.
>
> Filen skrivs av den som mergar, mot färsk main, i samma PR som ändringen.
> Bär ett molnpaket den här filen ska ändringen kastas, inte lösas.

Datalagret. Koden i `atlas-app/` är ground truth — den här filen sammanfattar,
den bestämmer inte. Uppdatera filen i samma PR som ändringen, inte efteråt.

*Senast verifierad mot koden: 2026-07-27 (efter matsöket). Alla siffror nedan är avlästa
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

## Aktuella siffror (avlästa 2026-07-27)

| Sak | Antal |
|---|---|
| Övningar | 160 |
| Maskiner | 124 |
| Muskler (taxonomi) | 21 |
| Programmallar | 31 |
| Livsmedel, SLV-databasen | 2606 |
| Livsmedel, kuraterade | 69 |
| Recept | 276 |
| Recept med bild | 140 (134 filer + 6 `PHOTO_ALIASES`) |
| Tester (vitest) | 916 i 86 filer |

Program **genereras**: familj × nivå × mål × utrustning × passlängd.
Sporter med cardio-load: innebandy, Muay Thai.

## Struktur

### `src/engines/` — rena funktioner
`index.js` (recovery, readiness, rekommendation, nutrition, systemisk fatigue,
dataConfidence), `session.js`, `programs.js`, `goal.js`, `mission.js`,
`bodyfat.js`, `machines.js`, `coach-programs.js`, `recipes.js`,
samt de som tidigare saknades i dokumentationen: `voice.js`, `post-session.js`,
`geofence.js`, `nfc.js`, `hr.js`, `platform.js`, `bridge.js`, `backup.js`,
`cues.js`, `nudges.js` (händelsedrivna påminnelser), `supplements.js`
(följsamhet för dagliga tillskott).

**Varför-svaren får konsekvenser.** `reasonSignal` (ur `post-session.js`, kräver
≥3 svar inom 21 dagar) styr två saker — och två saker den INTE gör:

- **`progressionSuggestion(exId, sessions, targetReps, bias = 0)`.** Biasen får
  DÄMPA eller FÖRSTÄRKA en riktning, **aldrig vända den** — den appliceras
  efter att riktningen bestämts, så ett "kändes lätt"-mönster kan inte göra om
  en RPE 9.5-backning till en ökning. Den rör bara ökningar: ett pass som redan
  håller backas inte ytterligare, för det vore att straffa ärlighet.
- **Tilliten i `facts.kropp`, aldrig readiness-SIFFRAN.** Talet räknas ur loggad
  belastning och är korrekt för det den mäter; att dra ner det självt skulle
  förfalska en riktig beräkning. Det som sjunker är hur mycket vikt man ska
  lägga på talet — ett steg, med golv, och `"ingen"` rörs inte.

`bias = 0` är standard och `ctx.reasonSignal` är valfri, så desktop och mobilen
är opåverkade — bara 2.0 skickar in dem.

**Progressionsklivet skalas mot överskottet.** Ett fast steg gav samma förslag
för 8 reps som för 20 på en vikt tänkt för 8. Epley uppskattar 1RM ur vikt och
reps, och därifrån räknas vikten som borde ge målrepsen: 100 kg × 12 föreslår
110 i stället för 102,5. **Golv:** aldrig mindre än vanliga steget. **Tak:**
10 % per pass — formeln kan matematiskt vilja +30 %, men uppskattningen bygger
på ETT set, och appen säger till när den ville mer i stället för att tyst kapa.
Den här delen ligger i `index.js` och gäller därför alla tre byggmålen.

### `src/features/` — nuvarande appen
dashboard, body-map, training, programs, nutrition, recipes, goals, ai-coach,
progress, calendar, profile, machines, chamber, onboarding, settings.

### `src/atlas2/` — Askr 2.0
`design.js` (alla visuella beslut på ett ställe), `store.js` (async v3-lagring +
härledda tillstånd + `sessionVolume` + synk-form), `import.js` (historikimport),
`BodyMap2.jsx`, `Nav.jsx`, `WorkoutView.jsx`, `FoodView.jsx`, `CoachView.jsx`,
`CoachChat.jsx`, `ProgressView.jsx`, `ProgramSheet.jsx`, `ImportSheet.jsx`,
`MuscleSheet.jsx`, `GoalSheet.jsx`, `NutritionSheet.jsx`, `SessionSheet.jsx`,
`ReadinessSheet.jsx`, `RescueView.jsx`, `MealPrepView.jsx`, `SportView.jsx`,
`SupplementsPanel.jsx`, `Shell.jsx` (skrivbordsskal), `layout.js` (brytpunkt,
dvh, navhöjd), `foodlog.js`, `backup2.js`, `backnav.js` (OS-bakåtbeslut, rent),
`App2.jsx`, `main2.jsx`, `body_regions.json`.
`facts.js` och `journey.js` är numera bara återexport — de riktiga filerna
ligger i `engines/`.

**Två skal, en uppsättning vyer.** Under brytpunkten (`layout.js`) bottennav,
över den `Shell.jsx` med sidopanel och ark som centrerade modaler. Vyerna
forkas INTE — de får veta hur brett de har och möblerar därefter. `FLIKAR`
bryts ut ur `Nav.jsx` och läses av båda skalen, så navigeringen inte kan glida
isär. Kartan har ingen fast höjd: vyerna är flex-kolumner där kartan är
`flex: 1` med `minHeight: 0`, så webbläsaren räknar. Mätt 299 px på iPhone SE,
638 på desktop — kroppen är gränssnittet, alltså får kroppen ytan som blir
över. `100dvh`, inte `100vh`: `vh` räknar in iOS adressfält.

**Ett hopfällbart avsnitt fälls ut OCH in, och säger vilket.** Coachvyns chatt
gick en period bara att öppna: knappen *byttes ut* mot chatten, så vägen
tillbaka fanns inte. Skälfliken tio rader ovanför gjorde rätt hela tiden — det
var alltså inte ett förbisett fall utan två mönster för samma sak i samma vy.
Regeln är nu en: rubriken ligger kvar, `aria-expanded` följer tillståndet, och
pilen vänder. Ett statiskt testfall läser `src/atlas2/*.jsx` och kräver
`aria-expanded` på **varje** knapp vars `onClick` växlar ett visa-tillstånd, så
regeln inte kan glida isär i nästa vy. Det fångade tre stumma knappar direkt
("Ändra kost", "Inköpslista", "Ton:").

Testet bär ett eget skydd: `<button[^>]*>` DUGER INTE för att avgränsa en
JSX-tagg, eftersom pilfunktionen innehåller `=>`. Den varianten matchade
ingenting och var grön av tomhet. Avgränsningen räknar klammer- och
parentesdjup, och ett separat testfall prövar avgränsaren — plus ett golv för
hur många växlande knappar som minst ska hittas.

**Readiness går att fråga varför.** Talet på hem är en knapp som öppnar
`ReadinessSheet` — basen plus varje modifierare med sitt tecken, hämtat ur
motorns `readinessBreakdown`. De andra två cellerna är räknade fakta utan
uppdelning och har medvetet ingen knapp. Utan underlag förklaras ingenting
bort: arket säger att talet saknas.

**Kosten påverkar readiness — men bara med underlag.** `nutRec` beräknas en
gång i `App2` och matas till hem, coach och framsteg, så vyerna inte kan glida
isär. Den gatas av `logReliability` (≥3 loggade dagar av 5); under tröskeln
blir modifieraren `{ mod: 0 }` och kosten påverkar ingenting. Arket säger rakt
ut när kosten inte räknas in och varför.

**Viktrastret är 0,25 kg, förankrat i hela kilon.** Hittat med telefonen i
handen på ett gym: displayen visade 61,3 och 61,8 — vikter som inte finns.
Två fel som förstärkte varandra. `roundInc` kvantiserade till 1,25 kg, så ett
förslag aldrig kunde landa på ett helt kilo som inte var delbart med 1,25
(61 blev 61,25, 63 blev 62,5). Ovanpå det körde stegknappen `.toFixed(1)` på
varje tryck, vilket gjorde 63,75 till 63,8 — och felet ackumulerades:
61,25 → 63,8 → 66,3 → 68,8. **Talet på skärmen var alltså inte den vikt som
låg på stången**, och loggen är appens enda sanning: en logg som inte stämmer
med verkligheten förgiftar volym, belastning och progression.

`roundInc` snäpper nu till `Math.round(w * 4) / 4`, och `formatWeight` skriver
talet utan falska decimaler (61 → "61", 61,25 → "61,25", saknad vikt → "—").

**Två formaterare, och gränsen mellan dem är inte kosmetisk.** `formatWeight`
snäpper till 0,25 och används på vikt man LÄGGER PÅ — set, arbetsvikter,
progressionsförslag, uppskattade 1RM, stegknapparna. `formatKg` avrundar INTE
och används på MÄTNINGAR — kroppsvikt, fettfri massa, fettmassa,
viktförändring. Kör man en kroppsvikt genom `formatWeight` blir 82,4 till 82,5,
alltså en siffra användaren aldrig vägde. Fyra testfall låser fast skillnaden,
ett av dem genom att visa vad `formatWeight` *hade* gjort med samma tal.

**Volymen räknas exakt och formateras vid kanten.** `sessionVolume` avrundar
inte — trender och jämförelser mellan pass behöver upplösningen, och ett
avrundat mellanled förstör information som inte går att få tillbaka. Sedan
vikterna ligger på 0,25-rastret kan en volym mycket väl bli 428,75 (61,25 × 7),
och utan `formatVolume` hade det talet nått skärmen med punkt. Avrundningen till
hela kilon och den svenska tusentalsavgränsaren bor i formateraren, och samtliga
volymutskrifter i alla tre målen går genom den.

Båda är svepta genom **alla tre målen**: desktop (`features/training`,
`features/progress`, `features/profile`, `features/ai-coach`), mobilen
(`MobileApp.jsx`) och 2.0. Även desktopappens `Stepper` i `components/common`
kvantiserar nu till 0,25 för `unit="kg"` — den körde `toFixed(2)` på varje
tryck, samma ackumulering som 2.0 hade, bara långsammare. Andra enheter
(sekunder, gram, minuter, reps) rörs inte.
Progressionen blir inte finkornigare av det: golvet i `progressionSuggestion`
är fortfarande det vanliga steget (2,5 eller 1,25 kg beroende på övning), och
taket 10 %/pass. Steglängden i passvyn byts genom att **trycka på siffran**
(2,5 → 1,25 → 0,25 → 2,5) — en egen knapp under enheten sköt passvyn 33 px
över skärmkanten på en iPhone SE. `roundInc` är delad, så bytet gäller alla
tre byggmålen; demodatans vikter räknas om med samma raster.

**Sport och cardio loggas.** `SportView` täpper till den största luckan mot
gamla appen: sprang man en mil visste 2.0 ingenting, och readiness låg kvar för
högt. Mottagarsidan var redan byggd — `bodyState` kör `computeSystemicFatigue`
och drar av upp till 18 poäng (`cardioPenalty`), och `muscleLoads` färgar
kartan. Vyn lägger till vägen in: 94 aktiviteter i tio kategorier ur
`sportLibrary.js`, minuter, intensitet och HIIT, med **förhandsvisning av
belastningen INNAN passet sparas**. Lasten räknas av `computeSportLoad` och
`computeCardioLoad` — ingen egen matematik i vyn.

Passet går genom `buildSession` som alla andra: `sport: true`,
`source: "sport"`, **inga sets**, plus `minutes`. Utan `buildSession` saknar
posten `id` och v3-backupen tappar den. `minutes` är ett tillägg mot gamla
appens form, med flit — den sparar inte tiden, och att räkna baklänges ur
`cardioLoad` hade krävt intensitet och cardio-faktor som inte heller sparas.

**Distans loggas på de pass där den betyder något.** Fältet dyker upp för 23
aktiviteter — löpning, cykling, simning, rodd, skidor, och maskinerna (man
springer lika långt på ett löpband). Vilka det är står i **datan**
(`DISTANS_SPORTER` i `sportLibrary.js`), inte som ett villkor i vyn: kategorin
duger inte som filter, eftersom segling ligger i samma grupp som simning och
curling i samma som längdskidåkning. Fältet är valfritt och sparas bara när det
fyllts i — `distanceKm` finns inte alls på ett pass utan distans, ingen tyst
nolla. Tempot (min/km) räknas när både distans och tid finns, och påstås inte
annars.

**Distansen påverkar INTE belastningen**, och ett testfall låser fast det.
`cardioLoad` räknas ur tid och intensitet; att låta kilometer styra hade krävt
en modell för hur snabbt just den här personen springer — en gissning förklädd
till mätning. Distansen loggas för att den är sann.

Två fällor som testerna bevakar: `DISTANS_SPORTER` innehåller **biblioteks-id:n**
men vyn frågar på `resolveActivity(...).libId || .id`, så appens egna
cardio-poster går via `LEGACY_MAP` (`lopning` → `running`). Pekar mappningen
fel dyker fältet aldrig upp för löpning, och en kontroll enbart mot
`SPORT_META` hade förblivit grön.

Logiken bor i **`src/data/sportDistans.js`**, som är handskriven. Den låg en
period sist i `sportLibrary.js` — en fil vars egen första rad säger *Genererad
från master-library v1*. Nästa generering hade raderat både listan och
tempoberäkningen tyst. `sportLibrary.js` bär nu en varning i huvudet, och två
testfall låser fast det: att den inte exporterar distanslogiken, och att
varningen står kvar **inom filens första 600 tecken** — en varning längst ner
läser ingen.

Ärligheten följer med: aktiviteter utan detaljmodell (`fromLibrary`) märks som
**kategoriestimat** i klartext, och **kalorier uppskattas aldrig** — appen har
ingen energimodell för aktivitet, och en gissad siffra vore värre än ingen.
`DoneView` och `ProgressView` tål frånvaron av set och visar kondition och
minuter i stället för "0 set".

**Livsmedelssökningen har en egen motor.** `engines/foodSearch.js` — ordgräns,
rangordning och vardagsord. `FoodView` sökte tidigare med rå
`name.includes(q)`, vilket matchar inuti ord: "läsk" gav Fläskfilé och "fil"
gav Kycklingfilé. Den som loggade fil fick kyckling. Nu väger ordbörjan tyngre
än mitt-i-ordet, och kort namn tyngre än långt — den korta posten är
grundvaran. `FOOD_SYNONYMS` översätter vardagsord (fralla, macka, läsk) till
registrets ord, och **vyn skriver ut att den gjort det** ("Visar träffar för
…"), annars ser det ut som magi och användaren lär sig aldrig vad banken heter.

**Textloggen räknar ord, inte teckenföljder.** `estimateMeal` matchade
tidigare med `includes`, vilket gav systematiska dubbelräkningar: "filmjölk"
träffade ÖL (150 kcal öl i frukosten) och MJÖLK, "potatismos" träffade både
potatismos och potatis. Nu matchas ord för ord, och när flera komponenter gör
anspråk på samma ord vinner **längsta nyckelordet** — potatismos slår potatis.
Flerordiga nyckelord ("protein shake") kan inte ordmatchas och jämförs som
förut. Ändringen ligger i `index.js` och gäller därför **alla tre byggmålen**.

`FOOD_KB` utökades från 32 till 64 komponenter efter riktig användning:
"fralla med ost och skinka" gav bara ost. Siffrorna är uträknade ur
Livsmedelsverkets data i `FOOD_INDEX` — (post per 100 g) × (typisk portion) —
och varje rad namnger sin källpost i en kommentar, så talen går att spåra och
räkna om när banken uppdateras. `engines/mealSuggest.js` föreslår måltider.

Sökningen klarar också **sammanskrivning**: svenskan tillåter både "pytt i
panna" och "pyttipanna", och registret har valt den ena medan folk skriver den
andra. Jämförelsen görs med `startsWith`, **aldrig `includes`** — annars
återuppstår exakt felet som gav "läsk" → Fläskfilé, eftersom "fläskfilé"
innehåller "läsk". Minst fyra tecken krävs, så korta ord inte börjar träffa
allt.

**Det steget är taget: EN sökning, i motorn.** `engines/foodSearch.js` var en
andra implementation vid sidan av motorns `searchFoods`. Den är borttagen och
beteendet bor nu i `scoreFood`, som dessutom var bättre byggd — ordets plats i
namnet väger (Ost före "Paj m. ost"), synonymer via `FOOD_SYN`, svensk stamning
så "frallor" hittar fralla, och stavfelstolerans. Alla tre byggmålen delar den.

`__tests__/food-search.test.js` täcker bara ORDGRÄNSEN — de tre fall som
startade arbetet: läsk får inte ge Fläskfilé, fil inte Kycklingfilé, korv inte
Korvbröd. Den filen låg tidigare bredvid den raderade motorn och skyddet hade
försvunnit med den. Sökningens övriga egenskaper täcks av `meal-parts.test.js`.

**Två mekaniska skydd — de förlitar sig inte på uppmärksamhet.**

- **`scripts/kontrollera-testskydd.mjs`** körs i CI före testerna och jämför
  antalet testfall mot golvet i `scripts/testgolv.json`. En grön svit bevisar
  att det som testas fungerar, men säger ingenting om vad som SLUTAT testas —
  och regressionsskyddet för ordgränsen raderades två gånger utan att något
  blev rött. Kontrollen förbjuder inte borttagning: golvet ska sänkas i samma
  commit med skäl. Skillnaden är mellan ett beslut och en olycka.
- **`__tests__/data-integritet.test.js`** letar tomma platser i datamodulernas
  arrayer. `FOOD_KB` bar ett hål efter ett `},,` — `length` sa 65 mot 64
  verkliga poster. `forEach` och `filter` hoppar över hål, vilket råkade vara
  precis de metoder koden använde, så sviten var grön. `for...of` hade gett
  `undefined`. Hålet återinfördes dessutom en gång efter att det rättats,
  genom att filen togs i sin helhet från en gren som saknade fixen.

**Streckkodsläsare i 2.0.** `Streckkod.jsx` — motorn `lookupBarcode` fanns
redan och slår upp produkten hos Open Food Facts. Två saker är värda att veta:

- **Källan visas som rubrik, inte som finstil.** Open Food Facts är
  folkbidragen och overifierad, och en produkt kan bära vad som helst. Träffen
  märks "Open Food Facts · overifierad" och loggposten märks som EXTERN, inte
  som registerdata ur Livsmedelsverket. Okänd produkt erkänns i stället för att
  gissa, och nätverksfel behandlas som okänd produkt — inte som krasch.
- **Manuell inmatning finns ALLTID.** `BarcodeDetector` finns i Chrome på
  Android men inte i Safari på iOS, så kameravägen får aldrig vara den enda.
  Skanningen ersätter loggvyn medan den pågår i stället för att ligga i ett ark
  ovanpå — kameran ska inte kunna bli kvar bakom något annat — och strömmen
  stängs vid unmount.

**Referensfixturen `reference.json` är medvetet ändrad** (2026-07-27): "Abborre
rå" och "Abborre filé panerad stekt" har bytt plats, eftersom sökningen numera
rankar ner råvaror — i en matlogg har man nästan alltid ätit maten tillagad.
Fixturen speglar det nya, korrekta beteendet. Ändra den ALDRIG för att få ett
test grönt utan att skälet skrivs in på samma sätt.

**Matakuten och meal prep.** `RescueView` kopplar in den befintliga motorn
(`RESCUE_SITUATIONS`, `interpretCrisis`, `recentIntakeSummary`, `buildRescue`);
tonläget bor i `profile.nutStyle`. `MealPrepView` bygger veckomeny och
inköpslista ur `engines/recipes.js` med kostval och variationsspärr.

**Rätta och radera pass.** Motorn kunde det redan (`updateSet`, `deleteSet`,
`recomputeSession`); det som saknades var en väg dit. `ProgressView` listar
loggade pass (senaste först, åtta i taget) och öppnar `SessionSheet`: rätta
vikt/reps, ta bort enskilda set, ta bort hela passet med bekräftelse i två steg.
Volym och last räknas om medan man skriver, så konsekvensen syns före Spara.
Omräkningen använder passets egen `bodyweightAtLog`, inte dagens vikt — att
räkna om ett gammalt pass med ny kroppsvikt vore att skriva om historien.
Radering är permanent; inget skuggregister.

`engines/session.js` har fyra exports till: `touchSession`, `replaceSession`,
`removeSession`, `sessionHasLoad`. **`touchSession` finns av synkskäl:**
stämplingen i `store.js` fyller bara fält som SAKNAS (idempotent med flit), så
en redigerad post hade behållit sin gamla `updatedAt` och tyst tappats mot en
äldre kopia i en framtida last-write-wins-merge. `id` rörs aldrig — synken ska
se en ÄNDRING, inte radering plus ny post.

**Varför-frågan.** `DoneView` kör `buildPostSession` och visar
sammanfattningen plus högst EN fråga, med "Hoppa över" alltid tillgängligt.
Svaret sparas med `attachReason` på passet. `CoachView` visar `reasonSignal`
när mönster finns (motorn kräver ≥3 svar inom 21 dagar). Signalen styr ännu
inte progression eller readiness-tillit — det rör `facts.js` och är eget steg.

**Backup av v3-datan.** `backup2.js` (`buildV3Backup`, `v3BackupFilename`,
`inspectV3Backup`, `restoreV3Backup`) ger hela v3-lagringen som en JSON-fil.
`ImportSheet` har en "Datasäkerhet"-sektion för att spara och läsa in filen,
och ett granskningssteg som ALLTID visar innehållet innan något skrivs.

**PWA:** `vite.atlas2.config.js` emitterar `sw-atlas2.js` och
`atlas2.webmanifest` som riktiga filer. Service workers får enligt spec inte
registreras från blob:-adresser. Dokument hämtas network-first **med
`{ cache: "no-cache" }`** (revalidering, kringgår GitHub Pages 10-min HTTP-cache
så en ny publicering slår igenom utan hård omladdning); allt annat cache-first
för offlinestöd. Cachenamn `atlas2-<byggtid>`, gamla rensas vid `activate`.
Ikoner: `atlas-icon-192.png`, `-512.webp`, `-512-mask.webp` i `public/`, delade
med **landningssidan** — inte med mobilen. Mobilen bäddar in en egen
base64-ikon i `mobile.html` och har ingen manifest-ikon. Android-skalet har
dessutom helt egna `ic_launcher.png` i `android-app/res/mipmap-*`; ett byte i
`public/` når varken mobilen eller den installerade appen.

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
muskellast. Formeln räknas numera på **ett** ställe: `facts.js`
(`kropp.readiness`). `App.jsx` och `MobileApp.jsx` läser den därifrån i stället
för att räkna parallellt, så talet kan inte driva isär mellan vyerna.

**LLM-vägen (BYOK) är grundad i §13 — input grundad, output grindad.** Den valfria
språkmodell-coachen (egen Claude-nyckel, `app/llm.js`; DESKTOP-only — 2.0 och
mobilen kör bara `coachReply`) bygger sin prompt ur `buildCoachFacts`: readiness,
träning, vikt, kost, program och målresa kommer ur facts-blocken, var och en med
sin **per-block-tillit**. Är tilliten svag/ingen skrivs `OBS: TUNT UNDERLAG` UT i
kontexten — modellen ärver samma ärlighetsgrind som den deterministiska vägen.
`goalReasoning`s recomp-mix är fortfarande ctx-grundad men flaggas EXPLICIT som
`goal_recomp_EJ_FACTS` — ett **medvetet undantag, inte en glömska**; gränsen
facts/ej-facts är synlig för modellen.

Modellens SVAR grindas sedan mot samma kontext av `unverifiedNumbers`. Designbeslut
värda att bevara:
- Bara **riskenheter** granskas (`%`, `kg`, `kcal`, `g protein`) — exakt det
  ärlighetsregeln skyddar. Tal utan riskenhet rörs aldrig, så veckodagar, set,
  reps, klockslag och årtal ger inga falsklarm. Allowlist = alla tal i kontexten
  (kunskapscitaten via `SL()` ligger där → automatiskt tillåtna).
- **Rundningstolerans**: "runt 82 kg" godkänns mot facts 81,7.
- Svaret **tystas aldrig** — det visas alltid, med en synlig varningsrad om något
  inte kunde stämmas av. Trubbig detektion + oförstörande åtgärd = aldrig tyst på
  falsklarm, aldrig tyst släpp.

Principen: **input grundad, output grindad — i den ordningen.** En utdata-grind mot
en ostädad kontext går inte att kalibrera; allowlisten är meningsfull först när
kontexten är facts-grundad. Därför §13-grundningen (input) före grinden (output).

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

**Java har ingen byggkontroll i repot** — skalet kompileras bara på en maskin
med Android SDK och signeringsnyckel, så ett fel syns först i en APK på en
telefon. `src/__tests__/android-skal.test.js` bevakar därför de två regler som
kostat tid: inga anonyma inre klasser (d8-fällan nedan) och att `RECORD_AUDIO`
faktiskt begärs i körtid, inte bara deklareras i manifestet. Testet läser
dessutom `--target-sdk-version` ur `BYGG.md` och larmar om den faller under 23,
för då gäller inte resonemanget längre.

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

**PR:en testas FÖRE merge sedan 2026-07-27.** Flödet kördes tidigare bara vid
push till `main`, alltså mergades varje PR otestad av automatik och rött
upptäcktes först när det redan låg i main. `pull_request`-utlösaren kör hela
bygg-jobbet — tester, alla tre målen, hopsättning och verifiering — men
**publiceringen är spärrad** (`if: github.event_name != 'pull_request'` på både
artefaktuppladdningen och `deploy`-jobbet). Utan den spärren hade en PR kunnat
publicera sin egen kod till den adress Android-skalet pekar på. PR-körningar får
dessutom en egen concurrency-grupp per PR, så en testkörning aldrig köar bakom
en publicering; inom en PR avbryter en ny push den förra körningen.

Flödet kör `npm ci`, `npm test` (upp till tre försök så att den kända
`p5-realmode`-flakigheten inte blockerar en korrekt publicering; rött i alla tre
stoppar deployen), bygger alla tre målen, sätter samman sajten i CI, skriver
`.nojekyll` och publicerar via `actions/deploy-pages`. **`docs/` checkas inte
längre in** — den byggs från noll i CI. Ett verifieringssteg kräver att
receptbilderna är 134 (samma som `src/assets/recipes/`); färre stoppar
publiceringen (då har `import.meta.glob` missat filer).

**Bildtäckningen är 140 recept, inte 134.** Filerna är 134, men `PHOTO_ALIASES`
i `features/recipes/index.jsx` pekar ytterligare sex recept mot en befintlig
bild där rätten i praktiken är densamma (dubbletter som äpple + mandlar, eller
räkpasta som återanvänder bowl-bilden). Räkna alltså **filer + alias** innan
nya bilder beställs — annars genereras bilder som redan finns.

Sajtens rot: `index.html` (landning, källa `atlas-app/landing/`), `app.html`
(desktop), `mobile.html` + `sw.js`, `atlas2.html` + `sw-atlas2.js` +
`atlas2.webmanifest`, `test.html` (testarsidan, källa `atlas-app/landing/`),
receptbilder, `public/`-assets, `TESTARE.md`, `.nojekyll`.
**Adressen får inte ändras** — Android-skalet har `…/Atlas/atlas2.html`
hårdkodad. De döda TWA-resterna `manifest.webmanifest` och
`.well-known/assetlinks.json` (paket `com.atlas.twa`) togs bort.

Den gamla handbyggda `docs/` **är borttagen** — Actions bygger sajten från noll.

**Testarsidan** (`landing/test.html`) är självbärande HTML med inline CSS och JS
utanför byggena, precis som landningssidan. Instruktion plus ifyllbar
svarsblankett: svaren serialiseras till ett textblock, och **urklipp är primär
väg** (`navigator.clipboard.writeText` med `execCommand`-fallback) eftersom
mailto med lång body kapas av många mobilklienter — mailto ligger som sekundär
knapp. `@media print` ger svart på vitt med knapparna dolda och textareas som
växer, så sidan kan sparas som PDF ur webbläsaren i stället för att underhållas
som separat fil. Landningssidan länkar dit diskret i foten. Verifieringssteget i
deployen kräver att `test.html` finns; försvinner den stoppas publiceringen.

**Landningssidan har en egen palett.** Den är handskriven HTML utanför
React-bygget, så `design.js` når den inte och regeln "en hårdkodad hex utanför
design.js är en bugg" kan inte gälla där. Tokens från brand guide v1.1 ligger
därför i `:root` i filen. **Det är kodbasens enda kända dubblering — ändras
`design.js` måste listan i `landing/index.html` ändras i samma commit.**
Desktopbrytpunkt vid 900 px: hjältebild och text bredvid varandra, tvåspaltig
färgnyckel, tre kort.

## Leverans

Artefakter till `/mnt/user-data/outputs/`, källa zippas exklusive
`node_modules/`, `dist*/`, `.git/`, cache. Tidsstämplade filnamn i svensk tid
(`TZ=Europe/Stockholm date +%Y-%m-%d-%H%M`).

### Arbetsdelningen mellan repo- och molnsession

**Deployverifieringen ligger hos MOLNET** (beslutat 2026-07-27). Repo-sessionens
nätverkspolicy nekar `robertekholm68-lab.github.io` — proxyn svarar 403 på
CONNECT — så härifrån går bara deployens **slutstatus** att läsa. Molnet kan
hämta den publicerade filen och köra den. Skriv aldrig "verifierat mot sajten"
utifrån en grön deploy; det är två olika påståenden.

**Utkastmarkering av en PR går bara via GraphQL.** Är den kvoten slut medan REST
fortfarande svarar: använd **Repository Merge API** (`POST /repos/{o}/{r}/merges`)
i stället — GitHub stänger PR:en som merged automatiskt. Ett utkast går annars
inte att merga alls (`405 Pull Request is still a draft`).

**Molnpaketen innehåller ALDRIG `current-build.md`.** Se rubriken överst.
**CI-steg i `.github/workflows/` läggs till av repo-sessionen** — molnets token
saknar workflow-scope, och den gränsen ska inte vidgas.

Verifiering: headless Chromium / vitest framför visuell läsning.

**Askr 2.0:s DOM-skript — TIO stycken, 155 OK-steg** (alla körda 2026-07-27,
exit 0, inga page errors):

| Skript i `scripts/` | Steg | Täcker |
|---|---|---|
| `verify-atlas2-sport.mjs` | 35 | sportloggning, distans, lagring med id, readiness |
| `verify-atlas2-layout.mjs` | 24 | tre bredder: SE, iPhone 14, desktop |
| `verify-atlas2-passredigering.mjs` | 16 | rätta/radera pass, varför-frågan |
| `verify-atlas2.mjs` | 19 | näringsmål, snabblogg, coachchatten, persistens |
| `verify-atlas2-tillskott.mjs` | 11 | kryssrutor, streak, följsamhet |
| `verify-atlas2-matakut.mjs` | 11 | Rädda måltiden |
| `verify-atlas2-mealprep.mjs` | 10 | veckomeny, inköpslista |
| `verify-atlas2-readiness.mjs` | 9 | readiness-arket, tunt underlag |
| `verify-atlas2-pass.mjs` | 14 | röstknappen + viktrastret i pågående pass |
| `verify-atlas2-backup.mjs` | 6 | v3-backup: export, granska, ersätt |

**Kör ALLA tio vid regression, inte ett urval.** `verify-atlas2.mjs` hade
slutat fungera helt (0 OK) utan att någon märkte det: matvyns knapp bytte namn
från "Logga mat" till "Logga måltid" när matakuten byggdes, och skriptet ingick
inte i de rundor som kördes. Ett skript som inte körs skyddar ingenting.

De körs medvetet inte av test/bygge — de kräver `npm i --no-save
playwright-core` och en byggd `dist-atlas2/`. Samtliga hittar webbläsaren via
`chromiumBin()`: `PW_CHROMIUM` först, sedan de raka
sökvägarna, annars letas revisionskatalogen upp. **Hårdkoda aldrig
`/opt/pw-browsers/chromium`** — den finns inte i alla containrar, och skripten
dör direkt vid start när den saknas.
**Fallgrop:** matcha alltid skiftlägesokänsligt mot knapptexter — `hdr()`
versaliserar via CSS, och `innerText` returnerar den versaliserade texten. Det
har gett falska larm om trasiga vyer minst fyra gånger.

## Backlog

**Askr 2.0 — klart:** startsida, lägesval, hem med anatomisk karta,
bottennavigering, pågående pass med riktig loggning, kvitto, programväljare,
matvy (översikt/logga/recept), coachvy med skäl, framstegsvy, historikimport,
muskeldetaljvy, målresa, installerbar PWA med offlinestöd, rätta och radera
loggade pass, varför-frågan efter passet, backup-fil för v3-datan,
skrivbordslayout med sidopanel, förklarbart readiness-ark, matakuten,
meal prep med veckomeny och inköpslista, dagliga tillskott,
händelsedrivna påminnelser, varför-svar som styr progression och tillit,
och sport- och cardiologgning.
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

**Askr 2.0 — AVGJORT, återuppta inte:**
- **Coachen får scrolla.** Endast Hem, Pass och Mat står i layoutskriptets
  `MÅSTE_RYMMAS`. Framsteg är en historiklista och ska scrolla; kvittot växer
  med antalet övningar och lovas inte scrollfritt; coachen bär rekommendation,
  skäl, målresa, chattingång och ärlighetsrad — mer än en 667 px-skärm rymmer,
  och det är rätt. Vyn trimmades ändå från +99 till +17 px (#44) genom att ta
  bort luft och en hälsning som upprepade rubriken, men **posten var redan
  struken när det gjordes** — bygget skedde mot en inaktuell backlogg. Det är
  varför den här filen är enda källan.
- **Rösten i WebView är en återvändsgränd — bryggan går runt den.** Beslutat
  2026-07-27, i två steg.

  **Först diagnosen.** Bevisen kom från telefon i tre lager: behörigheten
  **beviljad**, ingen annan app spelade in, och **Androids egen
  mikrofonhistorik listade inte Askr alls** trots att knappen just tryckts.
  Inspelningen nådde alltså aldrig operativsystemet. `NotReadableError` var
  WebViewens sätt att säga att den inte fick öppna hårdvaran — inte att någon
  annan höll den. Felet ligger under vår kod och går inte att laga i JavaScript.

  **Sedan beslutet.** Posten var först ett medvetet nej — rösten hör till
  webbläsaren, en native brygga är ett eget projekt. Det beslutet är **omprövat
  samma dag**: mikrofonen är en kärnfunktion i en app man använder med händerna
  upptagna, och bryggan visade sig vara avgränsad nog att bära. Skalet exponerar
  Androids egen `SpeechRecognizer` som `window.AskrNative` (`AskrVoice.java`),
  och `NativRecognition` i `voice.js` härmar webbläsarens `SpeechRecognition`
  — `lang`, `start`, `stop`, `onresult`, `onerror`, `onend`.

  **Därför är tolkningen oförändrad.** `parseSetSpeech` och all felhantering
  nedanför rörs inte; bara ordens ursprung skiljer. En andra väg genom koden
  hade gett två uppsättningar regler för samma sak, som glider isär.

  Detaljer värda att minnas:

  · `micReady` hoppas över på den nativa vägen. Att fråga `getUserMedia` först
    vore att kontrollera en dörr vi inte tänker gå igenom — och det är just den
    dörren som är låst.
  · `hasNativeVoice()` **memoiseras**. `tillgänglig()` är ett synkront anrop
    över JS↔Java-bryggan som gör `SpeechRecognizer.isRecognitionAvailable()`,
    alltså ett processhopp. `voiceSupport()` anropas vid rendering — utan minne
    blir det ett binder-anrop per omritning mitt i ett pass.
  · Adressen kontrolleras i Java före varje start. En `JavascriptInterface` är
    öppen för varje sida som laddas; navigeringen är redan låst i
    `AtlasWebViewClient`, men ett lager till kostar ingenting.
  · **Faller tillbaka på webbläsaren** när bryggan saknas eller enheten inte har
    taligenkänning. Chrome, Samsung Browser och desktop påverkas inte alls —
    `hasNativeVoice()` är falsk överallt utom i skalet.

  **EJ VERIFIERAD PÅ TELEFON.** JS-sidan körs mot en simulerad Java-sida i
  testerna, men bara riktig hårdvara visar att `SpeechRecognizer` svarar. Och
  **den här deployen räcker inte** — JS-sidan gör ingenting utan `AskrNative`,
  som bara finns i en nybyggd APK. Kräver signeringsnyckeln.

  **Vägen som fungerar redan idag, utan APK:** installera PWA:n från **Samsung
  Browser**. Rösten fungerade där på testtelefonen — men inte i Chrome, tvärtemot
  vad den gamla texten påstod. Då får man ikon på hemskärmen OCH röstloggning.

**Askr 2.0 — kvar:**
- Koppla nuvarande appens coach till `engines/facts.js` — klart för kropp,
  träning, vikt, målresa, kost och program (siffror + per-block-tillit ur §13).
  Kvar: BARA mål-grenens recomp-resonemang (`goalReasoning`) — en egen sak från
  programförslagen (`analyzeProgram`, nu i `facts.program`).
- **Redigera passets datum eller titel** är medvetet utelämnat: att flytta ett
  pass i tiden ändrar hela recovery-kurvan och behöver ett eget beslut. Att
  lägga TILL ett set i ett sparat pass saknas också — bara rätta och ta bort
  finns.
- Knowledge-banken till coachen, så råd kan motiveras med källa via `SL()`.
- LLM-coach (BYOK, desktop): **grundad i §13 + utdata-grindad** (se "Coachens
  faktakälla"). Grunden är byggd; en mer proaktiv/måldriven coaching ovanpå
  målresan är kvar om det önskas.
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

**BLOCKERAT (utanför repot) — inte beslutat bort:**

Följande är BYGGT och ligger i repot. Det som saknas är ett APK-bygge, och det
går inte att göra härifrån: **signeringsnyckeln ligger medvetet utanför repot.**
Utan exakt samma nyckel går appen inte att uppdatera — en ny nyckel tvingar
avinstallation och all data i skalet försvinner.

*Låses upp av: signeringsnyckeln + en riktig telefon + `adb`.* Se
`android-app/BYGG.md`; kräver **JDK 17** (d8 i build-tools 34 kraschar under
JDK 21).

- **App-ikonerna i Android-skalet.** Filerna ÄR bytta — alla fem
  `ic_launcher.png` i `android-app/res/mipmap-*` (`b133ef0`), och
  `android:label` är redan `Askr`. De slår igenom först i en ny APK. En
  installerad app visar alltså fortfarande den gamla ikonen tills dess.
- **Mikrofonspåret är AVSLUTAT, inte blockerat.** Flyttat till *AVGJORT* ovan
  2026-07-27: rösten i app-skalet är ett medvetet nej, inte en bugg som väntar
  på en telefon. Behörighetsdelen löstes och bevisades (`RECORD_AUDIO` begärs i
  körtid sedan `MainActivity` fick `requestPermissions`), men WebView når ändå
  aldrig hårdvaran. Det ligger under vår kod.

  **Byggutdata hör inte hemma i repot.** `android-app/build/` är ignorerad sedan
  ett molnpaket bar in en hel byggkatalog. Värst var en **debugsignerad APK**:
  Android vägrar installera över en app signerad med den riktiga nyckeln, så den
  som provar filen tvingas avinstallera och förlorar all loggad träning i
  skalet.

  Vad som gjorts härifrån och gäller framåt: skalet kompilerar rent
  (`javac --release 17` mot handskrivna API-stubbar, eftersom Android SDK
  saknas), inga anonyma inre klasser har tillkommit, och `android-skal.test.js`
  bevakar reglerna.

**Namnbytet — kvar:**
- **Paket-ID `se.atlas.app`.** Inte blockerat utan MEDVETET obytt: ett byte
  till `body.askr.app` gör att Android ser en ny app, kräver avinstallation och
  raderar data i skalet. Etiketten är redan bytt.
- `bildbank.md` och skill-filerna säger fortfarande ATLAS.
- @ATLAS-karaktären i bildpipelinen.
- Repo-namn och domän (vänta på `askr.body`, se ovan).

**Nuvarande appen:**
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
- **Ett anrop utan import kraschar först när någon klickar sig dit.**
  `features/training` anropade `lastSessionSets(...)` utan att importera den.
  En fri identifierare är fullt giltig JavaScript till körtid, så **bygget
  buntade utan att knota och sviten monterar inte varje vy** — men desktoppens
  träningsläge kraschade hela sidan så snart man valde en övning, uppfångat av
  felgränsen som "Något gick fel". Vägen till viktstegaren var helt blockerad,
  troligen sedan `copyLast` byggdes. `import-integritet.test.js` läser motorns
  exportlista och kräver att varje anropat namn också är importerat.
  *Skyddet hade själv ett hål först:* det blankade mallsträngar för att slippa
  falska larm från JSDoc — men `${...}` innehåller körbar kod, och där bor
  merparten av vyernas kg-utskrifter. Fem riktiga fall var osynliga. Blanka
  kommentarer, inte mallsträngar.
- **En grön svit räcker inte — kör alltid bygget.** Alla 870 testfall var gröna
  medan atlas2-bygget dog på `tempoPerKm is not exported`: en trasig import i en
  komponent som ingen testfixtur monterar syns bara i buntningen. Därför kör
  `pull_request`-flödet steget *Bygg alla tre målen*, inte bara testerna.
- **Ett urval är inte en helhet.** `grep | head` vid en refaktorering visar de
  första träffarna, inte alla — en importör utanför avkortningen blir kvar och
  faller först i bygget. Räkna träffarna innan du börjar ändra.
- **`processLocally` kräver ett SPRÅKPAKET, inte bara egenskapen.** Röstknappen
  slocknade direkt i Samsung Browser. Koden satte `rec.processLocally = true`
  för att rösten skulle fungera utan täckning i en gymkällare — men kravet
  gäller ett nedladdat språkpaket, och saknas svenskan **vägrar motorn med
  `language-not-supported` i stället för att gå över nätet**. Den faller inte
  tillbaka av sig själv. Kommentaren sa "be om lokal bearbetning där den finns";
  koden frågade om EGENSKAPEN fanns, aldrig om SPRÅKET fanns. Nu görs ett
  omförsök utan kravet, och hanterarna kopplas om till den nya igenkännaren —
  glöms det steget lyssnar ingen på svaret.
- **Kasta aldrig felkoden.** Taligenkänningens `onerror` översatte fyra kända
  koder och lät alla andra bli "Det gick inte att tolka ljudet." Texten LÄT som
  att användaren sagt något otydligt, men mikrofonen hade troligen aldrig
  öppnats — och koden som förklarat varför fanns bara i minnet på en telefon.
  Tredje gången samma feltyp på ett dygn (behörigheten, "upptagen av något
  annat", ljudet): en gren som inte vet vad som är fel men uttalar sig bestämt.
  Koden skrivs nu alltid ut, och `felText()` är gemensam för set och diktering —
  de dubblerade grenarna hade redan glidit isär.
- **En kontroll bakom ett villkor körs kanske aldrig.** `verify-atlas2.mjs`
  hade `if (chip) await kolla(...)` för coachens kostsvar. Chatten är hopfälld
  från start, alltså fanns chipet aldrig, alltså kördes steget aldrig — och
  utskriften såg likadan ut som en kodbas utan fel. Samma sak i småformat:
  `if (!r) return` i ett testfall. Kontrollera hellre att förutsättningen
  gäller än att hoppa över tyst.
- **Ett verifieringssteg kan peka på fel vy och ändå bli grönt.** `App2` renderar
  `if (klart) return <DoneView/>` FÖRE fliklogiken, så ett klick i bottennavet
  gör ingenting medan kvittot ligger uppe. `verify-atlas2-sport.mjs` klickade
  "Framsteg" direkt efter ett loggat pass och mätte sedan kvittot i tron att
  det var framstegsvyn — två gröna rader i flera veckor. Kvittot säger också
  "Löpning" och "45 min", så assertionen kunde inte se skillnad. Stäng vyn
  explicit, och lägg ett steg som bevisar att navigeringen faktiskt skett.
- **`toFixed` i en loop ackumulerar fel.** Stegknappen i passvyn avrundade till
  en decimal vid varje tryck, så 61,25 blev 63,8 blev 66,3. Avrunda till
  rastret vid beräkningen (`Math.round(w * 4) / 4`) och formatera först vid
  utskrift — aldrig tvärtom. Fel som bara syns i siffran på skärmen är svårast
  att upptäcka: sviten var grön, och det var en människa på ett gym som såg det.
- **Testförorening:** omonterade React-rötter läcker mellan testfall.
  `p5-realmode` är instabil och faller ibland i full svit men är grön isolerat.
- **Hooks efter villkorad return** ger React error #310. Alla hooks först.
- **GitHub PAT:** fine-grained tokens kräver **Contents: Read and write**
  explicit. Token bäddas i URL:en och rensas direkt efter push.
- **Paletten låg på fyra ställen** (`data/tokens.js`, `styles/global.css`,
  mobilens `C`, gradienter i `App.jsx`) och en omfärgning missade två tyst.
  Därför ligger 2.0:s palett samlad i `atlas2/design.js`.
