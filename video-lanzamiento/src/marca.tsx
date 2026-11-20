import { loadFont } from '@remotion/fonts';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';

// Identidad de Camina para el video: colores oficiales, tipografías de la marca (Mona Sans para titulares,
// Plus Jakarta Sans como en la app) y piezas que se repiten (teléfono, tomas de Tarija, títulos).

export const C = {
  negro: '#0b0b0d',
  morado: '#200a52',
  verde: '#62f0b6',
  blanco: '#ffffff',
  gris: '#a7a7b1',
};

loadFont({ family: 'Mona', url: staticFile('fonts/MonaSans-Variable.woff2'), weight: '200 900' });
loadFont({ family: 'Jakarta', url: staticFile('fonts/PlusJakartaSans_500Medium.ttf'), weight: '500' });
loadFont({ family: 'Jakarta', url: staticFile('fonts/PlusJakartaSans_700Bold.ttf'), weight: '700' });
loadFont({ family: 'Jakarta', url: staticFile('fonts/PlusJakartaSans_800ExtraBold.ttf'), weight: '800' });

export const suave = Easing.bezier(0.16, 1, 0.3, 1);

// ¿Video vertical (9:16) o horizontal (16:9)?
export const useVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

// Toma de video a sangre, con un acercamiento lento y el color cálido de la campaña.
export const Toma = ({
  src,
  zoom = [1.06, 1.16],
  desde = 0,
  oscurecer = 0.25,
  posicion = 'center',
}: {
  src: string;
  zoom?: [number, number];
  desde?: number;
  oscurecer?: number;
  posicion?: string;
}) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = interpolate(f, [0, durationInFrames], zoom);
  return (
    <AbsoluteFill style={{ backgroundColor: C.negro, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${s})` }}>
        <Video
          src={staticFile(src)}
          trimBefore={desde}
          muted
          objectFit="cover"
          style={{ width: '100%', height: '100%', objectPosition: posicion, filter: 'contrast(1.06) saturate(1.08) sepia(0.06)' }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(11,11,13,0.55) 100%), linear-gradient(180deg, rgba(11,11,13,${oscurecer * 0.6}) 0%, rgba(11,11,13,${oscurecer}) 60%, rgba(11,11,13,${oscurecer + 0.35}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// Línea de texto que sube desde una máscara (entrada) y se desvanece (salida).
export const Linea = ({
  children,
  entra,
  sale,
  style,
}: {
  children: ReactNode;
  entra: number;
  sale?: number;
  style?: CSSProperties;
}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [entra, entra + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  const o = sale === undefined ? 1 : interpolate(f, [sale, sale + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ overflow: 'hidden', paddingBottom: '0.08em' }}>
      <div style={{ transform: `translateY(${(1 - p) * 105}%)`, opacity: o, ...style }}>{children}</div>
    </div>
  );
};

export const titular: CSSProperties = {
  fontFamily: 'Mona',
  fontWeight: 780,
  fontStretch: '118%',
  letterSpacing: '-0.03em',
  lineHeight: 0.95,
  color: C.blanco,
  textTransform: 'uppercase',
};

// Teléfono con isla dinámica. Las capturas de la app son de 780 × 1691 (o 1688).
export const Telefono = ({ ancho, children, style }: { ancho: number; children: ReactNode; style?: CSSProperties }) => {
  const alto = (ancho * 1691) / 780;
  const borde = ancho * 0.028;
  return (
    <div
      style={{
        position: 'relative',
        width: ancho + borde * 2,
        height: alto + borde * 2,
        padding: borde,
        borderRadius: ancho * 0.15,
        background: '#050506',
        boxShadow: `0 0 0 ${ancho * 0.004}px rgba(255,255,255,0.18), 0 ${ancho * 0.12}px ${ancho * 0.25}px -${ancho * 0.06}px rgba(0,0,0,0.75), 0 0 ${ancho * 0.35}px rgba(98,240,182,0.12)`,
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: ancho, height: alto, borderRadius: ancho * 0.125, overflow: 'hidden', background: '#16101f' }}>
        {children}
      </div>
    </div>
  );
};

// Pantalla de la app (captura real) que ocupa toda la pantalla del teléfono.
export const Pantalla = ({ src, style }: { src: string; style?: CSSProperties }) => (
  <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', ...style }} />
);

export const Moneda = ({ size }: { size: number }) => <Img src={staticFile('app/moneda.png')} style={{ width: size, height: size }} />;

export const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
