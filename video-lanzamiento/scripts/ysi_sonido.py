# Banda sonora de «¿Y si cada paso…?» (sin voz).
# Música: «Glassworks: IV. Rubric» — Philip Glass. Interpretada por Signal, dirigida por Brad Lubman (en vivo en Le Poisson
# Rouge). Usada con permiso (Camina). Archivo: public/audio/fuente/rubric.mp3 (no se sube a GitHub).
# Igual que en el video de referencia: empieza en la parte calma (227,49 s de la obra) y la sección fuerte (230,02 s) entra
# justo cuando termina la apertura; un único empalme en el 20,29 s del video (en un corte de imagen, donde los dos tramos
# coinciden 94 % en armonía) lleva al final de la obra: el golpe final (360,37 s) cae en el 33,6 s, con el logo.
# Entrada fuerte desde el primer cuadro, dos respiros en el medio, y encima solo efectos discretos (clic de proyector en
# cada cambio de toma, huellas, logos y brillo del logo).
# Uso: npx esbuild scripts/ysi_linea.ts --bundle --platform=node --outfile=/tmp/ysi_linea.js && node /tmp/ysi_linea.js > public/audio/ysi-linea.json
#      python3 scripts/ysi_sonido.py  ->  public/audio/ysi-mezcla.wav
import sys, os, io, json, subprocess, math
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import soundfile as sf
from sintes import *

DUR = 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
B = 60 / 94.646
L = json.load(open('public/audio/ysi-linea.json'))
F = lambda fr: fr / 30
CARD = F(L['intro'] + L['montaje'])
CIERRE = F(L['intro'] + L['montaje'] + L['tarjeta'])
SA = 227.486               # inicio (parte calma; la sección fuerte entra 4 tiempos después, con el montaje)
EMPALME = 32 * B           # 20,29 s del video
FINAL = 53 * B             # 33,60 s: golpe final de Rubric
SB = 360.374 - FINAL       # el segundo tramo se alinea para que el golpe final caiga en FINAL

def tramo(ini, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{ini:.4f}', '-t', f'{dur:.4f}', '-i', 'public/audio/fuente/rubric.mp3',
                          '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True).stdout
    x, _ = sf.read(io.BytesIO(raw))
    return x

xf = 0.15
a = tramo(SA, EMPALME + xf / 2)
b = tramo(SB + EMPALME - xf / 2, DUR - EMPALME + xf / 2)
# mismo volumen a los dos lados del empalme: el segundo tramo arranca al nivel del primero y vuelve a su nivel en 2 s
rms = lambda x: np.sqrt((x ** 2).mean()) + 1e-9
ga = rms(a[-int(0.5 * SR):]) / rms(b[int(xf * SR):int((xf + 0.5) * SR)])
rampa = np.interp(np.arange(len(b)) / SR, [0, xf, xf + 2.0], [ga, ga, 1.0])
b = b * rampa[:, None]
mus = np.zeros((N, 2))
na, nx = len(a), int(xf * SR)
ea = np.ones(na); ea[-nx:] = np.cos(np.linspace(0, np.pi / 2, nx))
eb = np.ones(len(b)); eb[:nx] = np.sin(np.linspace(0, np.pi / 2, nx))
place(mus, a * ea[:, None], 0)
place(mus, b * eb[:, None], EMPALME - xf / 2)
RESPIROS = [(10.3, 11.9), (15.9, 17.0)]  # paisajes de Bolivia y las tomas de la plaza y la Loma (sin palabras)
pts = [(0, 0.0), (1.2, 0.0), (1.9, 0.35), (2.45, 1.0)]  # como la referencia: silencio, el logo solo, y la música entra con el montaje
for r0, r1 in RESPIROS:
    pts += [(r0 - 0.5, 1.0), (r0 + 0.3, 0.8), (r1 - 0.3, 0.8), (r1 + 0.4, 1.0)]  # respiros suaves (la referencia es muy pareja)
pts += [(CARD - 0.1, 1.0), (CARD + 0.4, 0.82), (CIERRE - 0.5, 0.82), (CIERRE, 1.0), (DUR, 1.0)]
mus *= curva(t, pts)[:, None]
mus /= np.abs(mus).max()

# ---------- Efectos (discretos: la música manda) ----------
sfx = np.zeros((N, 2))
for i, at in enumerate([0.0, 0.3, 0.6, 0.9]):  # huellas de la intro
    place(sfx, paso(0.35, i % 2 == 0), at)
place(sfx, brillo_logo(0.035), 40 / 30)
for tm in L['tomas']:  # clic de proyector en cada cambio de toma y en las ráfagas
    place(sfx, clic_pelicula(0.06), F(tm['desde']))
    if tm['rafaga']:
        for k in range(1, tm['rafaga']['n']):
            place(sfx, clic_pelicula(0.045), F(tm['desde'] + k * tm['rafaga']['cada']))
for k in range(16):  # logos de la tarjeta
    place(sfx, blip(2200, 0.02, 0.02), CARD + (14 + 7 * k) / 30)
place(sfx, campana(1318.5, 0.08, 1.4), CARD + 126 / 30)
place(sfx, brillo_logo(0.06), CIERRE)
sfx = reverb(sfx, 0.8, 0.12, 8000, seed=21)
sfx /= np.abs(sfx).max()

mezcla = mus * 0.62 + sfx * 0.32
mezcla = mezcla / np.abs(mezcla).max() * 0.89  # sin compresión: dinámica natural, como la referencia
sf.write('public/audio/ysi-mezcla.wav', mezcla.astype(np.float32), SR)
print('ok; tarjeta', round(CARD, 2), 's; cierre', round(CIERRE, 2), 's; empalme', round(EMPALME, 2), 's; golpe final', round(FINAL, 2), 's')
