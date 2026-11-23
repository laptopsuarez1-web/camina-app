import { loadFont } from '@remotion/fonts';
import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import './marca';

// CAMINA · Publicaciones sueltas de Instagram (1080 × 1350) con el estilo del círculo de la primera publicación:
// el horizonte curvo con el anillo de pasos en arco y el título en serifa curvado sobre el círculo; dentro de la cúpula,
// lo de cada pieza. Datos de ejemplo; no nombra comercios ni inventa premios.
// Exportar: npx remotion still PiezaComercios out/pieza-comercios.png (y PiezaRuta, PiezaGrupos, PiezaRachas)

loadFont({ family: 'Caslon', url: staticFile('fonts/libre-caslon-text-latin-400-normal.woff2'), weight: '400' });

const MENTA = '#62f0b6';
const MORADO = '#200a52';
const ARCO = 800;
const R = 1500;
const CY = ARCO + R;
const LILA = '#b9a8e0';

const arco = (r: number, x1: number, x2: number) => {
  const a1 = Math.asin((x1 - 540) / r);
  const a2 = Math.asin((x2 - 540) / r);
  const punto = (a: number) => ({ x: 540 + r * Math.sin(a), y: CY - r * Math.cos(a) });
  const P = (a: number) => `${punto(a).x} ${punto(a).y}`;
  return { d: `M${P(a1)} A${r} ${r} 0 0 1 ${P(a2)}`, largo: r * (a2 - a1), punto, a1, a2 };
};

const Base = ({ etiqueta, linea, titulo, acento, tam = 104, children }: { etiqueta: string; linea: string; titulo: string; acento: string; tam?: number; children: ReactNode }) => {
  const ext = arco(R - 20, -40, 1120);
  const int = arco(R - 92, -40, 1120);
  const cab = int.punto(int.a1 + (int.a2 - int.a1) * 0.68);
  const dash = (a: { largo: number }, q: number) => `${a.largo * q} ${a.largo * 2}`;
  const rt = R + 46;
  const at = 0.62;
  const PT = (a: number) => `${540 + rt * Math.sin(a)} ${CY - rt * Math.cos(a)}`;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #07021a 0%, #12063a 45%, #2a0f6e 100%)', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 22% at 50% ${(ARCO / 1350) * 100}%, rgba(98,240,182,0.22), transparent 70%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 110, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 60, height: 60 }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 40, filter: 'brightness(0) invert(1)' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: '10px 26px', borderRadius: 40, background: 'rgba(98,240,182,0.14)', color: MENTA, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{etiqueta}</div>
      </div>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 384, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 36, lineHeight: 1.3, color: 'rgba(239,232,255,0.82)' }}>{linea}</div>
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO, width: R * 2, height: R * 2, borderRadius: '50%', background: 'radial-gradient(50% 9% at 50% 0%, #2c1170, #140534 75%)', boxShadow: '0 -2px 18px rgba(98,240,182,0.4), 0 -1px 2px rgba(160,255,215,0.6)' }} />
      <svg width={1080} height={1350} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <path id="titular" d={`M${PT(-at)} A${rt} ${rt} 0 0 1 ${PT(at)}`} />
        </defs>
        <path d={ext.d} stroke={MENTA} strokeOpacity={0.3} strokeWidth={60} fill="none" style={{ filter: 'blur(24px)' }} />
        <path d={ext.d} stroke="rgba(255,255,255,0.09)" strokeWidth={36} fill="none" />
        <path d={ext.d} stroke="#86ecc6" strokeWidth={36} strokeLinecap="round" fill="none" strokeDasharray={dash(ext, 0.82)} />
        <path d={int.d} stroke="rgba(255,255,255,0.07)" strokeWidth={14} fill="none" />
        <path d={int.d} stroke="#2ff0a0" strokeOpacity={0.45} strokeWidth={22} fill="none" strokeDasharray={dash(int, 0.68)} style={{ filter: 'blur(9px)' }} />
        <path d={int.d} stroke="#2ff0a0" strokeWidth={14} strokeLinecap="round" fill="none" strokeDasharray={dash(int, 0.68)} />
        <circle cx={cab.x} cy={cab.y} r={7} fill="#ffffff" />
        <text fontFamily="Caslon" fontSize={tam} letterSpacing={-1} fill="#ffffff" style={{ filter: 'drop-shadow(0 4px 24px rgba(10,2,30,0.6))' }}>
          <textPath href="#titular" startOffset="50%" textAnchor="middle">
            {titulo} <tspan fill={MENTA}>{acento}</tspan>
          </textPath>
        </text>
      </svg>
      {children}
    </AbsoluteFill>
  );
};

const Fila = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontFamily: 'Jakarta', fontWeight: 600, fontSize: 36, color: '#fff' }}>
    <span style={{ width: 40, height: 40, borderRadius: '50%', background: MENTA, color: MORADO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, flexShrink: 0 }}>✓</span>
    {children}
  </div>
);
const Chip = ({ children }: { children: ReactNode }) => (
  <div style={{ padding: '12px 26px', borderRadius: 40, background: 'rgba(98,240,182,0.14)', boxShadow: 'inset 0 0 0 2px rgba(98,240,182,0.5)', color: MENTA, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 30, whiteSpace: 'nowrap' }}>{children}</div>
);

// ---------- comercios ----------
export const PiezaComercios = () => (
  <Base etiqueta="Para comercios" linea="¿Tienes un negocio en Tarija? Haz que la gente camine hasta tu local" titulo="Súmate a" acento="Camina" tam={96}>
    <div style={{ position: 'absolute', left: 150, right: 120, top: ARCO + 150, display: 'flex', flexDirection: 'column', gap: 26 }}>
      <Fila>Apareces en el mapa de la app</Fila>
      <Fila>Puedes salir en la ruta del mes</Fila>
      <Fila>Clientes que vuelven por sus sellos</Fila>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 412, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: '20px 40px', borderRadius: 50, background: MENTA, color: MORADO, fontFamily: 'Jakarta', fontWeight: 800, fontSize: 34, boxShadow: '0 0 40px rgba(98,240,182,0.4)' }}>Escríbenos por mensaje directo</div>
    </div>
  </Base>
);

