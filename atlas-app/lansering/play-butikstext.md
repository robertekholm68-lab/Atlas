# Google Play — färdig butikstext

Klipp och klistra in i Play Console. Fälten heter som rubrikerna nedan.

Allt här är skrivet mot vad appen **faktiskt gör i dag**. Butikstext som lovar
mer än appen håller är samma fel som en coach som hittar på en siffra — och
Play tar dessutom bort appar för det.

---

## Appnamn (max 30 tecken)

```
Askr – fråga kroppen
```

*20 tecken. Alternativ om du vill ha bara namnet: `Askr`.*

---

## Kort beskrivning (max 80 tecken)

```
Muskelkartan visar vad kroppen tål idag. Styrketräning utan påhittade siffror.
```

*78 tecken.*

---

## Fullständig beskrivning (max 4000 tecken)

```
Askr är en svensk styrketräningsapp som bygger på en enkel tes: kroppen är
gränssnittet.

I stället för en lista med pass möts du av en muskelkarta. Den färgas av det du
faktiskt loggat — grönt där du är återhämtad, rött där du inte är det. Tryck på
en muskel så ser du varför den ser ut som den gör.

ÄRLIGHET FÖRE SIFFROR

De flesta träningsappar visar ett tal oavsett om de har underlag för det. Askr
gör inte det. Har du loggat två pass säger appen att den har för lite att gå på,
i stället för att räkna fram en beredskapssiffra som låter exakt. Coachen ger
allmänna råd ändå — det är diagnosen som utelämnas, inte hjälpen.

DIN DATA STANNAR I DIN TELEFON

Inget konto. Ingen inloggning. Ingen server som lagrar din träning. Jag kan inte
se vad du tränar, vad du väger eller vad du äter. Du kan exportera allt till en
fil när du vill.

DET HÄR FINNS I APPEN

• Muskelkarta med återhämtning per muskel, byggd på din egen loggning
• Pass med set, vikter och reps — och viktförslag ur din historik
• En coach som tar initiativ: säger till när du ligger efter din plan, när en
  vägning saknas och när en övning stått still i tre pass
• Coachen kommenterar under vilan: vad du lyfte förra gången, och övningens
  summa mot förra passet när den är klar
• 160 övningar — 87 med teknikpunkter, 58 med bild
• Färdiga program, eller bygg ett eget
• Matlogg med 2 679 livsmedel ur Livsmedelsverkets databas, plus märkesvaror ur
  Open Food Facts
• 276 recept, veckomeny och inköpslista
• Mål med datum, delmål och en målresa coachen väger in i varje beslut
• Sport och kondition — löpning, innebandy, kampsport och mer
• Pulsband över Bluetooth
• Import av sömn, vilopuls och HRV ur en exportfil från Garmin, Polar eller
  Apple Hälsa
• Röstloggning: säg "åttio åtta" mellan seten
• Fungerar offline

FÖR VEM

För dig som redan tränar och vill veta vad kroppen tål i dag — inte för dig som
vill ha en app som hejar. Askr är på svenska, och byggd för gymmet: stora
knappar, inget som kräver att du letar mellan seten.

Appen är under aktiv utveckling. Hittar du något som är fel eller som låter
tvärsäkert utan täckning vill jag veta det.
```

*2 127 tecken.*

---

## Kategori och märkning

| Fält | Värde |
|---|---|
| Kategori | Hälsa och fitness |
| Taggar | Träning, Styrketräning, Gym |
| Innehållsklassificering | Alla (formuläret ger den; inga köp, inget användarskapat innehåll som delas) |
| Annonser | Nej |
| Köp i appen | Nej — tills betalningen finns |
| Integritetspolicy | `https://robertekholm68-lab.github.io/Atlas/integritet.html` |

---

## Datasäkerhetsformuläret

Play frågar vad appen samlar in och delar. Svaren, med stöd i koden:

| Fråga | Svar |
|---|---|
| Samlar appen in data? | **Ja** — men bara det som listas nedan, och bara när användaren själv gör något |
| Delar appen data med tredje part? | **Ja** — frågor, foton och streckkoder skickas till Anthropic för att coachen ska kunna svara |
| Krypteras data i transit? | **Ja** (HTTPS genomgående) |
| Kan användaren begära radering? | **Ja** — all data ligger lokalt och raderas genom att appens data rensas |

Datatyper att kryssa i:

- **Foton** — insamlas, delas, valfritt. Syfte: appfunktion (tolka måltid eller maskin).
- **Hälsa och träning** — insamlas, delas, valfritt. Syfte: appfunktion (coachens svar bygger på härledda siffror).
- **Övrig användargenererad text** (frågan du skriver till coachen) — insamlas, delas, valfritt. Syfte: appfunktion.
- **Appaktivitet / diagnostik** — kryssa INTE i. Appen har ingen analys och ingen kraschrapportering.
- **Namn, e-post, kontakter, plats, ekonomi** — kryssa INTE i.

Motivera gärna i fritextfältet: *"Data lagras lokalt på enheten. Det som skickas
går till Anthropics API för att generera coachens svar och sparas inte av
utvecklaren."*

---

## Grafik som behövs

| Vad | Krav | Status |
|---|---|---|
| Appikon | 512×512 PNG | **Klar** — `lansering/play-ikon-512.png` |
| Utvald bild | 1024×500 | **Saknas** — säg till så gör jag en |
| Telefonskärmbilder | Minst 2, helst 4–8, 16:9 eller 9:16 | **Saknas** — ta dem i appen |

**Om appikonen.** `public/atlas-icon-512.webp` och `-mask.webp` har en rundad
platta med skugga **inbakad i bilden**. Google rundar hörnen själv, både i
butiken och på hemskärmen — en inbakad platta ger då en platta i en platta med
dubbel skugga. Play-ikonen är därför gjord på nytt ur `public/askr-symbol.webp`:
full yta, appens svärta ut i kanten, märket på 66 % av bredden och optiskt lyft
sex pixlar eftersom det är tyngre nedtill.

Förslag på skärmbilder, i den ordning som säljer bäst:

1. Hemvyn med muskelkartan färgad
2. Pågående pass med vikt och reps
3. Muskeldetaljvyn — varför en muskel ser ut som den gör
4. Coachens rekommendation med skälen utfällda
5. Matvyn med dagens ring
6. Utveckling med styrkekurvan

Kör dem i **riktigt läge med riktig data**, inte demoläget. Demodatan är påhittad,
och en skärmbild av påhittade siffror i butiken är precis det appen säger sig
inte göra.
