// Claves de AsyncStorage para invitaciones que llegan por deep link antes de
// que haya sesión (o antes de terminar el signup): se guardan acá y se
// consumen apenas hay un usuario logueado — ver app/r/[refId].tsx,
// app/join-group/[groupId].tsx y (auth)/perfil.tsx.
export const PENDING_REFERRAL_KEY = 'camina_pending_referral';
export const PENDING_GROUP_JOIN_KEY = 'camina_pending_group_join';

// Links https (se pueden tocar en Instagram, WhatsApp, etc.). La página del panel abre la app con camina://.
const INVITE_BASE = 'https://caminaapp.com';

export function referralLink(userId: string) {
  return `${INVITE_BASE}/r/${userId}`;
}

export function groupInviteLink(groupId: string) {
  return `${INVITE_BASE}/join-group/${groupId}`;
}
