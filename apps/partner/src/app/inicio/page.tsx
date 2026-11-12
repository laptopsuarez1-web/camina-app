'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket, ChevronRight } from 'lucide-react';
import { supabase, type Redemption, type BusinessNotification } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { ClientesFieles } from '@/components/ClientesFieles';
import { ResumenMes, type Resumen } from '@/components/ResumenMes';

export default function InicioPage() {
  const { business } = useBusinessAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [todayQuotaLeft, setTodayQuotaLeft] = useState<number | null>(null);
  const [todayQuotaTotal, setTodayQuotaTotal] = useState<number | null>(null);
  const [news, setNews] = useState<BusinessNotification[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [localCode, setLocalCode] = useState<string | null>(null);
  const [rutaCode, setRutaCode] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;

    supabase.from('business_local_codes').select('code').eq('business_id', business.id).maybeSingle().then(({ data }) => setLocalCode(data?.code ?? null));
    supabase.rpc('my_route_code', { p_business: business.id }).then(({ data, error }) => setRutaCode(error ? null : ((data as string) ?? null)));
    supabase.rpc('business_month_summary', { p_business: business.id }).then(({ data, error }) => setResumen(error ? null : ((data as Resumen) ?? null)));

    supabase
      .from('business_notifications')
      .select('id, title, body, read, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setNews((data as BusinessNotification[]) ?? []));

    supabase
      .from('redemptions')
      .select('id, code, status, created_at, confirmed_at, confirmed_via, benefit:benefits(name)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRedemptions((data as unknown as Redemption[]) ?? []));


    supabase
      .from('benefits')
      .select('id, daily_quota')
      .eq('business_id', business.id)
      .eq('active', true)
      .then(async ({ data: benefits }) => {
        // Los premios con cupones ilimitados no entran en esta cuenta — no
        // tiene sentido mostrar "quedan X de ilimitados". Si TODOS son
        // ilimitados, la tarjeta se oculta (ver abajo).
        const limited = (benefits ?? []).filter((b) => b.daily_quota != null) as { id: string; daily_quota: number }[];
        if (limited.length === 0) return;

        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const { data: todayRedemptions } = await supabase
          .from('redemptions')
          .select('benefit_id')
          .in('benefit_id', limited.map((b) => b.id))
          .in('status', ['pending', 'confirmed'])
          .gte('created_at', dayStart.toISOString());

        const usedByBenefit = new Map<string, number>();
        for (const r of todayRedemptions ?? []) {
          usedByBenefit.set(r.benefit_id, (usedByBenefit.get(r.benefit_id) ?? 0) + 1);
        }
        const total = limited.reduce((a, b) => a + b.daily_quota, 0);
        const used = limited.reduce((a, b) => a + Math.min(b.daily_quota, usedByBenefit.get(b.id) ?? 0), 0);
        setTodayQuotaTotal(total);
        setTodayQuotaLeft(Math.max(0, total - used));
      });
  }, [business]);

  const mes = resumen?.month
    ? new Date(resumen.month + 'T12:00:00Z').toLocaleDateString('es-BO', { month: 'long', timeZone: 'UTC' })
    : '';
  const sinNoticias = news.filter((n) => !n.read).length;

  return (
    <DashboardShell>
      <TopBar title={`Hola, ${business?.name ?? ''}`} subtitle="Tus códigos y cómo viene tu local." />

      {/* Los dos códigos que el local le da al cliente, siempre a la vista. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
        <CodeCard
          titulo="Código del local"
          codigo={localCode}
          texto="Díselo al cliente cuando canjea su premio. Lo escribe en la app, estando en tu local."
          href="/canjes"
          link="Ver canjes o cambiar el código"
        />
        <CodeCard
          titulo="Código de la Ruta"
          codigo={rutaCode}
          texto="Díselo a quien viene por la Ruta del mes cuando paga."
          href="/ruta"
          link="Ver la Ruta o cambiar el código"
        />
      </div>

      {/* Solo tres números, sin palabras raras. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
        <StatCard label={mes ? `Personas que trajo Camina en ${mes}` : 'Personas que trajo Camina este mes'} value={resumen ? resumen.personas : '—'} accent="#4FC3A8" />
        <StatCard label={mes ? `Canjes en ${mes}` : 'Canjes este mes'} value={resumen ? resumen.canjes : '—'} accent="var(--c-text)" />
        {todayQuotaTotal != null ? (
          <StatCard label="Cupones que quedan hoy" value={`${todayQuotaLeft ?? 0} de ${todayQuotaTotal}`} accent="#4FC3A8" />
        ) : (
          <StatCard label="Visitas de la Ruta del mes" value={resumen ? resumen.ruta : '—'} accent="var(--c-text)" />
        )}
      </div>

      {news.length > 0 && (
        <div className="bg-card border border-line rounded-2xl mb-5 overflow-hidden">
          <p className="font-bold text-[14px] px-4 pt-3.5 pb-2">
            Novedades{sinNoticias > 0 && <span className="ml-2 text-[11px] font-bold bg-mint text-auth-bg rounded-full px-2 py-0.5">{sinNoticias} nuevas</span>}
          </p>
          {news.map((n) => (
            <div key={n.id} className="px-4 py-2.5 border-t border-line">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-[13px]">{n.title}</p>
                <p className="text-muted text-[11px] whitespace-nowrap">
                  {new Date(n.created_at).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p className="text-muted text-[12.5px] leading-[18px]">{n.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-line rounded-2xl p-4.5 mb-5">
        <div className="flex items-center justify-between mb-3.5">
          <p className="font-semibold text-sm">Últimos canjes</p>
          {redemptions.length > 0 && <Link href="/canjes" className="text-[12.5px] font-semibold text-purple">Ver todos ›</Link>}
        </div>
        <div className="flex flex-col">
          {redemptions.map((r, i) => (
            <div
              key={r.id}
              className={`flex justify-between items-center gap-3 py-2.5 ${i < redemptions.length - 1 ? 'border-b border-line' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-[30px] h-[30px] rounded-full bg-aqua-light flex items-center justify-center shrink-0">
                  <Ticket size={13} color="#4FC3A8" />
                </div>
                <span className="text-[13px] font-medium truncate">
                  {r.benefit?.name ?? 'Canje'} <span className="text-muted font-normal">· {r.confirmed_via === 'local_code' ? 'código del local' : `código ${r.code}`}</span>
                </span>
              </div>
              <span className="text-xs text-muted whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString('es-BO')} ·{' '}
                {new Date(r.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
          ))}
          {redemptions.length === 0 && <p className="text-muted text-[13px] py-2">Todavía no hay canjes. Cuando alguien use un premio, lo ves aquí.</p>}
        </div>
      </div>

      <Link href="/cuenta" className="flex items-center justify-between bg-card border border-line rounded-2xl px-4.5 py-3.5 mb-5 text-sm">
        <span>
          <span className="block font-semibold">Mi correo y contraseña</span>
          <span className="block text-muted text-[12.5px] mt-0.5">Cámbialos cuando quieras.</span>
        </span>
        <ChevronRight size={16} />
      </Link>

      {/* El detalle sigue disponible, pero cerrado: no abruma al entrar. */}
      {business && resumen && (
        <details className="group mb-5">
          <summary className="cursor-pointer list-none flex items-center justify-between bg-card border border-line rounded-2xl px-4.5 py-3.5 text-sm font-semibold">
            Ver el resumen completo de {mes}
            <ChevronRight size={16} className="transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3.5">
            <ResumenMes businessId={business.id} datos={resumen} />
          </div>
        </details>
      )}
      {business && (
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center justify-between bg-card border border-line rounded-2xl px-4.5 py-3.5 text-sm font-semibold">
            Mis clientes más fieles
            <ChevronRight size={16} className="transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3.5">
            <ClientesFieles businessId={business.id} />
          </div>
        </details>
      )}
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

function CodeCard({ titulo, codigo, texto, href, link }: { titulo: string; codigo: string | null; texto: string; href: string; link: string }) {
  return (
    <div className="rounded-2xl p-5 bg-auth-bg">
      <p className="text-[12px] font-bold tracking-[0.08em] text-mint">{titulo.toUpperCase()}</p>
      <p className="text-[44px] font-extrabold tracking-[0.25em] leading-tight mt-1 text-white">{codigo ?? '····'}</p>
      <p className="text-[13.5px] leading-snug mt-1 text-[#E4DDF7]">{texto}</p>
      <Link href={href} className="inline-block text-[12.5px] font-semibold text-mint mt-3">{link} ›</Link>
    </div>
  );
}
