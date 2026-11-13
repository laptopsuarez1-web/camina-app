import { Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

// Abre un enlace (WhatsApp, redes, web). Si el teléfono no puede abrirlo (por ejemplo, no tiene WhatsApp instalado),
// no se queda callado ni manda el error a Sentry: avisa y deja copiar el dato. Antes, el toque fallaba sin decir nada.
export async function openLink(url: string, copiar?: { titulo?: string; texto: string }): Promise<void> {
  try {
    await Linking.openURL(url);
    return;
  } catch {
    // WhatsApp: si el link web no abre, se prueba el esquema de la app.
    const wa = /^https:\/\/wa\.me\/(\d+)/.exec(url);
    if (wa) {
      try {
        await Linking.openURL(`whatsapp://send?phone=${wa[1]}`);
        return;
      } catch {
        // se sigue al aviso
      }
    }
  }
  const dato = copiar?.texto ?? url;
  Alert.alert(copiar?.titulo ?? 'No pudimos abrir el enlace', `Copia esto y ábrelo desde tu teléfono:\n${dato}`, [
    { text: 'Copiar', onPress: () => { Clipboard.setStringAsync(dato).catch(() => {}); } },
    { text: 'Cerrar', style: 'cancel' },
  ]);
}

// WhatsApp de un comercio: si no abre, muestra el número para copiarlo.
export function openWhatsapp(url: string, phone: string): Promise<void> {
  const digits = phone.replace(/\D/g, '');
  return openLink(url, { titulo: 'No pudimos abrir WhatsApp', texto: digits.startsWith('591') ? `+${digits}` : phone.trim() });
}
