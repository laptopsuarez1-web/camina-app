'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { supabase, type Business, type BusinessPlan } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';

const PLAN_LABEL: Record<BusinessPlan, string> = {
  primer_paso: 'Primer Paso',
  paso_firme: 'Paso Firme',
  paso_adelante: 'Paso Adelante',
};

const PLAN_OPTIONS: BusinessPlan[] = ['primer_paso', 'paso_firme', 'paso_adelante'];

export default function AdminPage() {
  const { session, isAdmin, loading } = useBusinessAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    setListLoading(true);
    const { data } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });
    setBusinesses((data as Business[]) ?? []);
    setListLoading(false);
  }, []);

  async function approve(businessId: string) {
    setSavingId(businessId);
    const { error } = await supabase.from('businesses').update({ approved: true }).eq('id', businessId);
    setSavingId(null);
    if (!error) {
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, approved: true } : b)));
    }
  }

  async function toggleAdEligible(businessId: string, value: boolean) {
    setSavingId(businessId);
    const { error } = await supabase.from('businesses').update({ ad_eligible: value }).eq('id', businessId);
    setSavingId(null);
    if (!error) {
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, ad_eligible: value } : b)));
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!isAdmin) {
      router.replace('/inicio');
      return;
    }
    loadBusinesses();
  }, [loading, session, isAdmin, router, loadBusinesses]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function changePlan(businessId: string, plan: BusinessPlan) {
    setSavingId(businessId);
    const { data, error } = await supabase.rpc('request_plan_change', {
      p_business_id: businessId,
      p_new_plan: plan,
    });
    setSavingId(null);
    if (!error && data) {
      const updated = data as Business;
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? updated : b)));
    } else if (error) {
      alert(error.message);
    }
  }

  if (loading || !session || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando…</div>;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <div className="w-[220px] bg-auth-bg min-h-screen shrink-0 flex flex-col p-3.5">
        <div className="flex items-center gap-2.5 px-2.5 mb-7.5">
          <Image src="/camina-logo.png" alt="Camina" width={34} height={34} className="rounded-full" />
          <div>
            <p className="text-white font-bold text-[15px] leading-tight tracking-wide">CAMINA</p>
            <p className="text-auth-muted text-[10.5px] mt-0.5">Administrador</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-mint/10 text-white text-[13.5px] font-semibold mb-1">
          <ShieldCheck size={16} color="#7FEDC4" />
          Comercios
        </div>

        <div className="mt-auto pt-5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 w-full text-left text-[#8C7DB8] text-[12.5px]"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="flex-1 p-10 max-w-[1100px]">
        <h1 className="text-[22px] font-bold text-text mb-1">Todos los comercios</h1>
        <p className="text-muted text-[13.5px] mb-7">
          Aprobá un comercio nuevo antes de que aparezca en la app. Los cambios de plan hacia un plan mejor se
          aplican al toque; bajar de plan queda agendado para cuando termine el período mensual pagado.
        </p>

        {(() => {
          const pending = businesses.filter((b) => !b.approved);
          return pending.length > 0 ? (
            <div className="bg-warn-light rounded-2xl p-4 mb-7" style={{ color: '#8A5A2E' }}>
              <p className="font-bold text-[13.5px] mb-2.5">Pendientes de aprobación ({pending.length})</p>
              <div className="flex flex-col gap-2">
                {pending.map((b) => (
                  <div key={b.id} className="flex items-center justify-between bg-white rounded-xl px-3.5 py-2.5">
                    <div>
                      <p className="font-semibold text-text text-[13px]">
                        {b.name} {b.is_virtual && <span className="text-muted font-normal">· sin local (virtual)</span>}
                      </p>
                      <p className="text-muted text-[11.5px]">
                        {b.category} · {b.address || 'sin dirección'} · {new Date(b.created_at).toLocaleDateString('es-BO')}
                      </p>
                    </div>
                    <button
                      onClick={() => approve(b.id)}
                      disabled={savingId === b.id}
                      className="bg-mint text-mint-dark rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                    >
                      Aprobar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {listLoading ? (
          <p className="text-muted text-[13.5px]">Cargando…</p>
        ) : businesses.length === 0 ? (
          <p className="text-muted text-[13.5px]">Todavía no hay comercios registrados.</p>
        ) : (
          <div className="bg-card border border-line rounded-2xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Espacios pub.</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold text-text">{b.name}</td>
                    <td className="px-4 py-3 text-muted">{b.category}</td>
                    <td className="px-4 py-3">
                      {b.approved ? (
                        <span className="text-mint-dark bg-mint/15 rounded-full px-2.5 py-1 text-[11px] font-bold">
                          Aprobado
                        </span>
                      ) : (
                        <span className="text-warn bg-warn-light rounded-full px-2.5 py-1 text-[11px] font-bold">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={b.plan}
                        disabled={savingId === b.id}
                        onChange={(e) => changePlan(b.id, e.target.value as BusinessPlan)}
                        className="bg-white border border-line rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-semibold"
                      >
                        {PLAN_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {PLAN_LABEL[p]}
                          </option>
                        ))}
                      </select>
                      {b.pending_plan && (
                        <p className="text-muted text-[10.5px] mt-1">
                          → {PLAN_LABEL[b.pending_plan]} el{' '}
                          {new Date(new Date(b.plan_started_at).getTime() + 30 * 24 * 3600 * 1000).toLocaleDateString(
                            'es-BO'
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {b.plan === 'paso_adelante' ? (
                        <button
                          onClick={() => toggleAdEligible(b.id, !b.ad_eligible)}
                          disabled={savingId === b.id}
                          className="rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-bold"
                          style={{
                            background: b.ad_eligible ? 'rgba(127,237,196,0.2)' : '#F7F3FC',
                            color: b.ad_eligible ? '#0F7A5C' : '#7C6A9C',
                          }}
                        >
                          {b.ad_eligible ? 'Elegible ✓' : 'No elegible'}
                        </button>
                      ) : (
                        <span className="text-muted text-[11.5px]">— (solo Paso Adelante)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
