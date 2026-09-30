'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, Phone, Instagram, Globe, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { ImageUpload } from '@/components/ImageUpload';
import { DAY_NAMES, emptyWeek, summarizeWeek, weekFromText, type WeekHours } from '@/lib/hours';

function firstOpen(w: WeekHours) {
  for (let i = 0; i < 7; i++) if (w[String(i)]) return i;
  return 0;
}

const CATEGORIAS = ['Café', 'Gastronomía', 'Entretenimiento', 'Fitness', 'Belleza', 'Compras', 'Salud', 'Servicios', 'Otro'];

export default function PerfilPage() {
  const { business, refreshBusiness, session } = useBusinessAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [direccion, setDireccion] = useState('');
  const [semana, setSemana] = useState<WeekHours>(emptyWeek());
  const [telefono, setTelefono] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [resenaUrl, setResenaUrl] = useState('');
  const [esVirtual, setEsVirtual] = useState(false);
  const [ciudad, setCiudad] = useState('Tarija');
  const [ciudades, setCiudades] = useState<string[]>(['Tarija']);
  const [ubicacion, setUbicacion] = useState('');
  const [ubicacionMsg, setUbicacionMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    supabase
      .from('cities')
      .select('name')
      .eq('active', true)
      .order('sort')
      .then(({ data }) => {
        if (data && data.length > 0) setCiudades(data.map((c) => c.name));
      });
  }, []);

  useEffect(() => {
    if (!business) return;
    setNombre(business.name);
    setCategoria(business.category);
    setDireccion(business.address ?? '');
    setSemana(business.opening_hours ?? weekFromText(business.hours_text));
    setTelefono(business.phone ?? '');
    setInstagram(business.instagram ?? '');
    setWebsite(business.website ?? '');
    setResenaUrl(business.google_review_url ?? '');
    setEsVirtual(business.is_virtual);
    setCiudad(business.city ?? 'Tarija');
    setUbicacion(business.lat != null && business.lng != null ? `${business.lat}, ${business.lng}` : '');
  }, [business]);

  // Acepta "-21.53, -64.73" o un link largo de Google Maps (…@-21.53,-64.73… o …!3d-21.53!4d-64.73…).
  function parseUbicacion(text: string): { lat: number; lng: number } | null {
    const t = text.trim();
    const m =
      t.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
      t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
      t.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/) ||
      t.match(/^(-?\d+\.\d+)\s*[,; ]\s*(-?\d+\.\d+)$/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }

  function usarMiUbicacion() {
    setUbicacionMsg(null);
    if (!navigator.geolocation) {
      setUbicacionMsg('Este navegador no permite obtener la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        setUbicacionMsg('Listo: se tomó tu ubicación actual. Guardá los cambios abajo.');
      },
      () => setUbicacionMsg('No pudimos obtener tu ubicación. Permití el acceso o pegá el link de Google Maps.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleSave() {
    if (!business) return;
    const punto = esVirtual || !ubicacion.trim() ? null : parseUbicacion(ubicacion);
    if (!esVirtual && ubicacion.trim() && !punto) {
      setUbicacionMsg('No entendimos esa ubicación. Pegá el link largo de Google Maps o las coordenadas, por ejemplo: -21.5355, -64.7296');
      return;
    }
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from('businesses')
      .update({
        name: nombre.trim(),
        category: categoria,
        address: esVirtual ? null : direccion.trim(),
        lat: esVirtual ? null : punto ? punto.lat : null,
        lng: esVirtual ? null : punto ? punto.lng : null,
        hours_text: summarizeWeek(semana),
        opening_hours: semana,
        phone: telefono.trim(),
        instagram: instagram.trim() || null,
        website: website.trim() || null,
        google_review_url: resenaUrl.trim() || null,
        is_virtual: esVirtual,
        city: ciudad,
      })
      .eq('id', business.id);
    setSaving(false);
    if (!error && session) {
      await refreshBusiness(session.user.id, session.user.email);
      setSaved(true);
    }
  }

  async function handlePhotoUploaded(field: 'logo_url' | 'cover_url', url: string) {
    if (!business || !session) return;
    await supabase.from('businesses').update({ [field]: url }).eq('id', business.id);
    await refreshBusiness(session.user.id, session.user.email);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const { error } = await supabase.functions.invoke('delete-business-account');
    if (error) {
      setDeleting(false);
      alert('No pudimos eliminar tu cuenta. Intentá de nuevo o escribinos.');
      return;
    }
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <DashboardShell>
      <TopBar title="Perfil del local" subtitle="Esto es lo que ven los usuarios cuando entran a tu ficha." />

      <div className="flex flex-wrap gap-5 max-w-[620px]">
        <div className="flex-1 min-w-0 flex flex-col gap-3.5">
          <div className="flex gap-3.5">
            {business && (
              <>
                <ImageUpload
                  bucket="business-logos"
                  path={`${business.id}/logo`}
                  value={business.logo_url}
                  onUploaded={(url) => handlePhotoUploaded('logo_url', url)}
                  label="Logo"
                  shape="circle"
                />
                <div className="flex-1 min-w-0">
                  <ImageUpload
                    bucket="business-logos"
                    path={`${business.id}/cover`}
                    value={business.cover_url}
                    onUploaded={(url) => handlePhotoUploaded('cover_url', url)}
                    label="Foto de portada"
                    shape="wide"
                  />
                </div>
              </>
            )}
          </div>

          <Field label="Nombre comercial">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Categoría">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            >
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={esVirtual} onChange={(e) => setEsVirtual(e.target.checked)} className="w-4 h-4" />
            Es un emprendimiento virtual (no tengo local físico)
          </label>

 <Field label="Ciudad">
            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            >
              {ciudades.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>

          {!esVirtual && (
            <Field label="Dirección" icon={<MapPin size={13} color="#7C6A9C" />}>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
            </Field>
          )}
          {!esVirtual && (
            <Field label="Ubicación en el mapa" icon={<MapPin size={13} color="#7C6A9C" />}>
              <input
                value={ubicacion}
                onChange={(e) => {
                  setUbicacion(e.target.value);
                  setUbicacionMsg(null);
                }}
                placeholder="Pegá el link de Google Maps o las coordenadas"
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px]">
                <button type="button" onClick={usarMiUbicacion} className="text-purple font-semibold">
                  Usar mi ubicación actual (estando en el local)
                </button>
                {(() => {
                  const p = parseUbicacion(ubicacion);
                  return p ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted underline"
                    >
                      Ver ese punto en Google Maps
                    </a>
                  ) : null;
                })()}
              </div>
              <p className="text-[11.5px] text-muted mt-1.5 leading-4">
                {ubicacion.trim()
                  ? 'Este punto es donde aparece tu local en el mapa de Camina y a donde lleva el botón de dirección.'
                  : 'Sin ubicación tu local no aparece en el mapa. En Google Maps, mantené apretado el lugar de tu local y copiá los números que salen arriba.'}
              </p>
              {ubicacionMsg && <p className="text-[12px] text-[#a1382f] mt-1">{ubicacionMsg}</p>}
            </Field>
          )}
          <Field label="Horario de atención" icon={<Clock size={13} color="#7C6A9C" />}>
            <div className="bg-white border border-line rounded-[10px] p-3 flex flex-col gap-2">
              {DAY_NAMES.map((name, i) => {
                const d = semana[String(i)];
                return (
                  <div key={name} className="flex flex-wrap items-center gap-2.5 text-[13px]">
                    <label className="flex items-center gap-2 w-[120px]">
                      <input
                        type="checkbox"
                        checked={!!d}
                        onChange={(e) =>
                          setSemana((w) => ({ ...w, [String(i)]: e.target.checked ? { from: '09:00', to: '19:00' } : null }))
                        }
                      />
                      <span className={d ? 'font-semibold' : 'text-muted'}>{name}</span>
                    </label>
                    {d ? (
                      <>
                        <input
                          type="time"
                          value={d.from}
                          onChange={(e) => setSemana((w) => ({ ...w, [String(i)]: { from: e.target.value, to: d.to } }))}
                          className="border border-line rounded-[8px] px-2 py-1.5"
                        />
                        <span className="text-muted">a</span>
                        <input
                          type="time"
                          value={d.to}
                          onChange={(e) => setSemana((w) => ({ ...w, [String(i)]: { from: d.from, to: e.target.value } }))}
                          className="border border-line rounded-[8px] px-2 py-1.5"
                        />
                      </>
                    ) : (
                      <span className="text-muted text-[12.5px]">Cerrado</span>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-3 pt-1 text-[12px]">
                <button
                  type="button"
                  className="text-purple font-semibold"
                  onClick={() => {
                    const base = semana[String(firstOpen(semana))] ?? { from: '09:00', to: '19:00' };
                    setSemana(() => {
                      const w: WeekHours = emptyWeek();
                      for (let i = 0; i < 5; i++) w[String(i)] = { ...base };
                      return w;
                    });
                  }}
                >
                  Lunes a viernes igual
                </button>
                <button
                  type="button"
                  className="text-purple font-semibold"
                  onClick={() => {
                    const base = semana[String(firstOpen(semana))] ?? { from: '09:00', to: '19:00' };
                    setSemana(() => {
                      const w: WeekHours = emptyWeek();
                      for (let i = 0; i < 7; i++) w[String(i)] = { ...base };
                      return w;
                    });
                  }}
                >
                  Todos los días igual
                </button>
              </div>
              <p className="text-[11.5px] text-muted leading-4">
                Los clientes ven estos días y horarios al tocar tu local en la app. Resumen:{' '}
                <b>{summarizeWeek(semana) || 'todavía sin horario'}</b>
              </p>
            </div>
          </Field>
          <Field label="Contacto (WhatsApp)" icon={<Phone size={13} color="#7C6A9C" />}>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+591 7XXXXXXX"
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Instagram" icon={<Instagram size={13} color="#7C6A9C" />}>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@tu_comercio"
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Sitio web" icon={<Globe size={13} color="#7C6A9C" />}>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Link para reseñas en Google Maps" icon={<Globe size={13} color="#7C6A9C" />}>
            <input
              value={resenaUrl}
              onChange={(e) => setResenaUrl(e.target.value)}
              placeholder="https://g.page/r/…/review"
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
            <p className="text-[11.5px] text-muted mt-1.5 leading-4">
              Después de cada canje confirmado, Camina le ofrece al cliente dejar su reseña en tu local. En Google Maps
              buscá tu local, tocá &ldquo;Compartir&rdquo; y pegá el link de &ldquo;Pedir reseñas&rdquo; acá.
            </p>
          </Field>

          {saved && <p className="text-aqua text-[12.5px]">Guardado.</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-[10px] py-3.5 font-semibold text-sm mt-1 disabled:opacity-50"
            style={{ background: '#241748', color: '#7FEDC4' }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>

          <div className="border-t border-line mt-4 pt-4">
            {confirmingDelete ? (
              <div className="bg-warn-light rounded-xl p-4" style={{ background: '#FDEEE2' }}>
                <p className="text-[12.5px] mb-3" style={{ color: '#8A5A2E' }}>
                  Se borra tu negocio, tus beneficios y tu historial de canjes de Camina — esto no se puede
                  deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 rounded-[10px] py-2.5 font-semibold text-[13px] text-white disabled:opacity-50"
                    style={{ background: '#D4537E' }}
                  >
                    {deleting ? 'Eliminando…' : 'Sí, eliminar todo'}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 bg-white text-muted border border-line rounded-[10px] py-2.5 font-semibold text-[13px]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-2 text-warn text-[13px] font-semibold"
              >
                <Trash2 size={14} />
                Eliminar cuenta y negocio de Camina
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold mb-1.5">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
