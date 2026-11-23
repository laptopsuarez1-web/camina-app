import { loadFont } from '@remotion/fonts';
import type { CSSProperties } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';
import { PULSOS } from './horizontePulsos';
import { LUZ } from './horizonteFranjas';

// CAMINA · «Hay más por caminar» — teaser vertical (1080 × 1920, 30 fps), sin voz.
// Recurso: un horizonte curvo siempre en el mismo lugar. Abre con el anillo de pasos de la app, arqueado sobre el
// horizonte, que suma pasos. Después, en cada pulso de la música, cambia lo que hay bajo la curva (Tarija, Bolivia, gente
// caminando, la app): la foto nítida y entera abajo, la misma foto difuminada arriba. La frase queda quieta sobre la curva
// y, como en la referencia, crece un poco y cambia de acabado en cada corte. Cierra el anillo completo y el logo.
// Música y pulsos: scripts/horizonte_sonido.py (genera src/horizontePulsos.ts).

loadFont({ family: 'Caslon', url: staticFile('fonts/libre-caslon-text-latin-400-normal.woff2'), weight: '400' });
loadFont({ family: 'Caslon', url: staticFile('fonts/libre-caslon-text-latin-700-normal.woff2'), weight: '700' });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const suaveP = Easing.bezier(0.4, 0, 0.2, 1);
const salida = Easing.bezier(0.16, 1, 0.3, 1);
// cuadro del pulso k (admite medios pulsos)
const p = (k: number) => {
  const i = Math.floor(k);
  const r = k - i;
  return r === 0 ? PULSOS[i] : Math.round(PULSOS[i] + r * (PULSOS[i + 1] - PULSOS[i]));
};

// Horizonte: borde de un círculo enorme; su punto más alto está en ARCO_Y.
const ARCO_Y = 1150;
const R = 2100;
const CY = ARCO_Y + R;
const BANDA_Y = 1100; // franja nítida: de 1100 a 1920 (recortes de 1080 × 820, scripts/horizonte_franjas.py)

// Acabado de la letra en cada toma (todas con borde de impresión; como en la referencia)
type Acabado = 'nitida' | 'relieve' | 'calida' | 'tenue' | 'tela' | 'halo' | 'crema' | 'desenfoque' | 'desvanece' | 'fuerte' | 'tinta';
type Toma = { src: string; d: number; acabado?: Acabado };
const t = (src: string, d = 1, acabado: Acabado = 'nitida'): Toma => ({ src, d, acabado });

// d = duración en pulsos. 'anillo' es la apertura dibujada; lo demás, franjas en public/hz.
const TOMAS: Toma[] = [
  t('anillo', 6),
  // sin palabras
  t('vinedos'),
  t('laguna'),
  t('cartel'),
  t('chunchos'),
  t('isla-sendero'),
  t('mirador'),
  t('puente'),
  t('titicaca'),
  // «Hay»
  t('pies-pov.mp4', 1, 'relieve'),
  t('plaza-lf', 1, 'calida'),
  t('mercado', 1, 'tela'),
  // «más»
  t('lp-noche', 1, 'halo'),
  t('flamencos', 1, 'tenue'),
  t('rueda', 1, 'crema'),
  // «por caminar»
  t('parque.mp4', 1, 'relieve'),
  t('mapa', 1, 'nitida'),
  t('sc-plaza', 1, 'desvanece'),
  t('san-roque', 1, 'tela'),
  t('ladrillo.mp4', 0.5, 'fuerte'),
  t('tiwanaku', 0.5, 'desenfoque'),
  t('palomas.mp4', 0.5, 'relieve'),
  t('glorieta', 0.5, 'calida'),
  t('sendero.mp4', 0.5, 'tela'),
  t('illimani', 0.5, 'halo'),
  t('san-jacinto', 0.5, 'nitida'),
  t('uyuni', 0.5, 'tinta'),
];
const bordes: number[] = [];
TOMAS.reduce((u, x) => {
  bordes.push(p(u));
  return u + x.d;
}, 0);
const FIN_MONTAJE = TOMAS.reduce((u, x) => u + x.d, 0); // pulso 28
const CIERRE = p(FIN_MONTAJE);
export const DUR_HORIZONTE = CIERRE + 175;

