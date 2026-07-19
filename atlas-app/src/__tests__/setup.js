// Motorerna laddar data som gate:ar på `typeof window` (browser). I test måste window finnas
// innan data/index.js utvärderas, annars byggs inte FOOD_INDEX från Livsmedelsverket-datan.
globalThis.window = globalThis.window || {};
