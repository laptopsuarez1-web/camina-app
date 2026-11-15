'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, MapPin, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { Benefit, Business } from '@/lib/supabase';
import { FichaPreview } from '@/components/FichaPreview';

export interface VistaLocal {
  name: string;
  category: string | null;
  description: string | null;
  address: string | null;
  hours_text: string | null;
  instagram: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  lat: number | null;
  lng: number | null;
  premio: { name: string; description: string | null; cost: number; image_url: string | null; kind: 'gratis' | 'descuento' | null } | null;
}

const CENTRO_TARIJA: [number, number] = [-21.5355, -64.7296];
const MARCO = 'relative w-[300px] h-[600px] rounded-[34px] border-[7px] border-[#241748] bg-[#150d2b] overflow-hidden shadow-2xl text-[#f1ecfb] shrink-0';
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TINTE = `.camina-mapa .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.7) sepia(1) hue-rotate(215deg) saturate(3.5) brightness(.75)}@keyframes camina-pin{from{transform:translateY(-18px);opacity:0}to{transform:none;opacity:1}}`;

// Moneda de Puntos de la app (las huellas en el círculo verde).
export function Moneda({ size = 18 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/partners/coin.png" alt="" width={size} height={size} className="rounded-full shrink-0" style={{ width: size, height: size }} />;
}

// Logo del local: cuadrado con las esquinas redondeadas, igual que en la app.
function Logo({ url, size }: { url: string | null; size: number }) {
  return (
    <span className="bg-[#2c2150] overflow-hidden flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: size * 0.28 }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <MapPin size={size * 0.45} className="text-[#a99bcf]" />
      )}
    </span>
  );
}

// Mapa oscuro morado como el de la app. Con `pin` pone el logo del local como pin (cuadrado con punta).
function MapaOscuro({ v, pin, zoom = 17, interactivo = true }: { v: VistaLocal; pin: boolean; zoom?: number; interactivo?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | null = null;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current) return;
      const centro: [number, number] = v.lat != null && v.lng != null ? [v.lat, v.lng] : CENTRO_TARIJA;
      map = L.map(el.current, { zoomControl: false, attributionControl: false, dragging: interactivo, touchZoom: interactivo, scrollWheelZoom: false, doubleClickZoom: interactivo }).setView(centro, v.lat != null ? zoom : 14);
      L.tileLayer(TILES, { maxZoom: 19 }).addTo(map);
      // Tinte morado del mapa de la app: una capa encima de las calles y debajo del pin.
      const tinte = map.createPane('tinte');
      tinte.style.zIndex = '250';
      tinte.style.mixBlendMode = 'color';
      tinte.style.pointerEvents = 'none';
      L.rectangle([[-89, -179], [89, 179]], { pane: 'tinte', stroke: false, fillColor: '#6a3fd0', fillOpacity: 0.9, interactive: false }).addTo(map);
      if (pin && v.lat != null && v.lng != null) {
        const foto = v.logo_url ? `<img src="${v.logo_url}" style="width:100%;height:100%;object-fit:cover" />` : '';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:46px;height:46px;border-radius:13px;border:3px solid #fff;background:#2c2150;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.5);animation:camina-pin .6s ease-out">${foto}</div><div style="width:0;height:0;margin:-1px auto 0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid #fff"></div>`,
          iconSize: [46, 60],
          iconAnchor: [23, 58],
        });
        L.marker(centro, { icon }).addTo(map);
      }
      setTimeout(() => map?.invalidateSize(), 150);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [v.lat, v.lng, v.logo_url, pin, zoom, interactivo]);
  return (
    <>
      <style>{TINTE}</style>
      <div ref={el} className="camina-mapa absolute inset-0 z-0 bg-[#1c1030]" />
    </>
  );
}