// Frases quietas sobre la curva: [texto, desde (pulso), hasta (pulso), tamaño inicial]
const FRASES: [string, number, number, number][] = [
  ['Hay', 14, 17, 64],
  ['más', 17, 20, 70],
  ['por caminar', 20, FIN_MONTAJE, 62],
];

export const Horizonte = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Filtros />
      {TOMAS.map((x, i) => (
        <Sequence key={i} name={`${i + 1} ${x.src}`} from={bordes[i]} durationInFrames={(bordes[i + 1] ?? CIERRE) - bordes[i]}>
          {x.src === 'anillo' ? <Anillo /> : <Franja t={x} />}
        </Sequence>
      ))}
      <Sequence name="Cierre: anillo completo y logo" from={CIERRE}>
        <Cierre />
      </Sequence>
      {FRASES.map(([texto, a, b, tam]) => (
        <Sequence key={texto} name={`Frase: ${texto}`} from={p(a)} durationInFrames={p(b) - p(a)}>
          <Frase texto={texto} desde={p(a)} tam={tam} />
        </Sequence>
      ))}
      <Grano />
      <Audio name="Música" src={staticFile('audio/horizonte-mezcla.wav')} />
    </AbsoluteFill>
  );
};

// ---------- Tomas: la foto nítida bajo la curva, la misma difuminada arriba ----------
const recorte = `circle(${R}px at 50% ${ARCO_Y - BANDA_Y + R}px)`;
const nombre = (src: string) => src.replace('.mp4', '');

const Franja = ({ t }: { t: Toma }) => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const q = Math.min(1, fr / Math.max(1, durationInFrames));
  const estilo: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.0 + 0.03 * q})` };
  const n = nombre(t.src);
  return (
    <AbsoluteFill>
      <Img src={staticFile(`hz/${n}-fondo.jpg`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `scale(${1.04 + 0.03 * q})` }} />
      <div style={{ position: 'absolute', left: 0, top: BANDA_Y, width: 1080, height: 820, overflow: 'hidden', clipPath: recorte }}>
        {t.src.endsWith('.mp4') ? <Video src={staticFile(`hz/${t.src}`)} muted objectFit="cover" style={estilo} /> : <Img src={staticFile(`hz/${n}.jpg`)} style={estilo} />}
      </div>
      <Borde />
    </AbsoluteFill>
  );
};

// filo de luz sobre la curva (como la atmósfera de un planeta)
const Borde = ({ sombra = '0 -2px 14px rgba(255,255,255,0.22), 0 -1px 2px rgba(255,255,255,0.35)' }: { sombra?: string }) => (
  <div style={{ position: 'absolute', left: 540 - R, top: ARCO_Y, width: R * 2, height: R * 2, borderRadius: '50%', boxShadow: sombra }} />
);

// ---------- Anillo de pasos de la app, arqueado sobre el horizonte ----------
const arco = (r: number, x1: number, x2: number) => {
  const a1 = Math.asin((x1 - 540) / r);
  const a2 = Math.asin((x2 - 540) / r);
  const punto = (a: number) => ({ x: 540 + r * Math.sin(a), y: CY - r * Math.cos(a) });
  const P = (a: number) => `${punto(a).x} ${punto(a).y}`;
  return { d: `M${P(a1)} A${r} ${r} 0 0 1 ${P(a2)}`, largo: r * (a2 - a1), punto, a1, a2 };
};
const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const CIELO_APP = 'linear-gradient(180deg, #07021a 0%, #12063a 45%, #2a0f6e 100%)';
const SUELO_APP = 'radial-gradient(60% 8% at 50% 0%, #2a0f63, #120530 70%)';

// Los dos anillos de la app (el exterior ancho y claro, el interior fino y brillante), ahora como arcos del horizonte.
const Anillos = ({ q1, q2, brillo = 0 }: { q1: number; q2: number; brillo?: number }) => {
  const ext = arco(R - 20, -40, 1120);
  const int = arco(R - 92, -40, 1120);
  const cab = int.punto(int.a1 + (int.a2 - int.a1) * q2);
  const dash = (a: { largo: number }, q: number) => `${a.largo * q} ${a.largo * 2}`;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
      <path d={ext.d} stroke="#62f0b6" strokeOpacity={0.35 * brillo} strokeWidth={60} fill="none" style={{ filter: 'blur(24px)' }} />
      <path d={ext.d} stroke="rgba(255,255,255,0.09)" strokeWidth={36} fill="none" />
      <path d={ext.d} stroke="#86ecc6" strokeWidth={36} strokeLinecap="round" fill="none" strokeDasharray={dash(ext, q1)} />
      <path d={int.d} stroke="rgba(255,255,255,0.07)" strokeWidth={14} fill="none" />
      <path d={int.d} stroke="#2ff0a0" strokeOpacity={0.45} strokeWidth={22} fill="none" strokeDasharray={dash(int, q2)} style={{ filter: 'blur(9px)' }} />
      <path d={int.d} stroke="#2ff0a0" strokeWidth={14} strokeLinecap="round" fill="none" strokeDasharray={dash(int, q2)} />
      {q2 > 0.02 && q2 < 0.995 && <circle cx={cab.x} cy={cab.y} r={6} fill="#ffffff" />}
    </svg>
  );
};

const Anillo = () => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const entra = interpolate(fr, [0, 12], [0, 1], { ...clamp, easing: suaveP });
  const cuenta = Easing.bezier(0.33, 0, 0.25, 1); // sube parejo y frena suave al llegar
  const q1 = interpolate(fr, [6, durationInFrames - 8], [0, 0.82], { ...clamp, easing: cuenta });
  const q2 = interpolate(fr, [10, durationInFrames - 4], [0, 0.68], { ...clamp, easing: cuenta });
  const pasos = Math.round(6840 * interpolate(fr, [8, durationInFrames - 10], [0, 1], { ...clamp, easing: cuenta }));
  const pill = interpolate(fr, [durationInFrames - 34, durationInFrames - 24], [0, 1], { ...clamp, easing: suaveP });
  return (
    <AbsoluteFill style={{ background: CIELO_APP }}>
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO_Y, width: R * 2, height: R * 2, borderRadius: '50%', background: SUELO_APP }} />
      <Anillos q1={q1} q2={q2} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y + 175, textAlign: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 132, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {fmt(pasos)}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y + 320, textAlign: 'center', color: '#b9a8e0', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 38 }}>pasos hoy</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y + 392, display: 'flex', justifyContent: 'center', opacity: pill, transform: `translateY(${(1 - pill) * 10}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px 10px 12px', borderRadius: 40, background: 'rgba(98,240,182,0.12)', color: '#62f0b6', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 34 }}>
          <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 40, height: 40 }} />
          +6 Puntos
        </div>
      </div>
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: 1 - entra }} />
    </AbsoluteFill>
  );
};

