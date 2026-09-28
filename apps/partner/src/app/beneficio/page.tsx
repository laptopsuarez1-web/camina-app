'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase, type Benefit } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { ImageUpload } from '@/components/ImageUpload';

export default function BeneficioPage() {
  const { business } = useBusinessAuth();
  const isFree = business?.plan === 'primer_paso';

  const [benefitId, setBenefitId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'gratis' | 'descuento'>('gratis');
  const [descuento, setDescuento] = useState('');
  const [costo, setCosto] = useState('10');
  const [cupones, setCupones] = useState('3');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [valorBs, setValorBs] = useState('');
  // Guía, no regla: ~2 Puntos por Bs (con el tope de 20 Puntos ganados por
  // día, algo de Bs 10 ya te lleva casi un día entero caminando).
  const puntosSugeridos = valorBs.trim() ? Math.round(Number(valorBs) * 2) : null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!business) return;
    supabase
      .from('benefits')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .maybeSingle()
      .then(({ data }) => {
        const b = data as Benefit | null;
        if (!b) return;
        setBenefitId(b.id);
        setNombre(b.name);
        setTipo(b.type);
        setDescuento(b.discount_detail ?? '');
        setCosto(String(b.cost_points));
        setCupones(String(b.daily_quota));
        setImageUrl(b.image_url);
      });
  }, [business]);

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      business_id: business.id,
      name: nombre.trim(),
      type: tipo,
      discount_detail: tipo === 'descuento' ? descuento.trim() : null,
      cost_points: Number(costo) || 0,
      daily_quota: Number(cupones) || 0,
      active: true,
      image_url: imageUrl,
    };

    const { error } = benefitId
      ? await supabase.from('benefits').update(payload).eq('id', benefitId)
      : await supabase.from('benefits').insert(payload).select().single().then(async (res) => {
          if (res.data) setBenefitId((res.data as Benefit).id);
          return res;
        });

    setSaving(false);
    if (error) setError(error.message);
    else setSaved(true);
  }

  return (
    <DashboardShell>
      <TopBar title="Mi beneficio" subtitle="Esto es lo que ven los usuarios en el mapa y la lista de Canjes." />

      {isFree && (
        <div className="flex items-center gap-2.5 bg-purple-light rounded-xl px-3.5 py-2.5 mb-4.5">
          <Star size={15} color="#8B4FD1" />
          <p className="text-[12.5px] text-[#4A3D68]">
            Con el plan Primer Paso, tu beneficio tiene que ser 100% gratis — sin descuentos.
          </p>
        </div>
      )}

      <div className="bg-card border border-line rounded-2xl p-5.5 max-w-[480px]">
        {business && (
          <div className="mb-4.5">
            <ImageUpload
              bucket="benefit-images"
              path={`${business.id}/photo`}
              value={imageUrl}
              onUploaded={setImageUrl}
              label="Foto del beneficio"
              shape="wide"
            />
          </div>
        )}

        <Field label="Nombre del beneficio">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
          />
        </Field>

        <label className="block text-[12.5px] font-semibold mb-1.5 mt-4.5">Tipo</label>
        <div className="flex gap-2 mb-4.5">
          <button
            onClick={() => setTipo('gratis')}
            className="flex-1 py-2.5 rounded-[10px] border text-[13px] font-semibold"
            style={{
              borderColor: tipo === 'gratis' ? '#4FC3A8' : '#E1D2F5',
              background: tipo === 'gratis' ? '#E3F5F0' : '#fff',
              color: tipo === 'gratis' ? '#4FC3A8' : '#7C6A9C',
            }}
          >
            Gratis
          </button>
          <button
            disabled={isFree}
            onClick={() => !isFree && setTipo('descuento')}
            title={isFree ? 'Disponible desde el plan Paso Firme' : ''}
            className="flex-1 py-2.5 rounded-[10px] border text-[13px] font-semibold disabled:cursor-not-allowed"
            style={{
              borderColor: tipo === 'descuento' ? '#8B4FD1' : '#E1D2F5',
              background: tipo === 'descuento' ? '#F1EBFA' : '#fff',
              color: isFree ? '#C7BEDB' : tipo === 'descuento' ? '#8B4FD1' : '#7C6A9C',
            }}
          >
            Descuento
          </button>
        </div>

        {tipo === 'descuento' && !isFree && (
          <Field label="Detalle del descuento">
            <input
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="Ej: 20% en el total, 2x1, Bs 10 de descuento"
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
          </Field>
        )}

        <div className="bg-aqua-light rounded-xl p-3.5 mt-4.5 mb-4">
          <p className="text-[12.5px] font-semibold mb-1.5" style={{ color: '#2E9E7C' }}>
            ¿No sabés cuántos Puntos poner?
          </p>
          <p className="text-[11.5px] mb-2.5" style={{ color: '#3A8C72' }}>
            Como referencia, algo de <strong>Bs 10</strong> ronda los <strong>20 Puntos</strong> (con el
            tope de 20 Puntos ganados por día, ya le lleva casi una jornada entera caminando). Metí el
            valor de lo que estás regalando y te tiramos una sugerencia — es una guía, no una regla, vos
            ponés el número final.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted">Vale aprox.</span>
            <input
              value={valorBs}
              onChange={(e) => setValorBs(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="Bs"
              className="w-20 bg-white border border-line rounded-[8px] px-2.5 py-1.5 text-[12.5px]"
            />
            {puntosSugeridos !== null && (
              <>
                <span className="text-[12.5px] text-muted">→ sugerido</span>
                <button
                  type="button"
                  onClick={() => setCosto(String(puntosSugeridos))}
                  className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
                  style={{ background: '#4FC3A8', color: '#fff' }}
                >
                  {puntosSugeridos} Puntos — usar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3.5 mb-5">
          <div className="flex-1">
            <Field label="Costo en Puntos">
              <input
                value={costo}
                onChange={(e) => setCosto(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label={`Cupones por día${isFree ? ' (mín. 3)' : ''}`}>
              <input
                value={cupones}
                onChange={(e) => setCupones(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-warn text-[12.5px] mb-3">{error}</p>}
        {saved && <p className="text-aqua text-[12.5px] mb-3">Guardado.</p>}

        <button
          onClick={handleSave}
          disabled={saving || !nombre.trim()}
          className="w-full rounded-[10px] py-3.5 font-semibold text-sm disabled:opacity-50"
          style={{ background: '#241748', color: '#7FEDC4' }}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}
