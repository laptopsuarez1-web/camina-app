import { loadFont } from '@remotion/fonts';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import './marca';

// CAMINA · Carrusel de Instagram «Siempre hay más por caminar» (9 láminas de 1080 × 1350, formato 4:5).
// Mismo lenguaje que el teaser: un horizonte curvo; abajo Tarija o la app dibujada sobre la cúpula, arriba la frase en
// serifa. Datos de ejemplo (sin personas reales) y sin premios ni precios inventados; la app todavía no está publicada.
// Exportar: npx remotion still Carrusel-1 out/carrusel/01.png (… hasta Carrusel-9).

loadFont({ family: 'Caslon', url: staticFile('fonts/libre-caslon-text-latin-400-normal.woff2'), weight: '400' });

export const LAMINAS = 9;
const ARCO = 760;
const R = 1500;
const CY = ARCO + R;
const BANDA = 720;
const CIELO_APP = 'linear-gradient(180deg, #07021a 0%, #12063a 45%, #2a0f6e 100%)';

export const Carrusel = ({ n }: { n: number }) => {
  switch (n) {
    case 1:
      return <Portada />;
    case 2:
      return (
        <LaminaApp etiqueta="Hola, somos Camina" titulo="Una app que convierte tus pasos en Puntos">
          <Anillos q1={0.82} q2={0.68} />
          <Cifra y={ARCO + 190} n="6.840" sub="pasos hoy" grande />
          <Pastilla y={ARCO + 395}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 40, height: 40 }} />
            +6 Puntos
          </Pastilla>
        </LaminaApp>
      );
    case 3:
      return (
        <LaminaApp etiqueta="1 · Camina" titulo="Tus pasos se cuentan solos">
          <Semana />
        </LaminaApp>
      );
    case 4:
      return (
        <LaminaApp etiqueta="2 · Suma Puntos" titulo="Cada día que caminas, ganas Puntos">
          <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 150, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 136, height: 136 }} />
            <div style={{ color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 150, lineHeight: 1 }}>1.139</div>
          </div>
          <Pastilla y={ARCO + 330}>Ganaste 7 Puntos hoy</Pastilla>
          <Sub y={ARCO + 420}>Puntos que se acumulan con cada paso</Sub>
        </LaminaApp>
      );
    case 5:
      return (
        <LaminaApp etiqueta="3 · Canjea" titulo="Usa tus Puntos en comercios de tu ciudad" mapa>
          <Logos />
        </LaminaApp>
      );
    case 6:
      return (
        <LaminaApp etiqueta="Tarjeta de fidelidad" titulo="Cada canje suma un sello">
          <Sellos />
          <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 330, display: 'flex', justifyContent: 'center' }}>
            <div style={{ padding: '8px 26px', borderRadius: 30, background: 'rgba(160,130,255,0.2)', color: '#c9b8ff', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 34 }}>4 de 5</div>
          </div>
          <Sub y={ARCO + 420}>Con 5 sellos eliges un premio gratis</Sub>
        </LaminaApp>
      );
    case 7:
      return (
        <LaminaApp etiqueta="Con tus amigos" titulo="Caminar es mejor en grupo" sinPie>
          <Podio />
        </LaminaApp>
      );
    case 8:
      return <Tarija />;
    default:
      return <Final />;
  }
};

// ---------- piezas comunes ----------
const Domo = ({ children, borde = 'rgba(98,240,182,0.35)' }: { children?: ReactNode; borde?: string }) => (
  <div style={{ position: 'absolute', left: 540 - R, top: ARCO, width: R * 2, height: R * 2, borderRadius: '50%', background: 'radial-gradient(50% 10% at 50% 0%, #2c1170, #160638 75%)', boxShadow: `0 -2px 18px ${borde}, 0 -1px 2px rgba(160,255,215,0.55)`, overflow: 'hidden' }}>
    {children}
  </div>
);

const Titulo = ({ etiqueta, titulo }: { etiqueta: string; titulo: string }) => (
  <div style={{ position: 'absolute', left: 90, right: 90, top: 0, height: ARCO - 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 28 }}>
    <div style={{ fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#62f0b6' }}>{etiqueta}</div>
    <div style={{ fontFamily: 'Caslon', fontSize: 76, lineHeight: 1.1, letterSpacing: '-0.01em', color: '#fff', textWrap: 'balance' } as CSSProperties}>{titulo}</div>
  </div>
);

const Pie = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, opacity: 0.8 }}>
    <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 40, height: 40 }} />
    <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 26, filter: 'brightness(0) invert(1)' }} />
  </div>
);

