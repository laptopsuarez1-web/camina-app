import './landing.css';
import './glass.css';
import './comercios.css';
import GlassFx from './GlassFx';
import { Nav, Footer } from './shared';
import { HeroComercio, ConectaTres, Funciones, RutaMes, Niveles, Pines, PlanesComercio, DudasComercio, CierreNegocio } from './ComerciosShow';

export default function ComerciosPage() {
  return (
    <div className="lp lp-gente lp-comercios">
      <span className="aurora-3" aria-hidden="true" />
      <GlassFx />
      <Nav activo="comercios" />
      <main>
        <HeroComercio />
        <ConectaTres />
        <Funciones />
        <RutaMes />
        <Niveles />
        <Pines />
        <PlanesComercio />
        <DudasComercio />
        <CierreNegocio />
      </main>
      <Footer />
    </div>
  );
}
