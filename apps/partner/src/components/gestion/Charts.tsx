'use client';

import { useState } from 'react';

// Gráfico de barras liviano (SVG): una serie, con valor al pasar el dedo o el mouse.
export function BarChart({
  data,
  format = (v) => String(v),
  height = 160,
  tone = 'a',
  label,
}: {
  data: { label: string; value: number; sub?: string }[];
  format?: (v: number) => string;
  height?: number;
  tone?: 'a' | 'b';
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const W = 600;
  const gap = n > 20 ? 2 : 6;
  const bw = (W - gap * (n - 1)) / n;
  const step = n > 16 ? Math.ceil(n / 8) : 1;
  const active = hover ?? null;
  return (
    <figure className="m-0">
      <div className="flex items-baseline justify-between gap-2 h-6 mb-1">
        <figcaption className="sr-only">{label}</figcaption>
        <span className="text-[12px] text-muted truncate">{active != null ? data[active].sub ?? data[active].label : ''}</span>
        <span className="text-[13px] font-bold tabular-nums">{active != null ? format(data[active].value) : ''}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${height + 18}`}
        className={`w-full h-auto ${tone === 'a' ? 'gx-chart-a' : 'gx-chart-b'}`}
        role="img"
        aria-label={label}
        onMouseLeave={() => setHover(null)}
      >
        {[0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={height - height * f} y2={height - height * f} className="gx-chart-grid" strokeDasharray="3 4" strokeWidth={1} />
        ))}
        <line x1={0} x2={W} y1={height} y2={height} className="gx-chart-grid" strokeWidth={1} />
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(3, (d.value / max) * (height - 8)) : 0;
          const x = i * (bw + gap);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={x} y={0} width={bw + gap} height={height} fill="transparent" />
              <rect
                x={x}
                y={height - h}
                width={bw}
                height={h}
                rx={Math.min(4, bw / 2)}
                fill="currentColor"
                opacity={hover == null || hover === i ? 1 : 0.45}
              />
              {i % step === 0 && (
                <text x={x + bw / 2} y={height + 14} textAnchor="middle" fontSize={11} fill="var(--c-muted)">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.sub ?? d.label}</td>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// Barras horizontales para rankings (servicios, métodos de pago).
export function HBars({ items, format = (v) => String(v) }: { items: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between gap-3 text-[12.5px] mb-1">
            <span className="truncate">{i.label}</span>
            <span className="font-semibold tabular-nums">{format(i.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-purple-light overflow-hidden">
            <div className="h-full rounded-full gx-chart-a" style={{ width: `${(i.value / max) * 100}%`, background: 'currentColor' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
