import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import './marca';

// CAMINA · Carrusel de Instagram, identidad «Paso a paso» (11 láminas de 1080 × 1350).
// Láminas planas en negro, blanco, morado y menta; titulares grandes en Mona Sans ancha (la letra de la marca); la app
// dentro de teléfonos (capturas con datos de ejemplo, sin personas reales) y un camino de huellas que sigue de una lámina
// a la siguiente al deslizar. Lo principal: pasos, la ruta del mes, grupos, ranking y chat; la tarjeta de fidelidad va
// como detalle secundario. Sin premios ni precios inventados; la app todavía no está publicada.
// Exportar: npx remotion still Carrusel2-1 out/carrusel-2/01.png (… hasta Carrusel2-11).

export const LAMINAS2 = 11;
const W = 1080;
const MENTA = '#62f0b6';
const MORADO = '#200a52';
const NEGRO = '#0b0b0d';
const BLANCO = '#f5f4f0';

type Tema = 'negro' | 'blanco' | 'morado' | 'menta' | 'foto';
const tinta = (t: Tema) => (t === 'blanco' ? NEGRO : t === 'menta' ? MORADO : '#ffffff');
const acento = (t: Tema) => (t === 'blanco' ? '#5b2bd6' : t === 'menta' ? '#ffffff' : MENTA);
const FONDO: Record<Tema, string> = {
  negro: `radial-gradient(80% 60% at 80% 10%, #1b1430, ${NEGRO} 70%)`,
  blanco: BLANCO,
  morado: `radial-gradient(90% 70% at 70% 20%, #3a1690, ${MORADO} 70%)`,
  menta: `radial-gradient(90% 70% at 30% 20%, #8af7cd, ${MENTA} 70%)`,
  foto: MORADO,
};

const A = (s: string) => `yasi/app/${s}.jpg`;

