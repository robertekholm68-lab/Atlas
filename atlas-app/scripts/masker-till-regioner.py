#!/usr/bin/env python3
"""
MASKER -> SVG-REGIONER.

Läser en PSD där varje lager är en muskelmask: samma figur som basfiguren, med
EN muskel ifylld i magenta. Ut kommer body_regions.json — samma format som
kartan redan använder, så BodyMap2 och muskelikonerna fungerar oförändrat.

VARFÖR MASKER OCH INTE HANDRITNING. 21 regioner i två vyer är ett par dagars
pillande, och resultatet blir bara så exakt som handen är. Masken ÄR muskelns
form; konverteringen behöver bara följa dess kant.

Kräver att figuren är pixelidentisk mellan lagren. Mätt på Roberts fil: 1-5 px
avvikelse, vilket är kantutjämning och inte glidning.
"""
import json, sys
import cv2
import numpy as np
from PIL import Image
from psd_tools import PSDImage

# Magenta mot allt annat. Tröskeln är generös i rött och blått men hård i grönt
# — hudtonen i figuren är ljus och skulle annars kunna glida in.
# LAGERNAMN -> MUSKEL-ID I MOTORN.
#
# Maskerna är namngivna anatomiskt; motorn har sina egna id:n i MUSCLES.
# Stämmer de inte får regionen ingen färg — den skulle rendera grå för alltid
# utan att något syntes vara fel.
#
# None = regionen utelämnas medvetet. De tre små rotatorkuffmusklerna
# (infraspinatus, supraspinatus, teres minor) är 1 800-2 600 px var; vid 512 px
# i appen blir de några pixlar breda och omöjliga att träffa med ett finger.
# Roberts samlade "rotator cuffen"-mask ersätter dem.
ALIAS = {
    "external_obliques": "obliques",
    "rotator_cuffen": "rotator_cuff",
    "infraspinatus": None,
    "supra_spinatus": None,
    "supraspinatus": None,
    "teres_minor": None,
    # deltoids i masken = alla tre delarna. Motorn delar upp dem, men på en
    # ytmodell går de inte att skilja åt — den främre skyms av den laterala.
    "deltoids": "deltoids",
}


def är_magenta(a):
    """
    Magenta = rött och blått högt, grönt lågt.

    TRÖSKELN ÄR RELATIV, INTE ABSOLUT. Första versionen krävde R och B över
    170, och tappade då skuggade delar av masken: hamstrings hade 12 426 px
    mörkare magenta (183, 3, 146) där muskeln kröker sig. Masken blev för liten
    och regionen fick fel form.

    Nu jämförs kanalerna med varandra i stället — grönt måste ligga tydligt
    under både rött och blått. Det håller oavsett hur mörk magentan är, och
    hudtonen i figuren (där R > G > B och kanalerna ligger nära varandra)
    faller fortfarande utanför.
    """
    r, g, b, alfa = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    return (alfa > 100) & (r > 60) & (b > 50) & (g < r - 60) & (g < b - 40)


def lager_som_helbild(l, bredd, höjd):
    """Lager kan vara mindre än dokumentet. Utan offset hamnar masken fel."""
    im = l.composite()
    if im is None:
        return None
    im = im.convert("RGBA")
    c = Image.new("RGBA", (bredd, höjd), (0, 0, 0, 0))
    c.paste(im, (l.offset[0], l.offset[1]), im)
    return np.array(c).astype(int)


def kontur_till_path(kontur):
    """En OpenCV-kontur som SVG-path. Heltal räcker — en tiondels pixel syns
    inte, och kortare paths ger mindre fil."""
    p = kontur.reshape(-1, 2)
    d = f"M {p[0][0]} {p[0][1]}"
    for x, y in p[1:]:
        d += f" L {x} {y}"
    return d + " Z"


def mask_till_paths(mask, epsilon=1.2, minsta_yta=150):
    """
    Konturer ur masken, förenklade.

    MINSTA_YTA SILAR BORT SKRÄP. En mask har ofta några lösa pixlar i kanten
    från kantutjämningen; utan filtret blir de egna former som aldrig syns men
    tynger filen.

    EPSILON 1.2 är avvägningen mellan trohet och storlek. Vid 0.5 blir det 177
    punkter för bröstet, vid 3.0 bara 27 men kanten blir kantig. 1.2 ger runt
    60 och följer muskeln väl.
    """
    m = mask.astype(np.uint8)
    # Stäng ettpixelshål så konturen inte splittras i onödan.
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    konturer, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    ut = []
    for k in konturer:
        if cv2.contourArea(k) < minsta_yta:
            continue
        ut.append(kontur_till_path(cv2.approxPolyDP(k, epsilon, True)))
    return ut


def kör(psd_path, vy, ut_json):
    p = PSDImage.open(psd_path)
    lager = [l for l in p.descendants() if not l.is_group()]

    regioner = []
    bas = None
    for l in lager:
        a = lager_som_helbild(l, p.width, p.height)
        if a is None:
            continue
        mask = är_magenta(a)
        if mask.sum() < 100:
            bas = l.name
            continue
        # Lagernamnet ÄR muskel-id:t. Prefixet bort, mellanslag till understreck
        # så det matchar body_regions.json och engines/muscles.js.
        namn = ALIAS.get(
            l.name.split("-", 1)[-1].strip().lower().replace(" ", "_"),
            l.name.split("-", 1)[-1].strip().lower().replace(" ", "_"),
        )
        if namn is None:
            print(f"    hoppar över {l.name} (medvetet utelämnad)")
            continue
        paths = mask_till_paths(mask)
        if not paths:
            print(f"    VARNING {namn}: ingen kontur över minsta yta", file=sys.stderr)
            continue
        regioner.append({"id": namn, "d": paths})
        pk = sum(d.count(" L ") + 1 for d in paths)
        print(f"    {namn:24} {len(paths)} form(er), {pk:4} punkter, {int(mask.sum()):6} px")

    return {
        "viewBox": f"0 0 {p.width} {p.height}",
        "regions": regioner,
        "_bas": bas,
    }


if __name__ == "__main__":
    psd = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads/Muskellager.psd"
    vy = sys.argv[2] if len(sys.argv) > 2 else "front"
    print(f"  {vy}:")
    d = kör(psd, vy, None)
    print(f"\n  viewBox {d['viewBox']} · {len(d['regions'])} regioner · basfigur: {d['_bas']}")
    with open(f"/home/claude/regioner-{vy}.json", "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False)
