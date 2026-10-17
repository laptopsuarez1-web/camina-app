import Image from 'next/image';
import Link from 'next/link';
import './landing.css';
import { PLANS, WHATSAPP_NUMBER } from '@/lib/plans';

const WA_SUMAR = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Quiero sumar mi comercio a Camina.')}`;

// Huellas que caminan hasta el código de canje: cada una con su posición y giro.
const HUELLAS = [
  { x: 0, y: 4, rot: 96, lado: 'l' },
  { x: 11, y: 30, rot: 84, lado: 'r' },
  { x: 24, y: 18, rot: 96, lado: 'l' },
  { x: 35, y: 44, rot: 84, lado: 'r' },
  { x: 48, y: 32, rot: 96, lado: 'l' },
  { x: 59, y: 58, rot: 84, lado: 'r' },
] as const;

const PASOS = [
  ['Caminás y sumás puntos', 'Cada 1.000 pasos son 1 punto, hasta 20 puntos por día. La app cuenta los pasos sola.'],
  ['Elegís un premio en tu barrio', 'En el mapa ves los comercios con premios que podés canjear con tus puntos.'],
  ['Te aparece un código de 6 dígitos', 'Lo mostrás en el local. Dura 15 minutos.'],
  ['El comercio lo confirma', 'Lo escribe en su panel, toca confirmar y te entrega el premio.'],
];

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
              <a className="lp-btn mint" href={WA_SUMAR}>Sumá tu comercio</a>
              <a className="lp-btn ghost" href="#planes">Ver planes</a>
            </div>
            <p className="soon">App para celulares Android e iPhone, muy pronto en las tiendas.</p>
            </div>

            <div className="trail" aria-hidden="true">
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
              <div className="ticket">
                <small>Tu código de canje</small>
                <b>482 917</b>
                <em>Válido 15 minutos</em>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec" id="como-funciona">
          <div className="wrap split">
            <div>
              <h2>Así funciona Camina.</h2>
              <p className="lead">Para quien camina es simple. Para tu comercio, todavía más.</p>
              <div className="pasos">
                {PASOS.map(([t, d]) => (
                  <div className="paso" key={t}>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="phones">
              <div className="phone"><Image src="/web/app-inicio.jpg" alt="Pantalla de inicio de la app con los pasos del día" width={520} height={1125} /></div>
              <div className="phone"><Image src="/web/app-canjes.jpg" alt="Pantalla de canjes con los comercios y sus premios" width={520} height={1125} /></div>
            </div>
          </div>
        </section>

        <section className="lp-sec night" id="comercios">
          <div className="wrap">
            <h2>Para tu comercio: visitas, no impresiones.</h2>
            <p className="lead">Cada canje es una persona real parada en tu local, con ganas de conocerte.</p>
            <ul className="ben">
              {BENEFICIOS.map(([t, d]) => (
                <li key={t}><b>{t}</b><span>{d}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-sec" id="planes">
          <div className="wrap">
            <h2>Elegí tu plan.</h2>
            <p className="lead">Empezás gratis. Si querés más, pagás por transferencia o QR y nos mandás el comprobante por WhatsApp.</p>
            <div className="planes">
              {PLANS.map((p) => (
                <article key={p.id} className={`plan${p.featured ? ' feat' : ''}`}>
                  <h3>{p.name}</h3>
                  <p className="price">{p.price}</p>
                  <p className="blurb">{p.blurb}</p>
                  <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                </article>
              ))}
            </div>
            <div className="fund">
              <b>Programa fundador: 3 meses gratis de Paso Firme.</b>
              <span>Es para los primeros 20 comercios que se suman.</span>
            </div>
            <div className="lp-cta">
              <a className="lp-btn dark" href={WA_SUMAR}>Quiero sumar mi comercio</a>
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

        <section className="lp-sec night" id="objetivos">
          <div className="wrap">
            <h2>Lo que queremos lograr.</h2>
            <div className="obj">
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
