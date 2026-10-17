import Image from 'next/image';
import Link from 'next/link';
import './landing.css';
import Walker from './Walker';
import Story from './Story';
import MapMock from './MapMock';
import { PLANS, WHATSAPP_NUMBER, whatsappLink } from '@/lib/plans';

const WA_SUMAR = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Quiero sumar mi comercio a Camina.')}`;

// Huellas que caminan hacia el celular del hero.
const HUELLAS = [
  { x: 0, y: 88, rot: 40, lado: 'l' },
  { x: 7, y: 72, rot: 28, lado: 'r' },
  { x: 14, y: 64, rot: 40, lado: 'l' },
  { x: 21, y: 48, rot: 28, lado: 'r' },
  { x: 28, y: 40, rot: 40, lado: 'l' },
  { x: 35, y: 24, rot: 28, lado: 'r' },
] as const;

const BENEFICIOS = [
  ['Aparecés en el mapa', 'La gente de tu zona te encuentra cuando elige dónde canjear.'],
  ['Vos elegís el premio', 'Un regalo o un descuento, con tus horarios y tus condiciones.'],
  ['Vos ponés el cupo', 'Definís cuántos cupones das por día, o ilimitados.'],
  ['Se valida en segundos', 'El cliente muestra un código de 6 números y lo confirmás desde el celular.'],
  ['Una vez cada 14 días', 'Cada persona canjea en tu local como máximo cada 14 días, así el beneficio alcanza para más gente.'],
  ['Empezás gratis', 'El plan Primer Paso no tiene costo fijo. Cambiás de plan cuando quieras.'],
];

