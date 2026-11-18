import Link from 'next/link';
import { PLANS, PLAN_EXPLICA, WHATSAPP_NUMBER, LANZAMIENTO, CUPO_FUNDADOR_ABIERTO } from '@/lib/plans';
import { InView, Kinetic, Parallax } from './Motion';
import Trail from './Trail';
import { Shot, CAP, Deslizable, FloatCards, WA } from './shared';

const WA_DUDA = WA('Hola! Tengo una duda sobre cómo sumar mi comercio a Camina.');

// Apertura: qué es Camina y qué gana el comercio, en una frase. Un solo botón.
export function HeroComercio() {
  return (
    <section className="lp-hero">
      <Trail className="hero-trail" n={13} />
      <div className="wrap hero-grid">
        <div className="copy">
          <Kinetic as="h1" text="Tus próximos clientes ya están *caminando.*" />
          <p className="sub">
            Camina es una app gratis que premia a las personas por caminar y las lleva a los comercios de su zona. Suma el tuyo y elige qué dar: un descuento o un regalo.
          </p>
          <div className="lp-cta">
            <Link className="lp-btn mint" href="/registro" data-medir="comercios_hero_sumar">Sumar mi comercio</Link>
          </div>
        </div>
        <div className="stage">
          <Parallax speed={0.06}>
            <div className="phone hero-phone"><Shot src={CAP.canjes.replace('.jpg', '-dark.jpg')} alt="Pantalla de canjes con comercios y descuentos" width={780} height={1688} priority sizes="280px" /></div>
          </Parallax>
          <FloatCards para="comercios" />
        </div>
      </div>
    </section>
  );
}

const GANA_NEGOCIO = [
  ['Llega gente nueva', 'Te descubren en el mapa de la app. Con la Ruta del mes, personas nuevas llegan a comprar sin que des descuento.'],
  ['Personas que vienen caminando', 'Cada canje es alguien que caminó hasta tu local, con ganas de conocerte.'],
  ['Tú pones el beneficio', 'Un descuento o un regalo, con tus cupos por día, tus días y tus horarios.'],
  ['Más visibilidad', 'Tu ficha con fotos, horarios y redes, y tu pin en el mapa de Camina.'],
  ['Vuelven a comprar', 'Camina te muestra quién vuelve y los premia como clientes Visitante, Habitual y Fan.'],
  ['Una comunidad que busca beneficios', 'Personas que caminan cada día y te recomiendan con reseñas en Google Maps e historias.'],
];
export function GanaNegocio() {
  return (
    <section className="lp-sec" id="beneficios">
      <div className="wrap">
        <p className="kick">Por qué sumarte</p>
        <Kinetic text="¿Qué gana *tu* *negocio?*" />
        <ul className="gana">
          {GANA_NEGOCIO.map(([t, d], i) => (
            <InView as="li" key={t} delay={(i % 2) * 90}>
              <h3>{t}</h3>
              <p>{d}</p>
            </InView>
          ))}
        </ul>
        <p className="gal-nota">Camina te trae personas, pero no garantiza ventas: los resultados dependen de tu local y de lo que ofrezcas.</p>
      </div>
    </section>
  );
}

