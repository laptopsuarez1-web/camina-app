# Prepara las pantallas del video a partir de capturas reales de la app: tapa barra de estado (deja la isla),
# reemplaza nombres, fotos y números personales por datos de ejemplo, y arma las hojas de canje.
# Uso: python3 scripts/pantallas.py <ruta.png> <ranking.png> <perfil.png> <eventos.png>
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

F = 'public/fonts/PlusJakartaSans_{}.ttf'
def fnt(w, s):
    return ImageFont.truetype(F.format({500: '500Medium', 700: '700Bold', 800: '800ExtraBold'}[w]), s)

def isla(im):
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((400, 33, 779, 144), radius=56, fill=(0, 0, 0))

def tapar(im, box):
    """Rellena el recuadro interpolando, fila por fila, los colores de sus bordes izquierdo y derecho."""
    a = np.asarray(im).astype(float).copy()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        l = a[y, max(0, x0 - 3)]
        r = a[y, min(a.shape[1] - 1, x1 + 3)]
        k = np.linspace(0, 1, x1 - x0)[:, None]
        a[y, x0:x1] = l * (1 - k) + r * k
    return Image.fromarray(a.clip(0, 255).astype('uint8'))

def avatar(im, cx, cy, r, letra, size):
    d = ImageDraw.Draw(im)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(98, 240, 182))
    d.text((cx, cy), letra, font=fnt(800, size), fill=(18, 40, 31), anchor='mm')

def final(im, out):
    im.resize((780, 1691), Image.LANCZOS).save(out, quality=90)
    print('ok', out)

ruta_p, rank_p, perf_p, ev_p = sys.argv[1:5]

# --- Ruta del mes: barra de estado -> se refleja el mapa de abajo
im = Image.open(ruta_p).convert('RGB')
a = np.asarray(im).copy()
a[0:196] = a[1330:1526]
im = Image.fromarray(a)
im = im.filter(ImageFilter.GaussianBlur(0)) 
isla(im)
final(im, 'public/app/ruta.jpg')

# --- Ranking: barra de estado, saldo, foto, tarjeta propia y nombres de la lista
im = Image.open(rank_p).convert('RGB')
a = np.asarray(im).copy(); a[0:150] = a[150]; im = Image.fromarray(a)
isla(im)
im = tapar(im, (140, 186, 300, 250))
d = ImageDraw.Draw(im); d.text((148, 218), '247', font=fnt(700, 50), fill=(255, 255, 255), anchor='lm')
d.ellipse((1036, 168, 1132, 262), fill=tuple(int(c) for c in np.asarray(im)[215, 1010]))
avatar(im, 1084, 215, 43, 'V', 44)
im = tapar(im, (96, 802, 260, 972))
avatar(im, 178, 887, 77, 'V', 70)
im = tapar(im, (290, 832, 700, 900))
d = ImageDraw.Draw(im); d.text((297, 866), 'Valentina R.', font=fnt(700, 54), fill=(255, 255, 255), anchor='lm')
filas = [(1532, 'A', 'Andrea Mendoza'), (1729, 'L', 'Lucas'), (1925, 'S', 'Sofía Guzmán'), (2121, 'D', 'Diego Ríos')]
for y, l, n in filas:
    im = tapar(im, (345, y - 34, 800, y + 34))
    avatar(im, 252, y, 59, l, 52)
    d = ImageDraw.Draw(im); d.text((349, y), n, font=fnt(500, 50), fill=(255, 255, 255), anchor='lm')
im = tapar(im, (60, 2222, 1120, 2278))
final(im, 'public/app/ranking.jpg')

