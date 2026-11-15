# Dossier para comercios, versión «cupo fundador»: genera fundador.html (A4 apaisado).
# Después: node render-img.js fundador.html out/fundador  y  python3 topdf.py out/fundador Dossier-Camina-Fundadores.pdf
import re
from PIL import Image


def color(img):
    r, g, b = Image.open(f'a/ip/{img}.jpg').convert('RGB').getpixel((589, 2))
    return '#%02x%02x%02x' % (r, g, b)


def iphone(img, w, style=''):
    """iPhone completo con isla dinámica. w = ancho total en px (la página mide 1123 px)."""
    b = round(w * 0.032); sw = w - 2 * b; k = sw / 393; sh = round(852 * k)
    return (f'<div class="ip" style="width:{w}px;height:{sh + 2 * b}px;border-radius:{round(w * .17)}px;padding:{b}px;{style}">'
            f'<div class="sc" style="border-radius:{round(sw * .135)}px;background:{color(img)}">'
            f'<div class="sb" style="height:{round(54 * k)}px;font-size:{round(16.5 * k, 1)}px"><span class="tm" style="left:{round(34 * k)}px;top:{round(19 * k)}px">9:41</span>'
            f'<span class="isl" style="width:{round(122 * k)}px;height:{round(35 * k)}px;top:{round(11 * k)}px;margin-left:-{round(61 * k)}px"></span>'
            f'<span class="ic2" style="right:{round(30 * k)}px;top:{round(21 * k)}px;transform:scale({k:.3f});transform-origin:right top"><i class="sg"><u style="height:4px"></u><u style="height:6px"></u><u style="height:9px"></u><u style="height:12px"></u></i><i class="bt"><u></u></i></span></div>'
            f'<img src="a/ip/{img}.jpg" style="width:{sw}px"></div></div>')


def fan(l, c, r, w, top=0, spread=.6):
    s = round(w * .86)
    return (f'<div class="fan" style="height:{round(w * 2.2)}px">'
            f'{iphone(l, s, f"position:absolute;left:50%;top:{top + 34}px;margin-left:-{round(s / 2 + w * spread)}px;transform:rotate(-8deg);z-index:1")}'
            f'{iphone(r, s, f"position:absolute;left:50%;top:{top + 34}px;margin-left:{round(w * spread - s / 2)}px;transform:rotate(8deg);z-index:1")}'
            f'{iphone(c, w, f"position:absolute;left:50%;top:{top}px;margin-left:-{round(w / 2)}px;z-index:2")}</div>')


def icon(name):
    t = open(f'a/ic/{name}.svg').read()
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S).strip()
    t = re.sub(r'class="[^"]*"', '', t).replace('width="24"', 'width="24"').replace('height="24"', 'height="24"').replace('stroke="currentColor"', 'stroke="#62F0B6"')
    return f'<span class="ico">{t}</span>'


TOP = lambda n: f'<div class="top"><span><img src="a/logo.png">Camina</span><span>{n}</span></div>'

