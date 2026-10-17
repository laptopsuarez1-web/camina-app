import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Eliminar mi cuenta — Camina',
};

const SUPPORT_EMAIL = 'caminaappbo@gmail.com';

// Página pública con URL fija: Google Play pide un enlace donde se pueda pedir la eliminación de la cuenta sin tener la app instalada.
export default function EliminarCuentaPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <Link href="/" className="text-aqua text-[13px] font-semibold">
        ← Camina
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-1">Eliminar mi cuenta</h1>
      <p className="text-muted text-[13px] mb-8">Cómo borrar tu cuenta de Camina y tus datos.</p>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Si tenés la app</h2>
        <p className="text-[13.5px] leading-6 text-muted">
          Entrá a Perfil, tocá Editar perfil y al final elegí Eliminar cuenta. Se borra al instante.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Si no podés entrar a la app</h2>
        <p className="text-[13.5px] leading-6 text-muted">
          Escribinos a{' '}
          <a className="text-aqua font-semibold" href={`mailto:${SUPPORT_EMAIL}?subject=Eliminar%20mi%20cuenta%20de%20Camina`}>
            {SUPPORT_EMAIL}
          </a>{' '}
          desde el correo con el que te registraste, con el asunto &quot;Eliminar mi cuenta&quot;. Borramos tu cuenta en un plazo máximo de 7 días y te avisamos por el mismo correo.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Qué se borra</h2>
        <p className="text-[13.5px] leading-6 text-muted">
          Tu perfil, tus Puntos, tus canjes, tus pasos, tu foto y los datos de notificaciones de tu teléfono. Se conservan, sin tu foto,
          los resultados semanales de grupo ya cerrados. Los datos borrados desaparecen también de nuestras copias de seguridad automáticas
          en un máximo de 30 días. Más detalle en{' '}
          <Link href="/terminos" className="text-aqua font-semibold">
            Términos y Privacidad
          </Link>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Si sos un comercio</h2>
        <p className="text-[13.5px] leading-6 text-muted">
          Entrá al panel, abrí Perfil y elegí Eliminar cuenta y negocio de Camina, o escribinos al mismo correo.
        </p>
      </section>
    </div>
  );
}
