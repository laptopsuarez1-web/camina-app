# Junta las imágenes de las páginas en un PDF A4 apaisado.
import glob, sys
from PIL import Image
pre, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(pre + '-*.jpg'))
ims = [Image.open(f).convert('RGB') for f in fs]
dpi = ims[0].width / (297 / 25.4)
ims[0].save(out, save_all=True, append_images=ims[1:], resolution=dpi, quality=88)
print(out, len(ims), ims[0].size, round(dpi))
