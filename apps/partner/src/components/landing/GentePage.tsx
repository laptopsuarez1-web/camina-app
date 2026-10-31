import './landing.css';
import './glass.css';
import GlassFx from './GlassFx';
import Trail from './Trail';
import { Kinetic, Parallax } from './Motion';
import { MasParaGente, Fidelidad, Nav, Footer, FloatCards, Cinta, Reglas, Mapa, Galeria, Objetivos, EquipoRetos, GrupoEjemplo, Salud, DescargaGente, SoyComercio, CAP, Shot, EMAIL_AVISAME } from './shared';

export default function GentePage() {
  return (
    <div className="lp">
      <span className="aurora-3" aria-hidden="true" />
      <GlassFx />
      <Nav activo="gente" />
      <main>
        <section className="lp-hero">
          <Trail className="hero-trail" n={22} flat />
          <div className="wrap hero-grid">
            <div className="copy">
              <Kinetic as="h1" text="Camina, suma puntos y canjéalos en tu zona." />
              <p className="sub">
                Camina cuenta tus pasos y los convierte en puntos para canjear en los comercios de tu ciudad. Salir a caminar nunca tuvo tanto premio.
              </p>
              <div className="lp-cta">
                <a className="lp-btn mint" href={EMAIL_AVISAME}>Avísame cuando salga</a>
                <a className="lp-btn ghost" href="#mapa">Ver cómo funciona</a>
              </div>
            </div>
            <div className="stage">
              <Parallax speed={0.06}>
                <span className="hero-glow" aria-hidden="true" />
                <div className="phone hero-phone"><Shot src={CAP.inicio} alt="Pantalla de inicio de Camina" width={780} height={1688} priority sizes="280px" /></div>
              </Parallax>
              <FloatCards />
            </div>
          </div>
        </section>
        <Cinta />
        <Reglas />
        <Mapa titulo="Tu zona, a pasos de distancia." texto="Mira cómo un recorrido normal se vuelve un premio. El mapa es de Tarija y los locales son reales." />
        <Objetivos />
        <Salud />
        <EquipoRetos />
        <GrupoEjemplo />
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
