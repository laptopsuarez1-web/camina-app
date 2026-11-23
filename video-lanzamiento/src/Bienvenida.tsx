import { loadFont } from '@remotion/fonts';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import './marca';

// CAMINA · Pantalla de bienvenida (splash), 1080 × 1920 (9:16), 100 % gráfica: sin fotos, personas ni ciudades.
// A «Rastro»: un rastro de puntos que suben alternando como pasos, crecen y se encienden en verde.
// B «Círculo»: el anillo de la app hecho de puntos; cada punto es un paso y la parte recorrida se enciende.
// Animadas en 3 s (los pasos se encienden); el último cuadro sirve como imagen fija.
// Exportar: npx remotion render BienvenidaA out/bienvenida-a.mp4 · npx remotion still BienvenidaA out/bienvenida-a.png --frame=89

loadFont({ family: 'MonaLigera', url: staticFile('fonts/MonaSans-Variable.woff2'), weight: '200 900' });

export const DUR_BIENVENIDA = 90;
const MENTA = '#62f0b6';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const salida = Easing.bezier(0.16, 1, 0.3, 1);
const mezcla = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
const LILA = [150, 120, 220];
const VERDE = [98, 240, 182];

const Fondo = () => (
  <>
    <AbsoluteFill style={{ background: 'radial-gradient(90% 60% at 50% 38%, #3b1592 0%, #220a5c 45%, #10042c 78%, #08021a 100%)' }} />
    <AbsoluteFill style={{ background: 'radial-gradient(40% 25% at 50% 42%, rgba(98,240,182,0.10), transparent 70%)' }} />
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.08, mixBlendMode: 'overlay' }}>
      <filter id="g">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={3} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
  </>
);

const Marca = ({ y, aparece }: { y: number; aparece: number }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: aparece, transform: `translateY(${(1 - aparece) * 18}px)` }}>
    <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ width: 620, filter: 'brightness(0) invert(1)' }} />
    <div style={{ marginTop: 34, fontFamily: 'MonaLigera', fontWeight: 300, fontSize: 52, letterSpacing: '0.04em', color: 'rgba(240,234,255,0.86)' }}>Cada paso cuenta</div>
  </div>
);

// ---------- A · Rastro ----------
export const BienvenidaA = () => {
  const fr = useCurrentFrame();
  const N = 9;
  const pasos = Array.from({ length: N }, (_, i) => {
    const u = i / (N - 1);
    const y = 1080 - u * 640; // suben
    const x = 540 + (i % 2 === 0 ? -1 : 1) * (34 + 16 * u) + Math.sin(u * Math.PI * 1.2) * 70; // alternan y dibujan una S
    const r = 9 + 22 * u * u;
    const t = interpolate(fr, [6 + i * 4, 14 + i * 4], [0, 1], { ...clamp, easing: salida });
    return { x, y, r, u, t };
  });
  const linea = interpolate(fr, [4, 46], [0, 1], { ...clamp, easing: salida });
  const marca = interpolate(fr, [44, 64], [0, 1], { ...clamp, easing: salida });
  const ruta = 'M' + pasos.map((p) => `${p.x} ${p.y}`).join(' L');
  return (
    <AbsoluteFill>
      <Fondo />
      {/* formas de progreso: arcos concéntricos muy tenues */}
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        {[360, 520, 700].map((r, i) => (
          <circle key={r} cx={540} cy={760} r={r} fill="none" stroke="rgba(185,160,255,0.08)" strokeWidth={2} strokeDasharray={i === 1 ? '4 14' : undefined} />
        ))}
        {/* líneas de movimiento */}
        <path d="M-60 1640 C 260 1540, 520 1780, 1140 1580" stroke="url(#mov)" strokeWidth={3} fill="none" opacity={0.7 * linea} />
        <path d="M-60 1710 C 300 1620, 560 1850, 1140 1670" stroke="url(#mov)" strokeWidth={1.5} fill="none" opacity={0.45 * linea} />
        <defs>
          <linearGradient id="mov" x1="0" x2="1">
            <stop offset="0" stopColor={MENTA} stopOpacity={0} />
            <stop offset="0.55" stopColor={MENTA} stopOpacity={0.9} />
            <stop offset="1" stopColor={MENTA} stopOpacity={0} />
          </linearGradient>
          <radialGradient id="brillo">
            <stop offset="0" stopColor={MENTA} stopOpacity={0.7} />
            <stop offset="1" stopColor={MENTA} stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* el rastro */}
        <path d={ruta} stroke="rgba(200,180,255,0.25)" strokeWidth={2} strokeDasharray="2 10" fill="none" pathLength={1} strokeDashoffset={0} opacity={linea} />
        {pasos.map((p, i) => (
          <g key={i} opacity={p.t} transform={`translate(${p.x} ${p.y}) scale(${0.6 + 0.4 * p.t})`}>
            {p.u > 0.5 && <circle r={p.r * 3} fill="url(#brillo)" opacity={(p.u - 0.5) * 1.2} />}
            <circle r={p.r} fill={mezcla(LILA, VERDE, Math.min(1, p.u * 1.25))} />
          </g>
        ))}
        {/* el último paso: anillo de recompensa */}
        <circle cx={pasos[N - 1].x} cy={pasos[N - 1].y} r={pasos[N - 1].r + 22} fill="none" stroke={MENTA} strokeWidth={3} opacity={pasos[N - 1].t * 0.8} />
      </svg>
      <Marca y={1180} aparece={marca} />
    </AbsoluteFill>
  );
};

