import { loadFont } from '@remotion/fonts';
import type { CSSProperties } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';
import { C } from './marca';

// CAMINA · «Hay más por caminar» — teaser vertical (1080 × 1920, 30 fps, ≈ 19,5 s), sin voz.
// Recurso: un horizonte curvo siempre en el mismo lugar; debajo cambian las texturas (Tarija, Bolivia, la app) en cada pulso
// de la música y la frase queda quieta sobre la curva. Final: silencio, amanecer en los colores de Camina y el logo.
// Música: «Glassworks: IV. Rubric» (Philip Glass / Signal, usada con permiso): 219,2 s → 230,0 s (entrada fuerte a los
// 10,8 s del video) y el golpe final de la obra con el logo. Ver scripts/horizonte_sonido.py.

loadFont({ family: 'Serif', url: staticFile('fonts/newsreader-latin-400-normal.woff2'), weight: '400' });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const suaveP = Easing.bezier(0.4, 0, 0.2, 1);
export const TI = (30 * 60) / 94.646; // cuadros por tiempo de Rubric
const f = (tiempos: number) => Math.round(tiempos * TI);

// Horizonte: borde de un círculo enorme; su punto más alto está en ARCO_Y.
const ARCO_Y = 1150;
const R = 2100;

type Textura = { src: string; video?: boolean; desde?: number; escala?: number; origen?: string };
const v = (src: string, desde = 0, escala = 1.05, origen = 'center'): Textura => ({ src: `yasi/v/${src}.mp4`, video: true, desde, escala, origen });
const ft = (src: string, escala = 1.1, origen = 'center'): Textura => ({ src: `yasi/f/${src}`, escala, origen });

// [textura, duración en tiempos]
const TOMAS: [Textura, number][] = [
  // «Hay»
  [v('aerea', 10, 1.05), 1],
  [ft('chunchos-san-roque.jpg', 2.2, '45% 35%'), 1],
  [v('plaza-fuente-lado', 0, 1.15, 'center 70%'), 1],
  [ft('vinedos.jpg', 1.4, 'center 80%'), 1],
  // «más»
  [ft('lp-illimani.jpg', 1.2, 'center 45%'), 1],
  [ft('empanada-blanqueada.jpg', 2.0, 'center 40%'), 1],
  [ft('banderas-bolivia.jpg', 2.4, '30% 40%'), 1],
  [ft('isla-del-sol-camino.jpg', 1.15, 'center 60%'), 1],
  // «por caminar»
  [v('pov', 5, 1.05), 1],
  [ft('parque-bolivar-tarija.jpg', 1.3, 'center 70%'), 1],
  [ft('san-roque-iglesia.jpg', 1.6, 'center 35%'), 1],
  [ft('titicaca-terrazas.jpg', 1.4, 'center 65%'), 1],
  [ft('lp-noche.jpg', 1.3, 'center 60%'), 1],
  [v('m609', 8, 1.1), 1],
  [ft('tiwanaku-puerta-del-sol.jpg', 2.0, '50% 30%'), 1],
  [ft('sc-plaza-24.jpg', 1.3, 'center 60%'), 1],
  [ft('sc-catedral.jpg', 1.8, 'center 35%'), 1],
  // ráfaga a medio tiempo (después de la entrada fuerte)
  [ft('t-glorieta.jpg', 1.4), 0.5],
  [ft('chunchos-san-roque.jpg', 2.6, '75% 30%'), 0.5],
  [ft('mercado-central-tarija.jpg', 1.3, 'center 70%'), 0.5],
  [{ src: 'app/moneda.png', escala: 3.2 }, 0.5],
  [ft('t-casa-dorada.jpg', 1.3, 'center 40%'), 0.5],
  [ft('puente-aereo.jpg', 1.3), 0.5],
  [ft('t-plaza-luis-de-fuentes.jpg', 1.3, 'center 60%'), 0.5],
  [ft('t-rueda-chapaca.jpg', 1.6, 'center 40%'), 0.5],
  [v('plaza-palomas', 0, 1.1, 'center 75%'), 0.5],
  [v('gente-plaza', 0, 1.1, 'center 75%'), 0.5],
];

