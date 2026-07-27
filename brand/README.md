# Varumärkesmaterial (ASKR)

Källmaterial för Askrs varumärke. **Ingår aldrig i bygget** — det här är
redigerbara original, inte det appen laddar.

## Var ligger vad

| Plats | Innehåll |
|---|---|
| `brand/logo/` | Logotyp-original (vektor, hög upplösning) |
| `brand/app-icons/` | Original till app-/PWA-ikoner före export |
| `brand/guide/` | ASKR Brand Guide (regler, färger, avstånd) |
| `brand/mockups/` | Mockups och presentationsbilder |
| `atlas-app/src/assets/brand/logo/` | **Optimerade** logotyper som appen importerar (SVG eller WebP) |
| `atlas-app/src/assets/brand/images/` | Övriga optimerade varumärkesbilder appen importerar |

Regeln är enkel: **källmaterial här i `brand/`, optimerat i
`atlas-app/src/assets/brand/`.** Bara det optimerade når appen.

## Namnkonvention (ASKR Brand Guide v1.0)

Varje variant är en **egen fil**:

- `askr-symbol` — enbart märket (A:et)
- `askr-wordmark-horizontal` — ordbild liggande
- `askr-wordmark-stacked` — ordbild staplad
- `askr-primary-dark` — primärlogotyp för mörk bakgrund
- `askr-primary-light` — primärlogotyp för ljus bakgrund
- `askr-mono-white` — enfärgad vit

## Orubblig regel

**Logotypen roteras, skevas eller färgläggs aldrig om.** Använd de färdiga
varianterna ovan — skapa aldrig egna genom att transformera en befintlig.

## Bygget (för den som importerar härifrån)

Vite-configerna sätter `assetsInlineLimit` som en funktion:

```js
assetsInlineLimit: (filePath) =>
  /assets[\\/]brand[\\/]/i.test(filePath) || !/\.(webp|png|jpe?g|avif)$/i.test(filePath),
```

Regeln går på **roll, inte filformat**:

> Identitet bäddas in i bygget. Innehåll ligger utanför.

Det gäller **bara filer appen importerar** ur `src/assets/`:

- **Allt under `src/assets/brand/`** bäddas in i HTML:en oavsett format. De ÄR
  appen och ska aldrig hinna blinka förbi som textfallback medan en separat fil
  laddas — eller utebli helt om den inte hittas.
- **Övriga rasterbilder** (receptfoton, startsidans fotografier) emitteras som
  separata filer. De är innehåll och degraderar snyggt.
- **SVG och allt som inte är rasterbild** inlinas som förut.

Priset för inbäddning: servicearbetaren kan inte cacha filerna separat, och
HTML:en växer. `dist-atlas2/atlas2.html` gick 1 177 → 1 385 kB (gzip 268 → 428)
när de fem identitetsfilerna bäddades in.

**Importeras filen inte av något som faktiskt renderas skakas den bort** —
Rollup tar inte med död kod. Det hände `askr-symbol.webp`: den importerades av
`brand.jsx` i en variant som inget bygge ritade, så den nådde aldrig någon
HTML. Importen är borttagen och src-kopian raderad.

**Symbolen ligger därför bara i `atlas-app/public/`**, och används som favicon
av `atlas2.html`, landningssidan och testarsidan. Den ska INTE återskapas under
`src/assets/brand/` förrän något faktiskt renderar den — två kopior av samma
fil kan glida isär, och den som inte importeras skickas ändå inte med.

`brand/` i repo-roten rör aldrig bygget.
