import Image from 'next/image';
import { Fragment, type ReactNode } from 'react';

// Piezas visuales compartidas de la portada. Todo server component: el movimiento lo pone HomeMotion.

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

// Etiqueta pequeña sobre los titulares.
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="hm-eyebrow" data-reveal>
      <span aria-hidden="true" />
      {children}
    </p>
  );
}

// Titular que se revela palabra por palabra. Lo que va entre *asteriscos* sale en serif itálica (acento editorial).
export function Title({ text, as: Tag = 'h2', className = '' }: { text: string; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
  const words = text.split(' ');
  return (
    <Tag className={`hm-title ${className}`} data-split aria-label={text.replace(/\*/g, '')}>
      {words.map((w, i) => {
        const acc = w.startsWith('*') || w.endsWith('*');
        return (
          <Fragment key={i}>
            <span className="hm-w" aria-hidden="true">
              <span className={acc ? 'hm-acc' : undefined} style={{ ['--i' as string]: i }}>
                {w.replace(/\*/g, '')}
              </span>
            </span>
            {i < words.length - 1 ? ' ' : null}
          </Fragment>
        );
      })}
    </Tag>
  );
}

// Huella del logo de Camina usada como máscara: toma el color del texto (currentColor).
export function Foot({ side = 'L', className = '', style }: { side?: 'L' | 'R'; className?: string; style?: React.CSSProperties }) {
  return <i className={`hm-foot hm-foot-${side} ${className}`} style={style} aria-hidden="true" />;
}

export function Arrow() {
  return (
    <svg className="hm-arrow" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
