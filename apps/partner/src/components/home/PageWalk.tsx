'use client';

import { useEffect, useRef, useState } from 'react';

// La página es una caminata: un camino de huellas del logo baja por toda la página y se va pisando al hacer scroll,
// desde el héroe hasta el botón final. En escritorio va por el margen izquierdo; en el celular, por el borde derecho.
const PASO = 74; // px entre huella y huella

export default function PageWalk() {
  const box = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = box.current;
    const main = el?.parentElement;
    if (!el || !main) return;
    const medir = () => setN(Math.floor(main.scrollHeight / PASO));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(main);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = main.getBoundingClientRect();
      // Se pisa hasta un poco más abajo de la mitad de la pantalla.
      const y = window.innerHeight * 0.62 - r.top;
      el.style.setProperty('--y', reduce ? '1e6' : String(Math.round(y / PASO)));
    };
    const on = () => !raf && (raf = requestAnimationFrame(paint));
    paint();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hm-pagewalk" ref={box} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i
          key={i}
          className={`hm-foot hm-foot-${i % 2 ? 'R' : 'L'}`}
          style={{
            top: i * PASO,
            // La línea serpentea suave para que parezca un camino y no una regla.
            ['--x' as string]: `${(Math.sin(i / 5) * 10 + (i % 2 ? 9 : -9)).toFixed(1)}px`,
            ['--i' as string]: i,
          }}
        />
      ))}
    </div>
  );
}
