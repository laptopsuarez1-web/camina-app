// A qué pantalla lleva cada tipo de aviso (al tocar la notificación o la fila de la bandeja).
// Los avisos del chat del grupo llevan directo a ese grupo (si el aviso trae cuál es).
export function routeForNotification(type?: string, data?: { group_id?: unknown; screen?: unknown } | null): string {
  // Avisos que dicen directamente a qué pantalla van (la Ruta del mes y las insignias).
  if (data?.screen === 'ruta') return '/(tabs)/ruta';
  if (data?.screen === 'insignias') return '/(tabs)/insignias';
  if (type === 'group_note' || type === 'group_challenge') {
    const g = typeof data?.group_id === 'string' ? data.group_id : null;
    if (g) return `/(tabs)/grupos/${g}`;
  }
  switch (type) {
    case 'redemption_expiring':
    case 'redemption':
    case 'nearby':
      return '/(tabs)/canjes';
    case 'reto':
    case 'promotion_win':
      return '/(tabs)/eventos';
    case 'points_expiring':
    case 'referral_credited':
      return '/(tabs)/puntos';
    case 'friend_request':
    case 'friend_accepted':
      return '/(tabs)/amigos';
    case 'group_invite':
      return '/(tabs)/grupos';
    case 'group_note':
    case 'group_challenge':
    case 'group_challenge_end':
    case 'group_week':
      return '/(tabs)/grupos';
    case 'wrapped':
      return '/(tabs)/actividad';
    case 'streak':
    case 'streak_reminder':
    case 'story_approved':
    case 'story_rejected':
      return '/(tabs)';
    default:
      return '/(tabs)/notificaciones';
  }
}
