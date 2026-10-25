import { Share } from 'react-native';
import { referralLink } from '@/constants/sharing';

// Compartir tu link de invitación (el de siempre: quien se registra con él te manda además una solicitud de amistad).
// Solo `message`, con el link al final: en iPhone, si además se pasa `url`, WhatsApp se queda con una sola de las dos.
export async function shareInviteLink(userId: string) {
  await Share.share({
    message: `Te invito a Camina: camina y gana Puntos para canjear en comercios adheridos. Súmate con mi link:\n${referralLink(userId)}`,
  });
}
