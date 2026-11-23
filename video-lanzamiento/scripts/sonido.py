# Banda sonora del video de lanzamiento de Camina: música, efectos y mezcla. Todo original, generado por código
# (sin muestras de terceros): uso comercial libre. Estilo: electrónica cinematográfica, optimista, tecnológica.
# 120 BPM (1 tiempo = 0,5 s, 1 compás = 2 s). Progresión Am – F – C – G (vi–IV–I–V en Do mayor), cierre en Do.
#   0–8   introducción: colchón de sintetizadores, piano suave, ambiente; golpe y brillo del logo a los 5 s
#   8–16  entra el ritmo: bombo, platillos, bajo con «bombeo», arpegio que se va abriendo; palmas desde los 12 s
#   16–23 más energía: percusión completa, bajo lleno, melodía principal
#   23–29 crece: platillos abiertos, melodía arriba, redoble y subida; silencio corto antes del golpe
#   29–35 cierre: golpe grande, acorde abierto, el piano repite el motivo y se apaga
# Efectos sincronizados con las animaciones (pasos, transiciones, contador, +1 Punto, monedas, código, canje, logo).
# Uso: python3 scripts/sonido.py  ->  public/audio/{musica,sfx,mezcla-sin-voz,mezcla-con-voz}.wav
# (la voz sale de scripts/voz.py; el volumen final se ajusta con ffmpeg loudnorm, ver LEEME.md)
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, sosfilt_zi, fftconvolve, resample_poly

SR = 48000
DUR = 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
B = 0.5  # un tiempo

def sos(f, kind='low', o=2):
    return butter(o, f, kind, fs=SR, output='sos')

def filt(x, f, kind='low', o=2):
    return sosfilt(sos(f, kind, o), x, axis=0)

def filt_var(x, corte, kind='low', bloque=256):
    """Filtro con frecuencia de corte que cambia en el tiempo (corte: array por muestra)."""
    y = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), bloque):
        s = sos(float(np.clip(corte[min(i, len(corte) - 1)], 30, SR / 2 - 500)), kind)
        if zi is None:
            zi = sosfilt_zi(s) * 0
            if x.ndim > 1:
                zi = np.repeat(zi[:, :, None], x.shape[1], 2)
        y[i:i + bloque], zi = sosfilt(s, x[i:i + bloque], axis=0, zi=zi)
    return y

def nota(m):
    return 440 * 2 ** ((m - 69) / 12)

