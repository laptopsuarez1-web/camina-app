import { loadFont } from '@remotion/fonts';
import type { CSSProperties } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio, Video } from '@remotion/media';
import { PULSOS } from './horizontePulsos';

// CAMINA · «Hay más por caminar» — teaser vertical (1080 × 1920, 30 fps, 23,5 s), sin voz.
// Recurso: un horizonte curvo siempre en el mismo lugar. Abre y cierra una silueta caminando sobre el salar al atardecer;
// en el medio, en cada pulso de la música, cambia lo que hay bajo la curva (Tarija, Bolivia, gente caminando, la app) y
// la frase queda quieta sobre la curva, cambiando de tratamiento en cada toma. El anillo de pasos de la app aparece
// arqueado sobre el horizonte. Al final la silueta sigue caminando, su camino se enciende en verde y aparece el logo.
// Música: «Discover» (Mixkit, licencia libre). Ver scripts/horizonte_sonido.py (genera también los pulsos).

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
export const DUR_HORIZONTE = Math.round(23.5 * 30);

// Horizonte: borde de un círculo enorme; su punto más alto está en ARCO_Y.
const ARCO_Y = 1150;
const R = 2100;
const CY = ARCO_Y + R;
const BANDA_Y = 1100; // la franja de cada toma: de 1100 a 1920 (recortes de 1080 × 820, scripts/horizonte_franjas.py)
const sobreCurva = (x: number) => CY - Math.sqrt(R * R - (x - 540) ** 2);

type Fondo = 'negro' | 'morado' | 'azul' | 'crema' | 'blanco';
// Tratamiento de la letra en cada toma (como en la referencia: misma frase, otra textura en cada corte)
type Letra = 'limpia' | 'sombra' | 'degradado' | 'tenue' | 'trama' | 'suave' | 'tinta' | 'fuerte' | 'metal';
type Toma = { src: string; fondo: Fondo; d: number; letra?: Letra; tam?: number };
const t = (src: string, fondo: Fondo, d = 1, letra: Letra = 'limpia', tam = 1): Toma => ({ src, fondo, d, letra, tam });

// d = duración en pulsos. 'apertura', 'destello' y 'anillo' son escenas dibujadas; lo demás, franjas en public/hz.
const TOMAS: Toma[] = [
  t('apertura', 'negro', 8),
  t('destello', 'negro', 2),
  // sin palabras
  t('vinedos.jpg', 'crema'),
  t('laguna.jpg', 'azul'),
  t('chunchos.jpg', 'negro'),
  t('isla-sendero.jpg', 'blanco'),
  t('cartel.jpg', 'azul'),
  t('titicaca.jpg', 'morado'),
  // «Hay»
  t('pies-pov.mp4', 'negro', 1, 'limpia'),
  t('aerea.mp4', 'azul', 1, 'sombra'),
  t('mercado.jpg', 'crema', 1, 'tinta'),
  // «más»
  t('lp-noche.jpg', 'negro', 1, 'degradado'),
  t('flamencos.jpg', 'blanco', 1, 'suave'),
  t('rueda.jpg', 'morado', 1, 'tenue'),
  // «por caminar»
  t('parque.mp4', 'azul', 1, 'sombra'),
  t('mapa.jpg', 'morado', 1, 'limpia'),
  t('anillo', 'morado', 3, 'limpia'),
  t('ladrillo.mp4', 'crema', 1, 'fuerte', 1.02),
  t('sendero.mp4', 'blanco', 0.5, 'tinta', 1.03),
  t('tiwanaku.jpg', 'azul', 0.5, 'metal', 1.04),
  t('palomas.mp4', 'negro', 0.5, 'trama', 1.05),
  t('sc.jpg', 'morado', 0.5, 'limpia', 1.06),
  t('pies-calle.mp4', 'crema', 0.5, 'fuerte', 1.08),
  t('plaza-lf.jpg', 'azul', 0.5, 'sombra', 1.09),
  t('maraton.mp4', 'negro', 0.5, 'suave', 1.1),
  t('uyuni.jpg', 'blanco', 0.5, 'tinta', 1.12),
];
const bordes: number[] = [];
TOMAS.reduce((u, x) => {
  bordes.push(p(u));
  return u + x.d;
}, 0);
const VUELTA = p(TOMAS.reduce((u, x) => u + x.d, 0)); // pulso 32: vuelve la escena del caminante

