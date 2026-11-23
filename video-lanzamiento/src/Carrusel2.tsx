import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import './marca';

// CAMINA · Carrusel de Instagram, identidad «Paso a paso» (9 láminas de 1080 × 1350).
// Sin el horizonte curvo: láminas planas que alternan verde menta y morado, titulares grandes en Mona Sans ancha (la
// letra de la marca), la app dentro de un teléfono y un camino de huellas que sigue de una lámina a la siguiente al
// deslizar. Capturas de la app con datos de ejemplo; sin premios ni precios inventados; la app todavía no está publicada.
// Exportar: npx remotion still Carrusel2-1 out/carrusel-2/01.png (… hasta Carrusel2-9).

export const LAMINAS2 = 9;
const W = 1080;
const MENTA = '#62f0b6';
const MORADO = '#200a52';

type Tema = 'menta' | 'morado' | 'foto';
const tinta = (t: Tema) => (t === 'menta' ? MORADO : '#ffffff');
const acento = (t: Tema) => (t === 'menta' ? '#ffffff' : MENTA);

export const Carrusel2 = ({ n }: { n: number }) => {
  switch (n) {
    case 1:
      return (
        <Lamina n={1} tema="morado">
          <Marca tema="morado" />
          <div style={{ position: 'absolute', right: 80, top: 92, padding: '12px 26px', borderRadius: 40, background: 'rgba(98,240,182,0.14)', color: MENTA, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 28 }}>Desliza →</div>
          <Titular tema="morado" top={210} tam={118}>
            Tus pasos <Ac tema="morado">valen.</Ac>
          </Titular>
          <Texto tema="morado" top={480} ancho={470}>
            Camina es la app de Tarija que convierte tus pasos en Puntos.
          </Texto>
          <Foto src="hz/catedral-cuadro.jpg" x={70} y={720} w={520} h={380} rot={-4} />
          <Telefono src="yasi/app/rachas-dark.jpg" x={610} y={470} alto={700} rot={6} />
        </Lamina>
      );
    case 2:
      return (
        <Lamina n={2} tema="menta">
          <Etiqueta tema="menta">Hola, somos Camina</Etiqueta>
          <Titular tema="menta" top={200} tam={96}>
            Una app que convierte tus pasos en <Ac tema="menta">Puntos</Ac>
          </Titular>
          <Texto tema="menta" top={640} ancho={470}>
            Caminas como siempre. La app cuenta tus pasos y te da Puntos para usar en tu ciudad.
          </Texto>
          <Telefono src="yasi/app/rachas-dark.jpg" x={610} y={560} alto={600} rot={4} />
        </Lamina>
      );
    case 3:
      return (
        <Lamina n={3} tema="morado">
          <Numero tema="morado">01</Numero>
          <Titular tema="morado" top={340} tam={110}>
            Camina
          </Titular>
          <Texto tema="morado" top={500} ancho={460}>
            Tus pasos se cuentan solos, todos los días.
          </Texto>
          <Telefono src="yasi/app/actividad-dark.jpg" x={600} y={520} alto={640} rot={-4} />
        </Lamina>
      );
    case 4:
      return (
        <Lamina n={4} tema="menta">
          <Numero tema="menta">02</Numero>
          <Titular tema="menta" top={340} tam={96}>
            Suma Puntos
          </Titular>
          <Texto tema="menta" top={500} ancho={460}>
            Cada día que caminas, ganas Puntos.
          </Texto>
          <Telefono src="app/puntos-248.jpg" x={600} y={520} alto={640} rot={4} />
        </Lamina>
      );
    case 5:
      return (
        <Lamina n={5} tema="morado">
          <Numero tema="morado">03</Numero>
          <Titular tema="morado" top={330} tam={104}>
            Canjea en tu <Ac tema="morado">ciudad</Ac>
          </Titular>
          <Texto tema="morado" top={590} ancho={860}>
            Usa tus Puntos en comercios de Tarija.
          </Texto>
          <Logos y={700} />
        </Lamina>
      );
    case 6:
      return (
        <Lamina n={6} tema="menta">
          <Etiqueta tema="menta">Tarjeta de fidelidad</Etiqueta>
          <Titular tema="menta" top={200} tam={104}>
            Cada canje suma un <Ac tema="menta">sello</Ac>
          </Titular>
          <Tarjeta y={620} />
          <Texto tema="menta" top={1010} ancho={900}>
            Con 5 sellos eliges un premio gratis.
          </Texto>
        </Lamina>
      );
    case 7:
      return (
        <Lamina n={7} tema="morado">
          <Etiqueta tema="morado">Con tus amigos</Etiqueta>
          <Titular tema="morado" top={200} tam={104}>
            Caminar es mejor en <Ac tema="morado">grupo</Ac>
          </Titular>
          <Texto tema="morado" top={640} ancho={440}>
            Grupos, rankings y rachas para caminar juntos.
          </Texto>
          <Telefono src="yasi/app/grupo-v4-dark.jpg" x={580} y={560} alto={600} rot={-4} />
        </Lamina>
      );
    case 8:
      return (
        <Lamina n={8} tema="foto">
          <Img src={staticFile('yasi/f/t-plaza-luis-de-fuentes.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%' }} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(32,10,82,0.15) 30%, rgba(32,10,82,0.92) 82%)' }} />
          <Etiqueta tema="foto" top={660}>Tarija, Bolivia</Etiqueta>
          <Titular tema="foto" top={730} tam={110}>
            Hecho en <Ac tema="foto">Tarija</Ac>
          </Titular>
          <Texto tema="foto" top={960} ancho={860}>
            Nació caminando estas calles.
          </Texto>
        </Lamina>
      );
    default:
      return (
        <Lamina n={9} tema="morado">
          <div style={{ position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 170, height: 170 }} />
            <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 116 }} />
          </div>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 520, textAlign: 'center', fontFamily: 'Mona', fontWeight: 850, fontStretch: '125%', fontSize: 96, lineHeight: 0.95, textTransform: 'uppercase', color: '#fff' }}>Muy pronto</div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 700, display: 'flex', justifyContent: 'center', gap: 22 }}>
            <Tienda icono={<IconoApple />} nombre="App Store" />
            <Tienda icono={<IconoPlay />} nombre="Google Play" />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 880, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 600, fontSize: 38, color: '#c9b8ff' }}>Síguenos para enterarte primero</div>
        </Lamina>
      );
  }
};

