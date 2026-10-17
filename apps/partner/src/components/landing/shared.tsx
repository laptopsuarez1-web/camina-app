import Image from 'next/image';
import Link from 'next/link';
import { PLANS, WHATSAPP_NUMBER, whatsappLink } from '@/lib/plans';
import { InView, Kinetic, Counter, Parallax } from './Motion';
import { LOCALES } from './locales';
import RealMap from './RealMap';

export const WA = (texto: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
export const WA_COMERCIO = WA('Hola! Tengo una duda sobre cómo sumar mi comercio a Camina.');
export const WA_AVISAME = WA('Hola! Quiero que me avisen cuando Camina esté disponible en la tienda de mi celular.');

export const CAP = {
  inicio: '/web/cap/inicio.jpg',
  canjes: '/web/cap/canjes.jpg',
  fripaps: '/web/cap/ficha-fripaps.jpg',
  bloom: '/web/cap/ficha-bloom.jpg',
  coco: '/web/cap/ficha-coco.jpg',
  grupos: '/web/cap/grupos.jpg',
  actividad: '/web/cap/actividad.jpg',
};

export function Nav({ activo }: { activo: 'gente' | 'comercios' }) {
  return (
    <header className="lp-nav">
      <div className="wrap">
        <Link href="/" className="lp-brand" aria-label="Camina, inicio">
          <Image src="/marca/logo-solo-transparente.png" alt="" width={34} height={34} />
          CAMINA
        </Link>
        <nav className="lp-links" aria-label="Principal">
          <Link href="/" aria-current={activo === 'gente' ? 'page' : undefined}>Para vos</Link>
          <Link href="/comercios" aria-current={activo === 'comercios' ? 'page' : undefined}>Para comercios</Link>
        </nav>
        <Link href="/login" className="lp-login">Ingresar al panel</Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="lp-foot">
      <div className="wrap">
        <p>¿Dudas? Escribinos por WhatsApp al <a href={`https://wa.me/${WHATSAPP_NUMBER}`}>+591 627 14286</a>.</p>
        <nav aria-label="Enlaces">
          <Link href="/">Para vos</Link>
          <Link href="/comercios">Para comercios</Link>
          <Link href="/registro">Registrar mi comercio</Link>
          <Link href="/login">Ingresar al panel</Link>
          <Link href="/guia">Guía para comercios</Link>
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
        </nav>
        <p>© Camina, Bolivia</p>
      </div>
    </footer>
  );
}

// Tarjetas flotantes con premios reales (logo, premio y puntos).
export function FloatCards() {
  const items = [
    { l: LOCALES[2], p: LOCALES[2].premios[0], cls: 'fc1' },
    { l: LOCALES[1], p: LOCALES[1].premios[0], cls: 'fc2' },
    { l: LOCALES[0], p: LOCALES[0].premios[1], cls: 'fc3' },
  ];
  return (
    <>
      {items.map(({ l, p, cls }) => (
        <div className={`fcard ${cls}`} key={cls}>
          <Image src={l.logo} alt="" width={44} height={44} />
          <div>
            <b>{l.nombre}</b>
            <span>{p.nombre}</span>
            <em>{p.detalle} · {p.puntos} puntos</em>
          </div>
        </div>
      ))}
    </>
  );
}

// Cinta con los premios reales que ya están en la app.
export function Cinta() {
  const items = LOCALES.flatMap((l) => l.premios.map((p) => `${l.nombre}: ${p.nombre} · ${p.detalle} · ${p.puntos} puntos`));
  const fila = [...items, ...items];
  return (
    <div className="cinta" aria-label="Premios que ya están en Camina">
      <div className="cinta-in">
        {fila.map((t, i) => (
          <span key={i} aria-hidden={i >= items.length}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export function Reglas() {
  return (
    <section className="lp-sec reglas">
      <div className="wrap">
        <div className="stats">
          <InView className="stat">
            <b><Counter to={1000} /></b>
            <span>pasos son <em>1 punto</em></span>
          </InView>
          <InView className="stat" delay={120}>
            <b>hasta <Counter to={20} /></b>
            <span>puntos por día</span>
          </InView>
          <InView className="stat" delay={240}>
            <b><Counter to={6} /></b>
            <span>dígitos tiene tu código de canje</span>
          </InView>
          <InView className="stat" delay={360}>
            <b><Counter to={15} /></b>
            <span>minutos dura tu código</span>
          </InView>
        </div>
      </div>
    </section>
  );
}

export function Mapa({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="lp-sec night" id="mapa">
      <div className="wrap">
        <Kinetic text={titulo} />
        <p className="lead">{texto}</p>
      </div>
      <RealMap />
    </section>
  );
}

export function Locales() {
  return (
    <section className="lp-sec" id="locales">
      <div className="wrap">
        <Kinetic text="Ya están en Camina." />
        <p className="lead">Los primeros comercios de Tarija, con los premios que hoy podés canjear.</p>
        <div className="locs">
          {LOCALES.map((l, k) => (
            <InView as="article" className="loc" key={l.id} delay={k * 120}>
              <div className="loc-cover">
                <Image src={l.portada} alt="" width={640} height={360} />
                <Image className="loc-logo" src={l.logo} alt={`Logo de ${l.nombre}`} width={72} height={72} />
              </div>
              <h3>{l.nombre}</h3>
              <p className="loc-cat">{l.categoria} · {l.direccion}</p>
              <ul>
                {l.premios.map((p) => (
                  <li key={p.nombre}>
                    <span>{p.nombre}<small>{p.detalle}</small></span>
                    <b>{p.puntos} puntos</b>
                  </li>
                ))}
              </ul>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Galeria() {
  const pant = [
    ['Tu día en un vistazo', 'Pasos, puntos y los locales cerca tuyo.', CAP.inicio],
    ['Canjear', 'Buscá comercios y mirá sus premios.', CAP.canjes],
    ['La ficha del local', 'Fotos, horarios, redes y premios.', CAP.fripaps],
    ['Grupos', 'Caminá en equipo y sumá con tus amigos.', CAP.grupos],
    ['Actividad', 'Tu semana, tu meta y tu racha.', CAP.actividad],
  ] as const;
  return (
    <section className="lp-sec alt" id="app">
      <div className="wrap"><Kinetic text="Así se ve Camina." /></div>
      <div className="gal" tabIndex={0} aria-label="Pantallas de la app">
        {pant.map(([t, d, src]) => (
          <figure key={t}>
            <div className="phone"><Image src={src} alt={`Pantalla: ${t}`} width={780} height={1688} sizes="260px" /></div>
            <figcaption><b>{t}</b>{d}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Objetivos() {
  const bloques = [
    {
      t: 'Salud',
      d: 'Una meta diaria de pasos que vos elegís y una racha que te empuja a no cortar. Mirás tu semana en un gráfico y sabés cómo venís.',
      img: CAP.actividad,
      alt: 'Pantalla de actividad con los pasos de la semana',
    },
    {
      t: 'Motivación',
      d: 'Puntos por cada 1.000 pasos, retos y grupos para caminar con amigos. Es más fácil sostener el hábito cuando hay con quién.',
      img: CAP.grupos,
      alt: 'Pantalla de grupos con la meta semanal',
    },
    {
      t: 'Moverte por tu barrio',
      d: 'Tus pasos te llevan a conocer locales de tu zona y a probar cosas nuevas. Salís a caminar y volvés con un premio.',
      img: CAP.canjes,
      alt: 'Pantalla de canjes con comercios',
    },
  ];
  return (
    <section className="lp-sec night" id="objetivos">
      <div className="wrap">
        <Kinetic text="Caminar te hace bien. Ahora también te premia." />
        <div className="goals">
          {bloques.map((b, i) => (
            <InView as="article" className="goal" key={b.t}>
              <div className="goal-txt">
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </div>
              <Parallax speed={i % 2 ? 0.05 : 0.09} className="goal-ph">
                <div className="phone"><Image src={b.img} alt={b.alt} width={780} height={1688} sizes="270px" /></div>
              </Parallax>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Salud() {
  return (
    <section className="lp-sec" id="salud">
      <div className="wrap">
        <Kinetic text="Lo que dice la ciencia sobre caminar." />
        <div className="facts">
          <InView as="article" className="fact">
            <b>150 a 300 min</b>
            <h3>por semana</h3>
            <p>La OMS recomienda a los adultos entre 150 y 300 minutos de actividad física aeróbica moderada por semana.</p>
            <a href="https://www.paho.org/es/noticias/26-11-2020-cada-movimiento-cuenta-para-mejorar-salud-dice-oms" target="_blank" rel="noopener noreferrer">Fuente: OPS/OMS, 2020</a>
          </InView>
          <InView as="article" className="fact" delay={140}>
            <b>51% menos</b>
            <h3>riesgo de morir por cualquier causa</h3>
            <p>En adultos de 40 años o más, dar 8.000 pasos por día se asoció con un 51% menos de riesgo que dar 4.000. Es un estudio observacional: muestra una asociación, no una garantía.</p>
            <a href="https://www.nih.gov/news-events/news-releases/higher-daily-step-count-linked-lower-all-cause-mortality" target="_blank" rel="noopener noreferrer">Fuente: NIH, estudio publicado en JAMA, 2020</a>
          </InView>
        </div>
      </div>
    </section>
  );
}

export function DescargaGente() {
  return (
    <section className="lp-final" id="descargar">
      <div className="wrap">
        <Kinetic text="Descargá Camina y empezá a caminar." as="h2" />
        <p>Camina está por llegar a Google Play y App Store. Escribinos y te avisamos apenas esté lista.</p>
        <div className="stores">
          <span className="store" aria-disabled="true"><small>Próximamente en</small>Google Play</span>
          <span className="store" aria-disabled="true"><small>Próximamente en</small>App Store</span>
        </div>
        <div className="lp-cta">
          <a className="lp-btn mint" href={WA_AVISAME}>Avisame cuando salga</a>
          <Link className="lp-btn ghost" href="/comercios">Tengo un comercio</Link>
        </div>
      </div>
    </section>
  );
}

export function PasosComercio() {
  const pasos = [
    ['Te registrás en el panel', 'Es gratis. Cargás tu local, tu logo, tus fotos y tu primer premio.'],
    ['Elegís tu plan o hablás con nosotros', 'Al terminar de registrarte elegís cómo empezar. Si tenés dudas, escribinos por WhatsApp antes de decidir.'],
    ['Revisamos tu comercio', 'El equipo de Camina lo revisa antes de que aparezca en la app.'],
    ['Aparecés en el mapa', 'La gente de tu zona te encuentra y canjea. Vos confirmás cada código desde el celular.'],
  ];
  return (
    <section className="lp-sec" id="como-sumarte">
      <div className="wrap">
        <Kinetic text="Cómo sumás tu comercio." />
        <ol className="flow">
          {pasos.map(([t, d], i) => (
            <InView as="li" key={t} delay={i * 110}>
              <span className="num">{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </InView>
          ))}
        </ol>
        <div className="lp-cta">
          <Link className="lp-btn dark" href="/registro">Registrar mi comercio</Link>
          <a className="lp-btn line" href={WA_COMERCIO}>Tengo una duda: WhatsApp</a>
        </div>
      </div>
    </section>
  );
}

const BENEFICIOS = [
  ['Aparecés en el mapa', 'La gente de tu zona te encuentra cuando elige dónde canjear.'],
  ['Vos elegís el premio', 'Un regalo o un descuento, con tus horarios y tus condiciones.'],
  ['Vos ponés el cupo', 'Definís cuántos cupones das por día, o ilimitados.'],
  ['Se valida en segundos', 'El cliente muestra un código de 6 números y lo confirmás desde el celular.'],
  ['Una vez cada 14 días', 'Cada persona canjea en tu local como máximo cada 14 días, así el beneficio alcanza para más gente.'],
  ['Empezás gratis', 'El plan Primer Paso no tiene costo fijo. Cambiás de plan cuando quieras.'],
];

export function BeneficiosComercio() {
  return (
    <section className="lp-sec night" id="beneficios">
      <div className="wrap">
        <Kinetic text="Visitas, no impresiones." />
        <p className="lead">Cada canje es una persona real parada en tu local, con ganas de conocerte.</p>
        <ul className="ben">
          {BENEFICIOS.map(([t, d], i) => (
            <InView as="li" key={t} delay={(i % 2) * 100}>
              <b>{t}</b>
              <span>{d}</span>
            </InView>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PanelComercio() {
  return (
    <section className="lp-sec alt" id="panel">
      <div className="wrap panel-row">
        <div>
          <Kinetic text="Todo desde tu panel." as="h2" />
          <p className="lead">Cargás tu local y tus premios, confirmás los códigos desde el celular y mirás tus canjes. Sin instalar nada.</p>
          <div className="lp-cta">
            <Link className="lp-btn dark" href="/registro">Crear mi cuenta</Link>
            <Link className="lp-btn line" href="/login">Ya tengo cuenta</Link>
          </div>
        </div>
        <Parallax speed={0.05}>
          <div className="laptop"><Image src="/web/panel.jpg" alt="Panel de comercios con el perfil de un local" width={1100} height={1000} /></div>
        </Parallax>
      </div>
    </section>
  );
}

export function Planes() {
  return (
    <section className="lp-sec" id="planes">
      <div className="wrap">
        <Kinetic text="Los planes." />
        <p className="lead">Te registrás gratis y elegís tu plan al terminar. Para pasar a un plan pago, o si tenés dudas, hablamos por WhatsApp.</p>
        <div className="planes">
          {PLANS.map((p, i) => (
            <InView as="article" key={p.id} className={`plan${p.featured ? ' feat' : ''}`} delay={i * 120}>
              <h3>{p.name}</h3>
              <p className="price">{p.price}</p>
              <p className="blurb">{p.blurb}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {p.id === 'primer_paso' ? (
                <Link className="lp-btn dark plan-cta" href="/registro">Registrarme gratis</Link>
              ) : (
                <a className="lp-btn mint plan-cta" href={whatsappLink(p.name, p.price)}>Hablar por WhatsApp</a>
              )}
            </InView>
          ))}
        </div>
        <div className="fund">
          <b>Programa fundador: 3 meses gratis de Paso Firme.</b>
          <span>Para los primeros 20 comercios que se suman. Pedilo por WhatsApp.</span>
          <a className="lp-btn dark" href={WA('Hola! Quiero pedir mi cupo del programa fundador de Camina.')}>Pedir mi cupo</a>
        </div>
      </div>
    </section>
  );
}

export function CierreComercio() {
  return (
    <section className="lp-final">
      <div className="wrap">
        <Kinetic text="Sumá tu comercio hoy." />
        <p>Registrate en el panel o escribinos por WhatsApp si querés hablar antes.</p>
        <div className="lp-cta">
          <Link className="lp-btn mint" href="/registro">Registrar mi comercio</Link>
          <a className="lp-btn ghost" href={WA_COMERCIO}>Hablar por WhatsApp</a>
        </div>
      </div>
    </section>
  );
}

export function SoyComercio() {
  return (
    <section className="lp-sec alt soy">
      <div className="wrap">
        <Kinetic text="¿Tenés un comercio?" />
        <p className="lead">Sumá tu local a Camina gratis y recibí personas que ya van caminando por tu barrio.</p>
        <div className="lp-cta">
          <Link className="lp-btn dark" href="/comercios">Ver cómo sumarme</Link>
          <Link className="lp-btn line" href="/registro">Registrar mi comercio</Link>
        </div>
      </div>
    </section>
  );
}