CSS = '''
@page { size: 297mm 210mm; margin: 0 } * { box-sizing: border-box }
html, body { margin: 0; padding: 0; background: #0d0718 }
body { font-family: 'Plus Jakarta Sans', sans-serif; color: #F0EBFA }
.pg { width: 297mm; height: 210mm; position: relative; overflow: hidden; break-after: page; background: radial-gradient(120% 90% at 85% 0%, #3a1f78 0%, #1d1240 45%, #120a26 100%) }
.pg.alt { background: radial-gradient(110% 90% at 0% 100%, #173a33 0%, #1a1238 50%, #120a26 100%) }
.pg.gold { background: radial-gradient(90% 80% at 80% 10%, #4a3a12 0%, #251a3f 45%, #120a26 100%) }
h1, h2, .big { font-family: Montserrat, sans-serif; font-weight: 900; letter-spacing: -1px; margin: 0; line-height: 1.02 }
h2 { font-size: 44px } .m { color: #62F0B6 } .g { color: #F2C94C }
.kicker { font-weight: 800; font-size: 13px; letter-spacing: 2.4px; text-transform: uppercase; color: #62F0B6; margin-bottom: 10px }
.kicker.g { color: #F2C94C }
.lead { font-size: 18px; line-height: 1.45; color: #D6CCF0; margin: 12px 0 0 } .lead b { color: #fff }
.top { position: absolute; top: 9mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9d90c6; letter-spacing: 1.6px; text-transform: uppercase; font-weight: 700 }
.top img { height: 8mm; vertical-align: middle; margin-right: 7px }
.ip { position: relative; background: #08080b; box-shadow: 0 0 0 1.5px #2b2b31, 0 0 0 3.5px #77757f, 0 0 0 5px #26252b, 0 26px 60px rgba(0,0,0,.55) }
.sc { width: 100%; height: 100%; overflow: hidden; position: relative } .sc img { display: block }
.sb { position: relative; color: #fff; font-weight: 800 } .sb span { position: absolute } .isl { left: 50%; background: #000; border-radius: 99px }
.ic2 { display: flex; gap: 6px; align-items: center } .sg { display: flex; gap: 2px; align-items: flex-end; height: 12px } .sg u { width: 3px; background: #fff; border-radius: 1px; display: block }
.bt { width: 25px; height: 12px; border: 1.5px solid rgba(255,255,255,.7); border-radius: 4px; display: block; position: relative } .bt u { position: absolute; left: 1.5px; top: 1.5px; bottom: 1.5px; width: 16px; background: #fff; border-radius: 2px; display: block }
.fan { position: relative }
.pill { display: inline-flex; align-items: center; border-radius: 99px; padding: 10px 20px; font-weight: 800; font-size: 16px }
.pill.m { background: #62F0B6; color: #1a0f3a } .pill.o { border: 2px solid rgba(98,240,182,.6); color: #62F0B6 } .pill.g { background: #F2C94C; color: #1a0f3a }
.num { width: 40px; height: 40px; border-radius: 99px; background: #62F0B6; color: #1a0f3a; font-weight: 900; font-size: 19px; display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
.card { background: #221a44; border: 1px solid #3a2f68; border-radius: 20px; padding: 20px 20px 22px }
.card h3 { margin: 10px 0 5px; font-size: 19px; font-weight: 800; color: #fff } .card p { margin: 0; font-size: 14.5px; line-height: 1.45; color: #CFC4EE }
.ico { width: 46px; height: 46px; border-radius: 13px; background: #273150; display: flex; align-items: center; justify-content: center }
.banner { border-radius: 18px; padding: 15px 22px; background: linear-gradient(90deg, #62F0B6, #4FC3A8); color: #1a0f3a; font-weight: 800; font-size: 19px; text-align: center }
.note { font-size: 11px; color: #8E82AE }
'''

P = []

# 1. PORTADA
P.append(f'''<section class="pg" style="background:#120a26">
<div style="position:absolute;inset:0;background:url(a/plaza-cover.jpg) center/cover"></div>
<div style="position:absolute;left:16mm;top:13mm;display:flex;align-items:center;gap:12px"><img src="a/logo.png" style="height:14mm"><span class="big" style="font-size:28px;color:#62F0B6;letter-spacing:3px">CAMINA</span></div>
<div style="position:absolute;left:16mm;top:40mm;width:142mm">
  <div class="kicker">Para comercios de Tarija · sale el 1 de diciembre</div>
  <h1 style="font-size:62px">Clientes nuevos<br>en tu local.<br><span class="m">Sin pagar publicidad.</span></h1>
  <p class="lead" style="max-width:132mm">La gente de Tarija camina, junta Puntos y los cambia por premios en locales como el tuyo. <b>Tú pones el premio. Ellos llegan a tu puerta.</b></p>
  <div style="margin-top:22px;display:inline-flex;align-items:center;gap:18px;background:#2a2108;border:2px solid #F2C94C;border-radius:22px;padding:14px 22px">
    <div><div style="font-weight:800;font-size:13px;letter-spacing:2px;color:#F2C94C;text-transform:uppercase">Cupo fundador · solo 20 comercios</div>
    <div class="big" style="font-size:30px;margin-top:4px">3 meses gratis</div>
    <div style="font-size:16px;color:#F5E3A8;margin-top:2px">Te ahorras <b style="color:#fff">Bs 297</b> · y después sigues gratis si quieres</div></div>
  </div>
</div>
<div style="position:absolute;right:14mm;top:20mm;width:120mm">{fan("canjes", "inicio", "confirmado", 214, 0, .5)}</div>
<img src="a/baifo.png" style="position:absolute;right:10mm;bottom:6mm;width:28mm">
<div style="position:absolute;left:16mm;bottom:7mm;font-size:12px;color:#B9AED9">Dossier para comercios · caminaapp.com · Hecha en Tarija, Bolivia</div>
</section>''')

