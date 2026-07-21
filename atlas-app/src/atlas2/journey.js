// Flyttad till engines/journey.js.
//
// Konceptet kräver att coachens faktakälla ligger i motorlagret, inte i en
// enskild apps mapp — annars kan inte nuvarande appen och 2.0 dela den.
// Den här filen finns kvar som återexport så att inget behöver skrivas om.
export * from "../engines/journey.js";
