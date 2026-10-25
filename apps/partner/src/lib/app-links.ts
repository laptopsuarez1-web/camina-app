// A dónde se manda a quien recibe una invitación y todavía no tiene la app.
// iPhone: link público de TestFlight (se crea en App Store Connect > TestFlight > Pruebas externas > Enlace público).
// Mientras esté vacío, la página pide escribir a Camina para recibirlo. Cuando la app esté en la App Store, poner el link de la tienda.
export const IOS_INSTALL_URL = process.env.NEXT_PUBLIC_IOS_INSTALL_URL ?? '';
// Android: prueba cerrada de Google Play. Cuando la app sea pública, poner https://play.google.com/store/apps/details?id=bo.camina.app
export const ANDROID_INSTALL_URL = process.env.NEXT_PUBLIC_ANDROID_INSTALL_URL ?? 'https://play.google.com/apps/testing/bo.camina.app';
export const SUPPORT_EMAIL = 'caminaappbo@gmail.com';
