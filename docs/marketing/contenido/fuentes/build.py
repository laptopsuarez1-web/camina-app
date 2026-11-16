# Carruseles de Instagram de Camina (1080x1350, modo oscuro). Genera un HTML por carrusel; render.js saca PNG y PDF.
import sys, json
CSS = '''
@page { size: 1080px 1350px; margin: 0 }
* { box-sizing: border-box } html, body { margin: 0; background: #0d0718 }
body { font-family: 'Plus Jakarta Sans', sans-serif; color: #F0EBFA }
.s { display: flex; flex-direction: column; width: 1080px; height: 1350px; position: relative; overflow: hidden; break-after: page; padding: 70px 72px 0;
  background: linear-gradient(160deg, #2c1a63 0%, #1b1140 42%, #120a26 100%) }
.s.alt { background: linear-gradient(200deg, #173a33 0%, #1a1238 48%, #120a26 100%) }
.top { display: flex; justify-content: space-between; align-items: center; height: 56px }
.brand { display: flex; align-items: center; gap: 14px; font-family: Montserrat; font-weight: 900; font-size: 30px; letter-spacing: 3px; color: #62F0B6 }
.brand img { height: 56px }
.n { font-weight: 800; font-size: 24px; color: #9d90c6; letter-spacing: 2px }
.k { margin-top: 70px; font-weight: 800; font-size: 25px; letter-spacing: 4px; text-transform: uppercase; color: #62F0B6 }
h1 { font-family: Montserrat; font-weight: 900; font-size: 92px; line-height: 1.02; letter-spacing: -2px; margin: 22px 0 0 }
.k + h1 { margin-top: 18px }
.top + h1 { margin-top: 64px }
h1 b { color: #62F0B6; font-weight: 900 }
p.sub { font-size: 39px; line-height: 1.32; color: #D6CCF0; margin: 26px 0 0; font-weight: 500 }
p.sub b { color: #fff; font-weight: 800 }
.stage { flex: 1; min-height: 0; margin-top: 50px; display: flex; justify-content: center; align-items: stretch; gap: 36px }
.phone { width: 580px; flex-shrink: 0; border: 7px solid #4a3a78; border-bottom: 0; border-radius: 54px 54px 0 0; overflow: hidden; background: #16101F }
.phone img { display: block; width: 100% }
.stage.two .phone { width: 450px }
.stage.cover { justify-content: space-between }
.stage.cover .phone { width: 560px }
.side { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 30px; padding-bottom: 70px }
.side img { width: 300px }
.swipe { background: #62F0B6; color: #1a0f3a; font-weight: 800; font-size: 32px; padding: 16px 32px; border-radius: 99px }
.baifo { position: absolute; right: 40px; bottom: 30px; width: 250px }
.stage.fit { align-items: flex-start } .stage.cover.fit .side { align-self: stretch }
.stage.fit .phone { border-bottom: 7px solid #4a3a78; border-radius: 44px }
.note { margin-top: auto; margin-bottom: 76px; border-left: 8px solid #62F0B6; padding: 6px 0 6px 26px; font-size: 36px; line-height: 1.3; font-weight: 700; color: #fff }
.stage + .note { margin-top: 0 }
.cards { margin-top: 44px; display: flex; flex-direction: column; gap: 22px }
.card { background: #2a1f52; border: 2px solid #43357a; border-radius: 28px; padding: 34px 36px; display: flex; justify-content: space-between; align-items: center; gap: 20px }
.card .t, .card .e { white-space: nowrap }
.card .t { font-family: Montserrat; font-weight: 900; font-size: 44px; color: #fff }
.card .e { font-size: 31px; color: #1a0f3a; background: #62F0B6; font-weight: 800; border-radius: 16px; padding: 10px 18px; text-align: right }
.card.g { border-color: #E0B43A } .card.g .t { color: #E0B43A } .card.g .e { background: #E0B43A }
.code { margin-top: 56px; background: #2a1f52; border: 2px solid #43357a; border-radius: 36px; padding: 44px; text-align: center }
.code .l { font-size: 28px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: #B9AED9 }
.code .d { font-family: Montserrat; font-weight: 900; font-size: 220px; letter-spacing: 28px; color: #fff; line-height: 1.1; margin-left: 28px }
.ok { margin: 30px auto 0; display: table; background: #62F0B6; color: #1a0f3a; font-weight: 800; font-size: 36px; padding: 18px 36px; border-radius: 99px }
.rows { margin-top: 50px; display: flex; flex-direction: column; gap: 20px }
.row { display: flex; justify-content: space-between; align-items: center; background: #2a1f52; border: 2px solid #43357a; border-radius: 28px; padding: 42px 38px; font-size: 44px; font-weight: 700 }
.row b { font-family: Montserrat; font-weight: 900; color: #62F0B6; font-size: 52px }
.row small { display: block; font-size: 28px; margin-top: 6px; color: #B9AED9; font-weight: 600 }
ul.ck { list-style: none; padding: 0; margin: 44px 0 0; display: flex; flex-direction: column; gap: 28px; font-size: 46px; font-weight: 700; line-height: 1.25 }
ul.ck li { display: flex; gap: 20px; align-items: flex-start }
ul.ck li::before { content: '✓'; color: #1a0f3a; background: #62F0B6; border-radius: 99px; width: 52px; height: 52px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 30px; margin-top: 2px }
.cta { margin-top: 50px; align-self: flex-start; background: #62F0B6; color: #1a0f3a; font-family: Montserrat; font-weight: 900; font-size: 44px; padding: 26px 40px; border-radius: 99px }
.fine { position: absolute; left: 72px; bottom: 70px; font-size: 30px; color: #B9AED9; font-weight: 600; line-height: 1.4; max-width: 640px }

.ex.sv { margin-top: 28px; background: transparent; border-style: dashed } .ex.sv .t { font-family: 'Plus Jakarta Sans'; font-weight: 800; font-size: 52px; color: #62F0B6 }
.ex { margin-top: 60px; background: #2a1f52; border: 2px solid #43357a; border-radius: 36px; padding: 52px 50px }
.ex .l { font-size: 26px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: #B9AED9 }
.ex .t { font-family: Montserrat; font-weight: 900; font-size: 74px; line-height: 1.1; color: #fff; margin-top: 14px }
.ex .p { display: inline-block; margin-top: 22px; background: #62F0B6; color: #1a0f3a; font-weight: 800; font-size: 44px; padding: 16px 32px; border-radius: 99px }
.ex.g { border-color: #E0B43A } .ex.g .p { background: #E0B43A }
.num { position: absolute; right: 72px; top: 170px; font-family: Montserrat; font-weight: 900; font-size: 260px; line-height: 1; color: rgba(98,240,182,.14) }
'''
def top(i, n): return f'<div class="top"><span class="brand"><img src="img/logo.png">CAMINA</span><span class="n">{i} / {n}</span></div>'
def slide(i, n, body, alt=False): return f'<section class="s{" alt" if alt else ""}">{top(i, n)}{body}</section>'
def phone(*imgs):
    return '<div class="stage' + (' two' if len(imgs) > 1 else '') + '">' + ''.join(f'<div class="phone"><img src="img/{i}"></div>' for i in imgs) + '</div>'