def place(buf, x, at, g=1.0):
    i = int(round(at * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    s = max(0, -i)
    j = min(len(buf), i + len(x))
    buf[max(0, i):j] += x[s:s + j - max(0, i)] * g

def env(n, a, d, s, r):
    e = np.full(n, s, float)
    ia, idd, ir = max(1, int(a * SR)), int(d * SR), max(1, int(r * SR))
    e[:ia] = np.linspace(0, 1, ia)
    e[ia:ia + idd] = np.linspace(1, s, len(e[ia:ia + idd]))
    e[-ir:] *= np.linspace(1, 0, ir)
    return e

def curva(puntos):
    """Curva por tramos [(t, valor), ...] evaluada en todo el tiempo."""
    ts, vs = zip(*puntos)
    return np.interp(t, ts, vs)

def reverb(x, seg=2.2, wet=0.25, brillo=6000, seed=1):
    r = np.random.default_rng(seed)
    n = int(seg * SR)
    ir = r.normal(0, 1, (n, 2)) * np.exp(-np.arange(n) / SR * (6.9 / seg))[:, None]
    ir = filt(ir, brillo)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    ir /= np.sqrt((ir ** 2).sum(0))
    w = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + w * wet * 1.8

def estereo(x, g=1.0):
    return np.stack([x, x], 1) * g

# ---------- Osciladores con banda limitada (sin aliasing) ----------
TAB = 2048
_tablas = {}
def tabla_saw(f):
    hmax = min(400, max(1, int(16000 / max(f, 20))))
    if hmax not in _tablas:
        ph = np.arange(TAB) / TAB
        k = np.arange(1, hmax + 1)
        _tablas[hmax] = (np.sin(2 * np.pi * np.outer(ph, k)) / k).sum(1) * (2 / np.pi)
    return _tablas[hmax]

def saw(f, n, fase=0.0):
    ph = (fase + f * np.arange(n) / SR) % 1.0
    tb = tabla_saw(f)
    return np.interp(ph * TAB, np.arange(TAB + 1), np.append(tb, tb[0]))

def supersaw(m, n, voces=7, ancho=22, seed=0):
    r = np.random.default_rng(seed)
    cents = np.linspace(-ancho, ancho, voces)
    L = np.zeros(n)
    R = np.zeros(n)
    for i, c in enumerate(cents):
        x = saw(nota(m) * 2 ** (c / 1200), n, r.uniform())
        pan = 0.5 + 0.45 * (i / (voces - 1) - 0.5) * 2
        L += x * (1 - pan)
        R += x * pan
    return np.stack([L, R], 1) / voces

# ---------- Armonía ----------
AM, F, CM, G = [57, 60, 64, 69, 71], [53, 57, 60, 65, 67], [48, 55, 60, 64, 67], [55, 59, 62, 67, 69]
FADD9 = [53, 60, 65, 67, 69]
CFIN = [48, 55, 60, 62, 64, 67, 72, 76]
ACORDES = [(0, AM), (2, F), (4, CM), (6, G), (8, AM), (10, F), (12, CM), (14, G), (16, AM), (18, F), (20, CM), (22, G),
           (24, AM), (26, F), (27, G), (29, CFIN), (31, FADD9), (33, CFIN), (35, CFIN)]
def acorde(tt):
    act = ACORDES[0][1]
    for a0, ch in ACORDES:
        if tt + 1e-6 >= a0:
            act = ch
    return act
RAIZ = {id(AM): 45, id(F): 41, id(CM): 36, id(G): 43, id(FADD9): 41, id(CFIN): 36}

mus = np.zeros((N, 2))

# Bombo en negras de 8 a 28,5 s (+ el golpe de 29 s). «lado»: el resto de la música baja un instante en cada bombo.
bombos = [x * B for x in range(16, 58)] + [29.0]
lado = np.ones(N)
for b in bombos:
    i = int(b * SR)
    j = min(N, i + int(0.42 * SR))
    tt = np.arange(j - i) / SR
    lado[i:j] = np.minimum(lado[i:j], 1 - 0.55 * np.exp(-tt / 0.11) * np.clip(tt / 0.006, 0, 1))
lado = np.convolve(lado, np.ones(96) / 96, 'same')

# 1) Colchón de supersaw (todo el video), con un filtro que se abre a medida que crece la música
pad = np.zeros((N, 2))
for k, (a0, ch) in enumerate(ACORDES[:-1]):
    a1 = ACORDES[k + 1][0]
    n = int((a1 - a0 + 0.9) * SR)
    x = np.zeros((n, 2))
    for j, m in enumerate(ch):
        x += supersaw(m, n, voces=5, ancho=18, seed=k * 10 + j)
    x *= env(n, 0.25 if a0 > 0 else 1.6, 0.4, 0.85, 0.9)[:, None]
    place(pad, x / len(ch), a0)
pad = filt_var(pad, curva([(0, 700), (5, 1100), (8, 1400), (16, 2200), (23, 2600), (28.8, 5200), (29, 4500), (35, 2500)]))
g_pad = curva([(0, 0), (1.2, 0.55), (5, 0.6), (8, 0.5), (16, 0.42), (23, 0.5), (28.7, 0.95), (28.95, 0.15), (29.0, 2.0), (31, 1.7), (33, 1.5), (35, 1.1)])
mus += pad * (g_pad * np.where(t < 29, lado, 1))[:, None] * 0.9

# 2) Piano suave (sintetizado): motivo de la introducción y del cierre
def piano(m, dur=2.4, vel=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f0 = nota(m)
    x = np.zeros(n)
    for h, (g, d) in enumerate([(1, 2.2), (0.45, 3.2), (0.22, 4.5), (0.12, 6), (0.06, 8)], 1):
        fh = f0 * h * (1 + 0.0004 * h * h)
        if fh < 15000:
            x += g * np.sin(2 * np.pi * fh * tt + h) * np.exp(-tt * d * (0.6 + 0.4 * vel))
    x *= np.clip(tt / 0.004, 0, 1)
    golpe = filt(rng.normal(0, 1, n), 2500) * np.exp(-tt * 80) * 0.15
    return (x + golpe) * vel

MOTIVO = {id(AM): [69, 76, 72, 76, 71], id(F): [65, 72, 69, 72, 67], id(CM): [67, 76, 72, 76, 74], id(G): [67, 74, 71, 74, 69]}
pno = np.zeros(N)
for bar in range(0, 8):  # 0–16 s
    a0 = bar * 2
    ch = acorde(a0)
    for bt, idx in zip([0, 0.75, 1.5, 2.5, 3], range(5)):
        at = a0 + bt * B
        if at < 0.4:
            continue
        place(pno, piano(MOTIVO[id(ch)][idx] + 12, 2.0, 0.8 if bt else 1.0), at)
g_pno = curva([(0, 1), (8, 1), (8.1, 0.55), (16, 0.35), (16.2, 0)])
# cierre: el motivo vuelve, más lento, y termina en Do agudo
for at, m, v in [(29.0, 72, 1.0), (29.0, 79, 0.7), (30.0, 76, 0.8), (30.5, 79, 0.8), (31.0, 81, 0.85), (32.0, 79, 0.8), (32.5, 76, 0.7), (33.0, 84, 0.9), (33.0, 72, 0.6)]:
    place(pno, piano(m, 3.2, v), at)
g_pno = np.where(t >= 29, 1.0, g_pno)
mus += reverb(estereo(pno * g_pno * 0.16), 2.6, 0.35, 5000, seed=3)

# 3) Ambiente de ciudad y dron grave en la apertura
amb = filt(filt(rng.normal(0, 1, N), 250, 'high'), 1800) * curva([(0, 0), (0.3, 0.03), (4, 0.025), (5.2, 0)])
dron = np.sin(2 * np.pi * nota(33) * t) * curva([(0, 0), (1, 0.16), (4.6, 0.16), (5.3, 0)])
mus += np.stack([amb + dron, np.roll(amb, 900) + dron], 1)

# 4) Pulso que anticipa el ritmo (5–8 s): semicorcheas filtradas que se abren
pulso = np.zeros((N, 2))
tb = 5.0
while tb < 8.0 - 1e-6:
    ch = acorde(tb)
    n = int(0.12 * SR)
    place(pulso, supersaw(ch[0] + 12, n, voces=3, ancho=8, seed=int(tb * 8)) * env(n, 0.003, 0.08, 0.0, 0.03)[:, None], tb)
    tb += B / 2
pulso = filt_var(pulso, curva([(5, 400), (8, 2600)]))
mus += pulso * curva([(5, 0), (5.5, 0.35), (7.9, 0.55), (8.0, 0)])[:, None]

# 5) Batería
def bombo(g=1.0):
    n = int(0.45 * SR)
    tt = np.arange(n) / SR
    fr = 48 + 110 * np.exp(-tt * 30)
    cuerpo = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 7)
    click = filt(rng.normal(0, 1, n), 3000, 'high') * np.exp(-tt * 300) * 0.25
    return np.tanh((cuerpo + click) * 1.6) * g

def palma(g=1.0):
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    ruido = filt(filt(rng.normal(0, 1, n), 900, 'high'), 4500)
    e = sum(np.exp(-np.clip(tt - d, 0, None) * 120) * (tt >= d) for d in (0, 0.011, 0.022))
    e = e + np.exp(-np.clip(tt - 0.03, 0, None) * 18) * (tt >= 0.03) * 0.6
    return ruido * e * 0.5 * g

def caja(g=1.0):
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    cuerpo = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 30)
    ruido = filt(filt(rng.normal(0, 1, n), 1800, 'high'), 8000) * np.exp(-tt * 20)
    return (cuerpo * 0.5 + ruido * 0.45) * g

def plat(abierto=False, g=1.0):
    n = int((0.32 if abierto else 0.05) * SR)
    tt = np.arange(n) / SR
    x = filt(filt(rng.normal(0, 1, n), 7500, 'high'), 15000) * np.exp(-tt * (10 if abierto else 70))
    return x * 0.22 * g

def crash(dur=3.0, g=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = filt(rng.normal(0, 1, n), 3500, 'high') * np.exp(-tt * 1.6)
    met = sum(np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) for f in (3150, 4270, 5890, 7310)) * np.exp(-tt * 2.2) * 0.04
    return (x * 0.3 + met) * g

bat = np.zeros((N, 2))
for b in bombos:
    if b < 29:
        place(bat, estereo(bombo(0.85 if b < 16 else 1.0)), b)
tb = 8.0
k = 0
while tb < 28.75 - 1e-6:
    contra = k % 2 == 1  # contratiempo
    if contra:
        place(bat, np.stack([plat(g=0.9), plat(g=0.7)], 1), tb)
    if tb >= 16 and not contra:
        place(bat, np.stack([plat(g=0.45), plat(g=0.6)], 1), tb + B / 4)
        place(bat, np.stack([plat(g=0.4), plat(g=0.55)], 1), tb + 3 * B / 4)
    if tb >= 23 and contra and (k // 2) % 2 == 1:
        place(bat, np.stack([plat(True, 0.6), plat(True, 0.75)], 1), tb)
    if tb >= 12 and not contra and int(round(tb / B)) % 2 == 1:
        place(bat, reverb(estereo(palma(0.95 if tb >= 16 else 0.75)), 1.0, 0.25, 7000, seed=k), tb)
    tb += B / 2
    k += 1
# remates antes de los 16 s y de los 23 s
for i, at in enumerate([15.5, 15.625, 15.75, 15.875, 22.5, 22.625, 22.75, 22.875]):
    place(bat, estereo(caja(0.35 + 0.1 * (i % 4))), at)
# redoble que acelera hacia el cierre (27–28,75 s)
at = 27.0
while at < 28.75 - 1e-6:
    place(bat, estereo(caja(0.25 + 0.55 * (at - 27) / 1.75)), at)
    at += B / 2 if at < 27.5 else (B / 4 if at < 28.25 else B / 8)
for at in [8.0, 16.0, 23.0]:
    place(bat, np.stack([crash(2.4, 0.55), crash(2.4, 0.5)], 1), at)
mus += bat * 0.9

# 6) Bajo (8–28,75 s): sub + diente de sierra filtrado, en corcheas, con «bombeo»
bajo = np.zeros(N)
tb = 8.0
k = 0
while tb < 28.75 - 1e-6:
    m = RAIZ[id(acorde(tb))] + (12 if (tb >= 16 and k % 4 == 3) else 0)
    n = int(B / 2 * SR * 0.92)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * nota(m) * tt)
    cuerpo = saw(nota(m), n) * (0.35 if tb >= 16 else 0.15)
    place(bajo, (sub + cuerpo) * env(n, 0.004, 0.1, 0.7, 0.02), tb, 1.0 if tb >= 16 else 0.75)
    tb += B / 2
    k += 1
mus += estereo(filt(bajo, 900) * lado * 0.5)

# 7) Arpegio en semicorcheas (8–28,75 s), se abre de a poco
arp = np.zeros((N, 2))
PATRON = [0, 2, 1, 3, 2, 4, 3, 1]
tb = 8.0
k = 0
while tb < 28.75 - 1e-6:
    ch = acorde(tb)
    m = ch[PATRON[k % 8] % len(ch)] + 12
    n = int(0.2 * SR)
    place(arp, supersaw(m, n, voces=3, ancho=7, seed=k) * env(n, 0.002, 0.12, 0.0, 0.05)[:, None], tb)
    tb += B / 4
    k += 1
arp = filt_var(arp, curva([(8, 900), (16, 2800), (23, 4200), (28.7, 7000)]))
arp = np.stack([arp[:, 0], np.roll(arp[:, 1], int(SR * B * 0.75))], 1)  # eco en el canal derecho
mus += arp * curva([(8, 0.0), (9, 0.3), (16, 0.38), (23, 0.42), (28.7, 0.5), (28.75, 0)])[:, None]

# 8) Melodía principal (16–28,75 s)
FRASE1 = [(0, 76, 1.5), (1.5, 74, 0.5), (2, 72, 1), (3, 74, 1), (4, 72, 1.5), (5.5, 69, 0.5), (6, 72, 2)]
FRASE2 = [(0, 79, 1.5), (1.5, 76, 0.5), (2, 74, 1), (3, 76, 1), (4, 74, 1.5), (5.5, 71, 0.5), (6, 74, 2)]
mel = np.zeros((N, 2))
for inicio, frase, oct_ in [(16, FRASE1, 0), (20, FRASE2, 0), (24, FRASE1, 12)]:
    for bt, m, d in frase:
        at = inicio + bt * B
        if at >= 28.75:
            continue
        n = int((d * B + 0.25) * SR)
        place(mel, supersaw(m + oct_, n, voces=5, ancho=14, seed=int(at * 10)) * env(n, 0.01, 0.15, 0.7, 0.2)[:, None], at)
mel = filt(mel, 4200)
mus += reverb(mel, 1.8, 0.3, 6000, seed=5) * (curva([(16, 0.32), (23, 0.32), (24, 0.3), (28.7, 0.36), (28.75, 0)]) * lado)[:, None]

# 9) Subidas, barridos y golpes
def subida(t0, t1, g=0.2, f0=300, f1=9000):
    n = int((t1 - t0) * SR)
    tt = np.arange(n) / SR
    k = (tt / tt[-1]) ** 2
    x = filt_var(rng.normal(0, 1, (n, 2)), f0 + (f1 - f0) * k, 'low', 512) * k[:, None]
    tono = np.sin(2 * np.pi * np.cumsum(200 + 1400 * k) / SR) * k * 0.25
    return (x + tono[:, None]) * g

def reverso(dur=1.2, g=0.4):
    x = np.stack([crash(dur, g), crash(dur, g * 0.9)], 1)[::-1]
    return x * (np.linspace(0, 1, len(x)) ** 2)[:, None]  # entra desde cero, sin golpe al empezar

def golpe(g=1.0, dur=3.5):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-tt * 4)) / SR) * np.exp(-tt * 1.4)
    cuerpo = filt(rng.normal(0, 1, n), 700) * np.exp(-tt * 6) * 0.5
    return estereo(np.tanh((sub + cuerpo) * 1.3)) * g

