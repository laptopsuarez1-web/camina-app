'use client';
import { useEffect } from 'react';

// Efectos de puntero de la web de cristal: el brillo sigue al mouse sobre cada panel y el celular del héroe se inclina un poco.
// No hace nada con "reducir movimiento" ni en pantallas táctiles.
export default function GlassFx() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    const hero = document.querySelector<HTMLElement>('.hero-phone');
    let raf = 0;
    function mover(e: PointerEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const card = (e.target as HTMLElement | null)?.closest<HTMLElement>('.loc,.fact,.plan,.flow li,.fid-card,.ben li,.stat,.gl,.rm-card,.fcard,.fund,.stat-big');
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${e.clientX - r.left}px`);
          card.style.setProperty('--my', `${e.clientY - r.top}px`);
        }
        if (hero) {
          const r = hero.getBoundingClientRect();
          if (r.bottom > 0 && r.top < window.innerHeight) {
            const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
            const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
            hero.style.setProperty('--ry', `${(dx * 14).toFixed(2)}deg`);
            hero.style.setProperty('--rx', `${(-dy * 10).toFixed(2)}deg`);
          }
        }
      });
    }
    window.addEventListener('pointermove', mover, { passive: true });
    return () => {
      window.removeEventListener('pointermove', mover);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
