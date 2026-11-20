# Música y sonidos originales del video de lanzamiento de Camina (generados por código: sin derechos de terceros).
# 35 s, 48 kHz estéreo. Estructura: ciudad tranquila (0-4) -> pasos (4-8) -> presentación (8-11) ->
# demostración con ritmo (11-27) -> subida y golpe del logo (27-35).
# Uso: python3 scripts/musica.py  -> public/audio/musica.wav y public/audio/sfx.wav
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

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
pad_gain = ramp(0.0, 0.55, 0, 2.5) * (1 + 0.4 * ramp(0, 1, 10, 27)) * (1 - ramp(0, 0.6, 27.0, 27.6) * 0) 
mus[:, 0] += pad * pad_gain
mus[:, 1] += np.roll(pad, 240) * pad_gain

# --- Ciudad: ambiente suave (ruido filtrado) solo al comienzo
amb = bp(rng.normal(0, 1, N), 200, 1500) * 0.025 * (1 - ramp(0, 1, 5, 8))
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
    x = bp(rng.normal(0, 1, n), 6000, 10000) * np.exp(-np.arange(n) / SR * (14 if open_ else 70))
    return x * 0.22

def clap():
    # golpe suave tipo "snap" grave, sin ruido áspero
    n = int(0.2 * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 30) * 0.5 + bp(rng.normal(0, 1, n), 1200, 2600) * np.exp(-tt * 40) * 0.12
    return x

drum = np.zeros(N)
tb = 3.5
while tb < 27.0:
    i = round((tb - 3.5) / BEAT)
    if tb < 7:  # pulso suave, como latido
        if i % 2 == 0:
            place(drum, bombo(), tb, 0.45)
    elif tb >= 10:
        place(drum, bombo(), tb, 0.7)
        if i % 2 == 1:
            place(drum, clap(), tb, 0.45)
        place(drum, hat(), tb + BEAT / 2, 0.35)
        if i % 4 == 3:
            place(drum, hat(True), tb + BEAT / 2, 0.25)
    tb += BEAT
mus[:, 0] += drum
mus[:, 1] += drum

# --- Bajo con arpegio en corcheas (11-27 s)
bajo = np.zeros(N)
tb = 10.0
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
tb = 14.5
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
riser = bp(rng.normal(0, 1, n), 600, 5000) * (tt / tt[-1]) ** 2 * 0.12
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
def reverb(x, seg=1.4, wet=0.2):
    n = int(seg * SR)
    ir = rng.normal(0, 1, (n, 2)) * np.exp(-np.arange(n) / SR * 4.5)[:, None]
    ir = np.stack([lp(ir[:, 0], 6000), lp(ir[:, 1], 6000)], 1)
    ir /= np.sqrt((ir ** 2).sum(0))
    w = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + w * wet * 3

mus = reverb(mus, 1.6, 0.18)
mus = np.stack([lp(mus[:, 0], 11000), lp(mus[:, 1], 11000)], 1)
mus *= np.clip((DUR - t) / 1.2, 0, 1)[:, None]
mus /= np.max(np.abs(mus)) * 1.12
wavfile.write('public/audio/musica.wav', SR, (mus * 32767).astype(np.int16))

# ---------------- Efectos ----------------
sfx = np.zeros((N, 2))

def paso(at, lado):
    # pisada suave: golpe grave filtrado, sin ruido agudo
    n = int(0.16 * SR)
    tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 95 * tt) * np.exp(-tt * 38) + lp(rng.normal(0, 1, n), 700) * np.exp(-tt * 55) * 0.35) * 0.45
    i = 0 if lado else 1
    place(sfx[:, i], x, at, 1.0)
    place(sfx[:, 1 - i], x, at, 0.6)

for k in range(8):
    paso(3.5 + k * 0.44, k % 2 == 0)

def whoosh(at, d=0.8, g=0.12):
    n = int(d * SR)
    tt = np.arange(n) / SR
    x = lp(bp(rng.normal(0, 1, n), 250, 3000), 2500) * np.sin(np.pi * tt / d) ** 3 * g
    place(sfx[:, 0], x, at - d / 2)
    place(sfx[:, 1], np.roll(x, 600), at - d / 2)

for at in [3.5, 7.0, 10.0, 14.5, 18.5, 24.0, 27.05]:
    whoosh(at)
for at in [25.0, 26.0]:
    whoosh(at, 0.5, 0.06)

def moneda(at, g=0.18):
    # campanita suave (dos notas), como la moneda de la app
    n = int(0.9 * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * 1318 * tt) * np.exp(-tt * 7) + 0.7 * np.sin(2 * np.pi * 1976 * tt) * np.exp(-tt * 6) * (tt > 0.06)
    x = lp(x, 6000)
    place(sfx[:, 0], x * g, at)
    place(sfx[:, 1], np.roll(x, 300) * g, at)

for at in [12.07, 15.5, 16.2, 16.9]:
    moneda(at)

def toque(at, g=0.12):
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 120) * g
    place(sfx[:, 0], x, at)
    place(sfx[:, 1], x, at)

for at in [21.6, 21.8, 22.0, 22.2]:
    toque(at)
# confirmación del canje: acorde ascendente suave
moneda(22.77, 0.22)
moneda(22.92, 0.18)

sfx = reverb(sfx, 1.0, 0.22)
sfx /= max(1e-9, np.max(np.abs(sfx))) * 1.6
wavfile.write('public/audio/sfx.wav', SR, (sfx * 32767).astype(np.int16))
print('ok')
