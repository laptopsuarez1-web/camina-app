'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart3, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Crosshair, Heart, Home, Map as MapIcon, MapPin, Search, ShoppingBag, Ticket, Users, X } from 'lucide-react';
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
const MARCO = 'relative w-[300px] h-[600px] rounded-[34px] border-[7px] border-[#241748] bg-[#150d2b] overflow-hidden shadow-2xl text-[#f1ecfb] shrink-0 max-sm:w-full max-sm:h-full max-sm:rounded-none max-sm:border-0 max-sm:shadow-none';
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TINTE = `.camina-mapa .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.8) saturate(.4)}@keyframes camina-pin{from{transform:translateY(-18px);opacity:0}to{transform:none;opacity:1}}`;

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
    let ro: ResizeObserver | null = null;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current) return;
      const centro: [number, number] = v.lat != null && v.lng != null ? [v.lat, v.lng] : CENTRO_TARIJA;
      map = L.map(el.current, { zoomControl: false, attributionControl: false, dragging: interactivo, touchZoom: interactivo, scrollWheelZoom: false, doubleClickZoom: interactivo }).setView(centro, zoom);
      L.tileLayer(TILES, { maxZoom: 19 }).addTo(map);
      // Tinte morado del mapa de la app: una capa encima de las calles y debajo del pin.
      const tinte = map.createPane('tinte');
      tinte.style.zIndex = '250';
      tinte.style.pointerEvents = 'none';
      const capa = document.createElement('div');
      capa.style.cssText = 'position:absolute;left:-5000px;top:-5000px;width:10000px;height:10000px;background:rgba(48,14,120,.6)';
      tinte.appendChild(capa);
      if (pin) {
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
      ro = new ResizeObserver(() => map?.invalidateSize());
      ro.observe(el.current);
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
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
      <MapaOscuro v={v} pin interactivo={false} />
      <div className="absolute top-3 left-3 right-0 z-10">
        <div className="flex items-center gap-2 pr-3">
          <span className="w-9 h-9 rounded-full bg-[#fff] text-[#291c47] flex items-center justify-center shrink-0"><X size={16} /></span>
          <div className="flex-1 bg-[#fff] text-[#7c6a9c] rounded-full px-3.5 py-2 text-[12px] flex items-center gap-1.5"><Search size={14} /> Buscar locales y premios</div>
        </div>
        <div className="flex gap-1.5 mt-2 overflow-hidden">
          <span className={chip}>Abierto ahora</span>
          <span className={chip}><Moneda size={15} /> Te alcanza</span>
          <span className={chip}><span className="text-[#62c9a0]">♥</span> Favoritos</span>
        </div>
      </div>
      <div className="absolute bottom-3 left-2.5 right-2.5 z-10 bg-[#2a2142]/95 rounded-[26px] px-3 pt-2 pb-3 border border-[#3a2c63]">
        <span className="absolute -top-14 right-1 w-11 h-11 rounded-full bg-[#fff] text-[#3a2c63] flex items-center justify-center shadow-lg"><Crosshair size={20} /></span>
        <div className="mx-auto mb-2 w-8 h-1 rounded-full bg-[#4a3d6e]" />
        <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#3a2f5c] flex items-center justify-center"><X size={14} /></span>
        <div className="flex items-center gap-3 mb-2.5 pr-8">
          <Logo url={v.logo_url} size={56} />
          <div className="min-w-0">
            <p className="font-extrabold text-[17px] truncate">{v.name}</p>
            <p className="text-[#a99bcf] text-[12px] truncate">{v.category ?? 'Local'}</p>
            {v.address && <p className="text-[#62f0b6] text-[11.5px] truncate flex items-center gap-1"><MapPin size={11} className="shrink-0" /> {v.address}</p>}
            <p className="text-[#a99bcf] text-[11.5px]">Abierto ahora</p>
          </div>
        </div>
        <PremioFila v={v} />
        <div className="mt-2.5 rounded-full bg-[#1f7d68] text-white text-center font-bold text-[14px] py-3">Ver local y premios ›</div>
      </div>
    </div>
  );
}

