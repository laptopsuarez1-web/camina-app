// Claves de AsyncStorage para invitaciones que llegan por deep link antes de
// que haya sesión (o antes de terminar el signup): se guardan acá y se
// consumen apenas hay un usuario logueado — ver app/r/[refId].tsx,
// app/join-group/[groupId].tsx y (auth)/perfil.tsx.
export const PENDING_REFERRAL_KEY = 'camina_pending_referral';
export const PENDING_GROUP_JOIN_KEY = 'camina_pending_group_join';

export function referralLink(userId: string) {
  return `camina://r/${userId}`;
}

export function groupInviteLink(groupId: string) {
  return `camina://join-group/${groupId}`;
}
