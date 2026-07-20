// VY: Recept & veckomenyer.
import React, { useState, useMemo } from "react";
import { T } from "../../data/tokens.js";
import { Card, CardLabel } from "../../components/common/index.jsx";
import { RECIPES, MEALS, RECIPE_THEMES } from "../../data/recipes.js";
import { FOODS } from "../../data/foods.js";
import { recipeMacros, recipeDiet, recipeAllergens, filterRecipes, generateWeekMenu, shoppingList, recipeLogEntry } from "../../engines/recipes.js";

const DIET_SV = { vegan: "Vegansk", vegetarian: "Vegetarisk", pescetarian: "Fisk", omnivore: "Kött" };
const ALLERG_SV = { lactose: "laktos", gluten: "gluten", nuts: "nötter", shellfish: "skaldjur", egg: "ägg", soy: "soja", pork: "fläsk" };
const DAY_SV = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];

// Riktiga foton: lägg en bildfil i src/assets/recipes/ som heter som receptets id
// (t.ex. r_oat_berry.webp) så används den automatiskt i stället för SVG-identiteten.
// Saknas bild faller receptet tillbaka på den genererade identiteten.
//
// Filnamnet får ha ett läsbart tillägg efter dubbelt understreck, så en bildbank går
// att bläddra i utan uppslagstabell: "g_bowl_23__bowl-med-kikartor.webp" matchar
// receptet g_bowl_23. Allt efter "__" ignoreras vid matchningen.
const PHOTO_MODULES = import.meta.glob("../../assets/recipes/*.{jpg,jpeg,png,webp,avif}", { eager: true });
export const photoIdFromFilename = name => name.replace(/\.[^.]+$/, "").split("__")[0];
const RECIPE_PHOTOS = Object.fromEntries(Object.entries(PHOTO_MODULES).map(([path, mod]) => [
  photoIdFromFilename(path.split("/").pop()), (mod && mod.default) || mod,
]));
// Vissa recept är samma rätt i praktiken — avokadomacka med och utan tomat, räkpasta
// i skål eller på tallrik. Då delar de bild i stället för att vi genererar två snarlika
// påhittade foton. Nyckel = receptet utan egen bild, värde = receptet som har bilden.
export const PHOTO_ALIASES = {
  g_snack_10: "r_avokadomacka",     // avokadomacka utan tomat
  r_shrimp_pasta: "g_bowl_07",      // räkpasta med spenat
  r_shake: "g_snack_00",            // identiska ingredienser: whey, mjölk, banan
  r_notmix_apple: "g_snack_07",     // dubblett: äpple + mandlar
  r_apple_pb: "g_snack_12",         // dubblett: äpple + jordnötssmör
  r_makrill_quinoa: "g_panna_45",   // makrill + quinoa, spenat resp. grönkål
};

export function recipePhoto(recipe) {
  if (!recipe) return null;
  const alias = PHOTO_ALIASES[recipe.id];
  return RECIPE_PHOTOS[recipe.id] || (alias && RECIPE_PHOTOS[alias]) || recipe.image || null;
}

