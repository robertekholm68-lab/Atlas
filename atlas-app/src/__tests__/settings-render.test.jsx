// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { SettingsView, PANEL_MODES } from "../features/settings/index.jsx";

describe("SettingsView — panelläge", () => {
  it("visar alla tre lägen och markerar det aktiva", async () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<SettingsView panelMode="hover" setPanelMode={() => {}} />); });
    expect(PANEL_MODES.map(m => m.id)).toEqual(["open", "hover", "click"]);
    expect(el.textContent).toMatch(/Alltid öppna/);
    expect(el.textContent).toMatch(/Fäll ut på hover/);
    expect(el.textContent).toMatch(/Fäll ut på klick/);
    expect(el.textContent).toMatch(/VALD/); // det aktiva (hover) markeras
  });

  it("anropar setPanelMode när ett läge väljs", async () => {
    let picked = null;
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<SettingsView panelMode="open" setPanelMode={v => { picked = v; }} />); });
    const btns = el.querySelectorAll("button");
    const clickBtn = Array.from(btns).find(b => /Fäll ut på klick/.test(b.textContent));
    await act(async () => { clickBtn.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(picked).toBe("click");
  });
});
