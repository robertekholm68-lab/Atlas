// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { OneRepMaxCalculator } from "../features/progress/index.jsx";

function setInput(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
}

async function mount() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  let root;
  await act(async () => { root = createRoot(el); root.render(<OneRepMaxCalculator />); });
  return { el, root };
}

describe("1RM-kalkylator (Epley i UI)", () => {
  it("renderar tomt läge utan att krascha", async () => {
    const { el } = await mount();
    expect(el.textContent).toMatch(/1RM-kalkylator/);
    expect(el.textContent).toMatch(/Fyll i reps och vikt/);
  });

  it("5 reps × 80 kg → uppskattat 1RM 93 kg (matchar Styrkelabbets exempel)", async () => {
    const { el } = await mount();
    const inputs = el.querySelectorAll("input");
    await act(async () => { setInput(inputs[0], "5"); });
    await act(async () => { setInput(inputs[1], "80"); });
    expect(el.textContent).toMatch(/93 kg/);
    expect(el.textContent).toMatch(/uppskattat 1RM/);
  });

  it("visar uppskattade arbetsvikter per rep-mål", async () => {
    const { el } = await mount();
    const inputs = el.querySelectorAll("input");
    await act(async () => { setInput(inputs[0], "5"); });
    await act(async () => { setInput(inputs[1], "80"); });
    expect(el.textContent).toMatch(/Arbetsvikter/);
    // inversen av Epley för 5 rep ur ett 1RM på 93 landar åter runt arbetsvikten 80 kg
    expect(el.textContent).toMatch(/80/);
  });
});