const PASOS = [
  ['Te registras', 'Creas tu cuenta y cargas tu local, tu logo y tus fotos desde el panel web. No instalas nada.'],
  ['Eliges tu beneficio', 'Un descuento o un regalo, con tus cupos, días y horarios. Lo revisa el equipo de Camina.'],
  ['Te encuentran en la app', 'Apareces en el mapa y en la lista de canjes de tu zona.'],
  ['Vienen y canjean', 'La persona llega a tu local y tú le dices el código de 4 números para confirmar el canje.'],
  ['Sigues en la comunidad', 'Ves tus canjes y tu resumen del mes, y quienes vuelven suman nivel en tu local.'],
];
export function ComoFuncionaComercio() {
  return (
    <section className="lp-sec alt" id="como-funciona">
      <div className="wrap">
        <p className="kick">Cómo funciona</p>
        <Kinetic text="Así de *simple.*" />
        <ol className="flow flow-5">
          {PASOS.map(([t, d], i) => (
            <InView as="li" key={t} delay={i * 90}>
              <span className="num">{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </InView>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function AsiSeVeNegocio() {
  return (
    <section className="lp-sec" id="asi-se-ve" data-modo="oscuro">
      <div className="wrap">
        <p className="kick">Dentro de la app</p>
        <Kinetic text="Así se ve *tu* *negocio.*" />
        <p className="lead">Desde que te encuentran hasta que te recomiendan.</p>
      </div>
      <Deslizable
        id="gal-negocio"
        nota="Pantallas reales de la app; los datos de las personas son de ejemplo."
        pant={[
          ['Te encuentran', 'Tu local y tus descuentos en la lista de canjes.', CAP.canjes],
          ['Tu ficha', 'Fotos, horarios, dirección, redes, tus descuentos y cómo llegar.', CAP.fichaLocal],
          ['Te invitan a calificarte', 'Con tu código confirmas el canje y la app invita a calificar tu local.', CAP.resenaHistoria],
          ['Su historia', 'Suben lo que canjearon a Instagram con el nombre de tu local.', CAP.canjeHistoria],
        ]}
      />
    </section>
  );
}

// Planes y precios: mismos datos de lib/plans.ts, sin cambios. El cupo fundador va primero para que se vea.
export function PlanesComercio() {
  return (
    <section className="lp-sec alt" id="planes">
      <div className="wrap">
        <p className="kick">Planes</p>
        <Kinetic text="Elige cómo *empezar.*" />
        {CUPO_FUNDADOR_ABIERTO && (
          <div className="fund fund-top">
            <b>Los primeros 20 comercios tienen 3 meses gratis de Paso Firme.</b>
            <span>Desde que salga la app. Te creas la cuenta, armas tu ficha y te lo confirmamos cuando aprobamos tu local.</span>
            <Link className="lp-btn dark" href="/registro?fundador=1" data-medir="comercios_fundador">Pedir mi cupo fundador</Link>
          </div>
        )}
        <p className="lead">Te registras y creas tu perfil con cualquier plan. Al terminar eliges el plan (con QR si es pago).</p>
        <div className="planes">
          {PLANS.map((p, i) => (
            <InView as="article" key={p.id} className={`plan${p.featured ? ' feat' : ''}`} delay={i * 120}>
              <h3>{p.name}</h3>
              <p className="price">{p.price}</p>
              {p.id !== 'primer_paso' && <p className="launch">{LANZAMIENTO}</p>}
              <p className="blurb">{p.blurb}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}{PLAN_EXPLICA[f] ? <small className="plan-exp">{PLAN_EXPLICA[f]}</small> : null}</li>)}</ul>
              <Link className={`lp-btn ${p.id === 'primer_paso' ? 'dark' : 'mint'} plan-cta`} href={`/registro?plan=${p.id}`}>
                {p.id === 'primer_paso' ? 'Registrarme gratis' : 'Registrarme y elegir este plan'}
              </Link>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

const DUDAS_COM = [
  ['¿Qué es Camina?', 'Una app gratis que cuenta los pasos de las personas y los convierte en Puntos. Esos Puntos se canjean por descuentos o regalos en los comercios aliados de su ciudad.'],
  ['¿Cómo se incorpora mi negocio?', 'Te registras, cargas tu local, tu logo, tus fotos y tu primer descuento o regalo. El equipo de Camina lo revisa y, al aprobarlo, apareces en la app.'],
  ['¿Cuánto cuesta?', 'Primer Paso es gratis. Paso Firme cuesta Bs 99/mes y Paso Adelante Bs 299/mes (precio de lanzamiento). Se paga con QR y mandas el comprobante por WhatsApp. Los primeros 20 comercios tienen 3 meses gratis de Paso Firme.'],
  ['¿Quién define los descuentos?', 'Tú. Eliges si das un descuento o un regalo, cuántos cupones por día y en qué días y horarios vale.'],
  ['¿Cómo se usan los beneficios?', 'La persona canjea en la app y llega a tu local. Tú le dices el código de 4 números de tu local, lo escribe y el canje queda confirmado. Nadie puede volver a canjear en el mismo local hasta pasados 14 días.'],
  ['¿Qué necesito para participar?', 'Los datos de tu local, tu logo, algunas fotos y tu primer descuento o regalo. Todo se hace desde el panel web, sin instalar nada.'],
];
export function DudasComercio() {
  return (
    <section className="lp-sec" id="dudas">
      <div className="wrap">
        <p className="kick">Dudas rápidas</p>
        <Kinetic text="Lo que todos *preguntan.*" />
        <div className="dudas">
          {DUDAS_COM.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
          <details>
            <summary>¿Cómo puedo registrarme?</summary>
            <p>Toca «Sumar mi comercio», crea tu cuenta y arma tu ficha. Si te queda una duda, <a href={WA_DUDA}>escríbenos por WhatsApp</a>.</p>
          </details>
        </div>
      </div>
    </section>
  );
}

export function CierreNegocio() {
  return (
    <section className="lp-final">
      <div className="wrap">
        <div className="idea-card">
          <Kinetic text="Suma tu negocio a la comunidad que *camina.*" />
          <p>Empieza gratis y elige tu plan cuando quieras.</p>
          <div className="lp-cta">
            <Link className="lp-btn mint" href="/registro" data-medir="comercios_cierre_sumar">Sumar mi comercio</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
