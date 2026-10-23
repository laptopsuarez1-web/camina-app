// Fila de huellas como en la tarjeta de Camina: pie izquierdo arriba y derecho abajo, alternados, apuntando hacia
// adelante, y cada paso un poco más claro que el anterior. Las huellas son las del logo (el derecho con el corazón).
// Solo CSS (animación escalonada), sin JavaScript en el navegador.
type Props = { n?: number; className?: string; flat?: boolean };

const LARGO = 40; // largo de la huella en unidades del viewBox
const PASO = 34; // distancia entre un pie y el siguiente
const LADO = 11; // separación de cada pie respecto de la línea de marcha
const PIES = {
  L: { href: '/web/pie-L-mint.png', w: (LARGO * 134) / 280 },
  R: { href: '/web/pie-R-mint.png', w: (LARGO * 143) / 272 },
};

export default function Trail({ n = 12, className = '' }: Props) {
  const W = n * PASO + LARGO;
  const H = LARGO + LADO * 2 + 8;
  return (
    <svg className={`trail ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: n }, (_, i) => {
        const pie = i % 2 === 0 ? PIES.L : PIES.R;
        const x = LARGO / 2 + i * PASO;
        const y = H / 2 + (i % 2 === 0 ? -LADO : LADO);
        const o = 0.28 + (0.67 * i) / Math.max(1, n - 1);
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(84)`}>
            <image
              href={pie.href}
              width={pie.w}
              height={LARGO}
              x={-pie.w / 2}
              y={-LARGO / 2}
              className="step"
              style={{ ['--i' as string]: i, ['--o' as string]: o.toFixed(2) }}
            />
          </g>
        );
      })}
    </svg>
  );
}
