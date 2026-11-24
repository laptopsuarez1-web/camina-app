'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, MapPin, MessageCircle, ImagePlus } from 'lucide-react';
import { supabase, type Benefit, type Business } from '@/lib/supabase';
import { mensajeError } from '@/lib/errors';
import { CATEGORIAS } from '@/lib/categories';
import { FichaPreview } from '@/components/FichaPreview';
import { PresentarLocal, type VistaLocal } from '@/components/PresentarLocal';
import { MapPicker } from '@/components/MapPicker';
import { PLAN_KINDS, partnersWa, bs, type Partner, type PartnerLead, type PlanKind } from '@/lib/partners';

const CAMPO = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[14px] text-text';
const ETIQ = 'grid gap-1 text-[13px] font-semibold text-text';

type Foto = { url: string | null; blob: Blob | null };

// Achica la foto en el celular antes de subirla (lado mayor 1600 px) para que cargue rápido con pocos datos.
async function achicar(file: File): Promise<Foto> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
  if (!blob) throw new Error('No pudimos leer la foto.');
  return { url: URL.createObjectURL(blob), blob };
}

function Subir({ titulo, ayuda, foto, onChange, redonda }: { titulo: string; ayuda: string; foto: Foto; onChange: (f: Foto) => void; redonda?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <p className="text-[13px] font-semibold text-text mb-1">{titulo}</p>
      <label className="flex items-center gap-3 bg-card border border-dashed border-line rounded-xl p-2.5 cursor-pointer">
        <span className={`w-[64px] h-[64px] shrink-0 bg-purple-light overflow-hidden flex items-center justify-center text-muted ${redonda ? 'rounded-full' : 'rounded-xl'}`}>
          {foto.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={22} />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] text-text font-semibold">{foto.url ? 'Cambiar foto' : 'Sacar o elegir foto'}</span>
          <span className="block text-muted text-[12px]">{ayuda}</span>
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setError(null);
            try {
              onChange(await achicar(f));
            } catch {
              setError('No pudimos leer esa foto. Prueba con otra.');
            }
          }}
        />
      </label>
      {error && <p className="text-warn text-[12px] mt-1">{error}</p>}
    </div>
  );
}

