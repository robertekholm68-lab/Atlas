import { createRoot } from "react-dom/client";
import { MobileApp } from "./MobileApp.jsx";
import { ErrorBoundary } from "../components/error-boundary/index.jsx";

createRoot(document.getElementById("root")).render(<ErrorBoundary><MobileApp /></ErrorBoundary>);

// PWA: service worker för offline och hemskärms-installation.
//
// VIKTIGT: service workern måste ligga som en RIKTIG fil (sw.js) på http eller https.
// Specifikationen tillåter bara schemana http/https för registreringsskriptet, så en
// blob:-adress avvisas — och sväljer man det felet i tysthet tror man att offline
// fungerar när det inte gör det. Därför: registrera ./sw.js, och rapportera utfallet
// ärligt i appen (syns under "📱 Telefon") i stället för att dölja det.
const setStatus = (state, detail) => {
  window.__ATLAS_SW__ = { state, detail: detail || null };
  window.dispatchEvent(new CustomEvent("atlas:sw-status", { detail: window.__ATLAS_SW__ }));
};

setStatus("pending");

if (!("serviceWorker" in navigator)) {
  setStatus("unsupported", "Webbläsaren saknar stöd för service workers.");
} else if (!/^https?:$/.test(location.protocol)) {
  // Öppnad som lokal fil: appen fungerar, men utan offline-cache och utan installation.
  setStatus("insecure", `Offline kräver http eller https — sidan kördes som ${location.protocol}`);
} else {
  navigator.serviceWorker.register("./sw.js")
    .then(reg => {
      setStatus("active");
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("atlas:update-ready"));
          }
        });
      });
      const check = () => { try { reg.update(); } catch (e) { } };
      setTimeout(check, 3000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    })
    .catch(err => setStatus("failed", String((err && err.message) || err)));
}
