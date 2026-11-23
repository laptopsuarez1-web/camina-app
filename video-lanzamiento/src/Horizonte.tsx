import { loadFont } from '@remotion/fonts';
import type { CSSProperties } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';
import { C } from './marca';

// CAMINA · «Hay más por caminar» — teaser vertical (1080 × 1920, 30 fps, ≈ 19,5 s), sin voz.
// Recurso: un horizonte curvo siempre en el mismo lugar; debajo cambian las texturas (Tarija, Bolivia, la app) en cada pulso
// de la música y la frase queda quieta sobre la curva. Final: silencio, amanecer en los colores de Camina y el logo.
// Música: «Glassworks: IV. Rubric» (Philip Glass / Signal, usada con permiso): 219,2 s → 230,0 s (entrada fuerte a los
// 10,8 s del video) y el golpe final de la obra con el logo. Ver scripts/horizonte_sonido.py.

loadFont({ family: 'Caslon', url: staticFile('fonts/libre-caslon-text-latin-400-normal.woff2'), weight: '400' });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const suaveP = Easing.bezier(0.4, 0, 0.2, 1);
export const TI = (30 * 60) / 94.646; // cuadros por tiempo de Rubric
const f = (tiempos: number) => Math.round(tiempos * TI);

// Horizonte: borde de un círculo enorme; su punto más alto está en ARCO_Y.
const ARCO_Y = 1150;
const R = 2100;

type Fondo = 'negro' | 'morado' | 'azul' | 'crema' | 'blanco';
type Toma = { src: string; fondo: Fondo; d: number };
const t = (src: string, fondo: Fondo, d = 1): Toma => ({ src, fondo, d });

// Texturas recortadas a la franja bajo el horizonte (scripts/horizonte_cortes.sh). d = duración en tiempos.
const TOMAS: Toma[] = [
  // «Hay»
  t('tierra-noche.mp4', 'negro'),
  t('dunas.mp4', 'azul'),
  t('tela-verde.mp4', 'negro'),
  t('hojas.mp4', 'crema'),
  // «más»
  t('costa.mp4', 'morado'),
  t('tarija-aerea.mp4', 'azul'),
  t('tela-amarilla.mp4', 'negro'),
  t('cafe.mp4', 'crema'),
  // «por caminar»
  t('pasos.mp4', 'morado'),
  t('olas.mp4', 'azul'),
  t('fuego.mp4', 'negro'),
  t('pasto.mp4', 'crema'),
  t('tinta.mp4', 'blanco'),
  t('chunchos.jpg', 'morado'),
  t('girasoles.mp4', 'azul'),
  t('burbujas.mp4', 'negro'),
  t('canon.mp4', 'crema'),
  // ráfaga a medio tiempo (después de la entrada fuerte de la música)
  t('tierra-dia.mp4', 'negro', 0.5),
  t('tela-naranja.mp4', 'morado', 0.5),
  t('la-paz-noche.jpg', 'negro', 0.5),
  t('arena.mp4', 'crema', 0.5),
  t('titicaca.jpg', 'azul', 0.5),
  t('rayos.mp4', 'negro', 0.5),
  t('moneda', 'morado', 0.5),
  t('olas-aereas.mp4', 'azul', 0.5),
  t('fuente.mp4', 'crema', 0.5),
  t('sol-mar.mp4', 'negro', 0.5),
];

const INICIO = f(2); // amanecer sobre el horizonte
const bordes: number[] = [];
TOMAS.reduce((u, x) => {
  bordes.push(f(2 + u));
  return u + x.d;
}, 0);
const FIN_MONTAJE = f(2 + TOMAS.reduce((u, x) => u + x.d, 0)); // tiempo 24 ≈ 15,2 s
const FINAL = f(25); // golpe final de Rubric ≈ 15,85 s
export const DUR_HORIZONTE = Math.round(19.5 * 30);