function PremioFila({ v }: { v: VistaLocal }) {
  if (!v.premio) return null;
  return (
    <div className="flex items-center gap-2.5 bg-[#213a33] rounded-2xl px-2 py-2">
      <span className="w-[40px] h-[40px] rounded-xl bg-[#2c2150] overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {v.premio.image_url && <img src={v.premio.image_url} alt="" className="w-full h-full object-cover" />}
      </span>
      <span className="font-bold text-[13px] flex-1 min-w-0 leading-tight">{v.premio.name}</span>
      <span className="flex items-center gap-1.5 font-extrabold text-[14px] shrink-0 pr-1">
        <Moneda size={20} />
        {v.premio.cost}
      </span>
    </div>
  );
}

function SlideMapa({ v }: { v: VistaLocal }) {
  const chip = 'bg-[#fff] text-[#291c47] rounded-full px-3 py-1.5 text-[11.5px] font-bold whitespace-nowrap flex items-center gap-1';
  return (
    <div className={MARCO}>
      <MapaOscuro v={v} pin />
      <div className="absolute top-3 left-3 right-0 z-10">
        <div className="flex items-center gap-2 pr-3">
          <span className="w-9 h-9 rounded-full bg-[#fff] text-[#291c47] flex items-center justify-center shrink-0"><X size={16} /></span>
          <div className="flex-1 bg-[#fff] text-[#7c6a9c] rounded-full px-3.5 py-2 text-[12px]">🔍 Buscar locales y premios</div>
        </div>
        <div className="flex gap-1.5 mt-2 overflow-hidden">
          <span className={chip}>Abierto ahora</span>
          <span className={chip}><Moneda size={15} /> Te alcanza</span>
          <span className={chip}><span className="text-[#62c9a0]">♥</span> Favoritos</span>
        </div>
      </div>
      <div className="absolute bottom-3 left-2.5 right-2.5 z-10 bg-[#2a2142]/95 rounded-[26px] px-3 pt-2 pb-3 border border-[#3a2c63]">
        <div className="mx-auto mb-2 w-8 h-1 rounded-full bg-[#4a3d6e]" />
        <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#3a2f5c] flex items-center justify-center"><X size={14} /></span>
        <div className="flex items-center gap-3 mb-2.5 pr-8">
          <Logo url={v.logo_url} size={56} />
          <div className="min-w-0">
            <p className="font-extrabold text-[17px] truncate">{v.name}</p>
            <p className="text-[#a99bcf] text-[12px] truncate">{v.category ?? 'Local'}</p>
            {v.address && <p className="text-[#62f0b6] text-[11.5px] truncate">📍 {v.address}</p>}
            <p className="text-[#a99bcf] text-[11.5px]">Abierto ahora</p>
          </div>
        </div>
        <PremioFila v={v} />
        <div className="mt-2.5 rounded-full bg-[#1f7d68] text-white text-center font-bold text-[14px] py-3">Ver local y premios ›</div>
      </div>
      {v.lat == null && <p className="absolute top-28 left-3 right-3 z-10 bg-[#3b2a22] text-[#f0c39a] text-[11.5px] rounded-xl px-3 py-2">Falta marcar la ubicación para que aparezca el pin.</p>}
    </div>
  );
}

