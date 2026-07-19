# ATLAS — modulär app (Fas 0–2 av omstruktureringen)

Teknisk omstrukturering av ATLAS-prototypen. INGEN redesign, inga nya funktioner.
Beteende, design, muskel-ID:n, koordinater och beräkningar är oförändrade och testverifierade.

## Struktur
    src/
      data/  index.js (barrel) + tokens.js · muscles.js · exercises.js · foods.js · coach.js
      data/demo.js             DEMODATA — seedade exempel (tydligt separerad).
      engines/index.js         BERÄKNINGSMOTORER — rena funktioner, oberoende av rendering.
      components/common/       Card, Gauge, Stepper, useIsMobile m.m.
      components/layout/       Sidebar, DesktopLayout, MobileLayout, MobileTab.
      features/
        body-map/ dashboard/ training/ nutrition/ ai-coach/ goals/ progress/ calendar/ profile/
      app/App.jsx              ROOT — state-hub + routing.
      assets/data/             body_svgs.json, slv_food_db.json (2606), hitmap_data.json.
      __tests__/               motor-snapshots + render-tester.

## Kör
    npm install
    npm run dev      # utveckling
    npm run build    # produktion
    npm test         # motor- + render-tester

## Kvar (valfritt)
- Dela data/index.js i muscles / exercises / foods / nutrition / coach / tokens.
- Flytta state från root Atlas till providers per domän.
Lagerseparationen och testramen ovan gör dessa till mekaniska följdsteg.

## Rollback
Den gamla fungerande prototypen finns orörd i /mnt/user-data/outputs/_atlas_restore_20260711/
(atlas-prototype.jsx + .html). Öppna .html direkt eller kopiera tillbaka för att återgå.