// Frases quietas sobre la curva: [texto, desde (tiempo), hasta (tiempo)]
const FRASES: [string, number, number][] = [
  ['Hay', 2, 6],
  ['más', 6, 10],
  ['por caminar', 10, 19],
];

export const Horizonte = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence name="Amanecer" durationInFrames={INICIO + 4}>
        <Planeta modo="amanecer" />
      </Sequence>
      {TOMAS.map((x, i) => (
        <Sequence key={i} name={`${i + 1} ${x.src}`} from={bordes[i]} durationInFrames={(bordes[i + 1] ?? FIN_MONTAJE) - bordes[i]}>
          <Arco t={x} />
        </Sequence>
      ))}
      <Sequence name="Silencio" from={FIN_MONTAJE} durationInFrames={FINAL - FIN_MONTAJE}>
        <AbsoluteFill style={{ backgroundColor: '#000' }} />
      </Sequence>
      <Sequence name="Final: horizonte Camina" from={FINAL}>
        <Final />
      </Sequence>
      {FRASES.map(([texto, a, b]) => (
        <Sequence key={texto} name={`Frase: ${texto}`} from={f(a)} durationInFrames={f(b) - f(a)}>
          <Frase texto={texto} desde={f(a)} />
        </Sequence>
      ))}
      <Grano />
      <Audio name="Música" src={staticFile('audio/horizonte-mezcla.wav')} />
    </AbsoluteFill>
  );
};

