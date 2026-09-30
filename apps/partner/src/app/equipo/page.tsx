'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';

interface Staff {
  id: string;
  email: string;
  user_id: string | null;
  created_at: string;
}

export default function EquipoPage() {
  const { business, role } = useBusinessAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('business_staff')
      .select('id, email, user_id, created_at')
      .eq('business_id', business.id)
      .order('created_at');
    setStaff((data as Staff[]) ?? []);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!business) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.rpc('add_staff', { p_business_id: business.id, p_email: email });
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    setEmail('');
    setMsg({ ok: true, text: 'Listo. Ahora tu empleado tiene que crear su cuenta en caminaapp.com/unirme con ese mismo correo.' });
    load();
  }

  async function remove(id: string) {
    await supabase.rpc('remove_staff', { p_staff_id: id });
    load();
  }

  if (role === 'cashier') return <DashboardShell>{null}</DashboardShell>;

  return (
    <DashboardShell>
      <TopBar title="Mi equipo" subtitle="Dale acceso a tus cajeros para que confirmen canjes sin usar tu contraseña." />
      <div className="max-w-[560px]">
        <div className="bg-card border border-line rounded-2xl p-4 mb-5 text-[13px] leading-5">
          <p className="font-bold mb-1">Cómo funciona</p>
          <ol className="text-muted list-decimal pl-4 flex flex-col gap-0.5">
            <li>Escribí el correo de tu empleado y tocá &ldquo;Invitar&rdquo;.</li>
            <li>Tu empleado entra a <strong>caminaapp.com/unirme</strong>, crea su cuenta con ese correo y confirma el mail.</li>
            <li>Al entrar, ve <strong>solo la pantalla de canjes</strong>: escribe el código y confirma. No ve estadísticas ni planes.</li>
          </ol>
          <p className="text-muted mt-1.5">Podés tener hasta 5 cajeros y sacarles el acceso cuando quieras.</p>
        </div>

        <div className="bg-card border border-line rounded-2xl p-5 mb-5">
          <label className="block mb-3">
            <span className="block text-[12.5px] font-semibold mb-1.5">Correo del empleado</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="empleado@correo.com"
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </label>
          {msg && <p className={`text-[12.5px] mb-3 ${msg.ok ? 'text-mint-dark' : 'text-warn'}`}>{msg.text}</p>}
          <button
            onClick={add}
            disabled={saving || !email.includes('@')}
            className="w-full rounded-xl py-3 font-semibold text-[14px] disabled:opacity-50"
            style={{ background: '#241748', color: '#7FEDC4' }}
          >
            {saving ? 'Invitando…' : 'Invitar'}
          </button>
        </div>

        {staff.length > 0 && (
          <div className="bg-card border border-line rounded-2xl overflow-hidden">
            {staff.map((s, i) => (
              <div key={s.id} className={`p-4 flex items-center justify-between gap-3 ${i < staff.length - 1 ? 'border-b border-line' : ''}`}>
                <div className="min-w-0">
                  <p className="font-semibold text-[13.5px] truncate">{s.email}</p>
                  <p className="text-[11.5px]" style={{ color: s.user_id ? '#2E9E7C' : '#8A5A2E' }}>
                    {s.user_id ? 'Activo' : 'Invitado · falta que cree su cuenta'}
                  </p>
                </div>
                <button onClick={() => remove(s.id)} className="text-[12px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-white shrink-0">
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
