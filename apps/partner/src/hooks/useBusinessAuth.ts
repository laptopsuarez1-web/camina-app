'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Business } from '@/lib/supabase';
import { consumePendingBusiness } from '@/lib/pending-business';
import { uploadLogoFromDataUrl } from '@/lib/logo';

export function useBusinessAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
      setBusiness(data as Business);
      return;
    }

    // No hay negocio todavía: puede ser la primera vez que esta cuenta entra
    // después de confirmar el correo — si /registro dejó datos pendientes
    // para este email, se crea el negocio recién ahora.
    const pending = email ? consumePendingBusiness(email) : null;
    if (!pending) {
      setBusiness(null);
      return;
    }
    const { data: created, error } = await supabase
      .from('businesses')
      .insert({
        owner_user_id: userId,
        name: pending.name,
        category: pending.category,
        address: pending.isVirtual ? null : pending.address,
        phone: pending.phone,
        is_virtual: pending.isVirtual,
        city: pending.city ?? 'Tarija',
        plan: 'primer_paso',
      })
      .select('*')
      .single();
    if (error || !created) {
      setBusiness(null);
      return;
    }
    if (pending.logoDataUrl) await uploadLogoFromDataUrl(created.id, pending.logoDataUrl);
    const { data: fresh } = await supabase.from('businesses').select('*').eq('id', created.id).single();
    setBusiness((fresh ?? created) as Business);
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

  return { session, business, isAdmin, loading, refreshBusiness };
}
