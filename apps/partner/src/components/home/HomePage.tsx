import Image from 'next/image';
import Link from 'next/link';
import localFont from 'next/font/local';
import './home.css';
import Nav from './Nav';
import HeroScene from './HeroScene';
import HomeMotion from './HomeMotion';
import Comunidad from './Comunidad';
import Compare from './Compare';
import Video from './Video';
import { Phone, Title, Foot, Icon, CtaAvisame } from './ui';
import { CAP, CONTACTO, DUDAS, ETAPAS, LOCALES, RUTA_PREMIOS, SALIDA, TIENDAS, TOUR, VID_RUTA } from './data';

// Una sola familia: Mona Sans (variable en peso y ancho). Titulares anchos, texto en ancho normal.
const mona = localFont({
  src: '../../fonts/MonaSans-Variable.woff2',
  weight: '200 900',
  variable: '--hm-sans',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 125%' }],
});

// Marca .hm-js en <html> antes de pintar (solo si se permite movimiento) para que los titulares que se revelan no
// parpadeen. Si el director de movimiento no arranca en 4 s, se quita y todo queda visible.
const BOOT =
  "(function(){var r=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){r.classList.add('hm-js');setTimeout(function(){if(!r.dataset.hmReady)r.classList.remove('hm-js')},4000)}})()";

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
        <Premios />
        <Experiencia />
        <ComunidadSec />
        <Ruta />
        <Origen />
        <Dudas />
        <Descarga />
      </main>
      <Footer />
      <div className="hm-dock" data-dock aria-hidden="true" inert>
        <span>Muy pronto en App Store y Google Play.</span>
        <CtaAvisame medir="dock_avisame" className="hm-btn-sm" label="Avísame" />
      </div>
      <HomeMotion />
    </div>
  );
}