const INICIO = f(2); // amanecer sobre el horizonte
const bordes: number[] = [];
TOMAS.reduce((t, [, d]) => {
  bordes.push(f(2 + t));
  return t + d;
}, 0);
const FIN_MONTAJE = f(2 + TOMAS.reduce((s, [, d]) => s + d, 0)); // tiempo 24 ≈ 15,2 s
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
      {TOMAS.map(([t], i) => (
        <Sequence key={i} name={`${i + 1} ${t.src.split('/').pop()}`} from={bordes[i]} durationInFrames={(bordes[i + 1] ?? FIN_MONTAJE) - bordes[i]}>
          <Arco t={t} i={i} />
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
          <Frase texto={texto} />
        </Sequence>
      ))}
      <Grano />
      <Audio name="Música" src={staticFile('audio/horizonte-mezcla.wav')} />
    </AbsoluteFill>
  );
};

// Toma: la textura llena todo lo que está debajo de la curva; arriba, la misma imagen muy desenfocada y oscura (cielo).
const recorte = `circle(${R}px at 50% ${ARCO_Y + R}px)`;
const Arco = ({ t, i }: { t: Textura; i: number }) => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const q = suaveP(Math.min(1, fr / durationInFrames));
  const deriva = (random(`d${i}`) - 0.5) * 3; // leve paneo distinto en cada toma
  const medio = (estilo: CSSProperties) =>
    t.video ? (
      <Video src={staticFile(t.src)} trimBefore={t.desde ?? 0} muted objectFit="cover" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectPosition: t.origen, ...estilo }} />
    ) : (
      <Img src={staticFile(t.src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: t.origen, ...estilo }} />
    );
  const esc = (t.escala ?? 1.1) * (1 + 0.04 * q);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      {/* cielo */}
      <AbsoluteFill style={{ transform: `scale(${esc * 1.2})` }}>{medio({ filter: 'blur(60px) brightness(0.42) saturate(1.2)' })}</AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%)' }} />
      {/* superficie bajo la curva */}
      <AbsoluteFill style={{ clipPath: recorte }}>
        <AbsoluteFill style={{ transform: `scale(${esc}) translateX(${deriva * q}%)`, transformOrigin: `50% ${(ARCO_Y / 1920) * 100}%` }}>
          {medio({ filter: 'contrast(1.05) saturate(1.05) sepia(0.06)' })}
        </AbsoluteFill>
        <AbsoluteFill style={{ background: `radial-gradient(${R}px ${R}px at 50% ${ARCO_Y + R}px, transparent 96%, rgba(0,0,0,0.35) 100%)` }} />
      </AbsoluteFill>
      {/* luz de borde sobre la curva */}
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO_Y, width: R * 2, height: R * 2, borderRadius: '50%', boxShadow: '0 -6px 40px rgba(255,235,200,0.28), inset 0 10px 30px rgba(255,255,255,0.18)' }} />
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

const Frase = ({ texto }: { texto: string }) => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(fr, [0, 8, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], { ...clamp, easing: suaveP });
  const blur = interpolate(fr, [0, 8], [6, 0], { ...clamp, easing: suaveP });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: ARCO_Y - 128,
        textAlign: 'center',
        fontFamily: 'Serif',
        fontSize: 76,
        letterSpacing: '-0.01em',
        color: '#fff',
        opacity: o,
        filter: `blur(${blur}px)`,
        textShadow: '0 0 2px rgba(0,0,0,0.35), 0 0 26px rgba(255,255,255,0.18), 0 6px 30px rgba(0,0,0,0.45)',
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
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 128, textAlign: 'center', fontFamily: 'Serif', fontSize: 76, color: '#fff', opacity: t1, filter: `blur(${(1 - t1) * 6}px)` }}>Caminá y ganá</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 150, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, opacity: t2, filter: `blur(${(1 - t2) * 6}px)` }}>
        <Img src={staticFile('marca/logo-solo-morado.png')} style={{ width: 104, height: 104, borderRadius: '50%' }} />
        <span style={{ fontFamily: 'Mona', fontWeight: 780, fontStretch: '118%', fontSize: 84, letterSpacing: '0.06em', color: '#fff' }}>CAMINA</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y + 70, textAlign: 'center', fontFamily: 'Serif', fontSize: 40, color: C.verde, opacity: t3 }}>Muy pronto</div>
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
