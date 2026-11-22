# Banda sonora de «¿Y si cada paso…?» (sin voz). Original, generada por código: uso comercial libre.
# 90 BPM: 1 tiempo = 2/3 s = 20 cuadros (cada corte del montaje cae en un tiempo). Progresión C – G – Am – F.
#   0–2,7   intro: huellas (pasos), letras que se arman, colchón suave
#   2,7–8   piano en corcheas y pulso suave; acento en «contara?»
#   8–17,3  Bolivia y Tarija: cuerdas, bombo, palmas, bajo; campanas en Tarija
#   17,3–25,3 comercios y app: sigue el ritmo y crece hasta un redoble
#   25,3–30,7 tarjeta: respiro (piano y colchón), un clic por cada logo, campana al llegar el logo de Camina
#   30,7–35 cierre: golpe, acorde final y brillo del logo
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
INTRO, CARD, CIERRE = 80 / 30, 760 / 30, 920 / 30

# cortes del montaje (en tiempos, igual que src/YSi.tsx)
DUR_TOMAS = [1, 1, 1, 1, 1, 1, 2] + [1] * 7 + [1] * 5 + [0.5] * 4 + [1] * 6 + [1] * 6
cortes = [INTRO]
for d in DUR_TOMAS[:-1]:
    cortes.append(cortes[-1] + d * B)

C_, G_, AM, F_ = [48, 55, 60, 64, 67], [43, 55, 59, 62, 67], [45, 57, 60, 64, 69], [41, 53, 57, 60, 65]
PROG = [C_, G_, AM, F_]
def acorde(tt):
    if tt >= CIERRE:
        return [36, 48, 55, 60, 62, 64, 67, 72]
    return PROG[int(tt / BAR) % 4]

mus = np.zeros((N, 2))

# Colchón / cuerdas por compás
for k in range(int(DUR / BAR) + 1):
    a0 = k * BAR
    if a0 >= CIERRE:
        break
    a1 = min(a0 + BAR, CIERRE)
    ch = acorde(a0)
    x = sum(cuerdas(m + 12, a1 - a0 + 0.8, seed=k * 7 + j) for j, m in enumerate(ch[1:]))
    place(mus, x / 4, a0)
g_pad = curva(t, [(0, 0.0), (0.8, 0.35), (2.67, 0.4), (8, 0.55), (12.67, 0.65), (17.33, 0.55), (25.2, 0.75), (25.33, 0.8), (30.5, 0.95), (30.67, 0)])
mus *= g_pad[:, None]

# Acorde final (cierre)
n = int((DUR - CIERRE) * SR)
fin = sum(cuerdas(m, DUR - CIERRE, seed=90 + i) for i, m in enumerate([36, 48, 55, 60, 64, 67, 72, 76]))
fin = fin * env(n, 0.03, 0.8, 0.7, 2.0)[:, None] / 2.0
place(mus, filt(fin, 3500), CIERRE)

# Piano: corcheas del motivo desde 2,7 s; en la tarjeta, notas sueltas; en el cierre, el motivo resuelto
pno = np.zeros(N)
tb = INTRO
k = 0
MOT = [2, 3, 4, 3, 2, 3, 4, 1]
while tb < CARD - 1e-6:
    ch = acorde(tb)
    m = ch[MOT[k % 8]] + 12
    place(pno, piano(m, 1.6, 0.7 if k % 2 else 0.85), tb)
    tb += B / 2
    k += 1
for at, m in [(CARD, 76), (CARD + 2 * B, 79), (CARD + 4 * B, 72), (CARD + 6 * B, 74), (CARD + 8 * B, 76), (CARD + 10 * B, 79), (CIERRE, 84), (CIERRE, 72), (CIERRE + 1.2, 79), (CIERRE + 2.0, 76)]:
    place(pno, piano(m, 3.0, 0.9), at, 2.2)
mus += reverb(estereo(pno * 0.14), 2.4, 0.3, 5000, seed=3)

# Batería y bajo
bat = np.zeros((N, 2))
tb = INTRO
beat = 0
while tb < CARD - 1e-6:
    if tb < 5.33:
        if beat % 2 == 0:
            place(bat, estereo(bombo(0.55)), tb)
    else:
        place(bat, estereo(bombo(0.8 if tb < 8 else 0.95)), tb)
        place(bat, np.stack([plat(g=0.5), plat(g=0.4)], 1), tb + B / 2)
        if tb >= 8 and beat % 2 == 1:
            place(bat, reverb(estereo(palma(0.85)), 1.0, 0.25, 7000, seed=beat), tb)
        if tb >= 12.67 and tb < 17.33:
            place(bat, np.stack([plat(True, 0.45), plat(True, 0.55)], 1), tb + B / 2)
        if tb >= 5.33:
            for s in (0.25, 0.75):
                place(bat, np.stack([plat(g=0.22), plat(g=0.28)], 1), tb + s * B)
    tb += B
    beat += 1