// ---------- ruta del mes ----------
export const PiezaRuta = () => {
  const pines = [
    { x: 250, y: ARCO + 300 },
    { x: 540, y: ARCO + 200 },
    { x: 830, y: ARCO + 300 },
  ];
  return (
    <Base etiqueta="Evento del mes" linea="Cada mes te tocan 3 lugares de tu ciudad. Complétala y gana" titulo="Una ruta" acento="nueva" tam={110}>
      <svg width={1080} height={1350} style={{ position: 'absolute', inset: 0 }}>
        <path d={`M${pines[0].x} ${pines[0].y} Q 390 ${ARCO + 150} ${pines[1].x} ${pines[1].y} Q 690 ${ARCO + 150} ${pines[2].x} ${pines[2].y}`} stroke={MENTA} strokeOpacity={0.4} strokeWidth={18} fill="none" style={{ filter: 'blur(8px)' }} />
        <path d={`M${pines[0].x} ${pines[0].y} Q 390 ${ARCO + 150} ${pines[1].x} ${pines[1].y} Q 690 ${ARCO + 150} ${pines[2].x} ${pines[2].y}`} stroke={MENTA} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" fill="none" />
      </svg>
      {pines.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: p.x - 50, top: p.y - 50, width: 100, height: 100, borderRadius: 30, background: '#1c0d45', boxShadow: `0 0 0 4px ${MENTA}, 0 0 30px rgba(98,240,182,0.45)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MENTA, fontFamily: 'Mona', fontWeight: 900, fontSize: 54 }}>?</div>
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 400, display: 'flex', justifyContent: 'center', gap: 14 }}>
        <Chip>Día doble</Chip>
        <Chip>Insignia</Chip>
        <Chip>Boleto del sorteo</Chip>
      </div>
    </Base>
  );
};

// ---------- grupos y ranking (datos de ejemplo) ----------
export const PiezaGrupos = () => {
  const base = 1350;
  const puestos = [
    { x: 290, h: 150, n: 2, ini: 'A', nombre: 'Ana', pasos: '38,3k pasos' },
    { x: 540, h: 225, n: 1, ini: 'J', nombre: 'Joaco', pasos: '64,8k pasos' },
    { x: 790, h: 110, n: 3, ini: 'Tú', nombre: 'Tú', pasos: '32,9k pasos' },
  ];
  return (
    <Base etiqueta="Grupos y ranking" linea="Arma tu grupo, compitan en el ranking semanal y organícense en el chat" titulo="Camina con tus" acento="amigos" tam={80}>
      {puestos.map((p) => (
        <div key={p.n}>
          <div style={{ position: 'absolute', left: p.x - 105, top: base - p.h, width: 210, height: p.h, borderRadius: '30px 30px 0 0', background: p.n === 1 ? 'linear-gradient(180deg, rgba(98,240,182,0.55), rgba(98,240,182,0.1))' : 'linear-gradient(180deg, rgba(185,168,224,0.32), rgba(185,168,224,0.06))', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)', display: 'flex', justifyContent: 'center', paddingTop: 12, color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 54 }}>{p.n}</div>
          <div style={{ position: 'absolute', left: p.x - 46, top: base - p.h - 168, width: 92, height: 92, borderRadius: '50%', background: p.ini === 'Tú' ? '#2a0f6e' : MENTA, boxShadow: p.n === 1 ? '0 0 0 5px #e9fff5, 0 0 30px rgba(98,240,182,0.6)' : '0 0 0 4px rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.ini === 'Tú' ? '#fff' : '#1b0b44', fontFamily: 'Jakarta', fontWeight: 800, fontSize: p.ini === 'Tú' ? 34 : 44 }}>{p.ini}</div>
          <div style={{ position: 'absolute', left: p.x - 110, width: 220, top: base - p.h - 68, textAlign: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, lineHeight: 1.15 }}>
            {p.nombre}
            <div style={{ color: LILA, fontWeight: 500, fontSize: 22 }}>{p.pasos}</div>
          </div>
        </div>
      ))}
    </Base>
  );
};

// ---------- rachas ----------
export const PiezaRachas = () => {
  const r = R - 200;
  return (
    <Base etiqueta="Rachas" linea="Camina todos los días y gana Puntos extra" titulo="No cortes tu" acento="racha" tam={88}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = ((i - 3) * 120) / r;
        const x = 540 + r * Math.sin(a);
        const y = CY - r * Math.cos(a);
        const hecho = i < 4;
        return (
          <div key={i} style={{ position: 'absolute', left: x - 46, top: y - 46, width: 92, height: 92, borderRadius: '50%', background: hecho ? MENTA : 'rgba(255,255,255,0.06)', boxShadow: hecho ? '0 0 26px rgba(98,240,182,0.55)' : 'inset 0 0 0 3px rgba(185,168,224,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hecho ? MORADO : LILA, fontFamily: 'Jakarta', fontWeight: 800, fontSize: i === 6 ? 30 : 34, transform: `rotate(${(a * 180) / Math.PI}deg)` }}>
            {i === 6 ? '+5' : i + 1}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 300, textAlign: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 84, lineHeight: 1 }}>18 días seguidos</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 400, textAlign: 'center', color: LILA, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 32 }}>Faltan 3 días para +5 Puntos (mín. 5.000 pasos al día)</div>
    </Base>
  );
};
