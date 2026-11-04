'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Menú de tres rayitas: abre un panel de vidrio con las páginas de la web y el acceso al panel de comercios.
const LINKS = [
  ['Para ti', '/'],
  ['Cómo funciona', '/#como-funciona'],
  ['Para comercios', '/comercios'],
  ['Planes', '/comercios#planes'],
] as const;

export default function Menu() {
  const [open, setOpen] = useState(false);
  const [root, setRoot] = useState<Element | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setRoot(document.querySelector('.lp')), []);
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);
  return (
    <>
      <button type="button" className="lp-burger" aria-expanded={open} aria-controls="lp-menu" onClick={() => setOpen((v) => !v)}>
        <span>{open ? 'Cerrar' : 'Menú'}</span>
        <i aria-hidden="true" className={open ? 'x' : ''}><b /><b /><b /></i>
      </button>
      {root && createPortal(
      <div id="lp-menu" className={`lp-menu ${open ? 'on' : ''}`} hidden={!open} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <nav className="lp-menu-panel" aria-label="Menú">
          <div className="lp-menu-grp">
            {LINKS.map(([t, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>{t}<span aria-hidden="true">→</span></Link>
            ))}
          </div>
          <div className="lp-menu-cta">
            <Link className="lp-btn line" href="/login" onClick={() => setOpen(false)}>Ingresar al panel de comercio</Link>
            <Link className="lp-btn mint" href="/registro" onClick={() => setOpen(false)}>Sumar mi comercio</Link>
          </div>
        </nav>
      </div>, root)}
    </>
  );
}