# redoble hacia la tarjeta
at = CARD - 1.33
while at < CARD - 1e-6:
    place(bat, estereo(caja(0.25 + 0.5 * (at - (CARD - 1.33)) / 1.33)), at)
    at += B / 4 if at < CARD - 0.66 else B / 8
for at in [8.0, 12.67]:
    place(bat, np.stack([crash(2.4, 0.5), crash(2.4, 0.45)], 1), at)
mus += bat * 0.85

bajo = np.zeros(N)
tb = 8.0
while tb < CARD - 1e-6:
    m = acorde(tb)[0] - 12
    n = int(B / 2 * SR * 0.9)
    tt = np.arange(n) / SR
    place(bajo, (np.sin(2 * np.pi * nota(m) * tt) + 0.2 * saw(nota(m), n)) * env(n, 0.004, 0.12, 0.65, 0.03), tb)
    tb += B / 2
mus += estereo(filt(bajo, 700) * 0.42)

# Campanas en Tarija (12,7–17,3 s): melodía simple
mel = np.zeros((N, 2))
for i, (bt, m) in enumerate([(0, 76), (1.5, 74), (2, 72), (4, 79), (5.5, 76), (6, 74)]):
    place(mel, campana(nota(m + 12), 0.5, 1.6), 12.67 + bt * B)
mus += reverb(mel * 0.12, 2.0, 0.35, 7000, seed=5)

# Subidas, golpes
place(mus, subida(1.3, 0.1), CARD - 1.3)
place(mus, subida(0.9, 0.12, 300, 10000), CIERRE - 0.9)
place(mus, reverso(0.8, 0.3), CIERRE - 0.8)
place(mus, golpe(0.95, 3.5), CIERRE)
place(mus, np.stack([crash(4.0, 0.7), crash(4.0, 0.65)], 1), CIERRE)
place(mus, estereo(bombo(1.1)), CIERRE)
place(mus, golpe(0.5, 1.6), 220 / 30)  # «contara?»

mus = reverb(mus, 1.3, 0.12, 7000, seed=11)
mus *= (np.clip((DUR - t) / 1.4, 0, 1) ** 1.5)[:, None]
mus = filt(mus, 28, 'high')
mus /= np.abs(mus).max()

# ---------- Efectos ----------
sfx = np.zeros((N, 2))
for i, at in enumerate([0.0, 0.3, 0.6, 0.9]):  # huellas de la intro
    place(sfx, paso(0.35, i % 2 == 0), at)
for i in range(8):  # letras que se arman
    place(sfx, blip(1800 + 140 * i, 0.03, 0.025), 44 / 30 + i * 0.05)
place(sfx, brillo_logo(0.05), 40 / 30)
for c in cortes:  # clic de proyector en cada corte
    place(sfx, clic_pelicula(0.06), c)
for at in [8.0, 12.67, 17.33, 21.33]:  # cambios de capítulo
    place(sfx, whoosh(0.6, 0.12), at - 0.4)
place(sfx, campana(1568, 0.1, 1.2), 220 / 30)
for k in range(16):  # logos que pasan en la tarjeta
    place(sfx, blip(2200, 0.025, 0.02), CARD + (14 + 7 * k) / 30)
place(sfx, campana(1318.5, 0.12, 1.4), CARD + 126 / 30)
place(sfx, campana(1975.5, 0.1, 1.4), CARD + 129 / 30)
place(sfx, brillo_logo(0.08), CIERRE)
for at in [CIERRE + 0.45, CIERRE + 0.9]:
    place(sfx, blip(1400, 0.03, 0.05), at)
for at in [CIERRE + 1.87, CIERRE + 2.0]:
    place(sfx, blip(1760, 0.04, 0.05), at)
sfx = reverb(sfx, 1.0, 0.18, 7000, seed=21)
sfx /= np.abs(sfx).max()

sf.write('public/audio/ysi-mezcla.wav', master(mus * 0.85 + sfx * 0.35).astype(np.float32), SR)
print('ok', len(cortes), 'cortes, último', round(cortes[-1], 2))