// ---------- B · Círculo ----------
export const BienvenidaB = () => {
  const fr = useCurrentFrame();
  const N = 72;
  const R = 380;
  const C = { x: 540, y: 880 };
  const avance = 0.78;
  const q = interpolate(fr, [6, 60], [0, avance], { ...clamp, easing: salida });
  const marca = interpolate(fr, [40, 62], [0, 1], { ...clamp, easing: salida });
  const entra = interpolate(fr, [0, 14], [0, 1], { ...clamp, easing: salida });
  const ang = (i: number) => -Math.PI / 2 + (i / N) * Math.PI * 2;
  const cabeza = { x: C.x + R * Math.cos(-Math.PI / 2 + q * Math.PI * 2), y: C.y + R * Math.sin(-Math.PI / 2 + q * Math.PI * 2) };
  return (
    <AbsoluteFill>
      <Fondo />
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="halo">
            <stop offset="0.55" stopColor={MENTA} stopOpacity={0} />
            <stop offset="0.72" stopColor={MENTA} stopOpacity={0.14} />
            <stop offset="1" stopColor={MENTA} stopOpacity={0} />
          </radialGradient>
          <filter id="blur18" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        {/* órbitas de progreso */}
        <circle cx={C.x} cy={C.y} r={R + 120} fill="none" stroke="rgba(185,160,255,0.09)" strokeWidth={2} opacity={entra} />
        <circle cx={C.x} cy={C.y} r={R + 230} fill="none" stroke="rgba(185,160,255,0.06)" strokeWidth={2} strokeDasharray="3 16" opacity={entra} />
        <circle cx={C.x} cy={C.y} r={R + 60} fill="url(#halo)" opacity={q / avance} />
        {/* el recorrido encendido, con brillo */}
        <circle cx={C.x} cy={C.y} r={R} fill="none" stroke={MENTA} strokeWidth={26} strokeOpacity={0.35} pathLength={1} strokeDasharray={`${q} 1`} transform={`rotate(-90 ${C.x} ${C.y})`} filter="url(#blur18)" />
        {/* cada punto es un paso */}
        {Array.from({ length: N }, (_, i) => {
          const u = i / N;
          const hecho = u <= q;
          const x = C.x + R * Math.cos(ang(i));
          const y = C.y + R * Math.sin(ang(i));
          const r = hecho ? 6 + 7 * (u / avance) : 5;
          return <circle key={i} cx={x} cy={y} r={r * entra} fill={hecho ? mezcla(LILA, VERDE, Math.min(1, 0.35 + u / avance)) : 'rgba(185,160,255,0.28)'} />;
        })}
        {q > 0.01 && (
          <>
            <circle cx={cabeza.x} cy={cabeza.y} r={30} fill={MENTA} opacity={0.35} filter="url(#blur18)" />
            <circle cx={cabeza.x} cy={cabeza.y} r={15} fill="#ffffff" />
          </>
        )}
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: C.y - 92, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: marca, transform: `scale(${0.94 + 0.06 * marca})` }}>
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ width: 520, filter: 'brightness(0) invert(1)' }} />
        <div style={{ marginTop: 26, fontFamily: 'MonaLigera', fontWeight: 300, fontSize: 46, letterSpacing: '0.04em', color: 'rgba(240,234,255,0.86)' }}>Cada paso cuenta</div>
      </div>
    </AbsoluteFill>
  );
};