const Grano = () => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.1, mixBlendMode: 'overlay' }}>
      <filter id="grano">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={7} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grano)" />
    </svg>
    <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(0,0,0,0.35) 100%)' }} />
  </AbsoluteFill>
);

const LaminaApp = ({ etiqueta, titulo, children, mapa, sinPie }: { etiqueta: string; titulo: string; children: ReactNode; mapa?: boolean; sinPie?: boolean }) => (
  <AbsoluteFill style={{ background: CIELO_APP }}>
    <Domo>{mapa && <Img src={staticFile('hz/app-mapa.jpg')} style={{ position: 'absolute', left: R - 540, top: -40, width: 1080, height: 820, objectFit: 'cover', opacity: 0.1 }} />}</Domo>
    <Titulo etiqueta={etiqueta} titulo={titulo} />
    {children}
    {!sinPie && <Pie />}
    <Grano />
  </AbsoluteFill>
);

const Cifra = ({ y, n, sub, grande }: { y: number; n: string; sub: string; grande?: boolean }) => (
  <>
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: grande ? 132 : 104, lineHeight: 1, letterSpacing: '-0.01em' }}>{n}</div>
    <Sub y={y + (grande ? 142 : 114)}>{sub}</Sub>
  </>
);
const Sub = ({ y, children }: { y: number; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', color: '#b9a8e0', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 36 }}>{children}</div>
);
const Pastilla = ({ y, children }: { y: number; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 28px 10px 16px', borderRadius: 40, background: 'rgba(98,240,182,0.14)', color: '#62f0b6', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 36 }}>{children}</div>
  </div>
);

const arco = (r: number, x1: number, x2: number) => {
  const a1 = Math.asin((x1 - 540) / r);
  const a2 = Math.asin((x2 - 540) / r);
  const punto = (a: number) => ({ x: 540 + r * Math.sin(a), y: CY - r * Math.cos(a) });
  const P = (a: number) => `${punto(a).x} ${punto(a).y}`;
  return { d: `M${P(a1)} A${r} ${r} 0 0 1 ${P(a2)}`, largo: r * (a2 - a1), punto, a1, a2 };
};
// los dos anillos de la app como arcos del horizonte
const Anillos = ({ q1, q2, brillo = 0 }: { q1: number; q2: number; brillo?: number }) => {
  const ext = arco(R - 20, -40, 1120);
  const int = arco(R - 92, -40, 1120);
  const cab = int.punto(int.a1 + (int.a2 - int.a1) * q2);
  const dash = (a: { largo: number }, q: number) => `${a.largo * q} ${a.largo * 2}`;
  return (
    <svg width={1080} height={1350} style={{ position: 'absolute', inset: 0 }}>
      {brillo > 0 && <path d={ext.d} stroke="#62f0b6" strokeOpacity={0.4 * brillo} strokeWidth={60} fill="none" style={{ filter: 'blur(24px)' }} />}
      <path d={ext.d} stroke="rgba(255,255,255,0.09)" strokeWidth={36} fill="none" />
      <path d={ext.d} stroke="#86ecc6" strokeWidth={36} strokeLinecap="round" fill="none" strokeDasharray={dash(ext, q1)} />
      <path d={int.d} stroke="rgba(255,255,255,0.07)" strokeWidth={14} fill="none" />
      <path d={int.d} stroke="#2ff0a0" strokeOpacity={0.45} strokeWidth={22} fill="none" strokeDasharray={dash(int, q2)} style={{ filter: 'blur(9px)' }} />
      <path d={int.d} stroke="#2ff0a0" strokeWidth={14} strokeLinecap="round" fill="none" strokeDasharray={dash(int, q2)} />
      {q2 < 0.995 && <circle cx={cab.x} cy={cab.y} r={6} fill="#ffffff" />}
    </svg>
  );
};

// ---------- 1 · portada ----------
const Portada = () => {
  const rt = R + 34;
  const a = 0.9;
  const P = (x: number) => `${540 + rt * Math.sin(x)} ${CY - rt * Math.cos(x)}`;
  return (
    <AbsoluteFill>
      <Img src={staticFile('hz/plaza-palmeras-fondo.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(8,3,24,0.35), rgba(8,3,24,0) 45%)' }} />
      <div style={{ position: 'absolute', left: 0, top: BANDA, width: 1080, height: 1350 - BANDA, overflow: 'hidden', clipPath: `circle(${R}px at 50% ${ARCO - BANDA + R}px)` }}>
        <Img src={staticFile('hz/plaza-palmeras-cuadro.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%' }} />
      </div>
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO, width: R * 2, height: R * 2, borderRadius: '50%', boxShadow: '0 -2px 14px rgba(255,255,255,0.25), 0 -1px 2px rgba(255,255,255,0.4)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 84, height: 84 }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 56, filter: 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(0,0,0,0.3))' }} />
      </div>
      <svg width={1080} height={1350} style={{ position: 'absolute', inset: 0, overflow: 'visible', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.35))' }}>
        <defs>
          <path id="portada-arco" d={`M${P(-a)} A${rt} ${rt} 0 0 1 ${P(a)}`} />
        </defs>
        <text fontFamily="Caslon" fontSize={60} letterSpacing={-0.6} fill="#fff">
          <textPath href="#portada-arco" startOffset="50%" textAnchor="middle">
            Siempre hay más por caminar
          </textPath>
        </text>
      </svg>
      <div style={{ position: 'absolute', right: 56, bottom: 56, padding: '12px 26px', borderRadius: 40, background: 'rgba(10,4,30,0.55)', color: '#fff', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 30 }}>Desliza →</div>
      <Grano />
    </AbsoluteFill>
  );
};

