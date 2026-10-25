'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Business, type BusinessPlan } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { FichaPreviewModal } from '@/components/FichaPreview';
import { faltantesParaPublicar, sugerenciaBeneficio } from '@/lib/readiness';
import { avisarPorCorreo } from '@/lib/email';

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
  const [founderSlots, setFounderSlots] = useState<number | null>(null);
  const [founderError, setFounderError] = useState<string | null>(null);
  const [launchAt, setLaunchAt] = useState<string | null>(null);
  const [launchInput, setLaunchInput] = useState('');
  const [pendingAlerts, setPendingAlerts] = useState<
    { id: string; business_name: string; title: string; body: string; radius_km: number; estimated: number }[]
  >([]);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [activeBenefits, setActiveBenefits] = useState<Record<string, number>>({});
  const [previewing, setPreviewing] = useState<Business | null>(null);

  const loadBusinesses = useCallback(async () => {
    setListLoading(true);
    const { data } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });
    setBusinesses((data as Business[]) ?? []);
    // Cuántos beneficios activos tiene cada local: sin ninguno no se puede aprobar (quedaría vacío).
    const { data: bens } = await supabase.from('benefits').select('business_id').eq('active', true);
    const counts: Record<string, number> = {};
    for (const b of (bens as { business_id: string }[]) ?? []) counts[b.business_id] = (counts[b.business_id] ?? 0) + 1;
    setActiveBenefits(counts);
    const { data: used } = await supabase.rpc('founder_slots_used');
    setFounderSlots(typeof used === 'number' ? used : null);
    const { data: launch } = await supabase.from('app_launch').select('launch_at').maybeSingle();
    setLaunchAt((launch as { launch_at: string | null } | null)?.launch_at ?? null);
    const { data: alerts } = await supabase.rpc('pending_nearby_campaigns');
    setPendingAlerts((alerts as typeof pendingAlerts) ?? []);
    setListLoading(false);
  }, []);

  async function decideAlert(id: string, approve: boolean) {
    setAlertMsg(null);
    const { data, error } = approve
      ? await supabase.rpc('approve_nearby_campaign', { p_campaign_id: id })
      : await supabase.rpc('reject_nearby_campaign', { p_campaign_id: id });
    if (error) {
      setAlertMsg(error.message);
      return;
    }
    if (approve) setAlertMsg(`Aviso enviado a ${data} personas.`);
    loadBusinesses();
  }

  async function saveLaunch(clear: boolean) {
    setFounderError(null);
    if (!clear && !launchInput) return;
    const { error } = await supabase.rpc('set_launch_date', { p_launch_at: clear ? null : new Date(`${launchInput}T00:00:00-04:00`).toISOString() });
    if (error) {
      setFounderError(error.message);
      return;
    }
    setLaunchInput('');
    loadBusinesses();
  }

  async function makeFounder(businessId: string) {
    setSavingId(businessId);
    setFounderError(null);
    const { error } = await supabase.rpc('grant_founder', { p_business_id: businessId });
    setSavingId(null);
    if (error) {
      setFounderError(error.message);
      return;
    }
    loadBusinesses();
  }

  async function approve(businessId: string) {
    setSavingId(businessId);
    const { error } = await supabase.from('businesses').update({ approved: true }).eq('id', businessId);
    setSavingId(null);
    if (!error) {
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, approved: true } : b)));
      setPreviewing(null);
      void avisarPorCorreo('approved', businessId);
    }
  }

  // Aprobar también limpia un rechazo anterior.
  async function approveBusiness(businessId: string) {
    setSavingId(businessId);
    setReviewMsg(null);
    const { error } = await supabase
      .from('businesses')
      .update({ approved: true, rejected_at: null, rejection_reason: null })
      .eq('id', businessId);
    setSavingId(null);
    if (error) {
      // Si todavía no está la migración del rechazo, se aprueba igual.
      if (/rejected_at|rejection_reason/i.test(error.message)) return approve(businessId);
      setReviewMsg(error.message);
      return;
    }
    setPreviewing(null);
    void avisarPorCorreo('approved', businessId);
    loadBusinesses();
  }

  async function rejectBusiness(businessId: string) {
    const reason = rejectReason.trim();
    if (!reason) return;
    setSavingId(businessId);
    setReviewMsg(null);
    const { error } = await supabase
      .from('businesses')
      .update({ approved: false, rejected_at: new Date().toISOString(), rejection_reason: reason })
      .eq('id', businessId);
    setSavingId(null);
    if (error) {
      setReviewMsg(
        /rejected_at|rejection_reason/i.test(error.message)
          ? 'Falta aplicar la migración 0038 en la base de datos para poder rechazar con motivo.'
          : error.message
      );
      return;
    }
    setRejectingId(null);
    setRejectReason('');
    void avisarPorCorreo('rejected', businessId);
    loadBusinesses();
  }

  async function deleteBusiness(b: Business) {
    setSavingId(b.id);
    setReviewMsg(null);
    // El logo y la portada no se borran solos con la fila; se intenta sacarlos (si falla, no pasa nada).
    for (const bucket of ['business-logos']) {
      const { data: files } = await supabase.storage.from(bucket).list(b.id);
      if (files && files.length > 0) await supabase.storage.from(bucket).remove(files.map((f) => `${b.id}/${f.name}`));
    }
    const { error } = await supabase.from('businesses').delete().eq('id', b.id);
    setSavingId(null);
    setDeletingId(null);
    if (error) {
      setReviewMsg(error.message);
      return;
    }
    setBusinesses((prev) => prev.filter((x) => x.id !== b.id));
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
    <AdminShell>
        {previewing && (
          <FichaPreviewModal
            business={previewing}
            onClose={() => setPreviewing(null)}
            footer={
              !previewing.approved ? (
                <button
                  onClick={() => approveBusiness(previewing.id)}
                  disabled={savingId === previewing.id}
                  className="w-full bg-mint text-mint-dark rounded-[10px] py-3 text-[13.5px] font-bold"
                >
                  Se ve bien, aprobar
                </button>
              ) : undefined
            }
          />
        )}
        <h1 className="text-[22px] font-bold text-text mb-1">Todos los comercios</h1>
        <p className="text-muted text-[13.5px] mb-7">
          Aprobá un comercio nuevo antes de que aparezca en la app. Los cambios de plan hacia un plan mejor se
          aplican al toque; bajar de plan queda agendado para cuando termine el período mensual pagado.
        </p>

        <div className="bg-card border border-line rounded-2xl px-4 py-3 mb-5 flex items-center justify-between">
          <div>
            <p className="font-bold text-[13.5px] text-text">Programa fundador</p>
            <p className="text-muted text-[12px]">Los primeros 20 comercios tienen 3 meses gratis de Paso Firme, contados desde que salga la app.</p>
            <p className="text-muted text-[12px] mt-1">
              Lanzamiento: <b>{launchAt ? new Date(launchAt).toLocaleDateString('es-BO') : 'sin fecha (los cupos empiezan cuando salga la app)'}</b>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <input type="date" value={launchInput} onChange={(e) => setLaunchInput(e.target.value)} className="border border-line rounded-[8px] px-2 py-1 text-[12px]" />
              <button onClick={() => saveLaunch(false)} disabled={!launchInput} className="rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-bold bg-[#F7F3FC] text-[#7C6A9C] disabled:opacity-50">Fijar fecha</button>
              {launchAt && <button onClick={() => saveLaunch(true)} className="text-[11.5px] text-muted underline">Quitar</button>}
            </div>
          </div>
          <p className="text-[18px] font-extrabold text-text">{founderSlots ?? '—'}/20 <span className="text-muted text-[12px] font-medium">cupos usados</span></p>
        </div>
        {founderError && <p className="text-warn text-[12.5px] mb-4">{founderError}</p>}

        {(pendingAlerts.length > 0 || alertMsg) && (
          <div className="bg-card border border-line rounded-2xl p-4 mb-5">
            <p className="font-bold text-[13.5px] mb-2.5">Avisos cercanos por aprobar ({pendingAlerts.length})</p>
            {alertMsg && <p className="text-[12.5px] text-mint-dark mb-2.5">{alertMsg}</p>}
            <div className="flex flex-col gap-2.5">
              {pendingAlerts.map((a) => (
                <div key={a.id} className="border border-line rounded-xl p-3">
                  <p className="text-[11.5px] text-muted mb-0.5">
                    {a.business_name} · {a.radius_km} km · llegaría a unas {a.estimated} personas
                  </p>
                  <p className="font-semibold text-[13.5px]">{a.title}</p>
                  <p className="text-[12.5px] text-muted mb-2.5">{a.body}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => decideAlert(a.id, true)}
                      className="bg-mint text-mint-dark rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                    >
                      Aprobar y enviar
                    </button>
                    <button
                      onClick={() => decideAlert(a.id, false)}
                      className="bg-[#F7F3FC] text-[#7C6A9C] rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviewMsg && <p className="text-warn text-[12.5px] mb-4">{reviewMsg}</p>}

        {(() => {
          const pending = businesses.filter((b) => !b.approved && !b.rejected_at);
          const rejected = businesses.filter((b) => !b.approved && b.rejected_at);

          const confirmDelete = (b: Business) => (
            <div className="mt-2 rounded-xl px-3 py-2.5 text-[12px]" style={{ background: '#FDEEE2', color: '#8A5A2E' }}>
              <p className="mb-2">
                ¿Eliminar <b>{b.name}</b> para siempre? Se borran también sus beneficios y canjes. No se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteBusiness(b)}
                  disabled={savingId === b.id}
                  className="rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-50"
                  style={{ background: '#C0392B' }}
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  className="bg-[#F7F3FC] text-[#7C6A9C] rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          );

          return (
            <>
              {pending.length > 0 && (
                <div className="bg-warn-light rounded-2xl p-4 mb-5" style={{ color: '#8A5A2E' }}>
                  <p className="font-bold text-[13.5px] mb-2.5">Pendientes de aprobación ({pending.length})</p>
                  <div className="flex flex-col gap-2">
                    {pending.map((b) => (
                      <div key={b.id} className="bg-white rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold text-text text-[13px]">
                              {b.name} {b.is_virtual && <span className="text-muted font-normal">· sin local (virtual)</span>}
                            </p>
                            <p className="text-muted text-[11.5px]">
                              {b.category} · {b.city ?? 'Tarija'} · {b.address || 'sin dirección'} · {new Date(b.created_at).toLocaleDateString('es-BO')}
                            </p>
                            {b.phone && (
                              <a
                                href={`https://wa.me/${b.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11.5px] font-semibold underline"
                                style={{ color: '#1f7d68' }}
                              >
                                WhatsApp {b.phone}
                              </a>
                            )}
                            {faltantesParaPublicar(b).length > 0 && (
                              <p className="text-[11.5px] text-warn font-semibold mt-0.5">
                                Recomendado antes de aprobar (podés aprobar igual): {faltantesParaPublicar(b).map((f) => f.texto).join(', ')}
                              </p>
                            )}
                            {sugerenciaBeneficio(b, activeBenefits[b.id] ?? 0) && (
                              <p className="text-[11.5px] text-muted mt-0.5">Sin beneficios activos todavía (se puede aprobar igual)</p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setPreviewing(b)}
                              className="bg-white border border-line text-text rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                            >
                              Ver ficha
                            </button>
                            <button
                              onClick={() => approveBusiness(b.id)}
                              disabled={savingId === b.id}
                              className="bg-mint text-mint-dark rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(rejectingId === b.id ? null : b.id);
                                setRejectReason('');
                                setDeletingId(null);
                              }}
                              className="bg-[#F7F3FC] text-[#7C6A9C] rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                            >
                              Rechazar
                            </button>
                            <button
                              onClick={() => {
                                setDeletingId(deletingId === b.id ? null : b.id);
                                setRejectingId(null);
                              }}
                              className="rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                              style={{ background: '#FDEEE2', color: '#C0392B' }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        {rejectingId === b.id && (
                          <div className="mt-2.5">
                            <label className="block text-[12px] font-semibold text-text mb-1">
                              ¿Por qué lo rechazás? Le llega por correo y lo ve en su panel; lo corrige y lo vuelve a enviar.
                            </label>
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              rows={2}
                              placeholder="Ej: La foto de portada no se ve bien. Subí una foto del local o de tus productos."
                              className="w-full bg-white border border-line rounded-[10px] px-3 py-2 text-[13px] text-text"
                            />
                            <div className="flex gap-2 mt-1.5">
                              <button
                                onClick={() => rejectBusiness(b.id)}
                                disabled={!rejectReason.trim() || savingId === b.id}
                                className="rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold disabled:opacity-50"
                                style={{ background: '#241748', color: '#7FEDC4' }}
                              >
                                Rechazar y avisar
                              </button>
                              <button
                                onClick={() => setRejectingId(null)}
                                className="bg-[#F7F3FC] text-[#7C6A9C] rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                        {deletingId === b.id && confirmDelete(b)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rejected.length > 0 && (
                <div className="bg-card border border-line rounded-2xl p-4 mb-7">
                  <p className="font-bold text-[13.5px] mb-2.5">Rechazados, esperando corrección ({rejected.length})</p>
                  <div className="flex flex-col gap-2">
                    {rejected.map((b) => (
                      <div key={b.id} className="border border-line rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold text-text text-[13px]">{b.name}</p>
                            <p className="text-muted text-[11.5px]">
                              Rechazado el {new Date(b.rejected_at as string).toLocaleDateString('es-BO')}
                            </p>
                            <p className="text-[12px] mt-1" style={{ color: '#8A5A2E' }}>
                              Motivo: {b.rejection_reason}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setPreviewing(b)}
                              className="bg-white border border-line text-text rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                            >
                              Ver ficha
                            </button>
                            <button
                              onClick={() => approveBusiness(b.id)}
                              disabled={savingId === b.id}
                              className="bg-mint text-mint-dark rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                            >
                              Aprobar igual
                            </button>
                            <button
                              onClick={() => setDeletingId(deletingId === b.id ? null : b.id)}
                              className="rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold"
                              style={{ background: '#FDEEE2', color: '#C0392B' }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        {deletingId === b.id && confirmDelete(b)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {listLoading ? (
          <p className="text-muted text-[13.5px]">Cargando…</p>
        ) : businesses.length === 0 ? (
          <p className="text-muted text-[13.5px]">Todavía no hay comercios registrados.</p>
        ) : (
          <div className="bg-card border border-line rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[840px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Espacios pub.</th>
                  <th className="px-4 py-3 font-semibold text-muted text-[11.5px] uppercase tracking-wide">Fundador</th>
                  <th className="px-4 py-3" />
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
                      ) : b.rejected_at ? (
                        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: '#FDEEE2', color: '#C0392B' }}>
                          Rechazado
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
                    <td className="px-4 py-3">
                      {b.founder ? (
                        <span className="text-mint-dark bg-mint/15 rounded-full px-2.5 py-1 text-[11px] font-bold">
                          {b.founder_until ? `Hasta ${new Date(b.founder_until).toLocaleDateString('es-BO')}` : 'Empieza al lanzar'}
                        </span>
                      ) : (
                        <button
                          onClick={() => makeFounder(b.id)}
                          disabled={savingId === b.id}
                          className="rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-bold bg-[#F7F3FC] text-[#7C6A9C]"
                        >
                          Hacer fundador
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deletingId === b.id ? (
                        <span className="inline-flex items-center gap-2 text-[11.5px]">
                          <button
                            onClick={() => deleteBusiness(b)}
                            disabled={savingId === b.id}
                            className="rounded-[8px] px-2.5 py-1.5 font-bold text-white disabled:opacity-50"
                            style={{ background: '#C0392B' }}
                          >
                            Sí, eliminar
                          </button>
                          <button onClick={() => setDeletingId(null)} className="text-muted font-semibold">
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeletingId(b.id)}
                          className="rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-bold"
                          style={{ background: '#FDEEE2', color: '#C0392B' }}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </AdminShell>
  );
}
