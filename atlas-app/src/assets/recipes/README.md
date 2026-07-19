# Receptbilder

Här läggs riktiga foton till recepten. **Filen ska heta samma sak som receptets id.**

```
src/assets/recipes/r_oat_berry.jpg      → Proteingröt med blåbär
src/assets/recipes/r_chicken_rice.webp  → Kyckling med ris och broccoli
```

Det är allt. Ingen kod behöver ändras: appen letar automatiskt efter en bild med
receptets id och använder den i stället för den genererade SVG-identiteten. Saknas
en bild faller receptet tillbaka på SVG:n, så banken kan fyllas på i valfri takt —
ett foto i taget.

Stödda format: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`

## Att tänka på

- **Storlek.** Bilderna bakas in i single-file-bygget som base64, vilket gör filen
  ca 33 % större än originalet. Håll varje bild under ~80 kB (t.ex. 600×450 webp,
  kvalitet ~75) — 24 sådana ger ungefär +2,5 MB. Bilder i full kamerastorlek gör
  bygget oanvändbart tungt.
- **Format.** `.webp` ger klart minst filstorlek vid samma upplevda kvalitet.
- **Beskärning.** Bilderna visas kvadratiskt (`object-fit: cover`), så motivet bör
  ligga mitt i bild.
- **Rättigheter.** Använd bara bilder du får använda — egna foton, eller bilder med
  licens som tillåter det.

## Alternativ: extern URL

Ett recept kan också peka på en bild som ligger någon annanstans, via fältet
`image` i `src/data/recipes.js`:

```js
{ id: "r_oat_berry", name: "Proteingröt med blåbär", image: "https://…/grot.webp", … }
```

Det håller bygget litet, men bilden kräver internet och syns alltså inte offline i
PWA:n. Filer i den här mappen fungerar offline.