def cover(img, fit=False): return f'<div class="stage cover{" fit" if fit else ""}"><div class="phone"><img src="img/{img}"></div><div class="side"><img src="img/baifo.png"><span class="swipe">Desliza →</span></div></div>'

def comercios():
    S = [
      '<div class="k">Para comercios de Tarija</div><h1>Tu próximo cliente viene <b>caminando.</b></h1><p class="sub">Así funciona Camina para tu local.</p>' + cover('ficha.jpg'),
      '<h1>La gente camina y <b>junta Puntos.</b></h1><p class="sub">La app cuenta sus pasos sola.<br><b>1.000 pasos = 1 Punto.</b></p>' + phone('inicio.jpg'),
      '<h1>Tú eliges <b>el premio.</b></h1><p class="sub">Con tus cupos, tus días y tus horarios.</p><div class="cards">'
        '<div class="card"><span class="t">Gratis</span><span class="e">Gaseosa personal</span></div>'
        '<div class="card"><span class="t">Regalo con compra</span><span class="e">Con 2 salchipapas</span></div>'
        '<div class="card"><span class="t">Descuento</span><span class="e">20% en tu corte</span></div>'
        '<div class="card"><span class="t">2x1</span><span class="e">En hamburguesas</span></div>'
        '<div class="card g"><span class="t">Combo Camina</span><span class="e">Bs 25 (antes Bs 32)</span></div></div><div class="note">Puedes activarlo solo en tus horas flojas.</div>',
      '<h1>Te encuentran y <b>llegan a tu puerta.</b></h1><p class="sub">Tu local sale en la app con su foto, su horario y su premio.</p>' + phone('canjes.jpg'),
      '<h1>El canje toma <b>10 segundos.</b></h1><p class="sub">Les dices el código de tu local y lo escriben en la app. Sin máquinas ni papeles.</p><div class="code"><div class="l">Código de tu local</div><div class="d">4821</div><div class="ok">✓ Canje confirmado</div></div><div class="note">Solo se puede canjear estando en tu local.</div>',
      '<h1>Y después te hacen <b>la publicidad.</b></h1><p class="sub">La app les pide calificarte en <b>Google Maps</b> y subir una <b>historia</b> con tu premio.</p>' + phone('calificar.jpg', 'historia.jpg').replace('stage two', 'stage two fit') + '<div class="note">Reseñas e historias que tú no pagas.</div>',
      '<h1>Tu local en Camina en <b>5 minutos.</b></h1><ul class="ck"><li>Empiezas gratis</li><li>Sin comisión por canje</li><li>Primeros 20 comercios: 3 meses del plan Paso Firme sin costo</li></ul><span class="cta">caminaapp.com/registro</span><div class="fine">Guarda este post.<br>Camina sale el 1 de diciembre.</div><img class="baifo" src="img/baifo.png">',
    ]
    return S
