# Música y sonidos originales del video de lanzamiento de Camina (generados por código: sin derechos de terceros).
# 35 s, 48 kHz estéreo. Estructura: ciudad tranquila (0-4) -> pasos (4-8) -> presentación (8-11) ->
# demostración con ritmo (11-27) -> subida y golpe del logo (27-35).
# Uso: python3 scripts/musica.py  -> public/audio/musica.wav y public/audio/sfx.wav
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
BPM = 112
BEAT = 60 / BPM

def lp(x, f, o=2):
    return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)

def hp(x, f, o=2):
    return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)

def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)

def env(n, a, d, s=0.0, r=0.0, sus=0.0):
    e = np.zeros(n)
    ia, idd = int(a * SR), int(d * SR)
    ia = max(ia, 1)
    e[:ia] = np.linspace(0, 1, ia)
    e[ia:ia + idd] = np.linspace(1, s, len(e[ia:ia + idd]))
    e[ia + idd:] = s * np.exp(-np.arange(n - ia - idd) / max(1, r * SR)) if r else s
    return e

def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i] * gain

def nota(f):
    return 440 * 2 ** ((f - 69) / 12)

def ramp(a, b, t0, t1):
    return np.clip((t - t0) / (t1 - t0), 0, 1) * (b - a) + a

mus = np.zeros((N, 2))

# --- Colchón (pads): acordes en La menor -> Fa -> Do -> Sol, con cuerdas suaves y levemente desafinadas
acordes = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
bar = BEAT * 4
pad = np.zeros(N)
for k in range(int(DUR / bar) + 1):
    ch = acordes[k % 4]
    n = int(bar * SR * 1.15)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for m in ch:
        for det in (-0.12, 0.0, 0.12):
            f = nota(m) * 2 ** (det / 12)
            s += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) + 0.35 * np.sin(2 * np.pi * 2 * f * tt)
    s *= env(n, 0.6, 0.2, 0.9, 0.5)
    place(pad, s / 12, k * bar)
pad = lp(pad, 1800)
pad_gain = ramp(0.0, 0.55, 0, 2.5) * (1 + 0.4 * ramp(0, 1, 11, 27)) * (1 - ramp(0, 0.6, 27.0, 27.6) * 0) 
mus[:, 0] += pad * pad_gain
mus[:, 1] += np.roll(pad, 240) * pad_gain

# --- Ciudad: ambiente suave (ruido filtrado) solo al comienzo
amb = bp(rng.normal(0, 1, N), 200, 2500) * 0.05 * (1 - ramp(0, 1, 6, 9))
mus[:, 0] += amb
mus[:, 1] += np.roll(amb, 900)

# --- Bombo
def bombo():
    n = int(0.45 * SR)
    tt = np.arange(n) / SR
    f = 120 * np.exp(-tt * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)

def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    x = hp(rng.normal(0, 1, n), 7000) * np.exp(-np.arange(n) / SR * (12 if open_ else 60))
    return x * 0.5

def clap():
    n = int(0.25 * SR)
    x = bp(rng.normal(0, 1, n), 900, 4000) * np.exp(-np.arange(n) / SR * 18)
    return x * 0.6

drum = np.zeros(N)
tb = 4.0
while tb < 27.0:
    i = round((tb - 4.0) / BEAT)
    if tb < 8:  # pulso suave, como latido
        if i % 2 == 0:
            place(drum, bombo(), tb, 0.45)
    elif tb >= 11:
        place(drum, bombo(), tb, 0.75)
        if i % 2 == 1:
            place(drum, clap(), tb, 0.55)
        place(drum, hat(), tb + BEAT / 2, 0.35)
        if i % 4 == 3:
            place(drum, hat(True), tb + BEAT / 2, 0.25)
    tb += BEAT
mus[:, 0] += drum
mus[:, 1] += drum

# --- Bajo con arpegio en corcheas (11-27 s)
bajo = np.zeros(N)
tb = 11.0
k = 0
while tb < 27.0:
    ch = acordes[int((tb) / bar) % 4]
    f = nota(ch[0] - 12 + [0, 12, 7, 12][k % 4])
    n = int(BEAT / 2 * SR)
    tt = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * f * tt)) * 0.4 + np.sin(2 * np.pi * f * tt)
    place(bajo, s * env(n, 0.005, 0.18, 0.3, 0.05), tb, 0.22)
    tb += BEAT / 2
    k += 1
bajo = lp(bajo, 900)
mus[:, 0] += bajo
mus[:, 1] += bajo