// Frases quietas sobre la curva: [texto, desde (pulso), hasta (pulso)]
const FRASES: [string, number, number][] = [
  ['Hay', 16, 19],
  ['más', 19, 22],
  ['por caminar', 22, 32],
];

export const Horizonte = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Filtros />
      {TOMAS.map((x, i) => (
        <Sequence key={i} name={`${i + 1} ${x.src}`} from={bordes[i]} durationInFrames={(bordes[i + 1] ?? VUELTA) - bordes[i]}>
          {x.src === 'apertura' ? (
            <Atardecer caminante={{ x0: 70, v: 1.25 }} entrada />
          ) : x.src === 'destello' ? (
            <Destello />
          ) : x.src === 'anillo' ? (
            <Anillo />
          ) : (
            <Arco t={x} />
          )}
        </Sequence>
      ))}
      <Sequence name="Final: vuelve el caminante" from={VUELTA}>
        <Final />
      </Sequence>
      {FRASES.map(([texto, a, b]) => (
        <Sequence key={texto} name={`Frase: ${texto}`} from={p(a)} durationInFrames={p(b) - p(a)}>
          <Frase texto={texto} desde={p(a)} />
        </Sequence>
      ))}
      <Grano />
      <Audio name="Música" src={staticFile('audio/horizonte-mezcla.wav')} />
    </AbsoluteFill>
  );
};

// ---------- Tomas con franja ----------
const recorte = `circle(${R}px at 50% ${ARCO_Y - BANDA_Y + R}px)`;
const FONDOS: Record<Fondo, string> = {
  negro: 'radial-gradient(120% 40% at 50% 62%, rgba(255,255,255,0.05), transparent 70%), #050507',
  morado: 'linear-gradient(180deg, #0c0322 0%, #1d0848 55%, #3a1490 100%)',
  azul: 'linear-gradient(180deg, #123a7a 0%, #2a63b4 55%, #4f8fd6 100%)',
  crema: 'radial-gradient(120% 70% at 50% 40%, #efe9dd, #e2dacb)',
  blanco: '#f4f2ee',
};
const claro = (fo: Fondo) => fo === 'crema' || fo === 'blanco';

