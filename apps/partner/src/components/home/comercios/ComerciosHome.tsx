import Image from 'next/image';
import Link from 'next/link';
import '../home.css';
import './comercios.css';
import Shell from '../Shell';
import Nav from '../Nav';
import Footer from '../Footer';
import Steps from '../Steps';
import RouteMap from '../RouteMap';
import Video from '../Video';
import { Phone, Title } from '../ui';
import { CAP, CONTACTO, RUTAS, VID_RUTA } from '../data';
import PanelLive from './PanelLive';
import { PLANS, LANZAMIENTO, CUPO_FUNDADOR_ABIERTO, WHATSAPP_NUMBER } from '@/lib/plans';

// /comercios con el mismo sistema visual que la portada. Precios, planes y condiciones salen de lib/plans.ts sin cambios.
// Usa "tú", como el panel de comercios.

const WA_DUDA = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Tengo una duda sobre cómo sumar mi comercio a Camina.')}`;

const LINKS = [
  ['Cómo funciona', '#como-funciona'],
  ['Ruta del mes', '#ruta'],
  ['Planes', '#planes'],
  ['Preguntas', '#dudas'],
] as const;

// Cómo llega una persona a tu local, con pantallas reales de la app.
const ETAPAS_LOCAL = [
  {
    n: '01',
    t: 'Te encuentran.',
    d: 'Tu local aparece en el mapa de la app y en «Locales cerca tuyo», con tu logo.',
    dato: 'Desde el plan gratis',
    img: CAP.mapa,
    alt: 'Mapa de Camina con los comercios de Tarija',
  },
  {
    n: '02',
    t: 'Eligen tu premio.',
    d: 'Abren tu ficha: fotos, horario, dirección, redes y tus premios con los Puntos que cuestan.',
    dato: 'Tú decides el premio, los días y los horarios',
    img: CAP.premiosFripaps,
    alt: "Ficha de Fripap's en Camina con su premio",
  },
  {
    n: '03',
    t: 'Canjean en tu local.',
    d: 'Le dices el código de 4 números de tu local, lo escribe en la app y el canje queda confirmado.',
    dato: 'Lo ves al instante en tu panel',
    img: CAP.canjes,
    alt: 'Pantalla Canjes de Camina con los comercios y sus premios',
  },
  {
    n: '04',
    t: 'Vuelven.',
    d: 'Cada canje los sube de nivel en tu local: Visitante, Habitual y Fan. Pueden volver a canjear cada 14 días.',
    dato: 'En tu panel ves a tus clientes más fieles',
    img: '/web/app/insignias-app.jpg',
    alt: 'Pantalla Mis insignias de Camina con los niveles por local',
  },
] as const;

// Textos de esta página para tres puntos de los planes (los mismos de antes). Precios, planes y reglas no cambian.
const TEXTO_PLAN: Record<string, [string, string]> = {
  'Mínimo 3 cupones por día': ['Mínimo 3 cupos por día', 'Cupos disponibles, no clientes garantizados.'],
  '1 premio gratis y, con él, 1 más': ['1 premio gratis y 1 descuento', 'Primero el gratis, después el descuento. Máximo 2.'],
  'Tarjeta de fidelidad Camina: tu premio entre las opciones de todos los clientes': ['Tarjeta de fidelidad Camina', 'Tu premio entre las opciones de todos los clientes.'],
};

const DUDAS_COM = [
  ['¿Qué es Camina?', 'Una app gratis que cuenta los pasos de las personas y los convierte en Puntos. Esos Puntos se canjean por descuentos o regalos en los comercios aliados de su ciudad.'],
  ['¿Cómo se incorpora mi negocio?', 'Te registras, cargas tu local, tu logo, tus fotos y tu primer descuento o regalo. El equipo de Camina lo revisa y, al aprobarlo, apareces en la app.'],
  ['¿Cuánto cuesta?', 'Primer Paso es gratis. Paso Firme cuesta Bs 99/mes y Paso Adelante Bs 299/mes (precio de lanzamiento). Se paga con QR y mandas el comprobante por WhatsApp. Los primeros 20 comercios tienen 3 meses gratis de Paso Firme.'],
  ['¿Quién define los descuentos?', 'Tú. Eliges si das un descuento o un regalo, cuántos cupones por día y en qué días y horarios vale.'],
  ['¿Cómo se usan los beneficios?', 'La persona canjea en la app y llega a tu local. Tú le dices el código de 4 números de tu local, lo escribe y el canje queda confirmado. Nadie puede volver a canjear en el mismo local hasta pasados 14 días.'],
  ['¿Qué necesito para participar?', 'Los datos de tu local, tu logo, algunas fotos y tu primer descuento o regalo. Todo se hace desde el panel web, sin instalar nada.'],
] as const;

