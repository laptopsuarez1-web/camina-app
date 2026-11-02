// Google (Android) devuelve el resultado del login a una dirección tipo `bo.camina.app:/oauthredirect?code=…`
// (que la app ve como `camina://oauthredirect?…`). Esa dirección no es una pantalla: la lee expo-auth-session
// por su cuenta. Si el enrutador la toma como pantalla, abre "Unmatched Route" y el login nunca termina.
// Devolver vacío le dice al enrutador que no navegue; expo-auth-session sigue recibiendo el enlace igual.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (/oauthredirect/i.test(path)) return '';
  return path;
}
