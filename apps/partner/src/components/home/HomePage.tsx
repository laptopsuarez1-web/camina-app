import Image from 'next/image';
import Link from 'next/link';
import localFont from 'next/font/local';
import './home.css';
import Nav from './Nav';
import HomeMotion from './HomeMotion';
import Steps from './Steps';
import Comunidad from './Comunidad';
import RouteMap from './RouteMap';
import Video from './Video';
import { Phone, Title, Foot, Icon, CtaAvisame, Coin, Pts } from './ui';
import { CAP, CONTACTO, DUDAS, LOCALES, RUTA_PREMIOS, RUTAS, TIENDAS, VID_RUTA, VID_TARJETA } from './data';

// Una sola familia: Mona Sans (variable en peso y ancho). Titulares anchos, texto en ancho normal.
const mona = localFont({
  src: '../../fonts/MonaSans-Variable.woff2',
  weight: '200 900',
  variable: '--hm-sans',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 125%' }],
});

// Marca .hm-js en <html> antes de pintar (solo si se permite movimiento), para que lo que se revela no parpadee.
// Si el director de movimiento no arranca en 4 s, se quita y todo queda visible.
const BOOT =
  "(function(){var r=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){r.classList.add('hm-js');setTimeout(function(){if(!r.dataset.hmReady)r.classList.remove('hm-js')},4000)}})()";

const FRIP = LOCALES.find((l) => l.id === 'fripaps')!;
const PANCHITO = FRIP.premios.find((p) => p.nombre === 'Panchito')!;

