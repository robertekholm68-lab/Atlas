#!/usr/bin/env python3
"""Fristående förhandsvisning av kvinnokartan — samma rendering som BodyMap2
(bild under, SVG-regioner över, feGaussianBlur 3.5, multiply, opacitet 0.62).
Tre lägen: alla regioner i demo-färger, hover-läge, och ren bas."""
import base64, json
import sys
MAPP = sys.argv[1] if len(sys.argv) > 1 else "out"
KON = sys.argv[2] if len(sys.argv) > 2 else "female"
FIG = {"female": "kvinna", "male": "man"}[KON]
R = json.load(open(f"{MAPP}/body_regions_{KON}.json"))
b64 = lambda p: "data:image/webp;base64," + base64.b64encode(open(p, "rb").read()).decode()
IMG = {"front": b64(f"{MAPP}/figur-{FIG}-fram.webp"), "back": b64(f"{MAPP}/figur-{FIG}-bak.webp")}
NAMN = {"pectoralis_major": "Bröst", "deltoids": "Axlar", "biceps_brachii": "Biceps", "triceps_brachii": "Triceps",
        "forearms": "Underarmar", "rectus_abdominis": "Mage", "obliques": "Sneda bukmuskler", "trapezius": "Kappmuskel",
        "quadriceps": "Framsida lår", "adductors": "Insida lår", "tibialis_anterior": "Framsida underben",
        "serratus_anterior": "Sågmuskel", "latissimus_dorsi": "Breda ryggmuskeln", "teres_major": "Ryggen",
        "erector_spinae": "Ryggresare", "gluteals": "Säte", "hamstrings": "Baksida lår", "calves": "Vader",
        "rotator_cuff": "Rotatorkuff", "triceps_brachii": "Triceps"}
# Demo-readiness per region så färgskalan syns (röd→gul→grön), inte på riktigt.
DEMO = {"quadriceps": 18, "hamstrings": 35, "gluteals": 48, "calves": 62, "latissimus_dorsi": 28, "trapezius": 72,
        "deltoids": 55, "biceps_brachii": 88, "triceps_brachii": 40, "forearms": 95, "pectoralis_major": 22,
        "rectus_abdominis": 66, "obliques": 80, "erector_spinae": 30, "adductors": 90, "tibialis_anterior": 100,
        "serratus_anterior": 50, "teres_major": 28}

VB = R["front"]["viewBox"].split()
ASPEKT = f"{VB[2]}/{VB[3]}"
html = f"""<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>Askr — kvinnokartan, förhandsvisning</title>
<style>
body{{margin:0;background:#0A0A0A;color:#E8E8EA;font:14px/1.4 Inter,system-ui,sans-serif}}
h1{{font-size:14px;letter-spacing:2px;text-transform:uppercase;margin:18px 0 6px 24px;color:#D4FF00}}
.rad{{display:flex;gap:24px;padding:12px 24px}}
.fig{{position:relative;width:260px;aspect-ratio:{ASPEKT}}}
.fig img{{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:contrast(1.12)}}
.fig svg{{position:absolute;inset:0;width:100%;height:100%}}
.fig path{{transition:fill-opacity .25s}}
.fig g{{cursor:pointer}}
.fig g:hover path{{fill-opacity:.85;stroke:#fff;stroke-width:1.5}}
#namn{{margin-left:24px;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;min-height:18px}}
.nyckel{{display:flex;gap:14px;margin-left:24px;font-size:11px;color:#9AA0A8}}
.nyckel span i{{display:inline-block;width:8px;height:8px;border-radius:4px;margin-right:6px}}
</style></head><body>
<h1>{FIG.capitalize()}kartan — demo-färger (ej riktiga data)</h1>
<div id="namn">·</div>
<div class="rad" id="demo"></div>
<h1>Ren bas — bilden utan regioner</h1>
<div class="rad" id="bas"></div>
<script>
const R={json.dumps(R)};const IMG={json.dumps(IMG)};const NAMN={json.dumps(NAMN, ensure_ascii=False)};const DEMO={json.dumps(DEMO)};
const LAGER=(new URLSearchParams(location.search).get('lager')||'color:.9,normal:.28').split(',').map(x=>{{const [m,o]=x.split(':');return [m,+o];}});
// recoveryColor ur design.js — approximation röd→grön över 0..100 (samma ändpunkter #D0…/#54…).
// recoveryColor — kopia av design.js (6°→142°, mättnad .62→.52, ljushet .52→.56).
function recoveryColor(score){{const t=Math.max(0,Math.min(100,score))/100;const h=6+t*136,s=.62-t*.10,l=.52+t*.04;
const f=n=>{{const k=(n+h/30)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1));}};
const hx=n=>Math.round(255*f(n)).toString(16).padStart(2,'0');return `#${{hx(0)}}${{hx(8)}}${{hx(4)}}`;}}
function figur(vy, live){{
  const d=document.createElement('div');d.className='fig';
  d.innerHTML=`<img src="${{IMG[vy]}}" alt="">`;
  if(!live) return d;
  const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',R[vy].viewBox);
  svg.innerHTML=`<defs><filter id="mjuk-${{vy}}" x="-6%" y="-6%" width="112%" height="112%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>`;
  for(const r of R[vy].regions){{
    const g=document.createElementNS(ns,'g');g.dataset.region=r.id;
    const rd=DEMO[r.id];const f=rd!=null?recoveryColor(rd):'#2E333B';
    for(const p of r.d){{for(const [mode,op] of LAGER){{const e=document.createElementNS(ns,'path');e.setAttribute('d',p);e.setAttribute('fill',f);e.setAttribute('fill-opacity',rd!=null?op:0);e.setAttribute('filter',`url(#mjuk-${{vy}})`);e.style.mixBlendMode=mode;g.appendChild(e);}}}}
    g.onmouseenter=()=>document.getElementById('namn').textContent=(NAMN[r.id]||r.id)+(rd!=null?` · ${{rd}}%`:' · ingen data');
    g.onmouseleave=()=>document.getElementById('namn').textContent='·';
    svg.appendChild(g);
  }}
  d.appendChild(svg);return d;
}}
for(const vy of ['front','back']){{document.getElementById('demo').appendChild(figur(vy,true));document.getElementById('bas').appendChild(figur(vy,false));}}
</script></body></html>"""
UT = f"{MAPP}/forhandsvisning-{FIG}.html"
open(UT, "w").write(html)
print(UT, len(html) // 1024, "kB")
