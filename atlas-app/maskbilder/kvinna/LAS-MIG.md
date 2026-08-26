# Maskbilder — kvinnofiguren

Källmaterialet som `body_regions_female.json` och `figur-kvinna-{fram,bak}.webp`
är byggda ur. Komplett: elva regioner per vy plus två basbilder, alla
1254×1254.

De levererades i en zip tillsammans med den färdiga kartan och committades
aldrig — kartan låg i repot medan det den byggts av inte gjorde det. Hade en
muskel behövt rättas fanns ingenting att köra om skriptet på. Nu finns det.

## Regioner

| Vy | Regioner |
|---|---|
| Fram | adductors, biceps_brachii, deltoids, forearms, obliques, pectoralis_major, quadriceps, rectus_abdominis, serratus_anterior, tibialis_anterior, trapezius |
| Bak | calves, deltoids, erector_spinae, forearms, gluteals, hamstrings, latissimus_dorsi, rotator_cuff, teres_major, trapezius, triceps_brachii |

Samma uppsättning som mansfiguren, och `atlas2-kvinnokarta.test.js` kräver att
det förblir så. Läggs en region till hos den ena måste den andra få samma.

## Köra om

```bash
cd atlas-app
python3 scripts/masker-till-regioner-kvinna.py maskbilder/kvinna ut
```

Kräver `pillow`, `numpy`, `scipy`, `potracer`. Utdata hamnar i `ut/`:
`body_regions_female.json`, de två webp-basbilderna, städade masker för
granskning och `report.json` med yta, komponenter och `silhouette_drift` per
region.

Skriptet läser ramen ur framsidan och beskär BÅDA vyerna med samma ruta. Det
fungerar här eftersom alla filer är lika stora — men det klagar inte om de inte
är det, så kontrollera måtten innan en ny bild läggs till.

## Känd avvikelse

Lats-masken når till bh-kanten, inte hela vägen upp till armhålan. Noterat vid
leveransen och bedömt som tillräckligt. Ska det rättas är det den här mappen
man ändrar i.
