# Banda sonora de «¿Y si cada paso…?» (sin voz).
# Música: «Glassworks: IV. Rubric» — Philip Glass. Interpretada por Signal, dirigida por Brad Lubman (en vivo en Le Poisson
# Rouge). Usada con permiso (Camina). Archivo: public/audio/fuente/rubric.mp3 (no se sube a GitHub).
# Igual que en el video de referencia: empieza en la parte calma (227,49 s de la obra) y la sección fuerte (230,02 s) entra
# justo cuando termina la apertura; un único empalme en el 20,29 s del video (en un corte de imagen, donde los dos tramos
# coinciden 94 % en armonía) lleva al final de la obra: el golpe final (360,37 s) cae en el 33,6 s, con el logo.
# Encima: máquina de escribir en cada leyenda (letra por letra) y en cada palabra, más presente que la música.
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
mus *= curva(t, [(0, 0.0), (0.3, 1.0), (CARD - 0.1, 1.0), (CARD + 0.4, 0.75), (CIERRE - 0.5, 0.75), (CIERRE, 1.0), (DUR, 1.0)])[:, None]
mus /= np.abs(mus).max()

# ---------- Efectos ----------
r = np.random.default_rng(5)
def tecla(g=0.5, fuerte=False):
    """Golpe de máquina de escribir: clic metálico + cuerpo de madera, con pequeñas variaciones."""
    n = int(0.09 * SR)
    tt = np.arange(n) / SR
    clic = filt(filt(r.normal(0, 1, n), 2500, 'high'), 9000) * np.exp(-tt * 380)
    cuerpo = filt(filt(r.normal(0, 1, n), 500, 'high'), 2200) * np.exp(-tt * 70) * 0.7
    golpe_ = np.sin(2 * np.pi * (150 + r.uniform(-15, 15)) * tt) * np.exp(-tt * 60) * (0.6 if fuerte else 0.3)
    x = (clic + cuerpo + golpe_) * g * r.uniform(0.85, 1.1)
    p = r.uniform(0.35, 0.65)
    return np.stack([x * (1 - p) * 2, x * p * 2], 1) * 0.5

def campanilla(g=0.12):
    n = int(0.8 * SR)
    tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 2637 * tt) + 0.4 * np.sin(2 * np.pi * 5274 * tt)) * np.exp(-tt * 9)
    return estereo(x * g)

sfx = np.zeros((N, 2))
for i, at in enumerate([0.0, 0.3, 0.6, 0.9]):  # huellas de la intro
    place(sfx, paso(0.5, i % 2 == 0), at)
place(sfx, brillo_logo(0.04), 40 / 30)
for i in range(6):  # CAMINA se arma: teclas
    place(sfx, tecla(0.5), (44 + 4 + i * 16 / 5) / 30)

for tm in L['tomas']:
    d0 = tm['desde']
    place(sfx, clic_pelicula(0.03), F(d0))
    for p in tm['palabras']:  # cada palabra cae como una tecla fuerte
        place(sfx, tecla(0.75, True), F(d0 + p['en']))
    if tm['leyenda']:  # la leyenda se escribe letra por letra (cuadros 2 a 10 de la toma)
        largo = len(tm['leyenda'])
        prev = 0
        for fr in range(2, 11):
            nvis = math.floor((fr - 2) / 8 * largo) if fr < 10 else largo
            if nvis > prev:
                place(sfx, tecla(0.42), F(d0 + fr))
                prev = nvis
    if tm['rafaga']:
        for k in range(1, tm['rafaga']['n']):
            place(sfx, clic_pelicula(0.03), F(d0 + k * tm['rafaga']['cada']))

for k in range(16):  # logos de la tarjeta
    place(sfx, tecla(0.3), CARD + (14 + 7 * k) / 30)
place(sfx, campanilla(0.12), CARD + 126 / 30)
place(sfx, brillo_logo(0.06), CIERRE)
for i in range(6):  # en el cierre, CAMINA aparece: teclas
    place(sfx, tecla(0.45), CIERRE + (22 * 0.55 + i * 2) / 30)
sfx = reverb(sfx, 0.6, 0.1, 8000, seed=21)
sfx /= np.abs(sfx).max()

sf.write('public/audio/ysi-mezcla.wav', master(mus * 0.36 + sfx * 0.72, umbral=0.35).astype(np.float32), SR)
print('ok; tarjeta', round(CARD, 2), 's; cierre', round(CIERRE, 2), 's; empalme', round(EMPALME, 2), 's; golpe final', round(FINAL, 2), 's')
