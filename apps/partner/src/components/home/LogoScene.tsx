'use client';

import { useEffect, useRef } from 'react';

// Escena del logo: las huellas de Camina son una ventana a la Plaza Luis de Fuentes de Tarija. Al bajar, la huella
// izquierda crece hasta llenar la pantalla y aparece la frase. Video de la plaza usado con permiso de su autor.
// `logo="morado"`: el logo completo (círculo morado y aro menta) alrededor de las huellas; "transparente": solo las huellas.
// Con "reducir movimiento" se ve el video entero, quieto en su primer cuadro, con la frase final.
const MASCARA = { w: 600, h: 670, fx: 0.256, fy: 0.388 }; // huellas-mascara.png y el centro de la huella izquierda
// La máscara es un recorte del logo de 1024 × 1024 (marca/logo-solo-transparente.png) desde (217, 214).
const LOGO = { lado: 1024, x: 217, y: 214 };

export default function LogoScene({ logo = 'morado' }: { logo?: 'morado' | 'transparente' }) {
  const box = useRef<HTMLElement>(null);
  const vid = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const marca = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    const v = vid.current;
    const media = video.current;
    if (!el || !v || !media) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.dataset.fin = '1';
      return;
    }
    el.dataset.vivo = '1';
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
      el.style.setProperty('--p', p.toFixed(3));
      // De 0 a 0,82 la huella crece (rápido al final); después el video queda entero.
      const k = Math.min(1, p / 0.82);
      const e = k * k * k;
      const base = Math.min(vw, vh) * 0.42;
      // Al principio el logo queda un poco más arriba, para dejar lugar a la frase de abajo.
      const cy = vh * (0.42 + 0.08 * Math.min(1, k / 0.35));
      const h = base * Math.pow(120, e);
      const w = (h * MASCARA.w) / MASCARA.h;
      const t = Math.min(1, k / 0.35);
      const fx = 0.5 + (MASCARA.fx - 0.5) * t;
      const fy = 0.5 + (MASCARA.fy - 0.5) * t;
      // El logo completo acompaña a las huellas: mismo tamaño y lugar.
      const m = marca.current;
      if (m) {
        const esc = h / MASCARA.h;
        const L = LOGO.lado * esc;
        const left = vw / 2 - fx * w - LOGO.x * esc;
        const top = cy - fy * h - LOGO.y * esc;
        m.style.width = m.style.height = `${L.toFixed(1)}px`;
        m.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
        m.style.opacity = String(Math.max(0, 1 - Math.max(0, k - 0.55) / 0.3));
      }
      if (k >= 1) {
        v.style.maskImage = v.style.webkitMaskImage = 'none';
      } else {
        v.style.maskImage = v.style.webkitMaskImage = 'url(/web/huellas-mascara.png)';
        const size = `${w.toFixed(1)}px ${h.toFixed(1)}px`;
        const pos = `${(vw / 2 - fx * w).toFixed(1)}px ${(cy - fy * h).toFixed(1)}px`;
        v.style.maskSize = v.style.webkitMaskSize = size;
        v.style.maskPosition = v.style.webkitMaskPosition = pos;
      }
    };
    const on = () => !raf && (raf = requestAnimationFrame(paint));
    paint();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    // El video solo corre mientras la escena está en pantalla.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? media.play().catch(() => {}) : media.pause()), { threshold: 0.05 });
    io.observe(el);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="hm-logoscene" ref={box} data-theme="dark" data-logo={logo} aria-label="Caminá tu ciudad">
      <div className="hm-logoscene-stick">
        <div className="hm-logoscene-marca" ref={marca} aria-hidden="true" />
        <div className="hm-logoscene-vid" ref={vid}>
          <video ref={video} src="/web/vid/tarija-plaza.mp4" poster="/web/vid/tarija-plaza.jpg" muted loop playsInline preload="metadata" aria-hidden="true" />
        </div>
        <p className="hm-logoscene-a">
          Caminá
          <span>tu ciudad.</span>
        </p>
        <div className="hm-logoscene-b">
          <p>
            Tarija camina.
            <span>Y ahora, cada paso suma.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