# --- Arpegio brillante (16-27 s), "tecnológico"
arp = np.zeros(N)
tb = 16.0
k = 0
while tb < 27.0:
    ch = acordes[int(tb / bar) % 4]
    f = nota(ch[k % 4] + 12)
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 3 * f * tt)
    place(arp, s * np.exp(-tt * 14), tb, 0.12)
    tb += BEAT / 4
    k += 1
mus[:, 0] += arp * 0.9
mus[:, 1] += np.roll(arp, int(SR * BEAT / 8)) * 0.9

# --- Subida (riser) 24-27 s y golpe + acorde grande en el logo (27.2 s y 30 s)
r0, r1 = 24.0, 27.15
n = int((r1 - r0) * SR)
tt = np.arange(n) / SR
riser = hp(rng.normal(0, 1, n), 800) * (tt / tt[-1]) ** 2 * 0.25
sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * (tt / tt[-1]) ** 2) / SR) * (tt / tt[-1]) ** 2 * 0.08
place(mus[:, 0], riser + sweep, r0)
place(mus[:, 1], np.roll(riser, 300) + sweep, r0)

def impacto(at, g):
    n = int(2.5 * SR)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tt * 3) + 32) / SR) * np.exp(-tt * 2.2)
    ruido = lp(rng.normal(0, 1, n), 1200) * np.exp(-tt * 6) * 0.3
    x = (sub + ruido) * g
    place(mus[:, 0], x, at)
    place(mus[:, 1], x, at)

impacto(27.15, 1.0)
impacto(30.0, 1.15)
# acorde final abierto (Do mayor amplio) que se apaga al final
n = int(7.5 * SR)
tt = np.arange(n) / SR
fin = np.zeros(n)
for m in [36, 48, 55, 60, 64, 67, 72, 76]:
    for det in (-0.08, 0.08):
        fin += np.sin(2 * np.pi * nota(m) * 2 ** (det / 12) * tt)
fin = lp(fin, 2500) * env(n, 0.08, 0.5, 0.6, 3.5) / 16
place(mus[:, 0], fin, 27.15, 1.7)
place(mus[:, 1], np.roll(fin, 200), 27.15, 1.7)
# segundo acorde, más alto, con el logo (30 s)
place(mus[:, 0], fin, 30.0, 1.4)
place(mus[:, 1], np.roll(fin, 300), 30.0, 1.4)

# Fundido de salida y normalizado
mus *= np.clip((DUR - t) / 1.2, 0, 1)[:, None]
mus /= np.max(np.abs(mus)) * 1.12
wavfile.write('public/audio/musica.wav', SR, (mus * 32767).astype(np.int16))

# ---------------- Efectos ----------------
sfx = np.zeros((N, 2))

def paso(at, lado):
    n = int(0.12 * SR)
    x = bp(rng.normal(0, 1, n), 120, 1800) * np.exp(-np.arange(n) / SR * 45) * 0.5
    i = 0 if lado else 1
    place(sfx[:, i], x, at, 1.0)
    place(sfx[:, 1 - i], x, at, 0.55)

for k in range(8):
    paso(4.0 + k * 0.5, k % 2 == 0)

def whoosh(at, d=0.5, g=0.35):
    n = int(d * SR)
    tt = np.arange(n) / SR
    x = rng.normal(0, 1, n)
    x = bp(x, 300, 6000) * np.sin(np.pi * tt / d) ** 2 * g
    place(sfx[:, 0], x, at - d / 2)
    place(sfx[:, 1], np.roll(x, 400), at - d / 2)

for at in [4.0, 8.0, 11.0, 16.0, 21.0, 27.0]:
    whoosh(at)

def moneda(at, g=0.35):
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1568 * tt) * np.exp(-tt * 9) + 0.8 * np.sin(2 * np.pi * 2093 * tt) * np.exp(-tt * 7) * (tt > 0.07))
    place(sfx[:, 0], x * g, at)
    place(sfx[:, 1], x * g, at)

for at in [13.9, 17.2, 18.0, 18.8]:
    moneda(at)

def clic(at, g=0.25):
    n = int(0.03 * SR)
    x = hp(rng.normal(0, 1, n), 3000) * np.exp(-np.arange(n) / SR * 200) * g
    place(sfx[:, 0], x, at)
    place(sfx[:, 1], x, at)

for at in [22.6, 23.9, 24.6, 25.0, 25.4, 25.8]:
    clic(at)
# confirmación del canje
moneda(26.2, 0.45)
moneda(26.35, 0.35)

sfx /= max(1e-9, np.max(np.abs(sfx))) * 1.25
wavfile.write('public/audio/sfx.wav', SR, (sfx * 32767).astype(np.int16))
print('ok')
