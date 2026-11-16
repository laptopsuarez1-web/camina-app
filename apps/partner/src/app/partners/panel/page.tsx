'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, MessageCircle, BookOpen, Smartphone, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PartnerShell } from '@/components/PartnerShell';
import { bs, partnersWa, type Partner, type PartnerTotals } from '@/lib/partners';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'main' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'main' ? 'bg-auth-bg border-transparent' : 'bg-card border-line'}`}>
      <p className={`text-[12px] ${tone === 'main' ? 'text-auth-muted' : 'text-muted'}`}>{label}</p>
      <p className={`text-[26px] font-extrabold leading-tight mt-0.5 ${tone === 'main' ? 'text-mint' : 'text-text'}`}>{value}</p>
    </div>
  );
}

const ATAJO_KEY = 'camina_partner_atajo_visto';

// Aviso para dejar el panel como un ícono en el celular: así entra con un toque, sin buscar el link.
function Atajo() {
  const [visto, setVisto] = useState(() => {
    try { return localStorage.getItem(ATAJO_KEY) === '1'; } catch { return false; }
  });
  if (visto) return null;
  const cerrar = () => { try { localStorage.setItem(ATAJO_KEY, '1'); } catch {} setVisto(true); };
  return (
    <div className="relative flex gap-3 bg-card border border-line rounded-2xl p-4 mb-5">
      <Smartphone size={22} className="text-aqua shrink-0 mt-0.5" />
      <div className="pr-6">
        <p className="font-semibold text-text text-[14px]">Deja el panel como una app en tu celular</p>
        <p className="text-muted text-[12.5px] mt-0.5 leading-snug">
          <b className="text-text">Android:</b> menú ⋮ del navegador → Agregar a pantalla de inicio.{' '}
          <b className="text-text">iPhone:</b> botón Compartir → Agregar a inicio. También puedes entrar con <b className="text-text">caminaapp.com/p</b>.
        </p>
      </div>
      <button type="button" onClick={cerrar} aria-label="Cerrar aviso" className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center text-muted"><X size={16} /></button>
    </div>
  );
}

function Inicio({ partner }: { partner: Partner }) {
  const [t, setT] = useState<PartnerTotals | null>(null);

  useEffect(() => {
    supabase.rpc('partner_summary').then(({ data }) => setT((data as PartnerTotals) ?? null));
  }, []);

  const falta = t?.siguiente_bono ? t.siguiente_bono - t.activos : 0;

  return (
    <>
      <h1 className="text-[22px] font-bold text-text">Hola, {partner.full_name.split(' ')[0]}</h1>
      <p className="text-muted text-[13.5px] mb-5">
        Tu código es <b className="text-text">{partner.code}</b>. Úsalo siempre que reportes un local.
      </p>

      <Atajo />

      <Link href="/partners/panel/reportar" className="flex items-center justify-center gap-2 bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] rounded-2xl py-4 font-bold text-[15px] mb-5">
        <PlusCircle size={18} /> Cargar un local
      </Link>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="Te debemos" value={t ? bs(t.pendiente) : '…'} tone="main" />
        <Stat label="Ya cobraste" value={t ? bs(t.pagado) : '…'} />
        <Stat label="Locales activos" value={t ? String(t.activos) : '…'} />
        <Stat label="En camino" value={t ? String(t.publicados + t.reportados) : '…'} />
      </div>

      {t && t.siguiente_bono && (
        <p className="text-muted text-[13px] mb-5">
          {falta === 1 ? 'Te falta 1 local activo' : `Te faltan ${falta} locales activos`} para tu próximo bono de {t.siguiente_bono === 5 ? 'Bs 50' : 'Bs 100'}.
        </p>
      )}
      {t && !t.siguiente_bono && <p className="text-muted text-[13px] mb-5">Ya tienes todos los bonos. Sigue sumando locales.</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/partners/panel/guia" className="flex items-center gap-3 bg-card border border-line rounded-2xl p-4">
          <BookOpen size={22} className="text-purple shrink-0" />
          <div>
            <p className="font-semibold text-text text-[14px]">Guía y qué decir</p>
            <p className="text-muted text-[12.5px]">Guion, dudas del dueño y carga en 5 minutos.</p>
          </div>
        </Link>
        <a
          href={partnersWa(`Hola! Soy ${partner.full_name}, partner ${partner.code}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-card border border-line rounded-2xl p-4"
        >
          <MessageCircle size={22} className="text-aqua shrink-0" />
          <div>
            <p className="font-semibold text-text text-[14px]">Escribir a Camina</p>
            <p className="text-muted text-[12.5px]">Por WhatsApp: dudas, avisos o un local con problemas.</p>
          </div>
        </a>
      </div>
    </>
  );
}

export default function PanelPage() {
  return <PartnerShell>{(p) => <Inicio partner={p} />}</PartnerShell>;
}
