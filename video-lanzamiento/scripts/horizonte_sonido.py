# Banda sonora del teaser «Hay más por caminar» (src/Horizonte.tsx).
# Música: «Zanarkand Forest» — Mixkit (licencia libre de Mixkit, https://mixkit.co/license/#musicFree). Elegida entre
# 378 pistas de Mixkit por parecido con los teasers de referencia (pulso minimalista de ~115 por minuto, notas pulsadas
# arriba y un bajo que late). Estructura:
#   - pulsos 0-6 (el anillo suma pasos): la música entra filtrada y suave y se va abriendo;
#   - pulsos 6-28 (las fotos): plena;
#   - pulso 29 (el anillo llega al 100 % y entra el logo): golpe grave + brillo, y salta al último golpe de la obra
#     (103,35 s), que se apaga solo bajo el logo y «Muy pronto».
# También escribe src/horizontePulsos.ts: el cuadro de cada pulso, para que cada corte de imagen caiga en el golpe.
# Uso: python3 scripts/horizonte_sonido.py  ->  public/audio/horizonte-mezcla.wav + src/horizontePulsos.ts
import sys, os, io, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import soundfile as sf
import librosa
from sintes import SR, place, filt, golpe, brillo_logo, subida, reverb, crash, estereo

FUENTE = 'public/audio/fuente/zanarkand-forest.mp3'
GOLPE_PULSO = 29
FIN_OBRA = 103.35  # último golpe de la obra


def tramo(ini, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{ini:.4f}', '-t', f'{dur:.4f}', '-i', FUENTE,
                          '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True).stdout
    x, _ = sf.read(io.BytesIO(raw))
    return x


y, sr = librosa.load(FUENTE, sr=44100, mono=True, duration=40)
on = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
_, bt = librosa.beat.beat_track(onset_envelope=on, sr=sr, hop_length=256, start_bpm=115, tightness=400)
PA = librosa.frames_to_time(bt, sr=sr, hop_length=256)
S = PA[0]
video = [p - S for p in PA[:GOLPE_PULSO + 1]]
B = float(np.median(np.diff(PA)))
video += [video[-1] + B * k for k in range(1, 12)]  # pulsos después del golpe (para el cierre)
cuadros = [int(round(v * 30)) for v in video]
GOLPE = cuadros[GOLPE_PULSO] / 30
CIERRE_FR = cuadros[28]
DUR = (CIERRE_FR + 175) / 30
N = int(SR * DUR)
t = np.arange(N) / SR

xf = 0.03
a = tramo(S, GOLPE + xf / 2)
b = tramo(FIN_OBRA - xf / 2, DUR - GOLPE + xf / 2)
na, nx = len(a), int(xf * SR)
ea = np.ones(na); ea[-nx:] = np.cos(np.linspace(0, np.pi / 2, nx))
eb = np.ones(len(b)); eb[:nx] = np.sin(np.linspace(0, np.pi / 2, nx))
# entrada: filtrada y suave, se abre hasta el pulso 6 (cuando empiezan las fotos)
ABRE = video[6]
w = np.clip(np.arange(na) / SR / ABRE, 0, 1) ** 1.6
lp = filt(a, 700, 'low', 4)
a = lp * (1 - w)[:, None] + a * w[:, None]
a *= np.interp(np.arange(na) / SR, [0, 0.35, ABRE], [0.0, 0.5, 1.0])[:, None]
mus = np.zeros((N, 2))
place(mus, a * ea[:, None], 0)
place(mus, b * eb[:, None], GOLPE - xf / 2)
mus *= np.interp(t, [0, GOLPE - 0.5, GOLPE - 0.3, GOLPE - 0.01, GOLPE + 0.01, DUR - 1.4, DUR], [1, 1, 0.35, 0.35, 1, 1, 0])[:, None]  # respira antes del golpe
mus /= np.abs(mus).max()

# golpe del logo: subida corta mientras el anillo se completa, golpe grave y brillo
sfx = np.zeros((N, 2))
place(sfx, subida(0.45, 0.35, 400, 9000), GOLPE - 0.45)
place(sfx, golpe(1.0, 3.0), GOLPE)
place(sfx, brillo_logo(0.3), GOLPE + 0.02)
place(sfx, estereo(crash(2.6, 0.9)), GOLPE)
sfx = reverb(sfx, 1.6, 0.22, 7000, seed=5)
sfx /= np.abs(sfx).max()

mezcla = mus * 0.75 + sfx * 0.75
mezcla = mezcla / np.abs(mezcla).max() * 0.89
sf.write('public/audio/horizonte-mezcla.wav', mezcla.astype(np.float32), SR)
with open('src/horizontePulsos.ts', 'w') as fh:
    fh.write('// Generado por scripts/horizonte_sonido.py: cuadro (30 fps) de cada pulso de la música del teaser.\n')
    fh.write(f'export const PULSOS = {cuadros};\n')
print('S', round(S, 3), 'B', round(B, 4), 'golpe', round(GOLPE, 2), 's; dur', round(DUR, 2), 's; pulsos', cuadros)