place(mus, subida(3.2, 5.0, 0.12), 3.2)
place(mus, reverso(1.0, 0.3), 4.0)
place(mus, golpe(0.55, 2.5), 5.0)
place(mus, subida(6.6, 8.0, 0.12, 400, 7000), 6.6)
place(mus, reverso(0.8, 0.3), 7.2)
place(mus, reverso(0.6, 0.25), 15.4)
place(mus, subida(26.6, 28.9, 0.26, 300, 12000), 26.6)
place(mus, reverso(1.4, 0.45), 27.6)
place(mus, golpe(1.0, 4.0), 29.0)
place(mus, np.stack([crash(4.5, 0.8), crash(4.5, 0.75)], 1), 29.0)
place(mus, estereo(bombo(1.1)), 29.0)
# grave sostenido del acorde final
n = int(5.5 * SR)
tt = np.arange(n) / SR
place(mus, estereo((np.sin(2 * np.pi * nota(36) * tt) + 0.4 * np.sin(2 * np.pi * nota(48) * tt)) * env(n, 0.02, 0.5, 0.7, 2.5) * 0.35), 29.0)

# silencio breve antes del golpe final (28,75–29 s): queda solo la cola de la subida
mus *= curva([(0, 1), (28.74, 1), (28.76, 0.35), (28.99, 0.35), (29.0, 1)])[:, None]
mus = reverb(mus, 1.4, 0.12, 7000, seed=11)
mus *= (np.clip((DUR - t) / 1.6, 0, 1) ** 1.5)[:, None]
mus = filt(mus, 28, 'high')
mus /= np.abs(mus).max()

