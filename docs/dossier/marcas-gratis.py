# Dossier de marcas: campaña de lanzamiento gratis (primer evento o desafío) y página de ejemplo con una disco.
s = open('marcas.html').read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

P = lambda img, w, extra='': f'<div class="phone" style="width:{w}mm;{extra}"><img src="a/{img}"></div>'

# Portada
rep('<span class="pill o">Desde Bs 200</span>', '<span class="pill g">Tu primer evento o desafío, gratis</span>')

# Página nueva: ejemplo de una disco, después de Eventos
disco = '''<!-- 5b. EJEMPLO: UNA DISCO -->
<section class="pg">
  <div class="top"><span><img src="a/logo.png">Camina</span><span>05 · Ejemplo: tu disco o boliche</span></div>
  <div class="content" style="display:flex;gap:12mm;align-items:center">
    <div style="flex:1">
      <div class="kicker">Para discos, bares, peñas y productoras</div>
      <h2>Anuncia tus fiestas y <span class="m">vende tus entradas.</span></h2>
      <p class="lead">Publicas tu evento en la app con fecha, lugar, fotos y la forma de entrar que prefieras. Y lo combinas como quieras:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
        <div class="card"><div class="ic"><i style="--u:url(a/ic/ticket.svg)"></i></div><h3>Entradas con Puntos</h3><p>«Entrada libre hasta las 00:00: 15 Puntos». Pones los cupos y la gente la canjea con lo que caminó.</p></div>
        <div class="card"><div class="ic"><i style="--u:url(a/ic/message-circle.svg)"></i></div><h3>Que te escriban directo</h3><p>Pones el precio y un toque los lleva a tu WhatsApp con el mensaje listo, o a tu link de venta.</p></div>
        <div class="card"><div class="ic"><i style="--u:url(a/ic/trophy.svg)"></i></div><h3>Un desafío con premio</h3><p>«Camina 40.000 pasos esta semana y entra al sorteo de un VIP para 4».</p></div>
        <div class="card"><div class="ic"><i style="--u:url(a/ic/smartphone.svg)"></i></div><h3>Banner del viernes</h3><p>Tu fiesta en la pantalla de Inicio. Al tocar, va a tu Instagram o WhatsApp.</p></div>
      </div>
      <div class="banner" style="margin-top:14px;font-size:14px">Tu primer evento o desafío en Camina es gratis.</div>
      <p class="note" style="margin-top:8px">Si tu evento es para mayores de 18, lo aclaras en la descripción. Camina revisa cada publicación antes de mostrarla.</p>
    </div>
    <div style="display:flex;gap:5mm;flex-shrink:0">''' + P('br-evento.jpg', 52) + P('br-home.jpg', 52, 'transform:translateY(10mm)') + '''</div>
  </div>
</section>

<!-- 6. BANNER + RUTA + EQUIPO -->'''
rep('<!-- 6. BANNER + RUTA + EQUIPO -->', disco)

# Renumerar las páginas que siguen
rep('<span>05 · Más espacios para tu marca</span>', '<span>06 · Más espacios para tu marca</span>')
rep('<span>06 · Precios</span>', '<span>07 · Precios</span>')
rep('<span>07 · Empecemos</span>', '<span>08 · Empecemos</span>')

# Precios: campaña de lanzamiento gratis arriba
rep('''    <div class="kicker">Precios de lanzamiento</div>
    <h2>Simple y <span class="m">sin sorpresas.</span></h2>
''', '''    <div class="kicker">Precios de lanzamiento</div>
    <h2>Simple y <span class="m">sin sorpresas.</span></h2>
    <div style="margin-top:14px;border-radius:18px;padding:14px 18px;background:#E0B43A;color:#1a0f3a;display:flex;align-items:center;gap:16px">
      <div style="font-family:Montserrat;font-weight:900;font-size:26px;white-space:nowrap">GRATIS</div>
      <div><div style="font-weight:800;font-size:16px">Campaña de lanzamiento: tu primer evento o desafío no tiene costo.</div><div style="font-size:13px;margin-top:2px">Lo armamos contigo, lo publicamos y ves en vivo cuántos se suman. Después sigues con los precios de abajo.</div></div>
    </div>
''')

# Cierre
rep('<p class="lead">Cuéntanos qué quieres lograr y te armamos la propuesta: un desafío, un evento o una campaña completa.</p>',
    '<p class="lead">Cuéntanos qué quieres lograr y te armamos la propuesta. <b style="color:#E0B43A">Tu primer evento o desafío es gratis.</b></p>')

open('marcas.html', 'w').write(s)
print('ok')
