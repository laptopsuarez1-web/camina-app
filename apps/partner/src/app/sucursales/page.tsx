'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, Clock, Store, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { HorarioEditor } from '@/components/HorarioEditor';
import { mensajeError } from '@/lib/errors';
import { parseUbicacion, esLinkCorto, resolverLinkMapa } from '@/lib/maps';
import { summarizeWeek, weekFromText, type WeekHours } from '@/lib/hours';

const MapPicker = dynamic(() => import('@/components/MapPicker').then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="h-[260px] rounded-[10px] border border-line bg-white" />,
});

// Sucursales del comercio (0133). En la app sale una sola ficha; cada persona ve la sucursal más cercana
// y puede elegir otra. Cada sucursal tiene su propio código de 4 números para los canjes.
const MAX_SUCURSALES = 20;

interface Sucursal {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  opening_hours: WeekHours | null;
}

type Form = { id: string | null; nombre: string; direccion: string; ubicacion: string; mismoHorario: boolean; semana: WeekHours };

const inputCls = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';
const btnPrincipal = { background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' };

export default function SucursalesPage() {
  const { session, business, role, refreshBusiness } = useBusinessAuth();
  const [lista, setLista] = useState<Sucursal[]>([]);
  const [codigos, setCodigos] = useState<Record<string, string>>({});
  const [cargado, setCargado] = useState(false);
  const [sinTabla, setSinTabla] = useState(false);
  const [nombrePrincipal, setNombrePrincipal] = useState('');
  const [msgPrincipal, setMsgPrincipal] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ubicacionMsg, setUbicacionMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!business) return;
    const [br, cod] = await Promise.all([
      supabase.from('business_branches').select('id, name, address, lat, lng, opening_hours').eq('business_id', business.id).order('created_at'),
      supabase.from('business_branch_codes').select('branch_id, code').eq('business_id', business.id),
    ]);
    if (br.error) {
      setSinTabla(true);
      setCargado(true);
      return;
    }
    setLista((br.data as Sucursal[]) ?? []);
    const map: Record<string, string> = {};
    for (const c of (cod.data ?? []) as { branch_id: string; code: string }[]) map[c.branch_id] = c.code;
    setCodigos(map);
    setCargado(true);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  // Al cargar (o cambiar de local) el campo toma el nombre guardado.
  const [labelBase, setLabelBase] = useState<string | null>(null);
  const labelGuardado = business?.branch_label ?? '';
  if (business && labelBase !== `${business.id}:${labelGuardado}`) {
    setLabelBase(`${business.id}:${labelGuardado}`);
    setNombrePrincipal(labelGuardado);
  }

  if (role === 'cashier' || !business) return <DashboardShell>{null}</DashboardShell>;

  const principalSinUbicacion = business.lat == null || business.lng == null;

  async function guardarNombrePrincipal() {
    if (!business) return;
    setMsgPrincipal(null);
    const { error } = await supabase.from('businesses').update({ branch_label: nombrePrincipal.trim() || null }).eq('id', business.id);
    if (error) {
      setMsgPrincipal({ ok: false, text: mensajeError(error) });
      return;
    }
    setMsgPrincipal({ ok: true, text: 'Guardado.' });
    if (session) await refreshBusiness(session.user.id, session.user.email);
  }

  function nueva() {
    setMsg(null);
    setUbicacionMsg(null);
    setForm({ id: null, nombre: '', direccion: '', ubicacion: '', mismoHorario: true, semana: business?.opening_hours ?? weekFromText(business?.hours_text ?? null) });
  }

  function editar(s: Sucursal) {
    setMsg(null);
    setUbicacionMsg(null);
    setForm({
      id: s.id,
      nombre: s.name,
      direccion: s.address ?? '',
      ubicacion: `${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}`,
      mismoHorario: !s.opening_hours,
      semana: s.opening_hours ?? business?.opening_hours ?? weekFromText(business?.hours_text ?? null),
    });
  }

  function usarMiUbicacion() {
    setUbicacionMsg(null);
    if (!navigator.geolocation) {
      setUbicacionMsg('Este navegador no permite obtener la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => (f ? { ...f, ubicacion: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` } : f));
        setUbicacionMsg('Listo: se tomó tu ubicación actual.');
      },
      () => setUbicacionMsg('No pudimos obtener tu ubicación. Permite el acceso o pega el link de Google Maps.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function resolverLink(text: string) {
    setUbicacionMsg('Buscando el punto de ese link…');
    const p = await resolverLinkMapa(text);
    if (p) {
      setForm((f) => (f ? { ...f, ubicacion: `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}` } : f));
      setUbicacionMsg('Listo: convertimos el link en el punto del mapa.');
    } else {
      setUbicacionMsg('No pudimos leer ese link. Prueba tocando el mapa en el lugar de la sucursal.');
    }
  }

  async function guardar() {
    if (!business || !form) return;
    setMsg(null);
    const nombre = form.nombre.trim();
    if (!nombre) {
      setMsg('Ponle un nombre a la sucursal (por ejemplo, "Av. Las Américas").');
      return;
    }
    let punto = parseUbicacion(form.ubicacion);
    if (!punto && esLinkCorto(form.ubicacion)) punto = await resolverLinkMapa(form.ubicacion);
    if (!punto) {
      setMsg('Marca en el mapa dónde está la sucursal.');
      return;
    }
    const semanaVacia = Object.values(form.semana).every((d) => !d);
    const datos = {
      name: nombre.slice(0, 60),
      address: form.direccion.trim().slice(0, 200) || null,
      lat: punto.lat,
      lng: punto.lng,
      opening_hours: form.mismoHorario || semanaVacia ? null : form.semana,
    };
    setSaving(true);
    const { error } = form.id
      ? await supabase.from('business_branches').update(datos).eq('id', form.id)
      : await supabase.from('business_branches').insert({ ...datos, business_id: business.id });
    setSaving(false);
    if (error) {
      setMsg(mensajeError(error));
      return;
    }
    setForm(null);
    load();
  }

  async function borrar(id: string) {
    setBorrando(null);
    const { error } = await supabase.from('business_branches').delete().eq('id', id);
    if (error) setMsg(mensajeError(error));
    load();
  }

  async function cambiarCodigo(id: string) {
    const { data, error } = await supabase.rpc('reset_branch_code', { p_branch_id: id });
    if (error) {
      setMsg(mensajeError(error));
      return;
    }
    if (typeof data === 'string') setCodigos((c) => ({ ...c, [id]: data }));
  }

  const lleno = lista.length >= MAX_SUCURSALES;

  return (
    <DashboardShell>
      <TopBar title="Sucursales" subtitle="Si tu negocio tiene más de un local, agrégalos aquí. En la app sale una sola ficha y cada persona ve el local más cercano." />
      <div className="max-w-[620px]">
        {sinTabla ? (
          <div className="bg-card border border-line rounded-2xl p-5 text-[13px]">Las sucursales se están activando. Vuelve a entrar en unos minutos.</div>
        ) : (
          <>
            <div className="bg-card border border-line rounded-2xl p-4 mb-5 text-[13px] leading-5">
              <p className="font-bold mb-1">Cómo funciona</p>
              <ul className="text-muted list-disc pl-4 flex flex-col gap-0.5">
                <li>Cada sucursal sale como un punto más en el mapa de Camina, todas con tu misma ficha.</li>
                <li>Cada sucursal tiene <strong>su propio código</strong> de 4 números para los canjes.</li>
                <li>Tus premios valen en todas. Si quieres, en cada premio eliges en qué sucursales y cuántos por día.</li>
              </ul>
            </div>

            {/* Local principal: la ubicación de "Mi local" */}
            <div className="bg-card border border-line rounded-2xl p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Store size={16} color="#7C6A9C" />
                <p className="font-bold text-[14px] m-0">Local principal</p>
              </div>
              <p className="text-[12.5px] text-muted mb-3 flex items-start gap-1.5">
                <MapPin size={13} className="mt-[3px] shrink-0" />
                <span>
                  {principalSinUbicacion ? 'Todavía no marcaste la ubicación.' : business.address || 'Ubicación marcada en el mapa.'}{' '}
                  <Link href="/perfil" className="text-purple font-semibold">Cambiar en Mi local</Link>
                </span>
              </p>
              <label className="block">
                <span className="block text-[12.5px] font-semibold mb-1.5">Nombre de esta sucursal (opcional)</span>
                <div className="flex gap-2">
                  <input value={nombrePrincipal} onChange={(e) => setNombrePrincipal(e.target.value.slice(0, 60))} placeholder="Ej.: Centro" className={inputCls} />
                  <button onClick={guardarNombrePrincipal} disabled={(business.branch_label ?? '') === nombrePrincipal} className="rounded-xl px-4 font-semibold text-[13.5px] disabled:opacity-50 shrink-0" style={btnPrincipal}>
                    Guardar
                  </button>
                </div>
              </label>
              <p className="text-[11.5px] text-muted mt-1.5">En la app se ve así: &ldquo;{business.name} {nombrePrincipal.trim() || 'Principal'}&rdquo;.</p>
              {msgPrincipal && <p className={`text-[12.5px] mt-1.5 ${msgPrincipal.ok ? 'text-mint-dark' : 'text-warn'}`}>{msgPrincipal.text}</p>}
            </div>

            {/* Sucursales */}
            {cargado && lista.length > 0 && (
              <div className="bg-card border border-line rounded-2xl overflow-hidden mb-5">
                {lista.map((s, i) => (
                  <div key={s.id} className={`p-4 ${i < lista.length - 1 ? 'border-b border-line' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-[14px] truncate m-0">{business.name} {s.name}</p>
                        {s.address && (
                          <p className="text-[12.5px] text-muted flex items-center gap-1 m-0 mt-0.5">
                            <MapPin size={12} className="shrink-0" /> <span className="truncate">{s.address}</span>
                          </p>
                        )}
                        <p className="text-[12px] text-muted flex items-center gap-1 m-0 mt-0.5">
                          <Clock size={12} className="shrink-0" />
                          <span className="truncate">{s.opening_hours ? summarizeWeek(s.opening_hours) || 'Sin horario' : 'Mismo horario que el local principal'}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted m-0">Código de canje</p>
                        <p className="font-bold text-[20px] tracking-[3px] m-0 tabular-nums">{codigos[s.id] ?? '····'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => editar(s)} className="text-[12px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-white flex items-center gap-1.5">
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => cambiarCodigo(s.id)} className="text-[12px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-white flex items-center gap-1.5">
                        <RefreshCw size={12} /> Cambiar código
                      </button>
                      {borrando === s.id ? (
                        <span className="flex items-center gap-2 text-[12px]">
                          <span className="font-semibold">¿Borrar esta sucursal?</span>
                          <button onClick={() => borrar(s.id)} className="font-semibold rounded-lg px-3 py-1.5 text-white" style={{ background: '#C0392B' }}>Sí, borrar</button>
                          <button onClick={() => setBorrando(null)} className="font-semibold border border-line rounded-lg px-3 py-1.5 bg-white">No</button>
                        </span>
                      ) : (
                        <button onClick={() => setBorrando(s.id)} className="text-[12px] font-semibold border border-line rounded-lg px-3 py-1.5 bg-white flex items-center gap-1.5">
                          <Trash2 size={12} /> Borrar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {msg && !form && <p className="text-[12.5px] text-warn mb-3">{msg}</p>}

            {form ? (
              <div className="bg-card border border-line rounded-2xl p-5 mb-5 flex flex-col gap-3.5">
                <p className="font-bold text-[15px] m-0">{form.id ? 'Editar sucursal' : 'Nueva sucursal'}</p>
                <label className="block">
                  <span className="block text-[12.5px] font-semibold mb-1.5">Nombre de la sucursal</span>
                  <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.slice(0, 60) })} placeholder="Ej.: Av. Las Américas" className={inputCls} />
                  <span className="block text-[11.5px] text-muted mt-1">En la app: &ldquo;{business.name} {form.nombre.trim() || '…'}&rdquo;.</span>
                </label>
                <label className="block">
                  <span className="block text-[12.5px] font-semibold mb-1.5">Dirección y referencia</span>
                  <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value.slice(0, 200) })} placeholder="Calle, número y una referencia" className={inputCls} />
                </label>
                <div>
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold mb-1.5">
                    <MapPin size={13} color="#7C6A9C" /> Ubicación en el mapa
                  </span>
                  <MapPicker
                    value={parseUbicacion(form.ubicacion)}
                    onChange={(p) => {
                      setForm((f) => (f ? { ...f, ubicacion: `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}` } : f));
                      setUbicacionMsg(null);
                    }}
                  />
                  <button type="button" onClick={usarMiUbicacion} className="text-purple font-semibold text-[12px] mt-2">
                    Usar mi ubicación actual (estando en la sucursal)
                  </button>
                  <input
                    value={form.ubicacion}
                    onChange={(e) => {
                      setForm({ ...form, ubicacion: e.target.value });
                      setUbicacionMsg(null);
                      if (esLinkCorto(e.target.value)) resolverLink(e.target.value);
                    }}
                    placeholder="O pega el link de Google Maps de la sucursal"
                    className={`${inputCls} mt-2`}
                  />
                  {ubicacionMsg && <p className="text-[12px] text-muted mt-1">{ubicacionMsg}</p>}
                </div>
                <div>
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold mb-1.5">
                    <Clock size={13} color="#7C6A9C" /> Horario
                  </span>
                  <label className="flex items-center gap-2 text-[13px] mb-2 cursor-pointer">
                    <input type="checkbox" checked={form.mismoHorario} onChange={(e) => setForm({ ...form, mismoHorario: e.target.checked })} />
                    Mismo horario que el local principal
                  </label>
                  {!form.mismoHorario && <HorarioEditor semana={form.semana} setSemana={(u) => setForm((f) => (f ? { ...f, semana: typeof u === 'function' ? u(f.semana) : u } : f))} />}
                </div>
                {msg && <p className="text-[12.5px] text-warn m-0">{msg}</p>}
                <div className="flex gap-2">
                  <button onClick={guardar} disabled={saving} className="flex-1 rounded-xl py-3 font-semibold text-[14px] disabled:opacity-50" style={btnPrincipal}>
                    {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Agregar sucursal'}
                  </button>
                  <button onClick={() => { setForm(null); setMsg(null); }} className="rounded-xl px-5 py-3 font-semibold text-[14px] border border-line bg-white">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              cargado && (
                <button
                  onClick={nueva}
                  disabled={lleno}
                  className="w-full rounded-xl py-3 font-semibold text-[14px] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={btnPrincipal}
                >
                  <Plus size={16} /> {lleno ? `Ya tienes ${MAX_SUCURSALES} sucursales (el máximo)` : 'Agregar sucursal'}
                </button>
              )
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
