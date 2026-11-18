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
import { Phone, Eyebrow, Title, Foot, Arrow } from './ui';
import { CAP, CONTACTO, DUDAS, EMAIL_AVISAME, ETAPAS, LOCALES, RUTA_PREMIOS, SALIDA, TIENDAS, TOUR, VID_RUTA } from './data';

// Tipografías de la portada: Inter Tight (titulares y texto) e Instrument Serif itálica (acentos editoriales).
const sans = localFont({ src: '../../fonts/InterTight-Variable.woff2', weight: '100 900', variable: '--hm-sans', display: 'swap' });
const serif = localFont({ src: '../../fonts/InstrumentSerif-Italic.woff2', weight: '400', style: 'italic', variable: '--hm-serif', display: 'swap' });

// Marca .hm-js antes de pintar (solo si se permite movimiento): así los elementos que se revelan
// no parpadean. Si el director no arranca en 4 s, se quita y todo queda visible.
const BOOT =
  "(function(){var r=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){r.classList.add('hm-js');setTimeout(function(){if(!r.dataset.hmReady)r.classList.remove('hm-js')},4000)}})()";

export default function HomePage() {
  return (
    <div className={`hm ${sans.variable} ${serif.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <a className="hm-skip" href="#contenido">Saltar al contenido</a>
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
      <HomeMotion />
    </div>
  );
}

function Hero() {
  return (
    <section className="hm-hero hm-dark" data-theme="dark">
      <div className="hm-hero-bg" aria-hidden="true" />
      <div className="hm-wrap hm-hero-grid">
        <div className="hm-hero-copy">
          <Eyebrow>Hecha en Tarija, Bolivia</Eyebrow>
          <Title as="h1" text="Tus pasos *valen.*" className="hm-h1" />
          <p className="hm-lead hm-rise">
            Camina convierte tus pasos en Puntos que canjeas por premios y descuentos en comercios de tu ciudad. Gratis.
          </p>
          <div className="hm-cta" data-reveal style={{ ['--d' as string]: '380ms' }}>
            <a className="hm-btn" href="#descargar" data-medir="inicio_quiero_usar">
              Descargar Camina <Arrow />
            </a>
            <a className="hm-btn hm-btn-ghost" href="#como-funciona">
              Cómo funciona
            </a>
          </div>
          <p className="hm-meta" data-reveal style={{ ['--d' as string]: '480ms' }}>
            <span>iPhone y Android</span>
            <span>{SALIDA}</span>
          </p>
        </div>
        <div className="hm-hero-stage">
          <HeroScene>
            <Phone src={CAP.inicio} alt="Inicio de Camina: el aro con los pasos de hoy, los Puntos y los locales cercanos" preload sizes="(max-width: 760px) 62vw, 300px" />
          </HeroScene>
        </div>
      </div>
      <a className="hm-scroll" href="#como-funciona" aria-label="Bajar a Cómo funciona">
        <span />
      </a>
    </section>
  );
}

function ComoFunciona() {
  return (
    <section className="hm-sec hm-light hm-curtain" id="como-funciona" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head">
          <Eyebrow>Cómo funciona</Eyebrow>
          <Title text="Cuatro pasos. *Ningún* *esfuerzo* *extra.*" />
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
                  <span key={e.n} data-shot={e.n}>{e.n}</span>
                ))}
                <small>/ 04</small>
              </div>
            </div>
          </div>
          <ol className="hm-steps-list">
            <span className="hm-steps-line" aria-hidden="true"><i /></span>
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
      </div>
    </section>
  );
}

function Premios() {
  return (
    <section className="hm-sec hm-dark hm-curtain" id="premios" data-theme="dark">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <div>
            <Eyebrow>Premios</Eyebrow>
            <Title text="Premios reales, *en* *tu* *ciudad.*" />
          </div>
          <p className="hm-lead" data-reveal>
            Descuentos y premios gratis en comercios de Tarija. Cada local elige qué ofrece y cuántos Puntos cuesta.
          </p>
        </header>

        <div className="hm-prem">
          <ul className="hm-locs">
            {LOCALES.map((l, k) => (
              <li className="hm-loc" key={l.id} data-reveal style={{ ['--d' as string]: `${k * 90}ms` }}>
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
                        <b>{p.puntos} <small>Puntos</small></b>
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
              <div className="hm-prem-back" data-parallax="0.06">
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
            <p className="hm-eyebrow hm-eyebrow-lime"><span aria-hidden="true" />Tarjeta Camina</p>
            <h3>5 canjes, <em>un premio gratis.</em></h3>
            <p>
              Cada canje confirmado, en cualquier comercio, suma un sello. Con 5 eliges un premio gratis entre los comercios que participan. Tienes
              30 días para canjearlo.
            </p>
          </div>
          <ol className="hm-stamps" aria-label="Cinco sellos">
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n} style={{ ['--i' as string]: n }}>
                {n < 5 ? <Foot side={n % 2 ? 'L' : 'R'} /> : <span className="hm-gift">Gratis</span>}
              </li>
            ))}
          </ol>
        </div>
        <p className="hm-foot-note">
          Comercios y premios cargados en Camina en octubre de 2026. Pueden cambiar: los vigentes están siempre en la app. Puedes volver a canjear en el
          mismo local pasados 14 días.
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
            <div>
              <Eyebrow>La app</Eyebrow>
              <Title text="Todo tu movimiento, *en* *una* *app.*" />
            </div>
            <p className="hm-lead" data-reveal>
              Pantallas reales de Camina. Desde la ficha de cada local hasta tu perfil.
            </p>
          </header>
        </div>
        <div className="hm-tour-track" tabIndex={0} aria-label="Pantallas de la app (desliza para ver más)">
          {TOUR.map((t, i) => (
            <figure className="hm-tour-item" key={t.t}>
              <Phone src={t.img} alt={`Pantalla de Camina: ${t.t}`} sizes="(max-width: 760px) 64vw, 300px" />
              <figcaption>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <b>{t.t}</b>
                {t.d}
              </figcaption>
            </figure>
          ))}
          <figure className="hm-tour-item">
            <Compare dark={CAP.inicio} light={CAP.inicioClaro} />
            <figcaption>
              <span>{String(TOUR.length + 1).padStart(2, '0')}</span>
              <b>Claro u oscuro</b>
              Desliza el control para ver los dos modos.
            </figcaption>
          </figure>
        </div>
        <p className="hm-wrap hm-foot-note hm-tour-note">Los datos de las personas en las pantallas son de ejemplo.</p>
      </div>
    </section>
  );
}

function ComunidadSec() {
  return (
    <section className="hm-sec hm-dark hm-curtain" id="comunidad" data-theme="dark">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <div>
            <Eyebrow>Comunidad y desafíos</Eyebrow>
            <Title text="Caminar rinde más *con* *otros.*" />
          </div>
          <p className="hm-lead" data-reveal>
            Rankings, rachas, desafíos, grupos, insignias y eventos. Todo para que mañana también salgas a caminar.
          </p>
        </header>
        <Comunidad />
      </div>
    </section>
  );
}

// Paradas del recorrido (coordenadas del viewBox 600×420) y en qué parte del dibujo se encienden.
const PARADAS = [
  { x: 40, y: 360, at: 0, k: 'inicio' as const },
  { x: 170, y: 250, at: 0.24, k: 1 },
  { x: 330, y: 300, at: 0.5, k: 2 },
  { x: 450, y: 140, at: 0.79, k: 3 },
  { x: 560, y: 60, at: 0.97, k: 'fin' as const },
];

function Ruta() {
  const pasos = ['Tocas Participar y te tocan 3 locales sorpresa.', 'Los visitas en el orden que quieras y compras lo que quieras.', 'Al pagar, escribes el código del local y el local confirma tu visita.'];
  return (
    <section className="hm-sec hm-light hm-curtain" id="ruta" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <div>
            <Eyebrow>Evento del mes</Eyebrow>
            <Title text="La Ruta *del* *mes.*" />
          </div>
          <p className="hm-lead" data-reveal>
            Una excusa para salir a caminar y conocer tu ciudad: 3 locales sorpresa, un mapa con tu recorrido y una recompensa al final.
          </p>
        </header>

        <div className="hm-ruta">
          <div className="hm-ruta-board">
            <div className="hm-ruta-map" aria-hidden="true">
              <svg viewBox="0 0 600 420" preserveAspectRatio="none">
                <path className="hm-ruta-ghost" d="M40 360 C 90 300, 120 260, 170 250 S 280 320, 330 300 S 420 160, 450 140 S 530 80, 560 60" />
                <path className="hm-ruta-path" d="M40 360 C 90 300, 120 260, 170 250 S 280 320, 330 300 S 420 160, 450 140 S 530 80, 560 60" />
              </svg>
              {PARADAS.map((p) => (
                <span
                  key={String(p.k)}
                  className={`hm-stop hm-stop-${typeof p.k === 'number' ? 'local' : p.k}`}
                  data-at={p.at}
                  style={{ left: `${(p.x / 600) * 100}%`, top: `${(p.y / 420) * 100}%` }}
                >
                  {p.k === 'inicio' ? <Foot side="L" /> : p.k === 'fin' ? '★' : <><i>?</i><b>✓</b></>}
                  <em>{p.k === 'inicio' ? 'Participar' : p.k === 'fin' ? 'Ruta completa' : `Local ${p.k}`}</em>
                </span>
              ))}
            </div>
            <ol className="hm-ruta-pasos">
              {pasos.map((t, i) => (
                <li key={t} data-reveal style={{ ['--d' as string]: `${i * 100}ms` }}>
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
            <p className="hm-foot-note">Video de la app real. Los locales y las fotos son de ejemplo.</p>
          </div>
        </div>

        <ul className="hm-ruta-premios">
          {RUTA_PREMIOS.map(([s, t, d], i) => (
            <li key={t} data-reveal style={{ ['--d' as string]: `${i * 110}ms` }}>
              <span aria-hidden="true">{s}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ul>
        <p className="hm-foot-note">En la Ruta no se usan Puntos ni descuentos: pagas tu compra como cualquier cliente.</p>
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
            <Eyebrow>Nuestro origen</Eyebrow>
            <Title text="Nace en Tarija, *paso* *a* *paso.*" />
            <p className="hm-lead" data-reveal>
              Camina es una app boliviana. Conecta a las personas que caminan con los comercios de su ciudad, para que moverse tenga premio y lo local
              gane clientes. Empieza en Tarija; después llega a Santa Cruz, La Paz y Cochabamba.
            </p>
            <p className="hm-coords" data-reveal>21°32′ S · 64°44′ O · Tarija, Bolivia</p>
          </div>
          <figure className="hm-origen-img" data-reveal>
            <Image src="/web/tarija.jpg" alt="Letras de Tarija en un parque de la ciudad" width={700} height={467} sizes="(max-width: 760px) 92vw, 460px" />
          </figure>
        </div>

        <ol className="hm-triada">
          {[
            ['Personas', 'que caminan su día a día.'],
            ['Movimiento', 'que se vuelve Puntos.'],
            ['Comercios', 'locales que reciben gente nueva.'],
          ].map(([t, d], i) => (
            <li key={t} data-reveal style={{ ['--d' as string]: `${i * 120}ms` }}>
              <b>{t}</b>
              <span>{d}</span>
            </li>
          ))}
        </ol>

        <div className="hm-biz" data-reveal>
          <div>
            <h3>¿Tienes un comercio?</h3>
            <p>Suma tu local a Camina y recibe personas que ya caminan por tu zona.</p>
          </div>
          <div className="hm-cta">
            <Link className="hm-btn hm-btn-light" href="/comercios" data-medir="inicio_ver_comercios">
              Ver cómo sumarme <Arrow />
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
          <Eyebrow>Preguntas</Eyebrow>
          <Title text="Lo que todos *preguntan.*" />
          <p className="hm-faq-contact" data-reveal>
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
    <section className="hm-sec hm-dark hm-curtain hm-final" id="descargar" data-theme="dark">
      <div className="hm-final-trail" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <Foot key={i} side={i % 2 ? 'R' : 'L'} style={{ ['--i' as string]: i }} />
        ))}
      </div>
      <div className="hm-wrap hm-final-in">
        <Image className="hm-final-icon" src="/web/app-icon.png" alt="" width={120} height={120} data-reveal />
        <Title text="Cada paso *cuenta.*" className="hm-final-title" />
        <p className="hm-lead" data-reveal>
          Camina es gratis para iPhone y Android. {SALIDA}: te avisamos apenas esté en tu tienda.
        </p>
        <div className="hm-stores" data-reveal>
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
        <div className="hm-cta hm-cta-center" data-reveal>
          <a className="hm-btn" href={EMAIL_AVISAME} data-medir="descargar_avisame">
            Avísame cuando salga <Arrow />
          </a>
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
              <li><a href={CONTACTO.whatsapp}>WhatsApp {CONTACTO.whatsappTexto}</a></li>
              <li><a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a></li>
              <li><a href={CONTACTO.instagram} target="_blank" rel="noopener noreferrer">Instagram {CONTACTO.instagramTexto}</a></li>
            </ul>
          </div>
        </div>
        <p className="hm-wordmark" aria-hidden="true">CAMINA</p>
        <div className="hm-footer-bottom">
          <span>© {new Date().getFullYear()} Camina</span>
          <span>Hecha en Tarija, Bolivia</span>
        </div>
      </div>
    </footer>
  );
}
