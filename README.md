# ATLAS

> **Kroppen är gränssnittet.**

ATLAS är en AI-driven "Digital Human Twin" för styrketräning, återhämtning, nutrition och mål.

## Live-demo

- **Desktop-app:** https://robertekholm68-lab.github.io/Atlas/
- **Mobilkompanjon (PWA):** https://robertekholm68-lab.github.io/Atlas/mobile.html

## Källkod

Appen är en modulär **Vite + React 18**-app i `atlas-app/`, som byggs till fristående single-file HTML via `vite-plugin-singlefile`.

```
cd atlas-app
npm install
npm run dev      # utveckling
npm run build    # desktop → single-file HTML
npm test         # vitest
```

### Struktur (`atlas-app/src/`)

- `data/` – designtokens, muskeltaxonomi, övningar, maskiner, livsmedel (SLV), kunskapsbank
- `engines/` – rena beräkningsmotorer: återhämtning, readiness, rekommendation, nutrition, mål, program
- `features/` – dashboard, body-map, training, programs, nutrition, goals, ai-coach, progress, calendar, profile, machines, chamber, onboarding
- `app/App.jsx` – root: state + routing
- `__tests__/` – vitest-svit

Två byggmål delar motorer: desktop (`vite.config.js`) och mobil (`vite.mobile.config.js`).

## Publicering

`docs/` innehåller de byggda HTML-filerna som publiceras via GitHub Pages. Uppdatera genom att bygga om och ersätta filerna där.