// ---------- base de cada lámina ----------
const FONDO: Record<Tema, string> = {
  menta: `radial-gradient(90% 70% at 30% 20%, #8af7cd, ${MENTA} 70%)`,
  morado: `radial-gradient(90% 70% at 70% 20%, #3a1690, ${MORADO} 70%)`,
  foto: MORADO,
};
const Lamina = ({ n, tema, children }: { n: number; tema: Tema; children: ReactNode }) => (
  <AbsoluteFill style={{ background: FONDO[tema], overflow: 'hidden' }}>
    {children}
    <Camino n={n} tema={tema} />
    {n > 1 && n < LAMINAS2 && <div style={{ position: 'absolute', right: 80, top: 96, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, color: tinta(tema), opacity: 0.55 }}>{n} / {LAMINAS2}</div>}
  </AbsoluteFill>
);

const Marca = ({ tema }: { tema: Tema }) => (
  <div style={{ position: 'absolute', left: 80, top: 86, display: 'flex', alignItems: 'center', gap: 4 }}>
    <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 70, height: 70 }} />
    <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 46, filter: tema === 'menta' ? 'brightness(0)' : 'none' }} />
  </div>
);
const Etiqueta = ({ tema, children, top = 100 }: { tema: Tema; children: ReactNode; top?: number }) => (
  <div style={{ position: 'absolute', left: 80, top, display: 'inline-flex', padding: '10px 24px', borderRadius: 40, background: tema === 'menta' ? MORADO : 'rgba(98,240,182,0.16)', color: MENTA, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{children}</div>
);
const Numero = ({ tema, children }: { tema: Tema; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 74, top: 70, fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 250, lineHeight: 1, color: 'transparent', WebkitTextStroke: `4px ${tema === 'menta' ? MORADO : MENTA}` } as CSSProperties}>{children}</div>
);
const Titular = ({ tema, top, tam, children }: { tema: Tema; top: number; tam: number; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 80, right: 80, top, fontFamily: 'Mona', fontWeight: 850, fontStretch: '125%', fontSize: tam, lineHeight: 0.95, letterSpacing: '-0.01em', textTransform: 'uppercase', color: tinta(tema) }}>{children}</div>
);
const Ac = ({ tema, children }: { tema: Tema; children: ReactNode }) => <span style={{ color: acento(tema) }}>{children}</span>;
const Texto = ({ tema, top, ancho, children }: { tema: Tema; top: number; ancho: number; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 80, top, width: ancho, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 40, lineHeight: 1.3, color: tinta(tema), opacity: 0.92 }}>{children}</div>
);

