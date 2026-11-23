# Banda sonora de «¿Y si cada paso…?» (sin voz).
# Música: «Glassworks: IV. Rubric» — Philip Glass. Interpretada por Signal, dirigida por Brad Lubman (en vivo en Le Poisson
# Rouge). Usada con permiso de los titulares (Camina). Archivo: public/audio/fuente/rubric.mp3 (no se sube a GitHub).
# Un solo tramo continuo, sin cortes: los últimos ~35 s de la obra (desde 326,78 s). El golpe final de Rubric (360,37 s)
# cae en el segundo 33,6 del video, durante el cierre con el logo, y la última nota se apaga sola.
# Todo el montaje va al pulso de la obra (94,65 BPM, 1 toma = 1 tiempo). Encima solo efectos, más presentes que la música.
# Uso: python3 scripts/ysi_sonido.py  ->  public/audio/ysi-mezcla.wav
import sys, os, io, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import soundfile as sf
from sintes import *

DUR = 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
BPM = 94.646
TI = 30 * 60 / BPM  # cuadros por tiempo
S0 = 360.374 - 53 * 60 / BPM  # ≈ 326,78 s: el video empieza en un tiempo y el golpe final cae en el tiempo 53

DUR_TOMAS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1]
RAFAGAS = {7: (4, 5), 13: (2, 10), 19: (8, 5), 28: (5, 4)}
INTRO = round(4 * TI) / 30
cortes, clics = [], []
u = 0
for i, d in enumerate(DUR_TOMAS):
    at = round(TI * (4 + u)) / 30
    cortes.append(at)
    if i in RAFAGAS:
        n, c = RAFAGAS[i]
        clics += [at + k * c / 30 for k in range(1, n)]
    u += d
CARD = round(TI * (4 + u)) / 30          # ≈ 24,7 s
CIERRE = round(TI * (4 + u + 8)) / 30    # ≈ 29,8 s
FINAL = 53 * 60 / BPM                    # ≈ 33,6 s: golpe final de Rubric

raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{S0:.4f}', '-t', str(DUR), '-i', 'public/audio/fuente/rubric.mp3',
                      '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True).stdout
mus, _ = sf.read(io.BytesIO(raw))
mus = np.pad(mus, ((0, max(0, N - len(mus))), (0, 0)))[:N]
# entrada suave, la tarjeta un poco más baja, y vuelve con todo en el cierre
mus *= curva(t, [(0, 0.0), (0.25, 1.0), (CARD - 0.1, 1.0), (CARD + 0.4, 0.72), (CIERRE - 0.5, 0.72), (CIERRE, 1.0), (DUR, 1.0)])[:, None]
mus /= np.abs(mus).max()

# ---------- Efectos ----------
sfx = np.zeros((N, 2))
for i, at in enumerate([0.0, 0.3, 0.6, 0.9]):  # huellas de la intro
    place(sfx, paso(0.5, i % 2 == 0), at)
place(sfx, brillo_logo(0.045), 40 / 30)
for i in range(6):  # CAMINA se arma
    place(sfx, blip(1500 + 180 * i, 0.03, 0.03), (44 + 4 + i * 16 / 5) / 30)
for c in cortes:
    place(sfx, clic_pelicula(0.07), c)
    place(sfx, whoosh(0.25, 0.05, 900, 7000), c + 0.1)
for c in clics:
    place(sfx, clic_pelicula(0.03), c)
for k in range(16):  # logos de la tarjeta
    place(sfx, blip(2200, 0.02, 0.02), CARD + (14 + 7 * k) / 30)
place(sfx, campana(1318.5, 0.1, 1.4), CARD + 126 / 30)
place(sfx, brillo_logo(0.07), CIERRE)
place(sfx, brillo_logo(0.05), FINAL)
sfx = reverb(sfx, 1.0, 0.18, 7000, seed=21)
sfx /= np.abs(sfx).max()

sf.write('public/audio/ysi-mezcla.wav', master(mus * 0.5 + sfx * 0.55, umbral=0.35).astype(np.float32), SR)
print('ok', len(cortes), 'tomas; tarjeta', round(CARD, 2), 's; cierre', round(CIERRE, 2), 's; golpe final', round(FINAL, 2), 's; inicio en Rubric', round(S0, 3))