# ---------- Efectos ----------
sfx = np.zeros((N, 2))

def whoosh(at, dur=0.6, g=0.25, f0=500, f1=5000):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    k = tt / dur
    x = filt_var(rng.normal(0, 1, (n, 2)), f0 * (f1 / f0) ** np.sin(np.pi * k * 0.5), 'low', 256)
    x = filt(x, 200, 'high') * (np.sin(np.pi * k) ** 2)[:, None]
    x[:, 0] *= np.linspace(1.2, 0.8, n)
    x[:, 1] *= np.linspace(0.8, 1.2, n)
    place(sfx, x * g, at - dur * 0.65)

def blip(at, f=2400, g=0.06, d=0.03):
    n = int(d * SR)
    tt = np.arange(n) / SR
    place(sfx, estereo(np.sin(2 * np.pi * f * tt) * np.exp(-tt * (5 / d)), g), at)

def campana(at, f0, g=0.15, dur=1.2):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f0 * tt) * np.exp(-tt * 5) + 0.5 * np.sin(2 * np.pi * f0 * 2.76 * tt) * np.exp(-tt * 9)
         + 0.25 * np.sin(2 * np.pi * f0 * 5.4 * tt) * np.exp(-tt * 14)) * np.clip(tt / 0.002, 0, 1)
    place(sfx, np.stack([x, np.roll(x, 200)], 1) * g, at)

