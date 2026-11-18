import './landing.css';
import './glass.css';
import GlassFx from './GlassFx';
import { Nav, Footer } from './shared';
import { HeroComercio, GanaNegocio, ComoFuncionaComercio, AsiSeVeNegocio, PlanesComercio, DudasComercio, CierreNegocio } from './ComerciosSecciones';

export default function ComerciosPage() {
  return (
    <div className="lp lp-gente lp-comercios">
      <span className="aurora-3" aria-hidden="true" />
      <GlassFx />
      <Nav activo="comercios" />
      <main>
        <HeroComercio />
        <GanaNegocio />
        <ComoFuncionaComercio />
        <AsiSeVeNegocio />
        <PlanesComercio />
        <DudasComercio />
        <CierreNegocio />
      </main>
      <Footer />
    </div>
  );
}