# 2. CÓMO FUNCIONA
def paso(n, t, d, img):
    return f'<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px">{iphone(img, 170)}<div style="display:flex;gap:10px;align-items:center"><span class="num">{n}</span><span style="font-size:22px;font-weight:800">{t}</span></div><p style="margin:0;font-size:15px;line-height:1.45;color:#CFC4EE;max-width:72mm">{d}</p></div>'
P.append(f'''<section class="pg">{TOP("01 · Cómo funciona")}
<div style="position:absolute;left:16mm;right:16mm;top:20mm">
  <h2>De un paso <span class="m">a tu caja.</span></h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px">
    {paso(1, "Caminan", "La app cuenta los pasos sola. <b style='color:#fff'>1.000 pasos = 1 Punto</b>, hasta 20 por día.", "inicio")}
    {paso(2, "Te encuentran", "Tu local aparece en la app con tu foto y tu premio. Lo eligen y salen a buscarlo.", "canjes")}
    {paso(3, "Llegan y canjean", "Les dices tu código de 4 números, lo escriben y listo: <b style='color:#fff'>canje confirmado</b>.", "codigo")}
  </div>
</div>
<div class="banner" style="position:absolute;left:16mm;right:16mm;bottom:10mm">No pagas publicidad. Lo único que pones es el premio que tú eliges dar.</div>
</section>''')

# 3. LO QUE TE LLEVAS
def card(ic, t, d):
    return f'<div class="card">{icon(ic)}<h3>{t}</h3><p>{d}</p></div>'
P.append(f'''<section class="pg alt">{TOP("02 · Lo que te llevas")}
<div style="position:absolute;left:16mm;right:16mm;top:20mm">
  <div class="kicker">Visitas reales, no likes</div>
  <h2>Cada canje es <span class="m">una persona en tu local.</span></h2>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:1fr;gap:14px;margin-top:22px">
    {card("user-plus", "Clientes nuevos", "Gente que te descubre en la app y entra por primera vez. Puedes hacer un premio <b style='color:#fff'>solo para clientes nuevos</b>.")}
    {card("repeat", "Clientes que vuelven", "Cada visita les sube de nivel en tu local: Visitante, Habitual y Fan. Vuelven por más.")}
    {card("clock", "Horas flojas llenas", "Activa tu premio solo los días y horarios en que casi no entra nadie.")}
    {card("shopping-bag", "Venden algo más", "Quien viene por su premio casi siempre compra algo. Con regalo con compra o combo, la venta está asegurada.")}
    {card("star", "Reseñas en Google", "Después del canje la app le pide que te califique en Google Maps. Subes en las búsquedas.")}
    {card("instagram", "Historias en Instagram", "La app les da Puntos por subir una historia con tu premio. Sus amigos ven tu local.")}
    {card("route", "Ruta del mes", "Cada mes la gente sale a visitar 3 locales al azar para ganar un sorteo. Gratis para tu local.")}
    {card("chart-column", "Tus números claros", "Tu panel te dice cuánta gente te trajo Camina, cuántos son nuevos y cuántos volvieron.")}
  </div>
</div></section>''')