export default function HomePage() {
  return (
    <div className={`hm ${mona.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <a className="hm-skip" href="#contenido">
        Saltar al contenido
      </a>
      <Nav />
      <main id="contenido">
        <Hero />
        <ComoFunciona />
        <Actividad />
        <Premios />
        <ComunidadSec />
        <Ruta />
        <Eventos />
        <Origen />
        <Dudas />
        <Cierre />
      </main>
      <Footer />
      <HomeMotion />
    </div>
  );
}

function Tiendas() {
  return (
    <div className="hm-stores">
      {TIENDAS.map((s) =>
        s.url ? (
          <a key={s.nombre} className="hm-store" href={s.url} data-medir={`descargar_${s.nombre}`}>
            <small>Descárgala en</small>
            {s.nombre}
          </a>
        ) : (
          <span key={s.nombre} className="hm-store is-soon" aria-disabled="true">
            <small>Próximamente en</small>
            {s.nombre}
          </span>
        ),
      )}
    </div>
  );
}

// 1. Héroe: el mensaje y el producto. Nada más.
function Hero() {
  return (
    <section className="hm-hero" data-theme="light" aria-labelledby="hm-h1">
      <div className="hm-wrap hm-hero-grid">
        <div className="hm-hero-copy">
          <Title as="h1" id="hm-h1" text="Cada paso|cuenta." className="hm-h1" />
          <p className="hm-lead hm-hero-lead" data-reveal>
            Camina convierte los pasos de tu día en Puntos, y tus Puntos en premios y descuentos en comercios de tu ciudad. Gratis.
          </p>
          <div className="hm-cta" data-reveal>
            <CtaAvisame medir="inicio_avisame" />
            <a className="hm-btn hm-btn-ghost" href="#como-funciona" data-medir="inicio_como_funciona">
              Cómo funciona
            </a>
          </div>
          <div data-reveal>
            <Tiendas />
          </div>
        </div>
        <div className="hm-hero-visual" aria-hidden="true">
          <div className="hm-hero-back" data-parallax="0.05">
            <Phone src={CAP.puntos} sizes="(max-width: 1000px) 44vw, 270px" />
          </div>
          <div className="hm-hero-front" data-parallax="-0.03">
            <Phone src={CAP.inicio} preload sizes="(max-width: 1000px) 60vw, 330px" />
          </div>
        </div>
      </div>
    </section>
  );
}

// 2. Cómo funciona.
function ComoFunciona() {
  return (
    <section className="hm-sec" id="como-funciona" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head">
          <Title text="Así de simple." />
          <p className="hm-lead">Cuatro momentos, todos dentro de la app. Lo único que pones tú son los pasos.</p>
        </header>
        <Steps />
      </div>
    </section>
  );
}

// 3. Tu actividad: la regla de los Puntos, con números que cuentan.
function Actividad() {
  return (
    <section className="hm-sec hm-dark" id="actividad" data-theme="dark">
      <div className="hm-wrap hm-act">
        <div className="hm-act-copy">
          <Title text="Tus pasos|valen." />
          <p className="hm-lead">
            Camina lee tus pasos desde Salud o Health Connect y te los muestra en Actividad: tu semana, tu mes y tu racha. Cada día que abres la app,
            tus pasos suman Puntos.
          </p>
          <dl className="hm-rules" data-reveal>
            <div>
              <dt>
                <span data-count="1000">1.000</span> pasos
              </dt>
              <dd>
                <Coin size={22} /> 1 Punto
              </dd>
            </div>
            <div>
              <dt>
                <span data-count="20">20</span> Puntos
              </dt>
              <dd>como máximo por día</dd>
            </div>
            <div>
              <dt>
                <span data-count="90">90</span> días
              </dt>
              <dd>dura cada Punto</dd>
            </div>
          </dl>
          <p className="hm-note">Los pasos escritos a mano no cuentan. Los de los días en que no abres la app se ven en Actividad, pero no suman.</p>
        </div>
        <div className="hm-act-visual" aria-hidden="true">
          <div className="hm-act-a" data-parallax="0.04">
            <Phone src={CAP.actividad} sizes="(max-width: 1000px) 56vw, 320px" />
          </div>
          <div className="hm-act-b" data-parallax="-0.04">
            <Phone src={CAP.rachas} sizes="(max-width: 1000px) 46vw, 270px" />
          </div>
        </div>
      </div>
    </section>
  );
}

// 4. Premios y comercios: Fripap's como ejemplo real, todos los locales y cómo se canjea.
function Premios() {
  const canje = [
    ['Elige el premio', 'En Canjes o en el mapa, según lo que te alcanza.'],
    ['Ve al local', 'La app te muestra cómo llegar caminando.'],
    ['Escribe su código', 'El código del local, estando ahí.'],
    ['Listo', 'Se confirma al instante y se descuentan tus Puntos.'],
  ];
  return (
    <section className="hm-sec" id="premios" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <Title text="Premios reales,|en tu ciudad." />
          <p className="hm-lead">Cada comercio elige qué ofrece y cuántos Puntos cuesta. Así se ve uno de verdad.</p>
        </header>

        <article className="hm-spot" data-reveal>
          <div className="hm-spot-media">
            <Image className="hm-spot-cover" src="/web/locales/fripaps-letrero.jpg" alt="Letrero de Fripap's en Tarija, como aparece en la app" width={1040} height={388} sizes="(max-width: 1000px) 94vw, 640px" />
            <div className="hm-spot-card">
              <Image src="/web/locales/fripaps-panchito.jpg" alt="" width={235} height={232} className="hm-spot-img" />
              <div>
                <span className="hm-spot-local">
                  <Image src={FRIP.logo} alt="" width={24} height={24} />
                  {FRIP.nombre}
                </span>
                <b>
                  {PANCHITO.nombre} {PANCHITO.detalle?.toLowerCase()}
                </b>
                <Pts n={PANCHITO.puntos} />
              </div>
            </div>
          </div>
          <div className="hm-spot-phones">
            <Phone src={CAP.fichaLocal} alt="Ficha de Fripap's en Camina" sizes="(max-width: 760px) 44vw, 250px" />
            <Phone src={CAP.premiosFripaps} alt="Premios disponibles en Fripap's: Panchito gratis por 38 Puntos" sizes="(max-width: 760px) 44vw, 250px" />
          </div>
        </article>

        <div className="hm-locs-head">
          <h3>Ya están en Camina</h3>
          <p>{LOCALES.length} comercios de Tarija, y vienen más.</p>
        </div>
        <ul className="hm-locs">
          {LOCALES.map((l) => (
            <li key={l.id} className="hm-loc" data-reveal>
              <Image className="hm-loc-logo" src={l.logo} alt="" width={64} height={64} />
              <div className="hm-loc-txt">
                <b>{l.nombre}</b>
                <small>{l.categoria}</small>
              </div>
              {l.premios.length ? (
                <div className="hm-loc-prem">
                  <span>{l.premios[0].nombre}</span>
                  <Pts n={l.premios[0].puntos} label={false} />
                  {l.premios.length > 1 ? <small>+{l.premios.length - 1} más</small> : null}
                </div>
              ) : (
                <div className="hm-loc-prem is-soon">Premios muy pronto</div>
              )}
            </li>
          ))}
        </ul>

        <div className="hm-canje">
          <div className="hm-canje-copy">
            <h3>Así se canjea</h3>
            <ol>
              {canje.map(([t, d], i) => (
                <li key={t} data-reveal>
                  <span>{i + 1}</span>
                  <div>
                    <b>{t}</b>
                    {d}
                  </div>
                </li>
              ))}
            </ol>
            <p className="hm-note">Puedes volver a canjear en el mismo local cada 14 días. Los premios vigentes están siempre en la app.</p>
          </div>
          <div className="hm-canje-phone" data-reveal>
            <Phone src={CAP.canjes} alt="Pantalla Canjes de Camina con los comercios y sus premios" sizes="(max-width: 760px) 66vw, 300px" />
          </div>
        </div>

        <div className="hm-loyal">
          <div className="hm-loyal-phone" data-reveal>
            <Phone className="hm-phone-video">
              <Video src={VID_TARJETA.src} poster={VID_TARJETA.poster} label="Video de la app: la Tarjeta de fidelidad llenando sus sellos" />
            </Phone>
          </div>
          <div className="hm-loyal-copy">
            <h3>Tarjeta de fidelidad: 5 canjes, un premio gratis.</h3>
            <p>
              Cada canje confirmado, en cualquier comercio, suma un sello. Con 5 sellos eliges un premio gratis entre los comercios que participan, y
              tienes 30 días para canjearlo en el local.
            </p>
            <p className="hm-note">Grabación de la app real.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// 5. Comunidad.
function ComunidadSec() {
  return (
    <section className="hm-sec hm-soft" id="comunidad" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <Title text="Caminar rinde más|con otros." />
          <p className="hm-lead">Rankings, grupos, rachas e insignias: razones para salir a caminar también mañana.</p>
        </header>
        <Comunidad />
        <p className="hm-note">Pantallas de la app con personas de ejemplo.</p>
      </div>
    </section>
  );
}

// 6. Ruta del mes: el mapa real de la app y la grabación.
function Ruta() {
  const pasos = [
    ['Toca Participar', 'Te tocan 3 locales sorpresa y la app dibuja el camino a pie entre ellos.'],
    ['Visítalos', 'En el orden que quieras. Compras lo que quieras: en la Ruta no se usan Puntos ni descuentos.'],
    ['Marca tu visita', 'Al pagar, escribes el código del local y el local confirma que estuviste ahí.'],
  ] as const;
  return (
    <section className="hm-sec hm-dark" id="ruta" data-theme="dark">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <Title text="La Ruta|del mes." />
          <p className="hm-lead">Cada mes, 3 locales sorpresa de tu ciudad y el camino a pie para visitarlos. Una excusa perfecta para salir a caminar.</p>
        </header>
        <div className="hm-ruta">
          <div className="hm-ruta-main" data-reveal>
            <RouteMap />
            <ol className="hm-ruta-pasos">
              {pasos.map(([t, d], i) => (
                <li key={t}>
                  <span>{i + 1}</span>
                  <div>
                    <b>{t}</b>
                    {d}
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="hm-ruta-phone" data-reveal>
            <Phone className="hm-phone-video">
              <Video src={VID_RUTA.src} poster={VID_RUTA.poster} label="Video de la app: la Ruta de noviembre con sus 3 locales, el camino a pie y la ficha de Fripap's" />
            </Phone>
            <p className="hm-note">Grabación de la app real.</p>
          </div>
        </div>
        <div className="hm-ruta-gana">
          <h3>Completas los 3 locales y ganas:</h3>
          <ul>
            {RUTA_PREMIOS.map(([s, t, d]) => (
              <li key={t} data-reveal>
                <span className="hm-ruta-ico" aria-hidden="true">
                  {s === 'x2' ? <span className="hm-x2">×2</span> : <Icon name={s} />}
                </span>
                <div>
                  <b>{t}</b>
                  {d}
                </div>
              </li>
            ))}
          </ul>
          <p className="hm-note">Sorteo del mes: premio por anunciar.</p>
        </div>
      </div>
    </section>
  );
}

// 7. Eventos y desafíos.
function Eventos() {
  return (
    <section className="hm-sec" id="eventos" data-theme="light">
      <div className="hm-wrap hm-evt">
        <div className="hm-evt-copy">
          <Title text="Más que|caminar." />
          <p className="hm-lead">
            En la pestaña Eventos aparecen caminatas, desafíos y sorteos con marcas y comercios de tu ciudad. Te sumas desde la app y ganas premios o
            Puntos extra.
          </p>
          <ul className="hm-evt-list">
            <li>
              <b>Eventos</b> Experiencias y caminatas con marcas locales.
            </li>
            <li>
              <b>Desafíos</b> Metas de pasos con premio para quienes las cumplen.
            </li>
            <li>
              <b>Retos Camina</b> Metas extra que suman Puntos, como invitar amigos.
            </li>
          </ul>
          <p className="hm-note">Las pantallas muestran eventos de ejemplo. Los activos se ven siempre en la app.</p>
        </div>
        <div className="hm-evt-phones" aria-hidden="true">
          <div data-parallax="0.04">
            <Phone src={CAP.eventos} sizes="(max-width: 760px) 44vw, 270px" />
          </div>
          <div data-parallax="-0.04">
            <Phone src={CAP.desafios} sizes="(max-width: 760px) 44vw, 270px" />
          </div>
        </div>
      </div>
    </section>
  );
}

// 8. Origen: por qué Tarija.
function Origen() {
  return (
    <section className="hm-sec hm-soft" id="origen" data-theme="light">
      <div className="hm-wrap">
        <div className="hm-origen">
          <figure className="hm-origen-img" data-reveal>
            <Image src="/web/tarija.jpg" alt="Letras de Tarija junto al río Guadalquivir" width={700} height={467} sizes="(max-width: 760px) 94vw, 560px" />
          </figure>
          <div className="hm-origen-copy">
            <Title text="Hecha en Tarija,|para caminarla." />
            <p className="hm-lead">
              Camina nace en Tarija con una idea simple: que moverte por tu ciudad tenga premio, y que ese premio esté en los comercios de tu zona.
            </p>
            <p className="hm-origen-p">
              Cada canje lleva a alguien a un local de acá. Tú caminas más, el comercio gana clientes y la ciudad se mueve. Empezamos en Tarija; después
              vienen Santa Cruz, La Paz y Cochabamba.
            </p>
          </div>
        </div>
        <div className="hm-biz" data-reveal>
          <div>
            <h3>¿Tienes un comercio?</h3>
            <p>Suma tu local a Camina y recibe personas que ya caminan por tu zona.</p>
          </div>
          <div className="hm-cta">
            <Link className="hm-btn" href={RUTAS.comercios} data-medir="inicio_ver_comercios">
              Ver cómo sumarme
            </Link>
            <Link className="hm-btn hm-btn-ghost" href={RUTAS.registro} data-medir="registro_comercio_inicio">
              Registrar mi comercio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dudas() {
  return (
    <section className="hm-sec" id="dudas" data-theme="light">
      <div className="hm-wrap hm-faq">
        <div>
          <Title text="Preguntas|frecuentes." />
          <p className="hm-faq-contact">
            ¿Otra duda? Escríbenos por <a href={CONTACTO.whatsapp}>WhatsApp</a> o a <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>.
          </p>
        </div>
        <div className="hm-faq-list">
          {DUDAS.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <i aria-hidden="true" />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// 9. Cierre.
function Cierre() {
  return (
    <section className="hm-sec hm-dark hm-final" id="descargar" data-theme="dark">
      <div className="hm-final-trail" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <Foot key={i} side={i % 2 ? 'R' : 'L'} style={{ ['--i' as string]: i }} />
        ))}
      </div>
      <div className="hm-wrap hm-final-in">
        <Image className="hm-final-icon" src="/marca/logo-solo-transparente.png" alt="" width={88} height={88} />
        <Title text="Tu próximo paso|ya puede sumar." className="hm-final-title" />
        <p className="hm-lead">Camina es gratis para iPhone y Android. Déjanos tu correo y te avisamos apenas esté en tu tienda.</p>
        <div className="hm-cta hm-cta-center">
          <CtaAvisame medir="descargar_avisame" />
        </div>
        <p className="hm-final-mail">
          Se abre tu correo con el mensaje listo. Si no se abre, escríbenos a <b>{CONTACTO.email}</b>.
        </p>
        <Tiendas />
      </div>
    </section>
  );
}

function Footer() {
  const cols: [string, [string, string][]][] = [
    ['Camina', [['Cómo funciona', '#como-funciona'], ['Premios', '#premios'], ['Comunidad', '#comunidad'], ['Ruta del mes', '#ruta'], ['Preguntas', '#dudas']]],
    ['Comercios', [['Para comercios', RUTAS.comercios], ['Registrar mi comercio', RUTAS.registro], ['Ingresar al panel', RUTAS.login], ['Guía para comercios', RUTAS.guia]]],
    ['Legal', [['Términos', RUTAS.terminos], ['Privacidad', RUTAS.privacidad], ['Eliminar mi cuenta', RUTAS.eliminar]]],
  ];
  return (
    <footer className="hm-footer" data-theme="dark">
      <div className="hm-wrap">
        <div className="hm-footer-top">
          <div className="hm-footer-brand">
            <span className="hm-brand">
              <Image src="/marca/logo-solo-transparente.png" alt="" width={32} height={32} />
              <span>CAMINA</span>
            </span>
            <p>Caminas, sumas Puntos y canjeas premios en comercios de tu ciudad.</p>
          </div>
          {cols.map(([t, links]) => (
            <nav key={t} aria-label={t}>
              <h2>{t}</h2>
              <ul>
                {links.map(([l, h]) => (
                  <li key={h}>{h.startsWith('#') ? <a href={h}>{l}</a> : <Link href={h}>{l}</Link>}</li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2>Contacto</h2>
            <ul>
              <li>
                <a href={CONTACTO.whatsapp}>WhatsApp {CONTACTO.whatsappTexto}</a>
              </li>
              <li>
                <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>
              </li>
              <li>
                <a href={CONTACTO.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram {CONTACTO.instagramTexto}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="hm-footer-bottom">
          <span>© {new Date().getFullYear()} Camina. Hecha en Tarija, Bolivia.</span>
          <span>Pronto en App Store y Google Play</span>
        </div>
      </div>
    </footer>
  );
}