# --- Perfil: portada y foto reales -> plaza de Tarija y avatar de ejemplo
im = Image.open(perf_p).convert('RGB')
W, H = im.size
bg = tuple(int(c) for c in np.asarray(im)[760, 20])
plaza = Image.open('public/tarija/plaza-frame.jpg').convert('RGB')
pw = W; ph = int(plaza.height * W / plaza.width)
plaza = plaza.resize((pw, ph)).crop((0, (ph - 740) // 2, W, (ph - 740) // 2 + 740))
pa = np.asarray(plaza).astype(float)
ys = np.linspace(0, 1, 740)[:, None, None]
dark = np.array(bg, float)
pa = pa * (0.62 - 0.1 * ys) * (1 - ys ** 2.2) + dark * (ys ** 2.2)
a = np.asarray(im).copy(); a[0:740] = pa.clip(0, 255).astype('uint8'); im = Image.fromarray(a)
isla(im)
d = ImageDraw.Draw(im)
d.text((61, 198), 'Perfil', font=fnt(700, 50), fill=(255, 255, 255), anchor='lm')
d.ellipse((58, 266, 290, 498), fill=(255, 255, 255))
avatar(im, 174, 382, 108, 'V', 100)
d = ImageDraw.Draw(im)
d.text((332, 310), 'Valentina R.', font=fnt(800, 64), fill=(255, 255, 255), anchor='lm')
d.text((332, 378), 'Centro · Tarija', font=fnt(500, 40), fill=(205, 196, 235), anchor='lm')
d.rounded_rectangle((330, 421, 655, 498), radius=38, fill=(78, 74, 92))
d.text((492, 460), 'Editar perfil', font=fnt(700, 38), fill=(255, 255, 255), anchor='mm')
d.text((61, 565), 'Camino todos los días', font=fnt(500, 40), fill=(255, 255, 255), anchor='lm')
im = tapar(im, (120, 888, 330, 958))
d = ImageDraw.Draw(im); d.text((222, 924), '247', font=fnt(800, 62), fill=(255, 255, 255), anchor='mm')
final(im, 'public/app/perfil.jpg')

# --- Tarjeta "Tu ruta de noviembre" del Inicio: el mapa del continente -> mapa de Tarija con los 3 locales
ini = Image.open('public/app/inicio-app.jpg').convert('RGB')
ev = Image.open(ev_p).convert('RGB').crop((64, 880, 1118, 1205)).resize((708, 218), Image.LANCZOS)
ini_a = np.asarray(ini).astype(float)
ev_a = np.asarray(ev).astype(float)
x0, y0 = 36, 1008
mask = np.ones((218, 708))
fade = np.clip((np.arange(218) - 150) / 60, 0, 1)
mask *= (1 - fade)[:, None]
r = 34
yy, xx = np.mgrid[0:218, 0:708]
for cx in (r, 708 - r):
    out = ((xx - cx) ** 2 + (yy - r) ** 2 > (r - 2) ** 2) & (yy < r) & ((xx < r) if cx == r else (xx > 708 - r))
    mask[out] = 0
mask[:3] = 0
reg = ini_a[y0:y0 + 218, x0:x0 + 708]
pill = ini_a[1030:1074, 58:310].copy()
ini_a[y0:y0 + 218, x0:x0 + 708] = reg * (1 - mask[..., None]) + ev_a * mask[..., None]
ini_a[1030:1074, 58:310] = pill
Image.fromarray(ini_a.clip(0, 255).astype('uint8')).save('public/app/inicio-app.jpg', quality=92)
print('ok inicio card')

# --- Hojas de canje con borde superior limpio
cod = Image.open('public/app/old-codigo.jpg').convert('RGB').crop((0, 58, 786, 760))
hoja = Image.new('RGB', (786, cod.height + 70), (50, 40, 67))
hoja.paste(cod, (0, 70))
d = ImageDraw.Draw(hoja); d.rounded_rectangle((353, 24, 433, 34), radius=5, fill=(110, 98, 140))
hoja.save('public/app/hoja-codigo.jpg', quality=92)
con = Image.open('public/app/old-confirmado.jpg').convert('RGB').crop((0, 0, 786, 830))
hoja = Image.new('RGB', (786, con.height + 60), (34, 26, 50))
hoja.paste(con, (0, 60))
d = ImageDraw.Draw(hoja); d.rounded_rectangle((353, 22, 433, 32), radius=5, fill=(90, 80, 120))
hoja.save('public/app/hoja-confirmado.jpg', quality=92)
print('ok hojas')