export function CargarLocal({ partner, lead }: { partner: Partner; lead: PartnerLead | null }) {
  const [local, setLocal] = useState(lead?.business_name ?? '');
  const [dueno, setDueno] = useState(lead?.owner_name ?? '');
  const [tel, setTel] = useState(lead?.owner_phone ?? '');
  const [zona, setZona] = useState(lead?.zone ?? '');
  const [plan, setPlan] = useState<PlanKind>(lead?.plan_kind ?? 'gratis');
  const [categoria, setCategoria] = useState(lead?.category ?? '');
  const [direccion, setDireccion] = useState(lead?.address ?? '');
  const [descripcion, setDescripcion] = useState(lead?.description ?? '');
  const [horario, setHorario] = useState(lead?.hours_text ?? '');
  const [instagram, setInstagram] = useState(lead?.instagram ?? '');
  const [mapsUrl, setMapsUrl] = useState(lead?.maps_url ?? '');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(lead?.lat != null && lead?.lng != null ? { lat: lead.lat, lng: lead.lng } : null);
  const [logo, setLogo] = useState<Foto>({ url: lead?.logo_url ?? null, blob: null });
  const [portada, setPortada] = useState<Foto>({ url: lead?.cover_url ?? null, blob: null });
  const [fotoPremio, setFotoPremio] = useState<Foto>({ url: lead?.benefit_image_url ?? null, blob: null });
  const [tipo, setTipo] = useState<'gratis' | 'descuento'>(lead?.benefit_kind ?? 'gratis');
  const [premio, setPremio] = useState(lead?.benefit_name ?? '');
  const [premioDesc, setPremioDesc] = useState(lead?.benefit_description ?? '');
  const [costo, setCosto] = useState(String(lead?.benefit_cost ?? 10));
  const [cupos, setCupos] = useState(String(lead?.benefit_quota ?? 5));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [presentar, setPresentar] = useState(false);

  // La ficha tal como la ve la gente en la app, armada con lo que se va escribiendo.
  const negocio = useMemo(
    () =>
      ({
        id: 'vista-previa',
        name: local.trim() || 'Nombre del local',
        category: categoria || 'Categoría',
        description: descripcion.trim() || null,
        address: direccion.trim() || null,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
        phone: tel,
        instagram: instagram.trim() || null,
        hours_text: horario.trim() || null,
        logo_url: logo.url,
        cover_url: portada.url,
        is_virtual: false,
      }) as unknown as Business,
    [local, categoria, descripcion, direccion, pos, tel, instagram, horario, logo.url, portada.url],
  );
  const premios = useMemo(
    () =>
      premio.trim()
        ? ([
            {
              id: 'p1',
              name: premio.trim(),
              description: premioDesc.trim() || (tipo === 'gratis' ? 'Premio gratis' : 'Descuento'),
              cost_points: Number(costo) || 10,
              image_url: fotoPremio.url,
              active: true,
              type: tipo,
            },
          ] as unknown as Benefit[])
        : [],
    [premio, premioDesc, costo, fotoPremio.url, tipo],
  );

  const vistaLocal: VistaLocal = {
    name: local.trim() || 'Nombre del local',
    category: categoria || null,
    description: descripcion.trim() || null,
    address: direccion.trim() || null,
    hours_text: horario.trim() || null,
    instagram: instagram.trim() || null,
    phone: tel,
    logo_url: logo.url,
    cover_url: portada.url,
    lat: pos?.lat ?? null,
    lng: pos?.lng ?? null,
    premio: premio.trim()
      ? { name: premio.trim(), description: premioDesc.trim() || null, cost: Number(costo) || 10, image_url: fotoPremio.url, kind: tipo }
      : null,
  };

  const faltan = [
    descripcion.trim().length < 15 && 'la descripción (mínimo 15 letras)',
    !categoria && 'la categoría',
    !direccion.trim() && 'la dirección',
    !pos && 'la ubicación en el mapa',
    !horario.trim() && 'el horario',
    !logo.url && 'el logo',
    !portada.url && 'la portada',
    !premio.trim() && 'el premio',
    premio.trim() && !fotoPremio.url && 'la foto del premio',
  ].filter(Boolean) as string[];


  function ubicar() {
    setGpsMsg('Buscando tu ubicación…');
    if (!navigator.geolocation) {
      setGpsMsg('Este celular no permite usar la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGpsMsg('Ubicación guardada. Tiene que ser estando dentro del local.');
      },
      () => setGpsMsg('No pudimos tomar la ubicación. Acepta el permiso o pega el link de Google Maps abajo.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function subir(foto: Foto, uid: string, leadId: string, nombre: string): Promise<string | null> {
    if (!foto.blob) return foto.url;
    const path = `${uid}/${leadId}/${nombre}.jpg`;
    const { error: err } = await supabase.storage.from('partner-leads').upload(path, foto.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' });
    if (err) throw err;
    return `${supabase.storage.from('partner-leads').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let leadId = lead?.id ?? null;
      if (!leadId) {
        const { data, error: err } = await supabase.rpc('partner_report_lead', {
          p_business: local, p_owner: dueno, p_phone: tel, p_zone: zona, p_plan: plan, p_note: '',
        });
        if (err) throw err;
        leadId = (data as PartnerLead).id;
      }
      const uid = partner.user_id;
      const [logoUrl, coverUrl, premioUrl] = await Promise.all([
        subir(logo, uid, leadId, 'logo'),
        subir(portada, uid, leadId, 'portada'),
        subir(fotoPremio, uid, leadId, 'premio'),
      ]);
      const { error: err2 } = await supabase.rpc('partner_save_lead_details', {
        p_lead: leadId,
        p_data: {
          category: categoria, address: direccion, description: descripcion, hours_text: horario, instagram,
          maps_url: mapsUrl, lat: pos?.lat ?? null, lng: pos?.lng ?? null,
          logo_url: logoUrl, cover_url: coverUrl, benefit_image_url: premioUrl,
          benefit_kind: premio.trim() ? tipo : null, benefit_name: premio, benefit_description: premioDesc,
          benefit_cost: premio.trim() ? Number(costo) || 10 : null, benefit_quota: premio.trim() ? Number(cupos) || 5 : null,
        },
      });
      if (err2) throw err2;
      setHecho(local);
    } catch (err) {
      setError(mensajeError(err));
    }
    setBusy(false);
  }

  if (hecho) {
    return (
      <div className="max-w-[460px]">
        <div className="bg-card border border-line rounded-2xl p-5 text-center">
          <CheckCircle2 size={40} className="text-aqua mx-auto mb-2" />
          <p className="font-bold text-text text-[17px] mb-1">¡{hecho} quedó cargado!</p>
          <p className="text-muted text-[13.5px] mb-4">
            Camina lo revisa y lo publica. Lo ves cambiar de estado en “Mis locales”.
            {faltan.length > 0 && ` Para publicarlo más rápido te falta: ${faltan.join(', ')}.`}
          </p>
          <a href="/partners/panel/reportar" className="block w-full bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] rounded-xl py-3 font-bold text-[14px] mb-2">Cargar otro local</a>
          <Link href="/partners/panel/locales" className="block text-muted text-[13px] py-1.5">Ver mis locales</Link>
          <a href={partnersWa(`Hola! Soy ${partner.code}. Cargué el local ${hecho} y quiero avisar.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-aqua text-[13px] font-semibold mt-1">
            <MessageCircle size={14} /> Avisar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const vista = (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-2 text-center">Así se ve en la app</p>
      <FichaPreview business={negocio} benefits={premios} />
    </div>
  );

  return (
    <>
      <h1 className="text-[22px] font-bold text-text mb-1">{lead ? 'Editar datos del local' : 'Cargar un local'}</h1>
      <p className="text-muted text-[13.5px] mb-5">Llena los datos con el dueño y mira cómo queda su local en la app. Camina lo revisa y lo publica.</p>

      <button type="button" onClick={() => setPresentar(true)} className="flex items-center justify-center gap-2 w-full max-w-[460px] bg-mint text-mint-dark rounded-xl py-3.5 font-bold text-[14.5px] mb-5">
        <Eye size={18} /> Mostrar al dueño cómo quedaría
      </button>

      <div className="lg:grid lg:grid-cols-[minmax(0,460px)_360px] lg:gap-8 items-start">
        <form onSubmit={guardar} className="flex flex-col gap-3 min-w-0 pb-24 lg:pb-0">
          <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-purple-text)' }}>El local y su dueño</p>
          <label className={ETIQ}>Nombre del local
            <input value={local} onChange={(e) => setLocal(e.target.value)} required disabled={!!lead} placeholder="Café Central" className={CAMPO} />
          </label>
          <label className={ETIQ}>Nombre del dueño
            <input value={dueno} onChange={(e) => setDueno(e.target.value)} disabled={!!lead} placeholder="María Pérez" className={CAMPO} />
          </label>
          <label className={ETIQ}>WhatsApp del dueño
            <input value={tel} onChange={(e) => setTel(e.target.value)} required disabled={!!lead} inputMode="tel" placeholder="71234567" className={CAMPO} />
            <span className="text-muted text-[12px] font-normal">Identifica al local: no se puede cargar dos veces.</span>
          </label>
          <label className={ETIQ}>Zona
            <input value={zona} onChange={(e) => setZona(e.target.value)} disabled={!!lead} placeholder="Centro" className={CAMPO} />
          </label>
          {!lead && (
            <label className={ETIQ}>Plan con el que entró
              <select value={plan} onChange={(e) => setPlan(e.target.value as PlanKind)} className={CAMPO}>
                {PLAN_KINDS.map((p) => <option key={p.id} value={p.id}>{p.label} · cobras {bs(p.amount)}</option>)}
              </select>
            </label>
          )}

          <p className="text-[12px] font-bold uppercase tracking-wider mt-3" style={{ color: 'var(--c-purple-text)' }}>Datos del local</p>
          <label className={ETIQ}>Categoría
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={CAMPO}>
              <option value="">Elige una</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className={ETIQ}>Descripción
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value.slice(0, 500))} rows={3} placeholder="Qué ofrece y qué lo hace especial (2 frases bastan)" className={CAMPO} />
            <span className="text-muted text-[12px] font-normal">{descripcion.trim().length}/500 · mínimo 15</span>
          </label>
          <label className={ETIQ}>Dirección
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle y número, o entre qué calles" className={CAMPO} />
          </label>
          <label className={ETIQ}>Horario
            <input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Lun a Sáb 8:00 - 20:00" className={CAMPO} />
          </label>
          <label className={ETIQ}>Instagram (opcional)
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@elcafe" className={CAMPO} />
          </label>
          <div>
            <button type="button" onClick={ubicar} className="flex items-center justify-center gap-2 w-full border border-line bg-card text-text rounded-xl py-2.5 text-[13.5px] font-semibold">
              <MapPin size={16} /> {pos ? 'Ubicación guardada: tocar para repetir' : 'Usar mi ubicación actual (dentro del local)'}
            </button>
            {gpsMsg && <p className="text-muted text-[12px] mt-1">{gpsMsg}</p>}
          </div>
          {pos && (
            <div>
              <p className="text-[13px] font-semibold text-text mb-1">Pin en el mapa</p>
              <MapPicker value={pos} onChange={setPos} />
              <p className="text-muted text-[12px] mt-1">Toca el mapa o arrastra el pin para ajustarlo a la puerta del local.</p>
            </div>
          )}
          <label className={ETIQ}>Link de Google Maps (opcional)
            <input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/..." className={CAMPO} />
          </label>

          <p className="text-[12px] font-bold uppercase tracking-wider mt-3" style={{ color: 'var(--c-purple-text)' }}>Fotos</p>
          <Subir titulo="Logo" ayuda="Cuadrado. Si no tiene, la fachada." foto={logo} onChange={setLogo} redonda />
          <Subir titulo="Portada" ayuda="Foto horizontal del local, de día." foto={portada} onChange={setPortada} />

          <p className="text-[12px] font-bold uppercase tracking-wider mt-3" style={{ color: 'var(--c-purple-text)' }}>El premio (lo elige el dueño)</p>
          <div className="flex gap-2">
            {(['gratis', 'descuento'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)} aria-pressed={tipo === t}
                className={`flex-1 rounded-xl py-2.5 text-[13.5px] font-semibold border ${tipo === t ? 'bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] border-transparent' : 'bg-card text-muted border-line'}`}>
                {t === 'gratis' ? 'Regala algo' : 'Descuento'}
              </button>
            ))}
          </div>
          <label className={ETIQ}>Nombre del premio
            <input value={premio} onChange={(e) => setPremio(e.target.value)} placeholder={tipo === 'gratis' ? 'Café americano gratis' : '20% en tu compra'} className={CAMPO} />
          </label>
          <label className={ETIQ}>Descripción del premio (opcional)
            <input value={premioDesc} onChange={(e) => setPremioDesc(e.target.value)} placeholder="Válido de lunes a viernes por la tarde" className={CAMPO} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={ETIQ}>Puntos que cuesta
              <input value={costo} onChange={(e) => setCosto(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={CAMPO} />
            </label>
            <label className={ETIQ}>Cupones por día
              <input value={cupos} onChange={(e) => setCupos(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={CAMPO} />
            </label>
          </div>
          <Subir titulo="Foto del premio" ayuda="Cuadrada, de día, sin texto encima." foto={fotoPremio} onChange={setFotoPremio} />

          {faltan.length > 0 && (
            <p className="text-[12.5px] rounded-xl px-3.5 py-2.5 mt-1" style={{ background: 'var(--c-warn-light)', color: 'var(--c-warn-text)' }}>
              Para que Camina lo publique más rápido falta: {faltan.join(', ')}. Puedes guardar ya y completar después.
            </p>
          )}
          {error && <p className="text-warn text-[13px]">{error}</p>}
          <button type="submit" disabled={busy} className="bg-[var(--c-btn-bg)] text-[var(--c-btn-text)] rounded-xl py-3.5 font-bold text-[14.5px] disabled:opacity-60">
            {busy ? 'Guardando…' : lead ? 'Guardar cambios' : 'Guardar y reportar local'}
          </button>
          <p className="text-muted text-[12px]">El monto final depende del plan que tenga el local cuando quede activo.</p>
        </form>

        <div className="hidden lg:block sticky top-6">{vista}</div>
      </div>

      <button type="button" onClick={() => setPresentar(true)} className="lg:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 bg-mint text-mint-dark rounded-full px-5 py-3 font-bold text-[14px] shadow-lg">
        <Eye size={18} /> Mostrar al dueño
      </button>
      {presentar && <PresentarLocal vista={vistaLocal} onClose={() => setPresentar(false)} />}
    </>
  );
}
