// Camino de huellas que se repite: pie izquierdo y derecho alternados, apuntando hacia donde se camina,
// siguiendo una curva suave. Solo CSS (animación escalonada), sin JavaScript en el navegador.
type Props = { n?: number; className?: string };

export default function Trail({ n = 12, className = '' }: Props) {
  // curva: x avanza de 0 a 100, y ondula; viewBox 1000 x 400
  const pts: { x: number; y: number; ang: number; der: boolean }[] = [];
  const f = (t: number) => ({ x: 60 + t * 880, y: 300 - t * 170 + Math.sin(t * Math.PI * 1.5) * 38 });
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = f(t);
    const b = f(Math.min(1, t + 0.01));
    const c = f(Math.max(0, t - 0.01));
    const dx = b.x - c.x;
    const dy = b.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const der = i % 2 === 1;
    const off = der ? 17 : -17;
    pts.push({
      x: a.x + (-dy / len) * off,
      y: a.y + (dx / len) * off,
      ang: (Math.atan2(dy, dx) * 180) / Math.PI + 90,
      der,
    });
  }
  return (
    <svg className={`trail ${className}`} viewBox="0 0 1000 400" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {pts.map((p, i) => (
        <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.ang.toFixed(1)})${p.der ? ' scale(-1 1)' : ''}`}>
          <image
            href="/web/camina-foot.png"
            width={24}
            height={44}
            x={-12}
            y={-22}
            className="step"
            style={{ ['--i' as string]: i }}
          />
        </g>
      ))}
    </svg>
  );
}