const Arco = ({ t }: { t: Toma }) => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const q = Math.min(1, fr / Math.max(1, durationInFrames));
  const estilo: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.02 + 0.035 * q})` };
  return (
    <AbsoluteFill style={{ background: FONDOS[t.fondo] }}>
      <div style={{ position: 'absolute', left: 0, top: BANDA_Y, width: 1080, height: 820, overflow: 'hidden', clipPath: recorte }}>
        {t.src.endsWith('.mp4') ? (
          <Video src={staticFile(`hz/${t.src}`)} muted objectFit="cover" style={estilo} />
        ) : (
          <Img src={staticFile(`hz/${t.src}`)} style={estilo} />
        )}
      </div>
      <Borde claro={claro(t.fondo)} />
    </AbsoluteFill>
  );
};

// filo de luz sobre la curva (como la atmósfera de un planeta)
const Borde = ({ claro: c, color }: { claro?: boolean; color?: string }) => (
  <div
    style={{
      position: 'absolute',
      left: 540 - R,
      top: ARCO_Y,
      width: R * 2,
      height: R * 2,
      borderRadius: '50%',
      boxShadow: color ?? (c ? '0 -2px 10px rgba(0,0,0,0.08)' : '0 -3px 16px rgba(255,255,255,0.2)'),
    }}
  />
);

// ---------- Apertura y final: salar al atardecer con la silueta caminando ----------
const CIELO = 'linear-gradient(180deg, #120a30 0%, #2c1a5e 22%, #5d3a8c 40%, #b27aa6 52%, #eba68c 58.5%, #f6bd94 60%)';
const Atardecer = ({ caminante, entrada, estela }: { caminante: { x0: number; v: number }; entrada?: boolean; estela?: { desde: number } }) => {
  const fr = useCurrentFrame();
  const x = caminante.x0 + caminante.v * fr;
  const luz = entrada ? interpolate(fr, [0, 18], [0, 1], { ...clamp, easing: suaveP }) : 1;
  return (
    <AbsoluteFill style={{ background: CIELO }}>
      <div style={{ position: 'absolute', left: 0, top: BANDA_Y, width: 1080, height: 820, overflow: 'hidden', clipPath: recorte }}>
        <Img
          src={staticFile('hz/uyuni.jpg')}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.55) brightness(0.92) contrast(1.05)', transform: `scale(${1.04 + fr * 0.0002})` }}
        />
        {/* el salar refleja el cielo del atardecer */}
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(246,175,140,0.55) 0%, rgba(120,90,170,0.55) 30%, rgba(40,30,95,0.75) 100%)', mixBlendMode: 'multiply' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(255,200,160,0.35), transparent 25%)' }} />
      </div>
      <Borde color="0 -2px 14px rgba(255,214,170,0.55)" />
      {estela && <Estela desde={estela.desde} hasta={x} />}
      <Caminante x={x} fr={fr} />
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: 1 - luz }} />
    </AbsoluteFill>
  );
};

type Pt = { x: number; y: number };
// Silueta caminando (un paso por pulso), siempre parada sobre la curva.
const Caminante = ({ x, fr, alto = 50 }: { x: number; fr: number; alto?: number }) => {
  const y = sobreCurva(x);
  const giro = (Math.asin((x - 540) / R) * 180) / Math.PI;
  const fase = (2 * Math.PI * fr) / 31.3; // un paso por pulso
  const L = 19;
  const cadera = { x: 0, y: -38 };
  const pierna = (ph: number) => {
    const a = 0.42 * Math.sin(ph);
    const k = 0.12 + 0.6 * Math.max(0, Math.cos(ph));
    const rod = { x: cadera.x + L * Math.sin(a), y: cadera.y + L * Math.cos(a) };
    const pie = { x: rod.x + L * Math.sin(a - k), y: rod.y + L * Math.cos(a - k) };
    return { rod, pie };
  };
  const pa = pierna(fase);
  const pb = pierna(fase + Math.PI);
  const dy = -Math.max(pa.pie.y, pb.pie.y); // apoya siempre el pie más bajo en la curva
  const hombro = { x: 3.5, y: -62 };
  const brazo = (ph: number) => {
    const b = 0.38 * Math.sin(ph);
    const codo = { x: hombro.x + 14 * Math.sin(b), y: hombro.y + 14 * Math.cos(b) };
    const c = b + 0.35 + 0.25 * Math.max(0, Math.sin(ph));
    const mano = { x: codo.x + 13 * Math.sin(c), y: codo.y + 13 * Math.cos(c) };
    return { codo, mano };
  };
  const ba = brazo(fase + Math.PI);
  const bb = brazo(fase);
  const col = '#140a26';
  const pl = (q: { rod: Pt; pie: Pt }, o: number) => (
    <path opacity={o} d={`M${cadera.x} ${cadera.y} L${q.rod.x} ${q.rod.y} L${q.pie.x} ${q.pie.y} l5.5 0.5`} stroke={col} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  );
  const bl = (q: { codo: Pt; mano: Pt }, o: number) => (
    <path opacity={o} d={`M${hombro.x} ${hombro.y} L${q.codo.x} ${q.codo.y} L${q.mano.x} ${q.mano.y}`} stroke={col} strokeWidth={4.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  );
  const s = alto / 74;
  return (
    <svg width={240} height={240} viewBox="-120 -200 240 240" style={{ position: 'absolute', left: x - 120, top: y - 200, overflow: 'visible' }}>
      <g transform={`rotate(${giro}) scale(${s}) translate(0 ${dy})`}>
        {pl(pb, 0.9)}
        {bl(bb, 0.9)}
        <path d={`M${cadera.x} ${cadera.y} L${hombro.x} ${hombro.y}`} stroke={col} strokeWidth={11.5} strokeLinecap="round" />
        <rect x={hombro.x - 12.5} y={hombro.y - 1} width={9} height={17} rx={3} fill={col} />
        <circle cx={hombro.x + 2.2} cy={hombro.y - 9.5} r={6.2} fill={col} />
        {pl(pa, 1)}
        {bl(ba, 1)}
      </g>
    </svg>
  );
};

// arco de circunferencia (centro del planeta) entre dos x
const arco = (r: number, x1: number, x2: number) => {
  const a1 = Math.asin((x1 - 540) / r);
  const a2 = Math.asin((x2 - 540) / r);
  const punto = (a: number): Pt => ({ x: 540 + r * Math.sin(a), y: CY - r * Math.cos(a) });
  const P = (a: number) => `${punto(a).x} ${punto(a).y}`;
  return { d: `M${P(a1)} A${r} ${r} 0 0 1 ${P(a2)}`, largo: r * (a2 - a1), punto, a1, a2 };
};

// el camino recorrido se enciende en verde (el anillo de la app, sobre el horizonte)
const Estela = ({ desde, hasta }: { desde: number; hasta: number }) => {
  const fr = useCurrentFrame();
  const q = interpolate(fr, [desde, desde + 40], [0, 1], { ...clamp, easing: salida });
  const fin = -30 + q * (hasta - 6 + 30);
  if (fin < -20) return null;
  const a = arco(R - 1, -30, fin);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="estela" gradientUnits="userSpaceOnUse" x1={0} x2={1080} y1={0} y2={0}>
          <stop offset="0" stopColor="#62f0b6" stopOpacity={0} />
          <stop offset="0.3" stopColor="#62f0b6" stopOpacity={0.9} />
          <stop offset="1" stopColor="#9bffd6" stopOpacity={1} />
        </linearGradient>
      </defs>
      <path d={a.d} stroke="#62f0b6" strokeOpacity={0.35} strokeWidth={14} fill="none" style={{ filter: 'blur(8px)' }} />
      <path d={a.d} stroke="url(#estela)" strokeWidth={4} strokeLinecap="round" fill="none" />
    </svg>
  );
};

// ---------- Destello: amanece detrás del planeta, en los colores de Camina ----------
const Destello = () => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const q = interpolate(fr, [0, durationInFrames], [0.35, 1], { ...clamp, easing: suaveP });
  const sx = 300;
  const sy = sobreCurva(sx);
  return (
    <AbsoluteFill style={{ backgroundColor: '#04020a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 16% at ${(sx / 1080) * 100}% ${(sy / 1920) * 100}%, rgba(120,70,255,${0.55 * q}), transparent 70%)` }} />
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO_Y, width: R * 2, height: R * 2, borderRadius: '50%', background: '#07030f', boxShadow: `0 -2px 6px rgba(190,150,255,${0.9 * q}), 0 -10px ${40 * q}px rgba(110,60,255,${0.7 * q})` }} />
      {/* sol */}
      <div style={{ position: 'absolute', left: sx - 160, top: sy - 60, width: 320, height: 120, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,1), rgba(160,255,215,0.75) 30%, rgba(98,240,182,0.25) 60%, transparent 100%)', opacity: q, transform: `scale(${0.6 + 0.5 * q})` }} />
      {/* destello horizontal */}
      <div style={{ position: 'absolute', left: sx - 520 * q, top: sy - 3, width: 1040 * q, height: 6, borderRadius: 3, background: 'linear-gradient(90deg, transparent, rgba(190,255,230,0.85), transparent)', filter: 'blur(1.5px)', opacity: q }} />
    </AbsoluteFill>
  );
};

