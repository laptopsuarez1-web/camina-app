'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// La tarjeta de Actividad de la app, hecha para la web: barras de 7 días y curva de 30 días, con la línea
// punteada de la meta y la llama de la racha. Mismos colores, formas y movimientos que en la app
// (apps/mobile: WeekBars, TrendChart, GoalLine, DayStrip). Pasos de ejemplo, no de una persona real.
// Se puede tocar: elegir 7 o 30 días, tocar una barra o pasar el dedo / el mouse sobre la curva.

const META = 8000;
const SEMANA = [
  { d: 'Lun', l: 'Lunes', s: 7240 },
  { d: 'Mar', l: 'Martes', s: 9120 },
  { d: 'Mié', l: 'Miércoles', s: 5480 },
  { d: 'Jue', l: 'Jueves', s: 8650 },
  { d: 'Vie', l: 'Viernes', s: 10310 },
  { d: 'Sáb', l: 'Sábado', s: 8120 },
  { d: 'Hoy', l: 'Hoy', s: 6912 },
];
// 30 días de ejemplo: los últimos 7 son la semana de arriba.
const MES = [
  7100, 7600, 8200, 6900, 7800, 9400, 8800, 7200, 6600, 7900, 8600, 9100, 8300, 7400, 6800, 7700, 8900, 9800, 8700, 7500, 8100, 9200, 8400,
  ...SEMANA.map((x) => x.s),
];
const H = 150; // alto del gráfico
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function Flame({ lit = true }: { lit?: boolean }) {
  return (
    <span className="hm-ac-flame" style={{ opacity: lit ? 1 : 0.45 }}>
      <svg viewBox="0 0 48 48" width="17" height="17" aria-hidden="true">
        <defs>
          <linearGradient id="acf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5CEBC0" />
            <stop offset="1" stopColor="#1F9C7C" />
          </linearGradient>
          <linearGradient id="acg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C6F7A0" />
            <stop offset="1" stopColor="#4DBB6A" />
          </linearGradient>
        </defs>
        <path d="M24 3c1 8 12 13 12 25a12 12 0 0 1-24 0c0-5 2.5-8 5-10 .3 3 1.5 5 3.5 6C19 17 21 9 24 3z" fill="url(#acf)" />
        <path d="M24 25c1.5 3.5 6 5 6 10a6 6 0 0 1-12 0c0-3 1.5-4.5 3-5.5.2 1.5.8 2.2 1.8 2.7C23 30 23 27 24 25z" fill="url(#acg)" />
      </svg>
    </span>
  );
}

