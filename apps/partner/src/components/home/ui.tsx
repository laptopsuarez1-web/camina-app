import Image from 'next/image';
import type { ReactNode } from 'react';
import { EMAIL_AVISAME } from './data';

// Piezas visuales compartidas de la portada. Server components: el movimiento lo pone HomeMotion.

// Teléfono con una captura real de la app. Las capturas miden 780×1688.
export function Phone({
  src,
  alt,
  sizes = '(max-width: 760px) 70vw, 340px',
  preload = false,
  className = '',
  children,
}: {
  src?: string;
  alt?: string;
  sizes?: string;
  preload?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`hm-phone ${className}`}>
      <div className="hm-phone-screen">
        {src ? <Image src={src} alt={alt ?? ''} width={780} height={1688} sizes={sizes} preload={preload} /> : null}
        {children}
      </div>
    </div>
  );
}

// Titular que se revela línea a línea desde una máscara. Cada "|" corta una línea.
export function Title({ text, as: Tag = 'h2', className = '', id }: { text: string; as?: 'h1' | 'h2' | 'h3'; className?: string; id?: string }) {
  const lines = text.split('|');
  return (
    <Tag className={`hm-title ${className}`} id={id} data-split>
      {lines.map((l, i) => (
        <span className="hm-line" key={i}>
          <span style={{ ['--i' as string]: i }}>{l.trim()}</span>
        </span>
      ))}
    </Tag>
  );
}

// Llamado a la acción principal: hasta que la app esté en las tiendas, pedir que te avisen.
export function CtaAvisame({ medir, label = 'Avísame cuando salga', className = '' }: { medir: string; label?: string; className?: string }) {
  return (
    <a className={`hm-btn ${className}`} href={EMAIL_AVISAME} data-medir={medir}>
      {label}
    </a>
  );
}

// Huella del logo de Camina usada como máscara: toma el color del texto (currentColor).
export function Foot({ side = 'L', className = '', style }: { side?: 'L' | 'R'; className?: string; style?: React.CSSProperties }) {
  return <i className={`hm-foot hm-foot-${side} ${className}`} style={style} aria-hidden="true" />;
}

// Iconos dibujados (trazo 1.75, esquinas redondas) para lo que no es texto.
export function Icon({ name }: { name: 'check' | 'flag' | 'ticket' | 'badge' | 'swap' }) {
  const p = {
    check: <path d="M5 12.5 10 17.5 19 7" />,
    flag: <path d="M6 21V4m0 1h11l-2.5 4L17 13H6" />,
    ticket: (
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5ZM14 6v12" />
    ),
    badge: (
      <>
        <circle cx="12" cy="10" r="6" />
        <path d="M8.5 15 7 21l5-2.5L17 21l-1.5-6" />
      </>
    ),
    swap: <path d="M9 7 4 12l5 5M15 7l5 5-5 5" />,
  }[name];
  return (
    <svg className="hm-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p}
    </svg>
  );
}
