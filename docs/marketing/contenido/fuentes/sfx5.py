# Sonidos de las animaciones, hechos a mano (sin música): cambio de pantalla, texto, toque, teclas y canje confirmado.
import json, sys, wave
import numpy as np
SR = 44100
def env(n, a=0.004, d=0.12):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def tone(f, dur, d=0.12, a=0.004, h2=0.0):
    n = int(dur * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t) + h2 * np.sin(4 * np.pi * f * t)) * env(n, a, d)
def whoosh(dur=0.42):
    n = int(dur * SR); rng = np.random.default_rng(7); x = rng.standard_normal(n); y = np.zeros(n); lp = 0.0
    for i in range(n):
        c = 0.02 + 0.25 * np.sin(np.pi * i / n) ** 2; lp += c * (x[i] - lp); y[i] = lp
    return y * np.sin(np.pi * np.arange(n) / n) ** 2 * 1.6
def pop(): n = int(0.09 * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * (520 * np.exp(-t * 18) + 180) * t) * env(n, 0.002, 0.03)
def tap(): return tone(1400, 0.06, 0.012) * 0.7 + tone(700, 0.06, 0.02) * 0.5
def key(i): return tone([880, 988, 1047, 1175][i % 4], 0.14, 0.05, h2=0.2)
def chime(): 
    o = np.zeros(int(1.4 * SR))
    for k, f in enumerate([784, 988, 1319, 1568]):
        s = tone(f, 1.0, 0.32, h2=0.25); i = int(k * 0.085 * SR); o[i:i + len(s)] += s * 0.6
    return o
def tick(): return tone(1800, 0.03, 0.006) * 0.5
v = sys.argv[1]; ev = json.load(open(f'ev-{v}.json')); out = np.zeros(int((ev['dur'] + 0.5) * SR))
def put(t, s, g=1.0):
    i = int(max(0, t) * SR); s = s[:len(out) - i]; out[i:i + len(s)] += s * g
W = whoosh()
put(0.0, pop(), 0.5)
for t in ev['hook']: put(t, pop(), 0.55)
if ev['count']:
    a, b = ev['count']; k = 0
    while a + k * 0.055 < b: put(a + k * 0.055, tick(), 0.35 + 0.3 * k * 0.055 / (b - a)); k += 1
for t in ev['segs']: put(t - 0.12, W, 0.5); put(t + 0.12, pop(), 0.35)
for t in ev['cuts']: put(t - 0.05, W, 0.3)
for t in ev['taps']: put(t, tap(), 0.6)
for i, t in enumerate(ev['keys']): put(t, key(i), 0.45)
for t in ev['ok']: put(t, chime(), 0.6)
put(ev['end'] - 0.1, W, 0.5)
for i, t in enumerate(ev['endPops']): put(t, pop() if i == 0 else chime(), 0.5 if i == 0 else 0.45)
out *= 0.38
for i, t in enumerate(ev['vo']):
    w = wave.open(f'voz/{v}-{i}.wav'); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768; w.close(); put(t, x / max(0.05, np.abs(x).max()), 0.9)
out = np.tanh(out * 0.95) * 0.9
w = wave.open(f'sfx-{v}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close(); print(v, ev)
