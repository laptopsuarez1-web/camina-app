import { staticFile } from 'remotion';
import { fmt } from './marca';

// Pantalla Inicio de la versión actual de la app (captura real limpia: inicio-app.jpg) con los pasos, los aros,
// el saldo y la racha dibujados encima, para que el contador suba en vivo. Datos de ejemplo (Valentina), no reales.
// Coordenadas de la captura original: 1179 × 2556 (las mismas que usa la portada de caminaapp.com).
const CX = 591;
const CY = 840;
const META = 5000;

const arco = (r: number, k: number) => {
  const a = k * 2 * Math.PI;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
};

export const InicioVivo = ({ pasos, saldo, pop = 0 }: { pasos: number; saldo: number; pop?: number }) => {
  const puntos = Math.floor(pasos / 1000);
  const prog = (pasos % 1000) / 1000;
  const punto = arco(240, prog);
  const escalaChip = 1 + 0.25 * pop;
  return (
    <svg viewBox="0 0 1179 2556" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <image href={staticFile('app/inicio-app.jpg')} x={0} y={0} width={1179} height={2556} preserveAspectRatio="xMidYMin slice" />
      <g fill="none" strokeLinecap="round">
        <circle cx={CX} cy={CY} r={324} stroke="#312943" strokeWidth={78} />
        <circle cx={CX} cy={CY} r={324} stroke="#8aedba" strokeWidth={78} pathLength={100} strokeDasharray={`${Math.min(100, (pasos / META) * 100)} 100`} transform={`rotate(-90 ${CX} ${CY})`} />
        <circle cx={CX} cy={CY} r={240} stroke="#352d46" strokeWidth={20} />
        <circle cx={CX} cy={CY} r={240} stroke="#7bfbb4" strokeWidth={20} pathLength={100} strokeDasharray={`${prog * 100} 100`} transform={`rotate(-90 ${CX} ${CY})`} style={{ filter: 'drop-shadow(0 0 14px rgba(123,251,180,0.55))' }} />
      </g>
      <circle cx={punto.x} cy={punto.y} r={34} fill="rgba(123,251,180,0.32)" />
      <circle cx={punto.x} cy={punto.y} r={14} fill="#fff" />
      {/* Saldo de Puntos */}
      <rect x={51} y={221} width={230} height={94} rx={47} fill="#40335e" />
      <image href={staticFile('app/camina-coin.png')} x={68} y={241} width={54} height={54} />
      <text x={138} y={286} fontFamily="Jakarta" fontWeight={500} fontSize={41} fill="#fff">
        {fmt(saldo)}
      </text>
      {/* Foto de perfil (inicial de ejemplo) */}
      <circle cx={1086} cy={269} r={45} fill="#62f0b6" />
      <text x={1086} y={284} textAnchor="middle" fontFamily="Jakarta" fontWeight={800} fontSize={42} fill="#12281f">
        V
      </text>
      <text x={52} y={404} fontFamily="Jakarta" fontWeight={700} fontSize={50} fill="#c2b8e4">
        Buen día, Valentina
      </text>
      {/* Pasos de hoy */}
      <text x={CX} y={805} textAnchor="middle" fontFamily="Jakarta" fontWeight={700} fontSize={142} letterSpacing={-4} fill="#fff">
        {fmt(pasos)}
      </text>
      <text x={CX} y={888} textAnchor="middle" fontFamily="Jakarta" fontWeight={500} fontSize={40} fill="#c2b8e4">
        pasos hoy
      </text>
      <g transform={`translate(${CX} 957) scale(${escalaChip}) translate(${-CX} -957)`}>
        <rect x={CX - 118} y={921} width={236} height={72} rx={36} fill={pop > 0 ? `rgba(98,240,182,${0.14 + 0.3 * pop})` : '#20313c'} />
        <image href={staticFile('app/camina-coin.png')} x={CX - 104} y={934} width={46} height={46} />
        <text x={CX - 48} y={970} fontFamily="Jakarta" fontWeight={700} fontSize={37} fill="#7bf5bf">
          +{puntos} {puntos === 1 ? 'Punto' : 'Puntos'}
        </text>
      </g>
      {/* Racha y meta */}
      <text x={355} y={1328} textAnchor="middle" fontFamily="Jakarta" fontWeight={800} fontSize={57} fill="#fff">
        12
      </text>
      <path d="M302 1284c1 8 12 13 12 25a12 12 0 0 1-24 0c0-5 2.5-8 5-10 .3 3 1.5 5 3.5 6C297 1298 299 1290 302 1284z" fill="#3fbf95" transform="translate(-6 0) scale(1)" />
      <text x={337} y={1388} textAnchor="middle" fontFamily="Jakarta" fontWeight={500} fontSize={38} fill="#c8bdec">
        días de racha
      </text>
    </svg>
  );
};
