'use client';

import { useEffect, useRef, useState } from 'react';

// Contador flotante: al bajar por la página "caminás". Cada 1.000 pasos, 1 punto (la regla real de la app).
export default function Walker() {
  const [pasos, setPasos] = useState(0);
  const [pulso, setPulso] = useState(false);
  const prev = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      const n = Math.round(p * 8000 / 10) * 10;
      if (Math.floor(n / 1000) > Math.floor(prev.current / 1000)) {
        setPulso(true);
        window.setTimeout(() => setPulso(false), 900);
      }
      prev.current = n;
      setPasos(n);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const puntos = Math.floor(pasos / 1000);
  return (
    <div className={`walker${pulso ? ' on' : ''}`} role="status" aria-label={`${pasos} pasos, ${puntos} puntos`}>
      <img src="/web/camina-foot.png" alt="" width={16} height={28} />
      <span className="n">{pasos.toLocaleString('es-BO')}</span>
      <span className="u">pasos</span>
      <span className="p">+{puntos} {puntos === 1 ? 'punto' : 'puntos'}</span>
    </div>
  );
}
