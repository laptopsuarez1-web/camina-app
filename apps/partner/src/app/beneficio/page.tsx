'use client';

import { ideasParaRubro, etiquetaIdea, type IdeaPremio } from '@/lib/ideas-premio';
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

// Cómo empieza la frase del "Regalo con tu compra". Vacío = frase libre.
const INICIOS = [
  { inicio: 'llevando', label: 'Llevando…', ejemplo: '2 salchipapas' },
  { inicio: 'con tu', label: 'Con tu…', ejemplo: 'corte de cabello' },
  { inicio: 'si pides', label: 'Si pides…', ejemplo: 'un combo familiar' },
  { inicio: 'al comprar', label: 'Al comprar…', ejemplo: 'cualquier café' },
  { inicio: '', label: 'Mi frase', ejemplo: 'en tu segunda visita del mes' },
];

// Botones de elegir (Gratis/Descuento, % u otro): se leen bien en claro y en oscuro.
function choiceStyle(on: boolean, tone: 'aqua' | 'purple', locked = false): React.CSSProperties {
  if (locked) return { borderColor: 'var(--c-line)', background: 'var(--c-card)', color: 'var(--c-muted)', opacity: 0.45 };
  if (!on) return { borderColor: 'var(--c-line)', background: 'var(--c-card)', color: 'var(--c-muted)' };
  return tone === 'aqua'
    ? { borderColor: '#4FC3A8', background: 'var(--c-aqua-light)', color: 'var(--c-ok-text)', boxShadow: 'inset 0 0 0 1px #4FC3A8' }
    : { borderColor: '#8B4FD1', background: 'var(--c-purple-light)', color: 'var(--c-purple-text)', boxShadow: 'inset 0 0 0 1px #8B4FD1' };
}

