// Texto en español para mostrar al usuario cuando algo falla. Supabase y la red devuelven
// mensajes en inglés ("Invalid login credentials", "Network request failed") que no se deben
// mostrar tal cual: se traducen por código y, si no se conoce, se usa un texto genérico.
const BY_CODE: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  user_already_exists: 'Ese correo ya tiene una cuenta. Probá iniciar sesión.',
  email_exists: 'Ese correo ya tiene una cuenta. Probá iniciar sesión.',
  weak_password: 'La contraseña es muy corta. Usá al menos 6 caracteres.',
  validation_failed: 'Revisá que el correo esté bien escrito.',
  email_address_invalid: 'Revisá que el correo esté bien escrito.',
  email_not_confirmed: 'Todavía falta confirmar tu correo. Revisá tu bandeja de entrada.',
  over_email_send_rate_limit: 'Pediste muchos correos seguidos. Esperá un rato e intentá de nuevo.',
  over_request_rate_limit: 'Hiciste muchos intentos seguidos. Esperá un minuto e intentá de nuevo.',
  '23505': 'Eso ya estaba registrado.',
};

const OFFLINE = 'No hay conexión. Revisá tu internet e intentá de nuevo.';
const GENERIC = 'Algo salió mal. Intentá de nuevo.';

// Errores de RPC con "raise exception" (código P0001): el servidor ya escribió el aviso en español
// y dice qué pasó ("Saldo insuficiente", "El desafío ya empezó"); cualquier otro error se traduce.
export function friendlyServerError(error: unknown, fallback: string = GENERIC): string {
  const e = (error ?? {}) as { code?: unknown; message?: unknown };
  if (e.code === 'P0001' && typeof e.message === 'string' && e.message) return e.message;
  return friendlyError(error, fallback);
}

export function friendlyError(error: unknown, fallback: string = GENERIC): string {
  const e = (error ?? {}) as { code?: unknown; message?: unknown; name?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  if (code && BY_CODE[code]) return BY_CODE[code];
  const message = typeof e.message === 'string' ? e.message : '';
  if (e.name === 'AuthRetryableFetchError' || /network request failed|failed to fetch|network error|timed? ?out/i.test(message)) {
    return OFFLINE;
  }
  return fallback;
}