// ---------- 3 · la semana ----------
const Semana = () => {
  const alto = [0.26, 0.6, 0.94, 0.55, 0.52, 0.96, 1];
  const meta = [false, false, true, false, false, true, true];
  const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'Hoy'];
  const base = ARCO + 255;
  return (
    <>
      {alto.map((h, i) => {
        const x = 540 + (i - 3) * 104 - 38;
        const H = 185 * h;
        return (
          <div key={i}>
            <div style={{ position: 'absolute', left: x, top: base - H, width: 76, height: H, borderRadius: 22, background: meta[i] ? 'linear-gradient(180deg, #a8f5d4, #5fe0a8)' : 'linear-gradient(180deg, #3d4c70, #2a3656)', boxShadow: i === 6 ? '0 0 0 4px #e9fff5' : 'none' }} />
            <div style={{ position: 'absolute', left: x - 12, width: 100, top: base + 14, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: i === 6 ? 800 : 500, fontSize: 30, color: i === 6 ? '#fff' : '#b9a8e0' }}>{dias[i]}</div>
          </div>
        );
      })}
      <Cifra y={base + 78} n="32.917" sub="pasos esta semana" />
    </>
  );
};

// ---------- 5 · comercios de la ciudad ----------
const LOGOS = ['fripaps-logo', 'bloom-logo', 'coco-logo', 'cancheritos-logo', 'galera-logo', 'viviana-logo', 'sabor-logo', 'luzdevida-app'];
const Logos = () => {
  const fila = (r: number, desde: number, paso: number) =>
    [0, 1, 2, 3].map((i) => {
      const a = ((i - 1.5) * paso) / r;
      return { x: 540 + r * Math.sin(a), y: CY - r * Math.cos(a), a, src: LOGOS[desde + i] };
    });
  const todos = [...fila(R - 140, 0, 205), ...fila(R - 330, 4, 205)];
  return (
    <>
      {todos.map((l) => (
        <div key={l.src} style={{ position: 'absolute', left: l.x - 74, top: l.y - 74, width: 148, height: 148, borderRadius: 34, overflow: 'hidden', background: '#fff', boxShadow: '0 0 0 4px rgba(98,240,182,0.85), 0 10px 30px rgba(0,0,0,0.45)', transform: `rotate(${(l.a * 180) / Math.PI}deg)` }}>
          <Img src={staticFile(`yasi/locales/${l.src}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ))}
      <Sub y={ARCO + 470}>8 comercios de Tarija</Sub>
    </>
  );
};

// ---------- 6 · sellos de la tarjeta de fidelidad ----------
const Sellos = () => {
  const r = R - 170;
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = ((i - 2) * 178) / r;
        const x = 540 + r * Math.sin(a);
        const y = CY - r * Math.cos(a);
        return i < 4 ? (
          <Img key={i} src={staticFile('marca/sello-oro.png')} style={{ position: 'absolute', left: x - 74, top: y - 74, width: 148, height: 148, transform: `rotate(${(a * 180) / Math.PI}deg)` }} />
        ) : (
          <div key={i} style={{ position: 'absolute', left: x - 66, top: y - 66, width: 132, height: 132, borderRadius: '50%', border: '5px dashed rgba(185,168,224,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b9a8e0', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 46 }}>5</div>
        );
      })}
    </>
  );
};

// ---------- 7 · ranking del grupo (datos de ejemplo) ----------
const Podio = () => {
  const base = ARCO + 400;
  const puestos = [
    { x: 290, h: 150, n: 2, ini: 'A', nombre: 'Ana', pasos: '38,3k pasos' },
    { x: 540, h: 215, n: 1, ini: 'J', nombre: 'Joaco', pasos: '64,8k pasos' },
    { x: 790, h: 110, n: 3, ini: 'Tú', nombre: 'Tú', pasos: '32,9k pasos' },
  ];
  return (
    <>
      {puestos.map((p) => (
        <div key={p.n}>
          <div style={{ position: 'absolute', left: p.x - 105, top: base - p.h, width: 210, height: p.h + 200, borderRadius: '34px 34px 0 0', background: p.n === 1 ? 'linear-gradient(180deg, rgba(98,240,182,0.55), rgba(98,240,182,0.08))' : 'linear-gradient(180deg, rgba(185,168,224,0.32), rgba(185,168,224,0.05))', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)', display: 'flex', justifyContent: 'center', paddingTop: 16, color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 60 }}>{p.n}</div>
          <div style={{ position: 'absolute', left: p.x - 50, top: base - p.h - 182, width: 100, height: 100, borderRadius: '50%', background: p.ini === 'Tú' ? '#2a0f6e' : '#62f0b6', boxShadow: p.n === 1 ? '0 0 0 5px #e9fff5, 0 0 30px rgba(98,240,182,0.6)' : '0 0 0 4px rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.ini === 'Tú' ? '#fff' : '#1b0b44', fontFamily: 'Jakarta', fontWeight: 800, fontSize: p.ini === 'Tú' ? 36 : 46 }}>{p.ini}</div>
          <div style={{ position: 'absolute', left: p.x - 110, width: 220, top: base - p.h - 72, textAlign: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 28, lineHeight: 1.15 }}>
            {p.nombre}
            <div style={{ color: '#b9a8e0', fontWeight: 500, fontSize: 24 }}>{p.pasos}</div>
          </div>
        </div>
      ))}
    </>
  );
};

// ---------- 8 · hecho en Tarija ----------
const Tarija = () => {
  const fotos = ['hz/catedral-cuadro.jpg', 'hz/plaza-palmeras-cuadro.jpg', 'hz/sendero-baranda-cuadro.jpg', 'hz/vinedos.jpg'];
  return (
    <AbsoluteFill>
      <Img src={staticFile('hz/catedral-fondo.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(8,3,24,0.55), rgba(8,3,24,0.25) 55%)' }} />
      <div style={{ position: 'absolute', left: 0, top: BANDA, width: 1080, height: 1350 - BANDA, overflow: 'hidden', clipPath: `circle(${R}px at 50% ${ARCO - BANDA + R}px)`, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, background: '#0b0420' }}>
        {fotos.map((f) => (
          <Img key={f} src={staticFile(f)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 540 - R, top: ARCO, width: R * 2, height: R * 2, borderRadius: '50%', boxShadow: '0 -2px 14px rgba(255,255,255,0.25), 0 -1px 2px rgba(255,255,255,0.4)' }} />
      <Titulo etiqueta="Hecho en Tarija, Bolivia" titulo="Nació caminando estas calles" />
      <Grano />
    </AbsoluteFill>
  );
};

// ---------- 9 · cierre ----------
export const Tienda = ({ icono, nombre }: { icono: ReactNode; nombre: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 30px 16px 24px', borderRadius: 24, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.32)' }}>
    {icono}
    <div style={{ display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 21, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>Muy pronto en</span>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 36, lineHeight: 1.1 }}>{nombre}</span>
    </div>
  </div>
);
const Final = () => (
  <AbsoluteFill style={{ background: CIELO_APP }}>
    <AbsoluteFill style={{ background: `radial-gradient(90% 30% at 50% ${(ARCO / 1350) * 100}%, rgba(98,240,182,0.28), transparent 70%)` }} />
    <Domo borde="rgba(98,240,182,0.6)" />
    <Anillos q1={1} q2={1} brillo={1} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO - 330, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, filter: 'drop-shadow(0 0 30px rgba(98,240,182,0.45))' }}>
      <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 150, height: 150 }} />
      <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 104, filter: 'brightness(0) invert(1)' }} />
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO - 150, textAlign: 'center', fontFamily: 'Caslon', fontSize: 56, color: '#efe8ff' }}>Siempre hay más por caminar</div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 175, display: 'flex', justifyContent: 'center', gap: 22 }}>
      <Tienda icono={<IconoApple />} nombre="App Store" />
      <Tienda icono={<IconoPlay />} nombre="Google Play" />
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 345, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 600, fontSize: 34, color: '#b9a8e0' }}>Síguenos para enterarte primero</div>
    <Grano />
  </AbsoluteFill>
);
