// ASKR COACH-PROXY
//
// Varför den här finns: appen anropar Claude, men API-nyckeln får inte ligga i
// klienten. Gör den det kan vem som helst med telefonen i handen läsa den ur
// localStorage — och ägaren betalar för allt de gör. En nyckel i en app-bundle
// är samma problem med en högre tröskel.
//
// Proxyn är medvetet DUM. Den har ingen databas, inga konton, ingen
// användardata och inget minne. Den tar emot en fråga, lägger på nyckeln, och
// skickar tillbaka svaret. Det är den minsta serverdel som löser problemet, och
// den enda som hör hemma i v1.
//
// Deploy: Vercel, projekt askr-coach. Nyckeln sätts som miljövariabel
// ANTHROPIC_API_KEY i projektets inställningar — aldrig i koden, aldrig i git.

const TILLÅTNA_URSPRUNG = [
  "https://robertekholm68-lab.github.io",
  "http://localhost:5173",
];

// Ett tak per instans. Skyddar inte mot en beslutsam angripare men fångar det
// verkliga fallet: en trasig loop i appen som annars kan kosta tusen kronor på
// en natt. Nollställs vid kallstart, vilket är gott nog för en privat alfa.
const FÖNSTER_MS = 60_000;
const MAX_PER_FÖNSTER = 20;
const räknare = new Map();

function överGräns(nyckel) {
  const nu = Date.now();
  const post = räknare.get(nyckel) || { antal: 0, start: nu };
  if (nu - post.start > FÖNSTER_MS) { post.antal = 0; post.start = nu; }
  post.antal += 1;
  räknare.set(nyckel, post);
  return post.antal > MAX_PER_FÖNSTER;
}

export default async function handler(req, res) {
  const ursprung = req.headers.origin || "";
  const tillåtet = TILLÅTNA_URSPRUNG.includes(ursprung);

  if (tillåtet) {
    res.setHeader("Access-Control-Allow-Origin", ursprung);
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(tillåtet ? 204 : 403).end();
  if (req.method !== "POST") return res.status(405).json({ fel: "endast POST" });
  if (!tillåtet) return res.status(403).json({ fel: "ursprung tillåts inte" });

  if (!process.env.ANTHROPIC_API_KEY) {
    // Säg vad som är fel i stället för att returnera ett tomt svar som appen
    // tolkar som "modellen hade inget att säga".
    return res.status(500).json({ fel: "ANTHROPIC_API_KEY saknas i miljön" });
  }

  const ip = req.headers["x-forwarded-for"] || "okänd";
  if (överGräns(ip)) return res.status(429).json({ fel: "för många frågor, vänta en stund" });

  const { system, meddelande, maxTokens } = req.body || {};
  if (typeof meddelande !== "string" || !meddelande.trim()) {
    return res.status(400).json({ fel: "meddelande saknas" });
  }
  // Taket finns för att en bugg i appen inte ska kunna skicka en hel logg.
  if (meddelande.length > 12000) return res.status(413).json({ fel: "för långt meddelande" });

  try {
    const svar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        // 400 räcker för ett chattsvar men INTE alltid för målintervjuns plan:
        // fem dimensioner à ett par meningar plus struktur ligger nära taket,
        // och ett kapat svar ger en oparsbar JSON som ser ut som ett fel i
        // appen. Anroparen får därför höja, med ett tak som skydd mot en
        // trasig loop.
        max_tokens: Math.min(1200, Math.max(200, Number(maxTokens) || 400)),
        system: typeof system === "string" ? system : undefined,
        messages: [{ role: "user", content: meddelande }],
      }),
    });

    const data = await svar.json();
    if (!svar.ok) {
      // Anthropics felmeddelande går vidare i klartext. Ett tyst fel gör
      // problemet omöjligt att diagnosticera från telefonen.
      return res.status(svar.status).json({ fel: (data.error && data.error.message) || "API-fel" });
    }

    const text = (data.content || [])
      .filter(d => d.type === "text").map(d => d.text).join("\n").trim();

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ fel: "kunde inte nå Claude: " + (e.message || String(e)) });
  }
}