def gente():
    S = [
      '<div class="k">Llega a Tarija · 1 de diciembre</div><h1>Tus pasos de hoy <b>valen un premio.</b></h1><p class="sub">Así funciona Camina.</p>' + cover('inicio.jpg'),
      '<h1>Camina <b>como siempre.</b></h1><p class="sub">La app cuenta tus pasos sola, con tu teléfono.</p>' + phone('actividad.jpg'),
      '<h1>1.000 pasos = <b>1 Punto.</b></h1><p class="sub">Solo caminando. Hasta 20 Puntos por día.</p><div class="rows">'
        '<div class="row"><span>5.000 pasos<small>una vuelta larga por el centro</small></span><b>5 Puntos</b></div>'
        '<div class="row"><span>10.000 pasos<small>un día bien caminado</small></span><b>10 Puntos</b></div>'
        '<div class="row"><span>20.000 pasos<small>el máximo del día</small></span><b>20 Puntos</b></div></div><div class="note">Los Puntos se juntan solos. Tú solo camina.</div>',
      '<h1>Cambia tus Puntos por <b>premios.</b></h1><p class="sub">En cafés, barberías, restaurantes y más locales de Tarija.</p>' + phone('canjes.jpg'),
      '<h1>Llegas, escribes el código <b>y listo.</b></h1><p class="sub">El local te da su código de 4 números. El canje se confirma al instante.</p>' + phone('premios.jpg'),
      '<h1>Con amigos <b>rinde más.</b></h1><p class="sub">Grupos con meta semanal, ranking y desafíos con Puntos.</p>' + phone('grupos.jpg', 'ranking.jpg'),
      '<h1>Tus pasos <b>ya valen.</b></h1><ul class="ck"><li>Gratis</li><li>Premios reales en locales de Tarija</li><li>Sale el 1 de diciembre</li></ul><span class="cta">Síguenos: @caminaapp</span><div class="fine">Guarda este post y mándaselo a quien camina contigo.</div><img class="baifo" src="img/baifo.png">',
    ]
    return S

