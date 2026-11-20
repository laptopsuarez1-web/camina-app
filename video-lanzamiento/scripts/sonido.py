# Identidad sonora del video de lanzamiento de Camina (todo original, generado por código: uso comercial libre).
# 35 s a 120 BPM: cada cambio de escena (5, 10, 16, 23 y 29 s) cae justo en un tiempo.
#   0–5   ambiente: colchón atmosférico, pasos, subida
#   5–10  golpe del logo, arpegio que arranca, bombo suave
#   10–23 ritmo completo (bombo, caja suave, platillos, bajo, arpegio brillante) para la demostración
#   23–29 más energía (semicorcheas, platillo abierto) y subida
#   29–35 golpe final, acorde abierto que se apaga
# Mezcla con la voz (Kokoro, Apache 2.0): la música baja sola cuando habla la voz.
# Uso: python3 scripts/sonido.py  -> public/audio/{musica,sfx}.wav y public/audio/mezcla-{hombre,mujer}.wav
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

SR = 48000
DUR = 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(11)
BPM = 120
B = 60 / BPM  # 0,5 s

def filt(x, f, kind='low', o=2):
    return sosfilt(butter(o, f, kind, fs=SR, output='sos'), x)

def nota(m):
    return 440 * 2 ** ((m - 69) / 12)

def place(buf, x, at, g=1.0):
    i = int(round(at * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    s = max(0, -i)
    j = min(len(buf), i + len(x))
    buf[max(0, i):j] += x[s : s + j - max(0, i)] * g

def env_adsr(n, a, d, s, r_tail):
    e = np.full(n, s, float)
    ia, idd = max(1, int(a * SR)), int(d * SR)
    e[:ia] = np.linspace(0, 1, ia)
    e[ia : ia + idd] = np.linspace(1, s, len(e[ia : ia + idd]))
    tail = int(r_tail * SR)
    if tail:
        e[-tail:] *= np.linspace(1, 0, tail)
    return e

def ramp(a, b, t0, t1):
    return a + (b - a) * np.clip((t - t0) / (t1 - t0), 0, 1)

def estereo(x, ancho=0.004):
    return np.stack([x, np.roll(x, int(ancho * SR))], 1)

def reverb(x, seg=1.8, wet=0.25):
    n = int(seg * SR)
    ir = rng.normal(0, 1, (n, 2)) * np.exp(-np.arange(n) / SR * 3.6)[:, None]
    ir = np.stack([filt(ir[:, 0], 5000), filt(ir[:, 1], 5000)], 1)
    ir /= np.sqrt((ir ** 2).sum(0))
    w = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + w * wet * 2.5

# Progresión: La menor add9 → Fa maj7 → Do → Sol (sus) — cálida, inspiradora
ACORDES = [[57, 64, 67, 71, 72], [53, 60, 64, 69, 72], [48, 55, 60, 64, 67], [55, 62, 67, 69, 74]]
BAR = 4 * B
def acorde(tt):
    return ACORDES[int(tt / BAR) % 4]

# ---------- Música ----------
mus = np.zeros((N, 2))

# Colchón (pads con desafinado suave), presente todo el video
pad = np.zeros(N)
for k in range(int(DUR / BAR) + 1):
    n = int(BAR * SR * 1.2)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for m in ACORDES[k % 4]:
        for det in (-0.1, 0.0, 0.1):
            f = nota(m) * 2 ** (det / 12)
            s += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) + 0.25 * np.sin(2 * np.pi * 2 * f * tt + 1)
    place(pad, s * env_adsr(n, 0.8, 0.3, 0.85, 0.6) / 15, k * BAR)
pad = filt(pad, 1400)
padg = ramp(0, 0.5, 0, 3) * ramp(1, 0.75, 10, 10.5) * ramp(1, 1.25, 23, 29)
# "bombeo" leve con el bombo desde los 10 s
bombeo = 1 - 0.35 * (t >= 10) * (t < 29) * np.exp(-((t - 10) % B) * 9)
mus += estereo(pad * padg * bombeo)

# Dron grave y textura de ciudad al comienzo
dron = np.sin(2 * np.pi * nota(33) * t) * 0.18 * ramp(0, 1, 0, 2) * ramp(1, 0, 4.5, 5.5)
tex = filt(filt(rng.normal(0, 1, N), 300, 'high'), 2000) * 0.02 * ramp(0, 1, 0, 1) * ramp(1, 0, 4, 5)
mus += estereo(dron + tex, 0.01)

def bombo(g=1.0):
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    f = 110 * np.exp(-tt * 22) + 46
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 6.5) * g

def caja():
    n = int(0.3 * SR)
    tt = np.arange(n) / SR
    cuerpo = np.sin(2 * np.pi * 185 * tt) * np.exp(-tt * 28)
    ruido = filt(filt(rng.normal(0, 1, n), 1500, 'high'), 7000) * np.exp(-tt * 22)
    return cuerpo * 0.5 + ruido * 0.22