// ---------- La frase ----------
// Filtros de letra. «impresa»: el borde irregular de una letra impresa o filmada (va en todas). «tela»: además, la trama
// de la tela dentro de la letra. «tinta»: tinta negra que se corre en el papel.
const Filtros = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      <filter id="hz-impresa" x="-5%" y="-25%" width="110%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={3} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={2.6} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation={0.45} />
      </filter>
      <filter id="hz-tela" x="-5%" y="-25%" width="110%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={3} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={2.6} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="1.3 0.9" numOctaves={2} seed={11} result="t" />
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -7 3.1" result="manchas" />
        <feComposite in="manchas" in2="d" operator="in" result="m" />
        <feComposite in="d" in2="m" operator="out" result="tejido" />
        <feGaussianBlur in="tejido" stdDeviation={0.5} />
      </filter>
      <filter id="hz-tinta" x="-5%" y="-25%" width="110%" height="150%">
        <feMorphology operator="dilate" radius={1.6} result="g" />
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={9} result="n" />
        <feDisplacementMap in="g" in2="n" scale={3.4} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation={1.0} />
      </filter>
    </defs>
  </svg>
);

const tomaEn = (cuadro: number) => {
  let k = 0;
  for (let i = 0; i < bordes.length; i++) if (cuadro >= bordes[i]) k = i;
  return k;
};

