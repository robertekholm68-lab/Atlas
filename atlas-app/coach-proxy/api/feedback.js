// ASKR FEEDBACK-PROXY
//
// Testare ska kunna skicka synpunkter UTAN att byta app. En mailto-länk öppnar
// Gmail eller Outlook, och där tappar de flesta tråden — antingen för att
// mailklienten inte är inloggad, eller för att man aldrig kommer tillbaka.
//
// Samma princip som coach.js: proxyn är DUM. Ingen databas, inga konton, inget
// minne. Den tar emot en text, lägger på nyckeln, och skickar ett mail.
//
// RESEND-NYCKELN SÄTTS SOM MILJÖVARIABEL i Vercel (RESEND_API_KEY) — aldrig i
// koden, aldrig i git. Samma regel som ANTHROPIC_API_KEY.
//
// Deploy: Vercel, projekt askr-coach. Endpointen blir /api/feedback.

const TILLÅTNA_URSPRUNG = [
  "https://robertekholm68-lab.github.io",
  "http://localhost:5173",
];

// MOTTAGAREN LIGGER I MILJÖVARIABEL, inte i koden. En adress i ett publikt repo
// blir skräppostmål inom veckor.
const TILL = process.env.FEEDBACK_TILL;

// Utan egen domän får man bara skicka från Resends testadress. Det räcker för
// att mejla sig själv; en egen domän krävs först om andra ska ta emot.
const FRÅN = process.env.FEEDBACK_FRAN || "Askr <onboarding@resend.dev>";

// Ett tak per instans. Skyddar inte mot en beslutsam angripare men fångar det
// verkliga fallet: någon som håller inne skicka-knappen, eller en trasig loop.
const FÖNSTER_MS = 300_000;
const MAX_PER_FÖNSTER = 5;
const räknare = new Map();

function överGräns(nyckel) {
  const nu = Date.now();
  const post = räknare.get(nyckel) || { antal: 0, start: nu };
  if (nu - post.start > FÖNSTER_MS) { post.antal = 0; post.start = nu; }
  post.antal += 1;
  räknare.set(nyckel, post);
  return post.antal > MAX_PER_FÖNSTER;
}

/** Klipper och tvättar text som ska in i HTML. Ingen HTML från klienten. */
function säker(v, max) {
  return String(v == null ? "" : v)
    .slice(0, max)
    .replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}

export default async function handler(req, res) {
  const ursprung = req.headers.origin || "";
  const tillåtet = TILLÅTNA_URSPRUNG.includes(ursprung);
  if (tillåtet) {
    res.setHeader("Access-Control-Allow-Origin", ursprung);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!tillåtet) return res.status(403).json({ fel: "Otillåtet ursprung." });
  if (req.method !== "POST") return res.status(405).json({ fel: "Bara POST." });

  const ip = (req.headers["x-forwarded-for"] || "okänd").split(",")[0].trim();
  if (överGräns(ip)) {
    return res.status(429).json({ fel: "För många meddelanden. Vänta en stund." });
  }

  if (!process.env.RESEND_API_KEY || !TILL) {
    // ÄRLIGT FEL, inte ett tyst misslyckande. Saknas nyckeln ska appen kunna
    // säga "det gick inte" i stället för att visa "Skickat!" för ett mail som
    // aldrig lämnade servern.
    return res.status(500).json({ fel: "Feedback är inte konfigurerad." });
  }

  const { text, version, läge, enhet, namn } = req.body || {};
  const meddelande = String(text || "").trim();
  if (meddelande.length < 3) {
    return res.status(400).json({ fel: "Skriv något först." });
  }

  // KONTEXTEN FÖLJER MED AUTOMATISKT. Version och enhet är det man alltid måste
  // fråga om i efterhand, och det testare oftast glömmer att berätta.
  const rader = [
    ["Från", namn || "Anonym testare"],
    ["Version", version],
    ["Läge", läge],
    ["Enhet", enhet],
    ["Tid", new Date().toISOString()],
  ].filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:2px 12px 2px 0;color:#888">${säker(k, 20)}</td>` +
    `<td style="padding:2px 0"><code>${säker(v, 200)}</code></td></tr>`
  ).join("");

  const html = `<div style="font-family:system-ui,sans-serif;max-width:600px">
<p style="white-space:pre-wrap;font-size:15px;line-height:1.6">${säker(meddelande, 5000)}</p>
<hr style="border:0;border-top:1px solid #ddd;margin:20px 0">
<table style="font-size:12px;border-collapse:collapse">${rader}</table>
</div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FRÅN,
        to: TILL,
        subject: `Askr: ${meddelande.slice(0, 60).replace(/\s+/g, " ")}`,
        html,
      }),
    });
    const svar = await r.json().catch(() => ({}));
    if (!r.ok) {
      // Resends felmeddelande vidarebefordras INTE till klienten — det kan
      // avslöja konfiguration. Loggas i stället där bara ägaren ser det.
      console.error("Resend svarade", r.status, svar);
      return res.status(502).json({ fel: "Kunde inte skicka just nu." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("feedback:", e);
    return res.status(502).json({ fel: "Kunde inte nå mailtjänsten." });
  }
}