// teléfono con una captura de la app
const Telefono = ({ src, x, y, alto, rot = 0 }: { src: string; x: number; y: number; alto: number; rot?: number }) => {
  const ancho = alto * (780 / 1688);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: ancho + 28, height: alto + 28, borderRadius: 64, background: '#0d0a18', padding: 14, boxShadow: '0 40px 80px rgba(10,2,30,0.45), inset 0 0 0 2px rgba(255,255,255,0.12)', transform: `rotate(${rot}deg)` }}>
      <div style={{ width: ancho, height: alto, borderRadius: 52, overflow: 'hidden' }}>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
  );
};
const Foto = ({ src, x, y, w, h, rot = 0 }: { src: string; x: number; y: number; w: number; h: number; rot?: number }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 40, overflow: 'hidden', boxShadow: '0 30px 70px rgba(10,2,30,0.45), 0 0 0 6px #fff', transform: `rotate(${rot}deg)` }}>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </div>
);

// los 8 comercios
const LOGOS = ['fripaps-logo', 'bloom-logo', 'coco-logo', 'cancheritos-logo', 'galera-logo', 'viviana-logo', 'sabor-logo', 'luzdevida-app'];
const Logos = ({ y }: { y: number }) => (
  <div style={{ position: 'absolute', left: 80, top: y, width: 920, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }}>
    {LOGOS.map((l, i) => (
      <div key={l} style={{ height: 206, borderRadius: 40, overflow: 'hidden', background: '#fff', boxShadow: '0 16px 40px rgba(0,0,0,0.35)', transform: `rotate(${[-3, 2, -1, 3, 2, -2, 3, -1][i]}deg)` }}>
        <Img src={staticFile(`yasi/locales/${l}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    ))}
  </div>
);

// la tarjeta de fidelidad, como en la app
const Tarjeta = ({ y }: { y: number }) => (
  <div style={{ position: 'absolute', left: 80, top: y, width: 920, padding: '40px 44px', borderRadius: 48, background: MORADO, boxShadow: '0 30px 70px rgba(32,10,82,0.35)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 42 }}>
      Tarjeta de fidelidad
      <span style={{ padding: '8px 22px', borderRadius: 30, background: 'rgba(160,130,255,0.25)', color: '#c9b8ff', fontSize: 32 }}>4 de 5</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36 }}>
      {[0, 1, 2, 3].map((i) => (
        <Img key={i} src={staticFile('marca/sello-oro.png')} style={{ width: 150, height: 150 }} />
      ))}
      <div style={{ width: 142, height: 142, margin: 4, borderRadius: '50%', border: '5px dashed rgba(185,168,224,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b9a8e0', fontFamily: 'Jakarta', fontWeight: 700, fontSize: 48 }}>5</div>
    </div>
  </div>
);

const Tienda = ({ icono, nombre }: { icono: ReactNode; nombre: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 32px 18px 26px', borderRadius: 26, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.35)' }}>
    {icono}
    <div style={{ display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>Muy pronto en</span>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 40, lineHeight: 1.1 }}>{nombre}</span>
    </div>
  </div>
);

// ---------- el camino de huellas: un solo recorrido a lo largo de las 9 láminas ----------
const PASO = 128;
const yCamino = (x: number) => 1262 + 34 * Math.sin(x / 380) + 18 * Math.sin(x / 150 + 1);
const HUELLAS = (() => {
  const out: { x: number; y: number; giro: number; izq: boolean }[] = [];
  const fin = (LAMINAS2 - 1) * W + 470; // termina en la última lámina, bajo el logo
  for (let x = 40, i = 0; x < fin; x += PASO, i++) {
    const d = (yCamino(x + 1) - yCamino(x - 1)) / 2;
    const ang = Math.atan2(d, 1);
    const izq = i % 2 === 0;
    const off = (izq ? -1 : 1) * 22;
    out.push({ x: x - Math.sin(ang) * off, y: yCamino(x) + Math.cos(ang) * off, giro: (ang * 180) / Math.PI + 90, izq });
  }
  return out;
})();
const Camino = ({ n, tema }: { n: number; tema: Tema }) => {
  const x0 = (n - 1) * W;
  const color = tema === 'menta' ? MORADO : tema === 'foto' ? '#ffffff' : MENTA;
  return (
    <>
      {HUELLAS.filter((h) => h.x > x0 - 80 && h.x < x0 + W + 80).map((h, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: h.x - x0 - 21,
            top: h.y - 44,
            width: 42,
            height: 88,
            background: color,
            opacity: 0.85,
            WebkitMaskImage: `url(${staticFile(h.izq ? 'marca/pie-L.png' : 'marca/pie-R.png')})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            transform: `rotate(${h.giro}deg)`,
          }}
        />
      ))}
    </>
  );
};