export const Carrusel2 = ({ n }: { n: number }) => {
  switch (n) {
    case 1:
      return <Portada />;
    case 2:
      return (
        <Lamina n={2} tema="blanco">
          <Etiqueta tema="blanco">Cómo funciona</Etiqueta>
          <Titular tema="blanco" top={250} tam={92}>
            Caminas. Sumas. <Ac tema="blanco">Canjeas.</Ac>
          </Titular>
          {[
            ['01', 'Caminas', 'La app cuenta tus pasos sola, todos los días.'],
            ['02', 'Sumas Puntos', 'Cada día que caminas, ganas Puntos.'],
            ['03', 'Canjeas', 'Usas tus Puntos en comercios de tu ciudad.'],
          ].map(([num, t, d], i) => (
            <div key={num} style={{ position: 'absolute', left: 80, right: 80, top: 570 + i * 196, height: 172, borderRadius: 40, background: NEGRO, display: 'flex', alignItems: 'center', gap: 34, padding: '0 44px' }}>
              <div style={{ fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 84, color: 'transparent', WebkitTextStroke: `3px ${MENTA}`, width: 150 } as CSSProperties}>{num}</div>
              <div>
                <div style={{ fontFamily: 'Mona', fontWeight: 850, fontStretch: '125%', fontSize: 44, color: '#fff', textTransform: 'uppercase' }}>{t}</div>
                <div style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 30, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{d}</div>
              </div>
            </div>
          ))}
        </Lamina>
      );
    case 3:
      return (
        <Lamina n={3} tema="morado">
          <Etiqueta tema="morado">Tus pasos</Etiqueta>
          <Titular tema="morado" top={250} tam={92}>
            Se cuentan <Ac tema="morado">solos</Ac>
          </Titular>
          <Fichas tema="morado" top={480} items={['Meta diaria', 'Rachas', 'Actividad de la semana']} />
          <Telefono src={A('actividad-dark')} x={110} y={600} alto={600} rot={-6} />
          <Telefono src={A('rachas-dark')} x={520} y={560} alto={640} rot={5} />
        </Lamina>
      );
    case 4:
      return (
        <Lamina n={4} tema="negro">
          <Etiqueta tema="negro">Evento del mes</Etiqueta>
          <Titular tema="negro" top={250} tam={96}>
            Cada mes, una <Ac tema="negro">ruta nueva</Ac>
          </Titular>
          <Texto tema="negro" top={480} ancho={900}>
            Te tocan 3 locales de tu ciudad. Complétala y gana Día doble, insignia y boleto del sorteo.
          </Texto>
          <Telefono src={A('eventos-ruta-v2-dark')} x={110} y={680} alto={560} rot={-5} />
          <Telefono src={A('ruta-mapa-nov-dark')} x={540} y={650} alto={600} rot={4} />
        </Lamina>
      );
    case 5:
      return (
        <Lamina n={5} tema="menta">
          <Etiqueta tema="menta">Grupos y ranking</Etiqueta>
          <Titular tema="menta" top={250} tam={96}>
            Camina con tus <Ac tema="menta">amigos</Ac>
          </Titular>
          <Fichas tema="menta" top={480} items={['Meta semanal del grupo', 'Ranking semanal', 'Podio']} />
          <Telefono src={A('ranking-nuevo-dark')} x={110} y={600} alto={600} rot={-5} />
          <Telefono src={A('grupo-v4-dark')} x={520} y={570} alto={640} rot={4} />
        </Lamina>
      );
    case 6:
      return (
        <Lamina n={6} tema="blanco">
          <Etiqueta tema="blanco">Chat del grupo</Etiqueta>
          <Titular tema="blanco" top={250} tam={80}>
            Y se organizan en el <Ac tema="blanco">chat</Ac>
          </Titular>
          <Telefono src={A('grupo-chat-dark')} x={590} y={480} alto={740} rot={4} />
          <Burbuja top={520} quien="Camila">¿Quién se anota a la caminata del sábado por la plaza?</Burbuja>
          <Burbuja top={730} quien="Lucía" yo>Yo voy, salgo a las 7</Burbuja>
          <Burbuja top={890} quien="Joaquín">Vamos 1.° en la meta del grupo</Burbuja>
        </Lamina>
      );
    case 7:
      return (
        <Lamina n={7} tema="negro">
          <Etiqueta tema="negro">Desafíos</Etiqueta>
          <Titular tema="negro" top={250} tam={96}>
            Reta a tu <Ac tema="negro">grupo</Ac>
          </Titular>
          <Texto tema="negro" top={480} ancho={900}>
            Elijan la regla, la meta y los Puntos en juego.
          </Texto>
          <Telefono src={A('grupos-v2-dark')} x={110} y={640} alto={580} rot={-5} />
          <div style={{ position: 'absolute', left: 560, top: 700, width: 440, padding: '34px 36px', borderRadius: 40, background: MENTA, color: MORADO, transform: 'rotate(3deg)', boxShadow: '0 30px 70px rgba(0,0,0,0.45)' }}>
            <div style={{ fontFamily: 'Mona', fontWeight: 850, fontStretch: '125%', fontSize: 50, lineHeight: 1, textTransform: 'uppercase' }}>+5 Puntos</div>
            <div style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 30, marginTop: 14, lineHeight: 1.3 }}>por cada amigo que invitas y se suma</div>
          </div>
        </Lamina>
      );
    case 8:
      return (
        <Lamina n={8} tema="morado">
          <Etiqueta tema="morado">Canjes</Etiqueta>
          <Titular tema="morado" top={250} tam={96}>
            Canjea en tu <Ac tema="morado">ciudad</Ac>
          </Titular>
          <Texto tema="morado" top={480} ancho={460}>
            Usa tus Puntos en comercios de Tarija.
          </Texto>
          <Logos x={80} y={650} />
          <Telefono src={A('mapa-locales-dark')} x={590} y={540} alto={640} rot={4} />
          <div style={{ position: 'absolute', left: 80, top: 1035, width: 470, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderRadius: 24, background: 'rgba(255,255,255,0.08)' }}>
            {[0, 1, 2].map((i) => (
              <Img key={i} src={staticFile('marca/sello-oro.png')} style={{ width: 46, height: 46, marginLeft: i ? -22 : 0 }} />
            ))}
            <div style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 24, color: 'rgba(255,255,255,0.85)', lineHeight: 1.25 }}>Y cada canje suma un sello en tu tarjeta de fidelidad</div>
          </div>
        </Lamina>
      );
    case 9:
      return (
        <Lamina n={9} tema="blanco">
          <Etiqueta tema="blanco">Insignias y niveles</Etiqueta>
          <Titular tema="blanco" top={250} tam={92}>
            Hazte <Ac tema="blanco">fan</Ac> de tus lugares
          </Titular>
          <Fichas tema="blanco" top={480} items={['Visitante', 'Habitual', 'Fan', 'Leyenda del mes']} />
          <Telefono src={A('ficha-bloom-nivel-dark')} x={110} y={600} alto={600} rot={-5} />
          <Telefono src={A('perfil-insignias-dark')} x={520} y={570} alto={640} rot={4} />
        </Lamina>
      );
    case 10:
      return (
        <Lamina n={10} tema="foto">
          <Img src={staticFile('yasi/f/t-plaza-luis-de-fuentes.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(11,11,13,0.1) 30%, rgba(11,11,13,0.9) 82%)' }} />
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
        <Lamina n={11} tema="negro" sinEncabezado>
          <AbsoluteFill style={{ background: 'radial-gradient(60% 40% at 50% 38%, rgba(98,240,182,0.18), transparent 70%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 240, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 170, height: 170 }} />
            <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 116 }} />
          </div>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 520, textAlign: 'center', fontFamily: 'Mona', fontWeight: 850, fontStretch: '125%', fontSize: 96, lineHeight: 0.95, textTransform: 'uppercase', color: '#fff' }}>Muy pronto</div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 690, display: 'flex', justifyContent: 'center', gap: 22 }}>
            <Tienda icono={<IconoApple />} nombre="App Store" />
            <Tienda icono={<IconoPlay />} nombre="Google Play" />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 870, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 600, fontSize: 38, color: 'rgba(255,255,255,0.75)' }}>Síguenos para enterarte primero</div>
        </Lamina>
      );
  }
};

