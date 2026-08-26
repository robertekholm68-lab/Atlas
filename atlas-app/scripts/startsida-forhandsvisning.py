#!/usr/bin/env python3
"""Fristående förhandsvisning av STARTSIDAN ur ett färdigt atlas2-bygge.

Två saker skiljer den från bygget:
  1. `atlas.v3.mode` rensas vid laddning, så appen alltid börjar på startsidan
     (den visas annars bara för en användare som aldrig valt läge).
  2. Hjältebilderna bäddas IN som data-URI. De ligger i public/ och hämtas som
     systerfiler — i en lös fil finns de inte, och ytan blir svart.

Filen är BARA för att titta på designen. Den skriver localStorage på sin egen
origin (en nedladdad fil), aldrig på den publicerade appens.
"""
import base64, re, sys

src = sys.argv[1] if len(sys.argv) > 1 else "dist-atlas2/atlas2.html"
ut = sys.argv[2] if len(sys.argv) > 2 else "/tmp/startsida-forhandsvisning.html"
html = open(src, encoding="utf8").read()

bild = lambda k: "data:image/webp;base64," + base64.b64encode(open(f"public/startsida-{k}.webp", "rb").read()).decode()
ny = f'(c==="m"?"{bild("man")}":"{bild("kvinna")}")'
html, n = re.subn(r'new URL\(`startsida-\$\{c==="m"\?"man":"kvinna"\}\.webp`,document\.baseURI\)\.href', ny, html)
assert n == 1, f"hittade {n} träffar på hjältebildens URL — bygget har ändrats"

rensa = ('<script>try{localStorage.removeItem("atlas.v3.mode")}catch(e){}</script>')
html = html.replace("<body>", "<body>" + rensa, 1) if "<body>" in html else rensa + html
open(ut, "w", encoding="utf8").write(html)
print(ut, len(html) // 1024, "kB")
