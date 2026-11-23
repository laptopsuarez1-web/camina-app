# Banda sonora de «¿Y si cada paso…?» (sin voz).
# Base: «Dreaming Big» de Ahjay Stelino (Mixkit, licencia gratuita de Mixkit para música: uso en videos comerciales
# permitido, se puede editar). Se usa solo la parte con pulso (32 tiempos, del 59,07 s al 73,24 s del tema), repetida en
# el mismo punto del compás para que no se note la costura, y el final suave del tema para el cierre. Encima, capas propias
# en Re mayor (graves y cuerdas en Re y La) que crecen por capítulo, y los efectos sincronizados con el montaje.
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
CIERRE = round(80 + (u + 8) * U * 30) / 30  # ≈ 31,23 s
CAPS = [INTRO, cortes[4], cortes[8], cortes[15], cortes[22], cortes[26]]  # preguntas, ¿Y si…?, Bolivia, Tarija, ciudad, app

def tema(ini, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(ini), '-t', str(dur), '-i', 'public/audio/fuente/dreaming-big-mixkit-31.mp3',
                          '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True).stdout
    x, _ = sf.read(io.BytesIO(raw))
    return x

# 1) Base: la parte con pulso, repetida cada 32 tiempos con fundidos cortos en la costura
A0, LA = 59.07, 32 * BEAT
base = np.zeros((N, 2))
xf = int(0.03 * SR)
pos = 0.0
while pos < CIERRE + 0.5:
    seg = tema(A0, LA + 0.05)
    e = np.ones(len(seg))
    e[:xf] = np.linspace(0, 1, xf)
    e[-xf:] = np.linspace(1, 0, xf)
    place(base, seg * e[:, None], pos)
    pos += LA
# tarjeta: la base baja y se apaga en filtro (respiro), y vuelve a abrirse antes del cierre
g = curva(t, [(0, 1), (CARD - 0.1, 1), (CARD + 0.4, 0.42), (CIERRE - 0.6, 0.5), (CIERRE, 0)])
corte = curva(t, [(0, 18000), (CARD - 0.1, 18000), (CARD + 0.4, 1400), (CIERRE - 1.2, 1400), (CIERRE - 0.2, 9000)])
base = filt_var(base, corte) * g[:, None]
# cierre: el final suave del propio tema
fin = tema(96.18, DUR - CIERRE + 0.2)
fin *= np.clip((DUR - CIERRE - np.arange(len(fin)) / SR) / 1.4, 0, 1)[:, None] ** 1.3
place(base, fin * 1.1, CIERRE)
base /= np.abs(base).max()

# 2) Capas propias en Re mayor (Re y La: consonantes con todo el tema)
capas = np.zeros((N, 2))
D2, A2, D3, A3, D4, A4 = 38, 45, 50, 57, 62, 69
graves = curva(t, [(0, 0), (CAPS[2], 0.0), (CAPS[2] + 0.5, 0.35), (CAPS[3], 0.45), (CAPS[5], 0.5), (CARD, 0.5), (CARD + 0.4, 0.15), (CIERRE, 0.0)])
n = int(DUR * SR)
tt = np.arange(n) / SR
dron = np.sin(2 * np.pi * nota(D2) * tt) + 0.5 * np.sin(2 * np.pi * nota(A2) * tt)
capas += estereo(filt(dron, 250) * graves * 0.35)
cu = sum(cuerdas(m, DUR, seed=40 + i) for i, m in enumerate([D3, A3, D4, A4]))
cu_g = curva(t, [(0, 0), (CAPS[2], 0), (CAPS[2] + 1.5, 0.25), (CAPS[3], 0.4), (CAPS[3] + 3, 0.5), (CARD, 0.55), (CARD + 0.5, 0.3), (CIERRE, 0.4), (DUR, 0)])
capas += cu * cu_g[:, None] * 0.35
def timbal(g=0.4):
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(70 + 25 * np.exp(-tt * 8)) / SR) * np.exp(-tt * 3)
    return estereo(x * g)
for at in CAPS[1:]:
    place(capas, timbal(0.3), at)
place(capas, subida(1.0, 0.06, 300, 6000), CIERRE - 1.0)
place(capas, golpe(0.7, 3.0), CIERRE)
place(capas, np.stack([crash(3.0, 0.25), crash(3.0, 0.22)], 1), CIERRE)

mus = base * 0.9 + capas
mus = filt(mus, 28, 'high')
mus /= np.abs(mus).max()

# ---------- Efectos ----------
sfx = np.zeros((N, 2))
for i, at in enumerate([0.0, 0.3, 0.6, 0.9]):  # huellas de la intro
    place(sfx, paso(0.35, i % 2 == 0), at)
place(sfx, brillo_logo(0.045), 40 / 30)
for i in range(6):  # CAMINA se arma
    place(sfx, blip(1500 + 180 * i, 0.03, 0.03), (44 + 4 + i * 16 / 5) / 30)
for c in cortes:
    place(sfx, clic_pelicula(0.05), c)
for c in clics:
    place(sfx, clic_pelicula(0.03), c)
for k in range(16):  # logos de la tarjeta
    place(sfx, blip(2200, 0.02, 0.02), CARD + (14 + 7 * k) / 30)
place(sfx, campana(1174.7, 0.11, 1.4), CARD + 126 / 30)  # Re: en el tono del tema
place(sfx, campana(1760, 0.09, 1.4), CARD + 129 / 30)    # La
place(sfx, brillo_logo(0.06), CIERRE)
sfx = reverb(sfx, 1.0, 0.18, 7000, seed=21)
sfx /= np.abs(sfx).max()

sf.write('public/audio/ysi-mezcla.wav', master(mus * 0.9 + sfx * 0.28).astype(np.float32), SR)
print('ok', len(cortes), 'tomas; tarjeta', round(CARD, 2), 's; cierre', round(CIERRE, 2), 's; capítulos', [round(c, 2) for c in CAPS])
