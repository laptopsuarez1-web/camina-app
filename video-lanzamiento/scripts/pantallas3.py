# Saldo de ejemplo coherente en todo el video (247 → 248 Puntos después de sumar 1): Tus Puntos y Actividad.
# Se tapa el número original copiando el fondo fila por fila y se escribe 248 con la tipografía de la app.
import numpy as np
from PIL import Image, ImageDraw, ImageFont
F = 'public/fonts/PlusJakartaSans_{}.ttf'

def tapar(im, x0, y0, x1, y1):
    a = np.asarray(im).astype(float)
    for y in range(y0, y1):
        l, r = a[y, x0 - 3], a[y, x1 + 3]
        for x in range(x0, x1):
            k = (x - x0) / (x1 - x0)
            a[y, x] = l * (1 - k) + r * k
    return Image.fromarray(a.clip(0, 255).astype('uint8'))

def escribir(im, texto, x, y_base, alto_cap, peso, color):
    d = ImageDraw.Draw(im)
    s = 10
    while True:
        f = ImageFont.truetype(F.format(peso), s)
        b = f.getbbox('248')
        if b[3] - b[1] >= alto_cap:
            break
        s += 1
    b = f.getbbox(texto)
    d.text((x - b[0], y_base - b[3]), texto, font=f, fill=color)
    return im

im = Image.open('public/app/puntos-nuevo-dark.jpg').convert('RGB')
im = tapar(im, 172, 238, 345, 330)
im = escribir(im, '248', 180, 318, 72, '800ExtraBold', (255, 255, 255))
im.save('public/app/puntos-248.jpg', quality=93)

im = Image.open('public/app/actividad-dark.jpg').convert('RGB')
im = tapar(im, 92, 114, 152, 150)
im = escribir(im, '248', 97, 144, 24, '700Bold', (240, 238, 248))
im.save('public/app/actividad-248.jpg', quality=93)
