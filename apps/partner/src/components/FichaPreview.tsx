'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapPin, Clock, X, Globe, MessageCircle, AtSign, Heart, Gift } from 'lucide-react';
import { supabase, type Benefit, type Business } from '@/lib/supabase';

const OSCURO = {
  '--c-bg': '#150d2b', '--c-card': '#21173f', '--c-line': '#3a2c63', '--c-muted': '#a99bcf', '--c-text': '#f1ecfb',
  '--c-aqua-light': '#16352f', '--c-purple-light': '#2c2150',
} as React.CSSProperties;

// Mapa "Cómo llegar" de la ficha: se puede mover y acercar, con el logo del local como pin.
function MapaLlegar({ lat, lng, logo }: { lat: number; lng: number; logo: string | null }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | null = null;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current) return;
      map = L.map(el.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false }).setView([lat, lng], 17);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      const foto = logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:cover" />` : '';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:42px;height:42px;border-radius:50%;border:3px solid #fff;background:#8B4FD1;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.45)">${foto}</div><div style="width:0;height:0;margin:-2px auto 0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #fff"></div>`,
        iconSize: [42, 56],
        iconAnchor: [21, 54],
      });
      L.marker([lat, lng], { icon }).addTo(map);
      setTimeout(() => map?.invalidateSize(), 150);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, logo]);
  return <div ref={el} className="h-[170px] rounded-[22px] overflow-hidden bg-[#1d1b2e]" />;
}

// Vista previa de la ficha del local igual que en la última versión de la app (portada, logo, datos, contacto,
// premios con botón Canjear y mapa "Cómo llegar"). La usa el dueño, el admin antes de aprobar y el partner al mostrarla.
// Se desliza como en la app. Con `oscuro` se ve siempre en modo oscuro.
export function FichaPreview({ business, benefits, oscuro, enMarco = true }: { business: Business; benefits: Benefit[]; oscuro?: boolean; enMarco?: boolean }) {
  const activos = benefits.filter((b) => b.active);
  const chip = 'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold border border-line bg-card';
  const premios = (['gratis', 'descuento'] as const).map((t) => ({
    t,
    list: activos.filter((b) => (b.type ?? 'gratis') === t),
  }));
  return (
    <div
      style={oscuro ? OSCURO : undefined}
      className={`w-full bg-bg text-text ${enMarco ? 'max-w-[360px] mx-auto rounded-[28px] border-[6px] border-[#241748] overflow-hidden shadow-xl' : ''}`}
    >
      <div className="relative h-[232px] bg-[#241748]">
        {business.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#a99bcf] text-[12px]">Sin foto de portada</div>
        )}
        <span className="absolute top-5 left-4 w-10 h-10 rounded-full bg-card flex items-center justify-center text-text">
          <X size={18} />
        </span>
      </div>
      <div className="px-5 pb-8" style={{ marginTop: -36 }}>
        <div className="relative w-[84px] h-[84px] rounded-full border-[3px] border-[#f2c94c] bg-card overflow-hidden flex items-center justify-center">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-muted text-center leading-tight">Sin logo</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-[24px] font-extrabold leading-tight tracking-tight">{business.name}</p>
          <span className="w-10 h-10 rounded-full border border-line bg-card flex items-center justify-center shrink-0 text-muted">
            <Heart size={19} />
          </span>
        </div>
        <p className="text-muted text-[13px]">{business.category}</p>
        {business.description ? (
          <p className="text-[14px] text-muted leading-5 mt-3">{business.description}</p>
        ) : (
          <p className="text-[12.5px] text-warn mt-3">Falta la descripción del local.</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          {business.address && (
            <span className={`${chip} !bg-aqua-light !border-transparent text-[#2E9E7C]`}>
              <MapPin size={14} /> {business.address}
            </span>
          )}
          {business.hours_text && (
            <span className={chip}>
              <Clock size={14} /> {business.hours_text}
            </span>
          )}
          {business.instagram && (
            <span className={chip}>
              <AtSign size={14} /> Instagram
            </span>
          )}
          {business.facebook && <span className={chip}>Facebook</span>}
          {business.tiktok && <span className={chip}>TikTok</span>}
          {business.phone && business.phone.replace(/\D/g, '').length >= 7 && (
            <span className={chip}>
              <MessageCircle size={14} /> WhatsApp
            </span>
          )}
          {business.website && (
            <span className={chip}>
              <Globe size={14} /> Sitio web
            </span>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2.5 rounded-2xl px-3.5 py-3 bg-aqua-light">
          <span className="text-[20px]">🎁</span>
          <div>
            <p className="text-[#2E9E7C] font-extrabold text-[13.5px]">Primera vez aquí: +Puntos</p>
            <p className="text-muted text-[12px] mt-0.5">Se suman cuando el local confirme tu primer canje.</p>
          </div>
        </div>

        {activos.length === 0 && (
          <p className="text-[14px] leading-5 text-muted mt-7">Este local todavía no tiene premios para canjear. Cuando los cargue, los vas a ver aquí.</p>
        )}
        {premios.map(({ t, list }) =>
          list.length === 0 ? null : (
            <div key={t} className="mt-7">
              <p className="text-[17px] font-bold mb-3">{t === 'gratis' ? 'Premios disponibles' : 'Descuentos'}</p>
              <div className="flex flex-col gap-3">
                {list.map((b) => (
                  <div key={b.id} className="bg-card border border-line rounded-3xl p-3.5">
                    <div className="flex gap-3.5 items-center">
                      <div className="w-[84px] h-[84px] rounded-[18px] bg-purple-light overflow-hidden shrink-0 flex items-center justify-center">
                        {b.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Gift size={28} className="text-[#8b4fd1]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-bold leading-tight">{b.name}</p>
                        <p className="text-[12.5px] text-muted mt-0.5">{t === 'descuento' ? 'Descuento' : 'Gratis'}</p>
                        {b.description && <p className="text-[12.5px] text-muted leading-[17px] mt-1 line-clamp-3">{b.description}</p>}
                        <p className="text-[14px] font-extrabold text-[#2E9E7C] mt-2">🪙 {b.cost_points} Puntos</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-2xl bg-[#1f7d68] text-white text-center font-bold text-[14px] py-[11px]">Canjear</div>
                  </div>
                ))}
              </div>
            </div>
          ),
        )}

        {business.lat != null && business.lng != null ? (
          <div className="mt-8">
            <p className="text-[17px] font-bold mb-3">Cómo llegar</p>
            <MapaLlegar lat={business.lat} lng={business.lng} logo={business.logo_url} />
          </div>
        ) : (
          !business.is_virtual && <p className="text-[12px] text-warn mt-5">Sin ubicación: el local no aparece en el mapa.</p>
        )}
      </div>
    </div>
  );
}

// Ventana con la vista previa. Carga sola los premios del local.
export function FichaPreviewModal({ business, onClose, footer }: { business: Business; onClose: () => void; footer?: React.ReactNode }) {
  const [benefits, setBenefits] = useState<Benefit[] | null>(null);
  useEffect(() => {
    supabase
      .from('benefits')
      .select('*')
      .eq('business_id', business.id)
      .then(({ data }) => setBenefits((data as Benefit[]) ?? []));
  }, [business.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-start sm:items-center justify-center p-3 overflow-y-auto" onClick={onClose}>
      <div className="relative my-6 w-full max-w-[400px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <p className="text-white font-bold text-[14px]">Así se ve en la app</p>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        {benefits ? <FichaPreview business={business} benefits={benefits} /> : <p className="text-white text-center py-10">Cargando…</p>}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}
