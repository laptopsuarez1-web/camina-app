import Image from 'next/image';
import Link from 'next/link';
import Nav from './Nav';
import Shell from './Shell';
import Footer from './Footer';
import Steps from './Steps';
import Comunidad from './Comunidad';
import RouteMap from './RouteMap';
import Video from './Video';
import Comercios from './Comercios';
import Avisame from './Avisame';
import Carrusel from './Carrusel';
import HeroPhone from './HeroPhone';
import LogoScene from './LogoScene';
import ActividadCard from './ActividadCard';
import { Phone, Title, Icon, CtaAvisame, Coin } from './ui';
import { CONTACTO, DUDAS, RUTA_PREMIOS, RUTAS, TIENDAS, VID_RUTA } from './data';

export default function HomePage() {
  return (
    <Shell>
      <Nav />
      <main id="contenido" className="hm-main">
        <Hero />
        <LogoScene />
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
    </Shell>
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

// 1. Héroe: titular, una frase, dos acciones y un teléfono que recorre la app real.
function Hero() {
  return (
    <section className="hm-hero hm-dark" data-theme="dark" aria-labelledby="hm-h1">
      <div className="hm-wrap hm-hero-grid">
        <div className="hm-hero-copy">
          <Title as="h1" id="hm-h1" text="Cada paso|cuenta." className="hm-h1" />
          <p className="hm-hero-sub" data-reveal>
            Caminá, sumá puntos y disfrutá beneficios.
          </p>
          <p className="hm-lead hm-hero-lead" data-reveal>
            Convertí tus pasos diarios en puntos que podés canjear por descuentos y premios en comercios de tu ciudad.
          </p>
          <div className="hm-cta" data-reveal>
            <a className="hm-btn" href="#premios" data-medir="inicio_conoce">
              Conocé CAMINA
            </a>
            <a className="hm-btn hm-btn-ghost" href="#como-funciona" data-medir="inicio_como_funciona">
              Cómo funciona
            </a>
          </div>
        </div>
        <HeroPhone />
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
            Camina lee tus pasos desde Salud o Health Connect y te los muestra en Actividad: tu semana, tu mes y tu racha.
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
          <ul className="hm-rules4" data-reveal>
            <li>
              <b>1.000 pasos</b> = 1 Punto
            </li>
            <li>
              <b>20 Puntos</b> como máximo por día
            </li>
            <li>
              <b>90 días</b> dura cada Punto
            </li>
            <li>
              <b>Abrí la app</b> cada día para que tus pasos sumen
            </li>
          </ul>
        </div>
        <div className="hm-act-card" data-reveal>
          <ActividadCard />
        </div>
      </div>
    </section>
  );
}

// 4. Premios y comercios: los comercios son protagonistas; Fripap's muestra cómo se ve un premio.
function Premios() {
  return (
    <section className="hm-sec" id="premios" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <Title text="Premios reales,|en tu ciudad." />
          <p className="hm-lead" data-reveal>Descuentos y premios gratis en comercios de Tarija. Cada local elige qué ofrece y cuántos Puntos cuesta.</p>
        </header>

        <Carrusel />

        <div className="hm-shops-head" data-reveal>
          <h3>Comercios en Camina</h3>
          <p>Tocá uno para ver sus premios.</p>
        </div>
        <Comercios />


        <p className="hm-note hm-prem-note">
          Volvés a canjear en el mismo local cada 14 días. Y cada 5 canjes, tu Tarjeta de fidelidad te da un premio gratis.
        </p>

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
              Camina nace en Tarija con una idea simple: que moverte por tu ciudad tenga premio, y que ese premio esté en los comercios de tu zona. Empezamos en Tarija; después vienen Santa Cruz, La Paz y Cochabamba.
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
        <div className="hm-final-baifo" data-reveal>
          <Image src="/web/baifo/camina.webp" alt="Baifo, la cabrita de Camina, caminando" width={284} height={420} sizes="150px" />
        </div>
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