// ---------- portada: sobria y llamativa (una idea, un teléfono) ----------
const Portada = () => {
  const alto = 1180;
  const ancho = alto * (780 / 1688);
  return (
    <AbsoluteFill style={{ background: NEGRO, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(45% 30% at 50% 88%, rgba(98,240,182,0.4), rgba(98,240,182,0.06) 60%, transparent 80%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 96, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 62, height: 62 }} />
        <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 40 }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 200, textAlign: 'center', fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 168, lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase', color: '#fff' }}>
        Cada
        <br />
        paso
        <br />
        <span style={{ color: MENTA }}>cuenta.</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 680, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 34, color: 'rgba(255,255,255,0.72)' }}>La app que convierte tus pasos en Puntos</div>
      {/* el teléfono asoma desde abajo: solo el inicio con el anillo */}
      <div style={{ position: 'absolute', left: 540 - (ancho + 32) / 2, top: 780, width: ancho + 32, height: alto + 32, borderRadius: 78, background: '#0d0a18', padding: 16, boxShadow: '0 -20px 120px rgba(98,240,182,0.25), inset 0 0 0 2px rgba(255,255,255,0.16)' }}>
        <div style={{ width: ancho, height: alto, borderRadius: 62, overflow: 'hidden' }}>
          <Img src={staticFile(A('inicio-dark'))} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 330, background: `linear-gradient(180deg, rgba(11,11,13,0), ${NEGRO} 85%)` }} />
    </AbsoluteFill>
  );
};

// ---------- base de cada lámina ----------
const Lamina = ({ n, tema, children, sinEncabezado }: { n: number; tema: Tema; children: ReactNode; sinEncabezado?: boolean }) => (
  <AbsoluteFill style={{ background: FONDO[tema], overflow: 'hidden' }}>
    {children}
    <Camino n={n} tema={tema} />
    {!sinEncabezado && (
      <>
        <Marca tema={tema} chica />
        <div style={{ position: 'absolute', right: 80, top: 100, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 26, color: tinta(tema), opacity: 0.55 }}>
          {String(n).padStart(2, '0')} / {LAMINAS2}
        </div>
      </>
    )}
  </AbsoluteFill>
);

