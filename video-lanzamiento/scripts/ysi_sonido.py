# Banda sonora de «¿Y si cada paso…?» (sin voz).
# Base: «Dreaming Big» de Ahjay Stelino (Mixkit, licencia gratuita de Mixkit para música: uso en videos comerciales
# permitido). Un solo tramo continuo, sin repeticiones: del 41,80 s al 76,8 s del tema; la subida del tema cae justo en
# el cierre (logo) y la música se apaga al final. Sin capas propias encima: solo los efectos, más presentes que la música.
# Fuente: https://assets.mixkit.co/music/31/31.mp3  ->  public/audio/fuente/dreaming-big-mixkit-31.mp3
# Uso: python3 scripts/ysi_sonido.py  ->  public/audio/ysi-mezcla.wav
import sys, os, io, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import soundfile as sf
from sintes import *

DUR = 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
BEAT = 60 / 135.5
U = 1.5 * BEAT  # una unidad de montaje
INTRO = 80 / 30
DUR_TOMAS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1]
RAFAGAS = {7: (4, 5), 13: (2, 10), 19: (8, 5), 28: (5, 4)}
cortes, clics = [], []
u = 0
for i, d in enumerate(DUR_TOMAS):
    at = round((80 + u * U * 30)) / 30
    cortes.append(at)
    if i in RAFAGAS:
        n, c = RAFAGAS[i]
        clics += [at + k * c / 30 for k in range(1, n)]
    u += d
CARD = round(80 + u * U * 30) / 30          # ≈ 25,9 s
CIERRE = round(80 + u * U * 30 + 12.5 * BEAT * 30) / 30  # ≈ 31,43 s (en un tiempo del tema)
CAPS = [INTRO, cortes[4], cortes[8], cortes[15], cortes[22], cortes[26]]  # preguntas, ¿Y si…?, Bolivia, Tarija, ciudad, app

def tema(ini, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(ini), '-t', str(dur), '-i', 'public/audio/fuente/dreaming-big-mixkit-31.mp3',
                          '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True).stdout
    x, _ = sf.read(io.BytesIO(raw))
    return x

# 1) Un solo tramo continuo del tema (sin repeticiones ni empalmes): del 41,80 s al final de la parte con pulso.
# La subida del tema (73,24 s) cae justo en el cierre (logo) y desde ahí la música se apaga suave.
S0 = 41.80
mus = tema(S0, DUR)
mus = np.pad(mus, ((0, max(0, N - len(mus))), (0, 0)))[:N]
mus *= curva(t, [(0, 0.0), (0.12, 1.0), (CARD - 0.1, 1.0), (CARD + 0.5, 0.6), (CIERRE - 0.4, 0.6), (CIERRE, 1.0), (33.2, 0.85), (35.0, 0.0)])[:, None]
golpe_fin = golpe(0.5, 2.5)
golpe_fin[:, 0] = filt(golpe_fin[:, 0], 120)
golpe_fin[:, 1] = filt(golpe_fin[:, 1], 120)
place(mus, golpe_fin, CIERRE)
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
place(sfx, campana(1174.7, 0.11, 1.4), CARD + 126 / 30)  # Re: en el tono del tema
place(sfx, campana(1760, 0.09, 1.4), CARD + 129 / 30)    # La
place(sfx, brillo_logo(0.07), CIERRE)
place(sfx, np.stack([crash(2.5, 0.18), crash(2.5, 0.16)], 1), CIERRE)
sfx = reverb(sfx, 1.0, 0.18, 7000, seed=21)
sfx /= np.abs(sfx).max()

sf.write('public/audio/ysi-mezcla.wav', master(mus * 0.5 + sfx * 0.55, umbral=0.35).astype(np.float32), SR)
print('ok', len(cortes), 'tomas; tarjeta', round(CARD, 2), 's; cierre', round(CIERRE, 2), 's; capítulos', [round(c, 2) for c in CAPS])