def ex(label, title, pill, gold=False): return f'<div class="ex{" g" if gold else ""}"><div class="l">{label}</div><div class="t">{title}</div><div class="p">{pill}</div></div>'
def premios():
    def tipo(n, nombre, que, ej, pts, sirve, gold=False):
        return f'<div class="k">Tipo {n} de 5</div><h1><b>{nombre}</b></h1><p class="sub">{que}</p>' + ex('Ejemplo', ej, pts, gold) + f'<div class="ex sv"><div class="l">Sirve para</div><div class="t">{sirve[0].upper() + sirve[1:]}</div></div>'
    return [
      '<div class="k">Para comercios de Tarija</div><h1>5 formas de <b>traer gente</b> a tu local.</h1><p class="sub">Los premios que puedes poner en Camina.</p>' + cover('fichanueva.jpg'),
      tipo(1, 'Gratis', 'Se lo lleva sin pagar nada.', 'Gaseosa personal', '12 Puntos', 'que te conozca gente nueva.'),
      tipo(2, 'Regalo con compra', 'Se lo lleva de regalo si compra algo.', 'Papas pequeñas, llevando un combo', '10 Puntos', 'vender más en cada visita.'),
      tipo(3, 'Descuento', 'Paga menos por lo que tú elijas.', 'Plato del día con 15% de descuento', '20 Puntos', 'llenar tus horas flojas.'),
      tipo(4, '2x1', 'Lleva dos y paga uno.', 'Hamburguesa clásica 2x1', '40 Puntos', 'que vengan acompañados.'),
      tipo(5, 'Combo Camina', 'Un combo a precio especial.', 'Salchipapa + gaseosa a Bs 25 (antes Bs 32)', '50 Puntos', 'mover lo que más te conviene vender.', True),
      '<h1>Tú decides <b>todo.</b></h1><ul class="ck"><li>Cuántos cupos por día</li><li>Qué días y en qué horario</li><li>Si es solo para clientes nuevos</li></ul><span class="cta">caminaapp.com/registro</span><div class="fine">Guarda este post.<br>Camina sale el 1 de diciembre.</div><img class="baifo" src="img/baifo.png">',
    ]
def publicidad():
    return [
      '<div class="k">Para comercios de Tarija</div><h1>Publicidad que <b>no pagas.</b></h1><p class="sub">Lo que pasa después de cada canje.</p>' + cover('confirmado.jpg', True),
      '<h1>Primero, <b>el canje.</b></h1><p class="sub">Le dices tu código de 4 números y lo escribe en la app, estando en tu local.</p>' + phone('codigo.jpg').replace('class="stage"', 'class="stage fit"'),
      '<h1>Te califica en <b>Google Maps.</b></h1><p class="sub">La app se lo pide apenas canjea. Más reseñas, más gente que te encuentra.</p>' + phone('calificar.jpg').replace('class="stage"', 'class="stage fit"') + '<div class="note">Es opcional para la persona.</div>',
      '<h1>Te sube a <b>su historia.</b></h1><p class="sub">Saca una foto de lo que canjeó y te etiqueta en Instagram. Así sus amigos ven tu local.</p>' + phone('historia.jpg').replace('class="stage"', 'class="stage fit"') ,
      '<h1>Y <b>vuelve.</b></h1><p class="sub">Cada visita le suma nivel en tu local: <b>Visitante, Habitual y Fan.</b></p>' + phone('insignias2.jpg'),
      '<h1>Todo queda <b>medido.</b></h1><p class="sub">En tu panel ves cuántos llegaron, cuántos son nuevos y cuántos volvieron.</p>' + phone('panel.jpg') + '<div class="note">Pantalla con datos de ejemplo.</div>',
      '<h1>Tú solo pones <b>el premio.</b></h1><ul class="ck"><li>Sin comisión por canje</li><li>Empiezas gratis</li><li>Primeros 20 comercios: 3 meses del plan Paso Firme sin costo</li></ul><span class="cta">caminaapp.com/registro</span><div class="fine">Guarda este post.<br>Camina sale el 1 de diciembre.</div><img class="baifo" src="img/baifo.png">',
    ]