const Marca = ({ tema, chica }: { tema: Tema; chica?: boolean }) => (
  <div style={{ position: 'absolute', left: 80, top: chica ? 92 : 86, display: 'flex', alignItems: 'center', gap: 4, opacity: chica ? 0.9 : 1 }}>
    <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: chica ? 48 : 70, height: chica ? 48 : 70, filter: tema === 'menta' ? 'brightness(0.25) saturate(2) hue-rotate(200deg)' : 'none' }} />
    <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: chica ? 30 : 46, filter: tema === 'blanco' || tema === 'menta' ? 'brightness(0)' : tema === 'foto' ? 'brightness(0) invert(1)' : 'none' }} />
  </div>
);
const Etiqueta = ({ tema, children, top = 170 }: { tema: Tema; children: ReactNode; top?: number }) => (
  <div style={{ position: 'absolute', left: 80, top, display: 'inline-flex', padding: '10px 24px', borderRadius: 40, background: tema === 'blanco' ? NEGRO : tema === 'menta' ? MORADO : 'rgba(98,240,182,0.16)', color: MENTA, fontFamily: 'Jakarta', fontWeight: 700, fontSize: 24, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{children}</div>
);
const Titular = ({ tema, top, tam, children }: { tema: Tema; top: number; tam: number; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 80, right: 80, top, fontFamily: 'Mona', fontWeight: 850, fontStretch: '125%', fontSize: tam, lineHeight: 0.95, letterSpacing: '-0.01em', textTransform: 'uppercase', color: tinta(tema) }}>{children}</div>
);
const Ac = ({ tema, children }: { tema: Tema; children: ReactNode }) => <span style={{ color: acento(tema) }}>{children}</span>;
const Texto = ({ tema, top, ancho, children }: { tema: Tema; top: number; ancho: number; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 80, top, width: ancho, fontFamily: 'Jakarta', fontWeight: 500, fontSize: 38, lineHeight: 1.3, color: tinta(tema), opacity: 0.9 }}>{children}</div>
);
const Fichas = ({ tema, top, items }: { tema: Tema; top: number; items: string[] }) => (
  <div style={{ position: 'absolute', left: 80, right: 80, top, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
    {items.map((i) => (
      <div key={i} style={{ padding: '12px 26px', borderRadius: 40, border: `2px solid ${tinta(tema)}`, color: tinta(tema), fontFamily: 'Jakarta', fontWeight: 700, fontSize: 28, opacity: 0.9 }}>{i}</div>
    ))}
  </div>
);
const Burbuja = ({ top, quien, yo, children }: { top: number; quien: string; yo?: boolean; children: ReactNode }) => (
  <div style={{ position: 'absolute', left: 80, top, width: 500, padding: '22px 28px', borderRadius: yo ? '30px 30px 8px 30px' : '30px 30px 30px 8px', background: yo ? MENTA : NEGRO, color: yo ? MORADO : '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
    <div style={{ fontFamily: 'Jakarta', fontWeight: 700, fontSize: 22, opacity: 0.6, marginBottom: 6 }}>{quien}</div>
    <div style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 32, lineHeight: 1.25 }}>{children}</div>
  </div>
);

// teléfono con una captura de la app
const Telefono = ({ src, x, y, alto, rot = 0 }: { src: string; x: number; y: number; alto: number; rot?: number }) => {
  const ancho = alto * (780 / 1688);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: ancho + 28, height: alto + 28, borderRadius: 60, background: '#0d0a18', padding: 14, boxShadow: '0 40px 80px rgba(10,2,30,0.5), inset 0 0 0 2px rgba(255,255,255,0.14)', transform: `rotate(${rot}deg)` }}>
      <div style={{ width: ancho, height: alto, borderRadius: 48, overflow: 'hidden' }}>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
  );
};
// los 8 comercios
const LOGOS = ['fripaps-logo', 'bloom-logo', 'coco-logo', 'cancheritos-logo', 'galera-logo', 'viviana-logo', 'sabor-logo', 'luzdevida-app'];
const Logos = ({ x, y }: { x: number; y: number }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 470, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
    {LOGOS.map((l, i) => (
      <div key={l} style={{ height: 106, borderRadius: 24, overflow: 'hidden', background: '#fff', boxShadow: '0 10px 26px rgba(0,0,0,0.35)', transform: `rotate(${[-3, 2, -1, 3, 2, -2, 3, -1][i]}deg)` }}>
        <Img src={staticFile(`yasi/locales/${l}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    ))}
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

// ---------- el camino de huellas: un solo recorrido a lo largo de todas las láminas ----------
const PASO = 128;
const yCamino = (x: number) => 1272 + 30 * Math.sin(x / 380) + 14 * Math.sin(x / 150 + 1);
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
const COLOR_HUELLA: Record<Tema, string> = { negro: MENTA, blanco: MORADO, morado: MENTA, menta: MORADO, foto: '#ffffff' };
const Camino = ({ n, tema }: { n: number; tema: Tema }) => {
  const x0 = (n - 1) * W;
  return (
    <>
      {HUELLAS.filter((h) => h.x > x0 - 80 && h.x < x0 + W + 80).map((h, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: h.x - x0 - 20,
            top: h.y - 42,
            width: 40,
            height: 84,
            background: COLOR_HUELLA[tema],
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
