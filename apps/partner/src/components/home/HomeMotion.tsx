'use client';

import { useEffect } from 'react';

// Director de movimiento de la portada. Un solo componente cliente que:
// 1) revela titulares (por líneas) y bloques al entrar en pantalla,
// 2) cuenta los números de las reglas de Puntos cuando aparecen,
// 3) adapta la barra superior al fondo de la sección que tiene debajo,
// 4) carga GSAP + ScrollTrigger después de pintar, solo para el parallax moderado de los teléfonos.
// Con "reducir movimiento" no se oculta ni se anima nada: queda todo visible y quieto.
export default function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.hm');
    if (!root) return;
    const html = document.documentElement;
    html.dataset.hmReady = '1';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) html.classList.add('hm-js');
    const cleanups: (() => void)[] = [];

    // 1) Revelado progresivo.
    const reveal = Array.from(root.querySelectorAll<HTMLElement>('[data-split],[data-reveal]'));
    const ioReveal = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          ioReveal.unobserve(e.target);
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    );
    reveal.forEach((el) => ioReveal.observe(el));
    cleanups.push(() => ioReveal.disconnect());

    // 2) Números que cuentan hasta su valor.
    const fmt = (n: number) => n.toLocaleString('es-BO');
    const ioCount = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          ioCount.unobserve(e.target);
          const el = e.target as HTMLElement;
          const to = Number(el.dataset.count);
          if (reduce) return;
          const t0 = performance.now();
          const tick = (t: number) => {
            const k = Math.min(1, (t - t0) / 1200);
            el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3))));
            if (k < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      { threshold: 0.6 },
    );
    root.querySelectorAll('[data-count]').forEach((el) => ioCount.observe(el));
    cleanups.push(() => ioCount.disconnect());

    // 3) Barra superior: fondo según la sección que tiene debajo y versión compacta al bajar.
    const nav = root.querySelector<HTMLElement>('[data-nav]');
    const secciones = Array.from(root.querySelectorAll<HTMLElement>('[data-theme]'));
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!nav) return;
        const s = secciones.find((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= 36 && r.bottom > 36;
        });
        nav.dataset.theme = s?.dataset.theme ?? 'light';
        nav.classList.toggle('is-scrolled', window.scrollY > 24);
        // Lo que ya quedó por encima (salto con un enlace) se muestra igual.
        reveal.forEach((el) => {
          if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
        });
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    });

    // 4) Parallax moderado de los teléfonos (GSAP, cargado aparte).
    let killed = false;
    let ctx: { revert: () => void } | null = null;
    if (!reduce) {
      Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
        if (killed) return;
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        ctx = mm;
        mm.add('(min-width: 0px)', () => {
          gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
            const v = parseFloat(el.dataset.parallax || '0.05');
            gsap.fromTo(
              el,
              { y: () => window.innerHeight * v },
              { y: () => -window.innerHeight * v, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } },
            );
          });
        });
        let t: ReturnType<typeof setTimeout>;
        let lastH = document.body.scrollHeight;
        const ro = new ResizeObserver(() => {
          clearTimeout(t);
          t = setTimeout(() => {
            if (Math.abs(document.body.scrollHeight - lastH) > 40) ScrollTrigger.refresh();
            lastH = document.body.scrollHeight;
          }, 250);
        });
        ro.observe(document.body);
        cleanups.push(() => {
          ro.disconnect();
          clearTimeout(t);
        });
      });
    }

    return () => {
      killed = true;
      ctx?.revert();
      cleanups.forEach((f) => f());
      html.classList.remove('hm-js');
      delete html.dataset.hmReady;
    };
  }, []);
  return null;
}
