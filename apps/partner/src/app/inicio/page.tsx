'use client';

import { useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';
import { supabase, type Redemption } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';

const PLAN_LABEL: Record<string, string> = {
  primer_paso: 'Primer Paso · Gratis',
  paso_firme: 'Paso Firme · Bs 100/mes',
  paso_adelante: 'Paso Adelante · Bs 300/mes',
};

export default function InicioPage() {
  const { business } = useBusinessAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [monthCount, setMonthCount] = useState<number | null>(null);
  const [todayQuotaLeft, setTodayQuotaLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!business) return;

    supabase
      .from('redemptions')
      .select('id, code, status, created_at, confirmed_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setRedemptions((data as Redemption[]) ?? []));

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    supabase
      .from('redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('created_at', monthStart.toISOString())
      .then(({ count }) => setMonthCount(count ?? 0));

    supabase
      .from('benefits')
      .select('daily_quota')
      .eq('business_id', business.id)
      .eq('active', true)
      .maybeSingle()
      .then(async ({ data: benefit }) => {
        if (!benefit) return;
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .in('status', ['pending', 'confirmed'])
          .gte('created_at', dayStart.toISOString());
        setTodayQuotaLeft(Math.max(0, benefit.daily_quota - (count ?? 0)));
      });
  }, [business]);

  return (
    <DashboardShell>
      <TopBar title={`Hola, ${business?.name ?? ''}`} subtitle="Así viene funcionando tu beneficio esta semana." />

      <div className="flex gap-3.5 mb-5">
        <StatCard label="Cupones disponibles hoy" value={todayQuotaLeft ?? '—'} accent="#4FC3A8" />
        <StatCard label="Canjes este mes" value={monthCount ?? '—'} accent="#8B4FD1" />
        <StatCard label="Plan actual" value={PLAN_LABEL[business?.plan ?? 'primer_paso']} accent="#291C47" />
      </div>

      <div className="bg-card border border-line rounded-2xl p-4.5">
        <p className="font-semibold text-sm mb-3.5">Últimos canjes</p>
        <div className="flex flex-col">
          {redemptions.map((r, i) => (
            <div
              key={r.id}
              className={`flex justify-between items-center py-2.5 ${i < redemptions.length - 1 ? 'border-b border-line' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-[30px] h-[30px] rounded-full bg-aqua-light flex items-center justify-center">
                  <Ticket size={13} color="#4FC3A8" />
                </div>
                <span className="text-[13px] font-medium">Código {r.code}</span>
              </div>
              <span className="text-xs text-muted">
                {new Date(r.created_at).toLocaleDateString('es-BO')} ·{' '}
                {new Date(r.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {redemptions.length === 0 && <p className="text-muted text-[13px] py-2">Todavía no hay canjes.</p>}
        </div>
      </div>
    </DashboardShell>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4.5 flex-1">
      <p className="text-[12.5px] text-muted mb-2">{label}</p>
      <p className="text-[26px] font-bold leading-none" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
