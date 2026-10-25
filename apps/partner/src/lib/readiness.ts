import type { Business } from '@/lib/supabase';

// Lo recomendado para publicar un local en la app. Lo usa el cartel del dueño ("te recomendamos…") y el admin
// (lo muestra como recomendación; el admin puede aprobar siempre, aunque falte algo), así los dos miran la misma lista.
// Un beneficio activo NO es requisito: el comercio se puede aprobar sin premios y aparece en Canjes
// y en el mapa recién cuando carga el primero (ver sugerenciaBeneficio).
export interface Requisito {
  id: 'logo' | 'portada' | 'descripcion' | 'ubicacion';
  texto: string;
  href: string;
}

export function faltantesParaPublicar(
  b: Pick<Business, 'logo_url' | 'cover_url' | 'description' | 'lat' | 'lng' | 'is_virtual' | 'account_kind'>
): Requisito[] {
  const out: Requisito[] = [];
  if (!b.logo_url) out.push({ id: 'logo', texto: 'el logo', href: '/perfil' });
  if (!b.cover_url) out.push({ id: 'portada', texto: 'una foto de portada', href: '/perfil' });
  if ((b.description ?? '').trim().length < 15) out.push({ id: 'descripcion', texto: 'la descripción del local', href: '/perfil' });
  if (b.account_kind === 'events_only') return out;
  if (!b.is_virtual && (b.lat == null || b.lng == null)) out.push({ id: 'ubicacion', texto: 'la ubicación en el mapa', href: '/perfil' });
  return out;
}

// Aviso suave (no bloquea la aprobación): sin beneficios activos el local no sale en Canjes ni en el mapa.
export function sugerenciaBeneficio(b: Pick<Business, 'account_kind'>, beneficiosActivos: number) {
  return b.account_kind !== 'events_only' && beneficiosActivos < 1;
}

export function listaEnCastellano(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