// ---------- Anillo de pasos de la app, arqueado sobre el horizonte ----------
const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const Anillo = () => {
  const fr = useCurrentFrame();
  const q1 = interpolate(fr, [0, 34], [0, 1], { ...clamp, easing: salida });
  const q2 = interpolate(fr, [3, 38], [0, 1], { ...clamp, easing: salida });
  const ext = arco(R - 20, -40, 1120);
  const int = arco(R - 92, -40, 1120);
  const cab = int.punto(int.a1 + (int.a2 - int.a1) * 0.68 * q2);
  const pasos = Math.round(6840 * interpolate(fr, [2, 40], [0, 1], { ...clamp, easing: salida }));
  const pill = interpolate(fr, [22, 30], [0, 1], { ...clamp, easing: suaveP });
  return (
    <AbsoluteFill style={{ background: FONDOS.morado }}>
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO_Y, width: R * 2, height: R * 2, borderRadius: '50%', background: 'radial-gradient(60% 8% at 50% 0%, #2a0f63, #120530 70%)' }} />
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <path d={ext.d} stroke="rgba(255,255,255,0.09)" strokeWidth={36} fill="none" />
        <path d={ext.d} stroke="#86ecc6" strokeWidth={36} strokeLinecap="round" fill="none" strokeDasharray={`${ext.largo * 0.82 * q1} ${ext.largo * 2}`} />
        <path d={int.d} stroke="rgba(255,255,255,0.07)" strokeWidth={14} fill="none" />
        <path d={int.d} stroke="#2ff0a0" strokeOpacity={0.45} strokeWidth={22} fill="none" strokeDasharray={`${int.largo * 0.68 * q2} ${int.largo * 2}`} style={{ filter: 'blur(9px)' }} />
        <path d={int.d} stroke="#2ff0a0" strokeWidth={14} strokeLinecap="round" fill="none" strokeDasharray={`${int.largo * 0.68 * q2} ${int.largo * 2}`} />
        {q2 > 0.02 && <circle cx={cab.x} cy={cab.y} r={6} fill="#ffffff" />}
      </svg>
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
    </AbsoluteFill>
  );
};