# 4. PUBLICIDAD QUE NO PAGAS
P.append(f'''<section class="pg">{TOP("03 · Publicidad que no pagas")}
<div style="position:absolute;left:16mm;top:24mm;width:128mm">
  <div class="kicker">Después de cada canje</div>
  <h2>Tus clientes te hacen<br><span class="m">la publicidad.</span></h2>
  <p class="lead">Apenas alguien canjea, la app le pide dos cosas. <b>Tú no haces nada.</b></p>
  <div style="display:flex;flex-direction:column;gap:12px;margin-top:18px">
    <div class="card" style="display:flex;gap:14px;align-items:flex-start">{icon("star")}<div><h3 style="margin-top:0">Que te califique en Google Maps</h3><p>Más reseñas buenas = apareces más arriba cuando buscan dónde comer, cortarse el pelo o comprar en Tarija.</p></div></div>
    <div class="card" style="display:flex;gap:14px;align-items:flex-start">{icon("camera")}<div><h3 style="margin-top:0">Que suba una historia con tu premio</h3><p>Te etiqueta en Instagram y gana 5 Puntos. Todos sus amigos ven tu local.</p></div></div>
  </div>
</div>
<div style="position:absolute;right:14mm;top:22mm;display:flex;gap:22px">{iphone("resena", 205)}{iphone("historia", 205, "margin-top:40px")}</div>
</section>''')

# 5. TÚ ELIGES EL PREMIO
def tipo(t, d, ej, gold=False):
    bd = '#F2C94C' if gold else '#3a2f68'
    return (f'<div class="card" style="border:{2 if gold else 1}px solid {bd};display:flex;flex-direction:column">'
            f'<div class="big" style="font-size:24px;color:{"#F2C94C" if gold else "#fff"}">{t}</div><p style="margin-top:6px;flex:1">{d}</p>'
            f'<div style="margin-top:12px;background:{"#F2C94C" if gold else "#62F0B6"};color:#1a0f3a;font-weight:800;font-size:14px;border-radius:12px;padding:9px 11px;line-height:1.3">{ej}</div></div>')
chips = ''.join(f'<span class="pill o" style="font-size:14px;padding:8px 16px">✓ {c}</span>' for c in ["Solo para clientes nuevos", "Solo en tus horas flojas", "Cupos por día", "Lo pausas cuando quieras"])
P.append(f'''<section class="pg alt">{TOP("04 · Tú eliges el premio")}
<div style="position:absolute;left:16mm;right:16mm;top:20mm">
  <div class="kicker">Tu negocio, tus reglas</div>
  <h2>Cinco formas de <span class="m">atraer gente.</span></h2>
  <p class="lead">Eliges qué das, cuántos Puntos cuesta, cuántos por día y en qué horario. El panel te sugiere ideas para tu rubro.</p>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:18px;min-height:52mm">
    {tipo("Gratis", "Se lo lleva sin pagar. El que más hace que te prueben.", "Gaseosa personal · 12 Puntos")}
    {tipo("Regalo con compra", "Un extra cuando compra algo. Cada canje te deja una venta.", "Papas de regalo llevando un combo")}
    {tipo("Descuento", "Un % o un monto. Tú pones el límite.", "20% en tu corte · 25 Puntos")}
    {tipo("2x1", "Lleva 2 y paga 1. Viene con un amigo: dos clientes.", "2x1 en hamburguesas")}
    {tipo("Combo Camina", "Tu combo a precio especial. Mueves lo que más te conviene.", "Salchipapa + gaseosa · Bs 25 (antes 32)", True)}
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">{chips}</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px">
    <div style="position:relative;height:30mm;border-radius:16px;overflow:hidden;background:url(a/foto-bloom.jpg) center/cover"><span class="pill m" style="position:absolute;left:10px;bottom:10px;font-size:13px;padding:7px 12px">Bloom · Retirado de gel · 35 Puntos</span></div>
    <div style="position:relative;height:30mm;border-radius:16px;overflow:hidden;background:url(a/foto-coco.jpg) center/cover"><span class="pill m" style="position:absolute;left:10px;bottom:10px;font-size:13px;padding:7px 12px">Coco Barber · Corte de cabello · 25 Puntos</span></div>
    <div style="position:relative;height:30mm;border-radius:16px;overflow:hidden;background:url(a/foto-fripaps.jpg) center/cover"><span class="pill m" style="position:absolute;left:10px;bottom:10px;font-size:13px;padding:7px 12px">Fripap's · Salchipapa clásica · 25 Puntos</span></div>
  </div>
  <div class="note" style="margin-top:6px">Algunos de nuestros primeros comercios aliados.</div>
</div></section>''')

