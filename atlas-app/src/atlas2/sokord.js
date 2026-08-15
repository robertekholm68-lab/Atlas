// Svenska sökord för engelska övningsnamn.
//
// Övningsbanken är engelsk ("Barbell Bench Press") medan resten av appen är
// svensk. Utan den här bryggan ger "bänk" noll träffar, vilket är det första en
// svensk användare skriver.
//
// DELAD MELLAN VYERNA. Låg först bara i ExerciseBank, och när bygg-eget fick en
// egen övningssökning gav "bänk" noll träffar där. Två sökningar över samma data
// måste förstå samma ord, annars beror svaret på vilken väg man gick in.

const SÖKORD = [
  [/bench press/i, "bänkpress bänk press bröst"],
  [/squat/i, "knäböj böj ben"],
  [/deadlift/i, "marklyft mark lyft rygg"],
  [/row/i, "rodd rodda rygg"],
  [/curl/i, "curl biceps armar"],
  [/press/i, "press"],
  [/pull-?up|chin-?up/i, "chins pullups räck"],
  [/lat pulldown/i, "latsdrag drag rygg"],
  [/lunge/i, "utfall ben"],
  [/dip/i, "dips triceps"],
  [/fly|flye/i, "flyes bröst"],
  [/raise/i, "lyft"],
  [/extension/i, "extension sträck"],
  [/calf/i, "vad vader"],
  [/plank/i, "planka bål"],
  [/crunch|sit-?up/i, "situps mage bål"],
  [/hip thrust/i, "höftlyft säte"],
  [/shrug/i, "shrugs axlar trapezius"],
  [/overhead/i, "axelpress över huvudet"],
  [/leg press/i, "benpress"],
  [/pushup|push-?up/i, "armhävning armhävningar"],
];

/** Extra sökord för en övning, eller tom sträng. */
export function sökordFör(namn) {
  return SÖKORD.filter(([re]) => re.test(namn)).map(([, ord]) => ord).join(" ");
}
