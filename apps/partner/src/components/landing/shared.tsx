import Image from 'next/image';
import Link from 'next/link';
import { PLANS, WHATSAPP_NUMBER, LANZAMIENTO, LANZAMIENTO_NOTA } from '@/lib/plans';
import { InView, Kinetic, Counter, Parallax } from './Motion';
import { LOCALES } from './locales';
import RealMap from './RealMap';
import ModoToggle from './ModoToggle';

export const WA = (texto: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
export const WA_COMERCIO = WA('Hola! Tengo una duda sobre cómo sumar mi comercio a Camina.');
export const EMAIL_AVISAME = `mailto:caminaappbo@gmail.com?subject=${encodeURIComponent('Avísenme cuando Camina esté disponible')}&body=${encodeURIComponent('Hola! Quiero que me avisen por correo cuando Camina esté disponible en la tienda de mi celular.')}`;

export const CAP = {
  inicio: '/web/cap/inicio.jpg',
  actividad: '/web/cap/actividad.jpg',
  canjes: '/web/cap/canjes.jpg',
  ficha: '/web/cap/ficha.jpg',
  grupos: '/web/cap/grupos.jpg',
  grupo: '/web/cap/grupo.jpg',
  grupoRanking: '/web/cap/grupo-ranking.jpg',
  grupoChat: '/web/cap/grupo-chat.jpg',
  grupoReto: '/web/cap/grupo-reto.jpg',
  grupoColor: '/web/cap/grupo-color.jpg',
  grupoMeta: '/web/cap/grupo-meta.jpg',
  grupoInvitar: '/web/cap/grupo-invitar.jpg',
  puntos: '/web/cap/puntos.jpg',
  eventos: '/web/cap/eventos.jpg',
  desafios: '/web/cap/desafios.jpg',
  retos: '/web/cap/retos.jpg',
  rachas: '/web/cap/rachas.jpg',
  ranking: '/web/cap/ranking.jpg',
  perfil: '/web/cap/perfil.jpg',
  fichaAmigo: '/web/cap/ficha-amigo.jpg',
  fondoPerfil: '/web/cap/fondo-perfil.jpg',
  resenaHistoria: '/web/cap/resena-historia.jpg',
  historia: '/web/cap/historia.jpg',
};

// "Así se ve Camina": cada pantalla en claro y en oscuro (el interruptor de la galería elige cuál se ve).
const CAP_DARK: Record<string, string> = Object.fromEntries(
  Object.values(CAP).map((c) => [c, c.replace('.jpg', '-dark.jpg')]),
);

type ShotProps = { src: string; alt: string; width: number; height: number; sizes?: string; priority?: boolean };
export function Shot(props: ShotProps) {
  return <Image {...props} />;
}

export function Nav({ activo }: { activo: 'gente' | 'comercios' }) {
  return (
    <header className="lp-nav">
      <div className="wrap">
        <Link href="/" className="lp-brand" aria-label="Camina, inicio">
          <Image src="/marca/logo-solo-transparente.png" alt="" width={34} height={34} />
          CAMINA
        </Link>
        <nav className="lp-links" aria-label="Principal">
          <Link href="/" aria-current={activo === 'gente' ? 'page' : undefined}>Para ti</Link>
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
        <p>¿Dudas? Escríbenos por WhatsApp al <a href={`https://wa.me/${WHATSAPP_NUMBER}`}>+591 627 14286</a>.</p>
        <nav aria-label="Enlaces">
          <Link href="/">Para ti</Link>
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

// Tarjetas flotantes de vidrio con lo que hace la app (reglas reales: 1.000 pasos = 1 punto, 5 puntos por invitar).
const ICO = {
  pasos: <Image className="ico-logo" src="/marca/logo-solo-transparente.png" alt="" width={64} height={64} />,
  trofeo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11" /><path d="M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11" /><path d="M12 13v4" /><path d="M8.5 20h7" /><path d="M10 17h4v3h-4z" /></svg>,
  racha: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9Z" /></svg>,
  amigos: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .7 3 2.7 3 5" /></svg>,
  regalo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 1 1 0 5" /></svg>,
  vidrio: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 7v6c0 4 3.4 7 8 8 4.6-1 8-4 8-8V7l-8-4Z" /></svg>,
  grupo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="3" /><circle cx="5.5" cy="10" r="2.3" /><circle cx="18.5" cy="10" r="2.3" /><path d="M7 20c0-3 2.2-5 5-5s5 2 5 5M1.5 19c0-2 1.5-3.5 3.5-3.5M22.5 19c0-2-1.5-3.5-3.5-3.5" /></svg>,
  grafico: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-6" /></svg>,
  camara: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="3" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8.5 7 10 4h4l1.5 3" /></svg>,
  calendario: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>,
  meta: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></svg>,
  ubicacion: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>,
};

export function FloatCards({ para = 'gente' }: { para?: 'gente' | 'comercios' }) {
  if (para === 'comercios') {
    const real = [
      { l: LOCALES[2], p: LOCALES[2].premios[0], cls: 'fc1' },
      { l: LOCALES[1], p: LOCALES[1].premios[0], cls: 'fc2' },
      { l: LOCALES[0], p: LOCALES[0].premios[1], cls: 'fc3' },
    ];
    return (
      <>
        {real.map(({ l, p, cls }) => (
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
  const items = [
    { cls: 'fc1', ico: ICO.pasos, t: 'Cada 1.000 pasos', d: 'Se vuelven puntos', e: '1 punto' },
    { cls: 'fc2', ico: ICO.racha, t: 'Cada día', d: 'Tope diario de puntos', e: 'hasta 20 puntos' },
    { cls: 'fc3', ico: ICO.amigos, t: 'Invita a un amigo', d: 'Cuando consigue su primer punto', e: '+5 puntos' },
  ];
  return (
    <>
      {items.map(({ cls, ico, t, d, e }) => (
        <div className={`fcard ${cls}`} key={cls}>
          <span className="fc-ico">{ico}</span>
          <div>
            <b>{t}</b>
            <span>{d}</span>
            <em>{e}</em>
          </div>
        </div>
      ))}
    </>
  );
}

// Cinta con lo que tiene la app.
const CINTA = ['Pasos que se vuelven puntos', 'Meta diaria que eliges', 'Racha y calendario', 'Grupos y ranking', 'Retos Camina', 'Desafíos y eventos', 'Comparte tu progreso', 'Modo claro y oscuro', 'Tu ubicación solo cuando la necesitas'];
export function Cinta({ para = 'gente' }: { para?: 'gente' | 'comercios' }) {
  const base = para === 'comercios' ? LOCALES.flatMap((l) => l.premios.map((p) => `${l.nombre}: ${p.nombre} · ${p.detalle} · ${p.puntos} puntos`)) : CINTA;
  const fila = [...base, ...base];
  return (
    <div className="cinta" aria-label={para === 'comercios' ? 'Premios que ya están en Camina' : 'Lo que tiene Camina'}>
      <div className="cinta-in">
        {fila.map((t, i) => (
          <span key={i} aria-hidden={i >= base.length}>{t}</span>
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
            <b><Counter to={4} /></b>
            <span>números es el código del local</span>
          </InView>
          <InView className="stat" delay={360}>
            <b><Counter to={90} /></b>
            <span>días de vigencia de cada punto</span>
          </InView>
        </div>
        <InView className="reparto">
          <b>Un local distinto cada vez.</b> Puedes volver a canjear en el mismo local pasados 14 días (dos semanas): así descubres lugares nuevos y todos los comercios tienen su oportunidad.
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
        <p className="lead">Los primeros comercios de Tarija. Algunos ya tienen premios para canjear.</p>
        <div className="locs">
          {LOCALES.map((l, k) => (
            <InView as="article" className="loc" key={l.id} delay={k * 120}>
              <div className="loc-head">
                <Image className="loc-logo" src={l.logo} alt={`Logo de ${l.nombre}`} width={56} height={56} />
                <div>
                  <h3>{l.nombre}</h3>
                  <p className="loc-cat">{l.categoria}</p>
                </div>
              </div>
              {l.premios.length > 0 ? (
                <ul>
                  {l.premios.map((p) => (
                    <li key={p.nombre}>
                      <span>{p.nombre}<small>{p.detalle}</small></span>
                      <b>{p.puntos} puntos</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="loc-dir">{l.direccion}</p>
              )}
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Galeria() {
  const pant = [
    ['Tu día en un vistazo', 'Tus pasos de hoy, tus Puntos y tu racha.', CAP.inicio],
    ['Actividad', 'Tu semana, tu meta y tu racha.', CAP.actividad],
    ['Grupos', 'Camina en equipo con tus amigos.', CAP.grupos],
    ['Tu grupo', 'Podio, meta compartida y reto de la semana.', CAP.grupo],
    ['Eventos', 'Experiencias con fecha y lugar.', CAP.eventos],
    ['Desafíos', 'Súmate a desafíos con premios.', CAP.desafios],
    ['Retos Camina', 'Metas extra que suman Puntos.', CAP.retos],
    ['Canjear', 'Busca comercios y mira sus premios.', CAP.canjes],
    ['La ficha del local', 'Fotos, horarios, redes y premios.', CAP.ficha],
    ['Tus Puntos', 'Tu saldo, tus movimientos y cómo invitar amigos.', CAP.puntos],
    ['Perfil', 'Tus datos, tus amigos y tus permisos.', CAP.perfil],
    ['La ficha de un amigo', 'Su semana, su racha y cómo vas tú comparado con él.', CAP.fichaAmigo],
    ['Elige el fondo de tu perfil', 'Seis fondos dibujados para tu perfil y para la ficha que ven tus amigos.', CAP.fondoPerfil],
  ] as const;
  return (
    <section className="lp-sec alt" id="app" data-modo="oscuro">
      <div className="wrap"><Kinetic text="Así se ve Camina." /><ModoToggle /></div>
      <div className="gal" tabIndex={0} aria-label="Pantallas de la app">
        {pant.map(([t, d, src]) => (
          <figure key={t}>
            <div className="phone">
              <Image className="cap-l" src={src} alt={`Pantalla: ${t}`} width={780} height={1688} sizes="260px" />
              <Image className="cap-d" src={CAP_DARK[src] ?? src} alt="" width={780} height={1688} sizes="260px" />
            </div>
            <figcaption><b>{t}</b>{d}</figcaption>
          </figure>
        ))}
      </div>
      <p className="wrap gal-nota">Los pasos y puntos son de ejemplo, igual que el grupo y sus integrantes. Los eventos y desafíos son ejemplos de lo que puede haber. Los locales y sus premios son reales.</p>
    </section>
  );
}

export function Objetivos() {
  const bloques = [
    {
      t: 'Salud',
      d: 'Una meta diaria de pasos que tú eliges y una racha que te empuja a no cortar. Miras tu semana en un gráfico y sabes cómo vienes.',
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
      t: 'Moverte por tu zona',
      d: 'Tus pasos te llevan a conocer locales de tu zona y a probar cosas nuevas. Sales a caminar y vuelves con un premio.',
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
                <div className="phone"><Shot src={b.img} alt={b.alt} width={780} height={1688} sizes="270px" /></div>
              </Parallax>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DiaADia() {
  return (
    <section className="lp-sec night" id="dia-a-dia">
      <div className="wrap">
        <Kinetic text="Tu día en Camina, paso a paso." />
        <Bloques
          items={[
            {
              t: 'Tus Puntos, con solo abrir la app',
              d: 'Los pasos cuentan el día en que abres Camina. Con abrirla una vez al día, se acreditan los pasos de las 24 horas completas: en la pantalla de Inicio ves cuántos Puntos vas sumando. Si un día no la abres, ese día no suma.',
              img: CAP.inicio,
              alt: 'Pantalla de Inicio con los pasos del día, los Puntos que se acreditan, la racha y la meta',
            },
            {
              t: 'Tu racha',
              d: 'Tu racha cuenta los días seguidos con al menos 5.000 pasos, y cada 7 días sumas 5 Puntos. Si te saltas un día, vuelve a 0. Aparte está tu meta personal: la eliges tú en Perfil > Editar perfil y no cambia tu racha.',
              img: CAP.rachas,
              alt: 'Hoja Tus rachas con la racha y la meta personal',
            },
            {
              t: 'Tu semana, de un vistazo',
              d: 'La pantalla de Actividad muestra tus pasos de la semana en un gráfico, tu racha en el calendario y cuánto te falta para llegar a tu meta.',
              img: CAP.actividad,
              alt: 'Pantalla de Actividad con el gráfico de la semana y la racha',
            },
            {
              t: 'Tu app, a tu gusto',
              d: 'Desde Perfil eliges modo claro u oscuro y cuánto vidrio quieres ver en las tarjetas y la barra, desde sólido hasta cristal. Cada persona deja Camina como más le gusta.',
              img: CAP.perfil,
              alt: 'Pantalla de Perfil con el modo oscuro y el control de vidrio',
            },
          ]}
        />
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

// Cierre con la marca: solo el logo de Camina.
function MarcaFinal() {
  return (
    <InView className="marca-final">
      <Image className="marca-logo" src="/marca/logo-solo-transparente.png" alt="Logo de Camina" width={1024} height={1024} sizes="260px" />
    </InView>
  );
}

export function DescargaGente() {
  return (
    <section className="lp-final" id="descargar">
      <div className="wrap final-grid">
        <div>
          <Kinetic text="Descarga Camina y empieza a caminar." as="h2" />
          <p>Camina está por llegar a Google Play y App Store. Escríbenos por correo y te avisamos apenas esté lista.</p>
          <div className="stores">
            <span className="store" aria-disabled="true"><small>Próximamente en</small>Google Play</span>
            <span className="store" aria-disabled="true"><small>Próximamente en</small>App Store</span>
          </div>
          <div className="lp-cta">
            <a className="lp-btn mint" href={EMAIL_AVISAME}>Avísame cuando salga</a>
            <Link className="lp-btn ghost" href="/comercios">Tengo un comercio</Link>
          </div>
        </div>
        <MarcaFinal />
      </div>
    </section>
  );
}

export function PasosComercio() {
  const pasos = [
    ['Creas tu perfil en el panel', 'Es gratis con cualquier plan. Cargas tu local, tu logo, tus fotos y tu primer premio.'],
    ['Eliges tu plan al terminar', 'Empiezas gratis, o eliges Paso Firme o Paso Adelante y pagas con el QR. Si sos de los primeros 20, pides tu cupo fundador por WhatsApp y te habilitamos.'],
    ['Revisamos tu comercio', 'El equipo de Camina lo revisa antes de que aparezca en la app.'],
    ['Apareces en el mapa', 'La gente de tu zona te encuentra y canjea. Les dices el código de tu local y listo.'],
  ];
  return (
    <section className="lp-sec" id="como-sumarte">
      <div className="wrap">
        <Kinetic text="Cómo sumas tu comercio." />
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
  ['Apareces en el mapa', 'La gente de tu zona te encuentra cuando elige dónde canjear.'],
  ['Vos eliges el premio', 'Un regalo o un descuento, con tus horarios y tus condiciones.'],
  ['Vos pones el cupo', 'Defines cuántos cupones das por día, o ilimitados.'],
  ['Se valida en segundos', 'Le dices a tu cliente el código de 4 números de tu local, lo escribe en la app y el canje queda confirmado al instante.'],
  ['Todos los locales tienen su oportunidad', 'Nadie puede volver a canjear en el mismo local hasta pasados 14 días (dos semanas). Los canjes se reparten entre todos los comercios y ningún cliente acapara tu cupo.'],
  ['Reseñas en Google Maps', 'Después de cada canje confirmado, la app invita a la persona a calificar tu local en Google Maps, con el link que cargas en tu ficha.'],
  ['Historias que te muestran', 'Quien canjea puede subir una historia de Instagram con el sticker de Camina y gana 5 Puntos extra cuando el equipo de Camina la aprueba.'],
  ['Más visibilidad', 'Tu ficha con fotos, horarios y redes, tu pin en el mapa y, si quieres, eventos y sorteos que promocionan tu local dentro de la app.'],
  ['Tu ficha completa', 'Fotos de tu local, horarios, dirección y tus redes (Instagram, Facebook, TikTok y WhatsApp) en un solo lugar.'],
  ['Tus días y horarios', 'Cada premio puede valer solo ciertos días y horas, por ejemplo de 16:00 a 23:00, o solo consumiendo en el local.'],
  ['Llena tus horas muertas', 'Pon el premio justo en las horas en que tu local está vacío, como la media tarde o los días flojos. La gente llega cuando más la necesitas y no regalas de más en las horas de mucho movimiento.'],
  ['Empiezas gratis', 'El plan Primer Paso no tiene costo fijo. Cambias de plan cuando quieras.'],
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
          <p className="lead">Cargas tu local y tus premios, tienes el código de tu local y miras tus canjes. Sin instalar nada.</p>
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
        <p className="lead">Te registras y creas tu perfil con cualquier plan. Al terminar eliges el plan (con QR si es pago). ¿Dudas? Escríbenos por WhatsApp.</p>
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
          <b>Cupo fundador: 3 meses gratis de Paso Firme, desde que salga la app.</b>
          <span>Para los primeros 20 comercios. Creas tu perfil en el panel con cualquier plan, nos escribes por WhatsApp y te habilitamos en la app y en el panel.</span>
          <a className="lp-btn dark" href={WA('Hola! Quiero pedir mi cupo fundador de Camina.')}>Pedir mi cupo fundador</a>
        </div>
      </div>
    </section>
  );
}

export function CierreComercio() {
  return (
    <section className="lp-final">
      <div className="wrap final-grid">
        <div>
          <Kinetic text="Suma tu comercio hoy." />
          <p>Regístrate en el panel o escríbenos por WhatsApp si quieres hablar antes.</p>
          <div className="lp-cta">
            <Link className="lp-btn mint" href="/registro">Registrar mi comercio</Link>
            <a className="lp-btn ghost" href={WA_COMERCIO}>Hablar por WhatsApp</a>
          </div>
        </div>
        <MarcaFinal />
      </div>
    </section>
  );
}

export function SoyComercio() {
  return (
    <section className="lp-sec alt soy">
      <div className="wrap">
        <Kinetic text="¿Tienes un comercio?" />
        <p className="lead">Suma tu local a Camina gratis y recibe personas que ya van caminando por tu zona.</p>
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
            <div className="phone"><Shot src={b.img} alt={b.alt} width={780} height={1688} sizes="270px" /></div>
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
        <Kinetic text="Camina en equipo, suma en grande." />
        <Bloques
          items={[
            {
              t: 'Grupos',
              d: 'Crea un grupo con amigos o familia, elijan una meta semanal entre todos, sumen pasos juntos y miren el ranking. Pueden armar retos con Puntos en juego e invitar a más amigos cuando quieran.',
              img: CAP.grupos,
              alt: 'Pantalla de Grupos con un grupo de ejemplo y su meta de la semana',
              tag: 'Grupo de ejemplo',
            },
            {
              t: 'Retos Camina',
              d: 'Retos que te empujan a moverte más y suman puntos extra: invitar amigos, completar metas de pasos y más.',
              img: CAP.retos,
              alt: 'Pantalla de los retos de Camina',
            },
            {
              t: 'Eventos y sorteos',
              d: 'Locales y Camina publican eventos y sorteos dentro de la app. Camina, cumple el requisito y participa.',
              img: CAP.eventos,
              alt: 'Pantalla de eventos de ejemplo',
              tag: 'Ejemplo de lo que puede haber',
            },
          ]}
        />
      </div>
    </section>
  );
}

// Un grupo de ejemplo ("Caminantes del Centro", personas inventadas) recorrido pantalla por pantalla.
const GRUPO_PANT = [
  ['Elige la meta de la semana', 'Al crear el grupo, una ruedita de 1.000 en 1.000 pasos y atajos de 25.000 a 150.000. Se puede cambiar después.', CAP.grupoMeta],
  ['El podio de la semana', 'Se arma solo con los pasos de cada integrante desde el lunes. La corona es para quien más caminó.', CAP.grupo],
  ['Ranking del grupo', 'Todos los integrantes ordenados por pasos, y botón para compartir el ranking.', CAP.grupoRanking],
  ['Reto de la semana', 'Un desafío con Puntos en juego: cómo va cada integrante y cuánto le falta a cada uno para el primer puesto.', CAP.grupoReto],
  ['Elige el color y la foto del grupo', 'Cada grupo tiene su propia foto y un fondo a elegir: violeta, esmeralda, océano, atardecer, rosa o dorado.', CAP.grupoColor],
  ['Invitar amigos al grupo', 'Eliges a tus amigos y les llega la invitación; se unen cuando aceptan.', CAP.grupoInvitar],
  ['El chat del grupo', 'Para organizar la caminata o picarse un poco. Se vacía cada mes.', CAP.grupoChat],
  ['Ranking', 'El ranking global y el de tus amigos.', CAP.ranking],
] as const;

export function GrupoEjemplo() {
  return (
    <section className="lp-sec" id="grupo-ejemplo" data-modo="oscuro">
      <div className="wrap">
        <Kinetic text="Así se vive un grupo." />
        <p className="lead">
          Un grupo de ejemplo, «Caminantes del Molino», para que veas cómo funciona: meta compartida, podio, un reto con Puntos en juego, invitaciones, ranking y chat.
        </p>
        <div className="grupo-datos">
          <span><b>7</b> integrantes</span>
          <span><b>244.900</b> pasos esta semana</span>
          <span><b>82%</b> de la meta del grupo</span>
          <span><b>30</b> Puntos en el pozo del reto</span>
        </div>
        <ModoToggle target="grupo-ejemplo" />
      </div>
      <div className="gal" tabIndex={0} aria-label="Pantallas del grupo de ejemplo">
        {GRUPO_PANT.map(([t, d, src]) => (
          <figure key={t}>
            <div className="phone">
              <Image className="cap-l" src={src} alt={`Pantalla de ejemplo: ${t}`} width={780} height={1688} sizes="260px" />
              <Image className="cap-d" src={CAP_DARK[src] ?? src} alt="" width={780} height={1688} sizes="260px" />
            </div>
            <figcaption><b>{t}</b>{d}</figcaption>
          </figure>
        ))}
      </div>
      <p className="wrap gal-nota">
        Grupo de ejemplo: las personas, los pasos y los mensajes son inventados. Al crear un desafío se elige la regla: gana quien suma más pasos o quien cumple la meta diaria más veces, y se reparten los Puntos puestos en juego.</p>
    </section>
  );
}

export function PublicidadComercio() {
  return (
    <section className="lp-sec night" id="publicidad">
      <div className="wrap">
        <Kinetic text="Promociona tu local en eventos y sorteos." />
        <p className="lead">
          Además de los premios por canje, puedes publicar un evento o un sorteo dentro de la app. Cada publicación dura hasta 2 semanas y cuesta Bs 200
          (Bs 400 si solo quieres publicidad, sin canjes). Lo revisamos y se publica cuando confirmamos el pago por WhatsApp.
        </p>
        <Bloques
          items={[
            {
              t: 'Tu local, frente a quienes caminan',
              d: 'Tu evento o sorteo aparece en la app de Camina. Puedes pedir un requisito de pasos para participar y así atraer gente que ya sale a caminar.',
              img: CAP.eventos,
              alt: 'Pantalla de eventos de ejemplo de la app',
              tag: 'Ejemplo de lo que puede haber',
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
              t: 'Calificaciones en Google Maps',
              d: 'Cuando se confirma un canje, la app le pregunta a la persona si dejaría una reseña y le abre tu ficha de Google Maps para calificarte. Es opcional y el link lo cargas tú en tu perfil. Más reseñas hacen que más gente te encuentre.',
              img: CAP.resenaHistoria,
              alt: 'Pantalla de la app después de un canje con la invitación a calificar en Google Maps y a subir una historia',
            },
            {
              t: 'Historias en Instagram',
              d: 'Quien canjea en tu local puede subir una historia a Instagram con una foto de lo que canjeó y el nombre de tu local. Se muestra a sus amigos y seguidores, y si el equipo de Camina la aprueba, gana 5 Puntos. Publicidad para ti, sin costo.',
              img: CAP.historia,
              alt: 'Pantalla de la historia lista para publicar en Instagram con el nombre del premio y del local',
            },
            {
              t: 'Tus redes en tu ficha',
              d: 'En el panel dejas tu Instagram, Facebook, TikTok y WhatsApp. Aparecen como botones en la ficha de tu local dentro de la app, a un toque de que te sigan o te escriban.',
              img: CAP.ficha,
              alt: 'Ficha de un local con botones de Instagram y WhatsApp',
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
          con Primer Paso tienes un premio 100% gratis y, con él, un descuento; con Paso Firme y Paso Adelante puedes combinar regalos y descuentos y dar cupones sin límite, para que
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
      ? 'Cada local que se suma a la tarjeta tiene su propio premio de fidelidad. Canjea 5 veces en el mismo local y ganas ese premio. Tus tarjetas aparecen cuando entras a verlas, sin tapar el resto de la app.'
      : 'Eliges el premio de fidelidad de tu local. Tus clientes completan 5 canjes en tu local y lo ganan: más motivos para volver. Está incluida en los planes de Bs 100 y Bs 300, no en el gratis.';
  const pasos =
    para === 'gente'
      ? [
          ['Canjea en tu local favorito', 'Cada canje confirmado suma un sello a tu tarjeta de ese local.'],
          ['Pasan 7 días entre canjes', 'Así pruebas otros lugares y todos los comercios tienen su oportunidad.'],
          ['Al llegar a 5, ganas el premio', 'El premio de fidelidad lo elige cada local.'],
        ]
      : [
          ['Activas la tarjeta', 'Desde tu panel, con los planes de Bs 100 o Bs 300.'],
          ['Eliges tu premio de fidelidad', 'El que quieras darle a tus clientes más constantes.'],
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

type Tile = { t: string; d: string; ico: keyof typeof ICO; span: 's2' | 's3' | 's4'; pts?: string; shot?: string; alt?: string; row2?: boolean; fill?: boolean };
const TILES: Tile[] = [
  { t: 'Retos Camina', d: 'Metas extra además de tus pasos de cada día: cúmplelas y ganas más Puntos.', ico: 'trofeo', span: 's3', shot: CAP.retos, alt: 'Pantalla de Retos Camina', row2: true },
  { t: 'Tu meta, a tu medida', d: 'Eliges tu meta diaria de pasos en Perfil > Editar perfil y la cambias cuando quieras. Todos tus pasos suman, llegues o no a la meta.', ico: 'pasos', span: 's3', fill: true },
  { t: 'Invita amigos', d: 'Comparte tu link: recibes 5 puntos cuando tu amigo se registra y consigue su primer punto.', ico: 'amigos', span: 's2', pts: '+5 puntos' },
  { t: 'Historias que suman', d: 'Sube una historia a Instagram y gana 5 puntos cuando el equipo de Camina la aprueba.', ico: 'camara', span: 's2', pts: '+5 puntos' },
  { t: 'Comparte tu progreso', d: 'Tarjetas con tu día, tu semana o tu mes, y el ranking de tu grupo, listas para mandar o subir.', ico: 'grafico', span: 's2' },
  { t: 'Tu racha y tu calendario', d: 'Miras tus días con objetivo cumplido, tu semana en un gráfico y cuánto te falta para la meta. Cada 7 días de racha sumas 5 Puntos.', ico: 'calendario', span: 's2' },
  { t: 'Grupos y ranking', d: 'Camina en equipo con tus amigos, con meta semanal compartida, retos con Puntos en juego y ranking.', ico: 'grupo', span: 's2' },
  { t: 'Claro, oscuro y cristal a tu gusto', d: 'Cambias el modo de la app, claro u oscuro, y cuánto vidrio quieres ver, desde sólido hasta cristal.', ico: 'vidrio', span: 's2' },
  { t: 'Desafíos y eventos', d: 'Súmate a desafíos y eventos con fecha y lugar, y mira cómo funciona cada uno antes de participar.', ico: 'calendario', span: 's3', shot: CAP.desafios, alt: 'Pantalla de Desafíos', row2: true },
  { t: 'Tu ubicación, solo cuando la necesitas', d: 'La usamos en el momento para mostrarte lo que hay cerca y no la guardamos. Tampoco vendemos tus datos.', ico: 'ubicacion', span: 's3', fill: true },
  { t: 'Canjea tus puntos', d: 'Cuando quieras usar tus puntos, le pides al local su código de 4 números, lo escribes en la app y el canje se confirma al instante.', ico: 'regalo', span: 's3', fill: true },
];

export function MasParaGente() {
  return (
    <section className="lp-sec night" id="mas">
      <div className="wrap">
        <Kinetic text="Y hay más para ti." />
        <p className="lead">Lo que Camina te da cada día, además de los puntos.</p>
        <ul className="bento">
          {TILES.map((x, i) => (
            <InView as="li" key={x.t} delay={(i % 3) * 90} className={`gl ${x.span}${x.shot ? ' has-shot' : ''}${x.row2 ? ' row2' : ''}${x.fill ? ' fill' : ''}`}>
              <div className="gl-txt">
                <span className="gl-ico">{ICO[x.ico]}</span>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
                {x.pts && <span className="gl-pts">{x.pts}</span>}
              </div>
              {x.shot && (
                <div className="peek"><Image src={x.shot} alt={x.alt ?? ''} width={780} height={1688} sizes="260px" /></div>
              )}
            </InView>
          ))}
        </ul>
        <p className="bento-nota">Los pasos, los puntos, los eventos y los desafíos de las capturas son ejemplos de lo que puede haber.</p>
      </div>
    </section>
  );
}
