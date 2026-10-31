'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';

type Cuenta = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  suspended: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  admin_account: boolean;
  owns_business: boolean;
};

type Accion = { id: string; kind: 'ban' | 'delete' };

// Cuentas de la app: buscar, banear / desbanear y eliminar. Todo se valida en el servidor (función admin-users + is_admin()).
export default function CuentasPage() {
  const [q, setQ] = useState('');
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  const buscar = useCallback(async (texto: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_users', { p_query: texto, p_limit: 50 });
    setLoading(false);
    if (error) {
      setMsg(/admin_list_users/i.test(error.message) ? 'Falta aplicar la migración 0069 en la base de datos.' : error.message);
      return;
    }
    setMsg(null);
    setCuentas((data as Cuenta[]) ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(q), 300);
    return () => clearTimeout(t);
  }, [q, buscar]);

  async function ejecutar(c: Cuenta, action: 'ban' | 'unban' | 'delete') {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, user_id: c.id, reason: motivo } });
    setBusy(false);
    const fallo = error?.message ?? (data as { error?: string } | null)?.error;
    if (fallo) {
      setMsg(fallo);
      return;
    }
    setAccion(null);
    setMotivo('');
    buscar(q);
  }

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Cuentas</h1>
      <p className="text-muted text-[13.5px] mb-5">
        Busca por nombre o correo. Banear corta las sesiones abiertas y no deja volver a entrar; eliminar borra la cuenta y sus datos para siempre.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre o correo"
        aria-label="Buscar cuentas"
        className="w-full max-w-[420px] bg-white border border-line rounded-[10px] px-3 py-2 text-[13px] text-text mb-4"
      />
      {msg && <p className="text-warn text-[12.5px] mb-3">{msg}</p>}
      {loading ? (
        <p className="text-muted text-[13.5px]">Cargando…</p>
      ) : cuentas.length === 0 ? (
        <p className="text-muted text-[13.5px]">No hay cuentas con ese dato.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cuentas.map((c) => (
            <div key={c.id} className="bg-card border border-line rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-text text-[13.5px]">
                    {c.full_name || 'Sin nombre'}
                    {c.banned_at && <span className="ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: '#FDEEE2', color: '#C0392B' }}>Baneada</span>}
                    {c.admin_account && <span className="ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-bold bg-mint/15 text-mint-dark">Equipo</span>}
                    {c.owns_business && <span className="ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-bold bg-[#F7F3FC] text-[#7C6A9C]">Dueño de comercio</span>}
                  </p>
                  <p className="text-muted text-[12px]">{c.email} · creada el {new Date(c.created_at).toLocaleDateString('es-BO')}</p>
                  {c.banned_at && c.ban_reason && <p className="text-[12px] mt-0.5" style={{ color: '#8A5A2E' }}>Motivo: {c.ban_reason}</p>}
                </div>
                {!c.admin_account && (
                  <div className="flex gap-2">
                    {c.banned_at ? (
                      <button onClick={() => ejecutar(c, 'unban')} disabled={busy} className="bg-mint text-mint-dark rounded-[8px] px-3 py-1.5 text-[12px] font-bold disabled:opacity-50">
                        Desbanear
                      </button>
                    ) : (
                      <button
                        onClick={() => { setAccion({ id: c.id, kind: 'ban' }); setMotivo(''); }}
                        className="rounded-[8px] px-3 py-1.5 text-[12px] font-bold"
                        style={{ background: '#FFF3D6', color: '#8A5A2E' }}
                      >
                        Banear
                      </button>
                    )}
                    <button
                      onClick={() => { setAccion({ id: c.id, kind: 'delete' }); setMotivo(''); }}
                      className="rounded-[8px] px-3 py-1.5 text-[12px] font-bold"
                      style={{ background: '#FDEEE2', color: '#C0392B' }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
              {accion?.id === c.id && accion.kind === 'ban' && (
                <div className="mt-2.5">
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo (queda guardado, la persona no lo ve)"
                    aria-label="Motivo del baneo"
                    className="w-full bg-white border border-line rounded-[10px] px-3 py-2 text-[13px] text-text"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => ejecutar(c, 'ban')} disabled={busy} className="rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold disabled:opacity-50" style={{ background: '#241748', color: '#7FEDC4' }}>
                      {busy ? 'Baneando…' : 'Banear cuenta'}
                    </button>
                    <button onClick={() => setAccion(null)} className="bg-[#F7F3FC] text-[#7C6A9C] rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold">Cancelar</button>
                  </div>
                </div>
              )}
              {accion?.id === c.id && accion.kind === 'delete' && (
                <div className="mt-2.5 rounded-xl px-3 py-2.5 text-[12px]" style={{ background: '#FDEEE2', color: '#8A5A2E' }}>
                  <p className="mb-2">
                    ¿Eliminar la cuenta de <b>{c.full_name || c.email}</b> para siempre? Se borran sus Puntos, canjes, grupos y mensajes
                    {c.owns_business ? ', y también su comercio' : ''}. No se puede deshacer.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => ejecutar(c, 'delete')} disabled={busy} className="rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-50" style={{ background: '#C0392B' }}>
                      {busy ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                    <button onClick={() => setAccion(null)} className="bg-[#F7F3FC] text-[#7C6A9C] rounded-[8px] px-3.5 py-1.5 text-[12px] font-bold">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