def amigos():
    return [
      '<div class="k">Llega a Tarija · 1 de diciembre</div><h1>Caminar con amigos <b>rinde más.</b></h1><p class="sub">Lo que puedes hacer en Camina.</p>' + cover('grupos.jpg'),
      '<h1>Arma <b>tu grupo.</b></h1><p class="sub">Con tu familia, tus amigos o tu trabajo. Meta de pasos para la semana y chat.</p>' + phone('grupos.jpg'),
      '<h1>Sube en <b>el ranking.</b></h1><p class="sub">Se reinicia cada lunes. Entre todos o solo entre amigos.</p>' + phone('ranking.jpg'),
      '<h1>Súmate a <b>los desafíos.</b></h1><p class="sub">Metas de pasos con premio de tus marcas favoritas.</p>' + phone('desafios.jpg'),
      '<h1>Cuida <b>tu racha.</b></h1><p class="sub">Cumple tu meta 7 días seguidos y ganas <b>5 Puntos</b> extra.</p>' + phone('racha.jpg'),
      '<h1>Junta <b>insignias.</b></h1><p class="sub">De tus locales favoritos. Se ven en tu perfil.</p>' + phone('perfil.jpg'),
      '<h1>¿Con quién <b>caminas?</b></h1><ul class="ck"><li>Etiqueta a tu grupo</li><li>Gratis</li><li>Sale el 1 de diciembre</li></ul><span class="cta">Síguenos: @caminaapp</span><div class="fine">Guarda este post y mándaselo a quien camina contigo.</div><img class="baifo" src="img/baifo.png">',
    ]
def primer():
    def paso(n, t, sub, img): return f'<div class="k">Paso {n} de 4</div><h1>{t}</h1><p class="sub">{sub}</p>' + phone(img)
    return [
      '<div class="k">Llega a Tarija · 1 de diciembre</div><h1>Tu primer premio <b>en 4 pasos.</b></h1><p class="sub">Así se canjea en Camina.</p>' + cover('confirmado.jpg', True),
      paso(1, 'Camina y <b>junta Puntos.</b>', '1.000 pasos = 1 Punto. La app los cuenta sola.', 'inicionuevo.jpg'),
      paso(2, 'Elige <b>tu premio.</b>', 'En Canjes están los locales y lo que cuesta cada premio.', 'canjesnuevo.jpg'),
      paso(3, 'Ve <b>al local.</b>', 'Tienes que estar ahí para canjear. Toca «Canjear».', 'fichanueva.jpg'),
      paso(4, 'Escribe <b>el código.</b>', 'El local te dice sus 4 números. Los escribes y listo.', 'codigo.jpg').replace('class="stage"', 'class="stage fit"'),
      '<h1>¡Canje <b>confirmado!</b></h1><p class="sub">Recién ahí se descuentan tus Puntos. Disfruta tu premio.</p>' + phone('confirmado.jpg').replace('class="stage"', 'class="stage fit"'),
      '<h1>Tus pasos <b>ya valen.</b></h1><ul class="ck"><li>Gratis</li><li>Premios reales en locales de Tarija</li><li>Sale el 1 de diciembre</li></ul><span class="cta">Síguenos: @caminaapp</span><div class="fine">Guarda este post para cuando salga.</div><img class="baifo" src="img/baifo.png">',
    ]
for name, fn in [('comercios', comercios), ('gente', gente), ('premios', premios), ('publicidad', publicidad), ('amigos', amigos), ('primer', primer)]:
    S = fn(); n = len(S)
    html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet"><style>' + CSS + '</style></head><body>' + ''.join(slide(i + 1, n, b, alt=(i % 2 == 1)) for i, b in enumerate(S)) + '</body></html>'
    open(name + '.html', 'w').write(html)
print('ok')
