import './landing.css';
import './glass.css';
import './comercios.css';
import GlassFx from './GlassFx';
import { Nav, Footer, Gratis, Dudas, SoyComercio, CierreGente } from './shared';
import { HeroPersonas, RutaPersonas, TodoSuma } from './GenteShow';

export default function GentePage() {
  return (
    <div className="lp lp-gente lp-comercios">
      <span className="aurora-3" aria-hidden="true" />
      <GlassFx />
      <Nav activo="gente" />
      <main>
        <HeroPersonas />
        <RutaPersonas />
        <TodoSuma />
        <Gratis />
        <Dudas />
        <SoyComercio />
        <CierreGente />
      </main>
      <Footer />
    </div>
  );
}
