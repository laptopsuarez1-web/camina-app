'use client';

import { Analytics, track } from '@vercel/analytics/react';
import { useEffect } from 'react';

// Medición sin cookies ni datos personales (Vercel Web Analytics): visitas por página, dispositivo y procedencia.
// Los clics importantes se marcan en el HTML con data-medir="nombre" y se cuentan aquí con un solo oyente.
export default function Medicion() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-medir]');
      if (el?.dataset.medir) track(el.dataset.medir);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return <Analytics />;
}
