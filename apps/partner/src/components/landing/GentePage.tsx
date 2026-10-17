import Image from 'next/image';
import './landing.css';
import Trail from './Trail';
import { Kinetic, Parallax } from './Motion';
import { MasParaGente, Fidelidad, Nav, Footer, FloatCards, Cinta, Reglas, Mapa, Locales, Galeria, Objetivos, EquipoRetos, Salud, DescargaGente, SoyComercio, CAP, WA_AVISAME } from './shared';

export default function GentePage() {
  return (
    <div className="lp">
      <Nav activo="gente" />
      <main>
        <section className="lp-hero">
          <Trail className="hero-trail" n={13} />
          <div className="wrap hero-grid">
            <div className="copy">
              <Kinetic as="h1" text="Caminá, sumá puntos y canjealos en tu barrio." />
              <p className="sub">
                Camina cuenta tus pasos y los convierte en puntos para canjear en los comercios de tu ciudad. Salir a caminar nunca tuvo tanto premio.
              </p>
              <div className="lp-cta">
                <a className="lp-btn mint" href={WA_AVISAME}>Avisame cuando salga</a>
                <a className="lp-btn ghost" href="#mapa">Ver cómo funciona</a>
              </div>
            </div>
            <div className="stage">
              <Parallax speed={0.06}>
                <div className="phone hero-phone"><Image src={CAP.inicio} alt="Pantalla de inicio de Camina" width={780} height={1688} priority sizes="280px" /></div>
              </Parallax>
              <FloatCards />
            </div>
          </div>
        </section>
        <Cinta />
        <Reglas />
        <Mapa titulo="Tu barrio, a pasos de distancia." texto="Mirá cómo un recorrido normal se vuelve un premio. El mapa es de Tarija y los locales son reales." />
        <Locales />
        <Objetivos />
        <Salud />
        <EquipoRetos />
        <Galeria />
        <Fidelidad para="gente" />
        <MasParaGente />
        <SoyComercio />
        <DescargaGente />
      </main>
      <Footer />
    </div>
  );
}
