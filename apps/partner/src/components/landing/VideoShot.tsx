'use client';

import { useEffect, useRef } from 'react';

// Video corto de la app (grabado de la app real) dentro del marco de teléfono.
// Se reproduce solo mientras está en pantalla; con "reducir movimiento" queda la imagen fija.
export default function VideoShot({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className="vid"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      width={540}
      height={1174}
    />
  );
}