function Hero() {
  return (
    <section className="hm-hero hm-plum" data-theme="plum" aria-labelledby="hm-h1">
      <div className="hm-wrap hm-hero-grid">
        <div className="hm-hero-copy">
          <Title as="h1" id="hm-h1" text="Tus pasos|valen." className="hm-h1" />
          <p className="hm-lead hm-rise">
            Camina convierte tus pasos en Puntos que canjeas por premios y descuentos en comercios de tu ciudad.
          </p>
          <div className="hm-cta hm-rise">
            <CtaAvisame medir="inicio_avisame" />
            <a className="hm-btn hm-btn-ghost" href="#como-funciona">
              Cómo funciona
            </a>
          </div>
          <p className="hm-meta hm-rise">Gratis para iPhone y Android. Hecha en Tarija, Bolivia.</p>
        </div>
        <div className="hm-hero-stage">
          <HeroScene>
            <Phone src={CAP.inicio} alt="Inicio de Camina: el aro con los pasos de hoy, los Puntos y los locales cercanos" preload sizes="(max-width: 1000px) 34vw, 220px" />
          </HeroScene>
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  return (
    <section className="hm-sec hm-light hm-curtain" id="como-funciona" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head">
          <Title text="Caminar ya|tiene premio." />
          <p className="hm-lead">Cuatro momentos, todos dentro de la app. No hace falta nada más que tus pasos.</p>
        </header>
        <div className="hm-steps" data-steps data-active="01">
          <div className="hm-steps-sticky" aria-hidden="true">
            <div className="hm-steps-device">
              <Phone>
                {ETAPAS.map((e) => (
                  <Image key={e.n} className="hm-steps-shot" data-shot={e.n} src={e.img} alt="" width={780} height={1688} sizes="320px" />
                ))}
              </Phone>
              <div className="hm-steps-counter">
                {ETAPAS.map((e) => (
                  <span key={e.n} data-shot={e.n}>
                    {e.n}
                  </span>
                ))}
                <small>de 04</small>
              </div>
            </div>
          </div>
          <ol className="hm-steps-list">
            <span className="hm-steps-line" aria-hidden="true">
              <i />
            </span>
            {ETAPAS.map((e, i) => (
              <li key={e.n} className={`hm-step${i === 0 ? ' is-active' : ''}`} data-step={e.n}>
                <span className="hm-step-n">{e.n}</span>
                <h3>{e.t}</h3>
                <p>{e.d}</p>
                <p className="hm-step-dato">{e.dato}</p>
                <div className="hm-step-phone">
                  <Phone src={e.img} alt={e.alt} sizes="62vw" />
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="hm-band">
          <p>
            <b>Gratis, sin datos de pago.</b> {SALIDA}.
          </p>
          <CtaAvisame medir="funciona_avisame" />
        </div>
      </div>
    </section>
  );
}

function Premios() {
  return (
    <section className="hm-sec hm-dark hm-curtain" id="premios" data-theme="dark">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <Title text="Premios reales|en tu ciudad." />
          <p className="hm-lead">Descuentos y premios gratis en comercios de Tarija. Cada local elige qué ofrece y cuántos Puntos cuesta.</p>
        </header>

        <div className="hm-prem">
          <ul className="hm-locs">
            {LOCALES.map((l) => (
              <li className="hm-loc" key={l.id}>
                <div className="hm-loc-head">
                  <Image className="hm-loc-logo" src={l.logo} alt="" width={56} height={56} />
                  <h3>{l.nombre}</h3>
                  <span className="hm-loc-cat">{l.categoria}</span>
                  <Image className="hm-loc-cover" src={l.portada} alt="" width={320} height={200} sizes="200px" />
                </div>
                {l.premios.length > 0 ? (
                  <ul className="hm-loc-prem">
                    {l.premios.map((p) => (
                      <li key={p.nombre}>
                        <span>
                          {p.nombre}
                          <small>{p.detalle}</small>
                        </span>
                        <b>
                          {p.puntos} <small>Puntos</small>
                        </b>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hm-loc-dir">{l.direccion}</p>
                )}
              </li>
            ))}
          </ul>
          <div className="hm-prem-visual">
            <div className="hm-prem-sticky">
              <div className="hm-prem-back" data-parallax="0.05">
                <Phone src={CAP.mapa} alt="Mapa de comercios en Camina" sizes="(max-width: 760px) 50vw, 260px" />
              </div>
              <div className="hm-prem-front">
                <Phone src={CAP.canjes} alt="Pantalla Canjear de Camina con los comercios y sus premios" sizes="(max-width: 760px) 56vw, 300px" />
              </div>
              <p className="hm-prem-cap">El mapa de premios: los comercios cerca de ti y lo que ofrece cada uno.</p>
            </div>
          </div>
        </div>

        <div className="hm-card5" data-stamps>
          <div>
            <h3>Tarjeta Camina: 5 canjes, un premio gratis.</h3>
            <p>
              Cada canje confirmado, en cualquier comercio, suma un sello. Con 5 eliges un premio gratis entre los comercios que participan. Tienes 30
              días para canjearlo.
            </p>
          </div>
          <ol className="hm-stamps" aria-label="Cinco sellos: el quinto es un premio gratis">
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n} style={{ ['--i' as string]: n }}>
                {n < 5 ? <Foot side={n % 2 ? 'L' : 'R'} /> : <span className="hm-gift">Gratis</span>}
              </li>
            ))}
          </ol>
        </div>
        <p className="hm-note">
          Comercios y premios cargados en Camina en octubre de 2026; los vigentes están siempre en la app. Puedes volver a canjear en el mismo local
          pasados 14 días. ¿Tienes un comercio?{' '}
          <Link href="/comercios" data-medir="premios_comercios">
            Ofrece tus premios en Camina
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function Experiencia() {
  return (
    <section className="hm-sec hm-light hm-curtain hm-tour" id="app" data-theme="light">
      <div className="hm-tour-in">
        <div className="hm-wrap">
          <header className="hm-head hm-head-split">
            <Title text="Todo tu movimiento|en una app." />
            <p className="hm-lead">Pantallas reales de Camina, desde la ficha de cada local hasta tu perfil.</p>
          </header>
        </div>
        <div className="hm-tour-track" tabIndex={0} aria-label="Pantallas de la app (desliza para ver más)">
          {TOUR.map((t) => (
            <figure className="hm-tour-item" key={t.t}>
              <Phone src={t.img} alt={`Pantalla de Camina: ${t.t}`} sizes="(max-width: 760px) 64vw, 300px" />
              <figcaption>
                <b>{t.t}</b>
                {t.d}
              </figcaption>
            </figure>
          ))}
          <figure className="hm-tour-item">
            <Compare dark={CAP.inicio} light={CAP.inicioClaro} />
            <figcaption>
              <b>Claro u oscuro</b>
              Arrastra el control para ver los dos modos.
            </figcaption>
          </figure>
        </div>
        <p className="hm-wrap hm-note hm-tour-note">Los datos de las personas en las pantallas son de ejemplo.</p>
      </div>
    </section>
  );
}

function ComunidadSec() {
  return (
    <section className="hm-sec hm-dark hm-curtain" id="comunidad" data-theme="dark">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <Title text="Caminar rinde más|con otros." />
          <p className="hm-lead">Rankings, rachas, desafíos, grupos, insignias y eventos, para que mañana también salgas a caminar.</p>
        </header>
        <Comunidad />
      </div>
    </section>
  );
}

// Paradas del recorrido (coordenadas del viewBox 600×420) y en qué parte del dibujo se encienden.
const PARADAS = [
  { x: 40, y: 360, at: 0, k: 'inicio' as const },
  { x: 170, y: 250, at: 0.26, k: 1 },
  { x: 330, y: 300, at: 0.49, k: 2 },
  { x: 450, y: 140, at: 0.79, k: 3 },
  { x: 560, y: 60, at: 0.97, k: 'fin' as const },
];

function Ruta() {
  const pasos = [
    'Tocas Participar y te tocan 3 locales sorpresa.',
    'Los visitas en el orden que quieras y compras lo que quieras.',
    'Al pagar, escribes el código del local y el local confirma tu visita.',
  ];
  return (
    <section className="hm-sec hm-light hm-curtain" id="ruta" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <Title text="La Ruta|del mes." />
          <p className="hm-lead">Una excusa para salir a caminar y conocer tu ciudad: 3 locales sorpresa, un mapa con tu recorrido y una recompensa al final.</p>
        </header>

        <div className="hm-ruta">
          <div className="hm-ruta-board">
            <div className="hm-ruta-map" aria-hidden="true">
              <Image className="hm-ruta-map-img" src="/web/mapa-tarija.jpg" alt="" width={900} height={730} sizes="(max-width: 1000px) 90vw, 700px" />
              <svg viewBox="0 0 600 420" preserveAspectRatio="none">
                <path className="hm-ruta-ghost" d="M40 360 H110 V250 H170 V300 H330 V140 H450 V60 H560" />
                <path className="hm-ruta-path" d="M40 360 H110 V250 H170 V300 H330 V140 H450 V60 H560" />
              </svg>
              {PARADAS.map((p) => (
                <span
                  key={String(p.k)}
                  className={`hm-stop hm-stop-${typeof p.k === 'number' ? 'local' : p.k}`}
                  data-at={p.at}
                  style={{ left: `${(p.x / 600) * 100}%`, top: `${(p.y / 420) * 100}%` }}
                >
                  {p.k === 'inicio' ? (
                    <Foot side="L" />
                  ) : p.k === 'fin' ? (
                    <Icon name="flag" />
                  ) : (
                    <>
                      <i>?</i>
                      <b>
                        <Icon name="check" />
                      </b>
                    </>
                  )}
                  <em>{p.k === 'inicio' ? 'Participar' : p.k === 'fin' ? 'Ruta completa' : `Local ${p.k}`}</em>
                </span>
              ))}
            </div>
            <ol className="hm-ruta-pasos">
              {pasos.map((t, i) => (
                <li key={t}>
                  <span>{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
          <div className="hm-ruta-phone">
            <Phone className="hm-phone-video">
              <Video src={VID_RUTA.src} poster={VID_RUTA.poster} label="Video de la app: al tocar Participar, los 3 locales caen en el mapa" />
            </Phone>
            <p className="hm-note">Video de la app real. Los locales y las fotos son de ejemplo.</p>
          </div>
        </div>

        <ul className="hm-ruta-premios">
          {RUTA_PREMIOS.map(([s, t, d]) => (
            <li key={t}>
              <span className="hm-ruta-ico" aria-hidden="true">
                {s === 'x2' ? <span className="hm-x2">×2</span> : <Icon name={s} />}
              </span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ul>
        <div className="hm-band">
          <p>
            <b>En la Ruta no se usan Puntos ni descuentos:</b> pagas tu compra como cualquier cliente.
          </p>
          <CtaAvisame medir="ruta_avisame" label="Quiero hacer la Ruta" />
        </div>
      </div>
    </section>
  );
}

function Origen() {
  return (
    <section className="hm-sec hm-dark hm-curtain hm-origen" id="origen" data-theme="dark">
      <div className="hm-wrap">
        <div className="hm-origen-grid">
          <div>
            <Title text="Nace en Tarija,|paso a paso." />
            <p className="hm-lead">
              Camina es una app boliviana. Conecta a las personas que caminan con los comercios de su ciudad, para que moverse tenga premio y lo local
              gane clientes. Empieza en Tarija; después llega a Santa Cruz, La Paz y Cochabamba.
            </p>
            <p className="hm-coords">21° 32′ S, 64° 44′ O. Tarija, Bolivia.</p>
          </div>
          <figure className="hm-origen-img">
            <Image src="/web/tarija.jpg" alt="Letras de Tarija en un parque de la ciudad" width={700} height={467} sizes="(max-width: 760px) 92vw, 460px" />
          </figure>
        </div>

        <ol className="hm-triada">
          {[
            ['Personas', 'que caminan su día a día.'],
            ['Movimiento', 'que se vuelve Puntos.'],
            ['Comercios', 'locales que reciben gente nueva.'],
          ].map(([t, d]) => (
            <li key={t}>
              <b>{t}</b>
              <span>{d}</span>
            </li>
          ))}
        </ol>

        <div className="hm-biz">
          <div>
            <h3>¿Tienes un comercio?</h3>
            <p>Suma tu local a Camina y recibe personas que ya caminan por tu zona.</p>
          </div>
          <div className="hm-cta">
            <Link className="hm-btn" href="/comercios" data-medir="inicio_ver_comercios">
              Ver cómo sumarme
            </Link>
            <Link className="hm-btn hm-btn-ghost" href="/registro" data-medir="registro_comercio_inicio">
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
    <section className="hm-sec hm-light hm-curtain" id="dudas" data-theme="light">
      <div className="hm-wrap hm-faq">
        <div>
          <Title text="Lo que todos|preguntan." />
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

function Descarga() {
  return (
    <section className="hm-sec hm-plum hm-curtain hm-final" id="descargar" data-theme="plum">
      <div className="hm-final-trail" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <Foot key={i} side={i % 2 ? 'R' : 'L'} style={{ ['--i' as string]: i }} />
        ))}
      </div>
      <div className="hm-wrap hm-final-in">
        <Image className="hm-final-icon" src="/marca/logo-solo-transparente.png" alt="" width={112} height={112} />
        <Title text="Cada paso|cuenta." className="hm-final-title" />
        <p className="hm-lead">Camina es gratis para iPhone y Android. Déjanos tu correo y te avisamos apenas esté en tu tienda.</p>
        <div className="hm-cta hm-cta-center">
          <CtaAvisame medir="descargar_avisame" />
        </div>
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
      </div>
    </section>
  );
}

function Footer() {
  const cols: [string, [string, string][]][] = [
    ['Camina', [['Cómo funciona', '#como-funciona'], ['Premios', '#premios'], ['Comunidad', '#comunidad'], ['Ruta del mes', '#ruta'], ['Preguntas', '#dudas']]],
    ['Comercios', [['Para comercios', '/comercios'], ['Registrar mi comercio', '/registro'], ['Ingresar al panel', '/login'], ['Guía para comercios', '/guia']]],
    ['Legal', [['Términos', '/terminos'], ['Privacidad', '/privacidad'], ['Eliminar mi cuenta', '/eliminar-cuenta']]],
  ];
  return (
    <footer className="hm-footer hm-dark" data-theme="dark">
      <div className="hm-wrap">
        <div className="hm-footer-top">
          <div className="hm-footer-brand">
            <Image src="/marca/logo-solo-transparente.png" alt="" width={44} height={44} />
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
        <svg className="hm-wordmark" viewBox="0 0 1000 170" aria-hidden="true" focusable="false">
          <text x="500" y="158" fontSize="208" textAnchor="middle">
            CAMINA
          </text>
        </svg>
        <div className="hm-footer-bottom">
          <span>© {new Date().getFullYear()} Camina</span>
          <span>Hecha en Tarija, Bolivia</span>
        </div>
      </div>
    </footer>
  );
}
