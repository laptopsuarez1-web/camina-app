'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { supabase, type Redemption } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { mensajeError } from '@/lib/errors';

export default function CanjesPage() {
  const { business, role } = useBusinessAuth();
  const esCajero = role === 'cashier';
  const [codeInput, setCodeInput] = useState('');
  const [result, setResult] = useState<{ ok: boolean; msg: string; premio?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  // Código de 4 números del local: se lo dice al cliente en la caja y el cliente lo escribe en la app.
  const [localCode, setLocalCode] = useState<string | null>(null);
  // Sucursales (0134): cada una con su código. Sin sucursales (o sin la tabla) la lista queda vacía.
  const [branchCodes, setBranchCodes] = useState<{ id: string; name: string; code: string }[]>([]);
  const [changing, setChanging] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  // El bloque de 6 dígitos solo sirve si el local tiene premios online activos.
  const [hasOnline, setHasOnline] = useState(false);
  // Filtros de la lista (solo cambian lo que se ve; no tocan ningún canje).
  const [fEstado, setFEstado] = useState<'todos' | Redemption['status']>('todos');
  const [fPremio, setFPremio] = useState('todos');
  const [fBuscar, setFBuscar] = useState('');
  const [mostrar, setMostrar] = useState(30);

  const loadRedemptions = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('redemptions')
      .select('id, code, status, created_at, confirmed_at, benefit_id, loyalty_free, confirmed_via, benefit:benefits(name)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(300);
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
    Promise.all([
      supabase.from('business_branches').select('id, name').eq('business_id', business.id).order('created_at'),
      supabase.from('business_branch_codes').select('branch_id, code').eq('business_id', business.id),
    ]).then(([br, cod]) => {
      if (br.error || cod.error) return setBranchCodes([]);
      const codes = new Map(((cod.data ?? []) as { branch_id: string; code: string }[]).map((c) => [c.branch_id, c.code]));
      setBranchCodes(((br.data ?? []) as { id: string; name: string }[]).flatMap((b) => (codes.has(b.id) ? [{ id: b.id, name: b.name, code: codes.get(b.id)! }] : [])));
    });
  }, [business]);

  useEffect(() => {
    if (!business) return;
    supabase
      .from('benefits')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('online', true)
      .eq('active', true)
      .then(({ count }) => setHasOnline((count ?? 0) > 0));
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
      const { data: b } = await supabase.from('benefits').select('name, with_purchase').eq('id', benefitId).maybeSingle();
      const bb = b as { name?: string; with_purchase?: string | null } | null;
      // Premio con tu compra: se recuerda que va con la compra, para cobrarla.
      premio = bb?.name ? (bb.with_purchase ? `${bb.name}, ${bb.with_purchase}` : bb.name) : undefined;
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

  const premios = useMemo(() => [...new Set(redemptions.map((r) => r.benefit?.name).filter(Boolean) as string[])].sort(), [redemptions]);
  const filtrados = useMemo(
    () =>
      redemptions.filter(
        (r) =>
          (fEstado === 'todos' || r.status === fEstado) &&
          (fPremio === 'todos' || r.benefit?.name === fPremio) &&
          (!fBuscar.trim() || (r.code ?? '').includes(fBuscar.trim())),
      ),
    [redemptions, fEstado, fPremio, fBuscar],
  );
  const ESTADO: Record<Redemption['status'], string> = { confirmed: 'Confirmado', pending: 'Pendiente', expired: 'Vencido', cancelled: 'Cancelado' };
  function descargarCsv() {
    const filas = [['Fecha', 'Hora', 'Premio', 'Código', 'Estado', 'Cómo se confirmó', 'Premio de tarjeta']].concat(
      filtrados.map((r) => {
        const d = new Date(r.created_at);
        return [
          d.toLocaleDateString('es-BO'),
          d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }),
          r.benefit?.name ?? '',
          r.confirmed_via === 'local_code' ? '' : (r.code ?? ''),
          ESTADO[r.status] ?? r.status,
          r.status === 'confirmed' ? (r.confirmed_via === 'local_code' ? 'Código del local' : 'Código del cliente') : '',
          r.loyalty_free ? 'Sí' : '',
        ];
      }),
    );
    const csv = '\ufeff' + filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `canjes-${(business?.name ?? 'camina').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell>
      <TopBar
        title={esCajero ? 'Validar canjes' : 'Canjes'}
        subtitle={esCajero ? `Entraste como cajero de ${business?.name ?? 'tu comercio'}. Aquí ves los canjes y validas los códigos.` : 'Cada canje queda aquí, con su premio y cómo se confirmó.'}
      />

      {hasOnline && <div className="bg-auth-bg rounded-2xl p-5 mb-5 max-w-[480px]">
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
            style={{ background: result.ok ? 'rgba(98,240,182,0.16)' : 'rgba(242,152,92,0.16)' }}
          >
            {result.ok ? <Check size={15} color="#62F0B6" className="shrink-0" /> : <X size={15} color="#F2985C" className="shrink-0" />}
            <span className="text-white text-[12.5px]">
              {result.msg}
              {result.premio && <strong className="block text-[16px] text-mint mt-0.5">{result.premio}</strong>}
            </span>
          </div>
        )}
      </div>}

      <div className="bg-card border border-line rounded-2xl p-5 mb-5 max-w-[480px]">
        <p className="font-semibold text-sm mb-1">{branchCodes.length > 0 ? `Código de ${business?.branch_label?.trim() || 'tu local principal'}` : 'Código de tu local'}</p>
        <p className="text-muted text-xs mb-3.5">
          {esCajero ? 'Dile este código al cliente en la caja. Lo escribe en la app, estando en el local, y el canje queda confirmado al instante.' : 'Dile este código al cliente en la caja. Lo escribe en la app, estando en tu local, y el canje queda confirmado al instante: no hace falta que abras el panel. Si se filtró, cámbialo cuando quieras.'}
        </p>
        <div className="flex items-center gap-3">
          <span aria-label={localCode ? `Código del local ${localCode.split('').join(' ')}` : 'Sin código'} className="flex-1 bg-bg rounded-[10px] px-3.5 py-2.5 text-[28px] font-extrabold tracking-[10px] text-center">
            {localCode ?? '····'}
          </span>
          {!esCajero && <button
            onClick={changeLocalCode}
            disabled={changing || !localCode}
            className="shrink-0 border border-line rounded-[10px] px-4 py-2.5 font-semibold text-[13px]"
          >
            {changing ? 'Cambiando…' : 'Cambiar código'}
          </button>}
        </div>
        {codeError && <p className="text-warn text-[12.5px] mt-2.5">{codeError}</p>}
        {branchCodes.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-line">
            <p className="font-semibold text-sm mb-1">Códigos de tus sucursales</p>
            <p className="text-muted text-xs mb-2.5">Cada sucursal tiene el suyo: el cliente escribe el de la sucursal donde está.{!esCajero && ' Se cambian en Sucursales.'}</p>
            <div className="flex flex-col gap-1.5">
              {branchCodes.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 bg-bg rounded-[10px] px-3.5 py-2">
                  <span className="text-[13px] font-semibold truncate">{b.name}</span>
                  <span aria-label={`Código ${b.code.split('').join(' ')}`} className="text-[20px] font-extrabold tracking-[6px] tabular-nums">{b.code}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="biz-filtros">
        <div className="biz-seg" role="group" aria-label="Estado">
          {(['todos', 'confirmed', 'pending', 'expired'] as const).map((e) => (
            <button key={e} type="button" aria-pressed={fEstado === e} className={fEstado === e ? 'is-on' : ''} onClick={() => setFEstado(e)}>
              {e === 'todos' ? 'Todos' : e === 'confirmed' ? 'Confirmados' : e === 'pending' ? 'Pendientes' : 'Vencidos'}
            </button>
          ))}
        </div>
        <select value={fPremio} onChange={(e) => setFPremio(e.target.value)} aria-label="Filtrar por premio" className="bg-card border border-line px-3 py-2 text-[13px]">
          <option value="todos">Todos los premios</option>
          {premios.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input value={fBuscar} onChange={(e) => setFBuscar(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Buscar código" aria-label="Buscar por código" className="bg-card border border-line px-3 py-2 text-[13px] w-[150px]" />
        <button type="button" onClick={descargarCsv} disabled={filtrados.length === 0} className="biz-btn-ghost ml-auto disabled:opacity-40">
          Descargar CSV
        </button>
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1.4fr_.9fr_96px] px-3 sm:px-5 py-3 border-b border-line bg-bg">
          <span className="text-[11.5px] font-semibold text-muted">Código</span>
          <span className="text-[11.5px] font-semibold text-muted">Premio</span>
          <span className="text-[11.5px] font-semibold text-muted">Fecha</span>
          <span className="text-[11.5px] font-semibold text-muted">Estado</span>
        </div>
        {filtrados.slice(0, mostrar).map((r, i, arr) => (
          <div
            key={r.id}
            className={`grid grid-cols-[1fr_1.4fr_.9fr_96px] px-3 sm:px-5 py-3.5 items-center biz-row ${i < arr.length - 1 ? 'border-b border-line' : ''}`}
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
              <span className="text-[11.5px] font-semibold leading-tight">
                <span className="biz-pill is-ok"><Check size={12} /> Confirmado</span>
                {r.confirmed_via === 'local_code' && <span className="block text-[10.5px] font-medium text-muted">código del local</span>}
              </span>
            ) : r.status === 'pending' ? (
              <span className="biz-pill">Pendiente</span>
            ) : (
              <span className="biz-pill is-off">
                <X size={12} /> {r.status === 'expired' ? 'Vencido' : 'Cancelado'}
              </span>
            )}
          </div>
        ))}
        {redemptions.length === 0 && <p className="text-muted text-[13px] p-5">Todavía no hay canjes. Cuando alguien canjee un premio en tu local, aparece aquí al instante.</p>}
        {redemptions.length > 0 && filtrados.length === 0 && <p className="text-muted text-[13px] p-5">Ningún canje coincide con estos filtros.</p>}
        {filtrados.length > mostrar && (
          <button type="button" onClick={() => setMostrar((m) => m + 30)} className="w-full py-3 text-[13px] font-semibold text-purple border-t border-line">
            Ver más canjes ({filtrados.length - mostrar})
          </button>
        )}
      </div>
    </DashboardShell>
  );
}