def golpecito(at, g=0.25):  # impacto suave para textos
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * np.cumsum(70 + 90 * np.exp(-tt * 25)) / SR) * np.exp(-tt * 9)
    x = x + filt(rng.normal(0, 1, n), 1500) * np.exp(-tt * 40) * 0.3
    place(sfx, estereo(x, g), at)

def paso(at, g=0.3, izq=True):
    n = int(0.16 * SR)
    tt = np.arange(n) / SR
    x = filt(filt(rng.normal(0, 1, n), 180, 'high'), 1400) * np.exp(-tt * 38) * 0.8
    x = x + np.sin(2 * np.pi * 85 * tt) * np.exp(-tt * 45) * 0.6
    place(sfx, np.stack([x * (1.0 if izq else 0.7), x * (0.7 if izq else 1.0)], 1) * g, at)

def brillo_logo(at, g=0.05):
    n = int(2.8 * SR)
    tt = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * (1.5 + i * 0.6)) * np.clip((tt - i * 0.05) / 0.01, 0, 1)
            for i, f in enumerate([2093, 2637, 3136, 3951, 4186]))
    place(sfx, np.stack([x, np.roll(x, 400)], 1) * g, at)

# 01 Tarija: textos, cortes, pasos en la plaza
golpecito(0.2, 0.22)
blip(0.53, 1800, 0.04, 0.05)
whoosh(2.0, 0.5, 0.18)
whoosh(3.0, 0.5, 0.18)
for k in range(4):
    paso(2.05 + k * 0.25, 0.2, k % 2 == 0)
