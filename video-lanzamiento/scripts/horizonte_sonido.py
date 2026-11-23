# Banda sonora del teaser «Hay más por caminar» (src/Horizonte.tsx).
# Música: «Glassworks: IV. Rubric» — Philip Glass, interpretada por Signal (usada con permiso). Como en los teasers de
# referencia: entra suave y crece (219,2 s → la entrada fuerte de 230,0 s cae a los 10,8 s del video), se corta en seco al
# terminar el montaje (tiempo 24), silencio, y el golpe final de la obra (360,37 s) con el horizonte y el logo (tiempo 25).
# Uso: python3 scripts/horizonte_sonido.py  ->  public/audio/horizonte-mezcla.wav
import sys, os, io, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import soundfile as sf
from sintes import SR, place, curva

DUR = 19.5
N = int(SR * DUR)
t = np.arange(N) / SR
B = 60 / 94.646
S = 219.20
CORTE = round(24 * B * 30) / 30
FINAL = round(25 * B * 30) / 30

def tramo(ini, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{ini:.4f}', '-t', f'{dur:.4f}', '-i', 'public/audio/fuente/rubric.mp3',
                          '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True).stdout
    x, _ = sf.read(io.BytesIO(raw))
    return x

mus = np.zeros((N, 2))
a = tramo(S, CORTE + 0.05)
e = np.interp(np.arange(len(a)) / SR, [0, 0.4, 3.0, 10.8, CORTE - 0.08, CORTE], [0.0, 0.3, 0.55, 1.0, 1.0, 0.0])
place(mus, a * e[:, None], 0)
fin = tramo(360.374 - 0.03, DUR - FINAL + 0.03)
place(mus, fin, FINAL - 0.03)
mus = mus / np.abs(mus).max() * 0.89
sf.write('public/audio/horizonte-mezcla.wav', mus.astype(np.float32), SR)
print('ok; corte', round(CORTE, 2), 's; final', round(FINAL, 2), 's')