function BarraInferior() {
  const items = ['Inicio', 'Actividad', 'Comunidad', 'Eventos', 'Canjes'];
  return (
    <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 rounded-full bg-[#2c2150]/90 border border-[#3a2c63] backdrop-blur flex items-center justify-between px-1.5 py-1.5">
      {items.map((t) => (
        <span key={t} className={`text-[9.5px] font-semibold rounded-full px-2 py-2 ${t === 'Canjes' ? 'bg-[#3d3070] text-[#62f0b6]' : 'text-[#a99bcf]'}`}>{t}</span>
      ))}
    </div>
  );
}

function SlideCanjes({ v }: { v: VistaLocal }) {
  return (
    <div className={MARCO}>
      <div className="relative h-[170px] overflow-hidden rounded-b-[28px]">
        <MapaOscuro v={v} pin={false} zoom={14} interactivo={false} />
        <span className="absolute top-3 left-3 z-10 bg-[#fff] text-[#291c47] rounded-full pl-1.5 pr-3 py-1 text-[13px] font-extrabold flex items-center gap-1.5">
          <Moneda size={22} /> 142
        </span>
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-[#fff] text-[#291c47] rounded-full px-4 py-2 text-[12px] font-bold whitespace-nowrap">Explorar el mapa</span>
      </div>
      <div className="px-3 pt-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-extrabold text-[24px] leading-tight">Canjes</p>
            <p className="text-[#a99bcf] text-[12px] mb-2.5">142 Puntos disponibles</p>
          </div>
          <span className="border border-[#3a2c63] rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-[#f1ecfb] mt-1">🎟 Mis canjes</span>
        </div>
        <div className="flex gap-1.5 mb-3 overflow-hidden">
          {['🔍', 'Categoría ⌄', 'Más cercanos ⌄', 'Abierto ahora'].map((t) => (
            <span key={t} className="border border-[#3a2c63] rounded-full px-3 py-1.5 text-[11.5px] font-semibold whitespace-nowrap">{t}</span>
          ))}
        </div>
        <div className="rounded-3xl overflow-hidden border border-[#3a2c63] bg-[#21173f]">
          <div className="h-[112px] bg-[#2c2150] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {v.cover_url ? <img src={v.cover_url} alt="" className="block w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-[#a99bcf] text-[12px]">Sin portada</div>}
          </div>
          <div className="p-3">
            <div className="flex items-start gap-2.5">
              <Logo url={v.logo_url} size={54} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[15px] truncate">{v.name}</p>
                <p className="text-[#a99bcf] text-[11.5px] truncate">{v.category ?? 'Categoría'}</p>
                {v.address && <p className="text-[#62f0b6] text-[11px] truncate">📍 {v.address}</p>}
                <p className="text-[#62f0b6] text-[11.5px] font-semibold">Disponible ahora</p>
              </div>
              <div className="flex flex-col items-center gap-2 text-[#a99bcf] shrink-0">
                <Heart size={17} />
                <ChevronRight size={17} />
              </div>
            </div>
            {v.premio && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 bg-[#1f7d68] rounded-full pl-1 pr-3 py-1 text-[12px] max-w-full">
                <Moneda size={20} />
                <span className="font-extrabold">{v.premio.cost}</span>
                <span className="font-semibold truncate">{v.premio.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <BarraInferior />
    </div>
  );
}

function SlideFicha({ v }: { v: VistaLocal }) {
  const negocio = {
    id: 'v', name: v.name, category: v.category ?? 'Categoría', description: v.description, address: v.address, lat: v.lat, lng: v.lng,
    phone: v.phone, instagram: v.instagram, hours_text: v.hours_text, logo_url: v.logo_url, cover_url: v.cover_url, is_virtual: false,
  } as unknown as Business;
  const premios = v.premio
    ? ([{ id: 'p', name: v.premio.name, description: v.premio.description, cost_points: v.premio.cost, image_url: v.premio.image_url, active: true, type: v.premio.kind ?? 'gratis' }] as unknown as Benefit[])
    : [];
  return (
    <div className="w-[300px] h-[600px] overflow-y-auto overscroll-contain rounded-[34px] border-[7px] border-[#241748] shrink-0 shadow-2xl bg-[#150d2b]">
      {/* La ficha se arma al ancho de un celular (390) y se achica para entrar en el marco, como se ve en la app. */}
      <div style={{ width: 390, zoom: 286 / 390 }}>
        <FichaPreview business={negocio} benefits={premios} oscuro enMarco={false} />
      </div>
    </div>
  );
}

function SlidePremio({ v }: { v: VistaLocal }) {
  const p = v.premio;
  return (
    <div className={MARCO}>
      <div className="h-[230px] bg-[#2c2150]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p?.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-[#a99bcf] text-[12px]">Sin foto del premio</div>}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Logo url={v.logo_url} size={28} />
          <p className="text-[#a99bcf] text-[12px] truncate">{v.name}</p>
        </div>
        {p ? (
          <>
            <p className="font-extrabold text-[19px] leading-tight">{p.name}</p>
            <p className="text-[#a99bcf] text-[12.5px] mt-1">{p.description || (p.kind === 'descuento' ? 'Descuento' : 'Premio gratis')}</p>
            <p className="font-extrabold text-[15px] mt-2 flex items-center gap-1.5"><Moneda size={22} />{p.cost}</p>
            <div className="mt-4 bg-[#1f7d68] rounded-xl py-3 text-center font-bold text-[14px]">Canjear</div>
            <p className="text-[#a99bcf] text-[11.5px] mt-3 text-center">Al canjear, la persona escribe el código de tu local estando ahí.</p>
          </>
        ) : (
          <p className="text-[#f0c39a] text-[12.5px]">Falta cargar el premio.</p>
        )}
      </div>
    </div>
  );
}

const SLIDES = [
  { titulo: 'Así te encuentran en el mapa', C: SlideMapa },
  { titulo: 'Así apareces en Canjes', C: SlideCanjes },
  { titulo: 'Así se ve tu local', C: SlideFicha },
  { titulo: 'Así se ve tu premio', C: SlidePremio },
];

// Pantalla completa para mostrarle al dueño cómo quedaría su local en la app: se desliza entre el mapa con su pin,
// la lista de Canjes, su ficha y su premio.
export function PresentarLocal({ vista, onClose }: { vista: VistaLocal; onClose: () => void }) {
  const [i, setI] = useState(0);
  const caja = useRef<HTMLDivElement>(null);

  function ir(n: number) {
    const k = Math.max(0, Math.min(SLIDES.length - 1, n));
    const el = caja.current;
    if (el) el.scrollTo({ left: k * el.clientWidth, behavior: 'smooth' });
    setI(k);
  }

  useEffect(() => {
    const t = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') ir(i + 1);
      if (e.key === 'ArrowLeft') ir(i - 1);
    };
    window.addEventListener('keydown', t);
    return () => window.removeEventListener('keydown', t);
  });

  return (
    <div className="fixed inset-0 z-[60] bg-[#0d0820] flex flex-col" role="dialog" aria-label="Así quedaría tu local">
      <div className="flex items-center justify-between px-4 h-14 shrink-0">
        <p className="text-white font-bold text-[15px]">{SLIDES[i].titulo}</p>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"><X size={20} /></button>
      </div>
      <div className="relative flex-1 min-h-0">
        <div
          ref={caja}
          className="h-full flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none]"
          onScroll={(e) => {
            const el = e.currentTarget;
            setI(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {SLIDES.map(({ titulo, C }) => (
            <div key={titulo} className="snap-center shrink-0 w-full h-full flex items-center justify-center">
              <C v={vista} />
            </div>
          ))}
        </div>
        {i > 0 && (
          <button type="button" onClick={() => ir(i - 1)} aria-label="Anterior" className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white items-center justify-center"><ChevronLeft size={22} /></button>
        )}
        {i < SLIDES.length - 1 && (
          <button type="button" onClick={() => ir(i + 1)} aria-label="Siguiente" className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white items-center justify-center"><ChevronRight size={22} /></button>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-center gap-2 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-2">
          {SLIDES.map((s, k) => (
            <button key={s.titulo} type="button" aria-label={s.titulo} onClick={() => ir(k)} className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-[#62f0b6]' : 'w-2 bg-white/35'}`} />
          ))}
        </div>
        <p className="text-white/60 text-[12px]">Desliza para ver más</p>
      </div>
    </div>
  );
}