export default function ComerciosHome() {
  return (
    <Shell className="cx">
      <Nav
        links={[...LINKS]}
        otra={['Para personas', '/']}
        cta={
          <Link className="hm-btn hm-btn-sm hm-nav-cta" href={RUTAS.registro} data-medir="comercios_nav_sumar">
            Sumar mi comercio
          </Link>
        }
        ctaMenu={
          <Link className="hm-btn" href={RUTAS.registro} data-medir="comercios_menu_sumar">
            Sumar mi comercio
          </Link>
        }
      />
      <main id="contenido" className="hm-main">
        <Hero />
        <ComoFunciona />
        <Ruta />
        <Planes />
        <Dudas />
        <Cierre />
      </main>
      <Footer base="/" />
    </Shell>
  );
}

// 1. Héroe: el panel del comercio en vivo.
function Hero() {
  return (
    <section className="hm-hero hm-dark cx-hero" data-theme="dark" aria-labelledby="cx-h1">
      <div className="hm-wrap cx-hero-grid">
        <div className="hm-hero-copy">
          <p className="cx-kick" data-reveal>
            Para comercios
          </p>
          <Title as="h1" id="cx-h1" text="Tus próximos clientes|ya están caminando." className="cx-h1" />
          <p className="hm-lead hm-hero-lead" data-reveal>
            En Camina, la gente gana Puntos por caminar y los canjea en comercios de su ciudad. Suma el tuyo gratis y sigue cada canje desde tu panel.
          </p>
          <div className="hm-cta" data-reveal>
            <Link className="hm-btn" href={RUTAS.registro} data-medir="comercios_hero_sumar">
              Sumar mi comercio
            </Link>
            <a className="hm-btn hm-btn-ghost" href="#planes" data-medir="comercios_hero_planes">
              Ver planes
            </a>
          </div>
        </div>
        <div className="cx-hero-panel">
          <PanelLive />
          <p className="hm-note">Tu panel de comercio, con datos de ejemplo.</p>
        </div>
      </div>
    </section>
  );
}

// 2. Cómo llega un cliente a tu local.
function ComoFunciona() {
  return (
    <section className="hm-sec" id="como-funciona" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head">
          <Title text="Así llegan|a tu local." />
          <p className="hm-lead" data-reveal>
            Cuatro momentos, todos dentro de la app. Tú solo atiendes y das tu código.
          </p>
        </header>
        <Steps etapas={ETAPAS_LOCAL} />
      </div>
    </section>
  );
}