const estiloLetra = (a: Acabado, oscuro: boolean): CSSProperties => {
  const c = oscuro ? '#17130f' : '#ffffff';
  const sombra = oscuro ? 'none' : '0 2px 14px rgba(0,0,0,0.28)';
  const impresa = 'url(#hz-impresa)';
  switch (a) {
    case 'relieve':
      return { color: c, filter: impresa, textShadow: oscuro ? '0 2px 0 rgba(255,255,255,0.45)' : '0 3px 0 rgba(0,0,0,0.6), 0 7px 16px rgba(0,0,0,0.45)' };
    case 'calida':
      return { color: 'transparent', backgroundImage: 'linear-gradient(180deg, #ffffff 30%, #f2b896 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: `${impresa} drop-shadow(0 2px 8px rgba(0,0,0,0.3))` };
    case 'tenue':
      return { color: c, opacity: 0.6, filter: `${impresa} blur(1.1px)` };
    case 'tela':
      return { color: c, filter: `url(#hz-tela) drop-shadow(0 2px 6px rgba(0,0,0,0.35))` };
    case 'halo':
      return { color: c, filter: `${impresa} blur(0.7px)`, textShadow: '0 0 10px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.35)' };
    case 'crema':
      return { color: '#f6e6cf', filter: impresa, textShadow: sombra };
    case 'desenfoque':
      return { color: c, filter: `${impresa} blur(2.4px)`, textShadow: sombra };
    case 'desvanece':
      return { color: 'transparent', backgroundImage: 'linear-gradient(90deg, #ffffff 35%, rgba(255,255,255,0.35) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: `${impresa} drop-shadow(0 2px 8px rgba(0,0,0,0.3))` };
    case 'fuerte':
      return { color: c, fontWeight: 700, filter: impresa, textShadow: sombra };
    case 'tinta':
      return { color: '#14110d', filter: 'url(#hz-tinta)' };
    default:
      return { color: c, filter: impresa, textShadow: sombra };
  }
};

const Frase = ({ texto, desde, tam }: { texto: string; desde: number; tam: number }) => {
  const fr = useCurrentFrame();
  const k = tomaEn(desde + fr);
  const k0 = tomaEn(desde);
  const toma = TOMAS[k];
  const oscuro = (LUZ[nombre(toma.src)] ?? 0.4) > 0.55;
  // en cada corte la palabra crece un poco (como en la referencia)
  const tamano = tam * Math.pow(1.045, k - k0);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 34 - 160, height: 160, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
      <div style={{ fontFamily: 'Caslon', fontWeight: 400, fontSize: tamano, lineHeight: 1, letterSpacing: '-0.012em', whiteSpace: 'nowrap', paddingBottom: 4, ...estiloLetra(toma.acabado ?? 'nitida', oscuro) }}>{texto}</div>
    </div>
  );
};

// ---------- Cierre: el anillo se completa sobre el horizonte, «Muy pronto» y el logo ----------
const Cierre = () => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const q = interpolate(fr, [0, 30], [0.82, 1], { ...clamp, easing: salida });
  const q2 = interpolate(fr, [0, 34], [0.68, 1], { ...clamp, easing: salida });
  const brillo = interpolate(fr, [18, 40], [0, 1], { ...clamp, easing: suaveP });
  const t1 = interpolate(fr, [8, 20, 62, 72], [0, 1, 1, 0], { ...clamp, easing: suaveP });
  const t2 = interpolate(fr, [74, 92], [0, 1], { ...clamp, easing: suaveP });
  const negro = interpolate(fr, [durationInFrames - 18, durationInFrames], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: CIELO_APP }}>
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO_Y, width: R * 2, height: R * 2, borderRadius: '50%', background: SUELO_APP }} />
      <Anillos q1={q} q2={q2} brillo={brillo} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 34 - 160, height: 160, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', opacity: t1, filter: `blur(${(1 - t1) * 6}px)` }}>
        <div style={{ fontFamily: 'Caslon', fontSize: 72, lineHeight: 1, color: '#fff', paddingBottom: 4 }}>Muy pronto</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 165, height: 110, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, opacity: t2, filter: `blur(${(1 - t2) * 6}px)` }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 100, height: 100 }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 70, filter: 'brightness(0) invert(1)' }} />
      </div>
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: negro }} />
    </AbsoluteFill>
  );
};

const Grano = () => {
  const fr = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.14, mixBlendMode: 'overlay' }}>
        <filter id={`h${fr}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={fr % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#h${fr})`} />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(120% 85% at 50% 50%, transparent 58%, rgba(0,0,0,0.4) 100%)' }} />
    </AbsoluteFill>
  );
};
