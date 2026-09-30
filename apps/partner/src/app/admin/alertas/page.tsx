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

  useEffect(() => {
    supabase.rpc('flagged_devices').then(({ data }) => setDevices((data as Device[]) ?? []));
    supabase.rpc('suspicious_referrals').then(({ data }) => setRefs((data as Ref[]) ?? []));
  }, []);

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Alertas de cuentas repetidas</h1>
      <p className="text-muted text-[13.5px] mb-5 max-w-[620px]">
        Revisalo una vez por semana. Varias cuentas en un mismo celular no siempre son trampa (una familia puede
        compartirlo), pero si además se invitan entre sí o suman puntos parecidos, conviene actuar.
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
