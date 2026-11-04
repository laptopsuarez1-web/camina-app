import Link from 'next/link';
import './landing.css';
import './glass.css';
import GlassFx from './GlassFx';
import Trail from './Trail';
import { Kinetic, Parallax } from './Motion';
import { Nav, Footer, FloatCards, Cinta, GanaLocal, AsiTeVen, TuMarca, Contigo, PasosComercio, PanelComercio, Planes, EnMente, CAP, Shot, WA_COMERCIO } from './shared';

export default function ComerciosPage() {
  return (
    <div className="lp">
      <span className="aurora-3" aria-hidden="true" />
      <GlassFx />
      <Nav activo="comercios" />
      <main>
        <section className="lp-hero">
          <Trail className="hero-trail" n={13} />
          <div className="wrap hero-grid">
            <div className="copy">
              <Kinetic as="h1" text="Tus próximos clientes ya están *caminando.*" />
              <p className="sub">
                Camina premia a las personas por caminar y las lleva a los comercios de su zona. Suma el tuyo y elige qué premio dar.
              </p>
              <div className="lp-cta">
                <Link className="lp-btn mint" href="/registro">Registrar mi comercio</Link>
                <a className="lp-btn ghost" href={WA_COMERCIO}>Tengo una duda</a>
              </div>
            </div>
            <div className="stage">
              <Parallax speed={0.06}>
                <div className="phone hero-phone"><Shot src={CAP.canjes.replace(".jpg", "-dark.jpg")} alt="Pantalla de canjes con comercios y premios" width={780} height={1688} priority sizes="280px" /></div>
              </Parallax>
              <FloatCards para="comercios" />
            </div>
          </div>
        </section>
        <Cinta para="comercios" />
        <GanaLocal />
        <AsiTeVen />
        <TuMarca />
        <Contigo />
        <PasosComercio />
        <PanelComercio />
        <Planes />
        <EnMente />
      </main>
      <Footer />
    </div>
  );
}
