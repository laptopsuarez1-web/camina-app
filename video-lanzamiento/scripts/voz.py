# Locución del video con Kokoro (modelo abierto, licencia Apache 2.0: uso comercial permitido).
# Español latinoamericano neutro (fonética es-419: seseo, sin voseo ni «sh» rioplatense), con tuteo.
# Uso: python3 scripts/voz.py <carpeta-del-modelo> [voz]  -> public/voz/NN.wav
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1]
VOZ = sys.argv[2] if len(sys.argv) > 2 else 'ef_dora'
k = Kokoro(f'{M}/model.onnx', f'{M}/voices.npz')
FRASES = [
    ('Hay una nueva forma de moverte.', 0.94),
    ('Cada paso cuenta.', 0.9),
    ('Camina, acumula puntos, y disfruta beneficios.', 0.95),
    ('Tus pasos pueden llevarte más lejos.', 0.93),
    ('Camina.', 0.85),
]
for i, (t, vel) in enumerate(FRASES, 1):
    a, sr = k.create(t, voice=VOZ, speed=vel, lang='es-419')
    a = np.asarray(a, dtype=np.float32)
    idx = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, idx[0] - int(0.03 * sr)): idx[-1] + int(0.15 * sr)]
    sf.write(f'public/voz/{i:02d}.wav', a, sr)
    print(i, round(len(a) / sr, 2), 's')
