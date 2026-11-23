# Banda sonora del teaser «Hay más por caminar» (src/Horizonte.tsx).
# Música: «Discover» — Mixkit (licencia libre de Mixkit, https://mixkit.co/license/#musicFree), ~115 pulsos por minuto,
# como los teasers de referencia: entra suave mientras camina la silueta, crece hasta la entrada plena (las palabras) y un
# único empalme, en un pulso y donde los dos tramos coinciden en armonía, lleva al final de la obra (acordes finales con el
# logo). También escribe src/horizontePulsos.ts: el cuadro de cada pulso, para que cada corte de imagen caiga en el golpe.
# Uso: python3 scripts/horizonte_sonido.py  ->  public/audio/horizonte-mezcla.wav + src/horizontePulsos.ts
import sys, os, io, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import soundfile as sf
import librosa
from sintes import SR, place

FUENTE = 'public/audio/fuente/discover.mp3'
DUR = 23.5
N = int(SR * DUR)

def tramo(ini, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{ini:.4f}', '-t', f'{dur:.4f}', '-i', FUENTE,
                          '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True).stdout
    x, _ = sf.read(io.BytesIO(raw))
    return x

def pulsos(a, b):
    y, sr = librosa.load(FUENTE, sr=44100, mono=True, offset=a, duration=b - a)
    on = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
    _, bt = librosa.beat.beat_track(onset_envelope=on, sr=sr, hop_length=256, start_bpm=112.35, tightness=400)
    return librosa.frames_to_time(bt, sr=sr, hop_length=256) + a

PA = pulsos(18, 44)
PB = pulsos(126, 138)
i0 = int(np.argmin(np.abs(PA - 23.24)))
S = PA[i0]                       # pulso 0 del video
EMPALME = PA[i0 + 32] - S        # pulso 32: vuelve la escena del caminante
SB = PB[int(np.argmin(np.abs(PB - 129.40)))]
video = [p - S for p in PA[i0:i0 + 33]] + [EMPALME + (p - SB) for p in PB if p > SB]
cuadros = [int(round(v * 30)) for v in video]

xf = 0.06
a = tramo(S, EMPALME + xf / 2)
b = tramo(SB - xf / 2, DUR - EMPALME + xf / 2)
rms = lambda x: np.sqrt((x ** 2).mean()) + 1e-9
ga = rms(a[-int(0.4 * SR):]) / rms(b[int(xf * SR):int((xf + 0.4) * SR)])
b = b * np.interp(np.arange(len(b)) / SR, [0, xf, xf + 1.5], [ga, ga, 1.0])[:, None]
na, nx = len(a), int(xf * SR)
ea = np.ones(na); ea[-nx:] = np.cos(np.linspace(0, np.pi / 2, nx))
eb = np.ones(len(b)); eb[:nx] = np.sin(np.linspace(0, np.pi / 2, nx))
mus = np.zeros((N, 2))
place(mus, a * ea[:, None], 0)
place(mus, b * eb[:, None], EMPALME - xf / 2)
t = np.arange(N) / SR
mus *= np.interp(t, [0, 0.5, DUR - 1.6, DUR], [0, 1, 1, 0])[:, None]
mus = mus / np.abs(mus).max() * 0.89
sf.write('public/audio/horizonte-mezcla.wav', mus.astype(np.float32), SR)
with open('src/horizontePulsos.ts', 'w') as fh:
    fh.write('// Generado por scripts/horizonte_sonido.py: cuadro (30 fps) de cada pulso de la música del teaser.\n')
    fh.write(f'export const PULSOS = {cuadros};\n')
print('S', round(S, 3), 'empalme', round(EMPALME, 2), 's ->', round(SB, 2), '; pulsos', cuadros)
