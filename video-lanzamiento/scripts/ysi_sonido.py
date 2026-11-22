# Banda sonora de «¿Y si cada paso…?» (sin voz). Original, generada por código: uso comercial libre.
# Estilo cinematográfico minimalista: ostinato de piano en corcheas (90 BPM), cuerdas que se suman de a poco,
# graves que crecen en cada capítulo, sin batería electrónica. Progresión Am – F – C – G; resuelve en Do al cierre.
#   0–2,7 intro (huellas y logo) · 2,7–8 preguntas · 8–12,7 Bolivia · 12,7–18 Tarija · 18–20,7 barrio
#   20,7–26 la app · 26–31,3 tarjeta de comercios (respiro) · 31,3–35 cierre
# Uso: python3 scripts/ysi_sonido.py  ->  public/audio/ysi-mezcla.wav
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import soundfile as sf
from sintes import *

DUR = 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
B = 2 / 3
BAR = 4 * B
INTRO, BOL, TAR, BAR_, APP, CARD, CIERRE = 80 / 30, 8.0, 12.667, 18.0, 20.667, 26.0, 31.333

# cortes y ráfagas (igual que src/YSi.tsx)
DUR_TOMAS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1]
RAFAGAS = {7: (4, 5), 13: (4, 5), 19: (8, 5), 28: (5, 4)}  # índice de toma: (imágenes, cuadros por imagen)
cortes, rafaga_clics = [], []
at = INTRO
for i, d in enumerate(DUR_TOMAS):
    cortes.append(at)
    if i in RAFAGAS:
        n, c = RAFAGAS[i]
        rafaga_clics += [at + k * c / 30 for k in range(1, n)]
    at += d * B

AM, F_, C_, G_ = [45, 57, 60, 64, 69], [41, 53, 57, 60, 65], [36, 48, 55, 60, 64], [43, 55, 59, 62, 67]
PROG = [AM, F_, C_, G_]
CFIN = [36, 48, 55, 60, 64, 67, 72, 76]
def acorde(tt):
    return CFIN if tt >= CIERRE else PROG[int(tt / BAR) % 4]

mus = np.zeros((N, 2))

# 1) Ostinato de piano en corcheas (desde 0,7 s), y una segunda voz en semicorcheas desde Tarija
OST = [1, 3, 2, 4, 2, 3, 1, 4]
pno = np.zeros(N)
tb = 0.66
k = 0
while tb < CIERRE - 1e-6:
    ch = acorde(tb)
    m = ch[OST[k % 8] % len(ch)] + 12
    vel = 0.75 if k % 2 else 0.9
    if CARD <= tb:
        vel *= 0.8
    place(pno, piano(m, 1.4, vel), tb)
    tb += B / 2
    k += 1
g_pno = curva(t, [(0, 0.6), (2.67, 0.8), (8, 0.9), (26, 1.0), (31.3, 0.9)])
pno *= g_pno
alta = np.zeros(N)
tb = TAR
k = 0
while tb < CARD - 1e-6:
    ch = acorde(tb)
    place(alta, piano(ch[(k * 2) % len(ch)] + 24, 0.6, 0.55), tb)
    tb += B / 4
    k += 1
mus += reverb(estereo(pno * 0.16) + np.stack([alta, np.roll(alta, 300)], 1) * 0.08, 2.4, 0.32, 5500, seed=3)

# 2) Cuerdas: graves desde el inicio, medias desde las preguntas, agudas desde Bolivia
def capa(transp, notas, g_curva, seed):
    x = np.zeros((N, 2))
    for b in range(int(DUR / BAR) + 1):
        a0 = b * BAR
        if a0 >= CIERRE:
            break
        a1 = min(a0 + BAR, CIERRE)
        ch = acorde(a0)
        for j in notas:
            place(x, cuerdas(ch[j] + transp, a1 - a0 + 0.7, seed=seed + b * 11 + j), a0)
    return x * curva(t, g_curva)[:, None]
mus += capa(-12, [0], [(0, 0.0), (1.2, 0.5), (8, 0.7), (12.67, 0.9), (26, 0.9), (26.2, 0.35), (31.3, 0.4)], 1) * 0.3
mus += capa(0, [1, 2], [(0, 0), (2.67, 0.25), (8, 0.45), (12.67, 0.6), (25.9, 0.75), (26.2, 0.3), (31.3, 0.35)], 2) * 0.45
mus += capa(12, [2, 3, 4], [(0, 0), (7.5, 0.0), (8.5, 0.3), (12.67, 0.45), (20.67, 0.5), (25.9, 0.65), (26.2, 0.3), (31.3, 0.35)], 3) * 0.3