def plat(abierto=False):
    n = int((0.35 if abierto else 0.07) * SR)
    x = filt(filt(rng.normal(0, 1, n), 7000, 'high'), 12000) * np.exp(-np.arange(n) / SR * (9 if abierto else 60))
    return x * 0.16

drum = np.zeros(N)
beat = 0
tb = 5.0
while tb < 29.0 - 1e-6:
    if 5.0 <= tb < 10.0:
        if tb >= 7.0 and beat % 2 == 0:
            place(drum, bombo(0.55), tb)
    else:
        place(drum, bombo(0.8), tb)
        if beat % 2 == 1:
            place(drum, caja(), tb, 0.55)
        place(drum, plat(), tb + B / 2)
        if tb >= 23.0:
            place(drum, plat(), tb + B / 4, 0.6)
            place(drum, plat(), tb + 3 * B / 4, 0.6)
            if beat % 2 == 1:
                place(drum, plat(True), tb + B / 2, 0.8)
    tb += B
    beat += 1
# redoble antes de 23 s y antes de 29 s
for k in range(8):
    place(drum, caja(), 22.0 + k * B / 4, 0.25 + 0.04 * k)
    place(drum, caja(), 28.0 + k * B / 4, 0.25 + 0.05 * k)
mus += estereo(drum, 0.0)

# Bajo en corcheas (10–29 s)
bajo = np.zeros(N)
tb = 10.0
k = 0
while tb < 29.0 - 1e-6:
    f = nota(acorde(tb)[0] - 24 + [0, 0, 12, 0][k % 4])
    n = int(B / 2 * SR)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * tt) + 0.3 * np.sign(np.sin(2 * np.pi * f * tt))
    place(bajo, s * env_adsr(n, 0.004, 0.12, 0.45, 0.04), tb, 0.3)
    tb += B / 2
    k += 1
mus += estereo(filt(bajo, 700))

# Arpegio (6,6–29 s): corcheas, semicorcheas desde 23 s
arp = np.zeros(N)
tb = 6.5
k = 0
while tb < 29.0 - 1e-6:
    ch = acorde(tb)
    f = nota(ch[(k * 2) % len(ch)] + 12)
    n = int(0.3 * SR)
    tt = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 11)
    g = 0.07 if tb < 10 else 0.1
    place(arp, s, tb, g)
    tb += B / 2 if tb < 23 else B / 4
    k += 1
arp = filt(arp, 6500)
mus += np.stack([arp, np.roll(arp, int(SR * B / 4))], 1) * 0.9

# Melodía simple (16–23 s): notas largas que suben
mel = np.zeros(N)
for i, (at, m) in enumerate([(16, 76), (17.5, 74), (18, 72), (19.5, 76), (20, 79), (21.5, 77), (22, 76)]):
    n = int(1.4 * SR)
    tt = np.arange(n) / SR
    s = (np.sin(2 * np.pi * nota(m) * tt) + 0.2 * np.sin(2 * np.pi * 2 * nota(m) * tt)) * env_adsr(n, 0.05, 0.3, 0.5, 0.6)
    place(mel, s, at, 0.07)
mus += estereo(filt(mel, 5000), 0.012)

# Subidas (risers) y golpes
def subida(t0, t1, g=0.14):
    n = int((t1 - t0) * SR)
    tt = np.arange(n) / SR
    k = (tt / tt[-1]) ** 2
    x = filt(filt(rng.normal(0, 1, n), 500, 'high'), 6000) * k * g
    x += np.sin(2 * np.pi * np.cumsum(220 + 1200 * k) / SR) * k * g * 0.35
    place(mus[:, 0], x, t0)
    place(mus[:, 1], np.roll(x, 500), t0)

def golpe(at, g=1.0):
    n = int(2.8 * SR)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(65 * np.exp(-tt * 2.5) + 30) / SR) * np.exp(-tt * 1.8)
    cuerpo = filt(rng.normal(0, 1, n), 900) * np.exp(-tt * 7) * 0.35
    x = (sub + cuerpo) * g
    place(mus[:, 0], x, at)
    place(mus[:, 1], x, at)

subida(3.4, 5.0, 0.1)
subida(27.0, 29.0, 0.16)
golpe(5.0, 0.8)
golpe(29.0, 1.2)
# acorde final amplio (Do mayor add9), se apaga hacia el final
n = int(6.2 * SR)
tt = np.arange(n) / SR
fin = np.zeros(n)
for m in [36, 48, 55, 60, 62, 64, 67, 72, 76]:
    for det in (-0.07, 0.07):
        fin += np.sin(2 * np.pi * nota(m) * 2 ** (det / 12) * tt)
fin = filt(fin, 3200) * env_adsr(n, 0.06, 0.6, 0.55, 3.0) / 14
mus += np.stack([np.pad(fin, (int(29 * SR), 0))[:N], np.pad(np.roll(fin, 300), (int(29 * SR), 0))[:N]], 1)

