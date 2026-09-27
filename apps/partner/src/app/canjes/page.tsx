'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { supabase, type Redemption } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';

export default function CanjesPage() {
  const { business } = useBusinessAuth();
  const [codeInput, setCodeInput] = useState('');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);

  const loadRedemptions = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('redemptions')
      .select('id, code, status, created_at, confirmed_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setRedemptions((data as Redemption[]) ?? []);
  }, [business]);

  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  async function checkCode() {
    if (!business) return;
    const clean = codeInput.trim();
    if (clean.length !== 6) {
      setResult({ ok: false, msg: 'El código tiene que tener 6 dígitos.' });
      return;
    }
    setChecking(true);
    const { error } = await supabase.rpc('confirm_redemption_code', {
      p_business_id: business.id,
      p_code: clean,
    });
    setChecking(false);
    if (error) {
      setResult({ ok: false, msg: error.message });
    } else {
      setResult({ ok: true, msg: 'Código válido — entregá el beneficio.' });
      setCodeInput('');
      loadRedemptions();
    }
  }

  return (
    <DashboardShell>
      <TopBar title="Canjes" subtitle="Cada vez que un usuario te muestra su código, queda acá." />

      <div className="bg-auth-bg rounded-2xl p-5 mb-5 max-w-[480px]">
        <p className="text-white font-semibold text-sm mb-1">Confirmar código</p>
        <p className="text-auth-muted text-xs mb-3.5">
          Escribí el código de 6 dígitos que te muestra el cliente en su celular.
        </p>
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6));
              setResult(null);
            }}
            placeholder="000000"
            className="flex-1 bg-white text-text rounded-[10px] px-3.5 py-2.5 text-base tracking-[3px] text-center"
          />
          <button
            onClick={checkCode}
            disabled={checking}
            className="bg-mint text-mint-dark rounded-[10px] px-4.5 font-semibold text-[13px]"
          >
            Validar
          </button>
        </div>
        {result && (
          <div
            className="mt-3 flex items-center gap-2 rounded-[10px] px-3 py-2.5"
            style={{ background: result.ok ? 'rgba(127,237,196,0.16)' : 'rgba(242,152,92,0.16)' }}
          >
            {result.ok ? <Check size={15} color="#7FEDC4" /> : <X size={15} color="#F2985C" />}
            <span className="text-white text-[12.5px]">{result.msg}</span>
          </div>
        )}
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_100px] px-5 py-3 border-b border-line bg-bg">
          <span className="text-[11.5px] font-semibold text-muted">Código</span>
          <span className="text-[11.5px] font-semibold text-muted">Fecha</span>
          <span className="text-[11.5px] font-semibold text-muted">Hora</span>
          <span className="text-[11.5px] font-semibold text-muted">Estado</span>
        </div>
        {redemptions.map((r, i) => (
          <div
            key={r.id}
            className={`grid grid-cols-[1fr_1fr_1fr_100px] px-5 py-3.5 items-center ${i < redemptions.length - 1 ? 'border-b border-line' : ''}`}
          >
            <span className="text-[13.5px] font-semibold tracking-wide">{r.code}</span>
            <span className="text-[13px] text-muted">{new Date(r.created_at).toLocaleDateString('es-BO')}</span>
            <span className="text-[13px] text-muted">
              {new Date(r.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {r.status === 'confirmed' ? (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#2E9E7C]">
                <Check size={13} /> Confirmado
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
