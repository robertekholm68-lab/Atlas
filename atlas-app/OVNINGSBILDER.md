---
name: atlas-exercise-images
description: Lägg in övningsbilder i Askrs övningsbank. Använd när Robert skickar foton på övningar och vill ha dem inlagda, när en bild ska bytas ut, eller när frågan gäller vilka övningar som saknar bild eller teknikpunkter. Täcker beskärning, registrering och skrivandet av teknikpunkter ur domänkällor. Aktuell status per muskelgrupp står i projektfilen `bildbank.md`, inte här.
---

# Övningsbilder i Askr

Robert genererar bilderna själv i ChatGPT och skickar dem. Claude beskär,
registrerar och skriver teknikpunkter. Ingen bildgenerering sker här.

**Den här skillen beskrev tidigare en helt annan process** — 16:9 diptyker med
start/slut sida vid sida, genererade via Higgsfield MCP med ATLAS-karaktären som
element. Tre sådana bilder finns kvar i banken (`db_row`, `seated_cable_row`,
`t_bar_row`, silverfigurer mot orange bakgrund) och bör göras om när tillfälle
ges. Allt annat följer formatet nedan.

## Formatet

Stående foto, mörkt gym, en person i svarta kläder, en enda pose. Ingen text i
bilden — den ritas av appen.

**Bildens nederdel är ett textfält.** Beskärningen behåller 340 px under
motivets sista ljusa pixel, och appen ritar teknikpunkterna där med CSS. Det är
inte dekoration: utan textfält hamnar punkterna över kroppen, och utan
teknikpunkter visas ett tomt mörkt fält som ser trasigt ut.

## Beskär och spara

```python
from PIL import Image
import numpy as np, os

im = Image.open(källa).convert("RGB")
a = np.array(im); rad = (a.sum(axis=2) > 200).sum(axis=1)
sista = max(i for i, v in enumerate(rad) if v > 30)   # nedersta ljusa raden
im = im.crop((0, 0, im.width, min(im.height, sista + 340)))
b = 760; im = im.resize((b, int(b * im.height / im.width)), Image.LANCZOS)
im.save(f"public/ovningar/{exId}.webp", "WEBP", quality=82, method=6)
```

Ger 25–45 kB per bild. **Beskär efter motivet, inte på fast höjd** — de
uppladdade bilderna har 40–55 % tomrum nedtill och motivet slutar olika högt.

## Två steg, båda krävs

1. Filen till `public/ovningar/<exId>.webp`
2. Id:t i `MED_BILD` i `src/data/exerciseImages.js`

Missar man det andra visas bilden aldrig. Ett testfall i
`atlas2-ovningsbilder.test.js` kontrollerar att varje registrerat id har en fil
och tvärtom.

## Teknikpunkter innan bilden läggs in

Kontrollera alltid `TEKNIK_CUES` i `src/data/exercises.js`. Saknas posten:
skriv den först, annars visas bilden med tomt textfält.

Fyra punkter, en mening var, i utförandeordning. Skrivna ur domänkällorna —
styrkelabbet.se, muscles.se, gymgrossisten.com, privatetrainingonline.se,
mathiaszachau.com — **parafraserat, aldrig ordagrant**. Källorna anges i en
kommentar ovanför posten, tillsammans med *varför* punkterna ser ut som de gör.

Leta efter det källorna är ENIGA om, och lägg det tidigt. Exempel:

- Sidolyft: led med armbågarna, stanna vid axelhöjd, skuldrorna ner. Sex källor,
  samma tre saker.
- Lutande press: 30–45 graders bänkvinkel. Över det tar främre deltoideus över.
- Pec deck och maskinpress: sitshöjden avgör om arbetet hamnar i bröstet eller
  axlarna.
- Flyes: armbågsvinkeln låses. Böjer och sträcker man blir det en press.

**Lägg aldrig till en muskel som källorna inte stöder.** Triceps pushdown fick
en gång `deltoid_anterior 0,3` och `forearms 0,3` inskrivna — källorna säger
uttryckligen att den är en renodlad isolationsövning och att känsla i bröst
eller rygg betyder att tekniken brustit. Ett testfall vaktar det nu.

## Identifiera rätt övning

Matcha mot listan över övningar som SAKNAR bild i den aktuella gruppen, inte mot
hela banken. Lägg fram tolkningen innan du bygger när något är tveksamt — det
har fångat fel en gång och bekräftat rätt flera.

**Rörelsebanan definierar övningen, inte kroppsvinkeln.** En decline-maskinpress
kan ha upprätt ryggstöd; det som gör den till decline är att handtagen sitter
vid nedre bröstet och armarna går framåt och nedåt. Samma logik som pec deck.

## Efter varje omgång

```
npm test                          # testgolvet räknar om
npx eslint src
npx vite build --config vite.atlas2.config.js
```

Verifiera sedan i webbläsare:

```
node scripts/verify-atlas2-ovningsbilder.mjs Shoulders db_front_raise bb_front_raise
```

Skriptet serverar `dist-atlas2` + `public/ovningar/` över http, mäter
`naturalWidth` för varje id i `MED_BILD` och öppnar övningssidan (Pass →
Övningar → grupp → övning) för de id:n som anges, och räknar `<li>` i den
lista som ligger över den stora bilden. Ett grönt bygge säger inget om att
bilderna laddas — bara mätningen gör det.

**Känt i formatet:** på 390 px-skärm blir fyra tvåradiga punkter ~170 px
höga, textfältet 340 px blir ~160 px. Punkt 1 börjar därför 10–30 px in på
skorna. Antingen 400 px textfält eller kortare punkter — ej beslutat.

Uppdatera sedan status i `bildbank.md`.
