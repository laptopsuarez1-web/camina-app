'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';

interface Device {
  device_id: string;
  accounts: number;
  names: string;
  last_seen: string;
}
interface Ref {
  referrer_name: string;
  referred_name: string;
  created_at: string;
}

export default function AdminAlertasPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [refs, setRefs] = useState<Ref[]>([]);

  async function release(deviceId: string) {
    if (!window.confirm('¿Liberar este celular? La cuenta dueña lo pierde y la primera que vuelva a entrar desde ahí se queda con él.')) return;
    const { error } = await supabase.rpc('admin_release_device', { p_device_id: deviceId });
    if (error) {
      window.alert('No se pudo liberar el celular.');
      return;
    }
    setDevices((list) => list.filter((d) => d.device_id !== deviceId));
  }

  useEffect(() => {
    supabase.rpc('flagged_devices').then(({ data }) => setDevices((data as Device[]) ?? []));
    supabase.rpc('suspicious_referrals').then(({ data }) => setRefs((data as Ref[]) ?? []));
  }, []);

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Alertas de cuentas repetidas</h1>
      <p className="text-muted text-[13.5px] mb-5 max-w-[620px]">
        Cada celular suma pasos para una sola cuenta: la primera que lo usó. Las demás cuentas que entran desde ahí
        quedan bloqueadas para sumar pasos y Puntos. Si alguien cambió de cuenta a propósito y lo pidió, libera el celular.
      </p>
      <div className="max-w-[720px] flex flex-col gap-5">
        <section>
          <h2 className="font-bold text-[15px] mb-2">Celulares con más de una cuenta ({devices.length})</h2>
          <div className="bg-card border border-line rounded-xl overflow-hidden">
            {devices.length === 0 && <p className="text-muted text-[13px] p-4">Nada por ahora.</p>}
            {devices.map((d, i) => (
              <div key={d.device_id} className={`p-3.5 text-[13px] ${i < devices.length - 1 ? 'border-b border-line' : ''}`}>
                <p className="font-semibold">{d.accounts} cuentas: {d.names}</p>
                <p className="text-muted text-[11.5px]">Última vez: {new Date(d.last_seen).toLocaleDateString('es-BO')}</p>
                <button type="button" onClick={() => release(d.device_id)} className="mt-1.5 text-[12px] font-semibold text-primary">
                  Liberar celular
                </button>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-bold text-[15px] mb-2">Invitaciones entre cuentas del mismo celular ({refs.length})</h2>
          <div className="bg-card border border-line rounded-xl overflow-hidden">
            {refs.length === 0 && <p className="text-muted text-[13px] p-4">Nada por ahora.</p>}
            {refs.map((r, i) => (
              <div key={i} className={`p-3.5 text-[13px] ${i < refs.length - 1 ? 'border-b border-line' : ''}`}>
                <strong>{r.referrer_name}</strong> invitó a <strong>{r.referred_name}</strong>
                <span className="text-muted text-[11.5px]"> · {new Date(r.created_at).toLocaleDateString('es-BO')}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
