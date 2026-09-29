import Link from 'next/link';

// Mismo texto que apps/mobile/src/app/(auth)/terminos.tsx (pantalla de
// aceptación obligatoria dentro de la app) — esta página es la versión
// pública, con URL fija, que piden Apple y Google al revisar la app.
export function LegalContent() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <Link href="/" className="text-aqua text-[13px] font-semibold">
        ← Camina
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-1">Términos y Privacidad</h1>
      <p className="text-muted text-[13px] mb-8">Última actualización: 2026.</p>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Términos de uso</h2>
        <p className="text-[13.5px] leading-6 text-muted">
          Camina te da Puntos por caminar (1 Punto cada 1.000 pasos, hasta 20 Puntos por día) para
          canjear beneficios en comercios adheridos de Bolivia. Los Puntos vencen a los 90 días de
          haberse ganado y no tienen valor monetario ni son transferibles ni reembolsables. Los
          códigos de canje vencen a los 15 minutos de generados. Camina es para personas de 13 años o más. Los pasos ingresados a mano en Salud o Health
          Connect no suman Puntos. Nos reservamos el derecho de
          suspender cuentas que intenten manipular el conteo de pasos, los Puntos o los canjes. Los
          comercios adheridos son responsables de sus propios beneficios, stock y condiciones;
          Camina actúa como intermediario y no garantiza disponibilidad continua de ningún
          beneficio.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-[15px] mb-2">Política de privacidad</h2>
        <p className="text-[13.5px] leading-6 text-muted">
          Guardamos tu nombre, correo, fecha de nacimiento (solo para confirmar que tenés 13 años o
          más; nadie más la ve), foto de perfil (opcional), zona o barrio (opcional), el token de
          notificaciones de tu teléfono y los pasos diarios que registrás desde Apple Salud o Google
          Health Connect — solo el total diario, no tu ubicación GPS histórica ni tu ruta. Usamos tu ubicación aproximada, cuando
          la autorizás, únicamente para mostrarte comercios cercanos. Tus pasos y tu nombre solo son
          visibles para otros usuarios si activás &ldquo;Aparecer en el ranking&rdquo; o dentro de
          un grupo al que te unís vos mismo. No vendemos tus datos a terceros. Podés pedir la
          eliminación de tu cuenta y tus datos en cualquier momento desde Perfil, dentro de la app.
        </p>
      </section>

      <section>
        <h2 className="font-bold text-[15px] mb-2">Datos de salud</h2>
        <p className="text-[13.5px] leading-6 text-muted">
          Si autorizás el acceso a Apple Salud o Google Health Connect, Camina lee únicamente tu
          conteo de pasos del día — no accede a otros datos de salud, y nunca escribe ni comparte
          esa información con nadie más. Podés revocar el acceso en cualquier momento desde los
          ajustes de Salud de tu teléfono.
        </p>
      </section>
    </div>
  );
}