export default function Landing() {
  return (
    <div className="lp">
      <Walker />
      <header className="lp-nav">
        <div className="wrap">
          <Link href="/" className="lp-brand" aria-label="Camina">
            <Image src="/marca/logo-solo-transparente.png" alt="" width={34} height={34} />
            CAMINA
          </Link>
          <Link href="/login" className="lp-login">Ingresar al panel</Link>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="wrap">
            <div className="copy">
              <h1>Tus próximos clientes ya están caminando.</h1>
              <p className="sub">
                Camina premia a las personas por caminar. Sus pasos se vuelven puntos y los gastan en los comercios de su barrio. Puede ser el tuyo.
              </p>
              <div className="lp-cta">
                <Link className="lp-btn mint" href="/registro">Sumá tu comercio gratis</Link>
                <a className="lp-btn ghost" href="#planes">Ver planes</a>
              </div>
              <p className="soon">App para Android e iPhone, muy pronto en las tiendas.</p>
            </div>
            <div className="stage" aria-hidden="true">
              {HUELLAS.map((h, i) => (
                <Image
                  key={i}
                  src="/web/camina-foot.png"
                  alt=""
                  width={42}
                  height={72}
                  className={`foot ${h.lado}`}
                  style={{ left: `${h.x}%`, top: `${h.y}%`, ['--i' as string]: i, ['--rot' as string]: `${h.rot}deg` }}
                />
              ))}
              <div className="phone hero-phone"><Image src="/web/app-inicio.jpg" alt="" width={560} height={1212} priority /></div>
              <div className="ticket">
                <small>Tu código de canje</small>
                <b>482 917</b>
                <em>Válido 15 minutos</em>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="como-funciona">
          <div className="wrap">
            <h2>Un día con Camina.</h2>
            <p className="lead">De salir a caminar a canjear un premio en tu barrio, en cinco pasos.</p>
            <Story />
          </div>
        </section>

        <section className="lp-sec night" id="gente">
          <div className="wrap">
            <h2>Caminar te hace bien. Ahora también te premia.</h2>
            <p className="lead">Camina no es solo canjear. Es ponerte en movimiento y no frenar.</p>
            <div className="goals">
              <article className="goal">
                <div className="goal-txt">
                  <h3>Salud</h3>
                  <p>Una meta diaria de pasos que vos elegís y una racha que te empuja a no cortar. Ves tu semana en un gráfico y sabés cómo venís.</p>
                </div>
                <div className="phone"><Image src="/web/app-actividad.jpg" alt="Pantalla de actividad con los pasos de la semana y la meta" width={560} height={1065} /></div>
              </article>
              <article className="goal">
                <div className="goal-txt">
                  <h3>Motivación</h3>
                  <p>Puntos por cada 1.000 pasos, retos y grupos para caminar con amigos. Es más fácil sostener el hábito cuando hay con quién.</p>
                </div>
                <div className="phone"><Image src="/web/app-grupos.jpg" alt="Pantalla de grupos con la meta semanal del equipo" width={560} height={1212} /></div>
              </article>
              <article className="goal">
                <div className="goal-txt">
                  <h3>Moverte por tu barrio</h3>
                  <p>Tus pasos te llevan a conocer locales, probar cosas nuevas y sumarte a eventos de tu ciudad.</p>
                </div>
                <div className="phone"><Image src="/web/app-eventos.jpg" alt="Pantalla de eventos de la ciudad" width={560} height={1212} /></div>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="comercios">
          <div className="wrap">
            <h2>Así se ve tu local en Camina.</h2>
            <p className="lead">Te encuentran en el mapa, te eligen en Canjes y conocen tu local antes de llegar.</p>
            <div className="showcase">
              <figure>
                <div className="phone"><MapMock /></div>
                <figcaption><b>En el mapa</b>La gente de tu zona te ve cuando elige dónde ir. En Paso Adelante, con pin destacado.</figcaption>
              </figure>
              <figure>
                <div className="phone"><Image src="/web/app-canjes.jpg" alt="Lista de canjes con un comercio y sus premios" width={560} height={1212} /></div>
                <figcaption><b>En Canjes</b>Tu premio aparece con sus puntos y si está disponible ahora.</figcaption>
              </figure>
              <figure>
                <div className="phone"><Image src="/web/app-ficha.jpg" alt="Ficha de un local con fotos, horario y premios" width={560} height={1212} /></div>
                <figcaption><b>En tu ficha</b>Fotos, horarios, redes y tus premios. Vos la armás desde el panel.</figcaption>
              </figure>
            </div>

            <div className="panel-row">
              <div>
                <h3>Y todo lo manejás desde tu panel.</h3>
                <p>Cargás tu local y tus premios, confirmás los códigos desde el celular y mirás tus canjes. Sin instalar nada.</p>
                <div className="lp-cta">
                  <Link className="lp-btn dark" href="/registro">Crear mi cuenta gratis</Link>
                </div>
              </div>
              <div className="laptop"><Image src="/web/panel.jpg" alt="Panel de comercios de Camina con el perfil del local" width={1100} height={1000} /></div>
            </div>

            <ul className="ben2">
              {BENEFICIOS.map(([t, d]) => (
                <li key={t}><b>{t}</b><span>{d}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-sec night" id="planes">
          <div className="wrap">
            <h2>Elegí tu plan.</h2>
            <p className="lead">Empezás gratis y te registrás vos mismo. Para los planes pagos nos escribís por WhatsApp y te activamos el plan.</p>
            <div className="planes">
              {PLANS.map((p) => (
                <article key={p.id} className={`plan${p.featured ? ' feat' : ''}`}>
                  <h3>{p.name}</h3>
                  <p className="price">{p.price}</p>
                  <p className="blurb">{p.blurb}</p>
                  <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                  {p.id === 'primer_paso' ? (
                    <Link className="lp-btn dark plan-cta" href="/registro">Empezar gratis</Link>
                  ) : (
                    <a className="lp-btn mint plan-cta" href={whatsappLink(p.name, p.price)}>Elegir por WhatsApp</a>
                  )}
                </article>
              ))}
            </div>
            <div className="fund">
              <b>Programa fundador: 3 meses gratis de Paso Firme.</b>
              <span>Es para los primeros 20 comercios que se suman. Escribinos por WhatsApp para pedirlo.</span>
              <a className="lp-btn dark" href={WA_SUMAR}>Pedir mi cupo fundador</a>
            </div>
          </div>
        </section>

        <section className="lp-sec alt" id="locales">
          <div className="wrap">
            <h2>Ya se están sumando.</h2>
            <p className="lead">Los primeros comercios de Tarija en Camina.</p>
            <div className="locales">
              <span>Fripap&apos;s</span>
              <span>Coco Barber</span>
              <span>Bloom</span>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="objetivos">
          <div className="wrap">
            <h2>Lo que queremos lograr.</h2>
            <div className="obj light">
              <div>
                <h3>Que Bolivia camine más</h3>
                <p>Que moverse todos los días tenga un premio real y cerca de casa.</p>
              </div>
              <div>
                <h3>Clientes para el comercio local</h3>
                <p>Llevar gente nueva a los negocios de cada barrio, sin que el comercio tenga que pagar para empezar.</p>
              </div>
              <div>
                <h3>Una app en la que se pueda confiar</h3>
                <p>Premios que se cumplen, códigos que se validan bien y reglas claras para las dos partes.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-final">
          <div className="wrap">
            <h2>Sumá tu comercio hoy.</h2>
            <p>Registrate gratis en el panel o escribinos por WhatsApp y te ayudamos.</p>
            <div className="lp-cta">
              <Link className="lp-btn mint" href="/registro">Registrar mi comercio</Link>
              <a className="lp-btn ghost" href={WA_SUMAR}>Hablar por WhatsApp</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="wrap">
          <p>¿Dudas? Escribinos por WhatsApp al <a href={`https://wa.me/${WHATSAPP_NUMBER}`}>+591 627 14286</a>.</p>
          <nav aria-label="Enlaces">
            <Link href="/login">Ingresar al panel</Link>
            <Link href="/guia">Guía para comercios</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="/privacidad">Privacidad</Link>
          </nav>
          <p>© Camina, Bolivia</p>
        </div>
      </footer>
    </div>
  );
}
