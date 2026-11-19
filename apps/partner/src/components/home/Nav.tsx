'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CtaAvisame } from './ui';

type Enlace = readonly [string, string];
const LINKS: Enlace[] = [
  ['Cómo funciona', '#como-funciona'],
  ['Premios', '#premios'],
  ['Comunidad', '#comunidad'],
  ['Ruta del mes', '#ruta'],
];
const OTRA: Enlace = ['Para comercios', '/comercios'];

// Barra superior: se adapta al color de la sección que tiene debajo (clara u oscura) y se compacta al bajar.
// En el celular, un botón abre el menú a pantalla completa.
// En /comercios se pasan sus secciones, el enlace a la portada y el botón de registro.
export default function Nav({
  links = LINKS,
  otra = OTRA,
  cta = <CtaAvisame medir="nav_avisame" className="hm-btn-sm hm-nav-cta" label="Avísame" />,
  ctaMenu = <CtaAvisame medir="menu_avisame" />,
}: { links?: Enlace[]; otra?: Enlace; cta?: ReactNode; ctaMenu?: ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => void (document.documentElement.style.overflow = ''), []);

  const close = () => setOpen(false);

  return (
    <header className={`hm-nav${open ? ' is-open' : ''}`} data-nav>
      <div className="hm-nav-in">
        <Link href="/" className="hm-brand" aria-label="Camina, inicio">
          <Image src="/marca/logo-solo-transparente.png" alt="" width={30} height={30} />
          <span>CAMINA</span>
        </Link>
        <nav className="hm-nav-links" aria-label="Principal">
          {links.map(([t, h]) => (
            <a key={h} href={h}>{t}</a>
          ))}
          <Link href={otra[1]}>{otra[0]}</Link>
        </nav>
        <div className="hm-nav-end">
          <Link href="/login" className="hm-nav-login">Panel de comercios</Link>
          {cta}
          <button
            ref={btn}
            type="button"
            className="hm-burger"
            aria-expanded={open}
            aria-controls="hm-menu"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
          >
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <i aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id="hm-menu" className="hm-menu" ref={panel} hidden={!open}>
        <nav aria-label="Menú">
          {links.map(([t, h], i) => (
            <a key={h} href={h} onClick={close} style={{ ['--i' as string]: i }}>
              {t}
            </a>
          ))}
          <Link href={otra[1]} onClick={close} style={{ ['--i' as string]: links.length }}>
            {otra[0]}
          </Link>
        </nav>
        <div className="hm-menu-end">
          {ctaMenu}
          <Link href="/login" className="hm-link" onClick={close}>
            Ingresar al panel de comercios
          </Link>
        </div>
      </div>
    </header>
  );
}
