import type { ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { IconoApple, IconoPlay } from './Lanzamiento';
import { ARCO, Base, LILA, MENTA, MORADO } from './Piezas';
import './marca';

// CAMINA · Piezas de campaña (1080 × 1350) con el estilo del círculo.
// Cuenta regresiva: el anillo se va llenando (7 días, 3 días, ya llegó).
// Datos de salud: cada dato con su fuente real y un cierre que lleva a la app.
// Exportar: npx remotion still Regresiva-7 out/campana/regresiva-7.png (Regresiva-3, Regresiva-hoy, Salud-oms,
// Salud-pasos, Salud-comer).

const Tienda = ({ icono, nombre, arriba }: { icono: ReactNode; nombre: string; arriba: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px 14px 22px', borderRadius: 24, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.32)' }}>
    {icono}
    <div style={{ display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>{arriba}</span>
      <span style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 34, lineHeight: 1.1 }}>{nombre}</span>
    </div>
  </div>
);
const Tiendas = ({ y, arriba = 'Muy pronto en' }: { y: number; arriba?: string }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', gap: 18 }}>
    <Tienda icono={<IconoApple />} nombre="App Store" arriba={arriba} />
    <Tienda icono={<IconoPlay />} nombre="Google Play" arriba={arriba} />
  </div>
);
const LINEA = 'La app que convierte tus pasos en premios y descuentos';

// ---------- cuenta regresiva ----------
const Faltan = ({ dias, llenado }: { dias: number; llenado: number }) => (
  <Base etiqueta="Cuenta regresiva" linea={LINEA} titulo="Camina llega" acento="en" llenado={llenado}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 120, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 22 }}>
      <span style={{ fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 230, lineHeight: 1, color: MENTA, textShadow: '0 0 60px rgba(98,240,182,0.45)' }}>{dias}</span>
      <span style={{ fontFamily: 'Mona', fontWeight: 900, fontStretch: '125%', fontSize: 70, textTransform: 'uppercase', color: '#fff' }}>días</span>
    </div>
    <Tiendas y={ARCO + 400} />
  </Base>
);
export const Regresiva7 = () => <Faltan dias={7} llenado={0.3} />;
export const Regresiva3 = () => <Faltan dias={3} llenado={0.7} />;
export const RegresivaHoy = () => (
  <Base etiqueta="Lanzamiento" linea={LINEA} titulo="Camina" acento="ya llegó" llenado={1} tam={110}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 190, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, filter: 'drop-shadow(0 0 30px rgba(98,240,182,0.5))' }}>
      <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 100, height: 100 }} />
      <Img src={staticFile('marca/nombre-camina-transparente.png')} style={{ height: 68, filter: 'brightness(0) invert(1)' }} />
    </div>
    <Tiendas y={ARCO + 370} arriba="Descárgala en" />
  </Base>
);

// ---------- datos de salud ----------
const Dato = ({ linea, titulo, acento, tam, cifra, sub, fuente, children }: { linea: string; titulo: string; acento: string; tam?: number; cifra?: string; sub?: string; fuente: string; children?: ReactNode }) => (
  <Base etiqueta="Dato de salud" linea={linea} titulo={titulo} acento={acento} tam={tam}>
    {cifra && <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 150, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 800, fontSize: 104, lineHeight: 1, color: '#fff' }}>{cifra}</div>}
    {sub && <div style={{ position: 'absolute', left: 120, right: 120, top: ARCO + 265, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 32, lineHeight: 1.3, color: LILA }}>{sub}</div>}
    {children}
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 395, display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 30px 14px 16px', borderRadius: 50, background: MENTA, color: MORADO, fontFamily: 'Jakarta', fontWeight: 800, fontSize: 30, boxShadow: '0 0 40px rgba(98,240,182,0.35)' }}>
        <Img src={staticFile('marca/logo-solo-transparente.png')} style={{ width: 44, height: 44, filter: 'brightness(0.25) saturate(2) hue-rotate(200deg)' }} />
        Camina cuenta tus pasos y te los premia
      </div>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: ARCO + 470, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 600, fontSize: 26, color: 'rgba(239,232,255,0.75)' }}>Muy pronto en App Store y Google Play</div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1312, textAlign: 'center', fontFamily: 'Jakarta', fontWeight: 500, fontSize: 20, color: 'rgba(239,232,255,0.45)' }}>{fuente}</div>
  </Base>
);

export const SaludOms = () => (
  <Dato
    linea="La OMS recomienda al menos 150 minutos de actividad moderada por semana. Caminar a buen ritmo cuenta"
    titulo="30 minutos,"
    acento="5 días"
    tam={90}
    cifra="150 minutos"
    sub="por semana es lo que recomienda la OMS para adultos"
    fuente="Fuente: OMS, Directrices sobre actividad física y hábitos sedentarios (2020)"
  />
);

export const SaludPasos = () => (
  <Dato
    linea="Más pasos al día se asocian con menos riesgo de muerte prematura, hasta un punto que depende de tu edad"
    titulo="¿Cuántos pasos"
    acento="al día?"
    tam={78}
    fuente="Fuente: Paluch y otros, The Lancet Public Health (2022)"
  >
    <div style={{ position: 'absolute', left: 110, right: 110, top: ARCO + 150, display: 'flex', justifyContent: 'center', gap: 30 }}>
      {[
        ['Menos de 60 años', '8.000 a 10.000'],
        ['60 años o más', '6.000 a 8.000'],
      ].map(([edad, pasos]) => (
        <div key={edad} style={{ flex: 1, padding: '24px 20px', borderRadius: 30, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 2px rgba(98,240,182,0.35)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Jakarta', fontWeight: 600, fontSize: 26, color: LILA }}>{edad}</div>
          <div style={{ fontFamily: 'Jakarta', fontWeight: 800, fontSize: 44, color: '#fff', marginTop: 6 }}>{pasos}</div>
          <div style={{ fontFamily: 'Jakarta', fontWeight: 500, fontSize: 24, color: LILA }}>pasos al día</div>
        </div>
      ))}
    </div>
  </Dato>
);

export const SaludComer = () => (
  <Dato
    linea="Una caminata corta y suave después de comer ayuda a bajar el azúcar en sangre"
    titulo="Camina después"
    acento="de comer"
    tam={74}
    cifra="2 a 5 minutos"
    sub="de caminata suave después de comer ya ayudan"
    fuente="Fuente: Buffey y otros, Sports Medicine (2022)"
  />
);
