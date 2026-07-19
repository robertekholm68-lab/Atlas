// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ErrorBoundary } from "../components/error-boundary/index.jsx";

const roots = [];
const mount = async node => {
  const el = document.createElement("div"); document.body.appendChild(el);
  const r = createRoot(el); roots.push({ r, el });
  await act(async () => { r.render(node); });
  return el;
};
afterEach(async () => { await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) { } el.remove(); }); }); vi.restoreAllMocks(); });

const Boom = () => { throw new Error("trasig vy: kunde inte läsa muskelstatus"); };
const Fine = () => <div>allt funkar</div>;
const clickText = (el, t) => { const b = [...el.querySelectorAll("button")].find(x => x.textContent.includes(t)); if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!b; };

describe("felgräns", () => {
  it("släpper igenom fungerande innehåll orört", async () => {
    const el = await mount(<ErrorBoundary><Fine /></ErrorBoundary>);
    expect(el.textContent).toBe("allt funkar");
  });

  it("fångar ett kastat fel i stället för att lämna vit skärm", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    const el = await mount(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(/NÅGOT GICK FEL/.test(el.textContent)).toBe(true);
    expect(el.textContent.length).toBeGreaterThan(50);      // inte tom skärm
  });

  it("lugnar först: säger att data ligger kvar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    const el = await mount(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(/Din data är kvar/.test(el.textContent)).toBe(true);
  });

  it("erbjuder att rädda ut data till en fil även när appen är trasig", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    localStorage.clear();
    localStorage.setItem("atlas.v2.real.sessions", JSON.stringify([{ id: "x" }]));
    localStorage.setItem("annan-app", "orörd");
    let blobText = null;
    global.URL.createObjectURL = b => { blobText = b; return "blob:test"; };
    global.URL.revokeObjectURL = () => { };
    const el = await mount(<ErrorBoundary><Boom /></ErrorBoundary>);
    await act(async () => { clickText(el, "Spara backup"); });
    expect(blobText).toBeTruthy();
    expect(/Backup sparad med 1 nycklar/.test(el.textContent)).toBe(true);   // bara atlas-nyckeln
  });

  it("teknisk information är dold men åtkomlig", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    const el = await mount(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(/kunde inte läsa muskelstatus/.test(el.textContent)).toBe(false);
    await act(async () => { clickText(el, "Visa teknisk information"); });
    expect(/kunde inte läsa muskelstatus/.test(el.textContent)).toBe(true);
  });

  it("'Försök igen' återställer så en tillfällig krasch inte är permanent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    let broken = true;
    const Flaky = () => { if (broken) throw new Error("tillfälligt"); return <div>återhämtad</div>; };
    const el = await mount(<ErrorBoundary><Flaky /></ErrorBoundary>);
    expect(/NÅGOT GICK FEL/.test(el.textContent)).toBe(true);
    broken = false;
    await act(async () => { clickText(el, "Försök igen"); });
    expect(el.textContent).toBe("återhämtad");
  });

  it("compact-läge håller sig i vyn i stället för att ta över hela skärmen", async () => {
    vi.spyOn(console, "error").mockImplementation(() => { });
    const el = await mount(<ErrorBoundary compact><Boom /></ErrorBoundary>);
    expect(/Den här vyn kunde inte visas/.test(el.textContent)).toBe(true);
    expect(/Ladda om sidan/.test(el.textContent)).toBe(false);   // erbjuds bara på rotnivå
  });
});