# 3) Graves: nota sostenida en cada compás (que crece por capítulo) y golpes suaves de timbal al cambiar de capítulo
bajo = np.zeros(N)
for b in range(int(DUR / BAR) + 1):
    a0 = b * BAR
    if a0 < INTRO or a0 >= CARD:
        continue
    m = acorde(a0)[0] - 12
    n = int(BAR * SR)
    tt = np.arange(n) / SR
    place(bajo, np.sin(2 * np.pi * nota(m) * tt) * env(n, 0.05, 0.4, 0.7, 0.5), a0)
mus += estereo(filt(bajo, 300) * curva(t, [(0, 0), (2.67, 0.25), (8, 0.4), (12.67, 0.5), (26, 0.5), (26.1, 0)]) * 0.28)

def timbal(g=0.4):
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(70 + 25 * np.exp(-tt * 8)) / SR) * np.exp(-tt * 3)
    x += filt(rng.normal(0, 1, n), 400) * np.exp(-tt * 18) * 0.3
    return estereo(x * g)
for at in [INTRO, BOL, TAR, BAR_, APP]:
    place(mus, timbal(0.35), at)
# pulso grave suave en negras desde Tarija (como un latido), se corta en la tarjeta
tb = TAR
while tb < CARD - 1e-6:
    place(mus, estereo(filt(bombo(0.22), 180)), tb)
    tb += B
# redoble de timbal hacia la tarjeta y hacia el cierre
for fin, dur in [(CARD, 1.33), (CIERRE, 0.9)]:
    at = fin - dur
    while at < fin - 1e-6:
        place(mus, timbal(0.08 + 0.18 * (at - (fin - dur)) / dur), at)
        at += B / 4
place(mus, subida(1.0, 0.06, 300, 6000), CIERRE - 1.0)

# 4) Cierre: acorde grande de cuerdas y piano, golpe grave
n = int((DUR - CIERRE) * SR)
fin = sum(cuerdas(m, DUR - CIERRE, seed=90 + i) for i, m in enumerate(CFIN)) * env(n, 0.04, 0.8, 0.7, 1.8)[:, None] / 2.2
place(mus, filt(fin, 4000), CIERRE)
for at, m in [(CIERRE, 72), (CIERRE, 84), (CIERRE + 0.66, 79), (CIERRE + 1.33, 76), (CIERRE + 2.0, 72)]:
    place(mus, estereo(piano(m, 3.0, 0.9) * 0.2), at)
place(mus, golpe(0.8, 3.0), CIERRE)
place(mus, np.stack([crash(3.5, 0.35), crash(3.5, 0.3)], 1), CIERRE)

mus = mus + 0.45 * filt(mus, 2500, 'high')  # más brillo (cuerdas y piano más presentes)
mus = reverb(mus, 1.6, 0.14, 7000, seed=11)
mus *= (np.clip((DUR - t) / 1.4, 0, 1) ** 1.5)[:, None]
mus = filt(mus, 28, 'high')
mus /= np.abs(mus).max()

# ---------- Efectos ----------
sfx = np.zeros((N, 2))
for i, at in enumerate([0.0, 0.3, 0.6, 0.9]):  # huellas de la intro
    place(sfx, paso(0.35, i % 2 == 0), at)
for i in range(8):  # letras que se arman
    place(sfx, blip(1800 + 140 * i, 0.025, 0.025), 44 / 30 + i * 0.05)
place(sfx, brillo_logo(0.045), 40 / 30)
for c in cortes:  # clic de proyector en cada corte
    place(sfx, clic_pelicula(0.05), c)
for c in rafaga_clics:  # ráfagas: clics más suaves
    place(sfx, clic_pelicula(0.03), c)
for k in range(16):  # logos que pasan en la tarjeta
    place(sfx, blip(2200, 0.02, 0.02), CARD + (14 + 7 * k) / 30)
place(sfx, campana(1318.5, 0.11, 1.4), CARD + 126 / 30)
place(sfx, campana(1975.5, 0.09, 1.4), CARD + 129 / 30)
place(sfx, brillo_logo(0.07), CIERRE)
sfx = reverb(sfx, 1.0, 0.18, 7000, seed=21)
sfx /= np.abs(sfx).max()

sf.write('public/audio/ysi-mezcla.wav', master(mus * 0.88 + sfx * 0.3).astype(np.float32), SR)
print('ok', len(cortes), 'tomas; última en', round(cortes[-1], 2), 's')
