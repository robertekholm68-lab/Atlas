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
assetsInlineLimit: (filePath) => !/\.(webp|png|jpe?g|avif)$/i.test(filePath),
```

Det gäller **bara filer appen importerar** ur `src/assets/`:

- **WebP/PNG/JPG/AVIF** emitteras som separata filer (inlinas inte — håller
  HTML-filerna små).
- **SVG** (och allt som inte är rasterbild) **inlinas i HTML**. En liten
  symbol-SVG är rätt att inlina; en tung SVG sväller HTML — exportera då WebP
  i stället.

`brand/` i repo-roten rör aldrig bygget.
