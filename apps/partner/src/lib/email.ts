import { supabase } from '@/lib/supabase';

export type AvisoCorreo = 'new_business' | 'resubmitted' | 'approved' | 'rejected' | 'staff_invite';

// Pide a la función business-email que mande el correo. Es "mejor esfuerzo": si el correo no sale
// (sin clave de Resend, sin conexión), la acción del panel igual queda hecha.
export async function avisarPorCorreo(type: AvisoCorreo, businessId: string, email?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('business-email', {
      body: { type, business_id: businessId, email },
    });
    return !error && !!(data as { sent?: boolean } | null)?.sent;
  } catch {
    return false;
  }
}
