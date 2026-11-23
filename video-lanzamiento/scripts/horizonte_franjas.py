# Franjas del teaser «Hay más por caminar» (src/Horizonte.tsx): cada toma ocupa solo la franja bajo el horizonte
# (1080 × 820). Fotos de Tarija y Bolivia (public/yasi/f, créditos en CREDITOS-y-si.md), tomas propias de caminar y la app.
# Uso: python3 scripts/horizonte_franjas.py  ->  public/hz/*.jpg|mp4
import subprocess, os, sys
from PIL import Image, ImageFilter
W, H = 1080, 820
os.makedirs('public/hz', exist_ok=True)

def foto(nombre, src, z=1.0, cx=0.5, cy=0.5):
    im = Image.open(src).convert('RGB')
    s = max(W / im.width, H / im.height) * z
    w, h = W / s, H / s  # recorte en píxeles de la fuente
    x = min(max(cx * im.width - w / 2, 0), im.width - w)
    y = min(max(cy * im.height - h / 2, 0), im.height - h)
    out = im.resize((W, H), Image.LANCZOS, box=(x, y, x + w, y + h))
    if s > 1.2: out = out.filter(ImageFilter.UnsharpMask(1.2, 40, 2))
    out.save(f'public/hz/{nombre}.jpg', quality=92)

def video(nombre, src, ini=0.0, z=1.0, cx=0.5, cy=0.5):
    vf = (f"scale=w='max({W}/iw,{H}/ih)*{z}*iw':h=-2:flags=lanczos,"
          f"crop={W}:{H}:'min(max((iw*{cx})-{W}/2,0),iw-{W})':'min(max((ih*{cy})-{H}/2,0),ih-{H})',fps=30,format=yuv420p")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ini), '-t', '1.2', '-i', src, '-an', '-vf', vf,
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', f'public/hz/{nombre}.mp4'], check=True)

F = 'public/yasi/f/'
V = 'public/yasi/v/'
# Bolivia y Tarija (fotos)
foto('uyuni', F + 'uyuni-hexagonos.jpg', 1.5, 0.5, 0.8)
foto('vinedos', F + 'vinedos.jpg', 1.6, 0.45, 0.82)
foto('laguna', F + 'laguna-colorada.jpg', 2.2, 0.35, 0.53)
foto('chunchos', F + 'chunchos-san-roque.jpg', 1.7, 0.55, 0.22)
foto('isla-sendero', F + 'isla-del-sol-camino.jpg', 1.6, 0.5, 0.82)
foto('cartel', F + 'cartel-tarija.webp', 1.05, 0.5, 0.5)
foto('mercado', F + 'mercado-central-tarija.jpg', 1.35, 0.5, 0.74)
foto('lp-noche', F + 'lp-noche.jpg', 1.4, 0.5, 0.62)
foto('rueda', F + 't-rueda-chapaca.jpg', 1.7, 0.42, 0.6)
foto('titicaca', F + 'titicaca-terrazas.jpg', 1.7, 0.62, 0.78)
foto('flamencos', F + 'flamencos.jpg', 1.2, 0.5, 0.62)
foto('tiwanaku', F + 'tiwanaku-puerta-del-sol.jpg', 2.0, 0.45, 0.42)
foto('puente', F + 'puente-aereo.jpg', 1.3, 0.5, 0.5)
foto('sc', F + 'sc-skyline.jpg', 1.3, 0.5, 0.62)
foto('empanada', F + 'empanada-blanqueada.jpg', 1.8, 0.5, 0.45)
foto('plaza-lf', F + 't-plaza-luis-de-fuentes.jpg', 1.4, 0.5, 0.86)
foto('mapa', 'public/yasi/app/ruta-mapa-nov-dark.jpg', 1.0, 0.5, 0.34)
# caminar (videos propios y de Mixkit, licencia libre)
video('pies-pov', 'public/tarija/pies-pov.mp4', 1.0, 1.0, 0.5, 0.6)
video('aerea', V + 'aerea.mp4', 0.4, 1.0, 0.5, 0.6)
video('pies-calle', V + 'm23410.mp4', 0.2, 1.0, 0.5, 0.78)
video('parque', V + 'parque-camino.mp4', 0.0, 1.0, 0.5, 0.85)
video('maraton', V + 'maraton.mp4', 0.2, 1.0, 0.5, 0.55)
video('palomas', V + 'plaza-palomas.mp4', 0.2, 1.0, 0.5, 0.86)
video('ladrillo', V + 'm4851.mp4', 0.2, 1.0, 0.5, 0.8)
video('sendero', V + 'm722.mp4', 0.2, 1.0, 0.5, 0.7)
print('ok')
