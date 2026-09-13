// @vitest-environment jsdom
// INSTALLERA APPEN, OCH TWA-PROJEKTET.
//
// Robert: "Byt till twa och lägg till installera appen knapp." Skälet är
// pulsbandet: WebView-skalet saknar Web Bluetooth och kan aldrig para ett
// band. En installerad app som KÖR I CHROME kan det — och det finns två vägar
// dit: Chromes eget erbjudande (WebAPK, knappen i Mer-menyn) och en Trusted
// Web Activity (APK, android-twa/).
//
// Knappens logik bor i engines/platform.js och prövas här mot fejkade
// beforeinstallprompt-event — Chrome finns inte i jsdom, men eventets form
// är känd. TWA-projektet kan inte byggas här (ingen Android SDK); det som
// går att låsa är att filerna hänger ihop: samma paket-id, samma adress,
// samma nyckelavtryck som WebView-skalet dokumenterar.

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { fångaInstallPrompt, installLäge, installera, _återställInstall } from "../engines/platform.js";
import { ImportSheet } from "../atlas2/ImportSheet.jsx";

const läs = p => readFileSync(resolve(p), "utf8");
const UA = navigator.userAgent;
const sättUA = v => Object.defineProperty(navigator, "userAgent", { value: v, configurable: true });

/** Ett beforeinstallprompt-event som Chrome hade skickat det — med prompt() och userChoice. */
function erbjudande(outcome = "accepted") {
  const e = new Event("beforeinstallprompt", { cancelable: true });
  e.anrop = 0;
  e.prompt = () => { e.anrop++; };
  e.userChoice = Promise.resolve({ outcome });
  return e;
}

beforeAll(() => { fångaInstallPrompt(); });
afterEach(() => {
  _återställInstall();
  sättUA(UA);
  delete window.matchMedia;
});

// ── Motorn ────────────────────────────────────────────────────────────────

describe("installLäge", () => {
  it("visar ingen knapp där webbläsaren inte erbjuder något", () => {
    expect(installLäge().läge).toBe("ingen");
  });

  it("Chromes erbjudande fångas och ger knappen — en gång", async () => {
    const e = erbjudande("accepted");
    act(() => { window.dispatchEvent(e); });
    expect(e.defaultPrevented).toBe(true);           // Chromes egen banner stoppad
    expect(installLäge().läge).toBe("prompt");
    expect(await installera()).toBe("accepterad");
    expect(e.anrop).toBe(1);
    // Erbjudandet är förbrukat: ingen knapp förrän Chrome skickar ett nytt.
    expect(installLäge().läge).toBe("ingen");
    expect(await installera()).toBeNull();
  });

  it("avböjd installation rapporteras som avböjd", async () => {
    act(() => { window.dispatchEvent(erbjudande("dismissed")); });
    expect(await installera()).toBe("avböjd");
  });

  it("appinstalled gör läget installerat", () => {
    act(() => { window.dispatchEvent(new Event("appinstalled")); });
    expect(installLäge().läge).toBe("installerad");
  });

  it("standalone är installerad utan att något event kommit", () => {
    window.matchMedia = q => ({ matches: /standalone/.test(q), addListener() {}, removeListener() {} });
    expect(installLäge().läge).toBe("installerad");
  });

  it("iPhone får stegen i stället för ett erbjudande", () => {
    sättUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1");
    const l = installLäge();
    expect(l.läge).toBe("ios");
    expect(l.steg.length).toBe(4);
    expect(l.steg.join(" ")).toMatch(/hemskärmen/);
  });

  it("WebView-skalet kan inte installera härifrån", () => {
    sättUA("Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36");
    expect(installLäge().läge).toBe("webview");
  });
});

// ── Kortet i Mer-menyn ────────────────────────────────────────────────────

