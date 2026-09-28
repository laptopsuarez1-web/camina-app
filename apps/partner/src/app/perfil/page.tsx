'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, Phone, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { ImageUpload } from '@/components/ImageUpload';

const CATEGORIAS = ['Café', 'Gastronomía', 'Entretenimiento', 'Fitness', 'Belleza', 'Compras', 'Salud', 'Servicios', 'Otro'];

export default function PerfilPage() {
  const { business, refreshBusiness, session } = useBusinessAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [direccion, setDireccion] = useState('');
  const [horario, setHorario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!business) return;
    setNombre(business.name);
    setCategoria(business.category);
    setDireccion(business.address ?? '');
    setHorario(business.hours_text ?? '');
    setTelefono(business.phone ?? '');
  }, [business]);

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from('businesses')
      .update({
        name: nombre.trim(),
        category: categoria,
        address: direccion.trim(),
        hours_text: horario.trim(),
        phone: telefono.trim(),
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

      <div className="flex gap-5 max-w-[620px]">
        <div className="flex-1 flex flex-col gap-3.5">
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
                <div className="flex-1">
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
          <Field label="Dirección" icon={<MapPin size={13} color="#7C6A9C" />}>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Horario de atención" icon={<Clock size={13} color="#7C6A9C" />}>
            <input
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              placeholder="Lun a Sáb 8:00–20:00"
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
          <Field label="Contacto" icon={<Phone size={13} color="#7C6A9C" />}>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
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
