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

function Logo({ url, size }: { url: string | null; size: number }) {
  return (
    <span className="rounded-full border-2 border-[#f2c94c] bg-[#2c2150] overflow-hidden flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <MapPin size={size * 0.45} className="text-[#a99bcf]" />
      )}
    </span>
  );
}

function SlideMapa({ v }: { v: VistaLocal }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | null = null;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current) return;
      const centro: [number, number] = v.lat != null && v.lng != null ? [v.lat, v.lng] : CENTRO_TARIJA;
      map = L.map(el.current, { zoomControl: false, attributionControl: false }).setView(centro, v.lat != null ? 17 : 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      if (v.lat != null && v.lng != null) {
        const foto = v.logo_url ? `<img src="${v.logo_url}" style="width:100%;height:100%;object-fit:cover" />` : '';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:46px;height:46px;border-radius:50%;border:3px solid #fff;background:#8B4FD1;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.45);animation:camina-pin .6s ease-out">${foto}</div><div style="width:0;height:0;margin:-2px auto 0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #fff"></div>`,
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
  }, [v.lat, v.lng, v.logo_url]);

  return (
    <div className={MARCO}>
      <style>{'@keyframes camina-pin{from{transform:translateY(-18px);opacity:0}to{transform:none;opacity:1}}'}</style>
      <div ref={el} className="absolute inset-0 z-0" />
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        <span className="bg-[#2c2150]/95 rounded-full px-3 py-1.5 text-[12px] font-bold">142 Puntos</span>
        <span className="bg-white text-[#291c47] rounded-full px-3 py-1.5 text-[11.5px] font-bold">Explorar el mapa</span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-[#21173f] rounded-2xl p-3 flex items-center gap-3 border border-[#3a2c63]">
        <Logo url={v.logo_url} size={44} />
        <div className="min-w-0">
          <p className="font-bold text-[14px] truncate">{v.name}</p>
          <p className="text-[#a99bcf] text-[11.5px] truncate">{v.category ?? 'Local'}{v.address ? ` · ${v.address}` : ''}</p>
          {v.premio && <p className="text-[#62f0b6] text-[11.5px] font-semibold truncate">{v.premio.name}</p>}
        </div>
      </div>
      {v.lat == null && <p className="absolute top-14 left-3 right-3 z-10 bg-[#3b2a22] text-[#f0c39a] text-[11.5px] rounded-xl px-3 py-2">Falta marcar la ubicación para que aparezca el pin.</p>}
    </div>
  );
}

function SlideCanjes({ v }: { v: VistaLocal }) {
  return (
    <div className={MARCO}>
      <div className="px-4 pt-5">
        <p className="font-extrabold text-[22px]">Canjear</p>
        <p className="text-[#a99bcf] text-[12px] mb-3">142 Puntos disponibles</p>
        <div className="rounded-3xl overflow-hidden border border-[#3a2c63] bg-[#21173f]">
          <div className="h-[130px] bg-[#2c2150]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {v.cover_url ? <img src={v.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-[#a99bcf] text-[12px]">Sin portada</div>}
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2.5">
              <Logo url={v.logo_url} size={42} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[14.5px] truncate">{v.name}</p>
                <p className="text-[#a99bcf] text-[11.5px] truncate">{v.category ?? 'Categoría'}</p>
              </div>
              <Heart size={17} className="text-[#a99bcf] shrink-0" />
              <ChevronRight size={16} className="text-[#a99bcf] shrink-0" />
            </div>
            {v.address && <p className="text-[#a99bcf] text-[11.5px] mt-1.5 truncate">{v.address}</p>}
            <p className="text-[#62f0b6] text-[11.5px] font-semibold mt-0.5">Disponible ahora</p>
            {v.premio && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 bg-[#1f7d68] rounded-full px-3 py-1.5 text-[11.5px] font-bold max-w-full">
                <span>🪙</span><span className="truncate">{v.premio.cost} {v.premio.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 h-[70px] rounded-2xl bg-[#21173f] opacity-60" />
      </div>
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
      <FichaPreview business={negocio} benefits={premios} oscuro enMarco={false} />
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
            <p className="text-[#62f0b6] font-bold text-[14px] mt-2">{p.cost} Puntos</p>
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