# 02 Logo y teléfono
brillo_logo(5.0, 0.06)
whoosh(6.85, 0.9, 0.22, 300, 3500)
golpecito(7.0, 0.18)
# 03 Contador: un tic cada 20 pasos (misma curva que la animación) y un tono que sube hasta completar el aro
def ease_cubic(x):
    return np.where(x < 0.5, 4 * x ** 3, 1 - (-2 * x + 2) ** 3 / 2)
ts = np.linspace(10.2, 11.8, 400)
ult = 1620
for tt_, p in zip(ts, 1620 + 380 * ease_cubic((ts - 10.2) / 1.6)):
    if p - ult >= 20:
        blip(tt_, 2600, 0.035, 0.018)
        ult = p
golpecito(10.0, 0.16)
whoosh(10.0, 0.5, 0.15)
n = int(1.6 * SR)
tt = np.arange(n) / SR
place(sfx, estereo(np.sin(2 * np.pi * np.cumsum(500 + 900 * (tt / 1.6) ** 2) / SR) * (tt / 1.6) ** 2 * 0.03), 10.2)
campana(11.8, 1318.5, 0.16)          # aro completo
campana(11.9, 1975.5, 0.14)          # +1 Punto
brillo_logo(11.85, 0.03)
blip(12.67, 1568, 0.08, 0.08)        # la moneda llega al saldo
campana(12.67, 2093, 0.07, 0.6)
whoosh(13.4, 0.5, 0.15)              # Actividad
whoosh(14.75, 0.5, 0.15)             # Tus Puntos
# 04 Beneficios
golpecito(16.0, 0.16)
whoosh(16.1, 0.5, 0.16)              # mapa
whoosh(17.1, 0.55, 0.16, 400, 3000)  # lista
for k, at in enumerate([18.8, 19.03, 19.27]):  # monedas que llegan al premio
    campana(at, 1568 + 180 * k, 0.07, 0.7)
