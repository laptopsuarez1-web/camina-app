// A qué pantalla lleva cada tipo de aviso (al tocar la notificación o la fila de la bandeja).
export function routeForNotification(type?: string): string {
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
    case 'group_challenge':
    case 'group_challenge_end':
    case 'group_week':
      return '/(tabs)/grupos';
    case 'streak':
    case 'streak_reminder':
      return '/(tabs)';
    default:
      return '/(tabs)/notificaciones';
  }
}
