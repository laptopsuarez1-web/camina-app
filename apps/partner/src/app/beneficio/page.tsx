'use client';

import { useEffect, useState } from 'react';
import { Gift, Star, Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { supabase, type Benefit, type Business, type OnlineChannel } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { ImageUpload } from '@/components/ImageUpload';
import { TimeSelect } from '@/components/TimeSelect';
import { mensajeError } from '@/lib/errors';

// bit 0 = lunes ... bit 6 = domingo (mismo orden que valid_days_mask en
// supabase/migrations/0001_init.sql). 127 = todos los días.
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGO = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const TITULOS_PASO = ['Qué ofreces', 'La oferta', 'Condiciones', 'Revisar'];
const AYUDA_PASO = [
  'Elige cómo es tu premio. Lo demás viene después.',
  'Nombre, foto (opcional) y cuántos Puntos cuesta.',
  'Cuándo vale y quién puede canjearlo. Si no tocas nada, vale todos los días.',
  'Mira cómo lo ven en la app y publícalo.',
];

// Cómo empieza la frase del "Regalo con tu compra". Vacío = frase libre.
const INICIOS = [
  { inicio: 'llevando', label: 'Llevando…', ejemplo: 'lo que se lleva' },
  { inicio: 'con tu', label: 'Con tu…', ejemplo: 'lo que se lleva' },
  { inicio: 'si pides', label: 'Si pides…', ejemplo: 'lo que se lleva' },
  { inicio: 'al comprar', label: 'Al comprar…', ejemplo: 'lo que se lleva' },
  { inicio: '', label: 'Mi frase', ejemplo: 'tu frase' },
];

// Botones de elegir (Gratis/Descuento, % u otro): se leen bien en claro y en oscuro.
function choiceStyle(on: boolean, tone: 'aqua' | 'purple' | 'gold', locked = false): React.CSSProperties {
  if (locked) return { borderColor: 'var(--c-line)', background: 'var(--c-card)', color: 'var(--c-muted)', opacity: 0.45 };
  if (!on) return { borderColor: 'var(--c-line)', background: 'var(--c-card)', color: 'var(--c-muted)' };
  if (tone === 'gold') return { borderColor: '#E0B43A', background: 'var(--c-warn-light)', color: 'var(--c-warn-text)', boxShadow: 'inset 0 0 0 1px #E0B43A' };
  return tone === 'aqua'
    ? { borderColor: '#4FC3A8', background: 'var(--c-aqua-light)', color: 'var(--c-ok-text)', boxShadow: 'inset 0 0 0 1px #4FC3A8' }
    : { borderColor: '#8B4FD1', background: 'var(--c-purple-light)', color: 'var(--c-purple-text)', boxShadow: 'inset 0 0 0 1px #8B4FD1' };
}

// Bs con coma decimal solo si hace falta: 25 → «Bs 25», 25.5 → «Bs 25,50».
function bs(n: number) {
  return `Bs ${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')}`;
}

// Plan gratis: el premio Gratis "de verdad" (sin pedir compra).
function esGratisPuro(b: { type: string; with_purchase?: string | null }) {
  return b.type === 'gratis' && !b.with_purchase;
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

  // Plan gratis: primero 1 premio Gratis de verdad (sin compra); con ese activo se habilita 1 premio más de cualquier
  // otro tipo (regalo con compra, descuento, 2x1 o combo). Máximo 2. La base lo controla igual (0119).
  const activeBenefits = benefits.filter((b) => b.active);
  const hasGratis = activeBenefits.some(esGratisPuro);
  const hasDescuento = activeBenefits.some((b) => !esGratisPuro(b));
  const atFreeLimit = isFree && hasGratis && hasDescuento;

  return (
    <DashboardShell>
      <TopBar title="Mis premios" subtitle="Los premios que ofreces. Así los ven los clientes en la app." />

      {isFree && (
        <div className="flex items-start gap-3 bg-purple-light rounded-2xl px-4 py-3.5 mb-5">
          <Star size={16} color="#8B4FD1" className="mt-0.5 shrink-0" />
          <p className="text-[13px] leading-snug text-text">
            <strong>Plan gratis: 1 premio gratis y, con él, 1 más.</strong>{' '}
            {hasGratis
              ? hasDescuento
                ? 'Ya los tienes. Pasa a un plan de pago para sumar más.'
                : 'Ya puedes sumar tu segundo premio: regalo con compra, descuento, 2x1 o combo.'
              : 'Empieza con un premio gratis (sin compra): después se habilita el segundo.'}
          </p>
        </div>
      )}

      <button
        onClick={() => !atFreeLimit && setEditingId('new')}
        disabled={atFreeLimit}
        title={atFreeLimit ? 'Con el plan Primer Paso tienes 1 premio gratis y 1 más' : ''}
        className="flex items-center gap-2 rounded-full px-5 py-3 font-bold text-[14px] mb-5 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}
      >
        <Plus size={16} /> Crear premio
      </button>

      {loading && <p className="text-muted text-[13px]">Cargando…</p>}

      {!loading && benefits.length === 0 && (
        <div className="bg-card border border-line rounded-2xl p-8 text-center max-w-[480px]">
          <p className="font-semibold text-[15px] mb-1">Todavía no tienes premios</p>
          <p className="text-[13.5px] text-muted">Toca «Crear premio» para hacer el primero. Así tu local aparece en el mapa de la app.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 max-w-[860px]">
        {benefits.map((b) => (
          <div key={b.id} className="bg-card border border-line rounded-2xl p-4 flex gap-4">
            {b.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.image_url} alt={b.name} className="w-[76px] h-[76px] rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-[76px] h-[76px] rounded-2xl bg-purple-light shrink-0 flex items-center justify-center"><Gift size={26} color="#8B4FD1" /></div>
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
                {b.combo_price_bs != null ? `Combo a ${bs(Number(b.combo_price_bs))}` : b.with_purchase ? `De regalo ${b.with_purchase}` : b.type === 'gratis' ? 'Gratis' : b.discount_detail || 'Descuento'} · {b.cost_points} Puntos{b.new_customers_only ? ' · Solo clientes nuevos' : ''}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {b.online
                  ? `Online por ${CANALES_ONLINE.find((c) => c.id === b.online_channel)?.label ?? 'redes'} · ${b.online_channel === 'web' ? 'con tus cupones' : b.online_quota == null ? 'cupos ilimitados' : `${b.online_quota} cupos en total`}`
                  : b.daily_quota == null ? 'Cupones ilimitados' : `${b.daily_quota} cupones por día`}{b.weekly_quota != null ? ` · ${b.weekly_quota} por semana` : ''}{b.monthly_quota != null ? ` · ${b.monthly_quota} por mes` : ''}
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
  // Plan gratis: "gratis" es el premio Gratis sin compra; todo lo demás (regalo, descuento, 2x1, combo) es "el segundo".
  const freeHasGratis = otherActive.some(esGratisPuro);
  const freeHasDescuento = otherActive.some((b) => !esGratisPuro(b));
  const descuentoLocked = isFree && (!freeHasGratis || freeHasDescuento);
  const gratisLocked = isFree && freeHasGratis;
  const [tipo, setTipo] = useState<'gratis' | 'descuento'>(benefit?.type ?? (isFree && freeHasGratis ? 'descuento' : 'gratis'));
  const [descuentoModo, setDescuentoModo] = useState<'porcentaje' | '2x1' | 'texto'>(
    benefit == null || benefit.discount_percent != null ? 'porcentaje' : benefit?.discount_detail?.trim().toLowerCase() === '2x1' ? '2x1' : 'texto'
  );
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(
    benefit?.discount_percent != null ? String(benefit.discount_percent) : '20'
  );
  const [descuento, setDescuento] = useState(benefit?.discount_percent == null ? (benefit?.discount_detail ?? '') : '');
  const [costo, setCosto] = useState(benefit ? String(benefit.cost_points) : '10');
  // Guía, no regla: 2 Puntos = Bs 1.
  const [valorBs, setValorBs] = useState('');
  const puntosSugeridos = valorBs.trim() && Number(valorBs) > 0 ? Math.ceil(Number(valorBs) * 2) : null;
  const [ilimitado, setIlimitado] = useState(!isFree && benefit != null && benefit.daily_quota == null);
  const [cupones, setCupones] = useState(benefit?.daily_quota != null ? String(benefit.daily_quota) : '3');
  // Topes opcionales por semana y por mes (vacío = sin tope).
  const [cuposSemana, setCuposSemana] = useState(benefit?.weekly_quota != null ? String(benefit.weekly_quota) : '');
  const [cuposMes, setCuposMes] = useState(benefit?.monthly_quota != null ? String(benefit.monthly_quota) : '');
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
  // Combo Camina: un combo a precio especial (se guarda como descuento, con qué trae y los dos precios).
  const [esCombo, setEsCombo] = useState(benefit?.combo_price_bs != null);
  const [comboItems, setComboItems] = useState(benefit?.combo_items ?? '');
  const [comboPrecio, setComboPrecio] = useState(benefit?.combo_price_bs != null ? String(benefit.combo_price_bs) : '');
  const [comboNormal, setComboNormal] = useState(benefit?.combo_regular_bs != null ? String(benefit.combo_regular_bs) : '');
  // La opción aparece cuando la base ya tiene las columnas del combo (migración 0118).
  const [comboReady, setComboReady] = useState(false);
  useEffect(() => {
    supabase.from('benefits').select('combo_items').limit(1).then(({ error }) => setComboReady(!error));
  }, []);
  const modo: 'gratis' | 'regalo' | 'descuento' | 'combo' = tipo === 'descuento' ? (esCombo ? 'combo' : 'descuento') : conCompra ? 'regalo' : 'gratis';
  function elegirModo(m: 'gratis' | 'regalo' | 'descuento' | 'combo') {
    const esDescuento = m === 'descuento' || m === 'combo';
    if (m === 'gratis' ? gratisLocked : descuentoLocked) return;
    setTipo(esDescuento ? 'descuento' : 'gratis');
    setConCompra(m === 'regalo');
    setEsCombo(m === 'combo');
    if (m === 'combo' && !nombre.trim()) setNombre('Combo Camina');
  }
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
  // El upload de foto necesita una carpeta — para un premio nuevo todavía
  // no hay id, así que usamos la del comercio hasta el primer guardado.
  const [benefitId, setBenefitId] = useState<string | null>(benefit?.id ?? null);

  function toggleDia(bit: number) {
    setDiasMask((prev) => (prev & (1 << bit) ? prev & ~(1 << bit) : prev | (1 << bit)));
  }

  const [paso, setPaso] = useState(1);
  const [pasoError, setPasoError] = useState<string | null>(null);
  function irAPaso(n: number) {
    setPasoError(null);
    setPaso(n);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Cada paso se revisa antes de seguir, con un mensaje que dice qué corregir.
  function continuar() {
    setPasoError(null);
    if (paso === 1) {
      if (modo === 'combo') {
        if (comboItems.trim().length < 3) return setPasoError('Escribe qué trae el combo.');
        if (!(Number(comboPrecio) > 0) || !(Number(comboNormal) > Number(comboPrecio))) return setPasoError('El precio con Camina tiene que ser menor que el precio normal.');
      }
      if (modo === 'regalo' && compra.trim().length < 2) return setPasoError('Completa la frase de tu premio.');
      if (modo === 'descuento') {
        if (descuentoModo === 'porcentaje' && !(Number(descuentoPorcentaje) > 0)) return setPasoError('Escribe el porcentaje de descuento.');
        if (descuentoModo === 'texto' && !descuento.trim()) return setPasoError('Escribe el descuento.');
      }
    }
    if (paso === 2) {
      if (!nombre.trim()) return setPasoError('Ponle un nombre a tu premio.');
      if (!(Number(costo) > 0)) return setPasoError('Escribe cuántos Puntos cuesta.');
      // Con plan de pago basta UNO de los topes (día, semana o mes) o «ilimitados»; el plan gratis pide mínimo 3 por día.
      const algunTope = ilimitado || Number(cupones) >= 1 || Number(cuposSemana) >= 1 || Number(cuposMes) >= 1;
      if (!online && !(isFree ? Number(cupones) >= 3 : algunTope)) {
        return setPasoError(isFree ? 'Con el plan gratis son mínimo 3 cupones por día.' : 'Pon un tope por día, por semana o por mes, o activa «Cupones ilimitados».');
      }
    }
    if (paso === 3) {
      if (!canalOk) return setPasoError('Elige por dónde te escriben para cobrar. Si no ves el tuyo, cárgalo primero en Mi local.');
      if (!cuposOnlineOk) return setPasoError(esWeb ? 'Carga al menos un cupón de tu página.' : 'Escribe cuántos cupos das en total.');
    }
    irAPaso(paso + 1);
  }
  const ofertaTexto =
    modo === 'combo'
      ? `${nombre.trim() || 'Combo Camina'} a ${bs(Number(comboPrecio) || 0)}${Number(comboNormal) > Number(comboPrecio) ? ` (antes ${bs(Number(comboNormal))})` : ''}`
      : modo === 'regalo'
        ? `De regalo ${frase}`
        : modo === 'descuento'
          ? descuentoModo === 'porcentaje'
            ? `${Number(descuentoPorcentaje) || 0}% de descuento`
            : descuentoModo === '2x1'
              ? '2x1'
              : descuento.trim() || 'Descuento'
          : 'Gratis';
  const diasTxt = diasMask === 127 ? 'todos los días' : DIAS_LARGO.filter((_, i) => diasMask & (1 << i)).join(', ') || 'ningún día';
  const resumenCuando = online ? 'Online, sin horario' : `${diasTxt}${validFrom && validTo ? `, de ${validFrom} a ${validTo}` : ', a toda hora'}`;
  const resumenCupos = online
    ? esWeb
      ? `${codigosLibres + codigosNuevos.length} cupones de tu página`
      : `${Number(onlineQuota) || 0} en total`
    : !isFree && ilimitado
      ? 'Ilimitados'
      : `${Number(cupones) || 0} por día`;

  async function handleSave() {
    setError(null);
    setSaved(false);
    if (modo === 'combo') {
      if (comboItems.trim().length < 3) {
        setError('Escribe qué trae el combo.');
        return;
      }
      if (!(Number(comboPrecio) > 0) || !(Number(comboNormal) > Number(comboPrecio))) {
        setError('El precio con Camina tiene que ser menor que el precio normal.');
        return;
      }
    }
    if (modo === 'regalo' && compra.trim().length < 2) {
      setError('Completa la frase de tu premio.');
      return;
    }
    setSaving(true);

    const payload = {
      business_id: businessId,
      name: nombre.trim(),
      type: tipo,
      discount_detail:
        modo === 'combo'
          ? `Combo a ${bs(Number(comboPrecio))}`
          : tipo === 'descuento'
          ? descuentoModo === 'porcentaje'
            ? `${Number(descuentoPorcentaje) || 0}% de descuento`
            : descuentoModo === '2x1'
              ? '2x1'
              : descuento.trim()
          : null,
      discount_percent: modo !== 'combo' && tipo === 'descuento' && descuentoModo === 'porcentaje' ? Number(descuentoPorcentaje) || null : null,
      ...(comboReady
        ? modo === 'combo'
          ? { combo_items: comboItems.trim(), combo_price_bs: Number(comboPrecio), combo_regular_bs: Number(comboNormal) }
          : { combo_items: null, combo_price_bs: null, combo_regular_bs: null }
        : {}),
      cost_points: Number(costo) || 0,
      // Online: los cupos son totales (online_quota o los cupones cargados); el tope por día no aplica (en Primer Paso la regla pide mínimo 3).
      daily_quota: online ? (isFree ? 3 : null) : !isFree && ilimitado ? null : Number(cupones) >= 1 ? Number(cupones) : isFree ? 3 : null,
      // Solo se mandan si hay algo que guardar o borrar: así el panel sigue guardando aunque la base todavía no tenga estas columnas (0129).
      ...(Number(cuposSemana) > 0 || benefit?.weekly_quota != null ? { weekly_quota: online || !(Number(cuposSemana) > 0) ? null : Number(cuposSemana) } : {}),
      ...(Number(cuposMes) > 0 || benefit?.monthly_quota != null ? { monthly_quota: online || !(Number(cuposMes) > 0) ? null : Number(cuposMes) } : {}),
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

  // Tarjeta del premio como la ve una persona en la app (en vivo mientras se carga).
  const tarjetaPremio = (
              <div className="rounded-2xl border border-line overflow-hidden bg-bg">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full h-[170px] object-cover" />
                ) : (
                  <div className="w-full h-[120px] bg-purple-light flex items-center justify-center"><Gift size={38} color="#8B4FD1" /></div>
                )}
                <div className="p-4">
                  <p className="text-[16px] font-bold leading-tight">{nombre.trim() || 'Sin nombre'}</p>
                  <p className="text-[13.5px] font-semibold mt-1" style={{ color: 'var(--c-ok-text)' }}>{ofertaTexto}</p>
                  {descripcion.trim() && <p className="text-[12.5px] text-muted mt-1.5 leading-5">{descripcion.trim()}</p>}
                  <p className="text-[12.5px] mt-2.5"><b>{Number(costo) || 0} Puntos</b> para canjearlo</p>
                </div>
              </div>
  );

  return (
    <DashboardShell>
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-muted mb-3"
      >
        <ChevronLeft size={16} /> Volver a mis premios
      </button>
      <TopBar
        title={benefitId ? 'Editar premio' : 'Crear premio'}
        subtitle="En 4 pasos cortos. Así lo ven los clientes en la app."
      />

      {isFree && (
        <div className="flex items-center gap-2.5 bg-purple-light rounded-xl px-3.5 py-2.5 mb-4.5">
          <Star size={15} color="#8B4FD1" />
          <p className="text-[12.5px] text-text">
            {freeHasGratis
              ? '🔓 Ya tienes tu premio gratis: este puede ser tu segundo premio (regalo con compra, descuento, 2x1 o combo).'
              : '🔒 Empieza con un premio gratis (sin compra): así se habilita el segundo.'}
          </p>
        </div>
      )}

      <div className="max-w-[540px]">
        <PasoCabecera paso={paso} total={4} titulos={TITULOS_PASO} ayuda={AYUDA_PASO} onIr={irAPaso} />

        {paso === 1 && (
          <>
        <Paso title="¿Qué le das a la persona?" hint="Elige una opción.">
          <div className={`grid gap-2 ${comboReady ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {(
              [
                { id: 'gratis', t: 'Gratis', d: 'Se lo lleva sin pagar', tone: 'aqua', locked: gratisLocked },
                { id: 'regalo', t: 'Regalo con compra', d: 'Si compra algo más', tone: 'aqua', locked: descuentoLocked },
                { id: 'descuento', t: 'Descuento', d: 'Paga menos', tone: 'purple', locked: descuentoLocked },
                ...(comboReady ? [{ id: 'combo' as const, t: 'Combo Camina', d: 'Un combo a precio especial', tone: 'gold' as const, locked: descuentoLocked }] : []),
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={o.locked}
                title={o.locked ? (o.id === 'gratis' ? 'Ya tienes tu premio gratis: este puede ser el segundo' : freeHasDescuento ? 'Con Primer Paso tienes un premio gratis y uno más' : 'Empieza con un premio gratis (sin compra)') : ''}
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

          {modo === 'combo' && (
            <div className="mt-4">
              <Field label="¿Qué trae el combo?">
                <input value={comboItems} onChange={(e) => setComboItems(e.target.value.slice(0, 120))} placeholder="Escribe qué incluye el combo" className={INPUT} />
              </Field>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Precio normal (Bs)">
                  <input value={comboNormal} onChange={(e) => setComboNormal(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} placeholder="Bs" inputMode="decimal" className={INPUT} />
                </Field>
                <Field label="Precio con Camina (Bs)">
                  <input value={comboPrecio} onChange={(e) => setComboPrecio(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} placeholder="Bs" inputMode="decimal" className={INPUT} />
                </Field>
              </div>
              <Vista>
                «{nombre.trim() || 'Combo Camina'} · {Number(comboPrecio) > 0 ? bs(Number(comboPrecio)) : 'Bs 25'}
                {Number(comboNormal) > Number(comboPrecio) ? ` (antes ${bs(Number(comboNormal))})` : ''}»
              </Vista>
              <p className="text-[11.5px] text-muted mt-1 leading-4">La persona paga el combo en tu local.</p>
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
                <input value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="Escribe el descuento" aria-label="Detalle del descuento" className={INPUT} />
              )}
            </div>
          )}
        </Paso>
          </>
        )}

        {paso === 2 && (
          <>
        <Paso title="Tu premio" hint="Es lo primero que ven en la app.">
          <ImageUpload
            bucket="benefit-images"
            path={`${businessId}/${benefitId ?? 'new'}-photo`}
            value={imageUrl}
            onUploaded={setImageUrl}
            label="Foto del premio (opcional)"
            shape="wide"
          />
          <div className="mt-4">
            <Field label="Nombre">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del premio" className={INPUT} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Descripción (opcional)">
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Cuenta qué incluye el premio"
                className={INPUT}
              />
            </Field>
          </div>
        </Paso>
        <Paso title="Cuánto cuesta" hint="En Puntos de Camina. Como guía: 2 Puntos equivalen a Bs 1 (algo de Bs 10 son unos 20 Puntos).">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Puntos">
              <input value={costo} onChange={(e) => setCosto(e.target.value.replace(/\D/g, ''))} className={INPUT} />
            </Field>
            {!online && (
              <Field label={`Cupones por día${isFree ? ' (mín. 3)' : ' (opcional)'}`}>
                <input
                  value={ilimitado && !isFree ? '∞' : cupones}
                  onChange={(e) => setCupones(e.target.value.replace(/\D/g, ''))}
                  disabled={!isFree && ilimitado}
                  className={`${INPUT} disabled:opacity-50`}
                />
              </Field>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[12.5px] text-muted">{modo === 'descuento' ? 'Recomendación (opcional): ¿cuánto vale el descuento en Bs?' : 'Recomendación (opcional): ¿cuánto vale en Bs?'}</span>
            <input
              value={valorBs}
              onChange={(e) => setValorBs(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="Bs"
              aria-label="Valor en Bs"
              inputMode="decimal"
              className="w-20 bg-white border border-line rounded-[10px] px-3 py-2 text-[13.5px]"
            />
            {puntosSugeridos !== null ? (
              <button type="button" onClick={() => setCosto(String(puntosSugeridos))} className="text-[12.5px] font-semibold text-purple">
                Usar {puntosSugeridos} Puntos
              </button>
            ) : (
              <span className="text-[11.5px] text-muted">y te sugerimos los Puntos (2 Puntos = Bs 1). Tú decides cuántos Puntos cuesta.</span>
            )}
          </div>
          {!isFree && !online && (
            <Opcion on={ilimitado} onToggle={() => setIlimitado((v) => !v)} title="Cupones ilimitados" hint="Sin tope por día." />
          )}
          {!online && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Tope por semana (opcional)">
                <input value={cuposSemana} onChange={(e) => setCuposSemana(e.target.value.replace(/\D/g, ''))} placeholder="Sin tope" className={INPUT} />
              </Field>
              <Field label="Tope por mes (opcional)">
                <input value={cuposMes} onChange={(e) => setCuposMes(e.target.value.replace(/\D/g, ''))} placeholder="Sin tope" className={INPUT} />
              </Field>
            </div>
          )}
        </Paso>
          </>
        )}

        {paso === 3 && (
          <>
        <Paso title="Cuándo vale" hint="Si no tocas nada, vale todos los días a toda hora.">
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
        </Paso>
        <Paso title="Más opciones" hint="Opcional.">
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
                placeholder="Aclaración para la reserva"
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
          </>
        )}

        {paso === 4 && (
          <>
            <Paso title="Así lo van a ver" hint="Revisa que todo esté bien antes de guardar.">
              {tarjetaPremio}
              <p className="text-[11.5px] text-muted mt-2">Vista aproximada de cómo lo ve una persona en Camina.</p>
            </Paso>
            <Paso title="Resumen">
              <ul className="text-[13px] leading-6 flex flex-col">
                <li><b>Qué da:</b> {ofertaTexto}</li>
                <li><b>Cuándo vale:</b> {resumenCuando}</li>
                <li><b>Cupones:</b> {resumenCupos}</li>
                {dineInOnly && !online && <li><b>Solo</b> para consumir en el local</li>}
                {requiresBooking && !online && <li><b>Con reserva</b> por WhatsApp</li>}
                {soloNuevos && <li><b>Solo</b> para clientes nuevos</li>}
                {fansOnly && fansReady && <li><b>Solo</b> para tus Fans</li>}
                {online && <li><b>Online</b> por {CANALES_ONLINE.find((c) => c.id === onlineChannel)?.label ?? 'redes'}</li>}
              </ul>
            </Paso>
        <div className="bg-card border border-line rounded-2xl p-5 mb-3.5">
          <Opcion
            on={active}
            onToggle={() => setActive((v) => !v)}
            title={active ? 'Premio activo' : 'Premio pausado'}
            hint={active ? 'Se ve en la app y se puede canjear.' : 'No aparece en la app hasta que lo actives.'}
            first
          />
          <div className="mt-4">
            {error && <p className="text-warn text-[12.5px] mb-3">{error}</p>}
            {saved && <p className="text-aqua text-[12.5px] mb-3">Guardado.</p>}
            <button
              onClick={handleSave}
              disabled={saving || !nombre.trim() || !canalOk || !cuposOnlineOk}
              className="w-full rounded-[10px] py-3.5 font-semibold text-sm disabled:opacity-50"
              style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}
            >
              {saving ? 'Guardando…' : active ? 'Publicar premio' : 'Guardar premio (pausado)'}
            </button>
          </div>
        </div>
          </>
        )}

        {pasoError && <p className="text-warn text-[12.5px] mb-3">{pasoError}</p>}
        <div className="flex gap-2.5 mb-8">
          {paso > 1 ? (
            <button type="button" onClick={() => irAPaso(paso - 1)} className="rounded-[10px] px-5 py-3.5 font-semibold text-sm bg-white border border-line">
              Atrás
            </button>
          ) : (
            <button type="button" onClick={onCancel} className="rounded-[10px] px-5 py-3.5 font-semibold text-sm bg-white border border-line">
              Cancelar
            </button>
          )}
          {paso < 4 && (
            <button type="button" onClick={continuar} className="flex-1 rounded-[10px] py-3.5 font-semibold text-sm" style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}>
              Continuar
            </button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

const INPUT = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';

// Cada parte del formulario es una tarjeta numerada: se llena de arriba hacia abajo.
function Paso({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-2xl p-5 mb-3.5">
      <div className="mb-4">
        <h2 className="text-[15px] font-bold leading-6 m-0">{title}</h2>
        {hint && <p className="text-[12px] text-muted leading-4">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function PasoCabecera({ paso, total, titulos, ayuda, onIr }: { paso: number; total: number; titulos: string[]; ayuda: string[]; onIr: (n: number) => void }) {
  return (
    <div className="mb-4">
      <div className="flex gap-1.5 mb-2.5" role="list" aria-label="Pasos">
        {titulos.map((t, i) => (
          <button key={t} type="button" role="listitem" onClick={() => onIr(i + 1)} aria-label={`Paso ${i + 1}: ${t}`} aria-current={i + 1 === paso ? 'step' : undefined} className="flex-1 text-left">
            <span className="block h-1.5 rounded-full" style={{ background: i + 1 <= paso ? '#62F0B6' : 'var(--c-line)' }} />
            <span className={`block text-[11px] mt-1 truncate ${i + 1 === paso ? 'font-bold text-text' : 'text-muted'}`}>{t}</span>
          </button>
        ))}
      </div>
      <p className="text-[12px] text-muted font-semibold">Paso {paso} de {total}</p>
      <h2 className="text-[19px] font-bold m-0">{titulos[paso - 1]}</h2>
      <p className="text-[13px] text-muted mt-0.5">{ayuda[paso - 1]}</p>
    </div>
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
