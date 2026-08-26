#!/usr/bin/env python3
"""Normaliserar mannens maskbilder till EN gemensam ram.

Två saker skiljer det här underlaget från kvinnans:

  1. Vyerna kom i olika upplösning — framvyn 1024×1024, bakvyn 1254×1254.
     Utan normalisering blir figuren olika stor mellan vyerna, precis som
     hjältebilderna på startsidan blev (se atlas2-startsida.test.js).
  2. Bilderna bär SKRÄP: lösa röda fläckar i bakgrunden med alfa > 0. De ingår
     i kroppsmasken om man bara tröskar alfa, och drar då silhuetten fel.
     Därför behålls bara den största sammanhängande komponenten.

Ut kommer <ut>/{front,back}_<id>.png, alla i samma ram, redo för
`masker-till-regioner-kvinna.py` (som är könsneutral trots namnet).
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

# Filnamn i källan → region-id i motorn. None = hoppas över.
FRAM = {
    "01_neutral_front": "base",
    "02_pectoralis_major": "pectoralis_major",
    "03_rectus_abdominis": "rectus_abdominis",
    "04_external_obliques": "obliques",
    "05_serratus_anterior": "serratus_anterior",
    "06_deltoids": "deltoids",
    "07_biceps": "biceps_brachii",
    "08_forearms": "forearms",
    "09_quadriceps": "quadriceps",
    "10_adductors": "adductors",
    "11_trapezius": "trapezius",
    "12_tibialis_anterior": "tibialis_anterior",
}
# Bakvyn kom som lösa bilder; ordningen är den de laddades upp i.
BAK = {
    "01": "gluteals",
    "02": "deltoids",
    "03": "triceps_brachii",
    "04": "forearms",
    "05": "erector_spinae",
    "06": "teres_major",
    "07": "rotator_cuff",
    "08": "latissimus_dorsi",
    "09": "base",
    "10": "trapezius",
    "11": "hamstrings",
    "12": "calves",
}

MARGINAL = 0.02      # luft runt figuren, andel av figurhöjden
RAM_H = 1243         # samma höjd som kvinnokartans ram, så figurerna blir jämnstora


def figurmask(a):
    """Kroppen utan lösa fläckar: största sammanhängande alfa-komponenten."""
    m = a[..., 3] > 40
    lab, n = ndimage.label(m)
    if n:
        storlek = ndimage.sum(m, lab, range(1, n + 1))
        m = lab == (int(np.argmax(storlek)) + 1)
    return ndimage.binary_fill_holes(m)


def las(p):
    a = np.array(Image.open(p).convert("RGBA")).astype(np.uint8)
    return a, figurmask(a.astype(int))


def bbox(m):
    ys, xs = np.where(m)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def normalisera(filer, basfil, ut, vy, ram):
    """Beskär varje bild efter BASENS figur och skala om till gemensam ram."""
    _, basm = las(basfil)
    x0, y0, x1, y1 = bbox(basm)
    h = y1 - y0
    pad = int(h * MARGINAL)
    # Kvadratisk utsnittsram runt figuren, så bredd/höjd inte förvrids.
    cx = (x0 + x1) / 2
    halv = (h + 2 * pad) / 2
    lada = (int(cx - halv), max(0, y0 - pad), int(cx + halv), min(basm.shape[0], y1 + pad))

    for p, rid in filer:
        a, m = las(p)
        # Skräpet nollas i ALFA också — annars följer röda fläckar med in i
        # basbilden och syns som prickar bakom figuren i appen.
        a = a.copy()
        a[..., 3] = np.where(m, a[..., 3], 0)
        im = Image.fromarray(a).crop(lada).resize(ram, Image.LANCZOS)
        im.save(os.path.join(ut, f"{vy}_{rid}.png"))
    return lada


if __name__ == "__main__":
    kalla = sys.argv[1] if len(sys.argv) > 1 else "."
    ut = sys.argv[2] if len(sys.argv) > 2 else "normaliserad"
    os.makedirs(ut, exist_ok=True)

    # Ramens bredd bestäms av basfigurernas proportion — samma för båda vyerna.
    _, fm = las(f"{kalla}/zip/01_neutral_front.png")
    fx0, fy0, fx1, fy1 = bbox(fm)
    fh = fy1 - fy0
    sida = int((fh * (1 + 2 * MARGINAL)) * RAM_H / (fh * (1 + 2 * MARGINAL)))
    ram = (int(RAM_H * (1 + 2 * MARGINAL) / (1 + 2 * MARGINAL)), RAM_H)
    ram = (RAM_H, RAM_H)      # kvadratisk ram, som källorna

    fram = [(f"{kalla}/zip/{f}.png", rid) for f, rid in FRAM.items()]
    normalisera(fram, f"{kalla}/zip/01_neutral_front.png", ut, "front", ram)

    import glob
    bakfiler = []
    for p in sorted(glob.glob(f"{kalla}/bak/*.png")):
        nr = os.path.basename(p)[:2]
        bakfiler.append((p, BAK[nr]))
    normalisera(bakfiler, f"{kalla}/bak/09_1896f7f5.png", ut, "back", ram)

    print(f"{len(fram)} fram + {len(bakfiler)} bak → {ut}/  ram {ram[0]}×{ram[1]}")
