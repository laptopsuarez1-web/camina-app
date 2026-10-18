import Image from 'next/image';
import Link from 'next/link';
import { PLANS, WHATSAPP_NUMBER, LANZAMIENTO, LANZAMIENTO_NOTA } from '@/lib/plans';
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
  gruposActivo: '/web/cap/grupos-activo.jpg',
  eventos: '/web/cap/eventos.jpg',
  canjeResena: '/web/cap/canje-resena.jpg',
  historia: '/web/cap/historia.jpg',
  retos: '/web/cap/retos.jpg',
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
        <InView className="reparto">
          <b>Un local distinto cada vez.</b> Podés volver a canjear en el mismo local pasados 7 días: así descubrís lugares nuevos y todos los comercios tienen su oportunidad.
        </InView>
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
    ['Creás tu perfil en el panel', 'Es gratis con cualquier plan. Cargás tu local, tu logo, tus fotos y tu primer premio.'],
    ['Elegís tu plan al terminar', 'Empezás gratis, o elegís Paso Firme o Paso Adelante y pagás con el QR. Si sos de los primeros 20, pedís tu cupo fundador por WhatsApp y te habilitamos.'],
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
  ['Todos los locales tienen su oportunidad', 'Nadie puede volver a canjear en el mismo local hasta pasados 7 días. Los canjes se reparten entre todos los comercios y ningún cliente acapara tu cupo.'],
  ['Reseñas en Google Maps', 'Después de cada canje confirmado, la app invita a la persona a calificar tu local en Google Maps, con el link que cargás en tu ficha.'],
  ['Historias que te muestran', 'Quien canjea puede subir una historia de Instagram con el sticker de Camina y gana 5 Puntos extra cuando el equipo de Camina la aprueba.'],
  ['Más visibilidad', 'Tu ficha con fotos, horarios y redes, tu pin en el mapa y, si querés, eventos y sorteos que promocionan tu local dentro de la app.'],
  ['Tu ficha completa', 'Fotos de tu local, horarios, dirección y tus redes (Instagram, Facebook, TikTok y WhatsApp) en un solo lugar.'],
  ['Tus días y horarios', 'Cada premio puede valer solo ciertos días y horas, por ejemplo de 16:00 a 23:00, o solo consumiendo en el local.'],
  ['Llená tus horas muertas', 'Poné el premio justo en las horas en que tu local está vacío, como la media tarde o los días flojos. La gente llega cuando más la necesitás y no regalás de más en las horas de mucho movimiento.'],
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
        <p className="lead">Te registrás y creás tu perfil con cualquier plan. Al terminar elegís el plan (con QR si es pago). ¿Dudas? Escribinos por WhatsApp.</p>
        <div className="planes">
          {PLANS.map((p, i) => (
            <InView as="article" key={p.id} className={`plan${p.featured ? ' feat' : ''}`} delay={i * 120}>
              <h3>{p.name}</h3>
              <p className="price">{p.price}</p>
              {p.id !== 'primer_paso' && <p className="launch">{LANZAMIENTO}. {LANZAMIENTO_NOTA}</p>}
              <p className="blurb">{p.blurb}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link className={`lp-btn ${p.id === 'primer_paso' ? 'dark' : 'mint'} plan-cta`} href="/registro">
                {p.id === 'primer_paso' ? 'Registrarme gratis' : 'Registrarme y elegir este plan'}
              </Link>
            </InView>
          ))}
        </div>
        <div className="fund">
          <b>Cupo fundador: 3 meses gratis de Paso Firme.</b>
          <span>Para los primeros 20 comercios. Creás tu perfil en el panel con cualquier plan, nos escribís por WhatsApp y te habilitamos en la app y en el panel.</span>
          <a className="lp-btn dark" href={WA('Hola! Quiero pedir mi cupo fundador de Camina.')}>Pedir mi cupo fundador</a>
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

type Bloque = { t: string; d: string; img: string; alt: string; tag?: string };

function Bloques({ items, dark = true }: { items: Bloque[]; dark?: boolean }) {
  return (
    <div className={`goals${dark ? '' : ' light'}`}>
      {items.map((b, i) => (
        <InView as="article" className="goal" key={b.t}>
          <div className="goal-txt">
            <h3>{b.t}</h3>
            <p>{b.d}</p>
            {b.tag && <span className="ej">{b.tag}</span>}
          </div>
          <Parallax speed={i % 2 ? 0.05 : 0.09} className="goal-ph">
            <div className="phone"><Image src={b.img} alt={b.alt} width={780} height={1688} sizes="270px" /></div>
          </Parallax>
        </InView>
      ))}
    </div>
  );
}

