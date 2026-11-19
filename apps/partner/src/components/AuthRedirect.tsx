'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { destinoEmpleado } from '@/lib/gestion';
import { supabase } from '@/lib/supabase';

// Quien confirma su correo (comercio nuevo o cajero) cae en la web con la sesión en el link.
// Acá lo mandamos directo a su panel, sin pedirle que inicie sesión de nuevo.
// Las personas de la app (sin comercio) no se tocan: siguen viendo la página de siempre.
export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const h = window.location.hash;
    const q = window.location.search;
    const vieneDeConfirmacion = /access_token=/.test(h) || /[?&]code=/.test(q) || /type=(signup|invite|magiclink)/.test(h);
    if (!vieneDeConfirmacion) return;

    let hecho = false;
    async function decidir() {
      if (hecho) return;
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      hecho = true;
      if (user.user_metadata?.pending_business) {
        router.replace('/inicio');
        return;
      }
      const destino = await destinoEmpleado();
      if (destino) router.replace(destino);
    }

    void decidir();
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_IN') void decidir();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return null;
}