// Número que cuenta hasta su valor (como AnimatedNumber de la app).
function useCount(target: number, run: boolean) {
  const [v, setV] = useState(target);
  const from = useRef(0);
  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      const e = 1 - Math.pow(1 - k, 3);
      setV(a + (target - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}

// Curva suave que pasa por cada punto sin inventar picos (misma cuenta que lib/trend-line.ts de la app).
function smooth(p: { x: number; y: number }[]) {
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    const cx = (a.x + b.x) / 2;
    d += ` C${cx},${a.y} ${cx},${b.y} ${b.x},${b.y}`;
  }
  return d;
}

export default function ActividadCard() {
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [range, setRange] = useState<7 | 30>(7);
  const [sel, setSel] = useState(6); // barra marcada (hoy)
  const [scrub, setScrub] = useState<number | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const vals = range === 7 ? SEMANA.map((x) => x.s) : MES;
  const total = vals.reduce((a, b) => a + b, 0);
  const shown = useCount(total, seen);

  // Escala de la curva: de 0 a un poco más que el mejor día o la meta.
  const W = 300;
  const max30 = Math.max(META, ...MES) * 1.1;
  const pts = useMemo(() => MES.map((v, i) => ({ x: (i * W) / (MES.length - 1), y: H - (v / max30) * H })), [max30]);
  const maxBar = Math.max(META * 1.15, ...SEMANA.map((x) => x.s));

  const dia = range === 7 ? SEMANA[sel] : null;
  const scrubDia = range === 30 && scrub != null ? { l: scrub === MES.length - 1 ? 'Hoy' : `Hace ${MES.length - 1 - scrub} días`, s: MES[scrub] } : null;
  const strip = scrubDia ?? (dia ? { l: dia.l, s: dia.s } : { l: 'Hoy', s: MES[MES.length - 1] });
  const met = strip.s >= META;

  const onMove = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const i = Math.round(((clientX - r.left) / r.width) * (MES.length - 1));
    setScrub(Math.max(0, Math.min(MES.length - 1, i)));
  };
  const marca = range === 30 ? pts[scrub ?? MES.length - 1] : null;

  return (
    <div className={`hm-ac${seen ? ' is-seen' : ''}`} ref={root}>
      <div className="hm-ac-head">
        <div className="hm-ac-total">
          {scrubDia ? (
            <>
              <small>{scrubDia.l}</small>
              <b>{fmt(scrubDia.s)}</b>
              <small>pasos</small>
            </>
          ) : (
            <>
              <small>{range === 7 ? 'Esta semana' : 'Últimos 30 días'}</small>
              <b>{fmt(shown)}</b>
              <small>
                pasos · {fmt(total / range)} por día
                {range === 7 ? <span className="hm-ac-trend"> ▲ 8% vs. la anterior</span> : null}
              </small>
            </>
          )}
        </div>
        <div className="hm-ac-seg" role="group" aria-label="Rango del gráfico">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              className={range === r ? 'is-on' : ''}
              onClick={() => {
                setRange(r);
                setScrub(null);
              }}
            >
              {r} días
            </button>
          ))}
        </div>
      </div>

      <div className="hm-ac-chart" style={{ ['--H' as string]: `${H}px` }}>
        <div className="hm-ac-goal" style={{ top: `${H - (META / (range === 7 ? maxBar : max30)) * H}px` }}>
          <Flame />
        </div>
        {range === 7 ? (
          <div className="hm-ac-bars" key="7">
            {SEMANA.map((x, i) => {
              const hit = x.s >= META;
              const today = i === SEMANA.length - 1;
              return (
                <button
                  key={x.d}
                  type="button"
                  className={`hm-ac-bar${hit ? ' is-hit' : ''}${today ? ' is-today' : ''}${sel === i ? ' is-sel' : ''}`}
                  style={{ ['--h' as string]: `${(x.s / maxBar) * H}px`, ['--i' as string]: i }}
                  onClick={() => setSel(i)}
                  aria-label={`${x.l}: ${fmt(x.s)} pasos${hit ? ', meta cumplida' : ''}`}
                >
                  {sel === i ? <em>{fmt(x.s)}</em> : null}
                  <i />
                  <span>{x.d}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="hm-ac-curve" key="30">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              onPointerMove={(e) => onMove(e.clientX, e.currentTarget)}
              onPointerDown={(e) => onMove(e.clientX, e.currentTarget)}
              onPointerLeave={() => setScrub(null)}
              role="img"
              aria-label="Curva de pasos de los últimos 30 días"
            >
              <defs>
                <linearGradient id="acfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#62F0B6" stopOpacity="0.32" />
                  <stop offset="1" stopColor="#62F0B6" stopOpacity="0" />
                </linearGradient>
                <clipPath id="acclip">
                  <rect className="hm-ac-reveal" x="-10" y="-10" width={W + 20} height={H + 20} />
                </clipPath>
              </defs>
              <g clipPath="url(#acclip)">
                <path d={`${smooth(pts)} L${W},${H} L0,${H} Z`} fill="url(#acfill)" />
                <path d={smooth(pts)} fill="none" stroke="#62F0B6" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
              {marca && scrub != null ? <line x1={marca.x} x2={marca.x} y1={0} y2={H} stroke="rgba(255,255,255,.55)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
            </svg>
            {marca ? <span className={`hm-ac-dot${scrub != null ? ' is-big' : ''}`} style={{ left: `${(marca.x / W) * 100}%`, top: `${marca.y}px` }} /> : null}
            <div className="hm-ac-axis">
              <span>Hace 30 días</span>
              <b>Hoy</b>
            </div>
          </div>
        )}
      </div>

      <div className="hm-ac-strip" aria-live="polite">
        <div>
          <small>{strip.l}</small>
          <b>{fmt(strip.s)} pasos</b>
        </div>
        <span className={met ? 'is-met' : ''}>{met ? 'Meta cumplida' : `${strip.l === 'Hoy' ? 'Faltan' : 'Faltaron'} ${fmt(META - strip.s)}`}</span>
      </div>
    </div>
  );
}