// Genererad bild-identitet: färgtema + enkelt motiv. Väger nästan inget och funkar offline.
export function RecipeIdentity({ recipe, size = 92 }) {
  const photo = recipePhoto(recipe);
  // Bilderna ligger som separata filer bredvid appen. Öppnar någon HTML-filen ensam,
  // utan bildmappen, ska receptet falla tillbaka på den genererade identiteten i
  // stället för att visa en trasig bildikon.
  const [photoFailed, setPhotoFailed] = useState(false);
  if (photo && !photoFailed) {
    return <img src={photo} alt="" loading="lazy" onError={() => setPhotoFailed(true)}
      style={{ width: size, height: size, objectFit: "cover", borderRadius: 12, display: "block", flexShrink: 0 }} />;
  }
  const [c1, c2] = RECIPE_THEMES[recipe.theme] || RECIPE_THEMES.blue;
  const gid = `g_${recipe.id}`;
  const glyph = {
    bowl: <><path d="M14 30 Q32 52 50 30 Z" fill="#fff" opacity=".92" /><ellipse cx="32" cy="29" rx="18" ry="4.5" fill="#fff" opacity=".55" /></>,
    plate: <><circle cx="32" cy="32" r="17" fill="none" stroke="#fff" strokeWidth="2.4" opacity=".9" /><circle cx="32" cy="32" r="8" fill="#fff" opacity=".65" /></>,
    egg: <><ellipse cx="32" cy="33" rx="12" ry="15" fill="#fff" opacity=".9" /><circle cx="32" cy="34" r="5.5" fill={c2} opacity=".85" /></>,
    fish: <><path d="M16 32 Q30 20 44 32 Q30 44 16 32 Z" fill="#fff" opacity=".9" /><path d="M44 32 L52 25 L52 39 Z" fill="#fff" opacity=".75" /><circle cx="24" cy="30" r="1.8" fill={c2} /></>,
    salad: <><path d="M15 34 Q32 16 49 34 Z" fill="#fff" opacity=".85" /><circle cx="25" cy="30" r="3" fill={c2} opacity=".7" /><circle cx="38" cy="29" r="3.5" fill={c2} opacity=".55" /></>,
    shake: <><path d="M24 20 H40 L37 46 Q32 50 27 46 Z" fill="#fff" opacity=".9" /><rect x="22" y="16" width="20" height="5" rx="2.5" fill="#fff" opacity=".7" /></>,
    apple: <><circle cx="32" cy="35" r="13" fill="#fff" opacity=".9" /><path d="M32 22 Q34 16 40 16" stroke="#fff" strokeWidth="2.2" fill="none" opacity=".8" /></>,
  }[recipe.icon] || null;
  return (
    <svg viewBox="0 0 64 64" style={{ width: size, height: size, borderRadius: 12, display: "block", flexShrink: 0 }} aria-hidden="true">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} /></linearGradient></defs>
      <rect width="64" height="64" rx="12" fill={`url(#${gid})`} />
      {glyph}
    </svg>
  );
}

function MacroStrip({ m, compact }) {
  const items = [["kcal", m.kcal, T.accent.primary], ["P", m.protein + " g", T.accent.success], ["K", m.carbs + " g", T.accent.warning], ["F", m.fat + " g", T.accent.secondary]];
  return (
    <div style={{ display: "flex", gap: compact ? 9 : 14, flexWrap: "wrap" }}>
      {items.map(([lab, val, col]) => (
        <div key={lab} style={{ fontSize: compact ? 11 : 12 }}>
          <span style={{ color: T.text.muted }}>{lab} </span><span style={{ color: col, fontWeight: 700 }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function RecipeCard({ recipe, onOpen }) {
  const m = recipeMacros(recipe), allerg = recipeAllergens(recipe);
  return (
    <button onClick={() => onOpen(recipe)} style={{ display: "flex", gap: 12, alignItems: "center", textAlign: "left", background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 14, padding: 11, cursor: "pointer", width: "100%" }}>
      <RecipeIdentity recipe={recipe} size={72} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary, marginBottom: 3 }}>{recipe.name}</div>
        <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 6 }}>{DIET_SV[recipeDiet(recipe)]} · {recipe.time} min{allerg.length ? ` · innehåller ${allerg.map(a => ALLERG_SV[a]).join(", ")}` : ""}</div>
        <MacroStrip m={m} compact />
      </div>
    </button>
  );
}

function RecipeDetail({ recipe, onBack, onLog }) {
  const m = recipeMacros(recipe), allerg = recipeAllergens(recipe);
  const [logged, setLogged] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 13, padding: 0, textAlign: "left" }}>‹ Alla recept</button>
      <Card>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
          <RecipeIdentity recipe={recipe} size={88} />
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.text.primary }}>{recipe.name}</div>
            <div style={{ fontSize: 12, color: T.text.muted, marginTop: 3 }}>{DIET_SV[recipeDiet(recipe)]} · {recipe.time} min · {recipe.servings} portion{recipe.servings > 1 ? "er" : ""}</div>
          </div>
        </div>
        <div style={{ padding: "11px 13px", background: T.bg.raised, borderRadius: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 10.5, color: T.text.muted, marginBottom: 6, letterSpacing: 0.4 }}>PER PORTION · räknat ur ingredienserna</div>
          <MacroStrip m={m} />
        </div>
        {allerg.length > 0 && <div style={{ fontSize: 11.5, color: T.accent.warning, marginTop: 8 }}>Innehåller {allerg.map(a => ALLERG_SV[a]).join(", ")}.</div>}
      </Card>
      <Card>
        <CardLabel>Ingredienser</CardLabel>
        <IngredientList recipe={recipe} />
      </Card>
      <Card>
        <CardLabel>Gör så här</CardLabel>
        <ol style={{ margin: 0, paddingLeft: 18, color: T.text.secondary, fontSize: 13.5, lineHeight: 1.75 }}>
          {recipe.steps.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s}</li>)}
        </ol>
      </Card>
      {onLog && (
        <button onClick={() => { onLog(recipe); setLogged(true); }} disabled={logged} style={{ padding: "13px", borderRadius: 12, border: "none", background: logged ? T.bg.muted : T.accent.primary, color: logged ? T.text.muted : "#08101c", fontSize: 14, fontWeight: 800, cursor: logged ? "default" : "pointer" }}>
          {logged ? "✓ Loggad i matloggen" : "Logga som måltid"}
        </button>
      )}
    </div>
  );
}