function cap(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function joinFrase(inicio: string, resto: string) {
  const r = resto.trim();
  return inicio ? `${inicio} ${r}` : r.charAt(0).toLowerCase() + r.slice(1);
}

function splitFrase(f?: string | null) {
  if (!f) return { inicio: 'llevando', resto: '' };
  const op = INICIOS.find((o) => o.inicio && f.toLowerCase().startsWith(o.inicio + ' '));
  return op ? { inicio: op.inicio, resto: f.slice(op.inicio.length + 1) } : { inicio: '', resto: f };
}

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
      <TopBar title="Mis premios" subtitle="Los premios que ofreces. Así los ven los clientes en la app." />

      {isFree && (
        <div className="flex items-start gap-3 bg-purple-light rounded-2xl px-4 py-3.5 mb-5">
          <Star size={16} color="#8B4FD1" className="mt-0.5 shrink-0" />
          <p className="text-[13px] leading-snug text-text">
            <strong>Plan gratis: 1 premio gratis y 1 descuento.</strong>{' '}
            {hasGratis
              ? hasDescuento
                ? 'Ya los tienes. Pasa a un plan de pago para sumar más.'
                : 'Ya puedes crear tu descuento.'
              : 'Crea primero el premio gratis para poder agregar el descuento.'}
          </p>
        </div>
      )}

      <button
        onClick={() => !atFreeLimit && setEditingId('new')}
        disabled={atFreeLimit}
        title={atFreeLimit ? 'Con el plan Primer Paso tienes 1 premio gratis y 1 descuento' : ''}
        className="flex items-center gap-2 rounded-full px-5 py-3 font-bold text-[14px] mb-5 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}
      >
        <Plus size={16} /> Agregar premio
      </button>

      {loading && <p className="text-muted text-[13px]">Cargando…</p>}

      {!loading && benefits.length === 0 && (
        <div className="bg-card border border-line rounded-2xl p-8 text-center max-w-[480px]">
          <p className="font-semibold text-[15px] mb-1">Todavía no tienes premios</p>
          <p className="text-[13.5px] text-muted">Toca «Agregar premio» para crear el primero. Así tu local aparece en el mapa de la app.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 max-w-[860px]">
        {benefits.map((b) => (
          <div key={b.id} className="bg-card border border-line rounded-2xl p-4 flex gap-4">
            {b.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.image_url} alt={b.name} className="w-[76px] h-[76px] rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-[76px] h-[76px] rounded-2xl bg-bg shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-[15px] truncate">{b.name || 'Sin nombre'}</p>
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: b.active ? 'var(--c-aqua-light)' : 'var(--c-purple-light)',
                    color: b.active ? 'var(--c-ok-text)' : 'var(--c-purple-text)',
                  }}
                >
                  {b.active ? 'Activo' : 'Desactivado'}
                </span>
              </div>
              <p className="text-[13px] text-muted mt-0.5">
                {b.with_purchase ? `De regalo ${b.with_purchase}` : b.type === 'gratis' ? 'Gratis' : b.discount_detail || 'Descuento'} · {b.cost_points} Puntos{b.new_customers_only ? ' · Solo clientes nuevos' : ''}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {b.online
                  ? `Online por ${CANALES_ONLINE.find((c) => c.id === b.online_channel)?.label ?? 'redes'} · ${b.online_channel === 'web' ? 'con tus cupones' : b.online_quota == null ? 'cupos ilimitados' : `${b.online_quota} cupos en total`}`
                  : b.daily_quota == null ? 'Cupones ilimitados' : `${b.daily_quota} cupones por día`}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setEditingId(b.id)}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold rounded-full px-3.5 py-1.5 bg-aqua-light"
                  style={{ color: '#2E9E7C' }}
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  disabled={deletingId === b.id}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold rounded-full px-3.5 py-1.5 disabled:opacity-50"
                  style={{ color: '#D4537E', background: 'var(--c-danger-light)' }}
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
  { id: 'whatsapp', label: 'WhatsApp', tiene: (b) => !!b.phone?.trim(), falta: 'Carga tu WhatsApp en Perfil' },
  { id: 'instagram', label: 'Instagram', tiene: (b) => !!b.instagram?.trim(), falta: 'Carga tu Instagram en Perfil' },
  { id: 'facebook', label: 'Facebook', tiene: (b) => !!b.facebook?.trim(), falta: 'Carga tu Facebook en Perfil' },
  { id: 'tiktok', label: 'TikTok', tiene: (b) => !!b.tiktok?.trim(), falta: 'Carga tu TikTok en Perfil' },
  { id: 'web', label: 'Mi página web', tiene: (b) => !!b.website?.trim(), falta: 'Carga tu página en Perfil' },
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
  const [descuentoModo, setDescuentoModo] = useState<'porcentaje' | '2x1' | 'texto'>(
    benefit?.discount_percent != null ? 'porcentaje' : benefit?.discount_detail?.trim().toLowerCase() === '2x1' ? '2x1' : 'texto'
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
  // Con tu compra: la persona compra algo y se lleva el premio. El local
  // elige cómo empieza la frase y la completa; se guarda entera.
  const inicial = splitFrase(benefit?.with_purchase);
  const [conCompra, setConCompra] = useState(!!benefit?.with_purchase);
  const [inicio, setInicio] = useState(inicial.inicio);
  const [compra, setCompra] = useState(inicial.resto);
  const frase = joinFrase(inicio, compra);
  // Tres formas de ofrecerlo. "Regalo con compra" se guarda como gratis + la frase de la compra.
  const modo: 'gratis' | 'regalo' | 'descuento' = tipo === 'descuento' ? 'descuento' : conCompra ? 'regalo' : 'gratis';
  // Ideas por rubro (solo al crear): llenan nombre, cómo se ofrece y Puntos. Se esconden las que el plan no permite.
  const ideas = benefit ? [] : ideasParaRubro(business.category).filter((i) => (i.modo === 'descuento' ? !descuentoLocked : !gratisLocked));
  function usarIdea(i: IdeaPremio) {
    setNombre(i.nombre);
    elegirModo(i.modo);
    if (i.regalo) {
      setInicio(i.regalo.inicio);
      setCompra(i.regalo.resto);
    }
    if (i.modo === 'descuento') {
      if (i.dosxuno) setDescuentoModo('2x1');
      else {
        setDescuentoModo('porcentaje');
        setDescuentoPorcentaje(String(i.porcentaje ?? 10));
      }
    }
    setCosto(String(i.puntos));
  }
  function elegirModo(m: 'gratis' | 'regalo' | 'descuento') {
    if (m === 'descuento' ? descuentoLocked : gratisLocked) return;
    setTipo(m === 'descuento' ? 'descuento' : 'gratis');
    setConCompra(m === 'regalo');
  }
  const [valorBs, setValorBs] = useState('');
  // Guía, no regla: 2,5 Puntos por Bs (con el tope de 20 Puntos ganados por
  // día, algo de Bs 10 ya le lleva más de un día caminando).
  const puntosSugeridos = valorBs.trim() ? Math.ceil(Number(valorBs) * 2.5) : null;
  const [validFrom, setValidFrom] = useState(benefit?.valid_from?.slice(0, 5) ?? '');
  const [validTo, setValidTo] = useState(benefit?.valid_to?.slice(0, 5) ?? '');
  const [diasMask, setDiasMask] = useState(benefit?.valid_days_mask ?? 127);
  const [dineInOnly, setDineInOnly] = useState(benefit?.dine_in_only ?? false);
  // Premio con reserva (migración 0078): solo informa a la persona que debe coordinar por WhatsApp antes de ir.
  const [requiresBooking, setRequiresBooking] = useState(benefit?.requires_booking ?? false);
  const [bookingNote, setBookingNote] = useState(benefit?.booking_note ?? '');
  // Premio online: sin horario ni días, cupos totales y código de 7 días que la persona manda por el canal elegido.
  const [online, setOnline] = useState(benefit?.online ?? (benefit == null && business.is_virtual));
  const [onlineChannel, setOnlineChannel] = useState<OnlineChannel | ''>(
    benefit?.online_channel ?? CANALES_ONLINE.find((c) => c.tiene(business))?.id ?? ''
  );
  const [onlineQuota, setOnlineQuota] = useState(benefit?.online_quota != null ? String(benefit.online_quota) : '5');
  const canalOk = !online || (onlineChannel !== '' && (CANALES_ONLINE.find((c) => c.id === onlineChannel)?.tiene(business) ?? false));
  // Canal web: la tienda carga sus propios cupones (uno por línea); cada canje entrega uno distinto.
  const esWeb = online && onlineChannel === 'web';
  const [codigosTexto, setCodigosTexto] = useState('');
  const [codigosLibres, setCodigosLibres] = useState(0);
  const [codigosEntregados, setCodigosEntregados] = useState(0);
  const codigosNuevos = Array.from(new Set(codigosTexto.split(/[\n,;]+/).map((c) => c.trim()).filter((c) => c.length >= 2 && c.length <= 60)));
  const cuposOnlineOk = !online || (esWeb ? codigosLibres + codigosNuevos.length >= 1 : Number(onlineQuota) >= 1);
  async function cargarConteoCodigos(id: string) {
    const { data } = await supabase.from('benefit_codes').select('redemption_id').eq('benefit_id', id);
    const rows = (data as { redemption_id: string | null }[] | null) ?? [];
    setCodigosLibres(rows.filter((r) => r.redemption_id == null).length);
    setCodigosEntregados(rows.filter((r) => r.redemption_id != null).length);
  }
  useEffect(() => {
    if (benefit?.id) cargarConteoCodigos(benefit.id);
  }, [benefit?.id]);
  const [active, setActive] = useState(benefit?.active ?? true);
  // Premio solo para Fans (0083): opcional, solo lo ven y lo canjean quienes son Fans del local.
  const [fansOnly, setFansOnly] = useState(!!benefit?.fans_only);
  const [soloNuevos, setSoloNuevos] = useState(!!benefit?.new_customers_only);
  // La opción aparece recién cuando el servidor tiene la columna (migración 0083); antes, guardar no la manda.
  const [fansReady, setFansReady] = useState(false);
  useEffect(() => {
    supabase.from('benefits').select('fans_only').limit(1).then(({ error }) => setFansReady(!error));
  }, []);
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
  // El upload de foto necesita una carpeta — para un premio nuevo todavía
  // no hay id, así que usamos la del comercio hasta el primer guardado.
  const [benefitId, setBenefitId] = useState<string | null>(benefit?.id ?? null);

  function toggleDia(bit: number) {
    setDiasMask((prev) => (prev & (1 << bit) ? prev & ~(1 << bit) : prev | (1 << bit)));
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    if (modo === 'regalo' && compra.trim().length < 2) {
      setError('Completa la frase de tu premio (por ejemplo: «Llevando 2 salchipapas»).');
      return;
    }
    setSaving(true);

    const payload = {
      business_id: businessId,
      name: nombre.trim(),
      type: tipo,
      discount_detail:
        tipo === 'descuento'
          ? descuentoModo === 'porcentaje'
            ? `${Number(descuentoPorcentaje) || 0}% de descuento`
            : descuentoModo === '2x1'
              ? '2x1'
              : descuento.trim()
          : null,
      discount_percent: tipo === 'descuento' && descuentoModo === 'porcentaje' ? Number(descuentoPorcentaje) || null : null,
      cost_points: Number(costo) || 0,
      // Online: los cupos son totales (online_quota o los cupones cargados); el tope por día no aplica (en Primer Paso la regla pide mínimo 3).
      daily_quota: online ? (isFree ? 3 : null) : !isFree && ilimitado ? null : Number(cupones) || 0,
      active,
      ...(fansReady ? { fans_only: fansOnly } : {}),
      new_customers_only: soloNuevos,
      image_url: imageUrl,
      valid_from: validFrom || null,
      valid_to: validTo || null,
      valid_days_mask: diasMask,
      dine_in_only: online ? false : dineInOnly,
      requires_booking: !online && requiresBooking,
      booking_note: !online && requiresBooking && bookingNote.trim() ? bookingNote.trim().slice(0, 120) : null,
      online,
      online_channel: online ? onlineChannel || null : null,
      // Con cupones propios (web) los cupos son los cupones cargados.
      online_quota: online && onlineChannel !== 'web' ? Number(onlineQuota) || null : null,
      // Solo se manda si hay algo que guardar o borrar, así sigue andando aunque falte la columna.
      ...(descripcion.trim() ? { description: descripcion.trim() } : benefit?.description ? { description: null } : {}),
      // Igual que la descripción: solo se manda si hay algo que guardar o borrar.
      ...(modo === 'regalo' && compra.trim() ? { with_purchase: frase } : benefit?.with_purchase ? { with_purchase: null } : {}),
    };

    let savedId = benefitId;
    let { error } = benefitId
      ? await supabase.from('benefits').update(payload).eq('id', benefitId)
      : await supabase
          .from('benefits')
          .insert(payload)
          .select()
          .single()
          .then(async (res) => {
            if (res.data) {
              savedId = (res.data as Benefit).id;
              setBenefitId(savedId);
            }
            return res;
          });

    // Cupones propios de la tienda (canal web): se suman a los que ya había; los repetidos se ignoran.
    if (!error && esWeb && savedId && codigosNuevos.length > 0) {
      const res = await supabase
        .from('benefit_codes')
        .upsert(codigosNuevos.map((code) => ({ benefit_id: savedId, code })), { onConflict: 'benefit_id,code', ignoreDuplicates: true });
      if (res.error) error = res.error;
      else {
        await cargarConteoCodigos(savedId);
        setCodigosTexto('');
      }
    }

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
        <ChevronLeft size={16} /> Volver a mis premios
      </button>
      <TopBar
        title={benefitId ? 'Editar premio' : 'Nuevo premio'}
        subtitle="Los premios que ofreces. Así los ven los clientes en la app."
      />

      {isFree && (
        <div className="flex items-center gap-2.5 bg-purple-light rounded-xl px-3.5 py-2.5 mb-4.5">
          <Star size={15} color="#8B4FD1" />
          <p className="text-[12.5px] text-text">
            {freeHasGratis
              ? '🔓 Ya tienes un premio gratis: este puede ser tu descuento.'
              : '🔒 Crea primero un premio gratis: así se habilita el descuento.'}
          </p>
        </div>
      )}

      <div className="max-w-[540px]">
        <Paso n={1} title="Tu premio" hint="Es lo primero que ven en la app.">
          {ideas.length > 0 && (
            <div className="bg-bg rounded-xl p-3 mb-4">
              <p className="text-[12.5px] font-semibold mb-2">💡 ¿No se te ocurre? Toca una idea para tu rubro</p>
              <div className="flex flex-wrap gap-1.5">
                {ideas.map((i) => (
                  <button
                    key={i.nombre}
                    type="button"
                    onClick={() => usarIdea(i)}
                    className="rounded-full px-3 py-1.5 text-[12px] font-semibold border text-left"
                    style={nombre === i.nombre ? { background: '#2E9E7C', borderColor: '#2E9E7C', color: '#fff' } : { background: 'var(--c-card)', borderColor: 'var(--c-line)', color: 'var(--c-text)' }}
                  >
                    {etiquetaIdea(i)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-2">Después cambias lo que quieras: el nombre, los Puntos o la foto.</p>
            </div>
          )}
          <ImageUpload
            bucket="benefit-images"
            path={`${businessId}/${benefitId ?? 'new'}-photo`}
            value={imageUrl}
            onUploaded={setImageUrl}
            label="Foto del premio (obligatoria)"
            shape="wide"
          />
          <div className="mt-4">
            <Field label="Nombre">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Salchipapa clásica" className={INPUT} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Descripción (opcional)">
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Ej: Papas fritas artesanales con salchicha y tus salsas favoritas."
                className={INPUT}
              />
            </Field>
          </div>
        </Paso>

        <Paso n={2} title="Cómo lo ofreces" hint="Elige una opción.">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'gratis', t: 'Gratis', d: 'Se lo lleva sin pagar', tone: 'aqua', locked: gratisLocked },
                { id: 'regalo', t: 'Regalo con compra', d: 'Si compra algo más', tone: 'aqua', locked: gratisLocked },
                { id: 'descuento', t: 'Descuento', d: 'Paga menos', tone: 'purple', locked: descuentoLocked },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={o.locked}
                title={o.locked ? (o.id === 'descuento' ? (freeHasDescuento ? 'Con Primer Paso tienes un solo descuento' : 'Crea primero un premio gratis') : 'Ya tienes un premio gratis: este puede ser un descuento') : ''}
                onClick={() => elegirModo(o.id)}
                className="rounded-xl border px-2 py-2.5 text-center disabled:cursor-not-allowed"
                style={choiceStyle(modo === o.id, o.tone, o.locked)}
              >
                <span className="block text-[13px] font-bold leading-tight">{o.t}</span>
                <span className="block text-[11px] mt-0.5 opacity-80 leading-tight">{o.d}</span>
              </button>
            ))}
          </div>

          {modo === 'regalo' && (
            <div className="mt-4">
              <span className="block text-[12.5px] font-semibold mb-1.5">¿Cómo lo dices?</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {INICIOS.map((op) => (
                  <button
                    key={op.inicio}
                    type="button"
                    onClick={() => setInicio(op.inicio)}
                    className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold border"
                    style={inicio === op.inicio
                      ? { background: '#2E9E7C', borderColor: '#2E9E7C', color: '#fff' }
                      : { background: 'var(--c-card)', borderColor: 'var(--c-line)', color: 'var(--c-muted)' }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-white border border-line rounded-[10px] px-3">
                {inicio ? <span className="text-[13.5px] font-semibold mr-1.5 whitespace-nowrap" style={{ color: 'var(--c-ok-text)' }}>{cap(inicio)}</span> : null}
                <input
                  value={compra}
                  onChange={(e) => setCompra(e.target.value.slice(0, 60 - (inicio ? inicio.length + 1 : 0)))}
                  placeholder={INICIOS.find((o) => o.inicio === inicio)?.ejemplo}
                  className="flex-1 min-w-0 bg-transparent py-2.5 text-[13.5px] outline-none"
                />
              </div>
              <Vista>«De regalo {compra.trim() ? frase : joinFrase(inicio, INICIOS.find((o) => o.inicio === inicio)?.ejemplo ?? '')}»</Vista>
            </div>
          )}

          {modo === 'descuento' && (
            <div className="mt-4">
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => setDescuentoModo('porcentaje')} className="flex-1 py-2 rounded-[10px] border text-[12.5px] font-semibold" style={choiceStyle(descuentoModo === 'porcentaje', 'purple')}>
                  % de descuento
                </button>
                <button type="button" onClick={() => setDescuentoModo('2x1')} className="flex-1 py-2 rounded-[10px] border text-[12.5px] font-semibold" style={choiceStyle(descuentoModo === '2x1', 'purple')}>
                  2x1
                </button>
                <button type="button" onClick={() => setDescuentoModo('texto')} className="flex-1 py-2 rounded-[10px] border text-[12.5px] font-semibold" style={choiceStyle(descuentoModo === 'texto', 'purple')}>
                  Otro (Bs fijos…)
                </button>
              </div>
              {descuentoModo === 'porcentaje' ? (
                <div className="flex items-center gap-2">
                  <input
                    value={descuentoPorcentaje}
                    onChange={(e) => setDescuentoPorcentaje(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="20"
                    aria-label="Porcentaje de descuento"
                    className="w-20 bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
                  />
                  <span className="text-[13.5px] text-muted">% de descuento</span>
                </div>
              ) : descuentoModo === '2x1' ? (
                <>
                  <p className="text-[12.5px] text-muted leading-4">Se lleva 2 y paga 1. Ideal para que la persona venga con un amigo: tú ganas dos clientes.</p>
                  <Vista>«2x1 en {nombre.trim() || 'tu premio'}»</Vista>
                </>
              ) : (
                <input value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="Ej: Bs 10 de descuento" aria-label="Detalle del descuento" className={INPUT} />
              )}
            </div>
          )}
        </Paso>

        <Paso n={3} title="Cuánto cuesta" hint="En Puntos de Camina. Se gana 1 Punto cada 1.000 pasos (máx. 20 por día).">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Puntos">
              <input value={costo} onChange={(e) => setCosto(e.target.value.replace(/\D/g, ''))} className={INPUT} />
            </Field>
            {!online && (
              <Field label={`Cupones por día${isFree && !ilimitado ? ' (mín. 3)' : ''}`}>
                <input
                  value={ilimitado && !isFree ? '∞' : cupones}
                  onChange={(e) => setCupones(e.target.value.replace(/\D/g, ''))}
                  disabled={!isFree && ilimitado}
                  className={`${INPUT} disabled:opacity-50`}
                />
              </Field>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 bg-bg rounded-xl px-3 py-2.5">
            <span className="text-[12.5px] text-muted">¿Cuánto vale en Bs?</span>
            <input
              value={valorBs}
              onChange={(e) => setValorBs(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="Bs"
              aria-label="Valor en Bs"
              className="w-20 bg-white border border-line rounded-[8px] px-2.5 py-1.5 text-[12.5px]"
            />
            {puntosSugeridos !== null ? (
              <button
                type="button"
                onClick={() => setCosto(String(puntosSugeridos))}
                className="rounded-full px-3 py-1 text-[12px] font-semibold"
                style={{ background: '#4FC3A8', color: '#fff' }}
              >
                Usar {puntosSugeridos} Puntos
              </button>
            ) : (
              <span className="text-[11.5px] text-muted">y te sugerimos los Puntos</span>
            )}
          </div>
          {!isFree && !online && (
            <Opcion on={ilimitado} onToggle={() => setIlimitado((v) => !v)} title="Cupones ilimitados" hint="Sin tope por día." />
          )}
        </Paso>

        <Paso n={4} title="Cuándo vale" hint="Si no tocas nada, vale todos los días a toda hora.">
          <span className="block text-[12.5px] font-semibold mb-1.5">Días</span>
          <div className="flex gap-1.5 mb-4">
            {DIAS.map((d, i) => {
              const on = !!(diasMask & (1 << i));
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDia(i)}
                  className="w-9 h-9 rounded-full text-[12px] font-bold"
                  style={{
                    background: on ? '#4FC3A8' : 'var(--c-card)',
                    color: on ? '#fff' : 'var(--c-muted)',
                    border: `1px solid ${on ? '#4FC3A8' : 'var(--c-line)'}`,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde">
              <TimeSelect allowEmpty value={validFrom} onChange={setValidFrom} className={INPUT} />
            </Field>
            <Field label="Hasta">
              <TimeSelect allowEmpty value={validTo} onChange={setValidTo} className={INPUT} />
            </Field>
          </div>
          <div className="mt-4 border-t border-line pt-3.5">
            <p className="text-[12.5px] font-semibold">⏰ Llena tu local en las horas flojas</p>
            <p className="text-[11.5px] text-muted mb-2 leading-4">Si el premio vale cuando casi no entra nadie, la gente llega justo cuando más la necesitas.</p>
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
                      background: on ? '#8B4FD1' : 'var(--c-card)',
                      color: on ? '#fff' : 'var(--c-muted)',
                      borderColor: on ? '#8B4FD1' : 'var(--c-line)',
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
                  background: diasMask === DIAS_ENTRE_SEMANA_MASK ? '#8B4FD1' : 'var(--c-card)',
                  color: diasMask === DIAS_ENTRE_SEMANA_MASK ? '#fff' : 'var(--c-muted)',
                  borderColor: diasMask === DIAS_ENTRE_SEMANA_MASK ? '#8B4FD1' : 'var(--c-line)',
                }}
              >
                Solo lunes a jueves
              </button>
            </div>
            {sugerida ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <p className="text-[11.5px] text-muted">
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
            ) : null}
          </div>
        </Paso>

        <Paso n={5} title="Más opciones" hint="Opcional.">
          {!online && (
            <Opcion on={dineInOnly} onToggle={() => setDineInOnly((v) => !v)} title="Solo para consumir en el local" hint="No vale para llevar." first />
          )}
          {!online && (
            <Opcion on={requiresBooking} onToggle={() => setRequiresBooking((v) => !v)} title="Con reserva" hint="Te escriben por WhatsApp antes de ir.">
              <input
                type="text"
                value={bookingNote}
                maxLength={120}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="Ej.: Solo con confirmación"
                aria-label="Nota de la reserva"
                className={INPUT}
              />
            </Opcion>
          )}
          <Opcion on={online} onToggle={() => setOnline((v) => !v)} title="Premio online" hint="Se canjea sin ir al local: por WhatsApp, redes o tu página." first={online}>
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
                      background: on ? '#4FC3A8' : 'var(--c-card)',
                      color: !ok ? 'var(--c-line)' : on ? '#fff' : 'var(--c-muted)',
                      borderColor: on ? '#4FC3A8' : 'var(--c-line)',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {!canalOk && (
              <p className="text-warn text-[12px] mt-2">
                Elige un canal. Si no ves el tuyo, cárgalo primero en <a href="/perfil" className="underline">Perfil</a>.
              </p>
            )}
            {esWeb ? (
              <div className="mt-3">
                <Field label="Tus cupones de la página (uno por línea)">
                  <textarea
                    value={codigosTexto}
                    onChange={(e) => setCodigosTexto(e.target.value)}
                    rows={5}
                    placeholder={'AMIGO15\nCAMINA15\nCAMINA16'}
                    className={`${INPUT} font-mono`}
                  />
                </Field>
                <p className="text-[11.5px] text-muted mt-1.5 leading-4">
                  Cada persona que canjea recibe uno distinto y lo pega al pagar en tu página. No hay nada que confirmar en Camina.
                </p>
                <p className="text-[12px] font-semibold mt-2" style={{ color: 'var(--c-ok-text)' }}>
                  {codigosLibres} sin usar · {codigosEntregados} entregados
                  {codigosNuevos.length > 0 ? ` · se van a sumar ${codigosNuevos.length} al guardar` : ''}
                </p>
                {codigosLibres + codigosNuevos.length === 0 && <p className="text-warn text-[12px] mt-1">Carga al menos un cupón para guardar.</p>}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2.5">
                <input
                  value={onlineQuota}
                  onChange={(e) => setOnlineQuota(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  aria-label="Cupos en total"
                  className="w-20 bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]"
                />
                <span className="text-[12px] text-muted leading-4">cupos en total. La persona te manda un código de 6 números y lo confirmas en Canjes (dura 7 días).</span>
              </div>
            )}
          </Opcion>
          <Opcion
            on={soloNuevos}
            onToggle={() => setSoloNuevos((v) => !v)}
            title="Solo para clientes nuevos"
            hint="Lo canjea solo quien nunca canjeó en tu local. Ideal para atraer gente que todavía no te conoce."
          />
          {fansReady && (
            <Opcion on={fansOnly} onToggle={() => setFansOnly((v) => !v)} title="Solo para tus Fans" hint="Un premio especial para tus clientes más fieles." />
          )}
        </Paso>

        <div className="bg-card border border-line rounded-2xl p-5">
          <Opcion
            on={active}
            onToggle={() => setActive((v) => !v)}
            title={active ? 'Premio activo' : 'Premio pausado'}
            hint={active ? 'Se ve en la app y se puede canjear.' : 'No aparece en la app hasta que lo actives.'}
            first
          />
          <div className="mt-4">
            {!imageUrl && <p className="text-warn text-[12.5px] mb-3">Sube una foto del premio para poder guardarlo.</p>}
            {error && <p className="text-warn text-[12.5px] mb-3">{error}</p>}
            {saved && <p className="text-aqua text-[12.5px] mb-3">Guardado.</p>}
            <button
              onClick={handleSave}
              disabled={saving || !nombre.trim() || !imageUrl || !canalOk || !cuposOnlineOk}
              className="w-full rounded-[10px] py-3.5 font-semibold text-sm disabled:opacity-50"
              style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}
            >
              {saving ? 'Guardando…' : 'Guardar premio'}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

const INPUT = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';

// Cada parte del formulario es una tarjeta numerada: se llena de arriba hacia abajo.
function Paso({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-2xl p-5 mb-3.5">
      <div className="flex items-start gap-2.5 mb-4">
        <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-extrabold" style={{ background: '#62F0B6', color: '#241748' }}>
          {n}
        </span>
        <div>
          <h2 className="text-[15px] font-bold leading-6 m-0">{title}</h2>
          {hint && <p className="text-[12px] text-muted leading-4">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// Una opción de prender/apagar, siempre igual: título, una línea de ayuda y el interruptor.
function Opcion({ on, onToggle, title, hint, first, children }: { on: boolean; onToggle: () => void; title: string; hint?: string; first?: boolean; children?: React.ReactNode }) {
  return (
    <div className={first ? '' : 'border-t border-line mt-3.5 pt-3.5'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-semibold">{title}</p>
          {hint && <p className="text-[11.5px] text-muted leading-4">{hint}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={title}
          onClick={onToggle}
          className="w-11 h-6 rounded-full relative shrink-0"
          style={{ background: on ? '#4FC3A8' : 'var(--c-line)' }}
        >
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: on ? '22px' : '2px' }} />
        </button>
      </div>
      {on && children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function Vista({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-muted mt-2">
      En la app se ve: <b style={{ color: 'var(--c-ok-text)' }}>{children}</b>
    </p>
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
