'use client';

import { useEffect } from 'react';

// Director de movimiento de la portada. Un solo componente cliente que:
// 1) revela titulares y bloques al entrar en pantalla (IntersectionObserver + CSS),
// 2) adapta la barra superior al color de la sección y cambia la pantalla activa en "Cómo funciona",
// 3) carga GSAP + ScrollTrigger después de pintar, solo para lo que va atado al scroll
//    (línea de progreso, carrete horizontal, recorrido de la Ruta y parallax moderado).
// Con "reducir movimiento" no se oculta nada ni se anima nada: queda todo visible y quieto.
export default function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.hm');
    if (!root) return;
    document.documentElement.dataset.hmReady = '1';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) document.documentElement.classList.add('hm-js');
    const cleanups: (() => void)[] = [];

    // 1) Revelado progresivo.
    const ioReveal = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            ioReveal.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );
    root.querySelectorAll('[data-split],[data-stamps]').forEach((el) => ioReveal.observe(el));
    cleanups.push(() => ioReveal.disconnect());

    // 2a) Barra superior: tema según la sección que tiene debajo y versión compacta al bajar.
    const nav = root.querySelector<HTMLElement>('[data-nav]');
    // Barra fija de "Avísame" en el celular: aparece al dejar el héroe y se esconde al llegar al cierre.
    const dock = root.querySelector<HTMLElement>('[data-dock]');
    const hero = root.querySelector<HTMLElement>('.hm-hero');
    const final = root.querySelector<HTMLElement>('#descargar');
    const secciones = Array.from(root.querySelectorAll<HTMLElement>('[data-theme]'));
    const pend = Array.from(root.querySelectorAll<HTMLElement>('[data-split],[data-stamps]'));
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!nav) return;
        const y = 36;
        const s = secciones.find((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= y && r.bottom > y;
        });
        nav.dataset.theme = s?.dataset.theme ?? 'dark';
        nav.classList.toggle('is-scrolled', window.scrollY > 24);
        // Salvaguarda: un titular que ya pasó por encima (salto con un enlace del menú) se muestra igual.
        pend.forEach((el) => {
          if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
        });
        if (dock && hero && final) {
          const on = hero.getBoundingClientRect().bottom < 0 && final.getBoundingClientRect().top > window.innerHeight * 0.85;
          dock.classList.toggle('is-on', on);
          dock.setAttribute('aria-hidden', on ? 'false' : 'true');
          dock.toggleAttribute('inert', !on);
        }
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

    // 2b) Cómo funciona: la etapa que cruza el centro de la pantalla elige la captura del teléfono fijo.
    const pasos = root.querySelector<HTMLElement>('[data-steps]');
    if (pasos) {
      const items = Array.from(pasos.querySelectorAll<HTMLElement>('[data-step]'));
      const io = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            const k = (e.target as HTMLElement).dataset.step!;
            pasos.dataset.active = k;
            items.forEach((it) => it.classList.toggle('is-active', it.dataset.step === k));
          }),
        { rootMargin: '-48% 0px -48% 0px' },
      );
      items.forEach((it) => io.observe(it));
      cleanups.push(() => io.disconnect());
    }

    if (reduce) return () => cleanups.forEach((f) => f());

    // Inclinación del teléfono del héroe con el puntero (solo con mouse).
    const tilt = root.querySelector<HTMLElement>('[data-tilt]');
    if (tilt && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let r2 = 0;
      const move = (e: PointerEvent) => {
        cancelAnimationFrame(r2);
        r2 = requestAnimationFrame(() => {
          const dx = e.clientX / window.innerWidth - 0.5;
          const dy = e.clientY / window.innerHeight - 0.5;
          tilt.style.setProperty('--ry', `${(dx * 10).toFixed(2)}deg`);
          tilt.style.setProperty('--rx', `${(-dy * 7).toFixed(2)}deg`);
        });
      };
      window.addEventListener('pointermove', move, { passive: true });
      cleanups.push(() => {
        window.removeEventListener('pointermove', move);
        cancelAnimationFrame(r2);
      });
    }

    // 3) GSAP: se carga aparte para no frenar la primera carga.
    let killed = false;
    let ctx: { revert: () => void } | null = null;
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      ctx = mm;

      mm.add('(min-width: 0px)', () => {
        // Héroe: al bajar, la escena se aleja con profundidad.
        gsap.to('.hm-hero-stage', {
          yPercent: 8,
          scale: 0.96,
          ease: 'none',
          scrollTrigger: { trigger: '.hm-hero', start: 'top top', end: 'bottom top', scrub: true },
        });

        // Línea de progreso que une las 4 etapas.
        gsap.fromTo(
          '.hm-steps-line i',
          { scaleY: 0 },
          { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.hm-steps-list', start: 'top 55%', end: 'bottom 55%', scrub: true } },
        );

        // Parallax moderado.
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
          const v = parseFloat(el.dataset.parallax || '0.1');
          gsap.fromTo(
            el,
            { y: () => window.innerHeight * v },
            { y: () => -window.innerHeight * v, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } },
          );
        });

        // Ruta del mes: el recorrido se dibuja con el scroll y cada parada se enciende al pasar.
        const ruta = document.querySelector<SVGPathElement>('.hm-ruta-path');
        const rutaBox = document.querySelector<HTMLElement>('.hm-ruta-map');
        if (ruta && rutaBox) {
          const L = ruta.getTotalLength();
          gsap.set(ruta, { strokeDasharray: L, strokeDashoffset: L });
          const stops = Array.from(rutaBox.querySelectorAll<HTMLElement>('[data-at]'));
          gsap.to(ruta, {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: rutaBox,
              start: 'top 75%',
              end: 'bottom 45%',
              scrub: 0.6,
              onUpdate: (st) => stops.forEach((s) => s.classList.toggle('is-on', st.progress >= parseFloat(s.dataset.at!))),
            },
          });
        }
      });

      // Carrete horizontal fijo (solo escritorio). En el celular se desliza con el dedo.
      mm.add('(min-width: 1024px)', () => {
        const sec = document.querySelector<HTMLElement>('.hm-tour');
        const track = document.querySelector<HTMLElement>('.hm-tour-track');
        if (!sec || !track) return;
        sec.classList.add('is-pinned');
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 48);
        gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        return () => sec.classList.remove('is-pinned');
      });

      // Las imágenes cargan perezosas: recalcular cuando cambie el alto de la página.
      let t: ReturnType<typeof setTimeout>;
      let lastH = document.body.scrollHeight;
      const ro = new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => {
          const h = document.body.scrollHeight;
          if (Math.abs(h - lastH) > 40) ScrollTrigger.refresh();
          lastH = document.body.scrollHeight;
        }, 250);
      });
      ro.observe(document.body);
      cleanups.push(() => {
        ro.disconnect();
        clearTimeout(t);
      });
    });

    return () => {
      killed = true;
      ctx?.revert();
      cleanups.forEach((f) => f());
      document.documentElement.classList.remove('hm-js');
      delete document.documentElement.dataset.hmReady;
    };
  }, []);
  return null;
}
