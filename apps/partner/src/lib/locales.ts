import type { Business } from '@/lib/supabase';

// Una cuenta con plan Paso Firme o Paso Adelante puede tener hasta 5 locales con el mismo correo.
export const MAX_LOCALES = 5;

const CLAVE = 'camina_local_actual';

export function localGuardado(userId: string): string | null {
  try {
    return localStorage.getItem(`${CLAVE}_${userId}`);
  } catch {
    return null;
  }
}

export function guardarLocal(userId: string, businessId: string) {
  try {
    localStorage.setItem(`${CLAVE}_${userId}`, businessId);
  } catch {
    // sin almacenamiento: se usa el primer local
  }
}

// Puede agregar otro local si alguno de los suyos tiene Paso Firme o Paso Adelante y no llegó al tope.
export function puedeAgregarLocal(locales: Business[]): boolean {
  return locales.length < MAX_LOCALES && locales.some((l) => l.plan === 'paso_firme' || l.plan === 'paso_adelante');
}

// Admin: el comercio que está mirando como si fuera su dueño (se guarda en este navegador).
const CLAVE_ADMIN = 'camina_admin_ve';

export function adminVeGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_ADMIN);
  } catch {
    return null;
  }
}

export function adminVe(businessId: string | null) {
  try {
    if (businessId) localStorage.setItem(CLAVE_ADMIN, businessId);
    else localStorage.removeItem(CLAVE_ADMIN);
  } catch {
    // sin almacenamiento
  }
}
