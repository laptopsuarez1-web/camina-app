'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { savePendingBusiness } from '@/lib/pending-business';
import { fileToSmallDataUrl, uploadLogoFromDataUrl } from '@/lib/logo';

const PREFIJOS = [
  ['+591', 'Bolivia'],
  ['+54', 'Argentina'],
  ['+55', 'Brasil'],
  ['+56', 'Chile'],
  ['+51', 'Perú'],
  ['+595', 'Paraguay'],
  ['+598', 'Uruguay'],
];

const CATEGORIAS = ['Café', 'Gastronomía', 'Entretenimiento', 'Fitness', 'Belleza', 'Compras', 'Salud', 'Servicios', 'Otro'];

export default function RegistroPage() {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [esVirtual, setEsVirtual] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [step, setStep] = useState(1);
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

  const datosOk = Boolean(nombre.trim() && (esVirtual || kind === 'events_only' || direccion.trim()) && telefono.trim().length >= 6);
  const cuentaOk = Boolean(email.trim() && password.length >= 6);
  const valido = datosOk && cuentaOk;
  const telefonoCompleto = `${prefijo} ${telefono.trim()}`;

  async function pickLogo(file: File) {
    try {
      setLogo(await fileToSmallDataUrl(file));
    } catch {
      setError('No pudimos leer esa imagen. Probá con otra en PNG o JPG.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 3) {
      if (step === 1 || datosOk) setStep(step + 1);
      return;
    }
    if (!valido) return;
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      // Confirmación de email obligatoria: todavía no hay sesión para poder
      // insertar el negocio (RLS lo exige). Guardamos los datos del alta acá
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
      phone: telefonoCompleto,
      is_virtual: esVirtual || kind === 'events_only',
      plan: 'primer_paso',
    };
    // Si la base todavía no tiene las columnas nuevas (ciudad / tipo de cuenta), se crea igual sin ellas.
    let { data: created, error: businessError } = await supabase
      .from('businesses')
      .insert({ ...row, city: ciudad, account_kind: kind })
      .select('id')
      .single();
    if (businessError && /city|account_kind/i.test(businessError.message)) {
      ({ data: created, error: businessError } = await supabase.from('businesses').insert(row).select('id').single());
    }
    if (!businessError && created && logo) await uploadLogoFromDataUrl(created.id, logo);
    setLoading(false);
    if (businessError) {
      setError(businessError.message);
      return;
    }
    router.replace('/inicio');
  }

  async function resendConfirmation() {
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setResending(false);
    setError(resendError ? resendError.message : null);
  }

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-auth-bg flex flex-col items-center justify-center px-6 text-center">
        <p className="text-white font-bold text-[22px] mb-2">Confirmá tu correo</p>
        <p className="text-auth-muted text-[13px] mb-7 max-w-[300px]">
          Te mandamos un link a {email}. Abrilo para activar la cuenta y después iniciá sesión acá — tu
          comercio se crea solo apenas entrás.
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
          Ya confirmé, ir a iniciar sesión
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
          <p className="text-mint-dark font-semibold text-[13px] mb-1">Paso {step} de 3</p>
          <div className="flex gap-1.5 mb-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n <= step ? '#62F0B6' : '#e6e3ee' }} />
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="text-[22px] font-bold mb-1">¿Cómo querés usar Camina?</h1>
              <p className="text-muted text-[13px] mb-5">Elegí el tipo de cuenta. Después te pedimos solo los datos que corresponden.</p>
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
                onClick={() => setStep(2)}
                className="rounded-xl px-6 py-3 font-semibold text-sm"
                style={{ background: '#241748', color: '#7FEDC4' }}
              >
                Continuar
              </button>
              <p className="text-muted text-[12px] mt-4">
                ¿Ya tenés cuenta?{' '}
                <Link href="/login" className="underline">
                  Iniciá sesión
                </Link>
              </p>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-[22px] font-bold mb-1">Creá tu comercio</h1>
                <p className="text-muted text-[13px]">Completá los datos del comercio.</p>
              </div>

              <div>
                <span className="block text-[12.5px] font-semibold mb-1.5">Logo del comercio</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3.5 text-left rounded-xl p-3.5 border-2 border-dashed border-line bg-bg"
                >
                  <div className="w-[60px] h-[60px] shrink-0 rounded-xl bg-white border border-line flex items-center justify-center overflow-hidden">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus size={24} color="#1f9d75" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[14px]">{logo ? 'Cambiar imagen' : 'Subir imagen'}</p>
                    <p className="text-muted text-[12px]">Opcional. La podés subir después desde tu Perfil, antes de publicarte en la app.</p>
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
                <Field label="Tipo de comercio">
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={input}>
                    {CATEGORIAS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
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
                  <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle y número, ciudad" className={input} />
                </Field>
              )}
              <div>
                <span className="block text-[12.5px] font-semibold mb-1.5">Teléfono / WhatsApp</span>
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
                <button type="button" onClick={() => setStep(1)} className="rounded-xl px-5 py-3 font-semibold text-sm border border-line bg-white">
                  Volver
                </button>
                <button
                  type="button"
                  disabled={!datosOk}
                  onClick={() => {
                    setError(null);
                    setStep(3);
                  }}
                  className="flex-1 rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
                  style={{ background: '#241748', color: '#7FEDC4' }}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-[22px] font-bold mb-1">Tu cuenta</h1>
                <p className="text-muted text-[13px]">Con estos datos vas a entrar al panel.</p>
              </div>
              <Field label="Email de trabajo">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="tucomercio@email.com" className={input} />
              </Field>
              <Field label="Contraseña">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mínimo 6 caracteres" className={input} />
              </Field>

              {error && <p className="text-warn text-[12.5px]">{error}</p>}

              <p className="text-muted text-[12px] leading-[18px]">
                Después de crear la cuenta, el equipo de Camina revisa tu comercio antes de que aparezca en la app.
                Para publicarte necesitamos el <strong>logo</strong> y una <strong>foto de portada</strong> (las cargás en Perfil).
              </p>

              <div className="flex gap-2.5">
                <button type="button" onClick={() => setStep(2)} className="rounded-xl px-5 py-3 font-semibold text-sm border border-line bg-white">
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