export function EquipoRetos() {
  return (
    <section className="lp-sec night" id="equipo">
      <div className="wrap">
        <Kinetic text="Caminá en equipo, sumá en grande." />
        <Bloques
          items={[
            {
              t: 'Grupos',
              d: 'Creá un grupo con amigos o familia, sumen pasos juntos y miren el ranking de la semana. Es más fácil salir a caminar cuando hay con quién.',
              img: CAP.gruposActivo,
              alt: 'Pantalla de un grupo con ranking de pasos',
              tag: 'Ejemplo ilustrativo con datos de prueba',
            },
            {
              t: 'Retos Camina',
              d: 'Retos que te empujan a moverte más y suman puntos extra: invitar amigos, completar metas de pasos y más.',
              img: CAP.retos,
              alt: 'Pantalla de los retos de Camina',
            },
            {
              t: 'Eventos y sorteos',
              d: 'Locales y Camina publican eventos y sorteos dentro de la app. Caminá, cumplí el requisito y participá.',
              img: CAP.eventos,
              alt: 'Pantalla de eventos y sorteos',
              tag: 'Ejemplo ilustrativo con datos de prueba',
            },
          ]}
        />
      </div>
    </section>
  );
}

export function PublicidadComercio() {
  return (
    <section className="lp-sec night" id="publicidad">
      <div className="wrap">
        <Kinetic text="Promocioná tu local en eventos y sorteos." />
        <p className="lead">
          Además de los premios por canje, podés publicar un evento o un sorteo dentro de la app. Cada publicación dura hasta 2 semanas y cuesta Bs 200
          (Bs 400 si solo querés publicidad, sin canjes). Lo revisamos y se publica cuando confirmamos el pago por WhatsApp.
        </p>
        <Bloques
          items={[
            {
              t: 'Tu local, frente a quienes caminan',
              d: 'Tu evento o sorteo aparece en la app de Camina. Podés pedir un requisito de pasos para participar y así atraer gente que ya sale a caminar.',
              img: CAP.eventos,
              alt: 'Pantalla de eventos y sorteos de la app',
              tag: 'Ejemplo ilustrativo con datos de prueba',
            },
          ]}
        />
        <div className="lp-cta">
          <Link className="lp-btn mint" href="/registro">Registrar mi comercio</Link>
          <a className="lp-btn ghost" href={WA('Hola! Quiero promocionar mi local con un evento o sorteo en Camina.')}>Consultar por WhatsApp</a>
        </div>
      </div>
    </section>
  );
}

export function CanjeResena() {
  return (
    <section className="lp-sec" id="resenas">
      <div className="wrap">
        <Kinetic text="Después del canje, tu local sigue sumando." />
        <Bloques
          dark={false}
          items={[
            {
              t: 'Reseñas en Google Maps',
              d: 'Cuando confirmás un canje, la app le pregunta a la persona si dejaría una reseña y le abre tu ficha de Google Maps para calificarte. Es opcional y el link lo cargás vos en tu perfil.',
              img: CAP.canjeResena,
              alt: 'Pantalla de la app después de un canje con la invitación a calificar en Google Maps',
            },
            {
              t: 'Historias en Instagram',
              d: 'La persona arma una historia con el sticker de Camina y la sube a Instagram. Si el equipo de Camina la aprueba, gana 5 Puntos. Vos te mostrás en las redes de quienes te visitan.',
              img: CAP.historia,
              alt: 'Pantalla de la app para subir una historia después de un canje',
            },
          ]}
        />
      </div>
    </section>
  );
}

export function AppsSimilares() {
  return (
    <section className="lp-sec alt" id="apps-similares">
      <div className="wrap">
        <Kinetic text="Qué pasa en apps similares." />
        <div className="stat-big">
          <b>5 de cada 10</b>
          <span>
            canjes traen una compra extra en el local, según{' '}
            <a href="https://www.pasito.app/comercios" target="_blank" rel="noopener noreferrer">Pasito</a>, una app argentina que también cambia pasos por premios
            (<a href="https://www.lanacion.com.ar/tecnologia/la-aplicacion-argentina-pasito-supero-el-millon-de-usuarios-en-cuatro-meses-nid16102026/" target="_blank" rel="noopener noreferrer">La Nación, 16/10/2026</a>).
          </span>
        </div>
        <p className="lead">
          Es un dato de otra app, sin metodología publicada, y no es una promesa de resultados de Camina. Lo que sí podemos decirte es qué cambia entre planes:
          con Primer Paso tenés un premio 100% gratis y, con él, un descuento; con Paso Firme y Paso Adelante podés combinar regalos y descuentos y dar cupones sin límite, para que
          el premio sea la puerta y la compra extra quede de tu lado.
        </p>
      </div>
    </section>
  );
}

