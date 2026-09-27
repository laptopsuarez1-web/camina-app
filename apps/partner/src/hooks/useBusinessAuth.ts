'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Business } from '@/lib/supabase';

export function useBusinessAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBusiness = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_user_id', userId)
      .maybeSingle();
    setBusiness(data as Business | null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await refreshBusiness(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) await refreshBusiness(newSession.user.id);
      else setBusiness(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshBusiness]);

  return { session, business, loading, refreshBusiness };
}
