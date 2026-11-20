# Locución del video con Kokoro (modelo abierto, licencia Apache 2.0: uso comercial permitido).
# Uso: python3 scripts/voz.py <carpeta-del-modelo>  -> public/voz/{hombre,mujer}-NN.wav
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1]
k = Kokoro(f'{M}/model.onnx', f'{M}/voices.npz')
FRASES = [
    'Tarija se mueve.',
    'Ahora, cada paso cuenta.',
    'Caminás... y tus pasos se convierten en puntos.',
    'Puntos que canjeás por beneficios, en los comercios de tu ciudad.',
    'Y hay mucho más.',
    # fonemas a mano para marcar bien el acento de «Caminá y ganá» (pausa entre la marca y el eslogan)
    'Camina.',
    ('ph', 'kaminˈa i ɣanˈa.'),
]
VOCES = {'hombre': 'em_alex', 'mujer': 'ef_dora'}
for nombre, voz in VOCES.items():
    for i, t in enumerate(FRASES, 1):
        if isinstance(t, tuple):
            a, sr = k.create(t[1], voice=voz, speed=0.86, lang='es', is_phonemes=True)
        else:
            a, sr = k.create(t, voice=voz, speed=0.92, lang='es')
        a = np.asarray(a, dtype=np.float32)
        # recorte de silencios de los extremos
        idx = np.where(np.abs(a) > 0.01)[0]
        a = a[max(0, idx[0] - int(0.03 * sr)): idx[-1] + int(0.12 * sr)]
        sf.write(f'public/voz/{nombre}-{i:02d}.wav', a, sr)
        print(nombre, i, round(len(a) / sr, 2), 's')
