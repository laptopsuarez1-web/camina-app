import { referralLink } from '@/constants/sharing';
import { shareText } from '@/lib/share';

// Compartir tu link de invitación (el de siempre: quien se registra con él te manda además una solicitud de amistad).
export async function shareInviteLink(userId: string) {
  await shareText(`Te invito a Camina: camina y gana Puntos para canjear en comercios adheridos. Súmate con mi link:\n${referralLink(userId)}`);
}
