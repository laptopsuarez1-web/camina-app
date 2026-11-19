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
import Comercios from './Comercios';
import Avisame from './Avisame';
import Carrusel from './Carrusel';
import { Phone, Title, Icon, CtaAvisame, Coin } from './ui';
import { CAP, CONTACTO, DUDAS, RUTA_PREMIOS, RUTAS, TIENDAS, VID_RUTA, VID_TARJETA } from './data';

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


// Franja de acción al final de un tramo: una frase y el botón principal.
function Band({ t, cta, medir }: { t: string; cta: string; medir: string }) {
  return (
    <div className="hm-band" data-reveal>
      <p>{t}</p>
      <CtaAvisame medir={medir} label={cta} />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className={`hm ${mona.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <a className="hm-skip" href="#contenido">
        Saltar al contenido
      </a>
      <Nav />
      <main id="contenido" className="hm-main">
        <Hero />
        <ComoFunciona />
        <Actividad />
        <Premios />
        <ComunidadSec />
        <Ruta />
        <Origen />
        <Dudas />
        <Cierre />
      </main>
      <Footer />
      <Avisame />
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
        <div className="hm-duo hm-hero-visual" aria-hidden="true">
          <Phone src={CAP.inicio} preload sizes="(max-width: 1000px) 42vw, 300px" />
          <Phone src={CAP.puntos} sizes="(max-width: 1000px) 42vw, 300px" />
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
          <p className="hm-lead" data-reveal>Cuatro momentos, todos dentro de la app. Lo único que pones tú son los pasos.</p>
        </header>
        <Steps />
        <Band t="Tus pasos de hoy ya podrían estar sumando." cta="Quiero empezar" medir="funciona_avisame" />
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
          <p className="hm-lead" data-reveal>
            Camina lee tus pasos desde Salud o Health Connect y te los muestra en Actividad: tu semana, tu mes y tu racha. Cada día que abres la app,
            tus pasos suman Puntos.
          </p>
          <div className="hm-conv" data-conv aria-label="10.000 pasos son 10 Puntos">
            <div>
              <b data-conv-pasos>10.000</b>
              <small>pasos</small>
            </div>
            <span className="hm-conv-arrow" aria-hidden="true">
              <i />
            </span>
            <div className="hm-conv-pts">
              <b>
                <Coin size={40} />
                <span data-conv-pts>10</span>
              </b>
              <small>Puntos</small>
            </div>
          </div>
          <p className="hm-rules-line" data-reveal>
            <b>1.000 pasos = 1 Punto.</b> Hasta 20 Puntos por día, y cada uno dura 90 días.
          </p>
          <p className="hm-note">Los pasos escritos a mano no cuentan. Los de los días en que no abres la app se ven en Actividad, pero no suman.</p>
        </div>
        <div className="hm-duo" aria-hidden="true">
          <Phone src={CAP.actividad} sizes="(max-width: 1000px) 42vw, 300px" />
          <Phone src={CAP.rachas} sizes="(max-width: 1000px) 42vw, 300px" />
        </div>
      </div>
    </section>
  );
}

// 4. Premios y comercios: los comercios son protagonistas; Fripap's muestra cómo se ve un premio.
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
          <p className="hm-lead" data-reveal>Descuentos y premios gratis en comercios de Tarija. Cada local elige qué ofrece y cuántos Puntos cuesta.</p>
        </header>

        <Carrusel />

        <div className="hm-shops-head" data-reveal>
          <h3>Comercios que ya están en Camina</h3>
          <p>Toca uno para ver sus premios.</p>
        </div>
        <Comercios />


        <div className="hm-canje">
          <h3>Así se canjea</h3>
          <ol className="hm-seq" data-seq>
            {canje.map(([t, d], i) => (
              <li key={t}>
                <span>{i + 1}</span>
                <div>
                  <b>{t}</b>
                  {d}
                </div>
              </li>
            ))}
          </ol>
          <p className="hm-note">Puedes volver a canjear en el mismo local cada 14 días.</p>
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
            <CtaAvisame medir="premios_avisame" label="Quiero mis premios" className="hm-loyal-cta" />
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
          <p className="hm-lead" data-reveal>Rankings, grupos, insignias y eventos: razones para salir a caminar también mañana.</p>
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
          <p className="hm-lead" data-reveal>Cada mes, 3 locales sorpresa de tu ciudad y el camino a pie para visitarlos. Una excusa perfecta para salir a caminar.</p>
        </header>
        <div className="hm-ruta">
          <div className="hm-ruta-main" data-reveal>
            <RouteMap />
            <ol className="hm-ruta-pasos hm-seq" data-seq>
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
        <Band t="La próxima Ruta puede ser la tuya." cta="Quiero hacer la Ruta" medir="ruta_avisame" />
      </div>
    </section>
  );
}

// 7. Eventos y desafíos.
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
            <p className="hm-lead" data-reveal>
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
      <div className="hm-wrap hm-final-in">
        <Image className="hm-final-icon" src="/marca/logo-solo-transparente.png" alt="" width={88} height={88} />
        <Title text="Tu próximo paso|ya puede sumar." className="hm-final-title" />
        <p className="hm-lead" data-reveal>Camina es gratis para iPhone y Android. Déjanos tu WhatsApp o tu correo y te avisamos apenas esté en tu tienda.</p>
        <div className="hm-cta hm-cta-center">
          <CtaAvisame medir="descargar_avisame" />
        </div>
        <p className="hm-final-mail">Te avisamos por WhatsApp o por correo, como prefieras.</p>
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
