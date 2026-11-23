import { loadFont } from '@remotion/fonts';
import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import './marca';

// CAMINA · Primera publicación de Instagram (una sola imagen, 1080 × 1350), con el lenguaje del teaser
// «Siempre hay más por caminar»: el horizonte curvo con el anillo de pasos de la app convertido en arco y «Cada paso
// cuenta» curvado sobre el círculo. Sin teléfonos.
// Exportar: npx remotion still Publicacion1 out/publicacion-1.png

loadFont({ family: 'Caslon', url: staticFile('fonts/libre-caslon-text-latin-400-normal.woff2'), weight: '400' });

const MENTA = '#62f0b6';
const ARCO = 800; // punto más alto del horizonte
const R = 1500;
const CY = ARCO + R;

const arco = (r: number, x1: number, x2: number) => {
  const a1 = Math.asin((x1 - 540) / r);
  const a2 = Math.asin((x2 - 540) / r);
  const punto = (a: number) => ({ x: 540 + r * Math.sin(a), y: CY - r * Math.cos(a) });
  const P = (a: number) => `${punto(a).x} ${punto(a).y}`;
  return { d: `M${P(a1)} A${r} ${r} 0 0 1 ${P(a2)}`, largo: r * (a2 - a1), punto, a1, a2 };
};

const Tienda = ({ icono, nombre }: { icono: ReactNode; nombre: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px 14px 22px', borderRadius: 24, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.32)' }}>
    {icono}
    <div style={{ display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>Muy pronto en</span>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 34, lineHeight: 1.1 }}>{nombre}</span>
    </div>
  </div>
);

export const Publicacion1 = () => {
  const ext = arco(R - 20, -40, 1120);
  const int = arco(R - 92, -40, 1120);
  const q1 = 0.82;
  const q2 = 0.68;
  const cab = int.punto(int.a1 + (int.a2 - int.a1) * q2);
  const dash = (a: { largo: number }, q: number) => `${a.largo * q} ${a.largo * 2}`;
  const rt = R + 46; // arco del titular
  const at = 0.62;
  const PT = (a: number) => `${540 + rt * Math.sin(a)} ${CY - rt * Math.cos(a)}`;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #07021a 0%, #12063a 45%, #2a0f6e 100%)', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 22% at 50% ${(ARCO / 1350) * 100}%, rgba(98,240,182,0.22), transparent 70%)` }} />
      {/* marca y línea */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 290, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, filter: 'drop-shadow(0 0 26px rgba(98,240,182,0.35))' }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 112, height: 112 }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 78, filter: 'brightness(0) invert(1)' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 452, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 34, color: 'rgba(239,232,255,0.8)' }}>La app que convierte tus pasos en premios y descuentos</div>
      {/* la cúpula */}
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO, width: R * 2, height: R * 2, borderRadius: '50%', background: 'radial-gradient(50% 9% at 50% 0%, #2c1170, #140534 75%)', boxShadow: '0 -2px 18px rgba(98,240,182,0.4), 0 -1px 2px rgba(160,255,215,0.6)' }} />
      {/* el anillo de pasos, en arco */}
      <svg width={1080} height={1350} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <path id="titular" d={`M${PT(-at)} A${rt} ${rt} 0 0 1 ${PT(at)}`} />
        </defs>
        <path d={ext.d} stroke="#62f0b6" strokeOpacity={0.3} strokeWidth={60} fill="none" style={{ filter: 'blur(24px)' }} />
        <path d={ext.d} stroke="rgba(255,255,255,0.09)" strokeWidth={36} fill="none" />
        <path d={ext.d} stroke="#86ecc6" strokeWidth={36} strokeLinecap="round" fill="none" strokeDasharray={dash(ext, q1)} />
        <path d={int.d} stroke="rgba(255,255,255,0.07)" strokeWidth={14} fill="none" />
        <path d={int.d} stroke="#2ff0a0" strokeOpacity={0.45} strokeWidth={22} fill="none" strokeDasharray={dash(int, q2)} style={{ filter: 'blur(9px)' }} />
        <path d={int.d} stroke="#2ff0a0" strokeWidth={14} strokeLinecap="round" fill="none" strokeDasharray={dash(int, q2)} />
        <circle cx={cab.x} cy={cab.y} r={7} fill="#ffffff" />
        {/* «Cada paso cuenta», curvado sobre el círculo */}
        <text fontFamily="Caslon" fontSize={104} letterSpacing={-1} fill="#ffffff" style={{ filter: 'drop-shadow(0 4px 24px rgba(10,2,30,0.6))' }}>
          <textPath href="#titular" startOffset="50%" textAnchor="middle">
            Cada paso <tspan fill={MENTA}>cuenta</tspan>
          </textPath>
        </text>
      </svg>
      {/* dentro de la cúpula */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 175, textAlign: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 112, lineHeight: 1, letterSpacing: '-0.01em' }}>6.840</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 297, textAlign: 'center', color: '#b9a8e0', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 34 }}>pasos hoy</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 390, display: 'flex', justifyContent: 'center', gap: 18 }}>
        <Tienda icono={<IconoApple />} nombre="App Store" />
        <Tienda icono={<IconoPlay />} nombre="Google Play" />
      </div>
    </AbsoluteFill>
  );
};