describe("Installera appen i Mer-menyn", () => {
  let root, el;
  beforeAll(() => { globalThis.__ATLAS_BUILD__ = globalThis.__ATLAS_BUILD__ || "test"; });
  afterEach(() => { if (root) act(() => root.unmount()); if (el) el.remove(); root = null; el = null; });
  const montera = () => {
    el = document.createElement("div"); document.body.appendChild(el);
    root = createRoot(el);
    act(() => {
      root.render(createElement(ImportSheet, {
        sessions: [], setSessions: () => {}, setWeights: () => {}, setFoodLog: () => {},
        profile: {}, onClose: () => {},
      }));
    });
  };

  it("finns inte där inget går att göra", () => {
    montera();
    expect(el.querySelector('[data-install-lage]')).toBeNull();
  });

  it("med Chromes erbjudande: knappen installerar och kvitterar", async () => {
    const e = erbjudande("accepted");
    act(() => { window.dispatchEvent(e); });
    montera();
    const knapp = el.querySelector('[data-mer="installera"]');
    expect(knapp).toBeTruthy();
    expect(knapp.textContent).toMatch(/Installera appen/);
    await act(async () => { knapp.click(); });
    expect(e.anrop).toBe(1);
    expect(el.querySelector('[data-install-lage]').textContent).toMatch(/Installerad/);
    expect(el.querySelector('[data-mer="installera"]')).toBeNull();
  });

  it("erbjudandet som kommer EFTER att menyn öppnats når kortet", () => {
    montera();
    expect(el.querySelector('[data-mer="installera"]')).toBeNull();
    act(() => { window.dispatchEvent(erbjudande()); });
    expect(el.querySelector('[data-mer="installera"]')).toBeTruthy();
  });

  it("iPhone: knappen fäller ut stegen", () => {
    sättUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1");
    montera();
    const knapp = el.querySelector('[data-mer="installera"]');
    expect(knapp).toBeTruthy();
    expect(el.querySelectorAll("li").length).toBe(0);
    act(() => { knapp.click(); });
    expect(el.querySelectorAll('[data-install-lage="ios"] li').length).toBe(4);
  });

  it("i WebView-skalet: besked om Chrome och backup, ingen knapp", () => {
    sättUA("Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36");
    montera();
    const kort = el.querySelector('[data-install-lage="webview"]');
    expect(kort).toBeTruthy();
    expect(kort.textContent).toMatch(/Chrome/);
    expect(kort.textContent).toMatch(/backup/i);
    expect(el.querySelector('[data-mer="installera"]')).toBeNull();
  });
});

// ── Var koden bor ─────────────────────────────────────────────────────────

describe("fångsten sker före första render", () => {
  it("main2.jsx fångar erbjudandet innan React monterar", () => {
    const src = läs("src/atlas2/main2.jsx");
    expect(src.indexOf("fångaInstallPrompt()")).toBeGreaterThan(0);
    expect(src.indexOf("fångaInstallPrompt()")).toBeLessThan(src.indexOf("createRoot("));
  });

  it("InstallKort ligger på modulnivå", () => {
    expect(läs("src/atlas2/ImportSheet.jsx")).toMatch(/^function InstallKort\(/m);
  });
});

// ── TWA-projektet hänger ihop ─────────────────────────────────────────────

describe("android-twa/", () => {
  const R = "android-twa";
  const manifest = läs(`${R}/app/src/main/AndroidManifest.xml`);
  const strings = läs(`${R}/app/src/main/res/values/strings.xml`);
  const gradle = läs(`${R}/app/build.gradle`);
  const assetlinks = JSON.parse(läs(`${R}/assetlinks.json`));
  const gamlaBygg = läs("android-app/BYGG.md");

  it("startar LauncherActivity på samma adress som WebView-skalet", () => {
    expect(manifest).toMatch(/com\.google\.androidbrowserhelper\.trusted\.LauncherActivity/);
    expect(manifest).toMatch(/DEFAULT_URL"\s*android:value="https:\/\/robertekholm68-lab\.github\.io\/Atlas\/atlas2\.html"/);
    // Samma adress som MainActivity.java hårdkodar — en sanning, inte två.
    expect(läs("android-app/src/se/atlas/app/MainActivity.java")).toContain("https://robertekholm68-lab.github.io/Atlas/atlas2.html");
  });

  it("samma paket-id som skalet, högre versionCode", () => {
    expect(gradle).toMatch(/applicationId "se\.atlas\.app"/);
    expect(läs("android-app/AndroidManifest.xml")).toMatch(/package="se\.atlas\.app"/);
    const vc = Number((gradle.match(/versionCode (\d+)/) || [])[1]);
    expect(vc).toBeGreaterThan(1);
  });

  it("assetlinks pekar på skalets nyckel — avtrycket ur BYGG.md, inte ur minnet", () => {
    const avtryck = (gamlaBygg.match(/SHA256:\s*([0-9A-F:]+)/) || [])[1];
    expect(avtryck).toBeTruthy();
    expect(assetlinks[0].target.package_name).toBe("se.atlas.app");
    expect(assetlinks[0].target.sha256_cert_fingerprints).toEqual([avtryck]);
    expect(assetlinks[0].relation).toEqual(["delegate_permission/common.handle_all_urls"]);
  });

  it("appens anspråk och sajtens svar gäller samma host", () => {
    expect(strings).toMatch(/https:\/\/robertekholm68-lab\.github\.io/);
    expect(manifest).toMatch(/android:host="robertekholm68-lab\.github\.io"/);
    expect(manifest).toMatch(/android:autoVerify="true"/);
  });

  it("ikonerna följde med i alla fem tätheter", () => {
    for (const d of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
      expect(existsSync(resolve(`${R}/app/src/main/res/mipmap-${d}/ic_launcher.png`))).toBe(true);
    }
  });

  it("nyckeln och byggutdata kan inte råka checkas in", () => {
    const ign = läs(`${R}/.gitignore`);
    for (const rad of ["keystore.properties", "*.keystore", "build/"]) expect(ign).toContain(rad);
  });
});