# 6. CANJE + PANEL
P.append(f'''<section class="pg">{TOP("05 · El canje y tu panel")}
<div style="position:absolute;left:16mm;top:22mm;width:112mm">
  <div class="kicker">Así de simple en tu caja</div>
  <h2>Toma <span class="m">10 segundos.</span><br>Sin máquinas.</h2>
  <div style="display:flex;flex-direction:column;gap:12px;margin-top:18px;font-size:16px;line-height:1.4">
    <div style="display:flex;gap:12px;align-items:center"><span class="num">1</span><span>La persona toca <b>Canjear</b> en tu local.</span></div>
    <div style="display:flex;gap:12px;align-items:center"><span class="num">2</span><span>Le dices tu <b>código de 4 números</b>.</span></div>
    <div style="display:flex;gap:12px;align-items:center"><span class="num">3</span><span>Lo escribe, se confirma al instante y <b>entregas el premio</b>.</span></div>
  </div>
  <div class="card" style="margin-top:18px"><h3 style="margin-top:0">Y ves todo en tu panel</h3><p>Cuánta gente te trajo Camina, cuántos son nuevos, cuántos volvieron y cuántos compraron algo más. Tus cajeros también pueden usarlo, sin tu contraseña.</p></div>
</div>
<div style="position:absolute;left:134mm;top:20mm">{iphone("codigo", 176)}</div>
<div style="position:absolute;left:186mm;top:20mm">{iphone("confirmado", 176)}</div>
<div style="position:absolute;left:134mm;right:14mm;top:128mm;border-radius:14px;overflow:hidden;border:3px solid #4a3a78;height:60mm;background:url(a/panel-inicio.jpg) top left/cover"></div>
<div class="note" style="position:absolute;left:134mm;top:189mm">Tu panel en caminaapp.com (datos de ejemplo).</div>
</section>''')

# 7. LA OFERTA
def hito(n, t, d, gold=False):
    c = '#F2C94C' if gold else '#62F0B6'
    return f'<div style="flex:1;display:flex;flex-direction:column;gap:8px"><div style="height:8px;border-radius:9px;background:{c}"></div><div style="font-weight:800;font-size:13px;letter-spacing:1.8px;text-transform:uppercase;color:{c}">{n}</div><div style="font-size:20px;font-weight:800;color:#fff">{t}</div><div style="font-size:14.5px;line-height:1.45;color:#D6CCF0">{d}</div></div>'