// Toma: arriba un fondo limpio (negro, morado, azul cielo, crema o blanco); abajo la textura, cortada por la curva.
const BANDA_Y = 1100; // la textura ocupa la franja de 1100 a 1920 (los recortes ya tienen ese tamaño: 1080 × 820)
const recorte = `circle(${R}px at 50% ${ARCO_Y - BANDA_Y + R}px)`;
const FONDOS: Record<Fondo, string> = {
  negro: 'radial-gradient(120% 40% at 50% 62%, rgba(255,255,255,0.06), transparent 70%), #050507',
  morado: 'linear-gradient(180deg, #0c0322 0%, #1d0848 55%, #3a1490 100%)',
  azul: 'linear-gradient(180deg, #2160b8 0%, #5d9be0 55%, #a9d0f2 100%)',
  crema: 'radial-gradient(120% 70% at 50% 40%, #efe9dd, #e2dacb)',
  blanco: '#f4f2ee',
};
const claro = (fo: Fondo) => fo === 'crema' || fo === 'blanco';
const Arco = ({ t }: { t: Toma }) => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const q = suaveP(Math.min(1, fr / durationInFrames));
  const estilo: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.02 + 0.04 * q})` };
  return (
    <AbsoluteFill style={{ background: FONDOS[t.fondo] }}>
      <div style={{ position: 'absolute', left: 0, top: BANDA_Y, width: 1080, height: 820, overflow: 'hidden', clipPath: recorte }}>
        {t.src === 'moneda' ? (
          <AbsoluteFill style={{ background: '#1a0a40' }}>
            <Img src={staticFile('app/moneda.png')} style={{ position: 'absolute', left: 540 - 600, top: 40, width: 1200, height: 1200, transform: `rotate(${-8 + 10 * q}deg)` }} />
          </AbsoluteFill>
        ) : t.src.endsWith('.mp4') ? (
          <Video src={staticFile(`hz/${t.src}`)} muted objectFit="cover" style={estilo} />
        ) : (
          <Img src={staticFile(`hz/${t.src}`)} style={estilo} />
        )}
      </div>
      {/* filo de luz sobre la curva (como la atmósfera de un planeta) */}
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO_Y, width: R * 2, height: R * 2, borderRadius: '50%', boxShadow: claro(t.fondo) ? '0 -2px 10px rgba(0,0,0,0.08)' : '0 -3px 18px rgba(255,255,255,0.22)' }} />
    </AbsoluteFill>
  );
};

// Horizonte «planeta» dibujado: amanecer al principio (naranja y azul) y en el final con los colores de Camina.
const Planeta = ({ modo }: { modo: 'amanecer' | 'camina' }) => {
  const fr = useCurrentFrame();
  const luz = interpolate(fr, [0, 34], [0, 1], { ...clamp, easing: suaveP });
  const borde = modo === 'amanecer' ? 'rgba(255,140,60,0.95)' : 'rgba(98,240,182,0.9)';
  const halo = modo === 'amanecer' ? 'rgba(80,150,255,0.55)' : 'rgba(120,80,255,0.6)';
  const cielo = modo === 'amanecer' ? '#02040a' : '#0d0420';
  const suelo = modo === 'amanecer' ? '#05070c' : '#120530';
  return (
    <AbsoluteFill style={{ backgroundColor: cielo, overflow: 'hidden' }}>
      <AbsoluteFill style={{ opacity: luz, background: `radial-gradient(120% 28% at 50% ${(ARCO_Y / 1920) * 100}%, ${halo}, transparent 70%)` }} />
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO_Y, width: R * 2, height: R * 2, borderRadius: '50%', background: suelo, boxShadow: `0 -4px ${10 + 30 * luz}px ${borde}, 0 -20px ${80 * luz}px ${halo}` }} />
      {modo === 'amanecer' && (
        <div style={{ position: 'absolute', left: 540 - 90, top: ARCO_Y - 40, width: 180, height: 80, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,250,235,1), rgba(255,170,80,0.6) 45%, transparent 100%)', opacity: interpolate(fr, [14, 38], [0, 1], { ...clamp, easing: suaveP }) }} />
      )}
    </AbsoluteFill>
  );
};

const fondoEn = (cuadro: number): Fondo => {
  let k = 0;
  for (let i = 0; i < bordes.length; i++) if (cuadro >= bordes[i]) k = i;
  return TOMAS[k].fondo;
};
const Frase = ({ texto, desde }: { texto: string; desde: number }) => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(fr, [0, 8, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], { ...clamp, easing: suaveP });
  const blur = interpolate(fr, [0, 8], [5, 0], { ...clamp, easing: suaveP });
  const oscuro = claro(fondoEn(desde + fr));
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: ARCO_Y - 118,
        textAlign: 'center',
        fontFamily: 'Caslon',
        fontSize: 64,
        letterSpacing: '-0.005em',
        color: oscuro ? '#1b1a19' : '#ffffff',
        opacity: o,
        filter: `blur(${blur}px)`,
        textShadow: oscuro ? 'none' : '0 0 18px rgba(255,255,255,0.18)',
      }}
    >
      {texto}
    </div>
  );
};

const Final = () => {
  const fr = useCurrentFrame();
  const t1 = interpolate(fr, [6, 18, 32, 40], [0, 1, 1, 0], { ...clamp, easing: suaveP });
  const t2 = interpolate(fr, [40, 54], [0, 1], { ...clamp, easing: suaveP });
  const t3 = interpolate(fr, [62, 76], [0, 1], { ...clamp, easing: suaveP });
  return (
    <AbsoluteFill>
      <Planeta modo="camina" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 128, textAlign: 'center', fontFamily: 'Caslon', fontSize: 64, color: '#fff', opacity: t1, filter: `blur(${(1 - t1) * 6}px)` }}>Caminá y ganá</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 150, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, opacity: t2, filter: `blur(${(1 - t2) * 6}px)` }}>
        <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: 104, height: 104, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Mona', fontWeight: 780, fontStretch: '118%', fontSize: 84, letterSpacing: '0.06em', color: '#fff' }}>CAMINA</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y + 70, textAlign: 'center', fontFamily: 'Caslon', fontSize: 40, color: C.verde, opacity: t3 }}>Muy pronto</div>
    </AbsoluteFill>
  );
};

const Grano = () => {
  const fr = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.16, mixBlendMode: 'overlay' }}>
        <filter id={`h${fr}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={fr % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#h${fr})`} />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(120% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
    </AbsoluteFill>
  );
};
