'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Marca "in" cuando el elemento entra en pantalla (una sola vez). El CSS hace el resto.
export function InView({ children, className = '', as: Tag = 'div', delay = 0 }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'li' | 'article' | 'figure'; delay?: number }) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const T = Tag as 'div';
  return (
    <T ref={ref as React.RefObject<HTMLDivElement>} className={`iv ${on ? 'in' : ''} ${className}`} style={{ ['--d' as string]: `${delay}ms` }}>
      {children}
    </T>
  );
}

// Titular cinético: cada palabra sube desde una máscara, una tras otra.
export function Kinetic({ text, className = '', as: Tag = 'h2' }: { text: string; className?: string; as?: 'h1' | 'h2' | 'h3' }) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setOn(true), io.disconnect()), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const T = Tag as 'h2';
  return (
    <T ref={ref as React.RefObject<HTMLHeadingElement>} className={`kin ${on ? 'in' : ''} ${className}`} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span className="kw" key={i} aria-hidden="true">
          <span style={{ ['--i' as string]: i }}>{w}</span>
        </span>
      ))}
    </T>
  );
}

// Número que cuenta hasta su valor al aparecer.
export function Counter({ to, prefix = '', suffix = '', format = true }: { to: number; prefix?: string; suffix?: string; format?: boolean }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setV(to);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / 1400);
          setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {prefix}
      {format ? v.toLocaleString('es-BO') : v}
      {suffix}
    </span>
  );
}

// Parallax vertical suave según el scroll (solo si el usuario no pidió menos movimiento).
export function Parallax({ children, speed = 0.08, className = '' }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const calc = () => {
      raf = 0;
      const r = (el.parentElement ?? el).getBoundingClientRect();
      const mid = Math.max(-700, Math.min(700, r.top + r.height / 2 - window.innerHeight / 2));
      el.style.transform = `translate3d(0, ${(-mid * speed).toFixed(1)}px, 0)`;
    };
    const on = () => !raf && (raf = requestAnimationFrame(calc));
    calc();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);
  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