// ---------- La frase y sus tratamientos ----------
// Filtros de letra: trama (bordes ásperos, como impresa sobre tela) y tinta (tinta que se corre en el papel).
const Filtros = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      <filter id="hz-trama" x="-5%" y="-20%" width="110%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="hz-tinta" x="-5%" y="-20%" width="110%" height="140%">
        <feMorphology operator="dilate" radius={1.3} result="g" />
        <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves={1} seed={9} result="n" />
        <feDisplacementMap in="g" in2="n" scale={2.2} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation={0.7} />
      </filter>
    </defs>
  </svg>
);

const tomaEn = (cuadro: number): Toma => {
  let k = 0;
  for (let i = 0; i < bordes.length; i++) if (cuadro >= bordes[i]) k = i;
  return TOMAS[k];
};

const estiloLetra = (letra: Letra, oscuro: boolean): CSSProperties => {
  const tinta = oscuro ? '#15120f' : '#ffffff';
  switch (letra) {
    case 'sombra':
      return { color: tinta, textShadow: oscuro ? '0 2px 0 rgba(255,255,255,0.5)' : '0 3px 0 rgba(0,0,0,0.45), 0 6px 18px rgba(0,0,0,0.5)' };
    case 'degradado':
      return { color: 'transparent', backgroundImage: 'linear-gradient(180deg, #ffffff 25%, #f3c2a2 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text' };
    case 'tenue':
      return { color: tinta, opacity: 0.62, filter: 'blur(0.6px)' };
    case 'trama':
      return { color: tinta, filter: 'url(#hz-trama)' };
    case 'suave':
      return { color: tinta, filter: 'blur(1.7px)' };
    case 'tinta':
      return { color: tinta, filter: 'url(#hz-tinta)' };
    case 'fuerte':
      return { color: tinta, fontWeight: 700 };
    case 'metal':
      return { color: 'transparent', backgroundImage: 'linear-gradient(180deg, #ffffff 10%, #c9d2dc 55%, #ffffff 90%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' };
    default:
      return { color: tinta, textShadow: oscuro ? 'none' : '0 0 18px rgba(255,255,255,0.15)' };
  }
};

const Frase = ({ texto, desde }: { texto: string; desde: number }) => {
  const fr = useCurrentFrame();
  const toma = tomaEn(desde + fr); // corta con la imagen, sin fundido (como la referencia)
  const oscuro = claro(toma.fondo);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 32 - 100, height: 100, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
      <div
        style={{
          fontFamily: 'Caslon',
          fontWeight: 400,
          fontSize: 74 * (toma.tam ?? 1),
          lineHeight: 1,
          letterSpacing: '-0.012em',
          whiteSpace: 'nowrap',
          paddingBottom: 4,
          ...estiloLetra(toma.letra ?? 'limpia', oscuro),
        }}
      >
        {texto}
      </div>
    </div>
  );
};

// ---------- Final ----------
const Final = () => {
  const fr = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const r = (k: number) => p(k) - VUELTA; // pulso k, relativo al final
  const t1 = interpolate(fr, [r(33), r(33) + 10, r(37.5) - 8, r(37.5)], [0, 1, 1, 0], { ...clamp, easing: suaveP });
  const t2 = interpolate(fr, [r(38), r(38) + 16], [0, 1], { ...clamp, easing: suaveP });
  const negro = interpolate(fr, [durationInFrames - 16, durationInFrames], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Atardecer caminante={{ x0: 785, v: 1.25 }} estela={{ desde: 4 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 132, height: 100, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', opacity: t1, filter: `blur(${(1 - t1) * 6}px)` }}>
        <div style={{ fontFamily: 'Caslon', fontSize: 74, lineHeight: 1, color: '#fff', paddingBottom: 4, textShadow: '0 1px 12px rgba(80,30,90,0.25)' }}>Muy pronto</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO_Y - 160, height: 110, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, opacity: t2, filter: `blur(${(1 - t2) * 6}px)` }}>
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
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.13, mixBlendMode: 'overlay' }}>
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