P.append(f'''<section class="pg gold">{TOP("06 · Tu cupo fundador")}
<div style="position:absolute;left:16mm;right:16mm;top:20mm">
  <div class="kicker g">Solo para los primeros 20 comercios</div>
  <h2 style="font-size:52px">Entras gratis y te ahorras <span class="g">Bs 297.</span></h2>
  <div style="display:flex;gap:16px;margin-top:22px;align-items:stretch">
    <div class="card" style="flex:1.1;border:2px solid #F2C94C;background:#2a2108">
      <div style="font-size:15px;color:#F5E3A8;font-weight:700">Plan Paso Firme (el completo)</div>
      <div style="display:flex;align-items:baseline;gap:14px;margin-top:8px"><span class="big" style="font-size:34px;color:#9d8a5a;text-decoration:line-through">Bs 297</span><span class="big" style="font-size:64px;color:#F2C94C">Bs 0</span></div>
      <div style="font-size:15px;color:#F5E3A8;margin-top:4px">3 meses × Bs 99 que <b style="color:#fff">no pagas</b>.</div>
      <div style="font-size:14.5px;color:#fff;margin-top:12px;line-height:1.5">✓ Varios premios a la vez y cupos ilimitados<br>✓ Estadísticas de lo que te trae Camina<br>✓ Tu premio en la tarjeta de fidelidad de Camina<br>✓ Te ayudamos a armar tu local y tus premios</div>
    </div>
    <div class="card" style="flex:1;background:#1d2a2a;border:2px solid #62F0B6">
      <div style="font-size:15px;color:#bff5df;font-weight:700">¿Y después de los 3 meses?</div>
      <div class="big" style="font-size:34px;margin-top:8px">Sigues <span class="m">gratis.</span></div>
      <div style="font-size:15px;color:#D6CCF0;margin-top:8px;line-height:1.5">Puedes quedarte <b style="color:#fff">para siempre</b> en el plan gratis Primer Paso, con tu local en la app y tus premios activos. O seguir en Paso Firme por Bs 99 al mes. <b style="color:#fff">Tú eliges.</b></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><span class="pill m" style="font-size:13px;padding:7px 13px">Sin contrato</span><span class="pill m" style="font-size:13px;padding:7px 13px">Sin permanencia</span><span class="pill m" style="font-size:13px;padding:7px 13px">Sin comisión por canje</span></div>
    </div>
  </div>
  <div style="display:flex;gap:16px;margin-top:22px">
    {hito("Hoy", "Reservas tu cupo", "Registras tu local en 5 minutos o te lo armamos por WhatsApp.")}
    {hito("1 de diciembre", "Sales en la app", "Apareces desde el lanzamiento, con difusión en las redes de Camina.")}
    {hito("Diciembre a febrero", "3 meses gratis", "Todo el plan Paso Firme sin pagar nada.", True)}
    {hito("Desde marzo", "Tú decides", "Sigues gratis en Primer Paso o te quedas en Paso Firme.")}
  </div>
</div>
<div class="banner" style="position:absolute;left:16mm;right:16mm;bottom:10mm;background:linear-gradient(90deg,#F2C94C,#E0B43A)">No arriesgas nada: entras gratis, pruebas 3 meses y decides. Reserva en caminaapp.com/registro</div>
</section>''')

# 8. PLANES + PREGUNTAS
def plan(n, p, items, hl=False):
    lis = ''.join(f'<li>{i}</li>' for i in items)
    return f'<div class="card" style="{"border:2px solid #62F0B6;" if hl else ""}display:flex;flex-direction:column;gap:4px"><div style="font-weight:800;font-size:16px">{n}</div><div class="big" style="font-size:30px">{p}</div><ul style="margin:6px 0 0;padding:0;list-style:none;font-size:13.5px;color:#D6CCF0;display:flex;flex-direction:column;gap:5px">{lis}</ul></div>'
def faq(q, a):
    return f'<div style="padding:10px 0;border-bottom:1px solid #3a2f68"><div style="font-weight:800;font-size:15.5px;color:#fff">{q}</div><div style="font-size:14px;line-height:1.45;color:#CFC4EE;margin-top:3px">{a}</div></div>'
