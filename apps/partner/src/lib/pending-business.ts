// Cuando la confirmación de email está activada en Supabase (recomendado, ver
// README raíz), signUp() no devuelve sesión hasta que el usuario confirma
// desde el correo. Para que /registro no pierda los datos del comercio en
// ese lapso, los guardamos acá (localStorage, keyeados por email) y los
// consumimos recién cuando useBusinessAuth detecta sesión sin negocio creado.

export interface PendingBusiness {
  email: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  isVirtual: boolean;
  city?: string;
  accountKind?: 'commerce' | 'events_only';
  logoDataUrl?: string | null;
}

const KEY = 'camina_pending_business';

export function savePendingBusiness(data: PendingBusiness) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage no disponible (SSR, modo privado agresivo, etc.) — el
    // usuario va a tener que reintentar el alta manualmente si pasa esto.
  }
}

export function consumePendingBusiness(email: string): PendingBusiness | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBusiness;
    if (parsed.email.trim().toLowerCase() !== email.trim().toLowerCase()) return null;
    localStorage.removeItem(KEY);
    return parsed;
  } catch {
    return null;
  }
}
