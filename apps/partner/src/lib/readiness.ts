import type { Business } from '@/lib/supabase';

// Lo mínimo para publicar un local en la app. Lo usa el cartel del dueño ("te falta…") y el admin
// (el botón Aprobar aparece recién cuando no falta nada), así los dos miran la misma lista.
export interface Requisito {
  id: 'logo' | 'portada' | 'descripcion' | 'ubicacion' | 'beneficio';
  texto: string;
  href: string;
}

export function faltantesParaPublicar(
  b: Pick<Business, 'logo_url' | 'cover_url' | 'description' | 'lat' | 'lng' | 'is_virtual' | 'account_kind'>,
  beneficiosActivos: number
): Requisito[] {
  const out: Requisito[] = [];
  if (!b.logo_url) out.push({ id: 'logo', texto: 'el logo', href: '/perfil' });
  if (!b.cover_url) out.push({ id: 'portada', texto: 'una foto de portada', href: '/perfil' });
  if ((b.description ?? '').trim().length < 15) out.push({ id: 'descripcion', texto: 'la descripción del local', href: '/perfil' });
  if (b.account_kind === 'events_only') return out;
  if (!b.is_virtual && (b.lat == null || b.lng == null)) out.push({ id: 'ubicacion', texto: 'la ubicación en el mapa', href: '/perfil' });
  if (beneficiosActivos < 1) out.push({ id: 'beneficio', texto: 'al menos un beneficio activo', href: '/beneficio' });
  return out;
}

export function listaEnCastellano(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
