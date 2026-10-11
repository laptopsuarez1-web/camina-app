'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Business } from '@/lib/supabase';
import { consumePendingBusiness, pendingFromMetadata } from '@/lib/pending-business';
import { uploadLogoFromDataUrl } from '@/lib/logo';

// Evita crear el comercio dos veces si dos llamadas llegan juntas (sesión inicial + cambio de sesión).
const creando = new Map<string, Promise<Business | null>>();

async function crearComercioPendiente(userId: string, email: string): Promise<Business | null> {
  const { data: userData } = await supabase.auth.getUser();
  const pending = consumePendingBusiness(email) ?? pendingFromMetadata(email, userData.user?.user_metadata);
  if (!pending) return null;
  const row = {
    owner_user_id: userId,
    name: pending.name,
    category: pending.category,
    address: pending.isVirtual ? null : pending.address,
    phone: pending.phone,
    is_virtual: pending.isVirtual,
    plan: 'primer_paso',
  };
  let { data: created, error } = await supabase
    .from('businesses')
    .insert({ ...row, city: pending.city ?? 'Tarija', account_kind: pending.accountKind ?? 'commerce' })
    .select('*')
    .single();
  if (error && /city|account_kind/i.test(error.message)) {
    ({ data: created, error } = await supabase.from('businesses').insert(row).select('*').single());
  }
  if (error || !created) return null;
  // Ya se creó: se borran los datos pendientes de la cuenta para no repetirlo.
  await supabase.auth.updateUser({ data: { pending_business: null } });
  if (pending.logoDataUrl) await uploadLogoFromDataUrl(created.id, pending.logoDataUrl);
  const { data: fresh } = await supabase.from('businesses').select('*').eq('id', created.id).single();
  return (fresh ?? created) as Business;
}

export function useBusinessAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<'owner' | 'cashier'>('owner');
  const [loading, setLoading] = useState(true);

  const refreshBusiness = useCallback(async (userId: string, email: string | undefined) => {
    const { data: adminCheck } = await supabase.rpc('is_admin');
    setIsAdmin(!!adminCheck);

    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_user_id', userId)
      .maybeSingle();

    if (data) {
      setRole('owner');
      setBusiness(data as Business);
      return;
    }

    // No hay negocio todavía: puede ser la primera vez que esta cuenta entra
    // después de confirmar el correo. Los datos del alta están en este navegador
    // (localStorage) o dentro de la cuenta; si hay, el negocio se crea recién ahora.
    if (email) {
      let tarea = creando.get(userId);
      if (!tarea) {
        tarea = crearComercioPendiente(userId, email).finally(() => creando.delete(userId));
        creando.set(userId, tarea);
      }
      const nuevo = await tarea;
      if (nuevo) {
        setRole('owner');
        setBusiness(nuevo);
        return;
      }
    }
    // ¿Es un cajero invitado por un comercio? Se vincula por su correo y entra al comercio como cajero.
    const { data: staffBusinessId } = await supabase.rpc('claim_staff_invite');
    if (staffBusinessId) {
      const { data: staffBusiness } = await supabase.from('businesses').select('*').eq('id', staffBusinessId).maybeSingle();
      if (staffBusiness) {
        setRole('cashier');
        setBusiness(staffBusiness as Business);
        return;
      }
    }
    setBusiness(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await refreshBusiness(data.session.user.id, data.session.user.email);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) await refreshBusiness(newSession.user.id, newSession.user.email);
      else {
        setBusiness(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshBusiness]);

  return { session, business, isAdmin, role, loading, refreshBusiness };
}
