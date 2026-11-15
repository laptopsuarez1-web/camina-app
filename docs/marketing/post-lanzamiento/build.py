# Publicación de Instagram estilo Pasito (parecida, no igual): fondo claro, título grande, una historia enmarcada al centro.
BG = '#F3EEFB'; INK = '#241748'; MINT = '#62F0B6'


def story(photo, logo, handle, pos='center'):
    return (f'<div class="story"><div class="ph" style="background-image:url(a/{photo});background-position:{pos}"></div>'
            f'<div class="tag">@{handle} ♡ @caminaapp</div>'
            f'<div class="pill"><span class="w">CAMINA</span><span class="x">×</span><span class="lg"><img src="a/{logo}"></span></div></div>')


def slide(title, sub, st, n):
    return f'<section class="s"><div class="n">{n}/5</div><h1>{title}</h1>{st}<div class="cap">{sub}</div></section>'


collage = '''<section class="s dark"><div class="n">1/5</div>
<div class="grid">
 <div class="t" style="grid-area:a;background-image:url(a/plaza.jpg)"><img src="a/baifo.png" style="position:absolute;left:18px;bottom:6px;height:58%"></div>
 <div class="t mint" style="grid-area:b"><img src="a/sticker-camina-logo.png" style="width:78%"></div>
 <div class="t" style="grid-area:c;background:#fff"><img src="a/inicio.png" class="shot"></div>
 <div class="t" style="grid-area:d;background:#120a26"><img src="a/ruta.png" class="shot"></div>
 <div class="t mint" style="grid-area:e"><img src="a/sticker-camina-baifo.png" style="width:92%"></div>
 <div class="t" style="grid-area:f;background-image:url(a/bloom-b1.jpg)"><div class="minipill"><b>CAMINA</b> × <img src="a/bloom-logo.jpg"></div></div>
 <div class="t" style="grid-area:g;background-image:url(a/ciudad.jpg)"></div>
 <div class="t" style="grid-area:h;background:#1d1238"><img src="a/canjes.png" class="shot"></div>
</div>
<img src="a/sticker-camina-menta.png" class="big">
</section>'''

CSS = f'''
*{{box-sizing:border-box}} html,body{{margin:0;background:#000}}
.s{{width:1080px;height:1350px;position:relative;overflow:hidden;background:{BG};display:flex;flex-direction:column;align-items:center;font-family:'Plus Jakarta Sans'}}
.s.dark{{background:#2a1a4d}}
.n{{position:absolute;right:36px;top:34px;background:rgba(36,23,72,.55);color:#fff;font-weight:700;font-size:26px;padding:8px 18px;border-radius:99px;z-index:5}}
h1{{font-family:Montserrat;font-weight:800;color:{INK};font-size:112px;line-height:.98;letter-spacing:-5px;text-align:center;margin:96px 40px 0}}
.cap{{font-family:Montserrat;font-weight:700;color:{INK};font-size:62px;letter-spacing:-2px;margin-top:30px}}
.story{{position:relative;width:440px;height:782px;margin-top:44px;border-radius:44px;border:8px solid {MINT};overflow:hidden;box-shadow:0 20px 50px rgba(36,23,72,.18)}}
.story .ph{{position:absolute;top:0;left:0;right:0;bottom:0;background-size:cover}}
.story .tag{{position:absolute;top:28px;left:0;right:0;text-align:center;color:#fff;font-weight:600;font-size:17px;text-shadow:0 1px 6px rgba(0,0,0,.45)}}
.pill{{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;background:{INK};border:2px solid {MINT};border-radius:99px;padding:7px 7px 7px 22px}}
.pill .w{{font-family:Montserrat;font-weight:900;color:{MINT};font-size:24px;letter-spacing:.5px}}
.pill .x{{color:{MINT};font-weight:800;font-size:17px}}
.pill .lg{{width:46px;height:46px;border-radius:13px;overflow:hidden;background:#fff}} .pill .lg img{{width:100%;height:100%;object-fit:cover}}
.grid{{position:absolute;top:36px;left:36px;right:36px;bottom:36px;display:grid;gap:18px;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1.1fr .9fr 1fr 1fr;
 grid-template-areas:"a a b" "c d b" "c d e" "f g h"}}
.t{{position:relative;border-radius:22px;overflow:hidden;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center}}
.t.mint{{background:{MINT}}}
.shot{{width:100%;height:100%;object-fit:cover;object-position:top}}
.minipill{{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;background:{INK};border:2px solid {MINT};border-radius:99px;padding:4px 4px 4px 12px;color:{MINT};font-size:13px;white-space:nowrap}}
.minipill b{{font-family:Montserrat;font-weight:900;font-size:14px}} .minipill img{{width:26px;height:26px;border-radius:8px}}
.big{{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%) rotate(-6deg);width:860px;filter:drop-shadow(0 18px 30px rgba(0,0,0,.35))}}
.end h1{{margin-top:0}}
'''

end = '''<section class="s end" style="justify-content:center"><div class="n">5/5</div>
  <img src="a/sticker-camina-morado.png" style="width:900px;transform:rotate(-5deg);margin-bottom:40px">
  <h1 style="font-size:96px">Llega el 1 de<br>diciembre a Tarija</h1>
  <div class="cap" style="font-size:52px">síguenos en @caminaapp</div>
  <img src="a/baifo.png" style="height:300px;margin-top:40px"></section>'''

slides = [collage,
          slide('Caminar ahora<br>tiene premio', 'sumando pasos en Tarija', story('plaza.jpg', 'fripaps-logo.jpg', 'fripaps.tarija', '38% center'), 2),
          slide('1.000 pasos<br>= 1 Punto', 'tus pasos valen', story('bloom-b1.jpg', 'bloom-logo.jpg', 'bloom.tarija'), 3),
          slide('Tu premio,<br>tu historia', 'etiqueta a @caminaapp', story('ciudad.jpg', 'coco-logo.jpg', 'cocobarber', '60% center'), 4),
          end]
html = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@600;700&display=swap" rel="stylesheet"><style>'
        + CSS + '</style></head><body>' + ''.join(slides) + '</body></html>')
open('post.html', 'w').write(html)
print('ok')
