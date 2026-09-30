'use client';

import { useEffect, useState } from 'react';
import { Star, Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { supabase, type Benefit } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { ImageUpload } from '@/components/ImageUpload';

// bit 0 = lunes ... bit 6 = domingo (mismo orden que valid_days_mask en
// supabase/migrations/0001_init.sql). 127 = todos los días.
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function BeneficioPage() {
  const { business } = useBusinessAuth();
  const isFree = business?.plan === 'primer_paso';

  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadBenefits() {
    if (!business) return;
    setLoading(true);
    const { data } = await supabase
      .from('benefits')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });
    setBenefits((data as Benefit[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadBenefits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from('benefits').delete().eq('id', id);
    setDeletingId(null);
    loadBenefits();
  }

  if (editingId !== null) {
    return (
      <BeneficioForm
        businessId={business!.id}
        isFree={isFree}
        benefit={editingId === 'new' ? null : (benefits.find((b) => b.id === editingId) ?? null)}
        onDone={() => {
          setEditingId(null);
          loadBenefits();
        }}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  const atFreeLimit = isFree && benefits.length >= 1;

  return (
    <DashboardShell>
      <TopBar title="Mis beneficios" subtitle="Esto es lo que ven los usuarios en el mapa y la lista de Canjes." />

      {isFree && (
        <div className="flex items-center gap-2.5 bg-purple-light rounded-xl px-3.5 py-2.5 mb-4.5">
          <Star size={15} color="#8B4FD1" />
          <p className="text-[12.5px] text-[#4A3D68]">
            Con el plan Primer Paso podés tener un solo beneficio, 100% gratis. Pasá a Paso Firme o Paso
            Adelante para combinar varios beneficios y cupones ilimitados.
          </p>
        </div>
      )}

      <button
        onClick={() => !atFreeLimit && setEditingId('new')}
        disabled={atFreeLimit}
        title={atFreeLimit ? 'Con el plan Primer Paso solo podés tener un beneficio activo' : ''}
        className="flex items-center gap-2 rounded-[10px] px-4 py-2.5 font-semibold text-[13px] mb-4.5 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#241748', color: '#7FEDC4' }}
      >
        <Plus size={15} /> Agregar beneficio
      </button>

      {loading && <p className="text-muted text-[13px]">Cargando…</p>}

      {!loading && benefits.length === 0 && (
        <div className="bg-card border border-line rounded-2xl p-6 text-center max-w-[480px]">
          <p className="text-[13.5px] text-muted">Todavía no tenés ningún beneficio cargado.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 max-w-[480px]">
        {benefits.map((b) => (
          <div key={b.id} className="bg-card border border-line rounded-2xl p-4 flex gap-3.5">
            {b.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.image_url} alt={b.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-bg shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-[13.5px] truncate">{b.name || 'Sin nombre'}</p>
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: b.active ? '#E3F5F0' : '#F1EBFA',
                    color: b.active ? '#2E9E7C' : '#8B4FD1',
                  }}
                >
                  {b.active ? 'Activo' : 'Desactivado'}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {b.type === 'gratis' ? 'Gratis' : b.discount_detail || 'Descuento'} · {b.cost_points} Puntos
              </p>
              <p className="text-xs text-muted mt-0.5">
                {b.daily_quota == null ? 'Cupones ilimitados' : `${b.daily_quota} cupones por día`}
              </p>
              <div className="flex gap-3 mt-2.5">
                <button
                  onClick={() => setEditingId(b.id)}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: '#4FC3A8' }}
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  disabled={deletingId === b.id}
                  className="flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                  style={{ color: '#D4537E' }}
                >
                  <Trash2 size={12} /> {deletingId === b.id ? 'Borrando…' : 'Borrar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

function BeneficioForm({
  businessId,
  isFree,
  benefit,
  onDone,
  onCancel,
}: {
  businessId: string;
  isFree: boolean;
  benefit: Benefit | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(benefit?.name ?? '');
  const [tipo, setTipo] = useState<'gratis' | 'descuento'>(benefit?.type ?? 'gratis');
  const [descuentoModo, setDescuentoModo] = useState<'porcentaje' | 'texto'>(
    benefit?.discount_percent != null ? 'porcentaje' : 'texto'
  );
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(
    benefit?.discount_percent != null ? String(benefit.discount_percent) : '20'
  );
  const [descuento, setDescuento] = useState(benefit?.discount_percent == null ? (benefit?.discount_detail ?? '') : '');
  const [costo, setCosto] = useState(benefit ? String(benefit.cost_points) : '10');
  const [ilimitado, setIlimitado] = useState(!isFree && benefit != null && benefit.daily_quota == null);
  const [cupones, setCupones] = useState(benefit?.daily_quota != null ? String(benefit.daily_quota) : '3');
  const [imageUrl, setImageUrl] = useState<string | null>(benefit?.image_url ?? null);
  const [valorBs, setValorBs] = useState('');
  // Guía, no regla: ~2 Puntos por Bs (con el tope de 20 Puntos ganados por
  // día, algo de Bs 10 ya le lleva casi un día entero caminando).
  const puntosSugeridos = valorBs.trim() ? Math.round(Number(valorBs) * 2) : null;
  const [validFrom, setValidFrom] = useState(benefit?.valid_from?.slice(0, 5) ?? '');
  const [validTo, setValidTo] = useState(benefit?.valid_to?.slice(0, 5) ?? '');
  const [diasMask, setDiasMask] = useState(benefit?.valid_days_mask ?? 127);
  const [dineInOnly, setDineInOnly] = useState(benefit?.dine_in_only ?? false);
  const [active, setActive] = useState(benefit?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // El upload de foto necesita una carpeta — para un beneficio nuevo todavía
  // no hay id, así que usamos la del comercio hasta el primer guardado.
  const [benefitId, setBenefitId] = useState<string | null>(benefit?.id ?? null);

  function toggleDia(bit: number) {
    setDiasMask((prev) => (prev & (1 << bit) ? prev & ~(1 << bit) : prev | (1 << bit)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      business_id: businessId,
      name: nombre.trim(),
      type: tipo,
      discount_detail:
        tipo === 'descuento'
          ? descuentoModo === 'porcentaje'
            ? `${Number(descuentoPorcentaje) || 0}% de descuento`
            : descuento.trim()
          : null,
      discount_percent: tipo === 'descuento' && descuentoModo === 'porcentaje' ? Number(descuentoPorcentaje) || null : null,
      cost_points: Number(costo) || 0,
      daily_quota: !isFree && ilimitado ? null : Number(cupones) || 0,
      active,
      image_url: imageUrl,
      valid_from: validFrom || null,
      valid_to: validTo || null,
      valid_days_mask: diasMask,
      dine_in_only: dineInOnly,
    };

    const { error } = benefitId
      ? await supabase.from('benefits').update(payload).eq('id', benefitId)
      : await supabase
          .from('benefits')
          .insert(payload)
          .select()
          .single()
          .then(async (res) => {
            if (res.data) setBenefitId((res.data as Benefit).id);
            return res;
          });

    setSaving(false);
    if (error) setError(error.message);
    else {
      setSaved(true);
      onDone();
    }
  }

  return (
    <DashboardShell>
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-muted mb-3"
      >
        <ChevronLeft size={16} /> Volver a mis beneficios
      </button>
      <TopBar
        title={benefitId ? 'Editar beneficio' : 'Nuevo beneficio'}
        subtitle="Esto es lo que ven los usuarios en el mapa y la lista de Canjes."
      />

      {isFree && (
        <div className="flex items-center gap-2.5 bg-purple-light rounded-xl px-3.5 py-2.5 mb-4.5">
          <Star size={15} color="#8B4FD1" />
          <p className="text-[12.5px] text-[#4A3D68]">
            Con el plan Primer Paso, tu beneficio tiene que ser 100% gratis — sin descuentos.
          </p>
        </div>
      )}

      <div className="bg-card border border-line rounded-2xl p-5.5 max-w-[480px]">
        <div className="mb-4.5">
          <ImageUpload
            bucket="benefit-images"
            path={`${businessId}/${benefitId ?? 'new'}-photo`}
            value={imageUrl}
            onUploaded={setImageUrl}
            label="Foto del beneficio (obligatoria)"
            shape="wide"
          />
        </div>

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
          <div className="mb-4.5">
            <div className="flex gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setDescuentoModo('porcentaje')}
                className="flex-1 py-2 rounded-[8px] border text-[12.5px] font-semibold"
                style={{
                  borderColor: descuentoModo === 'porcentaje' ? '#4FC3A8' : '#E1D2F5',
                  background: descuentoModo === 'porcentaje' ? '#E3F5F0' : '#fff',
                  color: descuentoModo === 'porcentaje' ? '#4FC3A8' : '#7C6A9C',
                }}
              >
                % de descuento
              </button>
              <button
                type="button"
                onClick={() => setDescuentoModo('texto')}
                className="flex-1 py-2 rounded-[8px] border text-[12.5px] font-semibold"
                style={{
                  borderColor: descuentoModo === 'texto' ? '#4FC3A8' : '#E1D2F5',
                  background: descuentoModo === 'texto' ? '#E3F5F0' : '#fff',
                  color: descuentoModo === 'texto' ? '#4FC3A8' : '#7C6A9C',
                }}
              >
                Otro (2x1, Bs fijos...)
              </button>
            </div>

            {descuentoModo === 'porcentaje' ? (
              <Field label="Porcentaje de descuento">
                <div className="flex items-center gap-2">
                  <input
                    value={descuentoPorcentaje}
                    onChange={(e) => setDescuentoPorcentaje(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="20"
                    className="w-24 bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
                  />
                  <span className="text-[13.5px] text-muted">% — ej: poné 20 para &ldquo;20% de descuento&rdquo;</span>
                </div>
              </Field>
            ) : (
              <Field label="Detalle del descuento">
                <input
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                  placeholder="Ej: 2x1, Bs 10 de descuento"
                  className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
                />
              </Field>
            )}
          </div>
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

        <div className="flex gap-3.5 mb-3.5">
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
            <Field label={ilimitado ? 'Cupones por día' : `Cupones por día${isFree ? ' (mín. 3)' : ''}`}>
              <input
                value={cupones}
                onChange={(e) => setCupones(e.target.value.replace(/\D/g, ''))}
                disabled={!isFree && ilimitado}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px] disabled:opacity-40"
              />
            </Field>
          </div>
        </div>

        {!isFree && (
          <label className="flex items-center gap-2 mb-4.5 cursor-pointer">
            <input type="checkbox" checked={ilimitado} onChange={(e) => setIlimitado(e.target.checked)} />
            <span className="text-[13px]">Cupones ilimitados — sin tope diario</span>
          </label>
        )}

        <label className="block text-[12.5px] font-semibold mb-1.5">Condiciones (opcional)</label>
        <div className="flex gap-3.5 mb-3.5">
          <div className="flex-1">
            <Field label="Válido desde">
              <input
                type="time"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Hasta">
              <input
                type="time"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
            </Field>
          </div>
        </div>
        <p className="text-[11px] text-muted mb-2">
          Dejá los dos vacíos si vale a cualquier hora. Fuera de este rango, a los usuarios les aparece
          &ldquo;Fuera de horario&rdquo; y no lo pueden canjear.
        </p>

        <div className="flex gap-1.5 mb-4.5">
          {DIAS.map((d, i) => {
            const on = !!(diasMask & (1 << i));
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDia(i)}
                className="w-9 h-9 rounded-full text-[12px] font-bold"
                style={{
                  background: on ? '#4FC3A8' : '#fff',
                  color: on ? '#fff' : '#7C6A9C',
                  border: `1px solid ${on ? '#4FC3A8' : '#E1D2F5'}`,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 mb-5 cursor-pointer">
          <input type="checkbox" checked={dineInOnly} onChange={(e) => setDineInOnly(e.target.checked)} />
          <span className="text-[13px]">Solo para consumir en el local</span>
        </label>

        <div className="flex items-center justify-between bg-bg rounded-xl px-3.5 py-3 mb-5">
          <div>
            <p className="text-[13px] font-semibold">{active ? 'Beneficio activo' : 'Beneficio desactivado'}</p>
            <p className="text-[11px] text-muted">
              {active ? 'Los usuarios lo ven y lo pueden canjear.' : 'No aparece en la app hasta que lo actives.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className="w-11 h-6 rounded-full relative shrink-0"
            style={{ background: active ? '#4FC3A8' : '#E1D2F5' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: active ? '22px' : '2px' }}
            />
          </button>
        </div>

        {!imageUrl && <p className="text-warn text-[12.5px] mb-3">Subí una foto del beneficio para poder guardarlo: es lo que ven las personas antes de canjear.</p>}
        {error && <p className="text-warn text-[12.5px] mb-3">{error}</p>}
        {saved && <p className="text-aqua text-[12.5px] mb-3">Guardado.</p>}

        <button
          onClick={handleSave}
          disabled={saving || !nombre.trim() || !imageUrl}
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
