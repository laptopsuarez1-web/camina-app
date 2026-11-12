'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import PasswordInput from '@/components/PasswordInput';
import { mensajeError } from '@/lib/errors';

const input = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';

export default function CuentaPage() {
  const { session } = useBusinessAuth();
  const emailActual = session?.user.email ?? '';
  // null = todavía no se sabe. Quien entró directo al registrarse ve si ya verificó su correo.
  const [verificado, setVerificado] = useState<boolean | null>(null);
  const [reenvio, setReenvio] = useState<string | null>(null);
  useEffect(() => {
    if (!session) return;
    supabase.rpc('my_email_verified').then(({ data, error }) => setVerificado(error ? null : !!data));
  }, [session]);
  const [codigo, setCodigo] = useState('');
  const [codigoMsg, setCodigoMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCodigoMsg(null);
    const { data, error } = await supabase.functions.invoke('panel-email', { body: { action: 'verify_code', code: codigo } });
    const r = data as { ok?: boolean; error?: string } | null;
    if (error || !r?.ok) {
      setCodigoMsg({ ok: false, texto: r?.error ?? 'No pudimos revisar el código. Intenta de nuevo.' });
      return;
    }
    setVerificado(true);
  }
  async function reenviarVerificacion() {
    setReenvio('Enviando…');
    const { data, error } = await supabase.functions.invoke('panel-email', { body: { action: 'resend' } });
    const r = data as { sent?: boolean; wait?: boolean } | null;
    setReenvio(error || !r?.sent ? (r?.wait ? 'Espera un minuto antes de pedir otro.' : 'No pudimos enviarlo. Intenta de nuevo.') : `Te mandamos un código a ${emailActual} (mira también en Spam).`);
  }

  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [claveLoading, setClaveLoading] = useState(false);
  const [claveMsg, setClaveMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function cambiarEmail(e: React.FormEvent) {
    e.preventDefault();
    const nuevo = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(nuevo)) {
      setEmailMsg({ ok: false, texto: 'Ese correo no parece válido. Revisa que esté bien escrito.' });
      return;
    }
    if (nuevo === emailActual.toLowerCase()) {
      setEmailMsg({ ok: false, texto: 'Ese ya es tu correo actual.' });
      return;
    }
    setEmailLoading(true);
    setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({ email: nuevo });
    setEmailLoading(false);
    if (error) {
      setEmailMsg({ ok: false, texto: mensajeError(error) });
      return;
    }
    setEmail('');
    setEmailMsg({
      ok: true,
      texto: `Te mandamos un link a ${nuevo}. Ábrelo para confirmar el cambio (mira también en Spam). Hasta entonces sigues entrando con ${emailActual}.`,
    });
  }

  async function cambiarClave(e: React.FormEvent) {
    e.preventDefault();
    if (nueva.length < 8) {
      setClaveMsg({ ok: false, texto: 'La contraseña nueva necesita al menos 8 caracteres.' });
      return;
    }
    setClaveLoading(true);
    setClaveMsg(null);
    // Se verifica la contraseña actual primero, así nadie con el celular prestado puede cambiarla.
    const { error: verificar } = await supabase.auth.signInWithPassword({ email: emailActual, password: actual });
    if (verificar) {
      setClaveLoading(false);
      setClaveMsg({ ok: false, texto: 'La contraseña actual no es correcta.' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: nueva });
    setClaveLoading(false);
    if (error) {
      setClaveMsg({ ok: false, texto: mensajeError(error) });
      return;
    }
    setActual('');
    setNueva('');
    setClaveMsg({ ok: true, texto: 'Listo, tu contraseña se cambió.' });
  }

  return (
    <DashboardShell>
      <TopBar title="Mi cuenta" subtitle="El correo y la contraseña con los que entras al panel." />
      <div className="flex flex-col gap-5 max-w-[620px]">
        <form onSubmit={cambiarEmail} className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-3">
          <p className="font-bold text-[15px]">Correo</p>
          <p className="text-muted text-[12.5px]">
            Tu correo actual es <b>{emailActual || '…'}</b>.
          </p>
          {verificado !== null && (
            <div className="flex flex-col gap-1.5">
              <p className={`text-[12.5px] font-semibold ${verificado ? 'text-mint-dark' : 'text-warn'}`}>
                {verificado ? '✓ Correo verificado' : 'Correo sin verificar'}
              </p>
              {!verificado && (
                <>
                  <p className="text-muted text-[12px]">Escribe el código de 6 números que te mandamos a tu correo.</p>
                  <div className="flex gap-2">
                    <input
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (codigo.length === 6) void confirmarCodigo(e as unknown as React.FormEvent);
                        }
                      }}
                      placeholder="000000"
                      className={`${input} tracking-[6px] text-center text-[16px] font-bold max-w-[160px]`}
                    />
                    <button
                      type="button"
                      onClick={confirmarCodigo}
                      disabled={codigo.length !== 6}
                      className="rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
                      style={{ background: '#62F0B6', color: '#12281f' }}
                    >
                      Verificar
                    </button>
                  </div>
                  {codigoMsg && <p className={`text-[12px] ${codigoMsg.ok ? 'text-mint-dark' : 'text-warn'}`}>{codigoMsg.texto}</p>}
                  <button type="button" onClick={reenviarVerificacion} className="self-start text-[12.5px] font-semibold underline text-purple">
                    Mandar otro código
                  </button>
                  {reenvio && <p className="text-muted text-[12px]">{reenvio}</p>}
                </>
              )}
            </div>
          )}
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">Correo nuevo</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="nuevo@email.com"
              className={input}
            />
          </label>
          {emailMsg && <p className={`text-[12.5px] ${emailMsg.ok ? 'text-mint-dark' : 'text-warn'}`}>{emailMsg.texto}</p>}
          <button
            type="submit"
            disabled={emailLoading || !email.trim()}
            className="rounded-[10px] py-3 font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}
          >
            {emailLoading ? 'Enviando…' : 'Cambiar correo'}
          </button>
        </form>

        <form onSubmit={cambiarClave} className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-3">
          <p className="font-bold text-[15px]">Contraseña</p>
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">Contraseña actual</span>
            <PasswordInput
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              autoComplete="current-password"
              className={input}
              iconClassName="text-purple"
            />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold mb-1.5">Contraseña nueva</span>
            <PasswordInput
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className={input}
              iconClassName="text-purple"
            />
          </label>
          {claveMsg && <p className={`text-[12.5px] ${claveMsg.ok ? 'text-mint-dark' : 'text-warn'}`}>{claveMsg.texto}</p>}
          <button
            type="submit"
            disabled={claveLoading || !actual || !nueva}
            className="rounded-[10px] py-3 font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--c-btn-bg)', color: 'var(--c-btn-text)' }}
          >
            {claveLoading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
