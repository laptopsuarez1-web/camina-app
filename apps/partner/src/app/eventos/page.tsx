'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, type Promotion } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import { mensajeError } from '@/lib/errors';
import { ImageUpload } from '@/components/ImageUpload';
import { GalleryUpload } from '@/components/GalleryUpload';

const WHATSAPP = '59162714286';
type Kind = 'evento' | 'desafio' | 'publicidad';
const KIND_LABEL: Record<Promotion['kind'], string> = { evento: 'Evento', desafio: 'Desafío', publicidad: 'Banner', sorteo: 'Sorteo' };
// Colores de Camina para el fondo de la tarjeta (los mismos de la app).
const BG: Record<string, [string, string]> = {
  violeta: ['#5B31A3', '#8B4FD1'],
  menta: ['#1A6555', '#2F9A83'],
  dorado: ['#5F4004', '#8F6307'],
  noche: ['#241748', '#3a2668'],
  coral: ['#9E2F3A', '#BF3F3F'],
  aurora: ['#3a2668', '#1F7A66'],
  clasico: ['#3a2668', '#120a1e'],
};
const STATUS: Record<Promotion['status'], { label: string; cls: string }> = {
  pending: { label: 'En revisión', cls: 'text-warn bg-warn-light' },
  approved: { label: 'Publicada', cls: 'text-mint-dark bg-mint/15' },
  rejected: { label: 'No aprobada', cls: 'text-[#a1382f] bg-[#fdecec]' },
  finished: { label: 'Terminada', cls: 'text-[#5b3a99] bg-[#f1ebfa]' },
};

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function EventosPage() {
  const { business } = useBusinessAuth();
  const [list, setList] = useState<Promotion[]>([]);
  const [winners, setWinners] = useState<Record<string, string[]>>({});
  const [holders, setHolders] = useState<Record<string, string[]>>({});
  const isAd = business?.account_kind === 'events_only';
  const [kind, setKind] = useState<Kind>('desafio');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [starts, setStarts] = useState(toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)));
  const [ends, setEnds] = useState(toLocalInput(new Date(Date.now() + 4 * 24 * 3600 * 1000)));
  const [goalMode, setGoalMode] = useState<'daily' | 'total'>('daily');
  const [goalSteps, setGoalSteps] = useState(8000);
  const [goalDays, setGoalDays] = useState(3);
  const [winnersCount, setWinnersCount] = useState(3);
  const [bgColor, setBgColor] = useState('violeta');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<'color' | 'foto' | 'logo'>('color');
  const [ctaUrl, setCtaUrl] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeUrl, setPlaceUrl] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketMode, setTicketMode] = useState<'whatsapp' | 'link'>('whatsapp');
  const [usePoints, setUsePoints] = useState(false);
  const [usePaid, setUsePaid] = useState(false);
  const [ticketPoints, setTicketPoints] = useState(30);
  const [ticketQuota, setTicketQuota] = useState(20);
  const [ticketContact, setTicketContact] = useState('');
  const [photoId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const price = isAd ? 400 : 200;

  const load = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });
    const rows = (data as Promotion[]) ?? [];
    setList(rows);
    const entries: Record<string, string[]> = {};
    for (const r of rows.filter((x) => x.status === 'finished')) {
      const { data: w } = await supabase.rpc('promotion_winner_names', { p_id: r.id });
      entries[r.id] = ((w as { full_name: string }[]) ?? []).map((x) => x.full_name);
    }
    setWinners(entries);
    const h: Record<string, string[]> = {};
    for (const r of rows.filter((x) => x.kind === 'evento' && x.ticket_points != null && x.status !== 'pending' && x.status !== 'rejected')) {
      const { data: t } = await supabase.rpc('promotion_ticket_holders', { p_id: r.id });
      h[r.id] = ((t as { full_name: string }[]) ?? []).map((x) => x.full_name);
    }
    setHolders(h);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!business) return;
    setSending(true);
    setMsg(null);
    const { error } = await supabase.rpc('request_promotion_v3', {
      p_business_id: business.id,
      p_kind: kind,
      p_title: title,
      p_description: description,
      p_prize: kind === 'publicidad' ? null : prize,
      p_starts_at: new Date(starts).toISOString(),
      p_ends_at: new Date(ends).toISOString(),
      p_goal_mode: kind === 'desafio' ? goalMode : null,
      p_goal_steps: kind === 'desafio' ? goalSteps : null,
      p_goal_days: kind === 'desafio' && goalMode === 'daily' ? goalDays : null,
      p_winners: winnersCount,
      p_bg_color: bgColor,
      p_bg_image_url: bgMode === 'foto' ? bgImage : null,
      p_bg_logo: bgMode === 'logo',
      p_cta_url: kind === 'publicidad' && ctaUrl.trim() ? ctaUrl.trim() : null,
      p_photos: kind === 'publicidad' ? [] : photos,
      p_place_name: kind === 'publicidad' ? null : placeName,
      p_place_address: kind === 'publicidad' ? null : placeAddress,
      p_place_url: kind === 'publicidad' ? null : placeUrl,
      p_ticket_price: kind === 'evento' && usePaid ? ticketPrice : null,
      p_ticket_url: kind === 'evento' && ticketLink ? ticketLink : null,
      p_ticket_points: kind === 'evento' && usePoints ? ticketPoints : null,
      p_ticket_quota: kind === 'evento' && usePoints ? ticketQuota : null,
    });
    setSending(false);
    if (error) {
      setMsg({ ok: false, text: mensajeError(error) });
      return;
    }
    const text = encodeURIComponent(
      `Hola! Soy ${business.name} y quiero publicar ${kind === 'desafio' ? 'un desafío' : kind === 'evento' ? 'un evento' : 'un banner'} en Camina: "${title}" (Bs ${price}). Te mando el comprobante de la transferencia.`
    );
    setMsg({
      ok: true,
      text: `Recibimos tu solicitud. Para publicarla, hacé la transferencia de Bs ${price} y mandanos el comprobante por WhatsApp.`,
    });
    setTitle('');
    setDescription('');
    setPrize('');
    setBgImage(null);
    setPhotos([]);
    load();
    window.open(`https://wa.me/${WHATSAPP}?text=${text}`, '_blank', 'noopener');
  }

  const field = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';
  const maxDays = kind === 'evento' ? 14 : 30;
  const maxEnd = new Date(new Date(starts).getTime() + maxDays * 24 * 3600 * 1000);
  const badDates = new Date(ends) > maxEnd || new Date(ends) <= new Date(starts);
  const spanDays = Math.ceil((new Date(ends).getTime() - new Date(starts).getTime()) / 86400000) + 1;
  const badGoal = kind === 'desafio' && (goalSteps < 1000 || (goalMode === 'daily' && (goalSteps > 60000 || goalDays < 1 || goalDays > spanDays)));
  const digits = ticketContact.replace(/\D/g, '');
  const ticketLink = kind !== 'evento' || ticketContact.trim() === '' ? ''
    : ticketMode === 'whatsapp' ? (digits.length >= 8 ? `https://wa.me/${digits.length === 8 ? '591' + digits : digits}?text=${encodeURIComponent(`Hola! Te escribo por el evento ${title || ''}`.trim())}` : '-')
    : ticketContact.trim();
  const badTicket = kind === 'evento' && (
    (ticketContact.trim() !== '' && !/^https:\/\/\S+$/.test(ticketLink)) ||
    (usePaid && (ticketPrice.trim() === '' || ticketLink === '')) ||
    (usePoints && (ticketPoints < 1 || ticketQuota < 1))
  );
  const badPlaceUrl = placeUrl.trim() !== '' && !/^https:\/\/\S+$/.test(placeUrl.trim());
  const needsPhoto = bgMode === 'foto' && !bgImage;
  const badLink = kind === 'publicidad' && !/^https:\/\/\S+$/.test(ctaUrl.trim());
  const kinds: { k: Kind; label: string; hint: string }[] = [
    ...(isAd ? [{ k: 'publicidad' as Kind, label: 'Banner', hint: 'Fijo en Inicio, va a tu link' }] : []),
    { k: 'evento', label: 'Evento', hint: 'Tarjeta con fecha y hora' },
    { k: 'desafio', label: 'Desafío', hint: 'Meta de pasos y premios' },
  ];
  const [c1, c2] = BG[bgColor] ?? BG.violeta;
  const previewBg = bgMode === 'foto' && bgImage
    ? { backgroundImage: `linear-gradient(${kind === 'publicidad' ? 'rgba(20,10,40,.15), rgba(20,10,40,.78)' : 'rgba(20,10,40,.28), rgba(20,10,40,.82)'}), url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` };
  const label = 'block text-[12px] font-bold uppercase tracking-wide text-[#5B4A7A] mb-1.5';
  const section = 'bg-card border border-line rounded-2xl p-5 flex flex-col gap-3.5';
  const seg = (on: boolean) => ({ borderColor: on ? '#1f9d75' : '#e6e3ee', background: on ? '#f0faf6' : '#fff' });

  return (
    <DashboardShell>
      <TopBar title="Desafíos y eventos" subtitle="Publicá un desafío, un evento o publicidad dentro de la app de Camina." />

      <div className="max-w-[600px]">
        <div className="bg-card border border-line rounded-2xl p-4 mb-5 text-[13px] leading-5">
          <p className="font-bold mb-1">Cómo funciona</p>
          <p className="text-muted">
            {isAd
              ? <>Tu paquete cuesta <strong>Bs 400</strong> y incluye publicidad: elegís si va como <strong>banner</strong>, <strong>evento</strong> o <strong>desafío</strong>.</>
              : <>Cada publicación cuesta <strong>Bs 200</strong> y puede ser un <strong>evento</strong> o un <strong>desafío</strong>. Para publicidad en el banner de Inicio, hace falta el paquete de solo publicidad (Bs 400).</>}
            {' '}Camina la revisa y la aprueba antes de mostrarla. En los desafíos, los pasos cuentan desde que la persona toca “Participar”. Al terminar, Camina sortea entre quienes cumplieron y te pasa los ganadores.
          </p>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className={section}>
            <div className={`grid gap-2.5 ${kinds.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {kinds.map(({ k, label: l, hint }) => (
                <button key={k} type="button" onClick={() => setKind(k)} className="rounded-xl py-2.5 px-2 border-2 text-center" style={seg(kind === k)}>
                  <span className="block font-semibold text-[13.5px]">{l}</span>
                  <span className="block text-[11px] text-muted">{hint}</span>
                </button>
              ))}
            </div>
            <label>
              <span className={label}>Nombre</span>
              <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'desafio' ? 'Ej: Desafío Salchipapa' : kind === 'evento' ? 'Ej: Noche de música en vivo' : 'Ej: Semana de uñas en Bloom'} className={field} />
            </label>
            <label>
              <span className={label}>Descripción corta</span>
              <textarea value={description} maxLength={400} rows={3} onChange={(e) => setDescription(e.target.value)} className={field} />
            </label>
            {kind === 'publicidad' && (
              <label>
                <span className={label}>Link al que lleva</span>
                <input value={ctaUrl} maxLength={300} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://wa.me/591…  ·  https://instagram.com/…  ·  tu página" className={field} />
                <span className="block text-muted text-[12px] mt-1">Al tocar el banner, la persona va directo acá. Puede ser WhatsApp, Instagram, Facebook, TikTok o una página web; no hace falta que sea un local.</span>
              </label>
            )}
          </div>

          <div className={section}>
            <span className={label}>Cuándo</span>
            <div className="flex gap-3 flex-wrap">
              <label className="flex-1 min-w-[180px]">
                <span className="block text-[12.5px] font-semibold mb-1">Desde (fecha y hora)</span>
                <input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className={field} />
              </label>
              <label className="flex-1 min-w-[180px]">
                <span className="block text-[12.5px] font-semibold mb-1">Hasta (fecha y hora)</span>
                <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className={field} />
              </label>
            </div>
            <p className="text-muted text-[12px]">Máximo {maxDays} días. {kind === 'evento' ? 'La hora de “Desde” es la hora del evento.' : ''}</p>
            {badDates && <p className="text-warn text-[12.5px]">Debe terminar después de empezar y durar como máximo {maxDays} días.</p>}
          </div>

          {kind !== 'publicidad' && (
            <div className={section}>
              <span className={label}>Dónde queda</span>
              <input value={placeName} maxLength={80} onChange={(e) => setPlaceName(e.target.value)} placeholder="Nombre del lugar. Ej: Café Sol" className={field} aria-label="Nombre del lugar" />
              <input value={placeAddress} maxLength={160} onChange={(e) => setPlaceAddress(e.target.value)} placeholder="Dirección. Ej: Av. 6 de Agosto 123, zona Sopocachi" className={field} aria-label="Dirección" />
              <input value={placeUrl} maxLength={300} onChange={(e) => setPlaceUrl(e.target.value)} placeholder="Link de Google Maps (opcional)" className={field} aria-label="Link de Google Maps" />
              <p className="text-muted text-[12px]">Si ponés el link, la app muestra el botón “Cómo llegar”. En Google Maps tocá Compartir y copiá el link.</p>
              {badPlaceUrl && <p className="text-warn text-[12.5px]">El link tiene que empezar con https://</p>}
            </div>
          )}

          {kind !== 'publicidad' && business && (
            <div className={section}>
              <GalleryUpload
                businessId={business.id}
                photos={photos}
                onChange={setPhotos}
                label={kind === 'evento' ? 'Fotos del evento' : 'Fotos del desafío'}
                prefix={`promo-${photoId}`}
                hint="Hasta 8 fotos. Al abrir la publicación en la app se ven completas, una al lado de otra."
              />
            </div>
          )}

          {kind === 'evento' && (
            <div className={section}>
              <span className={label}>Entradas</span>
              <p className="text-muted text-[12px] -mt-2">Si el evento es libre, no marques nada: en la app aparece “Anotarme”. Podés marcar las dos opciones a la vez.</p>
              <label className="flex items-center gap-2 text-[13.5px] font-semibold">
                <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} /> Se canjean con Puntos de Camina
              </label>
              {usePoints && (
                <div className="flex gap-3 items-center flex-wrap text-[13px] pl-6">
                  <input type="number" min={1} max={5000} value={ticketPoints} onChange={(e) => setTicketPoints(Number(e.target.value))} className={`${field} !w-[90px]`} aria-label="Puntos por entrada" />
                  Puntos por entrada, hay
                  <input type="number" min={1} max={5000} value={ticketQuota} onChange={(e) => setTicketQuota(Number(e.target.value))} className={`${field} !w-[90px]`} aria-label="Cantidad de entradas" />
                  entradas
                </div>
              )}
              <label className="flex items-center gap-2 text-[13.5px] font-semibold">
                <input type="checkbox" checked={usePaid} onChange={(e) => setUsePaid(e.target.checked)} /> Se compran con plata
              </label>
              {usePaid && (
                <div className="pl-6">
                  <input value={ticketPrice} maxLength={40} onChange={(e) => setTicketPrice(e.target.value)} placeholder="Desde cuánto. Ej: Bs 30" className={field} aria-label="Precio de la entrada" />
                  <p className="text-muted text-[12px] mt-1">En la app dice “Comprar desde {ticketPrice || 'Bs 30'}”. Si se agotan las de Puntos, también sale este botón.</p>
                </div>
              )}
              <div>
                <span className="block text-[12.5px] font-semibold mb-1.5">Contacto del organizador {usePaid ? '' : '(opcional)'}</span>
                <div className="grid grid-cols-2 gap-2.5 mb-2">
                  {([['whatsapp', 'WhatsApp'], ['link', 'Otro link']] as const).map(([m, l]) => (
                    <button key={m} type="button" onClick={() => setTicketMode(m)} className="rounded-xl py-2 font-semibold text-[13px] border-2" style={seg(ticketMode === m)}>{l}</button>
                  ))}
                </div>
                <input value={ticketContact} maxLength={300} onChange={(e) => setTicketContact(e.target.value)} placeholder={ticketMode === 'whatsapp' ? 'Tu número. Ej: 70000000' : 'https://… (web, Instagram, Facebook, TikTok)'} className={field} aria-label="Contacto para entradas" />
                <p className="text-muted text-[12px] mt-1">{usePaid ? 'A donde va la persona para comprar.' : usePoints ? 'Quien canjea puede hablarte por acá.' : 'Si lo dejás vacío, la gente toca “Anotarme”. Si lo ponés, en la app aparece un botón para contactarte.'}</p>
              </div>
              {badTicket && <p className="text-warn text-[12.5px]">Revisá las entradas: con plata hace falta precio y contacto; el link empieza con https:// o un número válido.</p>}
            </div>
          )}

          {kind === 'desafio' && (
            <div className={section}>
              <span className={label}>La meta</span>
              <div className="grid grid-cols-2 gap-2.5">
                {([['daily', 'Pasos por día'], ['total', 'Pasos en total']] as const).map(([m, l]) => (
                  <button key={m} type="button" onClick={() => setGoalMode(m)} className="rounded-xl py-2.5 font-semibold text-[13.5px] border-2" style={seg(goalMode === m)}>{l}</button>
                ))}
              </div>
              <div className="flex gap-3 items-center flex-wrap text-[13px]">
                <input type="number" min={1000} step={500} value={goalSteps} onChange={(e) => setGoalSteps(Number(e.target.value))} className={`${field} !w-[120px]`} aria-label="Cantidad de pasos" />
                {goalMode === 'daily' ? (
                  <>
                    pasos por día, durante
                    <input type="number" min={1} max={30} value={goalDays} onChange={(e) => setGoalDays(Number(e.target.value))} className={`${field} !w-[80px]`} aria-label="Cantidad de días" />
                    días
                  </>
                ) : 'pasos en total mientras dure el desafío'}
              </div>
              {badGoal && <p className="text-warn text-[12.5px]">{goalMode === 'daily' ? `Pasos por día entre 1.000 y 60.000, y no más días que los del desafío (${spanDays}).` : 'La meta mínima es de 1.000 pasos.'}</p>}
            </div>
          )}

          {kind !== 'publicidad' && (
            <div className={section}>
              <span className={label}>{kind === 'desafio' ? 'Premios' : 'Qué incluye'}</span>
              <div className="flex gap-3 flex-wrap">
                <input value={prize} maxLength={120} onChange={(e) => setPrize(e.target.value)} placeholder={kind === 'desafio' ? 'Ej: Salchipapa' : 'Ej: Entrada libre y una bebida'} className={`${field} flex-1 min-w-[200px]`} aria-label="Premio" />
                {kind === 'desafio' && (
                  <label className="flex items-center gap-2 text-[13px]">
                    <input type="number" min={1} max={10} value={winnersCount} onChange={(e) => setWinnersCount(Number(e.target.value))} className={`${field} !w-[70px]`} aria-label="Ganadores" />
                    ganadores
                  </label>
                )}
              </div>
              {kind === 'desafio' && <p className="text-muted text-[12px]">Sorteo entre quienes cumplan la meta.</p>}
            </div>
          )}

          <div className={section}>
            <span className={label}>Fondo de la tarjeta</span>
            <div className="grid grid-cols-3 gap-2.5">
              {([['color', 'Color de Camina'], ['foto', kind === 'publicidad' ? 'Imagen / banner' : 'Foto'], ['logo', 'Tu logo']] as const).map(([m, l]) => (
                <button key={m} type="button" onClick={() => setBgMode(m)} className="rounded-xl py-2.5 font-semibold text-[13.5px] border-2" style={seg(bgMode === m)}>{l}</button>
              ))}
            </div>
            {bgMode !== 'foto' ? (
              <div className="flex gap-3 flex-wrap items-center">
                {bgMode === 'logo' && <p className="text-muted text-[12px] w-full">Tu logo (el de tu ficha) aparece grande y suave sobre el color que elijas.</p>}
                {Object.entries(BG).map(([k, [a, b]]) => (
                  <button key={k} type="button" aria-label={`Fondo ${k}`} onClick={() => setBgColor(k)} className="w-10 h-10 rounded-full border-4" style={{ background: `linear-gradient(135deg, ${a}, ${b})`, borderColor: bgColor === k ? '#1f9d75' : '#fff', boxShadow: '0 0 0 1px #e6e3ee' }} />
                ))}
              </div>
            ) : business ? (
              <>
                <ImageUpload bucket="business-logos" path={`${business.id}/promo-${photoId}`} value={bgImage} onUploaded={setBgImage} label="Foto de fondo" shape="wide" />
                <p className="text-muted text-[12px]">{kind === 'publicidad' ? 'Subí tu banner o una foto de tu marca (mejor horizontal). ' : ''}Camina la oscurece un poco para que el texto se lea bien.</p>
              </>
            ) : null}
            <div className="rounded-3xl p-4 text-white relative overflow-hidden" style={{ ...previewBg, minHeight: kind === 'publicidad' ? 132 : undefined }} aria-label="Vista previa">
              {bgMode === 'logo' && business?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logo_url} alt="" className="absolute -right-6 -bottom-6 w-[170px] h-[170px] rounded-full object-cover opacity-20" />
              )}
              <p className="text-[12px] font-bold opacity-90">{kind === 'publicidad' ? (business?.name ?? '') : KIND_LABEL[kind]}</p>
              <p className="text-[19px] font-extrabold leading-tight">{title || 'Tu título acá'}</p>
              {kind === 'desafio' && (
                <p className="mt-1"><span className="text-[34px] font-extrabold" style={{ color: '#7FEDC4' }}>{goalSteps.toLocaleString('es-BO')}</span> <span className="text-[13px] font-bold">{goalMode === 'daily' ? `pasos por día, durante ${goalDays} días` : 'pasos en total'}</span></p>
              )}
              {kind !== 'publicidad' && prize && <p className="mt-2 rounded-xl bg-white text-[#241748] text-[13.5px] font-bold px-3 py-2">🎁 {prize}</p>}
            </div>
          </div>

          {badLink && ctaUrl.trim() !== '' && <p className="text-warn text-[12.5px]">El link tiene que empezar con https://</p>}
          {msg && <p className={`text-[12.5px] ${msg.ok ? 'text-mint-dark' : 'text-warn'}`}>{msg.text}</p>}
          <button
            onClick={submit}
            disabled={sending || badDates || badGoal || needsPhoto || badLink || badTicket || badPlaceUrl || title.trim().length < 3 || description.trim().length < 5}
            className="w-full rounded-xl py-3 font-semibold text-[14px] disabled:opacity-50"
            style={{ background: '#241748', color: '#7FEDC4' }}
          >
            {sending ? 'Enviando…' : `Enviar a Camina para aprobación · Bs ${price}`}
          </button>
        </div>

        {list.length > 0 && (
          <div className="bg-card border border-line rounded-2xl overflow-hidden">
            {list.map((r, i) => (
              <div key={r.id} className={`p-4 ${i < list.length - 1 ? 'border-b border-line' : ''}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="font-semibold text-[13.5px]">
                    {r.kind === 'evento' ? '🎟️' : r.kind === 'publicidad' ? '📣' : '🎁'} {KIND_LABEL[r.kind]} · {r.title}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                </div>
                <p className="text-muted text-[12px]">
                  {new Date(r.starts_at).toLocaleDateString('es-BO')} → {new Date(r.ends_at).toLocaleDateString('es-BO')} · Bs {r.price_bs}
                  {r.prize ? ` · ${r.prize}` : ''}
                  {r.goal_steps ? ` · ${r.goal_steps.toLocaleString('es-BO')} pasos${r.goal_mode === 'daily' ? ` x ${r.goal_days} días` : ' en total'}` : ''}
                </p>
                {r.kind === 'evento' && (r.ticket_points != null || r.ticket_price) && (
                  <p className="text-[12.5px] mt-1.5">
                    🎟️ {r.ticket_points != null ? `${r.ticket_points} Puntos · cupo ${r.ticket_quota}` : ''}{r.ticket_points != null && r.ticket_price ? ' · ' : ''}{r.ticket_price ? `desde ${r.ticket_price}` : ''}
                    {holders[r.id]?.length ? <> · <strong>Entradas canjeadas:</strong> {holders[r.id].join(', ')}</> : r.ticket_points != null ? ' · todavía nadie canjeó' : ''}
                  </p>
                )}
                {r.status === 'finished' && winners[r.id] && (
                  <p className="text-[12.5px] mt-1.5">
                    <strong>Ganadores:</strong> {winners[r.id].length ? winners[r.id].join(', ') : 'nadie cumplió la condición'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
