'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { supabase, type Redemption } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { mensajeError } from '@/lib/errors';

export default function CanjesPage() {
  const { business } = useBusinessAuth();
  const [codeInput, setCodeInput] = useState('');
  const [result, setResult] = useState<{ ok: boolean; msg: string; premio?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  // Código de 4 números del local: se lo dice al cliente en la caja y el cliente lo escribe en la app.
  const [localCode, setLocalCode] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const loadRedemptions = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('redemptions')
      .select('id, code, status, created_at, confirmed_at, benefit_id, loyalty_free, confirmed_via, benefit:benefits(name)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setRedemptions((data as unknown as Redemption[]) ?? []);
  }, [business]);

  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  useEffect(() => {
    if (!business) return;
    supabase
      .from('business_local_codes')
      .select('code')
      .eq('business_id', business.id)
      .maybeSingle()
      .then(({ data }) => setLocalCode(data?.code ?? null));
  }, [business]);

  async function changeLocalCode() {
    if (!business || changing) return;
    if (!window.confirm('¿Cambiar el código del local? El anterior deja de servir y tienes que avisarle el nuevo a tu equipo.')) return;
    setChanging(true);
    setCodeError(null);
    const { data, error } = await supabase.rpc('reset_local_code', { p_business_id: business.id });
    setChanging(false);
    if (error) setCodeError(mensajeError(error));
    else setLocalCode(data as string);
  }

  async function checkCode() {
    if (!business) return;
    const clean = codeInput.trim();
    if (clean.length !== 6) {
      setResult({ ok: false, msg: 'El código tiene que tener 6 dígitos.' });
      return;
    }
    setChecking(true);
    const { data, error } = await supabase.rpc('confirm_redemption_code', {
      p_business_id: business.id,
      p_code: clean,
    });
    if (error) {
      setChecking(false);
      setResult({ ok: false, msg: mensajeError(error) });
      return;
    }
    // Se muestra qué premio corresponde a este código, para no entregar otro por error.
    const benefitId = (data as { benefit_id?: string } | null)?.benefit_id;
    const conTarjeta = !!(data as { loyalty_free?: boolean } | null)?.loyalty_free;
    let premio: string | undefined;
    if (benefitId) {
      const { data: b } = await supabase.from('benefits').select('name').eq('id', benefitId).maybeSingle();
      premio = b?.name ?? undefined;
    }
    setChecking(false);
    setResult({
      ok: true,
      msg: conTarjeta
        ? `Código ${clean} válido. Canje con tarjeta de fidelidad: este premio va gratis. Entrega:`
        : premio ? `Código ${clean} válido. Entrega:` : `Código ${clean} válido. Entrega el beneficio.`,
      premio,
    });
    setCodeInput('');
    loadRedemptions();
  }

  return (
    <DashboardShell>
      <TopBar title="Canjes" subtitle="Cada canje queda aquí, con su premio y cómo se confirmó." />

      <div className="bg-auth-bg rounded-2xl p-5 mb-5 max-w-[480px]">
        <p className="text-white font-semibold text-sm mb-1">Confirmar código de 6 dígitos</p>
        <p className="text-auth-muted text-xs mb-3.5">
          Solo para premios online (WhatsApp y redes) o clientes con una versión anterior de la app. Los canjes en tu local se confirman solos con el código de 4 números.
        </p>
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6));
              setResult(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && checkCode()}
            inputMode="numeric"
            aria-label="Código de 6 dígitos"
            placeholder="000000"
            className="flex-1 min-w-0 w-full bg-white text-text rounded-[10px] px-3.5 py-2.5 text-base tracking-[3px] text-center"
          />
          <button
            onClick={checkCode}
            disabled={checking}
            className="shrink-0 bg-mint text-mint-dark rounded-[10px] px-4.5 font-semibold text-[13px]"
          >
            {checking ? 'Validando…' : 'Validar'}
          </button>
        </div>
        {result && (
          <div
            className="mt-3 flex items-center gap-2 rounded-[10px] px-3 py-2.5"
            style={{ background: result.ok ? 'rgba(127,237,196,0.16)' : 'rgba(242,152,92,0.16)' }}
          >
            {result.ok ? <Check size={15} color="#7FEDC4" className="shrink-0" /> : <X size={15} color="#F2985C" className="shrink-0" />}
            <span className="text-white text-[12.5px]">
              {result.msg}
              {result.premio && <strong className="block text-[16px] text-mint mt-0.5">{result.premio}</strong>}
            </span>
          </div>
        )}
      </div>

      <div className="bg-card border border-line rounded-2xl p-5 mb-5 max-w-[480px]">
        <p className="font-semibold text-sm mb-1">Código de tu local</p>
        <p className="text-muted text-xs mb-3.5">
          Decile este código al cliente en la caja. Lo escribe en la app, estando en tu local, y el canje queda confirmado al instante: no hace
          falta que abras el panel. Si se filtró, cámbialo cuando quieras.
        </p>
        <div className="flex items-center gap-3">
          <span aria-label={localCode ? `Código del local ${localCode.split('').join(' ')}` : 'Sin código'} className="flex-1 bg-bg rounded-[10px] px-3.5 py-2.5 text-[28px] font-extrabold tracking-[10px] text-center">
            {localCode ?? '····'}
          </span>
          <button
            onClick={changeLocalCode}
            disabled={changing || !localCode}
            className="shrink-0 border border-line rounded-[10px] px-4 py-2.5 font-semibold text-[13px]"
          >
            {changing ? 'Cambiando…' : 'Cambiar código'}
          </button>
        </div>
        {codeError && <p className="text-warn text-[12.5px] mt-2.5">{codeError}</p>}
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1.4fr_.9fr_96px] px-3 sm:px-5 py-3 border-b border-line bg-bg">
          <span className="text-[11.5px] font-semibold text-muted">Código</span>
          <span className="text-[11.5px] font-semibold text-muted">Premio</span>
          <span className="text-[11.5px] font-semibold text-muted">Fecha</span>
          <span className="text-[11.5px] font-semibold text-muted">Estado</span>
        </div>
        {redemptions.map((r, i) => (
          <div
            key={r.id}
            className={`grid grid-cols-[1fr_1.4fr_.9fr_96px] px-3 sm:px-5 py-3.5 items-center ${i < redemptions.length - 1 ? 'border-b border-line' : ''}`}
          >
            <span className="text-[13.5px] font-semibold tracking-wide">{r.confirmed_via === 'local_code' ? '—' : r.code}</span>
            <span className="text-[13px] truncate pr-2">
              {r.benefit?.name ?? '—'}
              {r.loyalty_free && <span className="ml-1.5 text-[10.5px] font-bold rounded-full px-2 py-0.5" style={{ background: '#FFF4D6', color: '#8F6307' }}>Premio de tarjeta</span>}
            </span>
            <span className="text-[12.5px] text-muted leading-tight">
              {new Date(r.created_at).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
              <br />
              {new Date(r.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            {r.status === 'confirmed' ? (
              <span className="text-[11.5px] font-semibold text-[#2E9E7C] leading-tight">
                <span className="inline-flex items-center gap-1"><Check size={13} /> Confirmado</span>
                {r.confirmed_via === 'local_code' && <span className="block text-[10.5px] font-medium text-muted">código del local</span>}
              </span>
            ) : r.status === 'pending' ? (
              <span className="text-[11.5px] font-semibold text-muted">Pendiente</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-warn">
                <X size={13} /> {r.status === 'expired' ? 'Vencido' : 'Cancelado'}
              </span>
            )}
          </div>
        ))}
        {redemptions.length === 0 && <p className="text-muted text-[13px] p-5">Todavía no hay canjes.</p>}
      </div>
    </DashboardShell>
  );
}
