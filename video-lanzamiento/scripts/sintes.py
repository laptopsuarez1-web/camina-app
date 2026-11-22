# Funciones de síntesis compartidas por las bandas sonoras de Camina (todo generado por código: uso comercial libre).
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi, fftconvolve

SR = 48000
rng = np.random.default_rng(7)


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


def curva(t, puntos):
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


def cuerdas(m, dur, seed=0):
    """Colchón tipo cuerdas: supersaw suave, ataque lento, filtrado."""
    n = int(dur * SR)
    x = supersaw(m, n, voces=5, ancho=12, seed=seed) * env(n, 0.35, 0.3, 0.9, 0.6)[:, None]
    return filt(x, 2200)


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


def reverso(dur=1.2, g=0.4):
    x = np.stack([crash(dur, g), crash(dur, g * 0.9)], 1)[::-1]
    return x * (np.linspace(0, 1, len(x)) ** 2)[:, None]


def golpe(g=1.0, dur=3.5):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-tt * 4)) / SR) * np.exp(-tt * 1.4)
    cuerpo = filt(rng.normal(0, 1, n), 700) * np.exp(-tt * 6) * 0.5
    return estereo(np.tanh((sub + cuerpo) * 1.3)) * g


def subida(dur, g=0.2, f0=300, f1=9000):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    k = (tt / tt[-1]) ** 2
    x = filt_var(rng.normal(0, 1, (n, 2)), f0 + (f1 - f0) * k, 'low', 512) * k[:, None]
    tono = np.sin(2 * np.pi * np.cumsum(200 + 1400 * k) / SR) * k * 0.25
    return (x + tono[:, None]) * g


def whoosh(dur=0.6, g=0.25, f0=500, f1=5000):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    k = tt / dur
    x = filt_var(rng.normal(0, 1, (n, 2)), f0 * (f1 / f0) ** np.sin(np.pi * k * 0.5), 'low', 256)
    x = filt(x, 200, 'high') * (np.sin(np.pi * k) ** 2)[:, None]
    return x * g


def blip(f=2400, g=0.06, d=0.03):
    n = int(d * SR)
    tt = np.arange(n) / SR
    return estereo(np.sin(2 * np.pi * f * tt) * np.exp(-tt * (5 / d)), g)


def campana(f0, g=0.15, dur=1.2):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f0 * tt) * np.exp(-tt * 5) + 0.5 * np.sin(2 * np.pi * f0 * 2.76 * tt) * np.exp(-tt * 9)
         + 0.25 * np.sin(2 * np.pi * f0 * 5.4 * tt) * np.exp(-tt * 14)) * np.clip(tt / 0.002, 0, 1)
    return np.stack([x, np.roll(x, 200)], 1) * g


def paso(g=0.3, izq=True):
    n = int(0.16 * SR)
    tt = np.arange(n) / SR
    x = filt(filt(rng.normal(0, 1, n), 180, 'high'), 1400) * np.exp(-tt * 38) * 0.8
    x = x + np.sin(2 * np.pi * 85 * tt) * np.exp(-tt * 45) * 0.6
    return np.stack([x * (1.0 if izq else 0.7), x * (0.7 if izq else 1.0)], 1) * g


def clic_pelicula(g=0.05):
    """Clic seco de proyector para los cortes."""
    n = int(0.02 * SR)
    tt = np.arange(n) / SR
    return estereo(filt(rng.normal(0, 1, n), 1500, 'high') * np.exp(-tt * 400), g)


def brillo_logo(g=0.05):
    n = int(2.8 * SR)
    tt = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * (1.5 + i * 0.6)) * np.clip((tt - i * 0.05) / 0.01, 0, 1)
            for i, f in enumerate([2093, 2637, 3136, 3951, 4186]))
    return np.stack([x, np.roll(x, 400)], 1) * g


def master(x, umbral=0.25, ratio=2.5):
    nivel = np.sqrt(np.convolve((x ** 2).mean(1), np.ones(2400) / 2400, 'same')) + 1e-9
    g = np.where(nivel > umbral, (nivel / umbral) ** (1 / ratio - 1), 1.0)
    g = np.convolve(g, np.ones(1200) / 1200, 'same')
    y = x * g[:, None]
    y = np.tanh(y / np.abs(y).max() * 1.4) / np.tanh(1.4)
    return y * 0.89