export function Fidelidad({ para }: { para: 'gente' | 'comercios' }) {
  const local = LOCALES.find((l) => l.id === 'fripaps')!;
  const texto =
    para === 'gente'
      ? 'Cada local que se suma a la tarjeta tiene su propio premio de fidelidad. Canjeá 5 veces en el mismo local y ganás ese premio. Tus tarjetas aparecen cuando entrás a verlas, sin tapar el resto de la app.'
      : 'Elegís el premio de fidelidad de tu local. Tus clientes completan 5 canjes en tu local y lo ganan: más motivos para volver. Está incluida en los planes de Bs 100 y Bs 300, no en el gratis.';
  const pasos =
    para === 'gente'
      ? [
          ['Canjeá en tu local favorito', 'Cada canje confirmado suma un sello a tu tarjeta de ese local.'],
          ['Pasan 7 días entre canjes', 'Así probás otros lugares y todos los comercios tienen su oportunidad.'],
          ['Al llegar a 5, ganás el premio', 'El premio de fidelidad lo elige cada local.'],
        ]
      : [
          ['Activás la tarjeta', 'Desde tu panel, con los planes de Bs 100 o Bs 300.'],
          ['Elegís tu premio de fidelidad', 'El que quieras darle a tus clientes más constantes.'],
          ['Tus clientes vuelven', 'Cada canje confirmado suma un sello; con 5 se llevan el premio.'],
        ];
  return (
    <section className="lp-sec night" id="fidelidad">
      <div className="wrap fid">
        <div>
          <Kinetic text="Tarjeta de fidelidad." />
          <p className="lead">{texto}</p>
          <ol className="fid-steps">
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
        <InView className="fid-card">
          <div className="fid-cover">
            <Image src={local.portada} alt={`Foto de ${local.nombre}`} fill sizes="420px" />
            <Image className="fid-logo" src={local.logo} alt="" width={64} height={64} />
          </div>
          <div className="fid-body">
            <h3>{local.nombre}</h3>
            <div className="fid-real">
              <div className="fid-head">
                <b>Tu tarjeta de fidelidad</b>
                <span className="fid-pill">3 de 5</span>
              </div>
              <div className="fid-row">
                {[1, 2, 3, 4, 5].map((n) =>
                  n <= 3 ? (
                    <Image key={n} className="coin" src="/web/camina-coin.png" alt="" width={72} height={72} />
                  ) : (
                    <span key={n} className="empty">{n}</span>
                  ),
                )}
                <span className="gift" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="#8F6307" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="8" width="18" height="4" rx="1" />
                    <path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 1 1 0 5" />
                  </svg>
                </span>
              </div>
              <p>Te faltan 2 canjes para tu premio: Panchito gratis.</p>
            </div>
          </div>
        </InView>
      </div>
    </section>
  );
}

const EXTRAS_GENTE = [
  ['Invitá amigos y ganá 5 puntos', 'Compartí tu link: recibís 5 puntos cuando tu amigo se registra y consigue su primer punto.'],
  ['Historias que suman', 'Subí una historia de tu canje a Instagram y ganá 5 puntos cuando el equipo de Camina la aprueba.'],
  ['Favoritos y locales disponibles ahora', 'Guardá tus locales favoritos y filtrá los que tienen premios disponibles en este momento.'],
  ['Tu racha y tu calendario', 'Mirás tus días con objetivo cumplido, tu semana en un gráfico y tu meta diaria, que vos elegís.'],
  ['Tu ubicación, solo cuando la necesitás', 'La usamos en el momento para mostrarte locales cerca y no la guardamos. Tampoco vendemos tus datos.'],
  ['Premios reales, cerca tuyo', 'Cada canje lo confirma el local con un código de 6 números, en persona, en tu barrio.'],
];

export function MasParaGente() {
  return (
    <section className="lp-sec night" id="mas">
      <div className="wrap">
        <Kinetic text="Y hay más para vos." />
        <ul className="ben">
          {EXTRAS_GENTE.map(([t, d], i) => (
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
