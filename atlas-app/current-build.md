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

*Senast verifierad mot koden: 2026-09-13 (mot `04781c7`, #191). Alla siffror
nedan är avlästa ur källan, inte ihågkomna.*

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

## Aktuella siffror (avlästa 2026-09-13)

| Sak | Antal |
|---|---|
| Övningar | 160 |
| Maskintyper (`MACHINE_TYPES`) | 43 |
| Maskinmodeller (`MACHINE_MODELS`) | 67 |
| Maskinmärken (`MACHINE_BRANDS`) | 14 |
| Muskler (taxonomi) | 21 |
| Programmallar (`ALL_TEMPLATES`) | 31 (1 kurerad + 30 genererade) |
| Programfamiljer (`FAMILY_NAMES`) | 10 |
| Livsmedel, sökbara (`FOOD_INDEX`) | 2679 |
| — varav SLV-databasen | 2606 |
| — varav kuraterade | 73 |
| Recept | 276 |
| Recept med bild | 140 av 276 |
| Övningar med bild (`MED_BILD`) | 58 av 160 |
| Övningar med teknikpunkter (`TEKNIK_CUES`) | 87 av 160 |
| Kunskapsposter | 21 |
| Kosttillskott | 25 |
| Tester (vitest) | 1946 i 160 filer |
| DOM-skript | 18 |

**"Maskiner 124" var tre listor hopslagna.** Siffran stod så i den här filen
till 2026-08-26 och gick inte att härleda ur någon enskild export — den var
43 + 67 + 14. Uppdelad ovan, för ett tal ingen kan räkna fram ur koden är
ett tal ingen kan lita på.

**`FOOD_DB` är metadata, inte livsmedel.** Den bär källnamn, version och licens
för Livsmedelsverkets databas. Listan som söks är `FOOD_INDEX` — kuraterade
plus SLV. Att räkna `FOOD_DB` ger 10 och ser ut som ett svar.

Program **genereras**: familj × nivå × mål × utrustning × passlängd.
Sporter med cardio-load: innebandy, Muay Thai.

## Struktur

### `src/engines/` — rena funktioner
38 filer (räknade 2026-09-14). `index.js` (recovery, readiness,
rekommendation, nutrition, systemisk fatigue, dataConfidence,
formatterarna), `session.js`, `programs.js`, `goal.js`,
`mission.js`, `bodyfat.js`, `machines.js`, `coach-programs.js`, `recipes.js`,
`voice.js`, `post-session.js`, `geofence.js`, `nfc.js`, `hr.js`, `platform.js`,
`bridge.js`, `backup.js`, `cues.js`, `hr.js` (pulsband över BLE — sedan
2026-09-13 inkopplad i 2.0, inte bara i mobilkompanjonen), `nudges.js`
(händelsedrivna påminnelser),
`supplements.js` (följsamhet för dagliga tillskott).

Tillkomna i augusti: `facts.js` och `journey.js` (flyttade hit från `atlas2/`),
`coach-llm.js` (Claude via Vercel-proxy), `aiMat.js` (AI-uppskattning när
databasen saknar rätten), `fotoMaltid.js` och `fotoMaskin.js` (bild in,
identifiering ut — motorn räknar, användaren bekräftar), `skafferi.js` (egna
varor och favoritmat), `mealSuggest.js`, `deklaration.js` (näringsdeklaration
ur förpackning), `portioner` via `data/portions.js`, `intervju.js` (målintervjun),
`malplan.js` och `malprogram.js`, `profil.js`, `utveckling.js` (kropp och styrka
över tid, med Omron-import — och `epley1RM`, projektets enda 1RM-formel).

Tillkomna i september: `coachKommentar.js` (coachens rad under vilan i passet —
ren funktion, ett set in, en mening eller null ut) och `dagsbesked.js`
(hemvyns dagliga rad — flyttad hit från `store.js`, se "Hemvyns besked blev en
daglig rad").

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
Listan är avläst ur katalogen 2026-09-07, inte skriven ur minnet — den föregående
saknade femton filer.

*Grund:* `App2.jsx`, `main2.jsx`, `design.js` (alla visuella beslut på ett
ställe), `store.js` (async v3-lagring + härledda tillstånd + `sessionVolume` +
synk-form), `layout.js` (brytpunkt, dvh, navhöjd), `Nav.jsx`, `Shell.jsx`
(skrivbordsskal), `backnav.js` (OS-bakåtbeslut, rent), `backup2.js`,
`import.js` (historikimport), `body_regions.json`, `body_regions_female.json`.

*Kropp och träning:* `BodyMap2.jsx`, `MuskelgruppsVy.jsx`, `OvningsSida.jsx`,
`MuscleSheet.jsx`,
`MuscleSplit.jsx`, `muscleIcon.jsx`, `WorkoutView.jsx`, `SessionSheet.jsx`,
`ProgramSheet.jsx`, `CustomProgram.jsx`, `ExerciseBank.jsx`, `MachineGuide.jsx`,
`SkannaMaskin.jsx`, `SportView.jsx`, `ReadinessSheet.jsx`.

*Mat:* `FoodView.jsx`, `foodlog.js`, `NutritionSheet.jsx`, `MealPrepView.jsx`,
`RescueView.jsx`, `CustomRecipe.jsx`, `FotoMaltid.jsx`, `Streckkod.jsx`,
`SupplementsPanel.jsx`, `sokord.js`.

*Utveckling och profil:* `UtvecklingView.jsx` (fem underflikar), `Kroppsmatt.jsx`,
`ProgressView.jsx`, `GoalSheet.jsx`, `ProfileSheet.jsx`, `FeedbackSheet.jsx`,
`KnowledgeView.jsx`, `ImportSheet.jsx`.

*Coach:* `CoachView.jsx`, `CoachChat.jsx`.
`facts.js` och `journey.js` är numera bara återexport — de riktiga filerna
ligger i `engines/`.

**Två figurer i muskelkartan, samma region-id:n.** Profilens `sex` väljer figur
i `FIGURER` (`BodyMap2.jsx`): `m` → `body_regions.json` + `figur-{fram,bak}`,
`f` → `body_regions_female.json` + `figur-kvinna-{fram,bak}`. Saknas `sex` visas
mannen. `MAP`, `NAMN`, `regionState` och `MuscleSheet` är oförändrade, eftersom
regionerna heter likadant i båda — det är hela poängen med uppdelningen.

Figurerna har egna viewBox (mannen 547×1243, kvinnan 487×1243) eftersom
kropparna är olika breda, men **samma färgrecept**: konstanten `FOTO` i
`BodyMap2.jsx`, `color` 0,9/1 plus ett tunt `normal` 0,28/0,4.

Mannen bar `multiply` 0,62/0,78 så länge han var en ljus illustration. Den
figuren är utbytt mot ett fotorealistiskt foto av samma sort som kvinnan, och
receptet följde med: mot solbrun hud gör `multiply` grönt till oliv och rött
till "lite mörkare hud", varpå färgen slutar vara data. `normal`-lagret finns
för att sätet ska synas även under svarta shorts, där `color` inte kan lägga
någon nyans alls. Att BÅDA nu delar recept är poängen — en enda sorts underlag
betyder att ett färgbeslut gäller hela kartan.

Båda figurerna är spårade ur maskbilder med
`scripts/masker-till-regioner-kvinna.py` (potrace; könsneutralt trots namnet,
tredje argumentet `female`/`male` styr utfilernas namn). Maskerna ligger i
`maskbilder/{man,kvinna}/`. Lägg en ny mask och kör om skriptet i stället för
att handredigera JSON.

Två arbetsskript hör till: `normalisera-masker.py` (beskär och riktar in en
omgång masker mot basbilden) och `forhandsvisa-karta.py` (renderar kartan till
en bild för okulär granskning utan att bygga appen).

Tillkomna i augusti (43 filer totalt): `CustomProgram.jsx` (bygg eget program),
`CustomRecipe.jsx` (egna recept med beräknad näring), `ExerciseBank.jsx`,
`MachineGuide.jsx`, `SkannaMaskin.jsx`, `MuscleSplit.jsx` (muskelfördelning),
`muscleIcon.jsx` (kroppssiluett med primärmuskeln markerad — miniatyren för
alla 160 övningar, till skillnad från fotona i `MED_BILD`), `KnowledgeView.jsx`,
`ProfileSheet.jsx`, `UtvecklingView.jsx`, `FotoMaltid.jsx`, `Streckkod.jsx`,
`sokord.js` (mängdord och synonymer i matsöket).

**Två skal, en uppsättning vyer.** Under brytpunkten (`layout.js`) bottennav,
över den `Shell.jsx` med sidopanel och ark som centrerade modaler. Vyerna
forkas INTE — de får veta hur brett de har och möblerar därefter. `FLIKAR`
bryts ut ur `Nav.jsx` och läses av båda skalen, så navigeringen inte kan glida
isär. Kartan har ingen fast höjd: vyerna är flex-kolumner där kartan är
`flex: 1` med `minHeight: 0`, så webbläsaren räknar. Mätt 2026-08-26: 245 px på
iPhone SE, 422 på iPhone 14, 666 på desktop — kroppen är gränssnittet, alltså
får kroppen ytan som blir
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

**TWA:n är skriven — `android-twa/` — och ersätter skalet när den är
verifierad på telefon.** Skälet är pulsbandet: WebView saknar Web Bluetooth
och kan aldrig para ett band; en Trusted Web Activity ÄR Chrome som app och
kan det, liksom mikrofon utan brygga och notiser. Ingen egen Java —
`LauncherActivity` ur android-browser-helper öppnar samma adress som skalet
hade hårdkodad. Samma paket-id (`se.atlas.app`) och samma nyckel, så den
installeras ÖVER skalet utan avinstallation; `versionCode` 2.

Det gamla skälet att välja bort TWA — `assetlinks.json` "tillhör ett annat
repo" — höll inte: roten `robertekholm68-lab.github.io` serveras av ett repo
med exakt det namnet, som Robert kan skapa. Filen ligger färdig i
`android-twa/assetlinks.json` med nyckelns avtryck ur `android-app/BYGG.md`,
och `installera.test.jsx` kräver att de två är identiska. Utan filen fungerar
appen ändå, med Chromes verktygsfält överst.

**Skalets lagring följer inte med till Chrome.** Backup före, inläsning efter.
Se `android-twa/BYGG.md`. Bygget kräver Gradle och Android SDK på Roberts
maskin och kan inte kontrolleras i CI — det som låses i sviten är att
manifest, gradle, assetlinks och skalet pekar på samma adress, paket och nyckel.

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

**Lint i CI sedan 2026-08-11**, med en enda regel: `no-undef`. Fyra gånger på
tre dagar användes en identifierare utan import (`volt` i App2, `btnText` i
ProgramSheet, `EXERCISES` i App2, `btnText` i ProgressView). Varken sviten eller
bygget ser det — en fri identifierare är giltig JavaScript ända till körtid — och
felet visade sig som en **tom vy** i webbläsaren, först när just den vyn
öppnades. Linten ligger före bygget: går den inte igenom är bygget meningslöst
att vänta på. Konfigurationen i `atlas-app/eslint.config.js`, skriptet
`npm run lint`.

Samma felklass, tre lager: `import-integritet.test.js` ser motoranrop utan
import, linten ser alla odefinierade identifierare, och `no-undef` fångar även
det som testet inte känner till.

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

**Askr 2.0:s DOM-skript — ARTON stycken** (sjutton gröna i CI 2026-09-13 på
`04781c7`; `verify-atlas2-puls.mjs` tillkom 2026-09-13 och är grön lokalt — dess
första CI-körning är den som gäller):

| Skript i `scripts/` | Port | Täcker |
|---|---|---|
| `verify-atlas2-kroppsmatt.mjs` | 8971 | mätning, redigering, radering, historik, detaljvy |
| `verify-atlas2-kvinnokarta.mjs` | 8969 | kvinnofiguren: kön × läge, viewBox, 22 regioner |
| `verify-atlas2-sport.mjs` | 8939 | sportloggning, distans, lagring med id, readiness |
| `verify-atlas2-layout.mjs` | 8947 | tre bredder: SE, iPhone 14, desktop |
| `verify-atlas2-passredigering.mjs` | 8935 | rätta/radera pass, varför-frågan |
| `verify-atlas2.mjs` | 8931 | näringsmål, snabblogg, coachchatten, persistens |
| `verify-atlas2-tillskott.mjs` | 8963 | kryssrutor, streak, följsamhet |
| `verify-atlas2-matakut.mjs` | 8955 | Rädda måltiden |
| `verify-atlas2-matlogg.mjs` | 8973 | logga bakåt i tiden, flytta post, omladdning |
| `verify-atlas2-ovningsbilder.mjs` | 8937 | att varje bild i `MED_BILD` laddas (naturalWidth > 0) |
| `verify-atlas2-mealprep.mjs` | 8956 | veckomeny, inköpslista |
| `verify-atlas2-readiness.mjs` | 8957 | readiness-arket, tunt underlag |
| `verify-atlas2-pass.mjs` | 8932 | röstknappen + viktrastret i pågående pass |
| `verify-atlas2-backup.mjs` | 8934 | v3-backup: export, granska, ersätt |
| `verify-atlas2-malresa.mjs` | 8961 | målresan |
| `verify-atlas2-profil.mjs` | 8967 | profilarket |
| `verify-atlas2-puls.mjs` | 8975 | pulsband via fejkad GATT: skäl utan Bluetooth, chip, vila, kvitto, lagring |
| `verify-atlas2-malprogram.mjs` | 8965 | målprogram |

Steg-antalen som stod här var avlästa 2026-08-11 och gick inte att lita på
efteråt. Porten är stabil och går att kontrollera; den står i stället.

**Kör ALLA tretton vid regression, inte ett urval.** `verify-atlas2.mjs` hade
slutat fungera helt (0 OK) utan att någon märkte det: matvyns knapp bytte namn
från "Logga mat" till "Logga måltid" när matakuten byggdes, och skriptet ingick
inte i de rundor som kördes. Ett skript som inte körs skyddar ingenting.

**De körs numera i CI**, som ett eget jobb (`verifiera-dom` i
`deploy-pages.yml`), och publiceringen är spärrad tills de är gröna. Tidigare
kördes de bara när någon kom ihåg det — och de har fångat sådant som varken
sviten eller bygget ser: passvyn 107 px utanför skärmkanten, och en bild som
renderades men aldrig laddades (`naturalWidth` 0).

Jobbet är en **matris över de tretton skripten**, inte tretton steg i rad.
Sekventiellt tar de 374 s (mätt på tio); skripten binder var sin port
(8931–8967) och kan därför köras samtidigt, vilket ger väggklocka lika med det
längsta skriptet plus uppsättning — hela matrisen tog 119 s i CI 2026-08-26.
`fail-fast: false` — faller ett vill man se de andras utfall, annars blir
felsökningen gissning.

**Portarna måste vara unika, och CI kan inte se när de inte är det.** Varje
matrisjobb får en egen runner med egen nätverksstack, så två skript som delar
port är gröna i CI och trasiga så fort någon kör dem parallellt lokalt — det
ena dör på `EADDRINUSE`. Det hände: `verify-atlas2-profil.mjs` tog 8963 den
2026-08-24, en port `verify-atlas2-tillskott.mjs` hållit sedan 2026-08-16, och
stycket ovan motiverade samtidig körning med att portarna var olika. Påståendet
var falskt i två dagar utan att någon körning kunde avslöja det. Profilskriptet
flyttat till 8967, och `src/__tests__/dom-skript-portar.test.js` läser portarna
ur källan och kräver att de är unika — plus att skriptet surfar till samma port
som det lyssnar på, för en halv flytt är värre än ingen.

De körs fortfarande inte av `npm test` eller bygget lokalt — de kräver
`npm i --no-save playwright-core` och en byggd `dist-atlas2/`. Samtliga hittar webbläsaren via
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

  **VERIFIERAD PÅ TELEFON OCH I BRUK.** Bryggan byggdes 2026-07-27 och Robert
  har bekräftat att röstloggningen fungerar i app-skalet. Spåret är därmed
  stängt: rösten fungerar både i webbläsaren och i skalet, via två olika vägar
  som möts i samma `parseSetSpeech`.

  Att komma ihåg för nästa APK: **JS-sidan ensam gör ingenting.** `AskrNative`
  finns bara i skalet, så en webbdeploy ändrar aldrig något för bryggan — den
  följer med först när en ny APK byggs och installeras.

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
  faktakälla"). Grunden är byggd. Den PROAKTIVA delen är byggd i #190: fyra
  nudges på hemvyn och en kommentar under passets vila, båda regelbaserade
  och nätfria. Den MÅLDRIVNA coachingen är byggd i #199 (se "Coachen blev
  aktiv"). Kvar är bara den AI-skrivna dagliga raden — den kostar per
  användning och hör till premiumnivån, inte till grundappen.
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
- **Struken tills vidare:** återhämtningsvy (skiss 5). Sömn, HRV och vilopuls
  har ingen datakälla. En vy med tomma fält är sämre än ingen vy. Vägen dit är
  bestämd (se "Pulsband och klockor"): först filimport ur Garmin/Polar/Apple
  Hälsa, sedan en automatisk koppling. Vyn byggs när indata finns.

**Prenumeration och prissättning — FÖRSLAG (2026-09-14), inget byggt:**

Roberts utgångspunkt: bas 29 kr/mån eller 249 kr/år, premium 49 kr/mån eller
499 kr/år, där premium ger aktiv AI-coach och fota-och-räkna-mat. Delningen
är rätt: det som kostar per användning är exakt det som anropar proxyn, och
det är sex vyer — `CoachChat`, `FeedbackSheet`, `FoodView` (AI-måltid),
`FotoMaltid`, `SkannaMaskin`, `Streckkod`. Allt annat i appen kostar noll att
köra. Förslagen nedan är diskuterade, inte beslutade:

- **Årsrabatten haltar.** 249/år är 29 % under 12×29; 499/år är bara 15 %
  under 12×49. Premium är nivån som ska säljas på år (förutsägbar intäkt,
  mindre churn), så rabatten borde vara minst lika stor där: 449/år (≈24 %)
  eller 59/499.
- **Gratisnivå, inte bara bas.** Kartan är säljargumentet och kostar inget.
  Gratis utan tidsgräns: karta, loggning, återhämtning, senaste passen. Bas:
  hela historiken, utveckling, mätningar, sportpass, pulsband. Premium: de
  sex vyerna ovan.
- **Fair use i premium**, t.ex. "upp till 300 AI-förfrågningar/månad" i
  villkoren. Visas först när någon når gränsen.
- **Butikernas egna testperioder och erbjudandekoder** i stället för egen
  rabattlogik i appen. Testarna får koder.
- **Arkitekturen sätter ramar.** Inga konton — ett köp knyts till
  butikskontot, inte personen (Android → iPhone = köp igen; ska stå tydligt).
  Webbversionen måste bestämmas: gratis demo (kartan utan AI) rekommenderas;
  alternativet är en server som verifierar köp, vilket är ett eget projekt.
- **Gate aldrig:** backup/export, radera data, egen historik. De fungerar
  även när prenumerationen löpt ut.
- **Nettot på 49 kr:** moms 25 % → 39,20; butikens andel 15 % (under 1 MUSD)
  → ca 33 kr i handen per månad. Butiksandelarna ändras — kontrollera innan
  beslut. AI-kostnaden per normal premiumanvändare är några kronor/mån.
- **Namn:** "Askr" / "Askr Coach" säger vad nivån ger; Bas/Premium gör det
  inte.

Kräver innan något byggs: Play Billing i TWA:n (eller Capacitor för App
Store, se "Pulsband och klockor"), och ett beslut om webbversionen.

**BLOCKERAT (utanför repot) — inte beslutat bort:**

Följande är BYGGT och ligger i repot. Det som saknas är ett APK-bygge, och det
går inte att göra härifrån: **signeringsnyckeln ligger medvetet utanför repot.**
Utan exakt samma nyckel går appen inte att uppdatera — en ny nyckel tvingar
avinstallation och all data i skalet försvinner.

*Låses upp av: signeringsnyckeln + en riktig telefon + `adb`.* Se
`android-app/BYGG.md`; kräver **JDK 17** (d8 i build-tools 34 kraschar under
JDK 21).

- **TWA-bygget** (`android-twa/`, 2026-09-13). Kräver Gradle + Android SDK +
  `keystore.properties` med samma nyckel, och repot
  `robertekholm68-lab.github.io` med `.well-known/assetlinks.json` (filen
  ligger färdig). Tills TWA:n är verifierad på telefon ligger WebView-skalet
  kvar. Installationsknappen i Mer-menyn väntar däremot på ingenting — den
  ger samma sak (Chrome som app) utan APK.

- **App-ikonerna i Android-skalet.** Filerna ÄR bytta — alla fem
  `ic_launcher.png` i `android-app/res/mipmap-*` (`b133ef0`), och
  `android:label` är redan `Askr`. De slår igenom först i en ny APK. En
  installerad app visar alltså fortfarande den gamla ikonen tills dess.
- **Mikrofonspåret är LÖST, inte blockerat.** Se *AVGJORT* ovan. Kort: WebView
  når aldrig mikrofonen, och den nativa `SpeechRecognizer`-bryggan går runt det.
  Byggd 2026-07-27, **verifierad på telefon, i bruk**. Ingen del av det här
  väntar längre på något.

  Formuleringen "medvetet nej" stod kvar här i två veckor efter att bryggan
  byggts och börjat användas. Det är precis den andrabokföring rubriken överst
  i filen varnar för — samma sak beskriven på två ställen, där det ena slutade
  stämma. Beskriv nuläget på ETT ställe och länka dit.

  **Byggutdata hör inte hemma i repot.** `android-app/build/` är ignorerad sedan
  ett molnpaket bar in en hel byggkatalog. Det gäller fortfarande, och handlar om
  att repot ska bära källa och inte artefakter.

  **Debugsignerade APK:er är däremot arbetsredskapet**, inte ett problem — de
  används löpande för att prova skalet. Det enda som måste vara känt innan en
  installeras: Android vägrar installera den över en app signerad med den
  riktiga nyckeln. Byter man mellan debug och riktig signatur krävs
  avinstallation, och då försvinner skalets lagring. **Exportera backup först**
  (Meny → Historik → Datasäkerhet), så kostar bytet ingenting.

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
- **Byggstämpeln är UTC.** `__ATLAS_BUILD__` sätts med `toISOString()`, så en
  rak utskrift av siffrorna visar 06:53 när svensk klocka säger 08:53 — och över
  dygnsgränsen fel DATUM. Förödande just för en versionsvisning: den finns till
  för att avgöra om ny kod landat, och texten bredvid säger "stämmer inte tiden,
  starta om". En färsk app ser då gammal ut och någon jagar ett problem som inte
  finns. Konverteringen bor i motorns `formatBuildTime`, delad av alla tre
  målen. Mobilen hade den rätt hela tiden i en egen kopia; 2.0 fick först en
  andra, felaktig. Testet sätter `process.env.TZ` — containern kör UTC, där är
  även den trasiga varianten grön.
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
- **En gren som skiljer sig från main är inte automatiskt omergad.** Vid
  genomgången 2026-08-26 fanns 76 `claude/moln-*`-grenar kvar på origin. 40 av
  dem gav diff mot main och såg därför omergade ut. De var det inte: 24 låg
  inne under sitt eget commit-ämne, och de 17 återstående hade sitt innehåll i
  main i vidareutvecklad form — grenens rader hade bara flyttat sig. Tre test
  behövs för att avgöra saken, i den här ordningen: (1) finns commit-ämnet i
  `git log origin/main`, (2) applicerar diffen omvänt mot main, (3) hur stor
  andel av grenens tillagda rader hittas med `git grep` i main. Bara det tredje
  gav rätt svar för de sista 17 — de låg på 88–100 %. `git diff main...gren`
  ensamt svarar på fel fråga: det mäter avstånd, inte om arbetet är gjort.
- **Superseded ser ut som saknat.** `moln-ai-okand-mat` låg på 56 % och var den
  enda gren som verkade ha riktigt innehåll kvar. Den byggde vidare på
  storleksfrågan ("Ungefär hur stor måltid?") — som `moln-ai-menyval` tog bort
  med avsikt, och den grenen är inne. De saknade raderna var alltså en spärr vi
  medvetet skrotat. Läs alltid vad de saknade raderna GÖR innan de merges in.
- **Två kartor för samma kropp kan glida isär åt bara ena hållet.**
  Kvinnofigurens test kontrollerade att hennes region-id:n låg inom mannens
  uppsättning. Den riktningen är inte den farliga: mannen är referensfiguren och
  redigeras först, så växer HANS karta med en region saknar kvinnan den tyst och
  delmängdskontrollen är fortfarande grön — hon har bara blivit en mindre
  delmängd. Antalet stod dessutom hårdkodat som elva, vilket blir grönt även när
  mannen fått tolv. Kontrollen kräver nu att mängderna är LIKA, per vy, och
  läser antalet ur mannens karta i stället för ur en siffra. Verifierad genom
  att ta bort en region: den faller och namnger vilken.
- **CI:s DOM-matris är en handhållen lista, och bara den som mergar når den.**
  Molnets token saknar workflow-scope med avsikt, så när ett molnpaket bär ett
  nytt DOM-skript finns skriptet i repot men inte i matrisen — det körs aldrig.
  `verify-atlas2.mjs` hade redan en gång slutat fungera helt (0 OK) av just den
  anledningen. `dom-skript-portar.test.js` jämför nu matrisen mot katalogen åt
  båda hållen, plus dubbletter. Fångade sig själv direkt: en radbaserad `sed`
  raderade `verify-atlas2-layout.mjs` ur matrisen, och testet sa vilken rad som
  saknades. Redigera listan med sökning-och-ersättning, aldrig med radnummer.
- **Ett DOM-skript som körs ensamt kan inte upptäcka en portkrock.** Molnets
  `verify-atlas2-kvinnokarta.mjs` band 8934, som `verify-atlas2-backup.mjs`
  redan höll, och levererades som "14/14 gröna" — helt sant, eftersom det kördes
  för sig. Krocken syns bara när två skript körs samtidigt, och i CI aldrig alls
  (egna runners). Flyttad till 8969, och de två kördes parallellt som bevis.
- **Network-first räcker inte för en app på hemskärmen.** 2.0:s service worker
  hämtar dokumentet med `{ cache: "no-cache" }`, så en KALLSTART får alltid
  senaste versionen — och slutsatsen "alltså är alla uppdaterade" var fel. En
  installerad app startas sällan kallt: man växlar till den, den ligger i
  bakgrunden i dagar, och ingen navigering sker. Då kör den gamla versionen
  vidare hur många publiceringar som helst. Mobilkompanjonen hade letat efter
  uppdateringar sedan länge (`reg.update()` vid `visibilitychange`); 2.0 gjorde
  det inte alls, trots att den är den aktiva appen. Samma mönster nu i
  `main2.jsx`, plus att appen laddar om SIG SJÄLV när inget pass pågår —
  testaren ska ligga på utvecklarens version utan att göra något.
- **En automatisk omladdning måste ha ett undantag.** Att alltid ladda om vore
  enklare men skulle ta användaren ur ett pågående pass. Passet ligger kvar i
  `atlas.v3.live` och går inte förlorat, men det KÄNNS som att appen tappade
  det, och känslan räcker för att en testare ska sluta lita på appen. Därför
  två utfall av samma händelse: tyst omladdning när inget pass eller kvitto står
  uppe, annars raden "Ny version av Askr finns" med användaren som beslutar.
- **Registrering på två ställen betyder att ingen vet vilket som gäller.**
  Service workern registrerades i ett inline-skript i `atlas2.html`, där logik
  inte går att testa. Flyttad till `main2.jsx`, och ett testfall kräver att
  `atlas2.html` INTE registrerar — annars smyger den tillbaka.
- **Ett värde på två ställen glider isär — synka inte, ta bort det ena.**
  Profilarket skrev `profile.sex` medan `App2` bar ett EGET `sex`-state som
  bara sattes vid hydrering och i onboardingen. Byte av kön sparade alltså rätt
  värde och visade fel figur, ända tills appen laddades om. Reproducerat mot
  bygget: karta MAN medan `profile.sex` var "f". Fixen var inte att hålla de två
  i takt utan att låta `sex` härledas ur profilen. Två sanningar om samma sak
  hinner alltid glida isär; det är samma skäl som gör att den här filen är enda
  källan för siffror.
- **Talfält får inte klampa medan man skriver.** "Om dig" klampade varje
  tangenttryckning mot min/max, och ett tal skrivs en siffra i taget: "1" av 180
  är under minimum 120 och blev 120, så nästa siffra gav "1208" som klampades
  till 230. Man kunde bokstavligen inte skriva sin egen längd. Ålder likaså: 42
  blev 100. Fältet äger nu sin text medan man skriver och klampar när det
  lämnas — och Spara klampar också, annars håller gränsen inte för den som
  trycker Spara direkt från ett fält som står på 500.
- **En vägning i appen nådde aldrig `weights`.** Utvecklingsvyn sparar i
  `matningar`, men profilen, coachen, framstegsvyn, målplanen och backupen läser
  `weights` — en lista som BARA historikimporten fyllde. Man kunde väga sig och
  ändå få streck i "Om dig", ingen kroppsfettsberäkning och en målresa mätt mot
  tom historik. Två lagringsnycklar för samma mätning, precis som könsbuggen
  ovan: samma mönster, olika vy.
- **Maskskriptet antog att generatorn ritar likadant varje gång.** Kvinnans
  bilder stod stilla mellan körningarna (1–3 % silhuettskillnad) så inriktning
  behövdes aldrig — antagandet var osynligt tills mannens framvy kom, där
  figuren hamnade upp till ett par tiotal pixlar åt sidan (29 % för
  adduktorerna). Formen var rätt, bara förskjuten. Skriptet riktar nu in på
  masscentrum och finjusterar ±8 px; efter det ligger mannens framvy på 3–8 %
  och bakvyn på 0,7–1,3 %. En rak rutnätssökning provades och var både
  långsammare och sämre: vid ±14 px slog flera bilder i sitt eget söktak utan
  att säga till.
- **En pipeline vars utdata inte går att reproducera slutar man lita på.**
  `body_regions_female.json` kördes om med inriktningen så att fil och skript
  stämmer överens igen. Kontrollerat mot föregående version: bara
  `back/rotator_cuff` ändrades, och banan har samma längd — allt annat är
  identiskt byte för byte.
- **Muskelkartan skriver inga namn — och det är ett beslut, inte ett
  förbiseende.** Kartan hade två namnvisningar: en `<title>` per region
  (webbläsarens gula ruta) och en textrad under figuren med muskelns namn och
  readiness-siffra. Båda borttagna 2026-08-26 på Roberts begäran; kartan ska
  läsas som en bild, och siffran hämtas i muskelarket. Namnet är lätt att lägga
  tillbaka av misstag — en `<title>` ser ut som ett tillgänglighetsgrepp någon
  glömt — därför låser `atlas2-kartnamn.test.jsx` fast frånvaron.
  `<title>` kostade heller ingenting för skärmläsare: svg:n bär `role="img"`,
  vilket gör hela kartan till EN grafik i tillgänglighetsträdet, så barnen
  exponerades aldrig. Titlarna var enbart en muspekarruta.
- **En rad som reserverar höjd kostar även när den är tom.** Namnraden bar
  `minHeight` plus `marginTop` med transparent text när ingenting hovrades, för
  att figuren inte skulle hoppa när namnet dök upp. Borttagen växte kartan
  mätbart: iPhone SE 224 → 245 px, iPhone 14 401 → 422, desktop 638 → 666.
  Kartan är en flex-kolumn där figuren är `flex: 1`, så allt som slutar ta höjd
  hamnar automatiskt hos kroppen.
- **Ett negativt påstående måste kunna falla.** "Namnet syns inte" är sant även
  på en sida som aldrig laddade. Både DOM-steget och enhetstestet mäter därför
  sina egna förutsättningar i samma andetag: 22 regioner ska finnas och sidan
  ska ha text, OCH namnet ska saknas. Utan det hade kontrollen blivit grön av
  precis det fel den skulle fånga.
- **Ett skydd som jämför två listor mot varandra kan vara grönt medan båda är
  fel.** `atlas2.test.js` krävde att varje nyckel i `REGION_MAP` hade ett namn i
  `REGIONNAMN`. Båda bar `external_obliques` — men regionen i
  `body_regions*.json` heter `obliques`. Listorna stämde alltså perfekt med
  varandra och båda pekade förbi verkligheten, i månader, medan muskelarket
  skrev "obliques" i stället för "Sneda bukmuskler". Kontrollen är nu förankrad
  i region-id:na ur JSON-filerna, och kräver dessutom att ingen post pekar på en
  region som inte finns: en död nyckel ser ut som täckning och är det inte.
- **`MAP[id] || [id]` döljer en saknad post.** Fallbacken är rätt för de
  regioner som heter som sin muskel, men den gör också en glömd post osynlig.
  `rotator_cuff` saknades helt i `MAP` och föll därför tillbaka på att söka
  `rotator_cuff` i taxonomin — som har 21 muskler och inte den. `regionState`
  gav null varje gång, så regionen ritades, gick att peka på, och färgades
  aldrig oavsett hur man tränat. Den pekar nu på `deltoid_posterior`: kuffen
  ligger bakom axeln och belastas av samma drag, samma resonemang som
  `teres_major → latissimus_dorsi`. Ett nytt testfall kräver att varje muskel i
  `REGION_MAP` finns i taxonomin, så nästa glömda post faller i stället för att
  tystna.
- **En basbild måste komma ur samma batch som sina masker.** Normaliseringen
  beskär allt efter basens bbox, så en bas från en annan generering placerar
  varenda mask fel — mätt till 24 % drift och 196 px sidled på mansfigurens
  framvy. Basbilden byggs nu som MEDIANEN av vyns elva masker: varje pixel är
  magenta i högst en eller två av dem, så medianen ger ren hud i exakt rätt ram.
  Drift efter det: 0,8–2,8 %.
- **Masker utan figuren i bilden går inte att placera.** Två omgångar kom med
  rätt former (bbox-normaliserad IoU 0,97 mot föregående omgång) men utan
  kroppen — och utan kropp finns ingen referens för VAR masken sitter. Nio
  räddades med korskorrelation mot förra omgångens redan placerade masker. De
  två helt nya, hamstrings och vader, placerades ur den uppmätta
  exportkonventionen och finjusterades på två oberoende signaler: all magenta
  innanför silhuetten, och spegelsymmetri kring figurens mittaxel. Utfall 100 %
  innanför, 96–97 % symmetri. Be alltid om masker MED figuren i bilden.
- **Ett granskningsverktyg kan ljuga och göra riktiga träffar till falska
  missar.** `forhandsvisa-karta.py` hade kvinnans viewBox hårdkodad som
  bildförhållande och sträckte därför mannen 12 % i sidled, vilket gav sex
  falska missar i träfftestet. Läses nu ur JSON:ens egen viewBox. Samma sort som
  DOM-skriptet som mätte fel vy: verktyget som ska avslöja fel kan själv vara
  felkällan, och då pekar det åt fel håll med full auktoritet.
- **Bbox-mitten ligger inte i formen när formen är tvådelad.** Träfftestet
  pekade i mitten av varje regions bbox — men en bilateral muskel har sin
  bbox-mitt MELLAN halvorna, alltså utanför båda. Sex falska missar. Punkten
  hämtas nu ur distanstransformens max per komponent, vilket alltid ligger inuti.

## Kroppsmått och kroppssammansättning

En mätning är EN post i `atlas.v3.matningar` — samma lista som vägningarna
alltid legat i. Kroppsmåtten lades till som ett `matt`-objekt PÅ den posten,
inte som en egen lista:

```
{ ts, kg, fat, muscle, visceral, matt: { midja: 91.5, biceps_hoger: 36 }, källa }
```

**Varför inte en egen lista.** Vikten har fem läsare — profilen, coachen,
framstegsvyn, målplanen och backupen — via `weights`, som härleds ur
`matningar`. En parallell modell hade gett två ställen att hämta samma vikt
från, och det felet har redan kostat en gång: `matningar` fylldes medan
`weights` förblev tom, och den som vägde sig i appen fick streck i "Om dig".

**Gamla poster är giltiga som de är.** De saknar `matt`, och allt som läser
dem fortsätter fungera oförändrat. Ingen migrering behövs, ingen data rörs.

**Registret ligger i `data/kroppsmatt.js`.** Ett nytt mått — handled, fotled,
säte, överarm spänd — är EN rad där. Formuläret, historiken, detaljvyn och
asymmetrijämförelsen byggs alla ur registret, så inget av dem behöver röras.
Ett testfall vaktar att listorna inte börjar skrivas för hand igen.

**PROCENTENHETER ÄR INTE PROCENT.** Kroppsfett från 25,5 % till 22,1 % är
−3,4 pp och −13,3 %. Skillnaden bor i registrets `enhetDiff`, inte i vyerna, så
den kan inte glida isär mellan skärmar. `procentuellFörändring()` finns separat
för den som medvetet vill ha det andra talet.

**Enheterna är förberedda, inte påslagna.** `ENHETER` bär omräkningsfaktorerna
till lb och inch, och `visaEnhet(enhet, system)` är den enda platsen ett byte
behöver hamna på. Lagringen är alltid metrisk — annars blir en användare som
byter enhet av med sin historik, eller får den omräknad två gånger.

**`kroppsdata()` är coachens ingång.** Aktuell vikt, viktförändring över en
period, kroppsfett, muskel och valda mått, färdigräknat. Ingen coachlogik är
byggd — funktionen lägger bara datan inom räckhåll, som `coachFacts` gör för
träningen. Allt kan vara null, och en coach som får null ska säga att den inte
vet.
- **En rak spread tar med sig den nya postens tomma fält.** `slåIhopMätningar`
  gjorde `{...befintlig, ...ny}`, vilket var ofarligt så länge varje mätning
  MÅSTE ha vikt. När mätningar utan vikt tilläts blev det tyst dataförlust: slog
  man ihop en midjemätning mot en morgonvägning inom samma timme försvann
  vikten, för den nya posten bar `kg: null`. Regeln är nu att ett ifyllt värde
  vinner över ett tomt, oavsett vilken post det kom från. Fångat av ett test som
  skrevs innan koden kördes skarpt.
- **`byggMätning` krävde vikt, och det var en rest.** Funktionen returnerade
  null utan `kg`, från när det här bara var en våglogg. En mätning med enbart
  midja avvisades tyst. Nu räcker ett värde; bara den helt tomma posten avvisas.
  Det befintliga testet "utan vikt finns ingen mätning" låste fast den gamla
  regeln och skrevs om — regeln ändrades med avsikt, testet följde efter.
- **En komponent definierad inuti en annan komponent rivs vid varje render.**
  `Falt` låg inuti `NyMatning`. React jämför komponenttyper med IDENTITET, och en
  funktion skapad på nytt vid varje tangenttryck är en ny typ — fältet revs och
  byggdes om, fokus försvann, och på mobil åkte tangentbordet ner. Symptomet såg
  ut som ett tangentbordsfel; orsaken var var funktionen bodde.
- **En övning vald för att den SAKNAR något måste bytas när den får det.**
  Testfallet "bildFör returnerar null" använde bench_press som exempel på övning
  utan bild. När bench_press fick en bild testade fallet ingenting — det var
  fortfarande grönt. Exempel som bygger på en frånvaro har ett utgångsdatum.
- **En commit-text beskriver ett ögonblick, inte nuläget.** #156 lade till två
  sekundärmuskler på triceps pressdown och #157 tog bort dem igen. Den som läser
  #156 i tron att den beskriver koden i dag får fel svar. Koden vinner — det är
  därför siffror ska räknas fram, inte läsas ur historik.
- **En flik ligger UNDER navigationen, ett ark ovanpå.** När Utveckling gjordes
  om från ark till flik hamnade "Spara mätning" bakom bottenmenyn. Playwright
  rapporterade att nav-svg:n fångade klicket — en användare hade inte kunnat
  trycka heller. Byter man behållartyp ändras z-ordningen, och bottenmarginalen
  måste räkna med `NAV_HÖJD`.
- **Ett eget skydd för sin egen funktion prövar sällan det som går sönder.**
  `verify-atlas2-matlogg.mjs` kontrollerade dagsväljaren på 390 px och letade
  efter SIDSCROLL. Det som brast var HÖJDEN på 375 px: den nya raden kostade
  52 px och matvyn — en av vyerna som aldrig får scrolla — blev 31 px för hög.
  Ett skript skrivet till en funktion mäter funktionens löften; det är de
  äldre, breda skydden (`verify-atlas2-layout.mjs`) som fångar vad funktionen
  kostade allt annat. Båda behövs, och den nya raden hörde hemma i en rad som
  redan fanns.
- **Ett test som inte hittar något att pröva blir grönt av tomhet.**
  Portkontrollen läste `localhost:(\d+)` ur varje DOM-skript och jämförde med
  porten servern binder. Ett skript som skrev `localhost:${PORT}` gav noll
  träffar, slingan gick aldrig ett varv och kontrollen passerade — utan att ha
  prövat något. Negativa och listbaserade kontroller måste själva kräva att det
  fanns något att kontrollera.
- **Mät inte samma löfte i två skript.** Pulsskriptet fick en egen kopia av
  "passvyn ryms på SE" och föll i CI med 686 px av 667 — men 686 både före och
  efter att bandet kopplades. Kopian mätte en annan väg (riktig profil, första
  programmallen) på runnerns typsnitt, medan layoutskriptet mäter demoläget
  och var grönt i samma körning. Kopian togs bort: ett skript prövar SITT
  löfte (raden växer inte), och löftet om att rymmas har en ägare.
  Observation att följa upp: på CI:s Chrome är passvyn med första
  programmallen 19 px för hög på SE — det täcks inte av layoutskriptet.
- **En upprensning som väntar in något sker en mikrotask senare.** Motorns
  `disconnect()` gör `await stopNotifications()` innan den släpper GATT:en.
  Ett test som läste räknaren direkt efter `unmount()` såg noll och pekade ut
  koden — men det var testet som inte väntat. Läs asynkrona följder efter en
  tick, annars testar man ordningen i händelseloopen i stället för beteendet.
- **Ett regex som stannar vid första `)` ser aldrig sista argumentet.**
  `byggSportpass\([^)]*pulsGiltig\)` matchade inte anropet, eftersom det bär
  `Date.now()` och `parseFloat(…)` inuti. En ordagrann delsträng är tråkigare
  och rätt.
- **En lista kan ha en annan form än man antar.** `MAIN_LIFTS` är `[id, namn]`-
  par, inte id:n. Loopar man över paren matchar `find(e => e.id === par)` aldrig
  — rekordnudgen och stagnationsnudgen var HELT TYSTA, och i progressionskartan
  fick de stora lyften ingen fetstil. Ingenting kraschade, ingenting loggades:
  en felaktig antagen form ger tomhet, inte fel.
- **Ett påstående om kalendern får inte räknas i timmar.** Rekordnudgen fyrar
  12–36 timmar efter passet och skrev "i går". Ett pass 07:00 och en app öppnad
  19:30 samma dag ligger 12,5 h isär; 36 h efter ett kvällspass är i förrgår.
  Fönstret var rätt — ordet gissade. Dygn räknas med `startOfLocalDay`.
- **Ett test kan låsa fel sida av en oenighet.** `epley1RM(100, 1) === 103` stod
  som testfall och var grönt — men 103 var just den variant som skilde sig från
  `index.js`. Ett test skrivet samtidigt som koden ärver kodens antagande; det
  bevisar att funktionen gör vad författaren trodde, inte att det är rätt.
- **Ett grönt bygge säger ingenting om filer utanför bundeln.** Övningsbilderna
  ligger i `public/ovningar/`. En `img` som pekar fel renderas med
  `naturalWidth 0` utan ett enda fel i konsolen. Det enda som avslöjar det är
  att mäta i en riktig webbläsare mot en server som serverar både HTML och
  bildmapp — därav `verify-atlas2-ovningsbilder.mjs`.
- **Samma begrepp definierat två gånger är en bugg som väntar.** `sammaDag` i
  `store.js` och `sammaDygn` i `foodlog.js` beskrev samma lokala kalenderdygn.
  Ingen körning kunde avslöja det så länge de var överens — men dagsväljaren
  läser listan genom det ena och totalerna genom det andra. Samma sak hände
  1RM-formeln, som hann bli TRE exemplar: `utveckling.js`, `index.js` och en
  rad inskriven rakt i `styrkeKurva`. Där var de inte ens överens — ett
  enrepsset gav 100 i den ena motorn och 103 i den andra. Att jämföra TALEN i
  ett test hade bara visat att de råkade stämma just då; testet kräver nu att
  det är SAMMA funktion.
- **Kravtexters exempel kan vara självmotsägande.** Specen för detaljvyn listar
  94,0 cm som äldsta midjemätning men säger −7,5 cm sedan start, och 91,5 − 94,0
  är −2,5. Implementationen räknar ur datan, inte ur exemplet. När ett krav bär
  två tal som inte går ihop är det talen som ska ifrågasättas, inte koden som ska
  fås att visa båda.


## Navigationen, övningsbanken och muskelgrupperna (#147–#161)

Femton PR:er från molnsessionen 2026-09-07. Allt nedan är kontrollerat mot
koden, inte mot commit-texterna.

### Navigationen (#161)

**Framsteg och Utveckling blev EN flik**, döpt Utveckling, med fem underflikar
i `UtvecklingView.jsx`: Pass · Kropp · Mått · Styrka · Historik. Båda svarade på
"hur går det?" — den ena visade pass och volym, den andra kropp och styrka. Att
den ena var flik och den andra undervy var historia, inte logik.

**Passfliken har tre knappar** i rutnätet: Tomt pass · Övningar · Sport.
Kunskap, Maskiner och Feedback flyttade till Mer-menyn på Hem, där Om dig,
Datasäkerhet och Version redan låg. De låg i passflikens rutnät för att det
fanns plats, inte för att de hör till pass.

**Muskelgruppsvyn är enda ingången till banken**, med "Alla · 160 övningar" som
första kort. Övningsbanken hade tre ingångar; två av dem var samma lista med
olika första steg.

**Vikten är ett tryck från Hem** i stället för fyra (Framsteg → Utveckling →
Kropp → Ny mätning).

Ett UI-fel som bara mätning hittade: när Utveckling blev flik i stället för ark
hamnade "Spara mätning" BAKOM bottenmenyn. Ett ark ligger ovanpå navigationen,
en flik under. Bottenmarginalen räknar nu med `NAV_HÖJD`.

### Muskelgruppsvyn (#150, #154, #159)

`MuskelgruppsVy.jsx` — nio kort, ett per grupp i övningsbanken, figuren med
gruppen markerad. Gruppernas storlek, räknad ur `EXERCISES`: Legs 38, Back 27,
Shoulders 22, Core 19, Chest 18, Triceps 12, Biceps 11, Glutes 9, Calves 4.
Summa 160.

**Färgen symboliserar gruppen, inte dagsläget** (`C.critical` vid 0,92). Vyn
färgades först ur användarens återhämtning, som kroppskartan — men det här är en
INNEHÅLLSFÖRTECKNING. Med dagsläget blev otränade grupper ofärgade och därmed
osynliga som val, och färgen skiftade från dag till dag utan att gruppen ändrats.
Rött krockar inte med kartans skala just därför: kartan svarar på hur kroppen
mår idag, den här vyn på var muskeln sitter.

**Filtret matchade fel taxonomi.** Banken filtrerade på `MUSCLES[...].group`
(gemener, biceps/triceps hopslagna till "arms") medan muskelgruppsvyn skickade
bankens id ("Back"). Noll träffar — och en tom filtrering visar allt, så felet
såg ut som "alla övningar kommer upp oavsett val". Nu en taxonomi: `e.group`.

### Övningsbanken (#155, #157, #158)

**Teknikpunkterna fanns redan skrivna för 48 övningar** men visades ingenstans —
exporterade, aldrig importerade i banken. Namnet krockade med vilosignalernas
`CUES` i `engines/cues.js`, därför heter de nu `TEKNIK_CUES`.

**Åtta övningar har bild** (`MED_BILD`), alla i `public/ovningar/<id>.webp` och
alltså utanför appbundeln: fem fotorealistiska (triceps_pushdown, squat,
deadlift, bench_press, wide_pulldown) och tre äldre silverfigurer i diptyk
(seated_cable_row, t_bar_row, db_row). De två stilarna bör ensas.

**Teknikpunkterna ligger ÖVER bilden som riktig text**, inte inbränd. Bilderna
har 43–54 % mörkt fält under motivet; beskärningen behåller 275 px där appen
ritar punkterna med CSS. Inbränd text hade sett likadan ut men blivit omöjlig att
söka, översätta eller rätta — och osynlig för skärmläsare.

**Triceps pressdown har EN muskel, med flit.** #156 lade till deltoid_anterior
0,3 och forearms 0,3; #157 tog bort dem igen efter att källorna visat att
pushdown är en renodlad isolationsövning. Koden i dag: `triceps_brachii` 1,0 och
inget mer. Den som läser #156:s commit-text i tron att den beskriver nuläget får
fel svar — datan driver kroppskartan och readiness, och en påhittad
sekundärmuskel hade färgat en axel som inte tränats.

### Programmen och passen (#148, #149, #151, #152, #153)

**Ändrade övningar sparas tillbaka till programmet.** Frågan ställs på KVITTOT,
inte under passet: när passet är klart ser man vad man faktiskt körde och kan
avgöra om bytet var engångs (maskinen upptagen) eller ett nytt upplägg. Fyra nya
funktioner i `engines/programs.js`: `passetÄndrat`, `sparaPassTillProgram`,
`ärInbyggt`, `kopieraSomEget`. Programmet byter ALDRIG id — historiken pekar på
programId + workoutId, och ett nytt id hade klippt av progressionen. Inbyggda
program kopieras till ett eget i stället för att skrivas över.

**Coachknappen sa en muskel men startade ett program.** Knappen skrev ut den mest
utvilade muskeln men `onStart` startade programmets nästa pass — "Adductors" gav
bänkpress. Knappen säger nu passets namn; rubriken står kvar, för "Adductors är
redo" ÄR sant. Dessutom kräver redo-listan nu att muskeln har en EGEN övning:
18 av 21 muskler har det, och de tre utan ska aldrig kunna toppa
rekommendationen.

**Alternativmaskinen säger vilken övning som ersätter**
(`ersättandeÖvningar` i `engines/machines.js`). Latsdraget listade "Assisterad
dip / chin" — maskinen är rätt, men dips tränar bröst och triceps, inte rygg.
Funktionen returnerar de övningar på alternativmaskinen som delar muskelgrupp
med ursprungsmaskinen, så samma maskin ger olika svar beroende på var man kommer
ifrån. Matchar ingen övning returneras null i stället för att dölja ett datafel.

### Feedback från appen (#160)

`FeedbackSheet.jsx` skickar till coach-proxyns `/api/feedback`, som mailar vidare
via Resend. Ingen mailklient öppnas — en mailto-länk hade tappat de flesta på
vägen. Nyckel och mottagaradress ligger i miljövariabler i Vercel, aldrig i
koden: en adress i ett publikt repo blir skräppostmål inom veckor.

**Kvittot kommer från servern**, inte från att anropet gjordes. Ett "Skickat!"
för ett mail som aldrig lämnade servern är värre än ett felmeddelande. Vyn
redovisar öppet vad som skickas (version, läge, enhet) och att ingen
träningsdata, matlogg eller mätvärden ingår.

### Fältet som tappade fokus (#147)

Komponenten `Falt` definierades INUTI `NyMatning`. Vid varje tangenttryck kördes
`NyMatning` om och skapade funktionen på nytt; React jämför komponenttyper med
IDENTITET, såg en ny typ och rev fältet i stället för att uppdatera det. Fokus
försvann med det gamla elementet — och på mobil åker tangentbordet ner när fokus
försvinner. Man kunde skriva en siffra i taget. `Falt` ligger nu på modulnivå.

## Pulsband och klockor

Robert har Garmin; testarna har blandat, bland annat Apple. "Koppla klockan"
är tre olika problem, och de är olika svåra:

1. **Livepuls under passet** — pulsband, eller klockor som sänder puls över
   Bluetooth. Standardprofil (BLE 0x180D), inga konton, ingen molntjänst.
   **BYGGT 2026-09-13** (steg 1, nedan).
2. **Sömn, HRV och vilopuls** — det är här klockan gör skillnad, men datan
   ligger i tillverkarens moln. **FILIMPORTEN ÄR BYGGD 2026-09-14** (steg 2,
   nedan). Därefter kan EN automatisk koppling byggas — Polar AccessLink
   (öppet API, OAuth) eller Fitbit (öppet API, går helt utan server).
   **Inte lova:** Garmins API (kräver partnergodkännande), Apple Hälsa direkt
   (bara native iOS), Samsung utan native kod i skalet.
3. **Passimport** (Strava m.fl.) — minst viktigt för en styrkeapp. Inte planerat.

### Steg 1: pulsband i passvyn

`engines/hr.js` har funnits sedan mobilkompanjonen — `connectHeartRate`,
`parseHeartRate`, `hrSummary` med zoner ur ålder — men 2.0 hade aldrig kopplat
in den. Nu:

- **Chipet i rubrikraden**, bredvid musikknappen. ♡ okopplad, ♥ + tal kopplad,
  ett tryck kopplar, ett till kopplar ner. INGEN NY RAD: passvyn är den enda vy
  som måste rymmas utan scroll, och en rad hade kostat just den höjden — samma
  läxa som matvyns dagsväljare. Mätt i `verify-atlas2-puls.mjs`: samma höjd
  före och efter kopplingen (667 → 667 lokalt, 686 → 686 på CI:s Chrome).
  Löftet att vyn RYMS ägs av `verify-atlas2-layout.mjs` och mäts inte en gång
  till i pulsskriptet — en kopia av det föll i CI och kunde inte skilja på
  chipets kostnad och vägen dit.
- **Pulsen under vilan**, med zon när åldern är känd. Utan ålder finns ingen
  maxpuls att räkna mot, och då står talet ensamt — inte en gissad zon.
- **På passet** sparas `avgHr`, `maxHr`, `hrSamples` och (med ålder) `hrZones`
  via `sessionPulsFält()`. Samma fältnamn som mobilkompanjonen skrivit sedan
  2025, så importerad historik och nya pass ser likadana ut. Ett pass utan band
  bär INGA pulsfält — inte `avgHr: null` som ser ut som något man glömt. Råprover
  sparas inte: en timme är 3 600 tal, och det som går att läsa efteråt är
  snitt, max och zoner.
- **Kvittot** visar snitt, max och zonfördelning — en rad, inte en fjärde cell
  (fyra celler blir för trånga på SE). Bara när passet bär puls.
- **Sportarket** har fått ett frivilligt fält för snittpuls från klockan. Med
  känd ålder VÄLJER pulsen intensiteten (`hrIntensity`: <70 % lätt, <85 % medel,
  annars hård) och talet sparas som `avgHr`. Det är Garmin-vägen som fungerar i
  dag utan något API: klockan visar snittet efter passet, man skriver in det.
  Belastningen räknas fortfarande ur intensiteten — pulsen är det som valde den.

**`bluetoothStatus()` säger VARFÖR när det inte går.** "Bluetooth saknas" är
sant men obrukbart för den som står med bandet på bröstet:

| Läge | Skäl som visas |
|---|---|
| iPhone | Apple har inte implementerat Web Bluetooth. Inget att göra. |
| Android, appens WebView-skal | Skalet saknar det Chrome har. Öppna Askr i Chrome. |
| annan webbläsare | Web Bluetooth saknas. Chrome på Android eller dator har det. |

**WebView-skalet är inte längre vägen.** Så vitt känt exponerar Android WebView
inte Web Bluetooth, och det behöver inte längre mätas: Installera appen-knappen
(Mer-menyn) ger en WebAPK som kör i Chrome, och där är pulsbandet verifierat
med HRM 600 2026-09-14. Ingen Bluetooth-brygga i Java behövs. Skalet ligger
kvar för den som redan har det installerat, och säger själv i menyn att
Chrome är vägen.

### Steg 2: sömn, vilopuls och HRV ur en exportfil

`engines/halsa.js` + kortet i Utveckling → Kropp. Filen tolkas på telefonen och
datan lämnar den aldrig — samma väg som Omron-vågen, av samma skäl: Garmins API
kräver partnergodkännande, Apple Hälsa går bara att nå från en native app.

**En post per KALENDERDYGN** i `atlas.v3.halsa`: `{ dag, sömnMin, vilopuls,
hrv, källa }`. Egen lista, inte ett fält på mätningarna — en vägning är en
tidpunkt, en natt är ett dygn. Backupen bär den automatiskt (`v3Keys()` läser
allt under `atlas.v3.`).

**CSV och JSON, vilket märke som helst.** Kolumner och nycklar matchas på
NYCKELORD, inte exakta strängar, eftersom formaten skiljer sig mellan märken,
regioner och appversioner. JSON-vägen går igenom hela trädet rekursivt: ett
objekt som bär både ett datum och minst ett av de tre värdena blir en post.
Det gör att Garmins nästlade export fungerar utan att varje filnamn är känt.

**Enheten gissas ur storleken när talet är blankt** (`tolkaSömnMin`): ≤ 24 är
timmar, ≤ 1440 minuter, större sekunder. Gränsfallet 1440 blir en dags minuter
och inte 24 minuters sekunder — rätt gissning, för 24 minuter är ingen natt.
`"7h 32m"`, `"7:32"` och `"452 min"` läses direkt.

**Orimliga värden sparas inte**: sömn 1–16 h, vilopuls 25–120, HRV 5–300 ms.
Utanför gränserna blir fältet tomt i stället för ett tal som ser ut som en
mätning — 18 timmars sömn är en veckosumma eller fel enhet, vilopuls 12 är en
tom cell som blivit en nolla. Ett rimligt värde bredvid ett orimligt räddar
posten utan det dåliga.

**Sömnpoäng är inte sömnlängd.** `EJ_SÖMNLÄNGD` sorterar bort score, deep,
light, rem och efficiency — annars hade "Sleep Score 82" blivit 82 minuters
sömn.

**Två filer fyller samma dygn.** `slåIhopHälsa` matchar på dagen och låter ett
ifyllt värde vinna över ett tomt, oavsett vilken post det kom från — samma
regel som mätningarna, och av samma skäl: en rak spread tog en gång bort en
vikt som redan fanns.

**READINESS RÖRS INTE.** Posterna visas och sparas; de räknas inte in i något
tal. Att börja väga in sömn i en siffra användaren redan känner igen är ett
eget beslut, och det tas inte i tysthet av en importfunktion. Ett testfall
kräver att motorn inte exporterar något readiness-namn, så den dagen någon
lägger till det syns det.

**HELA ZIPEN PÅ EN GÅNG.** Garmins export är en zip med hundratals filer.
`engines/zip.js` läser den i webbläsaren UTAN bibliotek — `DecompressionStream`
("deflate-raw") finns i Chrome sedan 103 och Node sedan 18, kontrollerat i båda
här. Ett bibliotek för det plattformen redan gör är 100 kB att ladda, uppdatera
och granska.

Läsaren går bakifrån, som formatet kräver: slutposten pekar ut den centrala
katalogen, katalogen pekar ut varje fil. Det LOKALA huvudet läses om innan
uppackningen — dess namn- och extrafält har andra längder än katalogens, och
hoppar man över det landar man mitt i filnamnet i stället för i datan. Zip64,
kryptering och andra metoder än deflate stöds inte och säger ifrån i stället för
att ge en tom fil.

`intressantFil()` sållar på namn innan uppackningen (sleep, hrv, rest, wellness,
uds, summar, daily) — medvetet generöst: hellre öppna en fil som visar sig tom
än missa den som bär värdena. **Varje läst fil redovisas** med hur många dagar
den gav, för frågan efter en halvlyckad import är alltid "läste den min fil?".

**INTE VERIFIERAT MOT EN RIKTIG EXPORT.** Fixturen i `halsa-zip.test.jsx` är en
RIKTIG zip (byggd av Pythons zipfile, inbakad som base64, med både deflate- och
lagrade poster) — men innehållet är konstruerat efter de former vi vet
förekommer. Ingen riktig Garmin-export har passerat koden. Låses upp av: Roberts
egen export (Garmin Connect → Konto → Exportera dina data).

**DEN AUTOMATISKA VÄGEN ÄR STÄNGD, INTE GLÖMD.** Garmins Health API kräver
partnergodkännande riktat till företag; Connect IQ (en app på klockan som
skickar själv) är den enda självbetjäningsvägen och kräver Monkey C, eget SDK
och sidoladdning; Health Connect på Android går bara att läsa från en native
app. Att logga in mot Garmin Connect med användarens lösenord är avvisat — ett
lösenord till ett hälsokonto hör inte hemma i appen.

### Vägen till en installerad app som kan para

Två vägar, båda "Chrome som app", och båda byggda 2026-09-13:

**Installera appen — knappen i Mer-menyn** (`InstallKort` i `ImportSheet.jsx`,
motorn i `engines/platform.js`). Chrome skickar `beforeinstallprompt` en gång,
tidigt; `fångaInstallPrompt()` i `main2.jsx` tar det före första render, och
knappen visar Chromes egen dialog. Det som installeras är en WebAPK: en riktig
app i applådan som kör i Chrome — ingen Java, ingen nyckel, ingen APK att
sprida. Kortet säger olika saker beroende på var man är:

| Läge | Kortet |
|---|---|
| Chrome har erbjudit | knappen "Installera appen" → Chromes dialog |
| iPhone | knappen fäller ut Safaris fyra steg |
| gamla WebView-skalet | besked: öppna i Chrome, ta backup först |
| redan installerad | "Askr kör som installerad app." |
| inget erbjudande | kortet visas inte |

Ett förbrukat erbjudande ger ingen knapp förrän Chrome skickar ett nytt — det
är Chromes regel, inte vår.

**TWA:n** (`android-twa/`) — se Android-avsnittet. För den som vill ha en APK.

**Fejkad GATT i stället för riktigt band.** Både `puls.test.jsx` och
DOM-skriptet ersätter `navigator.bluetooth` med en attrapp som gör samma anrop
som ett band (requestDevice → gatt.connect → service → characteristic →
notifications) och avger riktiga Heart Rate Measurement-paket. Det prövar hela
kedjan från knapptryck till sparat pass — bara datan är påhittad, inte anropen.
**Radion är prövad 2026-09-14** — av Robert, på hans telefon, med ett Garmin
HRM 600: väljaren visade bandet och pulsen syntes i appen. Det som skripten
inte kunde bevisa är därmed bevisat på det enda sätt det går. Kvar att mäta:
om det gamla WebView-skalet exponerar Bluetooth (väntat: nej) — det spelar
mindre roll nu när installationsknappen ger en app som kör i Chrome.

## Hemvyn, övningssidan och coachen (#164–#191)

Tjugoåtta PR:er 2026-09-07 till 09-13. Kontrollerat mot koden, inte mot
commit-texterna.

### Hemvyn: kartan tar hela ytan (#164, #165, #188)

Kartan delade förut skärmen med fyra staplade element och fick hälften. Nu
ligger den i botten och hemkortet över den.

**En figur i taget, med vändning.** Mätningen styrde beslutet: två figurer sida
vid sida begränsas av BREDDEN, inte höjden — på 390 px får varje figur 183 px
och därmed 456 px höjd oavsett skärmhöjd. Helskärm med två figurer hade gett
8 % större, inte 70 %. Med en figur blir bredden 370 px och figuren dubbelt så
stor; muskelgrupperna går att träffa med ett finger. Vändknappen säger vart man
ska ("Baksidan"), inte var man är — en knapp som beskriver nuläget läses som en
etikett och trycks inte på.

**Kortet har tre lägen**, sparade i `atlas.v3.kortlage`:

| Läge | Innehåll | Höjd | Täcker av kartan |
|---|---|---|---|
| 0 minimerat | handtag + startknapp | 117 px | 16 % |
| 1 normalt | + målrad och nyckeltal | 250 px | 35 % |
| 2 uppfällt | + mål och besked | 313 px | 43 % |

Läget sparas eftersom den som drar ner vill ha det nerdraget nästa gång också —
annars måste man dra om varje gång och slutar dra. #188 gjorde dessutom
svepningen till ETT steg: tre lägen via klick betydde att ett tryck kunde gå
minimerat → halvt → helt utan att man bad om det.

### Övningssidan (#171, #172, #189)

`OvningsSida.jsx` — en utveckling av kortet i banken: bild, teknikpunkter,
belastade muskler och en YouTube-knapp som söker på `<övningens namn> proper
form` (instruktionsvideor, inte tävlingsklipp). Man bläddrar mellan övningar
med samma mönster som passets "Nästa övning". Miniatyren i listan gick från
34 till 56 px (#189) — vid 34 px syntes inte vilken övning bilden visade.

### Övningsbilderna: 8 → 58 (#173–#187)

Femton PR:er, grupp för grupp. Bröst, axlar och biceps är kompletta (11 av 11
bicepsövningar). Alla ligger i `public/ovningar/<id>.webp`, utanför appbundeln
— hela mappen är 2,4 MB. Teknikpunkterna växte från 48 till 87 övningar och
ritas som riktig text över bildens mörka fält, aldrig inbränd.

**Ett eget DOM-skript vaktar dem** (`verify-atlas2-ovningsbilder.mjs`, port
8937). Skälet är konkret: bilderna ligger utanför bundeln, så ett grönt bygge
säger ingenting om att de laddas — en `img` kan renderas med `naturalWidth 0`
utan ett enda fel i konsolen. Det har hänt en gång.

### Progressionskartan och viktkurvan (#169, #170)

`progressionskarta()` i `utveckling.js` visar alla övningar samtidigt, sorterade
på trend, med styrka eller volym som mått. Viktkurvan fick runda punkter och en
skala som inte överdriver: en halvkilos variation ska inte se ut som ett ras.

### Märkesvaror ur Open Food Facts (#168)

Livsmedelsverkets 2 679 poster har noll märkesvaror — "oatly", "nocco",
"barebells" gav alla noll träffar. OFF har 27 164 svenska produkter.

**Genom proxyn, inte direkt från appen.** OFF svarar oregelbundet och
rate-limitar globalt; proxyn (`coach-proxy/api/foods.js`) cachar fem minuter per
sökord, sätter den User-Agent OFF kräver, och ger appen ett rent svar — tomt
eller träffar — i stället för HTML-fel. Ursprungsspärr på anropet; ingen
användardata skickas utöver sökordet.

**EN OFF-VARA BÄR SINA EGNA TAL I LOGGPOSTEN.** `foodId` blir `off_…` som inte
finns i `FOOD_INDEX`, och utan egna tal hade `computeNutrition` räknat posten
som noll — exakt samma tysta bugg som skafferiet en gång hade. Posten får kcal
och makron skalade till gram, plus `source: "off"`.

Livsmedelsverket söks alltid först och fungerar offline; OFF är ett tillägg och
märks "overifierad" i listan, eftersom datan är folkbidragen.

### Coachen blev aktiv (#190, #191)

**Fyra nya nudges** i den befintliga motorn (`engines/nudges.js`), alla
händelsedrivna och självutgående, högst en åt gången:

- **Rekord** 12–36 h efter passet, bara stora lyft, bara om det finns ett
  tidigare värde att slå.
- **Frånvaro** när kartan säger att musklerna är återhämtade, inte bara att
  dagar gått. Den som vilar för att kroppen behöver det ska inte skuldbeläggas.
- **Stagnation** efter tre pass utan framsteg i ett stort lyft. Två pass kan
  vara en dålig dag; tre är ett mönster.
- **Obalans** när en muskelgrupp tränas minst tre gånger oftare än sin motpart
  på två veckor.

**Coachen kommenterar under passet** (`engines/coachKommentar.js`): ren
funktion, ett loggat set in, en mening ut — eller null. Regelbaserad och
synkron med flit, eftersom kommentaren visas under vilan; ett API-anrop hade
tagit sekunder och krävt nät på gymmet. Jämför med FÖRRA PASSETS SAMMA
SETNUMMER, inte sista setet — annars jämförs ett uppvärmningsset med förra
passets tyngsta. **Tystnad är ett giltigt svar**: ett set exakt som förra gången
ger null, inte "samma som sist".

`MAIN_LIFTS` är `[id, namn]`-PAR, inte id:n. Loopar man över paren matchar
ingenting — rekord och stagnation var helt tysta, och samma bugg fanns i
progressionskartan där "stort" aldrig slog till.

**1RM-formeln finns numera på ETT ställe** (#191): `epley1RM` i `utveckling.js`,
importerad av `index.js` och anropad av `styrkeKurva`. Den fanns i tre exemplar
som inte var överens — ett enrepsset på 100 kg blev 100 i den ena motorn och
103 i den andra. Undantaget för enrepssets är det som är rätt och det som
behölls: Epley är anpassad för flerrepsset, och den som lyfter 100 kg en gång
har ett 1RM på 100, inte 103. Ett uppskattat tal för något man MÄTT är en
påhittad siffra.

**Rekordnudgens dagsord kommer ur kalendern**, inte ur timfönstret. Den fyrar
12–36 h efter passet men skrev "i går" rakt ut, vilket inte stämde i någon ände:
ett pass 07:00 plus en app öppnad 19:30 samma dag ligger 12,5 h isär, och 36 h
efter ett kvällspass är i förrgår. `dagsord()` räknar i kalenderdygn via
`startOfLocalDay`.

### Coachen tog upp målet själv (#199)

De fem påminnelserna ovan hänger alla på KROPPEN — vad den tål, vad den hann,
var den står. Ingen av dem visste vart du är på väg. Coachen kunde läget mot
planen hela tiden (`planLäge` i `malplan.js` räknar avvikelsen varje gång
målvyn öppnas) men sa det bara till den som själv gick dit och frågade. Det är
skillnaden mellan en karta och en guide, och det var svaret på "coachen är inte
så aktiv": den var aktiv om kroppen, stum om målet.

**Tre nya påminnelser i `buildNudges`**, alla ur samma `planLäge` som coachvyn
— räknades de om här kunde hemvyn och coachvyn säga olika saker om samma plan:

- **`malpass`** när de loggade passen hamnat under planens takt. Tystnar så
  fort ett styrkepass loggats i dag: den som just tränat ska inte mötas av att
  den ligger efter. Ett sportpass räknas inte — planens pass är styrkepass,
  samma filter som `malplan.js`.
- **`malvikt`** i två skepnader, där den mer specifika vinner: ett viktdelmål
  inom två dagar är en deadline, en saknad eller för gammal vägning är ett
  underlagsproblem. Motorns eget skäl skrivs ut ordagrant ("senaste vägningen
  är för gammal — väg dig"), aldrig en extrapolerad kurva.
- **`malslut`** när måldatumet passerat — och då sägs inget annat om planen.
  En avvikelse mot en kurva som tagit slut är ingen åtgärd.

**Rangordningen ändrades:** protein, sedan MÅLET, sedan kroppen. Målet slår
frånvaro med flit. Båda säger "träna", men "2 pass efter planen mot Ner 5 kg"
är ett skäl medan "fyra dagar sedan senaste passet" är en observation.

**ETT UNDERSKOTT MAN INTE KAN TA IGEN ÄR SKULD, INTE ETT BESLUT.**
`passAvvikelse` räknas från resans start och växer varje missad vecka. "20 pass
efter planen" är sant men bryter regel 3 i `nudges.js` — en påminnelse ska gå
att åtgärda direkt, och tjugo pass gör ingen ikapp. Vid mer än två veckors
glapp byter påminnelsen därför både text och mål: takten man satte är inte den
man har, och det åtgärdbara är planen, inte dagens pass.

**Riktningen på vikten sägs inte i nudgen.** Om en vikt över kurvan betyder
före eller efter beror på om resan går upp eller ner, och den tolkningen bor i
`målfokus` (`facts.js`). Att upprepa den i nudges hade varit en andra sanning
om samma tal — påminnelserna håller sig till det som är entydigt oavsett
riktning: att ett pass saknas, att en vägning saknas, att ett datum är nära
eller passerat.

Ett eget testfall monterar hela `App2` med ett riktigt mål i lagringen och
läser texten ur DOM:en. Motorn kan vara rätt och vägen fram ändå bruten —
`nutritionTargets` fanns i motorn långt innan någon vy skickade in det.

### Hemvyns besked blev en daglig rad (#200)

`todaysMessage` läste av readiness och inget annat: "Quadriceps och bröst är
redo för belastning." Sant varje dag, och därför **samma** varje dag. Den som
öppnade appen efter ett pass, på en vilodag och efter en vecka utan träning
möttes av samma mening i alla tre lägena.

Funktionen flyttade till `engines/dagsbesked.js` som `dagensBesked` och läser
nu hela historiken, inte bara kartan. Fyra lägen, mätta i webbläsaren:

| Läge | Vad som står |
|---|---|
| Tränat i dag | `Passet är loggat: 14 set, 11 200 kg. Pectoralis Major och Triceps Brachii jobbar nu.` |
| Sportpass i dag | `Passet är loggat. Quadriceps och Hamstrings jobbar nu.` |
| Tränat i går | `I går: Push A. Triceps Brachii och Pectoralis Major är redo i dag.` |
| Två dagar eller mer | `3 dagar sedan senaste passet. Triceps Brachii och Gluteals är redo.` |

Tomt underlag är oförändrat ("Ingen historik än…") — `verify-atlas2.mjs`
bevakar just den meningen.

**Läget "tränat i dag" nämner inte readiness.** Kartan ovanför visar den redan
i färg, och siffran är i rörelse resten av dygnet. **Nästa pass i programmet
nämns inte heller** — det står redan under startknappen som "Föreslaget: …",
och en coach som upprepar skärmen är brus.

**`empty` sätts bara när det inte finns EN muskel med underlag.** Flaggan styr
startknappens text ("Starta första passet"), så en vilovecka får inte sätta
den. Eget testfall.

**`sessionVolume` finns i två moduler och betyder olika saker.** `store.js`
summerar vikt × reps och ger KILO; `index.js` summerar `muscleLoads` och ger en
LAST utan enhet. Samma namn, två storheter — hämtas kilona ur fel modul blir
"3 200 kg" ett lasttal, och ingenting ser trasigt ut. Ett testfall låser att
beskedet räknar i kilo.

**Ingen höjd kostade det.** Kartan är fortfarande 545 px på SE (mätt före och
efter), eftersom beskedet delar plats med påminnelsen och hemkortet redan
scrollar internt.

### Coachen i passet: förra passet före, summan efter (#201)

Två luckor i passvyn, båda i samma mönster: siffrorna FANNS i `live`-posten men
visades aldrig.

**Före första setet står nu förra passets set:** `Sist: 80 kg × 8, 8, 7`
(`förraPassetRad` i `coachKommentar.js`). Coachen jämförde redan mot dem vid
varje loggat set, men den som stod vid stången och skulle välja vikt fick ett
förslag utan att se vad förslaget byggde på.

Formen följer datan: nästan alla set körs på samma vikt, och då skrivs vikten
en gång och repsen för sig. Skiljer vikterna sig skrivs de ut par för par
(`Sist: 60×10 · 80×8 · 90×6`). Kroppsvikt räknas i reps — `0 kg × 12` vore en
nolla som ser ut som en mätning. Över sex set kortas raden med `+N`; en rad som
wrappar kostar riktigt i den enda vy som måste rymmas utan scroll.

**Efter sista setet i en övning byter coachen nivå** och sammanfattar hela
övningen: `Övningen klar: 1 920 kg, 80 kg mer än förra passet.` — eller
`— exakt som förra passet`. Tystnadsregeln är oförändrad DÄR DEN GÄLLER: den
handlar om ett SET, och ett set som är som förra gången är ingen nyhet. Totalen
är en annan sak, den står ingenstans på skärmen, och "lika mycket som sist" är
ett svar på frågan man bär med sig. Kroppsviktsövningar ger noll volym och
faller igenom till setjämförelsen i stället för att påstå `0 kg`.

**PASSVYN HAR NOLL SLACK — OCH DET KOSTADE TVÅ VARV ATT LÄRA SIG.**

Första försöket gav raden en EGEN plats under stegarna och betalade för den
med fyra nerskruvade marginaler (22→14, 10→7, 12→10, 18→14). Lokalt mätte det
`över 0`. **I CI sprack det: `SE pass scroll +8 px`.** CI kör riktig Google
Chrome med andra fonter och mäter genomgående några pixlar högre än en
utvecklingsmaskin — kartan 543 mot 545, coachvyn +48 mot +27, kvittot +261 mot
+252. Marginaler som räcker lokalt räcker alltså inte där, och en vy utan slack
går inte att lägga något i.

Lösningen är att raden inte tar någon ny plats alls: **den delar slot med
progressionsnoten** (`it.förslag`). Före första setet står `Sist: …` där; sedan
tar noten över. De säger samma sak på två sätt ("Öka lätt." mot "Sist: 80 kg ×
8, 8, 7"), och den konkreta vinner i just det ögonblick man ska välja vikt —
den föreslagna vikten står redan i stegaren. Marginalerna är därmed
**återställda till sina gamla värden**, och passvyns höjd är oförändrad.

**Vilovyn scrollade +70 px så fort coachen sa något** — "Hoppa över vilan"
hamnade under skärmkanten. Det var sant redan när coachraden byggdes (#190),
men raden syntes sällan; nu talar coachen efter varje avslutad övning och
fallet blev det vanliga. Vilotimern krymper därför till 108 px när coachen har
något att säga (168 px annars), och raden fick 330 px bredd så den wrappar en
rad mindre. Storleken hänger på raden, inte på tiden, så ringen ändrar aldrig
storlek mitt i en vila. Mätt: +70 → 0 px lokalt.

**Vilovyns höjd mäts men fäller inte bygget** — samma hållning som kvittot i
layoutvakten, och av samma skäl: höjden beror på hur lång coachens mening blev,
och en mening som wrappar en rad extra i CI vore ett rött bygge utan att något
blivit sämre. Det som LOVAS är att "Hoppa över vilan" går att nå utan scroll.

`Ring` skalar numera ALLT med storleken. Graden 40 och tjockleken 8 var
hårdkodade och stämde bara för 168 px; med fast grad hade `00:00` runnit utanför
sin egen cirkel. Andelarna är de gamla talen delade med 168, så den stora ringen
är pixelidentisk med förut.

**`verify-atlas2-pass.mjs` (port 8932) fick sju nya löften** på en egen
SE-sida med seedad historik: raden före första setet, att passvyn ryms med den,
tystnad på set 1 och 2, summan på sista setet, vilovyns höjd (mätt, inte lovad)
och att "Hoppa över vilan" syns utan scroll. Historiken seedas i lagringen — ett helt
föregående pass genom knappar är dussintals klick, och det som prövas är vyn.
Det seedade passet har MEDVETET inget `workoutId`: med ett sådant väljer
`nextWorkout` pass 2, vars första övning saknar historik, och då mäter man
ingenting.

**Kvar att mäta:** puls + coachrad samtidigt på SE ger fortfarande scroll. Det
var ~104 px före den här ändringen, så det är strikt bättre — men det är inte
noll, och det står här för att det inte ska upptäckas som en nyhet.

**Läxan är värd att behålla:** mät i CI, inte bara lokalt. Skillnaden är liten
och konstant, men i en vy utan slack är liten och konstant precis det som
avgör.

## Matloggen bakåt i tiden

Matvyn var låst till dagens datum: `foodLog` filtrerades på `idag(e.ts)` och
varje loggväg stämplade `Date.now()`. Man kunde alltså rätta VAD man ätit men
aldrig NÄR — och den som glömde logga en dag kunde inte fylla i den i efterhand.

**Redigeringen fanns redan.** Namn, gram, kcal, måltidstyp, skalning och
radering låg på plats i `FoodView.jsx`. Det som saknades var enbart tiden. Att
bygga en "redigeringsfunktion" hade blivit en andra väg till samma sak.

Dagen väljs i RUBRIKRADEN över måltidslistan (`valdDag`, `null` = idag) — inte
på en egen rad överst, vilket kostade 52 px och gjorde matvyn 31 px för hög för
iPhone SE. Dagen är rubriken, inte en etikett ovanför den. Framåt är avstängt
på idag — framtida måltider loggas inte.

**Pilarna går EN DAG I TAGET** (ändrat i #167). Först hoppade de till närmaste
dag med loggning, för att slippa stega genom en tom vecka. Robert: "när jag
försöker backa i matloggen så hoppar den över dagar där det inte är loggat
något". Det gjorde två saker omöjliga — man såg inte vilka dagar man missat,
och man kunde inte logga i efterhand på en tom dag eftersom man aldrig kom dit.
`dagarMedLogg` används fortfarande, men till att MARKERA dagar med loggning
(en prick under datumnamnet); utan den ser en tom dag likadan ut som en dag man
inte hunnit fram till.

**Klockslaget följer med, dygnet byts** (`stämplaDag` i `foodlog.js`). Det är
inte kosmetika: `måltidAvTid()` härleder frukost/lunch/mellanmål/middag ur
timmen. Med midnatt som stämpel hade allt man loggar i efterhand blivit frukost,
och grupperingen blivit obrukbar för just de dagar man rättar.

**En enda omstämpling täcker alla sju loggvägar.** Snabbloggen, sökningen,
skafferiet, recepten, streckkoden, fotot och akuten går alla genom `onLägg` →
`lägg`. Omstämplingen sitter där, inte i varje väg — nästa loggväg som byggs
ärver beteendet utan att veta om det.

**Flytt i tiden** (`flyttaPost`) ligger i redigeringspanelen: datum + tid, med
`max` på dagens datum. Går formatet inte att tolka returneras posten oförändrad
— en felskriven tid ska inte kunna kasta en måltid till 1970.

**Dygnsbegreppet fanns i två exemplar.** `sammaDag` i `store.js` och `sammaDygn`
i `foodlog.js` var två implementationer av samma sak. De råkade vara överens,
men dagsväljaren BYGGER på att de är det: filtreras listan på ett dygnsbegrepp
och summeras totalerna på ett annat, hamnar poster i listan som inte finns i
summan. `store.js` importerar nu funktionen i stället för att upprepa den.
