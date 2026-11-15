# Carrusel de la primera publicación: iPhone completo con isla dinámica, solo o en abanico.
import sys
from PIL import Image
def color(img):
    r, g, b = Image.open('ip/' + img + '.png').convert('RGB').getpixel((589, 2)); return '#%02x%02x%02x' % (r, g, b)
def iphone(img, w, style=''):
    b = round(w * 0.032); sw = w - 2 * b; k = sw / 393; sb = round(54 * k); sh = round(852 * k)
    return (f'<div class="ip" style="width:{w}px;height:{sh + 2 * b}px;border-radius:{round(w * .17)}px;padding:{b}px;{style}">'
            f'<div class="sc" style="border-radius:{round(sw * .135)}px;background:{color(img)}">'
            f'<div class="sb" style="height:{sb}px;font-size:{round(16.5 * k)}px"><span class="tm" style="left:{round(34 * k)}px;top:{round(19 * k)}px">9:41</span>'
            f'<span class="isl" style="width:{round(122 * k)}px;height:{round(35 * k)}px;top:{round(11 * k)}px;margin-left:-{round(61 * k)}px"></span>'
            f'<span class="ic" style="right:{round(30 * k)}px;top:{round(21 * k)}px;transform:scale({k:.3f});transform-origin:right top"><i class="sg"><u style="height:4px"></u><u style="height:6px"></u><u style="height:9px"></u><u style="height:12px"></u></i><i class="bt"><u></u></i></span></div>'
            f'<img src="ip/{img}.png" style="width:{sw}px"></div></div>')
def fan(l, c, r, w=400):
    s = round(w * .86)
    return (f'<div class="fan">{iphone(l, s, "position:absolute;left:50%;top:70px;margin-left:-" + str(round(s / 2 + w * .62)) + "px;transform:rotate(-9deg);z-index:1")}'
            f'{iphone(r, s, "position:absolute;left:50%;top:70px;margin-left:" + str(round(w * .62 - s / 2)) + "px;transform:rotate(9deg);z-index:1")}'
            f'{iphone(c, w, "position:relative;z-index:2;margin:0 auto")}</div>')
one = lambda img, w=420: f'<div class="fan">{iphone(img, w, "margin:0 auto")}</div>'
CSS = '''
@page { size: 1080px 1350px; margin: 0 } * { box-sizing: border-box } html, body { margin: 0; background: #0d0718 }
body { font-family: 'Plus Jakarta Sans', sans-serif; color: #F0EBFA }
.s { width: 1080px; height: 1350px; position: relative; overflow: hidden; break-after: page; padding: 84px 64px 0; text-align: center; background: radial-gradient(900px 700px at 50% 78%, rgba(98,240,182,.16), rgba(98,240,182,0) 70%), linear-gradient(165deg, #2c1a63 0%, #1b1140 45%, #110922 100%) }
h1 { font-family: Montserrat; font-weight: 900; font-size: 88px; line-height: 1.04; letter-spacing: -2px; margin: 0 } h1 b { color: #62F0B6 }
h1.xl { font-size: 132px; letter-spacing: -4px } h1.l { font-size: 112px; letter-spacing: -3px }
p.sub { font-size: 40px; line-height: 1.3; color: #D6CCF0; margin: 22px 0 0; font-weight: 600 } p.sub b { color: #fff; font-weight: 800 }
.mid { position: absolute; left: 64px; right: 64px; top: 50%; transform: translateY(-56%) }
.fan { position: relative; margin-top: 44px }
.ip { background: #08080b; box-shadow: 0 0 0 2px #2b2b31, 0 0 0 5px #77757f, 0 0 0 7px #26252b, 0 40px 90px rgba(0,0,0,.6) }
.sc { width: 100%; height: 100%; overflow: hidden; position: relative } .sc img { display: block }
.sb { position: relative; color: #fff; font-weight: 800 } .sb span { position: absolute } .isl { left: 50%; background: #000; border-radius: 99px }
.ic { display: flex; gap: 6px; align-items: center } .sg { display: flex; gap: 2px; align-items: flex-end; height: 12px } .sg u { width: 3px; background: #fff; border-radius: 1px; display: block }
.bt { width: 25px; height: 12px; border: 1.5px solid rgba(255,255,255,.7); border-radius: 4px; display: block; position: relative } .bt u { position: absolute; left: 1.5px; top: 1.5px; bottom: 1.5px; width: 16px; background: #fff; border-radius: 2px; display: block }
.baifo { width: 300px; margin-top: 40px } .logo { width: 190px }
.pill { display: inline-block; background: #62F0B6; color: #1a0f3a; font-family: Montserrat; font-weight: 900; font-size: 50px; padding: 26px 46px; border-radius: 99px; margin-top: 40px }
.swipe { position: absolute; left: 50%; bottom: 70px; transform: translateX(-50%); background: #62F0B6; color: #1a0f3a; font-weight: 800; font-size: 34px; padding: 18px 36px; border-radius: 99px; white-space: nowrap }
.big3 { font-family: Montserrat; font-weight: 900; font-size: 84px; line-height: 1.25; color: #9d90c6; margin-top: 50px }
.word { font-family: Montserrat; font-weight: 900; font-size: 120px; letter-spacing: 10px; color: #62F0B6; margin-top: 18px }
'''
S = [
  '<div class="mid"><h1 class="xl">¿Y si caminar<br><b>tuviera premio?</b></h1><img class="baifo" src="img/baifo.png"></div><span class="swipe">Desliza →</span>',
  '<div class="mid"><h1 class="l">Todos los días caminas <b>gratis.</b></h1><div class="big3">A la plaza.<br>Al mercado.<br>Al trabajo.</div></div>',
  '<h1>Eso cambia el<br><b>1 de diciembre.</b></h1><p class="sub">Llega <b>Camina</b> a Tarija.</p>' + fan('canjes', 'inicio', 'grupos'),
  '<h1>Tus pasos se vuelven <b>Puntos.</b></h1><p class="sub"><b>1.000 pasos = 1 Punto.</b> La app los cuenta sola.</p>' + one('inicio'),
  '<h1>Tus Puntos se vuelven <b>premios.</b></h1><p class="sub">En locales de Tarija.</p>' + fan('premios', 'canjes', 'confirmado'),
  '<h1>Y con amigos<br><b>rinde más.</b></h1><p class="sub">Grupos, ranking e insignias.</p>' + fan('ranking', 'grupos', 'perfil'),
  '<div class="mid"><img class="logo" src="img/logo.png"><div class="word">CAMINA</div><h1 style="margin-top:30px">Tus pasos <b>van a valer.</b></h1><span class="pill">1 de diciembre · Tarija</span><p class="sub" style="margin-top:40px">Síguenos en <b>@caminaapp</b> y sé de los primeros.</p></div>',
]
html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet"><style>' + CSS + '</style></head><body>' + ''.join(f'<section class="s">{b}</section>' for b in S) + '</body></html>'
open('lanzamiento.html', 'w').write(html); print('ok')
