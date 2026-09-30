'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';

interface Report {
  id: string;
  kind: 'message' | 'photo' | 'user';
  reason: string;
  snapshot: string | null;
  created_at: string;
  reporter_name: string | null;
  target_user_id: string;
  target_name: string | null;
  suspended: boolean;
  message_id: string | null;
}

const KIND: Record<Report['kind'], string> = { message: 'Mensaje', photo: 'Foto de perfil', user: 'Usuario' };

export default function AdminReportesPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('pending_reports');
    setRows((data as Report[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: 'delete_content' | 'suspend_user' | 'dismiss') {
    setMsg(null);
    const { error } = await supabase.rpc('admin_resolve_report', { p_id: id, p_action: action });
    if (error) setMsg(error.message);
    load();
  }

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Reportes</h1>
      <p className="text-muted text-[13.5px] mb-5 max-w-[620px]">
        Mensajes y fotos que reportaron las personas. Borrá el contenido, suspendé a quien lo publicó o descartá el
        reporte. Apple y Google piden responder rápido: revisá esta lista todos los días.
      </p>
      {msg && <p className="text-warn text-[12.5px] mb-3">{msg}</p>}
      <div className="max-w-[720px] flex flex-col gap-2.5">
        {rows.length === 0 && <p className="text-muted text-[13px]">No hay reportes pendientes. 🎉</p>}
        {rows.map((r) => (
          <div key={r.id} className="bg-card border border-line rounded-xl p-4">
            <p className="text-[12px] text-muted mb-1">
              {KIND[r.kind]} · motivo: <strong>{r.reason}</strong> · {new Date(r.created_at).toLocaleString('es-BO')}
            </p>
            <p className="text-[13px] mb-1">
              De <strong>{r.target_name ?? 'usuario'}</strong> · reportó {r.reporter_name ?? 'alguien'}
            </p>
            {r.snapshot && r.kind === 'message' && <p className="bg-bg rounded-lg px-3 py-2 text-[13px] mb-2">&ldquo;{r.snapshot}&rdquo;</p>}
            {r.snapshot && r.kind === 'photo' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.snapshot} alt="foto reportada" className="w-24 h-24 rounded-xl object-cover mb-2" />
            )}
            <div className="flex gap-2 flex-wrap">
              {r.kind !== 'user' && (
                <button onClick={() => act(r.id, 'delete_content')} className="bg-mint text-mint-dark rounded-lg px-3.5 py-1.5 text-[12px] font-bold">
                  Borrar contenido
                </button>
              )}
              <button onClick={() => act(r.id, 'suspend_user')} className="rounded-lg px-3.5 py-1.5 text-[12px] font-bold" style={{ background: '#fdecec', color: '#a1382f' }}>
                Suspender persona
              </button>
              <button onClick={() => act(r.id, 'dismiss')} className="border border-line bg-white rounded-lg px-3.5 py-1.5 text-[12px] font-semibold">
                Descartar
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
