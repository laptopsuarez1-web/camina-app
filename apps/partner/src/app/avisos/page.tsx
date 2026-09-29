'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';

interface Campaign {
  id: string;
  title: string;
  body: string;
  radius_km: number;
  status: 'pending' | 'sent' | 'rejected';
  sent_count: number | null;
  created_at: string;
}

const STATUS: Record<Campaign['status'], { label: string; cls: string }> = {
  pending: { label: 'En revisión', cls: 'text-warn bg-warn-light' },
  sent: { label: 'Enviado', cls: 'text-mint-dark bg-mint/15' },
  rejected: { label: 'No aprobado', cls: 'text-[#a1382f] bg-[#fdecec]' },
};

export default function AvisosPage() {
  const { business } = useBusinessAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [radius, setRadius] = useState(1);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [list, setList] = useState<Campaign[]>([]);
  const locked = business?.plan !== 'paso_adelante';

  const load = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('nearby_campaigns')
      .select('id, title, body, radius_km, status, sent_count, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setList((data as Campaign[]) ?? []);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!business) return;
    setSending(true);
    setMsg(null);
    const { error } = await supabase.rpc('request_nearby_campaign', {
      p_business_id: business.id,
      p_title: title,
      p_body: body,
      p_radius_km: radius,
    });
    setSending(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    setTitle('');
    setBody('');
    setMsg({ ok: true, text: 'Listo: lo revisamos y, si está todo bien, se envía a las personas que estén cerca.' });
    load();
  }

  return (
    <DashboardShell>
      <TopBar title="Avisos cercanos" subtitle="Mandá una notificación a quienes caminan cerca de tu local." />

      {locked ? (
        <div className="bg-card border border-line rounded-2xl p-6 max-w-[520px]">
          <p className="font-bold text-[15px] mb-1.5">Los avisos cercanos son del plan Paso Adelante</p>
          <p className="text-muted text-[13px] leading-5 mb-4">
            Con Paso Adelante podés avisar a las personas que están cerca de tu local, por ejemplo cuando tenés una promoción del día.
          </p>
          <Link href="/plan" className="inline-block bg-mint text-mint-dark rounded-[10px] px-4 py-2.5 font-semibold text-[13px]">
            Ver planes
          </Link>
        </div>
      ) : (
        <div className="max-w-[560px]">
          <div className="bg-card border border-line rounded-2xl p-5 mb-5">
            <label className="block mb-3.5">
              <span className="block text-[12.5px] font-semibold mb-1.5">Título (máx. 40 letras)</span>
              <input
                value={title}
                maxLength={40}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: ¡Hoy 2x1 en cafés! ☕"
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
            </label>
            <label className="block mb-3.5">
              <span className="block text-[12.5px] font-semibold mb-1.5">Mensaje (máx. 120 letras)</span>
              <textarea
                value={body}
                maxLength={120}
                rows={3}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Mostrá tu código de Camina en el local hasta las 19:00."
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
              <span className="text-[11px] text-muted">{body.length}/120</span>
            </label>
            <label className="block mb-4">
              <span className="block text-[12.5px] font-semibold mb-1.5">A cuánta distancia de tu local</span>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              >
                <option value={0.5}>500 metros</option>
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={3}>3 km</option>
              </select>
            </label>

            {(title || body) && (
              <div className="bg-bg border border-line rounded-xl p-3 mb-4">
                <p className="text-[11px] text-muted mb-1">Así lo van a ver:</p>
                <p className="font-bold text-[13.5px]">{title || 'Título'}</p>
                <p className="text-[12.5px] text-muted">{body || 'Mensaje'}</p>
              </div>
            )}

            <button
              onClick={submit}
              disabled={sending || title.trim().length < 3 || body.trim().length < 5}
              className="w-full bg-auth-bg text-mint rounded-xl py-3 font-semibold text-[14px] disabled:opacity-50"
            >
              {sending ? 'Enviando…' : 'Pedir el aviso'}
            </button>
            {msg && <p className={`text-[12.5px] mt-3 ${msg.ok ? 'text-mint-dark' : 'text-[#a1382f]'}`}>{msg.text}</p>}
            <p className="text-[11.5px] text-muted mt-3 leading-4">
              Reglas: hasta 3 avisos por mes. Cada aviso se revisa antes de salir y solo llega a quienes los tienen activados,
              entre las 8:00 y las 21:00, con un máximo de 1 aviso por persona por semana.
            </p>
          </div>

          {list.length > 0 && (
            <div className="bg-card border border-line rounded-2xl overflow-hidden">
              {list.map((c, i) => (
                <div key={c.id} className={`p-4 ${i < list.length - 1 ? 'border-b border-line' : ''}`}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="font-semibold text-[13.5px]">{c.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS[c.status].cls}`}>
                      {STATUS[c.status].label}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-muted">{c.body}</p>
                  <p className="text-[11px] text-muted mt-1">
                    {new Date(c.created_at).toLocaleDateString('es-BO')} · {c.radius_km} km
                    {c.status === 'sent' && c.sent_count != null ? ` · llegó a ${c.sent_count} personas` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