function IngredientList({ recipe, scale = 1 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {recipe.i.map(ing => (
        <div key={ing.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${T.bg.raised}` }}>
          <span style={{ color: T.text.secondary }}>{ingName(ing.id)}</span>
          <span style={{ color: T.text.muted }}>{Math.round(ing.g * scale)} g</span>
        </div>
      ))}
    </div>
  );
}

const FOOD_NAMES = Object.fromEntries(FOODS.map(f => [f.id, f.name]));
function ingName(id) { return FOOD_NAMES[id] || id; }

function WeekMenu({ profile, targets, onLog }) {
  const [seed, setSeed] = useState(1);
  const [showList, setShowList] = useState(false);
  const menu = useMemo(() => generateWeekMenu({
    targets, diet: profile && profile.diet, restrictions: (profile && profile.restrictions) || [],
    dietApproach: profile && profile.dietApproach, seed,
  }), [targets, profile, seed]);

  if (!menu.hasData) return (
    <Card>
      <CardLabel>Veckomeny</CardLabel>
      <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.6 }}>
        Med dina kostval och restriktioner finns för få recept för att bygga en hel vecka{menu.missing && menu.missing.length ? ` (saknar ${menu.missing.join(", ").toLowerCase()})` : ""}. Jag hittar hellre på ingenting än sätter ihop en meny du inte kan äta — receptbanken byggs ut efterhand.
      </div>
    </Card>
  );

  const list = shoppingList(menu);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <CardLabel>Veckomeny</CardLabel>
          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={() => setSeed(s => s + 1)} style={{ padding: "6px 13px", borderRadius: 8, border: `1px solid ${T.bg.muted}`, background: "transparent", color: T.accent.primary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Ny meny</button>
            <button onClick={() => setShowList(v => !v)} style={{ padding: "6px 13px", borderRadius: 8, border: `1px solid ${T.bg.muted}`, background: showList ? T.accent.primary : "transparent", color: showList ? "#08101c" : T.text.secondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Inköpslista</button>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: T.text.muted, lineHeight: 1.55, marginTop: 8 }}>
          {targets && targets.kcal ? `Byggd mot ditt mål: ${targets.kcal} kcal och ${targets.protein} g protein per dag. Portionerna skalas för att möta målet.` : "Sätt ett näringsmål i Nutrition så byggs menyn mot dina siffror."}
          {profile && (profile.diet && profile.diet !== "omnivore" || (profile.restrictions || []).length) ? " Anpassad efter dina kostval och restriktioner." : ""}
        </div>
      </Card>

      {showList && (
        <Card>
          <CardLabel>Inköpslista · hela veckan</CardLabel>
          {list.map(g => (
            <div key={g.cat} style={{ marginBottom: 11 }}>
              <div style={{ fontSize: 11, color: T.accent.primary, fontWeight: 700, marginBottom: 5 }}>{g.cat}</div>
              {g.items.map(it => (
                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                  <span style={{ color: T.text.secondary }}>{it.name}</span><span style={{ color: T.text.muted }}>{it.grams >= 1000 ? (it.grams / 1000).toFixed(1) + " kg" : it.grams + " g"}</span>
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}

      {menu.days.map(d => (
        <Card key={d.day}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text.primary }}>{DAY_SV[d.day % 7]}</div>
            <div style={{ fontSize: 11.5, color: T.text.muted }}>{d.totals.kcal} kcal · {d.totals.protein} g protein{d.scale !== 1 ? ` · ${d.scale.toFixed(2).replace(/\.?0+$/, "")}× portion` : ""}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {d.meals.map(mm => (
              <div key={mm.meal} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 9px", background: T.bg.raised, borderRadius: 10 }}>
                <RecipeIdentity recipe={mm.recipe} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: T.text.muted, letterSpacing: 0.4 }}>{mm.mealLabel.toUpperCase()}</div>
                  <div style={{ fontSize: 13, color: T.text.primary, fontWeight: 600 }}>{mm.recipe.name}</div>
                </div>
                <div style={{ fontSize: 11.5, color: T.text.muted, textAlign: "right", whiteSpace: "nowrap" }}>{mm.macros.kcal} kcal<br /><span style={{ color: T.accent.success }}>{mm.macros.protein} g P</span></div>
                {onLog && <button onClick={() => onLog(mm.recipe, mm.servings)} title="Logga i matloggen" style={{ background: "none", border: `1px solid ${T.bg.muted}`, borderRadius: 7, color: T.accent.primary, cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "5px 8px" }}>+</button>}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function RecipesView({ profile, nutritionTargets, foodLog, setFoodLog }) {
  const [tab, setTab] = useState("recipes");
  const [meal, setMeal] = useState("all");
  const [open, setOpen] = useState(null);
  const [onlyMine, setOnlyMine] = useState(true);

  const opts = { diet: profile && profile.diet, restrictions: (profile && profile.restrictions) || [], dietApproach: profile && profile.dietApproach };
  const base = onlyMine ? filterRecipes(opts) : RECIPES;
  const shown = meal === "all" ? base : base.filter(r => r.meal === meal);
  const hidden = RECIPES.length - filterRecipes(opts).length;

  const logRecipe = (recipe, servings = 1) => {
    if (!setFoodLog) return;
    const e = recipeLogEntry(recipe, servings);
    setFoodLog(l => [...(l || []), { id: "rc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ts: Date.now(), ...e }]);
  };

  if (open) return <RecipeDetail recipe={open} onBack={() => setOpen(null)} onLog={setFoodLog ? logRecipe : null} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
      <div style={{ display: "flex", gap: 4, background: T.bg.surface, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[["recipes", "Recept"], ["menu", "Veckomeny"]].map(([k, lab]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === k ? T.accent.primary : "transparent", color: tab === k ? "#08101c" : T.text.secondary }}>{lab}</button>
        ))}
      </div>

      {tab === "menu" ? <WeekMenu profile={profile} targets={nutritionTargets} onLog={setFoodLog ? logRecipe : null} /> : (
        <>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[["all", "Alla"], ...MEALS.map(m => [m.id, m.label])].map(([k, lab]) => (
              <button key={k} onClick={() => setMeal(k)} style={{ padding: "6px 13px", borderRadius: 8, border: `1px solid ${meal === k ? T.accent.primary : T.bg.muted}`, background: meal === k ? T.accent.primary : "transparent", color: meal === k ? "#08101c" : T.text.secondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{lab}</button>
            ))}
          </div>
          {hidden > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 11.5, color: T.text.muted, background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "9px 12px" }}>
              <span>{hidden} recept passar inte dina kostval eller restriktioner{onlyMine ? " och är dolda" : ""}.</span>
              <button onClick={() => setOnlyMine(v => !v)} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{onlyMine ? "Visa alla" : "Dölj igen"}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {shown.map(r => <RecipeCard key={r.id} recipe={r} onOpen={setOpen} />)}
            {!shown.length && <div style={{ fontSize: 13, color: T.text.muted }}>Inga recept matchar det här filtret.</div>}
          </div>
        </>
      )}
    </div>
  );
}
