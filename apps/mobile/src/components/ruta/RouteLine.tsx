import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Polyline } from 'react-native-maps';
import Svg, { Polyline as SvgLine } from 'react-native-svg';
import type { LatLng } from '@/hooks/useRuta';

const MINT = '#62F0B6';
const SHINE = '#E9FFF6';
const DRAW_MS = 1400; // igual que la barra de pasos del grupo: se llena rápido al principio y frena al final
const SHINE_MS = 1500;
const SHINE_EVERY = 2800;
const SHINE_LEN = 0.14;

// Distancias acumuladas a lo largo del recorrido (en grados corregidos por la latitud: alcanza para repartir el dibujo).
function measure(path: LatLng[]) {
  const k = Math.cos(((path[0]?.latitude ?? 0) * Math.PI) / 180);
  const acc = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = (path[i].longitude - path[i - 1].longitude) * k;
    const dy = path[i].latitude - path[i - 1].latitude;
    acc.push(acc[i - 1] + Math.hypot(dx, dy));
  }
  return acc;
}

function pointAt(path: LatLng[], acc: number[], d: number): { i: number; p: LatLng } {
  let i = 1;
  while (i < acc.length - 1 && acc[i] < d) i++;
  const seg = acc[i] - acc[i - 1] || 1;
  const t = Math.max(0, Math.min(1, (d - acc[i - 1]) / seg));
  const a = path[i - 1];
  const b = path[i];
  return { i, p: { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t } };
}

// Tramo del recorrido entre dos fracciones (0 = primer local, 1 = último).
export function slicePath(path: LatLng[], acc: number[], from: number, to: number): LatLng[] {
  if (path.length < 2 || to <= from) return [];
  const total = acc[acc.length - 1];
  const a = pointAt(path, acc, from * total);
  const b = pointAt(path, acc, to * total);
  return [a.p, ...path.slice(a.i, b.i), b.p];
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Animación de la línea: se dibuja de un local al otro y después un brillo la recorre cada tanto (como la barra de pasos del grupo).
// Vive en su propio componente: así el resto de la pantalla no se vuelve a dibujar en cada cuadro.
function useLineAnim(path: LatLng[], on: boolean) {
  const key = path.length ? `${path.length}:${path[0].latitude}:${path[path.length - 1].longitude}` : '';
  const [drawn, setDrawn] = useState(0);
  const [shine, setShine] = useState<number | null>(null);
  useEffect(() => {
    if (!on || path.length < 2) return;
    let raf = 0;
    let last = 0;
    let first = true;
    const t0 = Date.now();
    const fps = Platform.OS === 'web' ? 16 : 33; // en el teléfono ~30 cuadros por segundo: el mapa no se traba
    const tick = () => {
      const now = Date.now();
      const el = now - t0;
      if (now - last >= fps || el >= DRAW_MS) {
        last = now;
        if (first) { first = false; setShine(null); }
        if (el < DRAW_MS) {
          setDrawn(easeOut(el / DRAW_MS));
        } else {
          setDrawn(1);
          const s = (el - DRAW_MS - 300) % SHINE_EVERY;
          setShine(el > DRAW_MS + 300 && s < SHINE_MS ? easeInOut(s / SHINE_MS) : null);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, key]);
  // Apagada (o sin recorrido): nada dibujado; al prenderse vuelve a empezar desde el primer local.
  return on ? { drawn, shine } : { drawn: 0, shine: null };
}

// Línea de la ruta sobre el mapa de Google (teléfono).
export function RouteLine({ path, on }: { path: LatLng[]; on: boolean }) {
  const acc = useMemo(() => measure(path), [path]);
  const { drawn, shine } = useLineAnim(path, on);
  const part = drawn >= 1 ? path : slicePath(path, acc, 0, drawn);
  if (part.length < 2) return null;
  const glint = shine != null ? slicePath(path, acc, Math.max(0, shine * (1 + SHINE_LEN) - SHINE_LEN), Math.min(1, shine * (1 + SHINE_LEN))) : [];
  return (
    <>
      <Polyline coordinates={part} strokeColor="rgba(98,240,182,0.22)" strokeWidth={13} lineCap="round" lineJoin="round" zIndex={1} />
      <Polyline coordinates={part} strokeColor={MINT} strokeWidth={5} lineCap="round" lineJoin="round" zIndex={2} />
      {glint.length > 1 ? <Polyline coordinates={glint} strokeColor={SHINE} strokeWidth={5} lineCap="round" lineJoin="round" zIndex={3} /> : null}
    </>
  );
}

// La misma línea en la vista web (SVG sobre las teselas).
export function RouteLineWeb({ path, on, project }: { path: LatLng[]; on: boolean; project: (lat: number, lng: number) => { x: number; y: number } }) {
  const acc = useMemo(() => measure(path), [path]);
  const { drawn, shine } = useLineAnim(path, on);
  const part = drawn >= 1 ? path : slicePath(path, acc, 0, drawn);
  if (part.length < 2) return null;
  const pts = (l: LatLng[]) => l.map((c) => { const q = project(c.latitude, c.longitude); return `${q.x},${q.y}`; }).join(' ');
  const glint = shine != null ? slicePath(path, acc, Math.max(0, shine * (1 + SHINE_LEN) - SHINE_LEN), Math.min(1, shine * (1 + SHINE_LEN))) : [];
  return (
    <Svg style={{ position: 'absolute', inset: 0 } as never} width="100%" height="100%" pointerEvents="none">
      <SvgLine points={pts(part)} fill="none" stroke="rgba(98,240,182,0.22)" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
      <SvgLine points={pts(part)} fill="none" stroke={MINT} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      {glint.length > 1 ? <SvgLine points={pts(glint)} fill="none" stroke={SHINE} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </Svg>
  );
}

// Pines que se tocarían en pantalla: se ponen lado a lado (solo se corre el dibujo, en píxeles). Al acercar el mapa
// la distancia real alcanza y cada pin vuelve a su lugar exacto.
export const PIN_GAP = 54; // ancho de la cabeza del pin (46) + aire
export function sideBySide(pts: { id: string; x: number; y: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  const parent = pts.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (Math.abs(pts[i].x - pts[j].x) < PIN_GAP && Math.abs(pts[i].y - pts[j].y) < 66) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, typeof pts>();
  pts.forEach((p, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), p]));
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
    const mid = sorted.reduce((s, p) => s + p.x, 0) / sorted.length;
    sorted.forEach((p, i) => out.set(p.id, mid + (i - (sorted.length - 1) / 2) * PIN_GAP - p.x));
  }
  return out;
}
