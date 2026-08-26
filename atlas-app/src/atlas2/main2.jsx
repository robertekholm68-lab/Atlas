import { createRoot } from "react-dom/client";
import "../styles/global.css";
import { Atlas2 } from "./App2.jsx";

createRoot(document.getElementById("root")).render(<Atlas2 />);

// UPPDATERINGAR — varför appen letar efter dem själv.
//
// Service workern är network-first för dokumentet, så en KALLSTART hämtar alltid
// den senaste versionen. Det räcker inte: en app som ligger på hemskärmen
// startas sällan kallt. Man växlar till den, den ligger kvar i bakgrunden i
// dagar, och då sker ingen navigering alls — den gamla versionen kör vidare
// hur många publiceringar som helst utan att någon märker något.
//
// Det här var skillnaden mot mobilkompanjonen, som haft mönstret hela tiden
// (src/mobile/main.jsx). Samma mönster här i stället för ett eget: en kontroll
// vid start, en kontroll varje gång appen kommer i förgrunden, och ett
// event när en ny version faktiskt är installerad.
//
// Registreringen ligger HÄR och inte som inline-skript i atlas2.html, så att
// det bara finns ett ställe som registrerar. Två registreringar av samma
// sökväg är ofarligt men gör att ingen vet vilken som gäller.
const setStatus = (state, detail) => {
  window.__Askr_SW__ = { state, detail: detail || null };
  window.dispatchEvent(new CustomEvent("atlas:sw-status", { detail: window.__Askr_SW__ }));
};

setStatus("pending");

if (!("serviceWorker" in navigator)) {
  setStatus("unsupported", "Webbläsaren saknar stöd för service workers.");
} else if (!/^https?:$/.test(location.protocol)) {
  // Öppnad som lokal fil: appen fungerar, men utan offline-cache, utan
  // installation och utan uppdateringar. Rapporteras ärligt i stället för att
  // felet i konsolen ska se ut som ett riktigt problem.
  setStatus("insecure", `Offline kräver http eller https — sidan kördes som ${location.protocol}`);
} else {
  navigator.serviceWorker.register("./sw-atlas2.js")
    .then(reg => {
      setStatus("active");
      reg.addEventListener("updatefound", () => {
        const ny = reg.installing;
        if (!ny) return;
        ny.addEventListener("statechange", () => {
          // `controller` måste finnas. Utan den är det här FÖRSTA installationen
          // — inget att uppdatera till, och en banner då vore rent nonsens.
          if (ny.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("atlas:update-ready"));
          }
        });
      });
      const kolla = () => { try { reg.update(); } catch (e) { /* nätet nere: nästa gång */ } };
      setTimeout(kolla, 3000);
      // Varje återkomst till appen. Det är det här steget som gör att en app på
      // hemskärmen inte kan bli gammal.
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") kolla(); });
    })
    .catch(err => setStatus("failed", String((err && err.message) || err)));
}