whoosh(19.6, 0.7, 0.12, 300, 2500)   # baja hasta Bloom
whoosh(20.4, 0.5, 0.14)              # hoja del código
for at in [20.8, 21.0, 21.2, 21.4]:  # código del local
    blip(at, 1900, 0.06, 0.04)
for k, (at, f) in enumerate([(21.6, 1046.5), (21.7, 1318.5), (21.8, 1568), (21.9, 2093)]):  # ¡Canje confirmado!
    campana(at, f, 0.13 - 0.015 * k, 1.4)
# 05 Hay mucho más: pasos en primera persona, pantallas, ciudad
golpecito(23.0, 0.18)
for k, at in enumerate([23.12, 23.55, 23.98]):
    paso(at, 0.3, k % 2 == 0)
whoosh(24.05, 0.6, 0.18)
for at in [25.0, 26.0, 27.0]:
    whoosh(at + 0.1, 0.4, 0.12, 700, 6000)
whoosh(28.05, 0.6, 0.16)
# 06 Cierre
brillo_logo(29.0, 0.08)
golpecito(29.73, 0.2)
golpecito(30.47, 0.14)
blip(31.6, 1400, 0.04, 0.06)
blip(32.0, 1760, 0.05, 0.05)
blip(32.2, 2093, 0.05, 0.05)
blip(32.67, 1568, 0.03, 0.05)

sfx = reverb(sfx, 1.1, 0.18, 7000, seed=21)
sfx /= np.abs(sfx).max()

sf.write('public/audio/musica.wav', (mus * 0.9).astype(np.float32), SR)
sf.write('public/audio/sfx.wav', (sfx * 0.9).astype(np.float32), SR)

# ---------- Mezcla ----------
def master(x):
    # compresión suave de bus + límite blando; el volumen final (−14 LUFS) lo ajusta ffmpeg loudnorm
    nivel = np.sqrt(np.convolve((x ** 2).mean(1), np.ones(2400) / 2400, 'same')) + 1e-9
    umbral = 0.25
    g = np.where(nivel > umbral, (nivel / umbral) ** (1 / 2.5 - 1), 1.0)
    g = np.convolve(g, np.ones(1200) / 1200, 'same')
    y = x * g[:, None]
    y = np.tanh(y / np.abs(y).max() * 1.4) / np.tanh(1.4)
    return y * 0.89

# A) sin voz
sf.write('public/audio/mezcla-sin-voz.wav', master(mus * 0.85 + sfx * 0.42).astype(np.float32), SR)

# B) con voz (Kokoro, es-419): la música baja ~6 dB mientras habla
VOZ = [(1, 1.0), (2, 7.3), (3, 12.9), (4, 26.0), (5, 29.75)]
v = np.zeros(N)
for i, at in VOZ:
    a, sr = sf.read(f'public/voz/{i:02d}.wav', dtype='float32')
    if a.ndim > 1:
        a = a.mean(1)
    place(v, resample_poly(a, SR, sr), at)
v = filt(v, 85, 'high')
v = v + 0.2 * filt(v, 3500, 'high')                     # presencia
nv = np.sqrt(np.convolve(v ** 2, np.ones(480) / 480, 'same')) + 1e-9
v = v * np.clip((nv / 0.08) ** (-0.35), 0.4, 1.6)       # compresión suave
v = v / np.abs(v).max() * 0.85
vs = reverb(estereo(v), 0.8, 0.07, 6000, seed=31)
nivel = np.convolve(np.abs(v), np.ones(int(0.1 * SR)) / int(0.1 * SR), 'same')
duck = 1 - 0.5 * np.clip(nivel / (nivel.max() * 0.2), 0, 1)
duck = np.convolve(duck, np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
sf.write('public/audio/mezcla-con-voz.wav', master(mus * 0.85 * duck[:, None] + sfx * 0.42 + vs * 1.05).astype(np.float32), SR)
print('ok')