function BarraInferior() {
  const items = [
    { t: 'Inicio', I: Home },
    { t: 'Actividad', I: BarChart3 },
    { t: 'Comunidad', I: Users },
    { t: 'Eventos', I: CalendarDays },
    { t: 'Premios', I: ShoppingBag },
  ];
  return (
    <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 rounded-[26px] bg-[#2c2150]/95 border border-[#3a2c63] backdrop-blur flex items-center justify-between px-1 py-1">
      {items.map(({ t, I }) => (
        <span key={t} className={`flex-1 flex flex-col items-center gap-0.5 text-[9.5px] font-semibold rounded-[20px] py-1.5 ${t === 'Premios' ? 'bg-[#3d3070] text-[#62f0b6]' : 'text-[#c9bfe6]'}`}>
          <I size={17} strokeWidth={2.2} />
          {t}
        </span>
      ))}
    </div>
  );
}

// Canjes como en la app: arriba el mapa con los Puntos, la campana y tu foto; abajo la lista de locales.
// La lista se desliza hacia abajo como en la app (el local va primero; abajo, otros locales de Tarija sin datos).
function SlideCanjes({ v }: { v: VistaLocal }) {
  return (
    <div className={MARCO}>
      <div className="absolute inset-0 overflow-y-auto overscroll-contain pb-[86px] [scrollbar-width:none]">
        <div className="relative h-[178px] overflow-hidden rounded-b-[28px]">
          <MapaOscuro v={v} pin={false} zoom={14} interactivo={false} />
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
            <span className="bg-[#fff] text-[#291c47] rounded-full pl-1.5 pr-3 py-1 text-[13px] font-extrabold flex items-center gap-1.5">
              <Moneda size={22} /> 142
            </span>
            <span className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#fff] text-[#7c6a9c] flex items-center justify-center"><Bell size={15} /></span>
              <span className="w-8 h-8 rounded-full bg-[#62f0b6] text-[#12281f] flex items-center justify-center text-[13px] font-extrabold">A</span>
            </span>
          </div>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-[#fff] text-[#291c47] rounded-full px-4 py-2 text-[12px] font-bold whitespace-nowrap flex items-center gap-1.5">
            <MapIcon size={14} /> Explorar el mapa
          </span>
        </div>
        <div className="px-3 pt-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-extrabold text-[24px] leading-tight">Premios</p>
              <p className="text-[#a99bcf] text-[12px] mb-2.5">142 Puntos disponibles</p>
            </div>
            <span className="border border-[#3a2c63] rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-[#f1ecfb] mt-1 flex items-center gap-1.5"><Ticket size={14} className="text-[#62f0b6]" /> Mis canjes</span>
          </div>
          <div className="flex gap-1.5 mb-3 overflow-hidden">
            <span className="border border-[#3a2c63] rounded-full w-[34px] flex items-center justify-center shrink-0"><Search size={14} /></span>
            {['Categoría', 'Más cercanos', 'Abierto ahora'].map((t) => (
              <span key={t} className="border border-[#3a2c63] rounded-full px-3 py-1.5 text-[11.5px] font-semibold whitespace-nowrap flex items-center gap-1">{t}{t !== 'Abierto ahora' && <ChevronDown size={13} />}</span>
            ))}
          </div>
          <div className="rounded-3xl overflow-hidden border-2 border-[#62f0b6]/60 bg-[#21173f] shadow-[0_0_0_4px_rgba(98,240,182,0.08)]">
            <div className="h-[128px] bg-[#2c2150] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {v.cover_url ? <img src={v.cover_url} alt="" className="block w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-[#a99bcf] text-[12px]">Sin portada</div>}
            </div>
            <div className="p-3">
              <div className="flex items-start gap-2.5">
                <span className="rounded-[18px] border-2 border-[#3a2c63]"><Logo url={v.logo_url} size={56} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[15px] truncate">{v.name}</p>
                  <p className="text-[#a99bcf] text-[11.5px] truncate">{v.category ?? 'Categoría'}</p>
                  {v.address && <p className="text-[#62f0b6] text-[11px] truncate flex items-center gap-1"><MapPin size={11} className="shrink-0" /> {v.address}</p>}
                  <p className="text-[#62f0b6] text-[11.5px] font-semibold">Disponible ahora · 350 m</p>
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
                  {v.premio.kind === 'descuento' && <span className="ml-0.5 rounded-full bg-[#2a9a80] px-1.5 text-[10.5px] font-extrabold">Desc.</span>}
                </div>
              )}
            </div>
          </div>
          {[0, 1].map((k) => (
            <div key={k} className="mt-3 rounded-3xl overflow-hidden border border-[#3a2c63] bg-[#21173f] opacity-60">
              <div className="h-[96px] bg-[#2c2150]" />
              <div className="p-3 flex items-center gap-2.5">
                <span className="w-[48px] h-[48px] rounded-[14px] bg-[#2c2150] shrink-0" />
                <div className="flex-1">
                  <span className="block h-3 w-28 rounded bg-[#3a2c63]" />
                  <span className="block h-2.5 w-16 rounded bg-[#2f2556] mt-2" />
                </div>
              </div>
            </div>
          ))}
          <p className="text-center text-[#a99bcf] text-[11px] mt-3">Más locales de Tarija</p>
        </div>
      </div>
      <BarraInferior />
    </div>
  );
}

function SlideFicha({ v }: { v: VistaLocal }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(286);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth || 286);
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const negocio = {
    id: 'v', name: v.name, category: v.category ?? 'Categoría', description: v.description, address: v.address, lat: v.lat, lng: v.lng,
    phone: v.phone, instagram: v.instagram, hours_text: v.hours_text, logo_url: v.logo_url, cover_url: v.cover_url, is_virtual: false,
  } as unknown as Business;
  const premios = v.premio
    ? ([{ id: 'p', name: v.premio.name, description: v.premio.description, cost_points: v.premio.cost, image_url: v.premio.image_url, active: true, type: v.premio.kind ?? 'gratis' }] as unknown as Benefit[])
    : [];
  return (
    <div ref={caja} className="w-[300px] h-[600px] overflow-y-auto overscroll-contain rounded-[34px] border-[7px] border-[#241748] shrink-0 shadow-2xl bg-[#150d2b] [scrollbar-width:none] max-sm:w-full max-sm:h-full max-sm:rounded-none max-sm:border-0 max-sm:shadow-none">
      {/* La ficha se arma al ancho de un celular (390) y se ajusta al ancho de la pantalla o del marco, como se ve en la app. */}
      <div style={{ width: 390, zoom: ancho / 390 }}>
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
  { titulo: 'Así apareces en Premios', C: SlideCanjes },
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
