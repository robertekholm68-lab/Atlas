#!/usr/bin/env python3
"""
Askr 2.0 — kvinnofigurens muskelkarta ur maskbilder.

Indata (src/): en basbild per vy (front_base.png, back_base.png) och en bild per
region där regionen är ifylld i magenta (front_<id>.png, back_<id>.png). Samma
metod som mansfigurens body_regions.json: konverteringen följer maskens kant, så
regionen ÄR muskelns form.

Utdata (out/):
  body_regions_female.json   – samma schema som body_regions.json
  figur-kvinna-fram.webp / figur-kvinna-bak.webp – basbilder, beskurna till
                               gemensam ram så båda vyerna delar koordinatsystem
  masks/<vy>_<id>.png        – de städade maskerna (för granskning)
  report.json                – pixelyta, komponenter, drift per region

Kör:  python3 scripts/masker-till-regioner-kvinna.py <maskmapp> <utmapp> [female|male]
Kräver: pillow, numpy, scipy, potracer
"""
import glob, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
import potrace

SRC = sys.argv[1] if len(sys.argv) > 1 else "kvinnokarta/src"
OUT = sys.argv[2] if len(sys.argv) > 2 else "kvinnokarta/out"
# Skriptet är könsneutralt trots namnet — prefixet styr vad utfilerna heter.
# "female" är kvar som förval så gamla anrop ger samma filer som förut.
KON = sys.argv[3] if len(sys.argv) > 3 else "female"
FIGURNAMN = {"female": "kvinna", "male": "man"}.get(KON, KON)
os.makedirs(f"{OUT}/masks", exist_ok=True)

# ── Parametrar ───────────────────────────────────────────────────────────────
MIN_COMPONENT_ABS = 150      # px — enstaka magentapixlar längs konturen
MIN_COMPONENT_REL = 0.04     # andel av största komponenten
CLOSING_ITER = 2             # sluter hårfina sprickor i fyllningen
PAD = 6                      # px luft runt figuren i den gemensamma ramen
TURDSIZE = 12                # potrace: släng fläckar under detta antal px
ALPHAMAX = 1.0               # potrace: hörn-tröskel (1.0 = mjuka kurvor)
OPTTOLERANCE = 0.25          # potrace: kurvförenkling
DEC = 1                      # decimaler i path-koordinater


def load(p):
    return np.array(Image.open(p).convert("RGBA")).astype(int)


def magenta(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 180) & (b > 180) & (g < 120)


def body(a):
    # Alfakanalen är sanningen i basbilderna; i maskbilderna är bakgrunden också
    # transparent, men magentan ligger ibland över svarta kläder — därför
    # räcker alfa som kroppsmask för båda.
    return a[..., 3] > 10


def registrera(figur, basfigur, fin=8):
    """Hur många pixlar måste maskbilden flyttas för att ligga på basen?

    Kvinnobilderna behövde inte det här — figuren stod stilla mellan
    körningarna (1–3 % silhuettskillnad). Mannens FRAMVY gjorde inte det:
    generatorn ritade om figuren varje gång och den hamnade upp till ett par
    tiotal pixlar åt sidan, vilket syntes som 30 % skillnad. Formen var
    densamma, bara förskjuten — en ren translation räcker.

    Grovinriktningen sker på masscentrum (en beräkning, ingen sökning) och
    finjusteringen söker ±`fin` px runt den. En ren rutnätssökning över hela
    det tänkbara området vore 6 000 IoU-beräkningar per bild och skulle
    dessutom tysta träffa sitt eget söktak — vilket den gjorde vid ±14.

    Returnerar (dy, dx) att flytta masken med, plus IoU före och efter.
    """
    def iou(a, b):
        u = (a | b).sum()
        return (a & b).sum() / u if u else 0.0

    fore = iou(figur, basfigur)
    cy, cx = ndimage.center_of_mass(figur)
    by, bx = ndimage.center_of_mass(basfigur)
    gy, gx = int(round(by - cy)), int(round(bx - cx))

    bast, bdy, bdx = fore, 0, 0
    for dy in range(gy - fin, gy + fin + 1):
        for dx in range(gx - fin, gx + fin + 1):
            v = iou(np.roll(np.roll(figur, dy, 0), dx, 1), basfigur)
            if v > bast:
                bast, bdy, bdx = v, dy, dx
    return bdy, bdx, fore, bast


def clean(m):
    """Behåll bara riktiga fyllningar: stora komponenter, slutna, hålfria."""
    lab, n = ndimage.label(m)
    if n == 0:
        return m, 0
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    biggest = sizes.max()
    keep = [i + 1 for i, s in enumerate(sizes) if s >= max(MIN_COMPONENT_ABS, MIN_COMPONENT_REL * biggest)]
    m = np.isin(lab, keep)
    m = ndimage.binary_closing(m, iterations=CLOSING_ITER)
    m = ndimage.binary_fill_holes(m)
    return m, len(keep)


