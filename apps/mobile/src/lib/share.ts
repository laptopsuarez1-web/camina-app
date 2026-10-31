import { Share } from 'react-native';

// Única puerta para compartir texto (WhatsApp, mensajes, donde quiera). Solo `message`, con el link al final:
// en iPhone, si además se pasa `url`, WhatsApp se queda con una sola de las dos y el mensaje sale incompleto.
// Nunca lanza: cerrar el menú o un fallo del sistema no deben dejar un error sin atender en la pantalla.
export async function shareText(message: string): Promise<boolean> {
  try {
    const res = await Share.share({ message });
    return res.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}
