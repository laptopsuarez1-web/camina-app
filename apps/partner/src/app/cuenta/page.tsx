'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { DashboardShell, TopBar } from '@/components/DashboardShell';
import PasswordInput from '@/components/PasswordInput';
import { mensajeError } from '@/lib/errors';

const input = 'w-full bg-white border border-line rounded-[10px] px-3 py-2.5 text-[13.5px]';

export default function CuentaPage() {
  const { session } = useBusinessAuth();
  const emailActual = session?.user.email ?? '';

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
      setEmailMsg({ ok: false, texto: 'Ese correo no parece válido. Revisá que esté bien escrito.' });
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
      texto: `Te mandamos un link a ${nuevo}. Abrilo para confirmar el cambio (mirá también en Spam). Hasta entonces seguís entrando con ${emailActual}.`,
    });
  }

  async function cambiarClave(e: React.FormEvent) {
    e.preventDefault();
    if (nueva.length < 6) {
      setClaveMsg({ ok: false, texto: 'La contraseña nueva necesita al menos 6 caracteres.' });
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
      <TopBar title="Mi cuenta" subtitle="El correo y la contraseña con los que entrás al panel." />
      <div className="flex flex-col gap-5 max-w-[620px]">
        <form onSubmit={cambiarEmail} className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-3">
          <p className="font-bold text-[15px]">Correo</p>
          <p className="text-muted text-[12.5px]">
            Tu correo actual es <b>{emailActual || '…'}</b>.
          </p>
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
            style={{ background: '#241748', color: '#7FEDC4' }}
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
              placeholder="Mínimo 6 caracteres"
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
            style={{ background: '#241748', color: '#7FEDC4' }}
          >
            {claveLoading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
