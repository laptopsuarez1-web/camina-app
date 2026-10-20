'use client';

import { useEffect, useState } from 'react';
import { Star, Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { supabase, type Benefit, type Business, type OnlineChannel } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { ImageUpload } from '@/components/ImageUpload';
import { TimeSelect } from '@/components/TimeSelect';
import { mensajeError } from '@/lib/errors';
import { FRANJAS_COMUNES, DIAS_ENTRE_SEMANA_MASK, franjaFloja } from '@/lib/horasMuertas';

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
        business={business!}
        isFree={isFree}
        otherBenefits={benefits.filter((b) => b.id !== editingId)}
        benefit={editingId === 'new' ? null : (benefits.find((b) => b.id === editingId) ?? null)}
        onDone={() => {
          setEditingId(null);
          loadBenefits();
        }}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  // Plan gratis: primero 1 premio gratis; con un gratis activo se habilita 1 descuento (máx. 2 premios).
  const activeBenefits = benefits.filter((b) => b.active);
  const hasGratis = activeBenefits.some((b) => b.type === 'gratis');
  const hasDescuento = activeBenefits.some((b) => b.type === 'descuento');
  const atFreeLimit = isFree && hasGratis && hasDescuento;

  return (
    <DashboardShell>
      <TopBar title="Mis beneficios" subtitle="Esto es lo que ven los usuarios en el mapa y la lista de Canjes." />

      {isFree && (
        <div className="flex items-center gap-2.5 bg-purple-light rounded-xl px-3.5 py-2.5 mb-4.5">
          <Star size={15} color="#8B4FD1" />
          <p className="text-[12.5px] text-[#4A3D68]">
            {hasGratis
              ? hasDescuento
                ? '🔓 Ya tenés tu premio gratis y tu descuento. Pasá a Paso Firme o Paso Adelante para sumar más premios y cupones ilimitados.'
                : '🔓 Ya podés crear un descuento. Con Primer Paso tenés 1 premio gratis y 1 descuento.'
              : '🔒 Creá un premio gratis para poder agregar un descuento. Con Primer Paso tenés 1 premio gratis y 1 descuento.'}
          </p>
        </div>
      )}

      <button
        onClick={() => !atFreeLimit && setEditingId('new')}
        disabled={atFreeLimit}
        title={atFreeLimit ? 'Con el plan Primer Paso tenés 1 premio gratis y 1 descuento' : ''}
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
                {b.online
                  ? `Online por ${CANALES_ONLINE.find((c) => c.id === b.online_channel)?.label ?? 'redes'} · ${b.online_quota == null ? 'cupos ilimitados' : `${b.online_quota} cupos en total`}`
                  : b.daily_quota == null ? 'Cupones ilimitados' : `${b.daily_quota} cupones por día`}
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

// Canales para cobrar un premio online. El contacto sale de los datos del local, así no se carga dos veces.
const CANALES_ONLINE: { id: OnlineChannel; label: string; tiene: (b: Business) => boolean; falta: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', tiene: (b) => !!b.phone?.trim(), falta: 'Cargá tu WhatsApp en Perfil' },
  { id: 'instagram', label: 'Instagram', tiene: (b) => !!b.instagram?.trim(), falta: 'Cargá tu Instagram en Perfil' },
  { id: 'facebook', label: 'Facebook', tiene: (b) => !!b.facebook?.trim(), falta: 'Cargá tu Facebook en Perfil' },
  { id: 'tiktok', label: 'TikTok', tiene: (b) => !!b.tiktok?.trim(), falta: 'Cargá tu TikTok en Perfil' },
  { id: 'web', label: 'Mi página web', tiene: (b) => !!b.website?.trim(), falta: 'Cargá tu página en Perfil' },
];

function BeneficioForm({
  businessId,
  business,
  isFree,
  otherBenefits,
  benefit,
  onDone,
  onCancel,
}: {
  businessId: string;
  business: Business;
  isFree: boolean;
  otherBenefits: Benefit[];
  benefit: Benefit | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(benefit?.name ?? '');
  // Plan gratis: el descuento se habilita recién cuando hay un premio gratis activo, y es uno solo.
  const otherActive = otherBenefits.filter((b) => b.active);
  const freeHasGratis = otherActive.some((b) => b.type === 'gratis');
  const freeHasDescuento = otherActive.some((b) => b.type === 'descuento');
  const descuentoLocked = isFree && (!freeHasGratis || freeHasDescuento);
  const gratisLocked = isFree && freeHasGratis;
  const [tipo, setTipo] = useState<'gratis' | 'descuento'>(benefit?.type ?? (isFree && freeHasGratis ? 'descuento' : 'gratis'));
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
  const [descripcion, setDescripcion] = useState(benefit?.description ?? '');
  const [valorBs, setValorBs] = useState('');
  // Guía, no regla: 2,5 Puntos por Bs (con el tope de 20 Puntos ganados por
  // día, algo de Bs 10 ya le lleva más de un día caminando).
  const puntosSugeridos = valorBs.trim() ? Math.ceil(Number(valorBs) * 2.5) : null;
  const [validFrom, setValidFrom] = useState(benefit?.valid_from?.slice(0, 5) ?? '');
  const [validTo, setValidTo] = useState(benefit?.valid_to?.slice(0, 5) ?? '');
  const [diasMask, setDiasMask] = useState(benefit?.valid_days_mask ?? 127);
  const [dineInOnly, setDineInOnly] = useState(benefit?.dine_in_only ?? false);
  // Premio online: sin horario ni días, cupos totales y código de 7 días que la persona manda por el canal elegido.
  const [online, setOnline] = useState(benefit?.online ?? (benefit == null && business.is_virtual));
  const [onlineChannel, setOnlineChannel] = useState<OnlineChannel | ''>(
    benefit?.online_channel ?? CANALES_ONLINE.find((c) => c.tiene(business))?.id ?? ''
  );
  const [onlineQuota, setOnlineQuota] = useState(benefit?.online_quota != null ? String(benefit.online_quota) : '5');
  const canalOk = !online || (onlineChannel !== '' && (CANALES_ONLINE.find((c) => c.id === onlineChannel)?.tiene(business) ?? false));
  const cuposOnlineOk = !online || Number(onlineQuota) >= 1;
  const [active, setActive] = useState(benefit?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Canjes confirmados por hora (últimos 60 días), para sugerir la franja más floja. Solo planes
  // con estadísticas, igual que la página de Estadísticas.
  const [sugerida, setSugerida] = useState<ReturnType<typeof franjaFloja>>(null);
  useEffect(() => {
    if (isFree) return;
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    supabase
      .from('redemptions')
      .select('created_at, confirmed_at')
      .eq('business_id', businessId)
      .eq('status', 'confirmed')
      .gte('created_at', since)
      .then(({ data }) => {
        const byHour = new Array(24).fill(0) as number[];
        for (const r of (data as { created_at: string; confirmed_at: string | null }[] | null) ?? []) {
          byHour[new Date(r.confirmed_at ?? r.created_at).getHours()] += 1;
        }
        setSugerida(franjaFloja(byHour));
      });
  }, [businessId, isFree]);
  function aplicarFranja(from: string, to: string, soloEntreSemana = false) {
    setValidFrom(from);
    setValidTo(to);
    if (soloEntreSemana) setDiasMask(DIAS_ENTRE_SEMANA_MASK);
  }
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
      // Online: los cupos son totales (online_quota); el tope por día no aplica (en Primer Paso la regla pide mínimo 3).
      daily_quota: online ? (isFree ? 3 : null) : !isFree && ilimitado ? null : Number(cupones) || 0,
      active,
      image_url: imageUrl,
      valid_from: online ? null : validFrom || null,
      valid_to: online ? null : validTo || null,
      valid_days_mask: online ? 127 : diasMask,
      dine_in_only: online ? false : dineInOnly,
      online,
      online_channel: online ? onlineChannel || null : null,
      online_quota: online ? Number(onlineQuota) || null : null,
      // Solo se manda si hay algo que guardar o borrar, así sigue andando aunque falte la columna.
      ...(descripcion.trim() ? { description: descripcion.trim() } : benefit?.description ? { description: null } : {}),
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
    if (error) setError(mensajeError(error));
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
            {freeHasGratis
              ? '🔓 Ya tenés un premio gratis: este puede ser tu descuento.'
              : '🔒 Creá primero un premio gratis: así se habilita el descuento.'}
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

        <div className="mt-4.5">
          <Field label="Descripción del producto (opcional)">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Ej: Papas fritas artesanales con salchicha y tus salsas favoritas. Porción individual."
              className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
            />
            <p className="text-[11.5px] text-muted mt-1.5 leading-4">Los clientes la ven en la app, debajo del nombre del premio.</p>
          </Field>
        </div>

        <label className="block text-[12.5px] font-semibold mb-1.5 mt-4.5">Tipo</label>
        <div className="flex gap-2 mb-4.5">
          <button
            disabled={gratisLocked}
            onClick={() => !gratisLocked && setTipo('gratis')}
            title={gratisLocked ? 'Ya tenés un premio gratis: este puede ser un descuento' : ''}
            className="flex-1 py-2.5 rounded-[10px] border text-[13px] font-semibold disabled:cursor-not-allowed"
            style={{
              borderColor: tipo === 'gratis' ? '#4FC3A8' : '#E1D2F5',
              background: tipo === 'gratis' ? '#E3F5F0' : '#fff',
              color: gratisLocked ? '#C7BEDB' : tipo === 'gratis' ? '#4FC3A8' : '#7C6A9C',
            }}
          >
            Gratis
          </button>
          <button
            disabled={descuentoLocked}
            onClick={() => !descuentoLocked && setTipo('descuento')}
            title={descuentoLocked ? (freeHasDescuento ? 'Con Primer Paso tenés un solo descuento' : 'Creá primero un premio gratis') : ''}
            className="flex-1 py-2.5 rounded-[10px] border text-[13px] font-semibold disabled:cursor-not-allowed"
            style={{
              borderColor: tipo === 'descuento' ? '#8B4FD1' : '#E1D2F5',
              background: tipo === 'descuento' ? '#F1EBFA' : '#fff',
              color: descuentoLocked ? '#C7BEDB' : tipo === 'descuento' ? '#8B4FD1' : '#7C6A9C',
            }}
          >
            Descuento
          </button>
        </div>

        {tipo === 'descuento' && (
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
            Como referencia, 2,5 Puntos equivalen a Bs 1: algo de <strong>Bs 10</strong> ronda los <strong>25 Puntos</strong> (con el
            tope de 20 Puntos ganados por día, ya le lleva más de una jornada caminando). Metí el
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

        <div className="bg-aqua-light rounded-xl p-3.5 mb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="block text-[13px] font-semibold" style={{ color: '#2E9E7C' }}>Premio online (sin ir al local)</span>
              <span className="block text-[11.5px] leading-4 mt-0.5" style={{ color: '#3A8C72' }}>
                La persona canjea en la app y recibe un código propio. Se lo manda a tu tienda por el canal que elijas y vos lo
                confirmás en Canjes cuando quieras: el código le dura 7 días. Sirve aunque no tengas local ni página web.
              </span>
            </span>
          </label>
          {online && (
            <div className="mt-3">
              <p className="text-[12.5px] font-semibold mb-1.5">¿Por dónde te escriben para cobrar?</p>
              <div className="flex flex-wrap gap-1.5">
                {CANALES_ONLINE.map((c) => {
                  const ok = c.tiene(business);
                  const on = onlineChannel === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!ok}
                      title={ok ? '' : c.falta}
                      onClick={() => setOnlineChannel(c.id)}
                      className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold border disabled:cursor-not-allowed"
                      style={{
                        background: on ? '#4FC3A8' : '#fff',
                        color: !ok ? '#C7BEDB' : on ? '#fff' : '#7C6A9C',
                        borderColor: on ? '#4FC3A8' : '#E1D2F5',
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {!canalOk && (
                <p className="text-warn text-[12px] mt-2">
                  Elegí un canal. Si no ves el tuyo, cargalo primero en <a href="/perfil" className="underline">Perfil</a>.
                </p>
              )}
              <div className="mt-3 max-w-[220px]">
                <Field label="Cupos en total">
                  <input
                    value={onlineQuota}
                    onChange={(e) => setOnlineQuota(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
                  />
                </Field>
              </div>
              <p className="text-[11.5px] text-muted mt-1.5 leading-4">
                Cuando se usan todos, el premio queda agotado. Si cancelás o vence un canje, ese cupo se libera.
              </p>
            </div>
          )}
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
          {!online && <div className="flex-1">
            <Field label={ilimitado ? 'Cupones por día' : `Cupones por día${isFree ? ' (mín. 3)' : ''}`}>
              <input
                value={cupones}
                onChange={(e) => setCupones(e.target.value.replace(/\D/g, ''))}
                disabled={!isFree && ilimitado}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px] disabled:opacity-40"
              />
            </Field>
          </div>}
        </div>

        {!isFree && !online && (
          <label className="flex items-center gap-2 mb-4.5 cursor-pointer">
            <input type="checkbox" checked={ilimitado} onChange={(e) => setIlimitado(e.target.checked)} />
            <span className="text-[13px]">Cupones ilimitados — sin tope diario</span>
          </label>
        )}

        {!online && (
          <>
        <div className="bg-purple-light rounded-xl p-3.5 mb-3.5">
          <p className="text-[12.5px] font-semibold mb-1" style={{ color: '#4A3D68' }}>
            ⏰ Horas muertas: llená tu local cuando está vacío
          </p>
          <p className="text-[11.5px] mb-2.5 leading-4" style={{ color: '#4A3D68' }}>
            Son las horas en que casi no entra nadie. Si el premio vale justo ahí, la gente camina hasta tu local cuando más
            lo necesitás, y en las horas de mucho movimiento no regalás de más. Elegí una franja o armá la tuya abajo.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FRANJAS_COMUNES.map((f) => {
              const on = validFrom === f.from && validTo === f.to;
              return (
                <button
                  key={f.id}
                  type="button"
                  title={f.hint}
                  onClick={() => aplicarFranja(f.from, f.to)}
                  className="rounded-full px-2.5 py-1 text-[12px] font-semibold border"
                  style={{
                    background: on ? '#8B4FD1' : '#fff',
                    color: on ? '#fff' : '#7C6A9C',
                    borderColor: on ? '#8B4FD1' : '#E1D2F5',
                  }}
                >
                  {f.label} · {f.from}–{f.to}
                </button>
              );
            })}
            <button
              type="button"
              title="Lunes a jueves, los días más flojos"
              onClick={() => setDiasMask(DIAS_ENTRE_SEMANA_MASK)}
              className="rounded-full px-2.5 py-1 text-[12px] font-semibold border"
              style={{
                background: diasMask === DIAS_ENTRE_SEMANA_MASK ? '#8B4FD1' : '#fff',
                color: diasMask === DIAS_ENTRE_SEMANA_MASK ? '#fff' : '#7C6A9C',
                borderColor: diasMask === DIAS_ENTRE_SEMANA_MASK ? '#8B4FD1' : '#E1D2F5',
              }}
            >
              Solo lunes a jueves
            </button>
          </div>
          {sugerida ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <p className="text-[11.5px]" style={{ color: '#4A3D68' }}>
                Según tus canjes, de <strong>{sugerida.from} a {sugerida.to}</strong> es cuando menos te visitan.
              </p>
              <button
                type="button"
                onClick={() => aplicarFranja(sugerida.from, sugerida.to)}
                className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{ background: '#4FC3A8', color: '#fff' }}
              >
                Usar {sugerida.from}–{sugerida.to}
              </button>
            </div>
          ) : (
            <p className="text-[11px] mt-2" style={{ color: '#7C6A9C' }}>
              {isFree
                ? 'Con Paso Firme, Camina te sugiere tus horas más flojas según tus canjes.'
                : 'Cuando tengas más canjes, acá te vamos a sugerir tus horas más flojas.'}
            </p>
          )}
        </div>

        <label className="block text-[12.5px] font-semibold mb-1.5">Condiciones (opcional)</label>
        <div className="flex gap-3.5 mb-3.5">
          <div className="flex-1">
            <Field label="Válido desde">
              <TimeSelect
                allowEmpty
                value={validFrom}
                onChange={setValidFrom}
                className="w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Hasta">
              <TimeSelect
                allowEmpty
                value={validTo}
                onChange={setValidTo}
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

          </>
        )}

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
          disabled={saving || !nombre.trim() || !imageUrl || !canalOk || !cuposOnlineOk}
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