mus = reverb(mus, 1.8, 0.2)
mus *= np.clip((DUR - t) / 1.0, 0, 1)[:, None]
mus /= np.abs(mus).max() * 1.1

# ---------- Efectos ----------
sfx = np.zeros((N, 2))

def paso(at, izq):
    n = int(0.18 * SR)
    tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 35) + filt(rng.normal(0, 1, n), 600) * np.exp(-tt * 50) * 0.4) * 0.5
    place(sfx[:, 0], x, at, 1.0 if izq else 0.6)
    place(sfx[:, 1], x, at, 0.6 if izq else 1.0)

for k in range(6):
    paso(2.0 + k * B / 2, k % 2 == 0)

def swish(at, d=0.7, g=0.1):
    n = int(d * SR)
    tt = np.arange(n) / SR
    x = filt(filt(rng.normal(0, 1, n), 300, 'high'), 3500) * np.sin(np.pi * tt / d) ** 3 * g
    place(sfx[:, 0], x, at - d * 0.6)
    place(sfx[:, 1], np.roll(x, 700), at - d * 0.6)

for at in [2.0, 3.5, 10.0, 13.2, 14.6, 16.0, 18.6, 23.0]:
    swish(at)
for k in range(6):  # carrusel de "Hay mucho más"
    swish(23.0 + k * 1.0, 0.45, 0.05)

def campanita(at, g=0.16, f0=1318):
    n = int(1.0 * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * f0 * tt) * np.exp(-tt * 6) + 0.7 * np.sin(2 * np.pi * f0 * 1.5 * tt) * np.exp(-tt * 5) * (tt > 0.07)
    place(sfx[:, 0], filt(x, 7000) * g, at)
    place(sfx[:, 1], np.roll(filt(x, 7000), 250) * g, at)

def tic(at, g=0.05):
    n = int(0.03 * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 200) * g
    place(sfx[:, 0], x, at)
    place(sfx[:, 1], x, at)

for k in range(14):  # contador de pasos
    tic(10.3 + k * 0.09)
campanita(11.6, 0.2)               # +1 Punto
for k, at in enumerate([17.6, 17.85, 18.1]):  # monedas que van al premio
    campanita(at, 0.1, 1568 + 120 * k)
for at in [20.1, 20.3, 20.5, 20.7]:  # código del local
    tic(at, 0.1)
campanita(21.2, 0.22, 1046)         # canje confirmado: acorde que sube
campanita(21.32, 0.18, 1318)
campanita(21.44, 0.16, 1568)
# brillo del logo
n = int(2.5 * SR)
tt = np.arange(n) / SR
brillo = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * (2 + i)) for i, f in enumerate([2093, 2637, 3136, 4186])) * 0.04
place(sfx[:, 0], brillo, 5.05)
place(sfx[:, 1], brillo, 5.1)
place(sfx[:, 0], brillo, 29.05)
place(sfx[:, 1], brillo, 29.1)

sfx = reverb(sfx, 1.2, 0.22)
sfx /= np.abs(sfx).max() * 1.5

sf.write('public/audio/musica.wav', mus.astype(np.float32), SR)
sf.write('public/audio/sfx.wav', sfx.astype(np.float32), SR)

# ---------- Voz y mezcla ----------
VOZ = [(1, 1.15), (2, 6.9), (3, 10.35), (4, 16.35), (5, 23.15), (6, 29.85), (7, 30.95)]
for quien in ('hombre', 'mujer'):
    v = np.zeros(N)
    for i, at in VOZ:
        a, sr = sf.read(f'public/voz/{quien}-{i:02d}.wav', dtype='float32')
        if a.ndim > 1:
            a = a.mean(1)
        a = resample_poly(a, SR, sr)
        place(v, a, at)
    # voz: un poco de presencia y compresión suave
    v = filt(v, 90, 'high')
    v = v + 0.25 * filt(v, 3000, 'high')
    v = np.tanh(v * 2.2) / np.tanh(2.2)
    v = v / (np.abs(v).max() + 1e-9) * 0.9
    vs = reverb(estereo(v, 0.0), 0.9, 0.08)
    # la música baja ~8 dB mientras habla la voz (con ataque y salida suaves)
    nivel = np.convolve(np.abs(v), np.ones(int(0.12 * SR)) / int(0.12 * SR), 'same')
    duck = 1 - 0.6 * np.clip(nivel / (nivel.max() * 0.25), 0, 1)
    duck = np.convolve(duck, np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same')
    mezcla = mus * 0.62 * duck[:, None] + sfx * 0.55 + vs * 0.95
    mezcla /= np.abs(mezcla).max() * 1.05
    sf.write(f'public/audio/mezcla-{quien}.wav', mezcla.astype(np.float32), SR)
print('ok')
