'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { savePendingBusiness } from '@/lib/pending-business';
import { fileToSmallDataUrl, uploadLogoFromDataUrl } from '@/lib/logo';
import { CATEGORIAS } from '@/lib/categories';
import CategoryPicker from '@/components/CategoryPicker';
import { avisarPorCorreo } from '@/lib/email';
import { mensajeError } from '@/lib/errors';
import PasswordInput from '@/components/PasswordInput';
import { Check } from 'lucide-react';
import { CUPO_FUNDADOR_ABIERTO, LANZAMIENTO, PAYMENT_QR, PLANS, comprobanteRegistroLink, type PlanPedido } from '@/lib/plans';

const PREFIJOS = [
  ['+591', 'Bolivia'],
  ['+54', 'Argentina'],
  ['+55', 'Brasil'],
  ['+56', 'Chile'],
  ['+51', 'Perú'],
  ['+595', 'Paraguay'],
  ['+598', 'Uruguay'],
];


export default function RegistroPage() {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [esVirtual, setEsVirtual] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [step, setStep] = useState(1);
  // Plan que elige al registrarse: el cupo fundador (mientras esté abierto), el gratis o uno de pago.
  const [plan, setPlan] = useState<PlanPedido>(CUPO_FUNDADOR_ABIERTO ? 'fundador' : 'paso_firme');
  // Los botones de la web llegan con ?plan=paso_firme (o el que eligieron) o ?fundador=1: se marca al pasar al paso del
  // plan (no al cargar, para que la página del servidor y la del navegador coincidan).
  const planDeLaWeb = useRef(false);
  function aplicarPlanDeLaWeb() {
    if (planDeLaWeb.current) return;
    planDeLaWeb.current = true;
    const q = new URLSearchParams(window.location.search);
    const pedido = q.get('plan');
    if (q.get('fundador') === '1' && CUPO_FUNDADOR_ABIERTO) setPlan('fundador');
    else if (pedido === 'paso_firme' || pedido === 'paso_adelante' || pedido === 'primer_paso') setPlan(pedido);
  }
  const [pagoAvisado, setPagoAvisado] = useState(false);
  const [kind, setKind] = useState<'commerce' | 'events_only'>('commerce');
  const [ciudad, setCiudad] = useState('Tarija');
  const [ciudades, setCiudades] = useState<string[]>(['Tarija']);
  const [prefijo, setPrefijo] = useState('+591');
  const [telefono, setTelefono] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();

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

  const datosOk = Boolean(nombre.trim() && (esVirtual || kind === 'events_only' || direccion.trim()) && (telefono.trim() === '' || telefono.replace(/\D/g, '').length >= 6));
  const cuentaOk = Boolean(email.trim() && password.length >= 6);
  const valido = datosOk && cuentaOk;
  // El teléfono es opcional: si no lo cargan, se guarda vacío (null en la base).
  const telefonoCompleto = telefono.trim() ? `${prefijo} ${telefono.trim()}` : '';

  // Pasos del registro. Un comercio elige su plan (y, si es de pago, paga con el QR) antes de cargar sus datos.
  const pagado = plan === 'paso_firme' || plan === 'paso_adelante';
  const pasos: ('tipo' | 'plan' | 'pago' | 'datos' | 'cuenta')[] =
    kind === 'commerce' ? ['tipo', 'plan', ...(pagado ? (['pago'] as const) : []), 'datos', 'cuenta'] : ['tipo', 'datos', 'cuenta'];
  const actual = pasos[Math.min(step, pasos.length) - 1];
  const siguiente = () => setStep((n) => Math.min(n + 1, pasos.length));
  const anterior = () => setStep((n) => Math.max(n - 1, 1));
  const planElegido = PLANS.find((p) => p.id === plan);
  const qr = pagado ? PAYMENT_QR[plan as 'paso_firme' | 'paso_adelante'] : undefined;

  async function pickLogo(file: File) {
    try {
      setLogo(await fileToSmallDataUrl(file));
    } catch {
      setError('No pudimos leer esa imagen. Prueba con otra en PNG o JPG.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (actual !== 'cuenta') {
      if (actual !== 'datos' || datosOk) siguiente();
      return;
    }
    if (!valido) return;
    setLoading(true);
    setError(null);

    // Los datos del comercio viajan también dentro de la cuenta (sin el logo): así no se pierden
    // si el correo se confirma desde otro navegador o desde el celular.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          pending_business: {
            name: nombre.trim(),
            category: kind === 'events_only' ? 'Eventos' : categoria,
            address: direccion.trim(),
            phone: telefonoCompleto,
            isVirtual: esVirtual || kind === 'events_only',
            accountKind: kind,
            city: ciudad,
            requestedPlan: kind === 'commerce' ? plan : null,
          },
        },
      },
    });
    if (signUpError) {
      setLoading(false);
      setError(mensajeError(signUpError));
      return;
    }

    if (!data.session) {
      // Confirmación de email obligatoria: todavía no hay sesión para poder
      // insertar el negocio (RLS lo exige). Guardamos los datos del alta aquí
      // y useBusinessAuth los consume solo cuando el usuario confirme y entre.
      savePendingBusiness({
        email: email.trim(),
        name: nombre.trim(),
        category: kind === 'events_only' ? 'Eventos' : categoria,
        address: direccion.trim(),
        phone: telefonoCompleto,
        isVirtual: esVirtual || kind === 'events_only',
        accountKind: kind,
        city: ciudad,
        logoDataUrl: logo,
        requestedPlan: kind === 'commerce' ? plan : null,
      });
      setLoading(false);
      setAwaitingConfirmation(true);
      return;
    }

    const row = {
      owner_user_id: data.session.user.id,
      name: nombre.trim(),
      category: kind === 'events_only' ? 'Eventos' : categoria,
      address: esVirtual || kind === 'events_only' ? null : direccion.trim(),
      phone: telefonoCompleto || null,
      is_virtual: esVirtual || kind === 'events_only',
      plan: 'primer_paso',
    };
    // Si la base todavía no tiene las columnas nuevas (ciudad / tipo de cuenta), se crea igual sin ellas.
    const pedido = kind === 'commerce' ? { requested_plan: plan, plan_onboarded: true } : {};
    let { data: created, error: businessError } = await supabase
      .from('businesses')
      .insert({ ...row, city: ciudad, account_kind: kind, ...pedido })
      .select('id')
      .single();
    if (businessError && /requested_plan/i.test(businessError.message)) {
      ({ data: created, error: businessError } = await supabase
        .from('businesses')
        .insert({ ...row, city: ciudad, account_kind: kind, plan_onboarded: kind === 'commerce' })
        .select('id')
        .single());
    }
    if (businessError && /city|account_kind/i.test(businessError.message)) {
      ({ data: created, error: businessError } = await supabase.from('businesses').insert(row).select('id').single());
    }
    if (!businessError && created && logo) await uploadLogoFromDataUrl(created.id, logo);
    if (!businessError && created) void avisarPorCorreo('new_business', created.id);
    setLoading(false);
    if (businessError) {
      setError(mensajeError(businessError));
      return;
    }
    router.replace('/inicio');
  }

  // Mientras se espera la confirmación, se prueba entrar solo con los datos que ya puso:
  // apenas confirma el correo (en esta u otra pestaña) pasa directo al panel, sin volver a escribir nada.
  useEffect(() => {
    if (!awaitingConfirmation) return;
    let activo = true;
    async function probar() {
      const { data } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (activo && data.session) router.replace('/');
    }
    const timer = setInterval(probar, 12000);
    const alVolver = () => document.visibilityState === 'visible' && probar();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      activo = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [awaitingConfirmation, email, password, router]);

  async function resendConfirmation() {
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setResending(false);
    setError(resendError ? mensajeError(resendError) : null);
  }

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6 text-center">
        <p className="text-white font-bold text-[22px] mb-2">Confirma tu correo</p>
        <p className="text-auth-muted text-[13px] mb-7 max-w-[300px]">
          Te mandamos un link a {email}. Ábrelo para activar la cuenta: apenas lo confirmes entras solo al
          panel, sin volver a escribir nada.
        </p>
        {error && <p className="text-warn text-[12.5px] mb-4">{error}</p>}
        <button
          onClick={resendConfirmation}
          disabled={resending}
          className="bg-mint text-mint-dark rounded-xl py-3 px-6 font-semibold text-sm mb-3"
        >
          {resending ? 'Reenviando…' : 'Reenviar correo'}
        </button>
        <Link href="/login" className="text-auth-muted text-[12.5px]">
          Ya confirmé, entrar con mi correo
        </Link>
      </div>
    );
  }

  const input = 'w-full bg-card border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[460px] px-5 py-8">
        <div className="flex items-center gap-2.5 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/camina-logo.png" alt="Camina" width={36} height={36} className="rounded-full" />
          <span className="font-extrabold tracking-wide text-[18px]" style={{ color: '#241748' }}>CAMINA</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-line rounded-2xl p-5 sm:p-6">
          <p className="text-mint-dark font-semibold text-[13px] mb-1">Paso {step} de {pasos.length}</p>
          <div className="flex gap-1.5 mb-4">
            {pasos.map((_, i) => i + 1).map((n) => (
              <div key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= step ? '#62F0B6' : '#e6e3ee' }} />
            ))}
          </div>

          {actual === 'tipo' && (
            <>
              <h1 className="text-[22px] font-bold mb-1">¿Cómo quieres usar Camina?</h1>
              <p className="text-muted text-[13px] mb-5">Elige el tipo de cuenta. Después te pedimos solo los datos que corresponden.</p>
              <div className="flex flex-col gap-2.5 mb-5">
                {[
                  { v: 'commerce' as const, t: 'Soy un comercio', d: 'Publico premios y beneficios para canje' },
                  { v: 'events_only' as const, t: 'Solo quiero publicar un evento o sorteo', d: 'Publicidad dentro de la app, sin estar en el mapa (Bs 400 por publicación)' },
                ].map((o) => (
                  <button
                    type="button"
                    key={o.v}
                    onClick={() => setKind(o.v)}
                    className="text-left rounded-xl p-3.5 border-2"
                    style={{ borderColor: kind === o.v ? '#1f9d75' : '#e6e3ee', background: kind === o.v ? '#f0faf6' : '#fff' }}
                  >
                    <p className="font-bold text-[14px]">{o.t}</p>
                    <p className="text-muted text-[12px] mt-0.5">{o.d}</p>
                  </button>
                ))}
              </div>
              {kind === 'commerce' && (
                <>
                  <p className="text-[13px] font-semibold mb-2">¿Tu comercio es físico u online?</p>
                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    {[
                      { v: false, t: 'Tienda física', d: 'Atiendo en una dirección' },
                      { v: true, t: 'Solo online', d: 'Vendo únicamente por internet' },
                    ].map((o) => (
                      <button
                        type="button"
                        key={o.t}
                        onClick={() => setEsVirtual(o.v)}
                        className="text-left rounded-xl p-3.5 border-2"
                        style={{ borderColor: esVirtual === o.v ? '#1f9d75' : '#e6e3ee', background: esVirtual === o.v ? '#f0faf6' : '#fff' }}
                      >
                        <p className="font-bold text-[14px]">{o.t}</p>
                        <p className="text-muted text-[12px] mt-0.5">{o.d}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  aplicarPlanDeLaWeb();
                  siguiente();
                }}
                className="rounded-xl px-6 py-3 font-semibold text-sm"
                style={{ background: '#241748', color: '#7FEDC4' }}
              >
                Continuar
              </button>
              <p className="text-muted text-[12px] mt-4">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="underline">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}


          {actual === 'plan' && (
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-[22px] font-bold mb-1">Elige tu plan</h1>
                <p className="text-muted text-[13px]">Puedes cambiarlo cuando quieras, sin permanencia.</p>
              </div>
              {CUPO_FUNDADOR_ABIERTO && (
                <button
                  type="button"
                  onClick={() => setPlan('fundador')}
                  className="text-left rounded-xl p-3.5 border-2"
                  style={{ borderColor: plan === 'fundador' ? '#E0B43A' : '#e6e3ee', background: plan === 'fundador' ? '#FFF8E4' : '#fff' }}
                >
                  <p className="font-bold text-[14px]">Cupo fundador · 3 meses gratis de Paso Firme</p>
                  <p className="text-muted text-[12px] mt-0.5">Para los primeros 20 comercios. Te creas la cuenta y te lo confirmamos al aprobar tu local.</p>
                </button>
              )}
              {/* Los de pago primero; el gratis al final. */}
              {[...PLANS.filter((p) => p.id !== 'primer_paso'), ...PLANS.filter((p) => p.id === 'primer_paso')].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className="text-left rounded-xl p-3.5 border-2"
                  style={{ borderColor: plan === p.id ? '#1f9d75' : '#e6e3ee', background: plan === p.id ? '#f0faf6' : '#fff' }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-[14px]">{p.name}</p>
                    <p className="font-bold text-[14px]" style={{ color: '#1f9d75' }}>{p.price}</p>
                  </div>
                  <p className="text-muted text-[12px] mt-0.5">
                    {p.blurb}
                    {p.id !== 'primer_paso' ? <span className="font-semibold" style={{ color: '#8B6A12' }}> · {LANZAMIENTO}</span> : null}
                  </p>
                  {plan === p.id && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-1.5 items-start text-[12px]">
                          <Check size={12} color="#1f9d75" className="mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              ))}
              <div className="flex gap-2.5 mt-1">
                <button type="button" onClick={anterior} className="rounded-xl px-5 py-3 font-semibold text-sm border border-line bg-white">
                  Volver
                </button>
                <button type="button" onClick={siguiente} className="flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: '#241748', color: '#7FEDC4' }}>
                  {pagado ? 'Continuar al pago' : 'Continuar'}
                </button>
              </div>
            </div>
          )}

          {actual === 'pago' && planElegido && qr && (
            <div className="flex flex-col gap-3.5">
              <div>
                <h1 className="text-[22px] font-bold mb-1">Paga {planElegido.name}</h1>
                <p className="text-muted text-[13px]">Escanea el QR con la app de tu banco y manda el comprobante por WhatsApp.</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.image} alt={`QR de pago de ${planElegido.name}, ${qr.amount}`} className="w-full max-w-[280px] self-center rounded-xl border border-line" />
              <a
                href={comprobanteRegistroLink(planElegido.name, qr.amount)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPagoAvisado(true)}
                className="text-center rounded-xl py-3 font-semibold text-sm"
                style={{ background: '#25D366', color: '#fff' }}
              >
                Mandar el comprobante por WhatsApp
              </a>
              <p className="text-muted text-[12px] leading-[18px]">
                Activamos tu plan cuando revisamos el pago y tu local. Mientras tanto ya puedes armar tu ficha en el panel.
              </p>
              <div className="flex gap-2.5">
                <button type="button" onClick={anterior} className="rounded-xl px-5 py-3 font-semibold text-sm border border-line bg-white">
                  Volver
                </button>
                <button
                  type="button"
                  disabled={!pagoAvisado}
                  onClick={siguiente}
                  className="flex-1 rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
                  style={{ background: '#241748', color: '#7FEDC4' }}
                >
                  Ya lo mandé, crear mi cuenta
                </button>
              </div>
              {!pagoAvisado && <p className="text-muted text-[11.5px] -mt-1.5">Primero manda el comprobante por WhatsApp.</p>}
            </div>
          )}

          {actual === 'datos' && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-[22px] font-bold mb-1">Crea tu comercio</h1>
                <p className="text-muted text-[13px]">Completa los datos del comercio.</p>
              </div>

              <div>
                <span className="block text-[12.5px] font-semibold mb-1.5">Logo del comercio</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3.5 text-left rounded-xl p-3.5 border-2 border-dashed border-line bg-bg"
                >
                  <div className="w-[60px] h-[60px] shrink-0 rounded-full bg-white border border-line flex items-center justify-center overflow-hidden">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus size={24} color="#1f9d75" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[14px]">{logo ? 'Cambiar imagen' : 'Subir imagen'}</p>
                    <p className="text-muted text-[12px]">Opcional. La puedes subir después desde tu Perfil, antes de publicarte en la app.</p>
                  </div>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && pickLogo(e.target.files[0])}
                />
              </div>

              <Field label="Nombre comercial">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Café Tarija" className={input} />
              </Field>
              {kind === 'commerce' && (
                <div>
                  <span className="block text-[12.5px] font-semibold mb-1.5">Tipo de comercio</span>
                  <CategoryPicker value={categoria} onChange={setCategoria} className="bg-card" />
                </div>
              )}
              <Field label="Ciudad">
                <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={input}>
                  {ciudades.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              {!esVirtual && kind === 'commerce' && (
                <Field label="Dirección principal">
                  <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Calle Bolívar 123" className={input} />
                </Field>
              )}
              <div>
                <span className="block text-[12.5px] font-semibold mb-1.5">
                  Teléfono / WhatsApp <span className="text-muted font-normal">(opcional)</span>
                </span>
                <div className="flex gap-2">
                  <select value={prefijo} onChange={(e) => setPrefijo(e.target.value)} className={`${input} !w-[150px] shrink-0`}>
                    {PREFIJOS.map(([p, n]) => (
                      <option key={p} value={p}>
                        {p} {n}
                      </option>
                    ))}
                  </select>
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/[^\d ]/g, ''))}
                    inputMode="tel"
                    placeholder="7 000 0000"
                    className={`${input} min-w-0`}
                  />
                </div>
              </div>

              {error && <p className="text-warn text-[12.5px]">{error}</p>}
              <div className="flex gap-2.5">
                <button type="button" onClick={anterior} className="rounded-xl px-5 py-3 font-semibold text-sm border border-line bg-white">
                  Volver
                </button>
                <button
                  type="button"
                  disabled={!datosOk}
                  onClick={() => {
                    setError(null);
                    siguiente();
                  }}
                  className="flex-1 rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
                  style={{ background: '#241748', color: '#7FEDC4' }}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {actual === 'cuenta' && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-[22px] font-bold mb-1">Tu cuenta</h1>
                <p className="text-muted text-[13px]">Con estos datos vas a entrar al panel.</p>
              </div>
              <Field label="Email de trabajo">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="tucomercio@email.com" className={input} />
              </Field>
              <Field label="Contraseña">
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className={input}
                  iconClassName="text-purple"
                />
              </Field>

              {error && <p className="text-warn text-[12.5px]">{error}</p>}

              <p className="text-muted text-[12px] leading-[18px]">
                Después de crear la cuenta, el equipo de Camina revisa tu comercio antes de que aparezca en la app.
                Para publicarte necesitamos el <strong>logo</strong> y una <strong>foto de portada</strong> (las cargas en Perfil).
              </p>

              <div className="flex gap-2.5">
                <button type="button" onClick={anterior} className="rounded-xl px-5 py-3 font-semibold text-sm border border-line bg-white">
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={!valido || loading}
                  className="flex-1 rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
                  style={{ background: '#241748', color: '#7FEDC4' }}
                >
                  {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
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
