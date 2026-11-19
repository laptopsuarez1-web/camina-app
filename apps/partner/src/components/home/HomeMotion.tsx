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
    const reveal = Array.from(root.querySelectorAll<HTMLElement>('[data-split],[data-reveal],[data-stagger]'));
    const ioReveal = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          ioReveal.unobserve(e.target);
        }),
      { rootMargin: '0px 0px 6% 0px', threshold: 0 },
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

    // Microinteracciones con mouse: botones magnéticos y logos de comercios que se inclinan hacia el puntero.
    if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const move = (e: PointerEvent) => {
        const t = e.target as HTMLElement | null;
        const btn = t?.closest<HTMLElement>('.hm-btn');
        if (btn) {
          const r = btn.getBoundingClientRect();
          btn.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - 0.5) * 8}px`);
          btn.style.setProperty('--my', `${((e.clientY - r.top) / r.height - 0.5) * 6}px`);
          btn.style.setProperty('--sx', `${e.clientX - r.left}px`);
        }
        const shop = t?.closest<HTMLElement>('.hm-shop');
        if (shop) {
          const r = shop.getBoundingClientRect();
          shop.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 14).toFixed(2)}deg`);
          shop.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(2)}deg`);
        }
      };
      const leave = (e: PointerEvent) => {
        const t = e.target as HTMLElement | null;
        if (t?.classList.contains('hm-btn')) {
          t.style.setProperty('--mx', '0px');
          t.style.setProperty('--my', '0px');
        }
        if (t?.classList.contains('hm-shop')) {
          t.style.setProperty('--rx', '0deg');
          t.style.setProperty('--ry', '0deg');
        }
      };
      root.addEventListener('pointermove', move, { passive: true });
      root.addEventListener('pointerout', leave, { passive: true });
      cleanups.push(() => {
        root.removeEventListener('pointermove', move);
        root.removeEventListener('pointerout', leave);
      });
    }

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
          // Parallax moderado de los teléfonos.
          gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
            const v = parseFloat(el.dataset.parallax || '0.05');
            gsap.fromTo(
              el,
              { y: () => window.innerHeight * v },
              { y: () => -window.innerHeight * v, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } },
            );
          });

          // Héroe: el teléfono principal se endereza y se acerca al bajar; el de atrás se abre hacia un costado.
          const hero = document.querySelector('.hm-hero');
          if (hero) {
            const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
            gsap.fromTo('.hm-hero-front', { rotateX: 0, rotateY: -14, scale: 1 }, { rotateX: 8, rotateY: 0, scale: 0.92, y: 60, ease: 'none', scrollTrigger: st });
            gsap.fromTo('.hm-hero-back', { x: 0, rotateY: -20 }, { x: -60, y: 120, rotateY: 0, opacity: 0.6, ease: 'none', scrollTrigger: st });
            gsap.to('.hm-hero-copy', { y: -40, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: '40% top', end: 'bottom top', scrub: true } });
          }

          // Secciones oscuras: entran como una pantalla que se abre (de tarjeta redondeada a pantalla completa).
          gsap.utils.toArray<HTMLElement>('.hm-sec.hm-dark').forEach((sec) => {
            gsap.fromTo(
              sec,
              { clipPath: 'inset(0% 3% 0% 3% round 44px)' },
              { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 25%', scrub: true } },
            );
          });

          // Pasos que se vuelven Puntos: el contador avanza con el scroll (1.000 pasos = 1 Punto).
          const conv = document.querySelector<HTMLElement>('[data-conv]');
          if (conv) {
            const pasos = conv.querySelector<HTMLElement>('[data-conv-pasos]');
            const pts = conv.querySelector<HTMLElement>('[data-conv-pts]');
            let last = -1;
            ScrollTrigger.create({
              trigger: conv,
              start: 'top 85%',
              end: 'top 30%',
              scrub: true,
              onUpdate: (st) => {
                const n = Math.round(st.progress * 10000);
                if (pasos) pasos.textContent = n.toLocaleString('es-BO');
                const p = Math.floor(n / 1000);
                if (pts && p !== last) {
                  pts.textContent = String(p);
                  conv.classList.remove('is-pop');
                  void conv.offsetWidth;
                  if (p > 0) conv.classList.add('is-pop');
                  last = p;
                }
                conv.style.setProperty('--p', st.progress.toFixed(3));
              },
            });
          }

          // Huellas que caminan: cada fila avanza pie por pie mientras su sección entra en pantalla.
          gsap.utils.toArray<HTMLElement>('[data-walk]').forEach((w) => {
            ScrollTrigger.create({
              trigger: w,
              start: 'top 95%',
              end: 'top 35%',
              scrub: true,
              onUpdate: (st) => w.style.setProperty('--p', st.progress.toFixed(3)),
            });
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
