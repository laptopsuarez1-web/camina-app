import { Share } from 'react-native';
import { referralLink } from '@/constants/sharing';

// Compartir tu link de invitación (el de siempre: quien se registra con él te manda además una solicitud de amistad).
export async function shareInviteLink(userId: string) {
  await Share.share({
    message: `Te invito a Camina — caminá y ganá Puntos para canjear en comercios adheridos. Sumate con mi link:\n${referralLink(userId)}`,
    url: referralLink(userId),
  });
}
