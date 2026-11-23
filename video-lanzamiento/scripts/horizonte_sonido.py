# Banda sonora del teaser «Hay más por caminar» (src/Horizonte.tsx): la misma música de «¿Y si cada paso…?».
# Música: «Glassworks: IV. Rubric» — Philip Glass. Interpretada por Signal, dirigida por Brad Lubman (en vivo en Le Poisson
# Rouge). Usada con permiso (Camina). Archivo: public/audio/fuente/rubric.mp3 (no se sube a GitHub).
# Igual que en «¿Y si cada paso…?»: empieza en la parte calma (227,49 s), en silencio con la personita, la música entra y la
# sección fuerte llega con las fotos (pulso 4). Un único empalme en el pulso 6 (donde los dos tramos coinciden 96 % en
# armonía) lleva al tramo final de la obra, que crece hasta su golpe final (360,37 s): cae en el pulso 30, cuando el anillo
# llega al 100 % y entra el logo. Encima, solo los efectos de aquel video: pasos al principio, el clic de proyector en
# cada cambio de toma y el brillo del logo.
# También escribe src/horizontePulsos.ts: el cuadro de cada pulso, para que cada corte caiga en el golpe.
# Uso: python3 scripts/horizonte_sonido.py  ->  public/audio/horizonte-mezcla.wav + src/horizontePulsos.ts
import sys, os, io, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import soundfile as sf
from sintes import SR, place, curva, reverb, paso, clic_pelicula, brillo_logo

FUENTE = 'public/audio/fuente/rubric.mp3'
B = 60 / 94.646
T = 30 * B                 # cuadros por pulso
SA = 227.486               # parte calma; la sección fuerte entra 4 pulsos después
FIN = 360.374              # golpe final de la obra
EMPALME = 6                # pulso del empalme
GOLPE = 30                 # pulso del golpe final (el anillo al 100 %, entra el logo)
cuadros = [int(round(k * T)) for k in range(0, 41)]
DUR = (cuadros[GOLPE] + 125) / 30
N = int(SR * DUR)
t = np.arange(N) / SR


def tramo(ini, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{ini:.4f}', '-t', f'{dur:.4f}', '-i', FUENTE,
                          '-ac', '2', '-ar', str(SR), '-f', 'wav', '-'], capture_output=True).stdout
    x, _ = sf.read(io.BytesIO(raw))
    return x


xf = 0.15
E = EMPALME * B
G = cuadros[GOLPE] / 30
a = tramo(SA, E + xf / 2)
SB = FIN - G  # el segundo tramo se alinea para que el golpe final caiga en G
b = tramo(SB + E - xf / 2, DUR - E + xf / 2)
rms = lambda x: np.sqrt((x ** 2).mean()) + 1e-9
ga = rms(a[-int(0.5 * SR):]) / rms(b[int(xf * SR):int((xf + 0.5) * SR)])
b = b * np.interp(np.arange(len(b)) / SR, [0, xf, xf + 2.0], [ga, ga, 1.0])[:, None]
na, nx = len(a), int(xf * SR)
ea = np.ones(na); ea[-nx:] = np.cos(np.linspace(0, np.pi / 2, nx))
eb = np.ones(len(b)); eb[:nx] = np.sin(np.linspace(0, np.pi / 2, nx))
mus = np.zeros((N, 2))
place(mus, a * ea[:, None], 0)
place(mus, b * eb[:, None], E - xf / 2)
# como «¿Y si cada paso…?»: silencio con la personita, la música entra y llega plena con las fotos
mus *= curva(t, [(0, 0.0), (1.2, 0.0), (1.9, 0.35), (2.45, 1.0), (DUR, 1.0)])[:, None]
# el golpe final de la obra se apaga en seco: le damos una cola de sala para el logo
g0 = int((G - 0.05) * SR)
n6 = int(0.6 * SR)
golpe_fin = np.zeros((int(3.8 * SR), 2)); golpe_fin[:n6] = mus[g0:g0 + n6] * np.hanning(2 * n6)[n6:, None]
cola = reverb(golpe_fin, 3.2, 1.0, 6000, seed=7)  # rellenado con silencio para que la cola suene entera
cola[:n6] *= np.linspace(0, 1, n6)[:, None]
place(mus, cola * 0.5, G - 0.05)
mus /= np.abs(mus).max()

# ---------- Efectos (los de «¿Y si cada paso…?», discretos) ----------
sfx = np.zeros((N, 2))
for k in range(4):  # pasos de la personita mientras el anillo suma
    place(sfx, paso(0.3, k % 2 == 0), k * B)
cortes = [4 + k for k in range(21)] + [25 + 0.5 * k for k in range(9)]  # cada cambio de toma (pulsos)
for c in cortes:
    place(sfx, clic_pelicula(0.06), c * B)
place(sfx, brillo_logo(0.1), G)
sfx = reverb(sfx, 0.8, 0.12, 8000, seed=21)
sfx /= np.abs(sfx).max()

mezcla = mus * 0.62 + sfx * 0.32
mezcla *= np.interp(t, [0, DUR - 1.0, DUR], [1, 1, 0])[:, None]
mezcla = mezcla / np.abs(mezcla).max() * 0.89
sf.write('public/audio/horizonte-mezcla.wav', mezcla.astype(np.float32), SR)
with open('src/horizontePulsos.ts', 'w') as fh:
    fh.write('// Generado por scripts/horizonte_sonido.py: cuadro (30 fps) de cada pulso de la música del teaser (Rubric).\n')
    fh.write(f'export const PULSOS = {cuadros};\n')
print('golpe', round(G, 2), 's; dur', round(DUR, 2), 's')
