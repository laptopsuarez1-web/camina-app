# Franjas del teaser «Hay más por caminar» (src/Horizonte.tsx). Cada toma tiene dos capas:
#  - franja nítida bajo el horizonte (1080 × 820, de y = 1100 a 1920): la foto casi entera, sin recortes agresivos;
#  - fondo 1080 × 1920: la misma imagen difuminada, que se ve arriba de la curva.
# También mide qué tan claro es el fondo detrás de la frase (para elegir letra blanca o negra): src/horizonteFranjas.ts.
# Fotos de Tarija y Bolivia (public/yasi/f, créditos en CREDITOS-y-si.md), tomas propias de caminar y la app.
# Uso: python3 scripts/horizonte_franjas.py  ->  public/hz/*.jpg|mp4 + src/horizonteFranjas.ts
import subprocess, os, io, json
from PIL import Image, ImageFilter, ImageEnhance, ImageStat
W, H = 1080, 820
os.makedirs('public/hz', exist_ok=True)
LUZ = {}


def cubrir(im, w, h, z=1.0, cx=0.5, cy=0.5):
    s = max(w / im.width, h / im.height) * z
    cw, ch = w / s, h / s
    cw, ch = min(cw, im.width), min(ch, im.height)
    x = max(0, min(cx * im.width - cw / 2, im.width - cw))
    y = max(0, min(cy * im.height - ch / 2, im.height - ch))
    return im.resize((w, h), Image.LANCZOS, box=(x, y, x + cw, y + ch))


def fondo(nombre, im):
    f = cubrir(im, 270, 480).filter(ImageFilter.GaussianBlur(7)).resize((1080, 1920), Image.BICUBIC)
    f = ImageEnhance.Brightness(f).enhance(0.86)
    f.save(f'public/hz/{nombre}-fondo.jpg', quality=88)
    LUZ[nombre] = round(ImageStat.Stat(f.crop((240, 880, 840, 1140)).convert('L')).mean[0] / 255, 3)


def foto(nombre, src, z=1.0, cx=0.5, cy=0.5):
    im = Image.open(src).convert('RGB')
    out = cubrir(im, W, H, z, cx, cy)
    out.filter(ImageFilter.UnsharpMask(1.0, 30, 2)).save(f'public/hz/{nombre}.jpg', quality=92)
    fondo(nombre, im)


def video(nombre, src, ini=0.0, z=1.0, cx=0.5, cy=0.5):
    vf = (f"scale=w='max({W}/iw,{H}/ih)*{z}*iw':h=-2:flags=lanczos,"
          f"crop={W}:{H}:'min(max((iw*{cx})-{W}/2,0),iw-{W})':'min(max((ih*{cy})-{H}/2,0),ih-{H})',fps=30,format=yuv420p")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ini), '-t', '1.2', '-i', src, '-an', '-vf', vf,
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', f'public/hz/{nombre}.mp4'], check=True)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(ini + 0.4), '-i', src, '-frames:v', '1', '-f', 'image2pipe',
                          '-vcodec', 'png', '-'], capture_output=True).stdout
    fondo(nombre, Image.open(io.BytesIO(raw)).convert('RGB'))


F = 'public/yasi/f/'
V = 'public/yasi/v/'
# sin palabras
foto('vinedos', F + 'vinedos.jpg', 1.0, 0.5, 0.62)
foto('laguna', F + 'laguna-colorada.jpg', 1.0, 0.5, 0.6)
foto('cartel', F + 'cartel-tarija.webp', 1.0, 0.5, 0.6)
foto('chunchos', F + 'chunchos-san-roque.jpg', 1.0, 0.5, 0.55)
foto('isla-sendero', F + 'isla-del-sol-camino.jpg', 1.0, 0.5, 0.6)
foto('mirador', F + 't-mirador-copa.jpg', 1.0, 0.5, 0.6)
foto('puente', F + 'puente-aereo.jpg', 1.0, 0.5, 0.5)
foto('san-jacinto', F + 'san-jacinto.jpg', 1.0, 0.5, 0.6)
foto('uyuni', F + 'uyuni-amanecer.jpg', 1.0, 0.5, 0.6)
foto('titicaca', F + 'titicaca-terrazas.jpg', 1.0, 0.5, 0.6)
# «Hay»
video('pies-pov', 'public/tarija/pies-pov.mp4', 1.0, 1.0, 0.5, 0.55)
foto('plaza-lf', F + 't-plaza-luis-de-fuentes.jpg', 1.0, 0.5, 0.6)
foto('mercado', F + 'mercado-central-tarija.jpg', 1.0, 0.5, 0.6)
# «más»
foto('lp-noche', F + 'lp-noche.jpg', 1.0, 0.5, 0.55)
foto('flamencos', F + 'flamencos.jpg', 1.0, 0.5, 0.55)
foto('rueda', F + 't-rueda-chapaca.jpg', 1.0, 0.5, 0.55)
# «por caminar»
video('parque', V + 'parque-camino.mp4', 0.0, 1.0, 0.5, 0.75)
foto('mapa', 'public/yasi/app/ruta-mapa-nov-dark.jpg', 1.0, 0.5, 0.34)
foto('sc-plaza', F + 'sc-plaza-24.jpg', 1.0, 0.5, 0.6)
foto('san-roque', F + 'san-roque-calle.jpg', 1.0, 0.5, 0.55)
video('ladrillo', V + 'm4851.mp4', 0.2, 1.0, 0.5, 0.8)
foto('tiwanaku', F + 'tiwanaku-puerta-del-sol.jpg', 1.0, 0.5, 0.6)
video('palomas', V + 'plaza-palomas.mp4', 0.2, 1.0, 0.5, 0.72)
foto('glorieta', F + 't-glorieta.jpg', 1.0, 0.5, 0.6)
video('sendero', V + 'm722.mp4', 0.2, 1.0, 0.5, 0.7)
foto('illimani', F + 'lp-illimani.jpg', 1.0, 0.5, 0.55)
video('maraton', V + 'maraton.mp4', 0.2, 1.0, 0.5, 0.55)
foto('casa-dorada', F + 't-casa-dorada.jpg', 1.0, 0.5, 0.35)
with open('src/horizonteFranjas.ts', 'w') as fh:
    fh.write('// Generado por scripts/horizonte_franjas.py: luminosidad (0-1) del fondo difuminado detrás de la frase.\n')
    fh.write(f'export const LUZ: Record<string, number> = {json.dumps(LUZ)};\n')
print('ok', LUZ)