def trace(mask, ox, oy):
    """Mask → lista av SVG-path-strängar i beskuren ram (absoluta koordinater)."""
    # potracer räknar 0 som förgrund — därför inverteras masken.
    bmp = potrace.Bitmap(~mask)
    path = bmp.trace(turdsize=TURDSIZE, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                     alphamax=ALPHAMAX, opticurve=True, opttolerance=OPTTOLERANCE)
    f = lambda v: f"{v:.{DEC}f}".rstrip("0").rstrip(".") if DEC else f"{v:.0f}"
    pt = lambda p: f"{f(p.x - ox)} {f(p.y - oy)}"
    out = []
    for curve in path:
        d = [f"M {pt(curve.start_point)}"]
        for seg in curve:
            if seg.is_corner:
                d.append(f"L {pt(seg.c)} L {pt(seg.end_point)}")
            else:
                d.append(f"C {pt(seg.c1)} {pt(seg.c2)} {pt(seg.end_point)}")
        d.append("Z")
        out.append(" ".join(d))
    return out


# ── 1. Gemensam ram ur basbilderna ───────────────────────────────────────────
bases = {v: load(f"{SRC}/{v}_base.png") for v in ("front", "back")}
H, W = bases["front"].shape[:2]
xs, ys = [], []
for a in bases.values():
    yy, xx = np.where(body(a))
    xs += [xx.min(), xx.max()]; ys += [yy.min(), yy.max()]
x0, x1 = max(0, min(xs) - PAD), min(W, max(xs) + PAD + 1)
y0, y1 = max(0, min(ys) - PAD), min(H, max(ys) + PAD + 1)
VW, VH = x1 - x0, y1 - y0
viewBox = f"0 0 {VW} {VH}"
print(f"ram: x {x0}..{x1}, y {y0}..{y1}  → viewBox {viewBox}")

for v, namn in (("front", "fram"), ("back", "bak")):
    im = Image.open(f"{SRC}/{v}_base.png").convert("RGBA").crop((x0, y0, x1, y1))
    im.save(f"{OUT}/figur-{FIGURNAMN}-{namn}.webp", "WEBP", quality=82, method=6)
    print(f"  figur-{FIGURNAMN}-{namn}.webp  {os.path.getsize(f'{OUT}/figur-{FIGURNAMN}-{namn}.webp')//1024} kB  {im.size}")

# ── 2. Masker → paths ────────────────────────────────────────────────────────
regions = {"front": {"viewBox": viewBox, "regions": []}, "back": {"viewBox": viewBox, "regions": []}}
report = {}
for p in sorted(glob.glob(f"{SRC}/*.png")):
    name = os.path.basename(p)[:-4]
    vy, _, rid = name.partition("_")
    if rid == "base":
        continue
    a = load(p)
    raw = magenta(a)
    m, ncomp = clean(raw)
    # Rikta in maskbilden mot basen INNAN den spåras. Flyttas den inte hamnar
    # muskeln bredvid sin egen kropp i appen.
    dy, dx, fore, efter = registrera(body(a), body(bases[vy]))
    if (dy, dx) != (0, 0):
        m = np.roll(np.roll(m, dy, 0), dx, 1)
    drift = 1 - efter
    d = trace(m, x0, y0)
    regions[vy]["regions"].append({"id": rid, "d": d, "area": int(m.sum())})
    Image.fromarray((m * 255).astype(np.uint8)).save(f"{OUT}/masks/{vy}_{rid}.png")
    report[f"{vy}/{rid}"] = {"area_px": int(m.sum()), "components": int(ncomp), "paths": len(d),
                             "silhouette_drift": round(float(drift), 4),
                             "registrering": {"dy": int(dy), "dx": int(dx),
                                              "iou_fore": round(float(fore), 4),
                                              "iou_efter": round(float(efter), 4)}}
    flytt = f"flyttad {dx:+d},{dy:+d}px" if (dy, dx) != (0, 0) else "i läge"
    print(f"  {vy:5s} {rid:20s} yta {int(m.sum()):6d} px  komp {ncomp}  paths {len(d)}  "
          f"drift {drift:.3f}  {flytt}")

# Ritordning: fallande yta, så små regioner hamnar överst och går att klicka
# inuti större (erector ovanpå lats, teres ovanpå lats).
for v in regions:
    regions[v]["regions"].sort(key=lambda r: -r["area"])
    for r in regions[v]["regions"]:
        del r["area"]

with open(f"{OUT}/body_regions_{KON}.json", "w") as fh:
    json.dump(regions, fh, separators=(",", ":"))
with open(f"{OUT}/report.json", "w") as fh:
    json.dump({"crop": [int(x0), int(y0), int(x1), int(y1)], "viewBox": viewBox, "regions": report}, fh, indent=1)
print(f"\nbody_regions_{KON}.json: {os.path.getsize(f'{OUT}/body_regions_{KON}.json')//1024} kB")