P.append(f'''<section class="pg">{TOP("07 · Planes y preguntas")}
<style>.pg li::before{{content:'✓  ';color:#62F0B6;font-weight:800}}</style>
<div style="position:absolute;left:16mm;top:20mm;width:132mm">
  <h2 style="font-size:36px">Empiezas gratis.<br><span class="m">Creces cuando quieras.</span></h2>
  <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
    {plan("Primer Paso · gratis siempre", "Bs 0", ["Tu local en la app y en el mapa", "1 premio gratis y, con él, 1 más (regalo, descuento, 2x1 o combo)", "Mínimo 3 cupones por día"], True)}
    {plan("Paso Firme · 3 meses gratis para fundadores", "Bs 99<span style='font-size:16px'>/mes</span>", ["Varios premios a la vez y cupones ilimitados", "Estadísticas y tu premio en la tarjeta de fidelidad"])}
    {plan("Paso Adelante", "Bs 299<span style='font-size:16px'>/mes</span>", ["Destacado y primero en tu categoría", "Avisos a la gente que camina cerca y difusión en redes"])}
  </div>
</div>
<div style="position:absolute;right:16mm;top:20mm;width:118mm">
  <div class="kicker">Lo que todos preguntan</div>
  {faq("¿Cuánto me cuesta entrar?", "Nada. Los fundadores tienen 3 meses del plan Paso Firme gratis.")}
  {faq("¿Me cobran comisión por cada canje?", "No. Lo único que pones es el premio que tú eliges.")}
  {faq("¿Qué pasa después de los 3 meses?", "Sigues gratis en Primer Paso o eliges un plan. Sin contrato.")}
  {faq("¿Necesito una máquina o algo especial?", "No. Solo tu código de 4 números. El canje toma 10 segundos.")}
  {faq("¿Y si me piden demasiados premios?", "Tú pones cuántos por día y en qué horario. Lo pausas cuando quieras.")}
  {faq("¿Cómo sé si me sirve?", "Tu panel te dice cuánta gente te trajo Camina, cuántos son nuevos y cuántos volvieron.")}
  <div class="note" style="margin-top:10px">Referencia: en Pasito (app argentina parecida, sin relación con Camina), más del 70% de quienes canjean compran algo más en el local (su fundador, Infobae, 18/05/2026).</div>
</div></section>''')

# 9. CIERRE
P.append(f'''<section class="pg alt">{TOP("08 · Asegura tu cupo")}
<div style="position:absolute;left:16mm;top:26mm;width:150mm">
  <div class="kicker g">Solo 20 cupos fundador</div>
  <h1 style="font-size:54px">Reserva tu cupo<br><span class="m">hoy, gratis.</span></h1>
  <p class="lead" style="max-width:140mm">Te ahorras <b>Bs 297</b>, sales desde el lanzamiento y después sigues gratis si quieres. No arriesgas nada.</p>
  <div style="display:flex;flex-direction:column;gap:14px;margin-top:20px;font-size:17px">
    <div style="display:flex;gap:12px;align-items:center"><span class="num">1</span><span>Escanea el código y registra tu local (5 minutos).</span></div>
    <div style="display:flex;gap:12px;align-items:center"><span class="num">2</span><span>O escríbenos por WhatsApp y te lo armamos nosotros.</span></div>
    <div style="display:flex;gap:12px;align-items:center"><span class="num">3</span><span>El 1 de diciembre la gente empieza a caminar hacia tu local.</span></div>
  </div>
</div>
<div style="position:absolute;right:16mm;top:24mm;width:96mm;display:flex;flex-direction:column;gap:12px">
  <div style="background:#fff;border-radius:22px;padding:18px;text-align:center"><img src="a/qr-registro.svg" style="width:62mm;display:block;margin:0 auto"><div style="color:#241748;font-weight:800;font-size:17px;margin-top:8px">caminaapp.com/registro</div></div>
  <div class="card"><div style="font-weight:800;font-size:18px">Marcos Suárez · Creador de Camina</div><div style="font-size:15px;color:#D6CCF0;margin-top:5px;line-height:1.5">WhatsApp +591 627 14286<br>caminaappbo@gmail.com · caminaapp.com</div></div>
</div>
<img src="a/baifo.png" style="position:absolute;left:150mm;bottom:8mm;width:30mm">
</section>''')

html = ('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Camina · Cupo fundador</title>'
        '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
        f'<style>{CSS}</style></head><body>' + '\n'.join(P) + '</body></html>')
open('fundador.html', 'w').write(html)
print('ok', len(P))
