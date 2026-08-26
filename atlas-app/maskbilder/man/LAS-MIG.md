# Maskbilder — mansfiguren

Källmaterial till muskelkartan. En basbild per vy plus en bild per region där
regionen fyllts i magenta. `scripts/masker-till-regioner-kvinna.py` tröskar
magentan, städar komponenter, spårar kanten med potrace och skriver samma schema
som `body_regions.json`.

**Filerna ligger här för att de annars går förlorade.** Kvinnofigurens masker
levererades i en zip och committades aldrig — går en muskel fel i hennes karta i
dag finns inget att köra om skriptet på. Samma misstag görs inte två gånger.

PNG, inte WebP: förlustfri WebP visade sig ändå inte vara pixelidentisk
(magentaytan 14 610 → 14 693 på `front_pectoralis_major`), och för källmaterial
där exaktheten ÄR poängen duger inte "nästan".

## Läget: OFULLSTÄNDIGT

Kartan har **elva regioner per vy**. Här finns nio. Tre saker måste lösas innan
en ny mansfigur kan ersätta den nuvarande.

**1. Fyra masker saknas.**

| Vy | Saknas |
|---|---|
| Fram | `tibialis_anterior`, `trapezius` |
| Bak | `hamstrings`, `calves` |

Baksidans masker slutar vid y ≈ 0,56 av kroppen — under sätet finns ingenting.

**2. Vyerna har olika upplösning.** Fram 1024×1024, bak 1254×1254. Skriptet
läser ramen ur framsidan (`H, W = bases["front"].shape[:2]`) och beskär BÅDA med
samma ruta, så olika mått ger fel resultat utan att något klagar. Skala om
baksidan till 1024 först, eller gör om båda i samma storlek.

Det är samma figur, kontrollerat mot silhuetten: höjd/bredd 2,29 mot 2,24 och
axelbredd/höjd 0,355 mot 0,354. Skillnaden är upplösning och ljussättning.

**3. Ersätts mansfiguren måste kvinnans karta följa med.**
`atlas2-kvinnokarta.test.js` kräver att figurerna bär exakt samma region-id:n per
vy. Det är avsiktligt — mannen är referensfiguren och redigeras först, så utan
kravet tappar kvinnan tyst en muskel. Byggs mannen om med andra regioner faller
det testet, och det är rätt beteende.

## Hur baksidans masker identifierades

De levererades med filnamn som `ChatGPT Image 26 aug. 2026 10_39_53 (7).png` och
har namngetts här. Metod: magentans läge mätt mot kroppens ram efter samma
städning som skriptet gör, sedan okulär kontroll av de tveksamma.

| Fil | Ursprung | y-läge | Hur |
|---|---|---|---|
| `back_trapezius` | (2) | 0,11–0,34 | en sammanhängande yta över mittlinjen |
| `back_latissimus_dorsi` | (3) | 0,28–0,42 | stor, två sidor, mellanrygg |
| `back_teres_major` | (4) | 0,28–0,31 | **sedd** — kilen under armhålan |
| `back_rotator_cuff` | (5) | 0,22–0,28 | **sedd** — innanför deltoiden |
| `back_deltoids` | (6) | 0,19–0,27 | **sedd** — axelkapporna |
| `back_triceps_brachii` | (7) | 0,26–0,38 | armarnas övre del |
| `back_forearms` | (8) | 0,36–0,52 | armarnas nedre del, full bredd |
| `back_erector_spinae` | (9) | 0,20–0,43 | smal mittkolumn, x 0,39–0,61 |
| `back_gluteals` | (10) | 0,43–0,56 | höftregionen |

De fem utan **sedd** är namngivna på mätning allena. Stämmer något inte: byt
namn på filen, det är hela ingreppet.

## Köra om

```bash
cd atlas-app
python3 scripts/masker-till-regioner-kvinna.py maskbilder/man ut
```

Kräver `pillow`, `numpy`, `scipy`, `potracer`. Skriptet skriver `report.json`
med yta, antal komponenter och `silhouette_drift` per region — driften är
skillnaden mellan maskbildens och basbildens siluett, och ett högt värde betyder
att bilderna inte längre ligger på varandra.