// 3. Ruta del mes, vista desde el local.
function Ruta() {
  return (
    <section className="hm-sec hm-dark" id="ruta" data-theme="dark">
      <div className="hm-wrap">
        <header className="hm-head hm-head-split">
          <Title text="Tu local, entre|los 3 sorpresa." />
          <p className="hm-lead" data-reveal>
            Cada mes, Camina le da a cada persona 3 locales sorpresa y el camino a pie para visitarlos. Tu local puede ser uno, <b>sin pagar plan y sin dar descuento.</b>
          </p>
        </header>
        <div className="hm-ruta">
          <div className="hm-ruta-main" data-reveal>
            <RouteMap />
            <ol className="hm-ruta-pasos hm-seq" data-seq>
              {[
                ['Te toca en su Ruta', 'La persona ve tu local en su mapa del mes, con el camino a pie.'],
                ['Viene y compra', 'Compra lo que quiera, como cualquier cliente. En la Ruta no se usan Puntos.'],
                ['Le das tu código de la Ruta', 'Lo escribe al pagar y tú confirmas la visita desde tu panel.'],
              ].map(([t, d], i) => (
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
              <Video src={VID_RUTA.src} poster={VID_RUTA.poster} label="Video de la app: la Ruta de noviembre con sus 3 locales y el camino a pie" />
            </Phone>
            <p className="hm-note">Grabación de la app real.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// 4. Planes: precios y beneficios tal cual lib/plans.ts.
function Planes() {
  return (
    <section className="hm-sec hm-soft" id="planes" data-theme="light">
      <div className="hm-wrap">
        <header className="hm-head">
          <Title text="Empieza|gratis." />
          <p className="hm-lead" data-reveal>
            Aparecer en Camina no cuesta. Los planes de pago suman herramientas y beneficios extra.
          </p>
        </header>
        {CUPO_FUNDADOR_ABIERTO && (
          <div className="cx-fund" data-reveal>
            <div>
              <b>Los primeros 20 comercios tienen 3 meses gratis de Paso Firme.</b>
              <span>Desde que salga la app. Te lo confirmamos cuando aprobamos tu local.</span>
            </div>
            <Link className="hm-btn" href="/registro?fundador=1" data-medir="comercios_fundador">
              Pedir mi cupo fundador
            </Link>
          </div>
        )}
        <div className="cx-plans" data-stagger>
          {PLANS.map((p) => (
            <article key={p.id} className={`cx-plan${p.featured ? ' is-feat' : ''}${p.id === 'paso_adelante' ? ' is-gold' : ''}`}>
              <h3>{p.name}</h3>
              <p className="cx-price">{p.price}</p>
              {p.id !== 'primer_paso' ? <p className="cx-launch">{LANZAMIENTO}</p> : <p className="cx-launch">Sin costo fijo</p>}
              <p className="cx-blurb">{p.blurb}</p>
              <ul>
                {p.features.map((f) => {
                  const [t, e] = TEXTO_PLAN[f] ?? [f, ''];
                  return (
                    <li key={f}>
                      {t}
                      {e ? <small>{e}</small> : null}
                    </li>
                  );
                })}
              </ul>
              <Link className={`hm-btn${p.id === 'primer_paso' ? ' hm-btn-ghost' : ''}`} href={`/registro?plan=${p.id}`} data-medir={`comercios_plan_${p.id}`}>
                {p.id === 'primer_paso' ? 'Registrarme gratis' : 'Registrarme con este plan'}
              </Link>
            </article>
          ))}
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
          <Title text="Lo que todos|preguntan." />
          <p className="hm-faq-contact">
            ¿Otra duda? Escríbenos por <a href={WA_DUDA}>WhatsApp</a> o a <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>.
          </p>
        </div>
        <div className="hm-faq-list">
          {DUDAS_COM.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <i aria-hidden="true" />
              </summary>
              <p>{a}</p>
            </details>
          ))}
          <details>
            <summary>
              ¿Cómo puedo registrarme?
              <i aria-hidden="true" />
            </summary>
            <p>
              Toca «Sumar mi comercio», crea tu cuenta y arma tu ficha. Si te queda una duda, <a href={WA_DUDA}>escríbenos por WhatsApp</a>.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}

function Cierre() {
  return (
    <section className="hm-sec hm-dark hm-final" id="sumar" data-theme="dark">
      <div className="hm-wrap hm-final-in">
        <div className="hm-final-baifo" data-reveal>
          <Image src="/web/baifo/camina.webp" alt="Baifo, la cabrita de Camina, caminando" width={284} height={420} sizes="150px" />
        </div>
        <Title text="Suma tu local a la|comunidad que camina." className="hm-final-title" />
        <p className="hm-lead" data-reveal>
          Empieza gratis y elige tu plan cuando quieras. Todo se hace desde el panel web, sin instalar nada.
        </p>
        <div className="hm-cta hm-cta-center" data-reveal>
          <Link className="hm-btn" href={RUTAS.registro} data-medir="comercios_cierre_sumar">
            Sumar mi comercio
          </Link>
          <a className="hm-btn hm-btn-ghost" href={WA_DUDA} data-medir="comercios_cierre_whatsapp">
            Escribir por WhatsApp
          </a>
        </div>
        <p className="hm-final-mail">
          ¿Ya tienes cuenta? <Link href={RUTAS.login}>Ingresa a tu panel</Link>
        </p>
      </div>
    </section>
  );
}
