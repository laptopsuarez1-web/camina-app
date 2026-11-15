'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// WhatsApp de Camina: el mismo que usa el panel de comercios.
export const PARTNERS_WHATSAPP = '59162714286';
export const partnersWa = (texto: string) => `https://wa.me/${PARTNERS_WHATSAPP}?text=${encodeURIComponent(texto)}`;

export type PlanKind = 'gratis' | 'fundador' | 'plan_100' | 'plan_300';
export type LeadStatus = 'reportado' | 'publicado' | 'activo' | 'rechazado';

export const PLAN_KINDS: { id: PlanKind; label: string; amount: number }[] = [
  { id: 'gratis', label: 'Plan gratis', amount: 20 },
  { id: 'fundador', label: 'Cupo fundador', amount: 25 },
  { id: 'plan_100', label: 'Plan de Bs 100', amount: 40 },
  { id: 'plan_300', label: 'Plan de Bs 300', amount: 120 },
];

export const planLabel = (k: PlanKind) => PLAN_KINDS.find((p) => p.id === k)?.label ?? k;
export const planAmount = (k: PlanKind) => PLAN_KINDS.find((p) => p.id === k)?.amount ?? 0;

export const ESTADO_LABEL: Record<LeadStatus, string> = {
  reportado: 'En revisión',
  publicado: 'Publicado, falta el primer canje',
  activo: 'Activo',
  rechazado: 'Rechazado',
};

export interface Partner {
  id: string;
  user_id: string;
  code: string;
  full_name: string;
  phone: string;
  city: string;
  zone: string | null;
  status: 'active' | 'paused';
  created_at: string;
}

export interface PartnerLead {
  id: string;
  partner_id: string;
  business_name: string;
  owner_name: string | null;
  owner_phone: string;
  zone: string | null;
  note: string | null;
  plan_kind: PlanKind;
  status: LeadStatus;
  business_id: string | null;
  amount_bs: number;
  admin_note: string | null;
  reported_at: string;
  published_at: string | null;
  activated_at: string | null;
  category: string | null;
  address: string | null;
  description: string | null;
  hours_text: string | null;
  instagram: string | null;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  cover_url: string | null;
  benefit_kind: 'gratis' | 'descuento' | null;
  benefit_name: string | null;
  benefit_description: string | null;
  benefit_image_url: string | null;
  benefit_cost: number | null;
  benefit_quota: number | null;
}

export interface PartnerPayment {
  id: string;
  partner_id: string;
  amount_bs: number;
  note: string | null;
  paid_at: string;
}

export interface PartnerTotals {
  activos: number;
  publicados: number;
  reportados: number;
  ganado_locales: number;
  bono: number;
  ganado: number;
  pagado: number;
  pendiente: number;
  siguiente_bono: number | null;
}

export const bs = (n: number) => `Bs ${n.toLocaleString('es-BO')}`;
export const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });

// Sesión y ficha de partner de quien está con la sesión abierta. Si la cuenta se creó con el registro de partners
// y la ficha todavía no se guardó (por ejemplo, entró desde otro celular), se completa sola con los datos del alta.
export function usePartnerAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setPartner(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('partners').select('*').eq('user_id', s.user.id).maybeSingle();
    if (data) {
      setPartner(data as Partner);
      setLoading(false);
      return;
    }
    const pend = s.user.user_metadata?.pending_partner as { name?: string; phone?: string; zone?: string } | undefined;
    if (pend?.name && pend?.phone) {
      const { data: creado } = await supabase.rpc('register_partner', { p_name: pend.name, p_phone: pend.phone, p_zone: pend.zone ?? '' });
      if (creado) {
        setPartner(creado as Partner);
        await supabase.auth.updateUser({ data: { pending_partner: null } });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => void cargar(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => void cargar(s));
    return () => sub.subscription.unsubscribe();
  }, [cargar]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await cargar(data.session);
  }, [cargar]);

  return { session, partner, loading, refresh };
}
