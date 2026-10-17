import Image from 'next/image';
import Link from 'next/link';
import './landing.css';
import Trail from './Trail';
import { Kinetic, Parallax } from './Motion';
import { Nav, Footer, FloatCards, Cinta, Mapa, Locales, PasosComercio, BeneficiosComercio, PanelComercio, Planes, CierreComercio, CAP, WA_COMERCIO } from './shared';

export default function ComerciosPage() {
  return (
    <div className="lp">
      <Nav activo="comercios" />
      <main>
        <section className="lp-hero">
          <Trail className="hero-trail" n={13} />
          <div className="wrap hero-grid">
            <div className="copy">
              <Kinetic as="h1" text="Tus próximos clientes ya están caminando." />
              <p className="sub">
                Camina premia a las personas por caminar y las lleva a los comercios de su barrio. Sumá el tuyo gratis y elegí qué premio dar.
              </p>
              <div className="lp-cta">
                <Link className="lp-btn mint" href="/registro">Registrar mi comercio</Link>
                <a className="lp-btn ghost" href={WA_COMERCIO}>Tengo una duda</a>
              </div>
            </div>
            <div className="stage">
              <Parallax speed={0.06}>
                <div className="phone hero-phone"><Image src={CAP.canjes} alt="Pantalla de canjes con comercios y premios" width={780} height={1688} priority sizes="280px" /></div>
              </Parallax>
              <FloatCards />
            </div>
          </div>
        </section>
        <Cinta />
        <Mapa titulo="Así te encuentran." texto="Una persona camina por tu barrio, ve tu local en el mapa y llega a canjear. Este es el mapa real de Tarija con locales que ya están en Camina." />
        <Locales />
        <BeneficiosComercio />
        <PasosComercio />
        <PanelComercio />
        <Planes />
        <CierreComercio />
      </main>
      <Footer />
    </div>
  );
}
