'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Mail, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminShell } from '@/components/AdminShell';
import { mensajeError } from '@/lib/errors';

// Lista "Avísame cuando salga" de la portada (tabla avisame, 0127 + 0128). Solo la ven los admins.
// Sirve para avisar a cada persona cuando la app esté en las tiendas: por WhatsApp o por correo, como eligió.
type Fila = { id: string; canal: 'whatsapp' | 'email'; contacto: string; ciudad: string | null; origen: string; created_at: string; avisado_at: string | null };

const MENSAJE = '¡Hola! Te escribimos de Camina: la app ya está disponible. Descárgala y empieza a sumar Puntos con tus pasos 👟';

export default function AvisamePage() {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canal, setCanal] = useState<'todos' | 'whatsapp' | 'email'>('todos');
  const [estado, setEstado] = useState<'todos' | 'pendientes' | 'avisados'>('todos');
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    supabase
      .from('avisame')
      .select('id, canal, contacto, ciudad, origen, created_at, avisado_at')
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(({ data, error: e }) => {
        if (!vivo) return;
        if (e) {
          setError(/does not exist|schema cache|relation/i.test(e.message) ? 'falta-tabla' : mensajeError(e));
          setFilas([]);
          return;
        }
        setFilas((data as Fila[]) ?? []);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const vistas = useMemo(
    () => (filas ?? []).filter((f) => (canal === 'todos' || f.canal === canal) && (estado === 'todos' || (estado === 'avisados' ? !!f.avisado_at : !f.avisado_at))),
    [filas, canal, estado],
  );
  const total = filas?.length ?? 0;
  const wa = filas?.filter((f) => f.canal === 'whatsapp').length ?? 0;
  const pendientes = filas?.filter((f) => !f.avisado_at).length ?? 0;
  const porCiudad = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of filas ?? []) m.set(f.ciudad ?? 'Sin ciudad', (m.get(f.ciudad ?? 'Sin ciudad') ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [filas]);

  async function marcar(f: Fila) {
    setOcupado(f.id);
    const avisado_at = f.avisado_at ? null : new Date().toISOString();
    const { error: e } = await supabase.from('avisame').update({ avisado_at }).eq('id', f.id);
    setOcupado(null);
    if (e) return setError(mensajeError(e));
    setFilas((l) => (l ?? []).map((x) => (x.id === f.id ? { ...x, avisado_at } : x)));
  }

  async function borrar(f: Fila) {
    if (!window.confirm(`¿Borrar ${f.contacto} de la lista? No se puede deshacer.`)) return;
    setOcupado(f.id);
    const { error: e } = await supabase.from('avisame').delete().eq('id', f.id);
    setOcupado(null);
    if (e) return setError(mensajeError(e));
    setFilas((l) => (l ?? []).filter((x) => x.id !== f.id));
  }

  function csv() {
    const filasCsv = [['Fecha', 'Canal', 'Contacto', 'Ciudad', 'Avisado']].concat(
      vistas.map((f) => [new Date(f.created_at).toLocaleString('es-BO'), f.canal === 'whatsapp' ? 'WhatsApp' : 'Correo', f.contacto, f.ciudad ?? '', f.avisado_at ? new Date(f.avisado_at).toLocaleDateString('es-BO') : '']),
    );
    const texto = '﻿' + filasCsv.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'camina-lista-avisame.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell>
      <h1 className="text-[22px] font-bold text-text mb-1">Lista «Avísame»</h1>
      <p className="text-muted text-[13.5px] mb-6">Personas que dejaron su WhatsApp o su correo en caminaapp.com para que les avisemos cuando la app esté en su tienda.</p>

      {error === 'falta-tabla' ? (
        <div className="rounded-2xl px-5 py-4 text-[13.5px]" style={{ background: 'var(--c-warn-light)', color: 'var(--c-warn-text)' }}>
          <p className="font-bold mb-1">Falta crear la lista en la base de datos.</p>
          <p>Pega en el SQL Editor de Supabase el contenido de <b>supabase/migrations/0127_avisame_lista_espera.sql</b> y después el de <b>0128_avisame_admin.sql</b>. Desde ese momento el formulario de la portada empieza a guardar y la lista aparece aquí.</p>
        </div>
      ) : (
        <>
          {error && <p className="text-warn text-[13px] mb-3">{error}</p>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
            {[
              ['Anotados', total],
              ['Por WhatsApp', wa],
              ['Por correo', total - wa],
              ['Falta avisar', pendientes],
            ].map(([t, n]) => (
              <div key={t as string} className="bg-card border border-line rounded-2xl p-4">
                <p className="text-muted text-[12px]">{t}</p>
                <p className="text-[26px] font-extrabold leading-tight">{filas === null ? '—' : n}</p>
              </div>
            ))}
          </div>
          {porCiudad.length > 0 && (
            <p className="text-[12.5px] text-muted mb-4">
              {porCiudad.map(([c, n]) => `${c}: ${n}`).join(' · ')}
            </p>
          )}

          <div className="biz-filtros">
            <div className="biz-seg" role="group" aria-label="Canal">
              {(['todos', 'whatsapp', 'email'] as const).map((c) => (
                <button key={c} type="button" aria-pressed={canal === c} className={canal === c ? 'is-on' : ''} onClick={() => setCanal(c)}>
                  {c === 'todos' ? 'Todos' : c === 'whatsapp' ? 'WhatsApp' : 'Correo'}
                </button>
              ))}
            </div>
            <div className="biz-seg" role="group" aria-label="Estado">
              {(['todos', 'pendientes', 'avisados'] as const).map((e) => (
                <button key={e} type="button" aria-pressed={estado === e} className={estado === e ? 'is-on' : ''} onClick={() => setEstado(e)}>
                  {e === 'todos' ? 'Todos' : e === 'pendientes' ? 'Falta avisar' : 'Avisados'}
                </button>
              ))}
            </div>
            <button type="button" onClick={csv} disabled={vistas.length === 0} className="biz-btn-ghost ml-auto disabled:opacity-40">
              Descargar CSV
            </button>
          </div>

          <div className="bg-card border border-line rounded-2xl overflow-hidden">
            {filas === null ? (
              <p className="text-muted text-[13px] p-5">Cargando…</p>
            ) : vistas.length === 0 ? (
              <p className="text-muted text-[13px] p-5">{total === 0 ? 'Todavía nadie se anotó. Cuando alguien deje su contacto en la portada, aparece aquí.' : 'Nadie coincide con estos filtros.'}</p>
            ) : (
              vistas.map((f, i) => (
                <div key={f.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3.5 biz-row ${i < vistas.length - 1 ? 'border-b border-line' : ''}`}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--c-aqua-light)', color: 'var(--c-ok-text)' }}>
                    {f.canal === 'whatsapp' ? <MessageCircle size={15} /> : <Mail size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold truncate">{f.contacto}</p>
                    <p className="text-[12px] text-muted">
                      {new Date(f.created_at).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {f.ciudad ? ` · ${f.ciudad}` : ''}
                    </p>
                  </div>
                  {f.avisado_at ? <span className="biz-pill is-ok"><Check size={12} /> Avisado</span> : <span className="biz-pill">Falta avisar</span>}
                  <a
                    href={f.canal === 'whatsapp' ? `https://wa.me/${f.contacto.replace(/\D/g, '')}?text=${encodeURIComponent(MENSAJE)}` : `mailto:${f.contacto}?subject=${encodeURIComponent('Camina ya está disponible')}&body=${encodeURIComponent(MENSAJE)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="biz-btn-ghost"
                  >
                    {f.canal === 'whatsapp' ? 'Escribir' : 'Enviar correo'}
                  </a>
                  <button type="button" disabled={ocupado === f.id} onClick={() => void marcar(f)} className="biz-btn-ghost disabled:opacity-50">
                    {f.avisado_at ? 'Desmarcar' : 'Marcar avisado'}
                  </button>
                  <button type="button" disabled={ocupado === f.id} onClick={() => void borrar(f)} aria-label={`Borrar ${f.contacto}`} className="w-9 h-9 rounded-full flex items-center justify-center text-warn disabled:opacity-50">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
