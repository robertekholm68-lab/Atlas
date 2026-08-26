#!/usr/bin/env python3
"""Askr — QR-kort att ge till testare.

Gör två kort: ett till testinstruktionen (test.html) och ett rakt in i appen
(atlas2.html). Varje kort har QR-koden, adressen i klartext under — en QR som
inte går att skanna ska alltid gå att skriva av — och en kort rad om vad man
får.

QR-koden ritas SVART PÅ VITT även om resten av kortet är i Askrs svärta.
Inverterade koder (ljusa moduler på mörk botten) skannas inte av alla
telefonkameror, och ett kort som fungerar hos fyra av fem testare är trasigt.
Felkorrigering Q (~25 %) så koden tål ett veck eller en fingeravtryck.

Kör:  python3 scripts/testar-qr.py [utmapp]
Kräver: qrcode, pillow
"""
import os
import sys

import qrcode
from PIL import Image, ImageDraw, ImageFont

BAS = "https://robertekholm68-lab.github.io/Atlas/"
KORT = [
    ("askr-qr-testare.png", BAS + "test.html", "FÖR TESTARE",
     "Instruktion, installation och vad du ska prova."),
    ("askr-qr-app.png", BAS + "atlas2.html", "ASKR",
     "Öppnar appen direkt. Lägg till på hemskärmen."),
]

# Askrs tokens (brand guide v1.1) — måste matcha design.js.
SVART, VOLT, TEXT, DIMD = "#0A0A0A", "#D4FF00", "#E8E8EA", "#9AA0A8"
B, H = 1080, 1500                     # 72:100, tryckbart som vykort
FONTER = "/usr/share/fonts/truetype/dejavu"


def font(namn, storlek):
    return ImageFont.truetype(f"{FONTER}/{namn}", storlek)


def mitt(d, y, txt, f, fyll, spacing=0):
    if spacing:
        bredder = [d.textlength(t, font=f) for t in txt]
        total = sum(bredder) + spacing * (len(txt) - 1)
        x = (B - total) / 2
        for t, w in zip(txt, bredder):
            d.text((x, y), t, font=f, fill=fyll)
            x += w + spacing
        return
    d.text(((B - d.textlength(txt, font=f)) / 2, y), txt, font=f, fill=fyll)


def kort(url, rubrik, underrad):
    im = Image.new("RGB", (B, H), SVART)
    d = ImageDraw.Draw(im)

    mitt(d, 96, rubrik, font("DejaVuSans-Bold.ttf", 62), VOLT, spacing=8)
    mitt(d, 186, underrad, font("DejaVuSans.ttf", 27), DIMD)

    # QR på vit platta med tyst zon — koden får aldrig gå ända ut i kanten.
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=10, border=2)
    q.add_data(url)
    q.make(fit=True)
    bild = q.make_image(fill_color="black", back_color="white").convert("RGB")
    sida = 720
    bild = bild.resize((sida, sida), Image.NEAREST)   # NEAREST: modulerna ska förbli skarpa
    platta = Image.new("RGB", (sida + 64, sida + 64), "white")
    platta.paste(bild, (32, 32))
    im.paste(platta, ((B - platta.width) // 2, 268))

    # Adressen i klartext. Bruten på två rader så den ryms utan att krympa.
    y = 268 + platta.height + 46
    mitt(d, y, "robertekholm68-lab.github.io", font("DejaVuSansMono-Bold.ttf", 30), TEXT)
    mitt(d, y + 44, "/Atlas/" + url.rsplit("/", 1)[1], font("DejaVuSansMono-Bold.ttf", 30), TEXT)

    d.line([(B / 2 - 40, y + 116), (B / 2 + 40, y + 116)], fill=VOLT, width=5)
    mitt(d, y + 152, "Ingen inloggning. Datan stannar i telefonen.",
         font("DejaVuSans.ttf", 25), DIMD)
    return im


if __name__ == "__main__":
    ut = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(ut, exist_ok=True)
    for namn, url, rubrik, underrad in KORT:
        p = os.path.join(ut, namn)
        kort(url, rubrik, underrad).save(p)
        print(f"{p}  →  {url}")
