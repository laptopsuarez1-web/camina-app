'use client';

import { useEffect, useState } from 'react';
import { MapPin, Clock, X, Globe, MessageCircle, AtSign } from 'lucide-react';
import { supabase, type Benefit, type Business } from '@/lib/supabase';

// Vista previa de la ficha del local tal como la ve un usuario en la app (portada, logo, datos,
// botones de contacto y premios). La usa el dueño ("Así te ven en la app") y el admin antes de aprobar.
export function FichaPreview({ business, benefits }: { business: Business; benefits: Benefit[] }) {
  const activos = benefits.filter((b) => b.active);
  const chip = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold border border-line bg-white';
  return (
    <div className="w-full max-w-[360px] mx-auto bg-bg rounded-[28px] border-[6px] border-[#241748] overflow-hidden shadow-xl">
      <div className="relative h-[170px] bg-purple-light">
        {business.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-[12px]">Sin foto de portada</div>
        )}
        <div className="absolute -bottom-8 left-4 w-[68px] h-[68px] rounded-full border-4 border-bg bg-white overflow-hidden flex items-center justify-center">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-muted text-center leading-tight">Sin logo</span>
          )}
        </div>
      </div>
      <div className="px-4 pt-10 pb-5">
        <p className="text-[19px] font-bold leading-tight">{business.name}</p>
        <p className="text-muted text-[12.5px]">{business.category}</p>
        {business.description ? (
          <p className="text-[13px] text-muted leading-[19px] mt-2.5">{business.description}</p>
        ) : (
          <p className="text-[12.5px] text-warn mt-2.5">Falta la descripción del local.</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {business.address && (
            <span className={`${chip} !bg-aqua-light !border-transparent text-[#2E9E7C]`}>
              <MapPin size={12} /> {business.address}
            </span>
          )}
          {business.hours_text && (
            <span className={chip}>
              <Clock size={12} /> {business.hours_text}
            </span>
          )}
          {business.instagram && (
            <span className={chip}>
              <AtSign size={12} /> {business.instagram.replace('@', '')}
            </span>
          )}
          {business.facebook && <span className={chip}>Facebook</span>}
          {business.tiktok && <span className={chip}>TikTok</span>}
          {business.phone && business.phone.replace(/\D/g, '').length >= 7 && (
            <span className={chip}>
              <MessageCircle size={12} /> WhatsApp
            </span>
          )}
          {business.website && (
            <span className={chip}>
              <Globe size={12} /> Sitio web
            </span>
          )}
        </div>
        {!business.is_virtual && (business.lat == null || business.lng == null) && (
          <p className="text-[12px] text-warn mt-2.5">Sin ubicación: el local no aparece en el mapa.</p>
        )}

        <p className="text-[15px] font-bold mt-5 mb-2.5">Premios disponibles</p>
        {activos.length === 0 && (
          <p className="text-[12.5px] text-muted">Todavía no hay beneficios activos. Se puede aprobar igual: aparece en Canjes y en el mapa cuando cargue el primero.</p>
        )}
        <div className="flex flex-col gap-2">
          {activos.map((b) => (
            <div key={b.id} className="bg-white border border-line rounded-2xl p-2.5 flex gap-2.5 items-center">
              <div className="w-[52px] h-[52px] rounded-xl bg-purple-light overflow-hidden shrink-0">
                {b.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold leading-tight">{b.name}</p>
                {b.description && <p className="text-[11.5px] text-muted leading-[15px] mt-0.5 line-clamp-2">{b.description}</p>}
              </div>
              <span className="text-[12.5px] font-bold text-[#2E9E7C] shrink-0">{b.cost_points} Puntos</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Ventana con la vista previa. Carga sola los beneficios del local.
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
