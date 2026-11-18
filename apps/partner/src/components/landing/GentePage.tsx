import './landing.css';
import './glass.css';
import GlassFx from './GlassFx';
import { Nav, Footer, HeroGente, ComoFunciona,
  CanjesGente, Gratis, GruposGente, Dudas, SoyComercio, CierreGente} from './shared';

export default function GentePage() {
  return (
    <div className="lp">
      <span className="aurora-3" aria-hidden="true" />
      <GlassFx />
      <Nav activo="gente" />
      <main>
        <HeroGente />
        <ComoFunciona />
        <CanjesGente />
        <Gratis />
        <GruposGente />
        <Dudas />
        <SoyComercio />
        <CierreGente />
      </main>
      <Footer />
    </div>
  );
}
