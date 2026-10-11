// Traduce los errores de Supabase (que llegan en inglés o en lenguaje técnico) a frases simples
// para el dueño del local. Los mensajes que ya escribimos en español en la base (raise exception
// '...') pasan tal cual.

const TRADUCCIONES: [RegExp, string][] = [
  [/invalid login credentials/i, 'El correo o la contraseña no coinciden. Revisalos e intentá de nuevo.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu correo. Buscá el mail de Camina (mirá también en Spam) y tocá el link.'],
  [/user already registered|already been registered|already exists/i, 'Ese correo ya tiene una cuenta. Iniciá sesión o tocá "¿Olvidaste tu contraseña?".'],
  [/password should be at least|password.*(short|length)/i, 'La contraseña tiene que tener al menos 6 caracteres.'],
  [/weak password|password.*(weak|pwned|leaked)/i, 'Esa contraseña es muy fácil de adivinar. Probá con otra más larga.'],
  [/same.*password|new password should be different/i, 'La contraseña nueva tiene que ser distinta de la anterior.'],
  [/unable to validate email|invalid email|email.*invalid|valid email/i, 'Ese correo no parece válido. Revisá que esté bien escrito.'],
  [/rate limit|too many requests|security purposes.*after/i, 'Hiciste muchos intentos seguidos. Esperá un minuto y probá de nuevo.'],
  [/failed to fetch|network|fetch failed|load failed/i, 'No hay conexión con Camina. Revisá tu internet e intentá de nuevo.'],
  [/jwt|session.*(expired|missing)|not authenticated|auth session missing/i, 'Tu sesión se cerró. Volvé a iniciar sesión.'],
  [/row-level security|permission denied|not authorized/i, 'No tenés permiso para hacer esto. Si creés que es un error, escribinos por WhatsApp.'],
  [/duplicate key|unique constraint/i, 'Eso ya está cargado.'],
  [/payload too large|file.*too large|exceeded the maximum/i, 'La imagen es muy pesada. Probá con una más chica (menos de 5 MB).'],
  [/mime type|invalid.*image/i, 'Ese archivo no es una imagen válida. Usá PNG o JPG.'],
];

export function mensajeError(error: unknown): string {
  const raw =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
  if (!raw) return 'Algo salió mal. Intentá de nuevo.';
  for (const [re, texto] of TRADUCCIONES) if (re.test(raw)) return texto;
  // Mensajes propios de Camina (vienen en español desde la base): se muestran tal cual.
  if (/[áéíóúñ¿¡]|\b(el|la|los|las|tu|ya|no|que|de)\b/i.test(raw) && !/\b(the|is|of|for|to)\b/i.test(raw)) return raw;
  return 'Algo salió mal. Intentá de nuevo y, si sigue, escribinos por WhatsApp.';
}
