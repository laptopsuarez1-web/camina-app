# Pantallas extra del video: lista de Canjes armada con tarjetas reales (Fripap's primero, Bloom abajo)
# y la lista de Amigos con nombres y fotos de ejemplo. Uso:
#   python3 scripts/pantallas2.py <canjes-1.png> <canjes-2.png> <amigos.png>
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, 'scripts')
from pantallas import fnt, isla, tapar, avatar, final  # noqa: E402

c1, c2, am = sys.argv[1:4]
K = 780 / 1179
def card(path, y0, y1):
    im = Image.open(path).convert('RGB').crop((0, y0, 1179, y1))
    return im.resize((780, round((y1 - y0) * K)), Image.LANCZOS)

head = Image.open('public/app/canjes.jpg').convert('RGB').crop((0, 0, 780, 522))
cards = [card(c2, 1322, 2170), card(c1, 1232, 2090), card(c1, 365, 1212)]
H = head.height + sum(c.height + 10 for c in cards) + 200
bg = tuple(int(v) for v in np.asarray(head)[515, 10])
out = Image.new('RGB', (780, H), bg)
out.paste(head, (0, 0))
y = head.height
for c in cards:
    out.paste(c, (0, y))
    y += c.height + 10
out = out.crop((0, 0, 780, y + 120))
out.save('public/app/canjes-lista.jpg', quality=90)
print('ok canjes-lista', out.size)

im = Image.open(am).convert('RGB')
a = np.asarray(im).copy(); a[0:150] = a[150]; im = Image.fromarray(a)
isla(im)
im = tapar(im, (140, 186, 300, 250))
d = ImageDraw.Draw(im); d.text((148, 218), '247', font=fnt(700, 50), fill=(255, 255, 255), anchor='lm')
d.ellipse((1036, 168, 1132, 262), fill=tuple(int(c) for c in np.asarray(im)[215, 1010]))
avatar(im, 1084, 215, 43, 'V', 44)
filas = [(841, 'A', 'Andrea Mendoza'), (1041, 'L', 'Lucas Peña'), (1243, 'S', 'Sofía Guzmán'), (1445, 'D', 'Diego Ríos'), (1648, 'P', 'Paola Arce'), (1852, 'J', 'Joaquín Vargas')]
for yy, l, n in filas:
    im = tapar(im, (88, yy - 70, 228, yy + 70))
    avatar(im, 156, yy, 62, l, 54)
    im = tapar(im, (250, yy - 70, 780, yy + 8))
    d = ImageDraw.Draw(im); d.text((256, yy - 34), n, font=fnt(700, 46), fill=(255, 255, 255), anchor='lm')
final(im, 'public/app/amigos.jpg')
