import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './home.css';
import HomeMotion from './HomeMotion';

// Base común de las páginas públicas nuevas (portada y /comercios): tipografía, arranque del movimiento y salto al contenido.

// Una sola familia: Mona Sans (variable en peso y ancho). Titulares anchos, texto en ancho normal.
const mona = localFont({
  src: '../../fonts/MonaSans-Variable.woff2',
  weight: '200 900',
  variable: '--hm-sans',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 125%' }],
});

// Marca .hm-js en <html> antes de pintar (solo si se permite movimiento), para que lo que se revela no parpadee.
// Si el director de movimiento no arranca en 4 s, se quita y todo queda visible.
const BOOT =
  "(function(){var r=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){r.classList.add('hm-js');setTimeout(function(){if(!r.dataset.hmReady)r.classList.remove('hm-js')},4000)}})()";

export default function Shell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`hm ${mona.variable} ${className}`}>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <a className="hm-skip" href="#contenido">
        Saltar al contenido
      </a>
      {children}
      <HomeMotion />
    </div>
  );
}
