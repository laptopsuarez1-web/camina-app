# Login con Google y Apple

Los botones "Continuar con Google" / "Continuar con Apple" de la pantalla de bienvenida
(`src/app/(auth)/welcome.tsx`) ya hacen auth real — nada de alert de "muy pronto". El flujo en
los dos casos es: la app consigue un ID token del proveedor (Google o Apple) y se lo pasa a
`supabase.auth.signInWithIdToken()`, que crea o loguea al usuario en Supabase Auth. Un usuario
nuevo por este camino sigue el mismo flujo que uno por email: entra a `/perfil` a poner su
nombre (Apple ya lo prellena si lo dio) y después a `/terminos`.

## Esto no funciona en Expo Go

`expo-apple-authentication` es un módulo nativo — hace falta development build, igual que
Salud y notificaciones (ver los otros `README-*.md` de esta carpeta):

```bash
npx expo prebuild --clean
eas build --profile development --platform ios      # o android
```

`expo-auth-session` (Google) sí es JS puro y técnicamente corre en Expo Go, pero el
`redirectUri` que genera ahí (`exp://...`) es distinto al de un build real (`camina://...`), así
que conviene probarlo directamente en development build para no tener que mantener dos
configuraciones de Client ID en Google Cloud.

## Lo que falta configurar de tu lado

### Google

1. **Google Cloud Console** (https://console.cloud.google.com/apis/credentials), mismo proyecto
   o uno nuevo:
   - Configurá la pantalla de consentimiento OAuth (OAuth consent screen) si no la tenés.
   - Creá un **Client ID de tipo iOS** — Bundle ID: `bo.camina.app`.
   - Creá un **Client ID de tipo Android** — Package name: `bo.camina.app`, y el SHA-1 de tu
     build (`eas credentials` te lo muestra, o `keytool` sobre tu keystore local).
   - (Opcional, solo si vas a probarlo en navegador/web) Client ID de tipo **Web**, con
     `https://auth.expo.io/@tu-cuenta-expo/camina` como Authorized redirect URI.
2. Pegá los Client IDs en `apps/mobile/.env` (ver `.env.example`):
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`,
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Con que uno esté seteado alcanza para que el botón
   funcione en esa plataforma; si no hay ninguno, el botón avisa que Google no está
   configurado en vez de romper.
3. **Supabase dashboard** → Authentication → Providers → Google → activalo, y en "Authorized
   Client IDs" pegá los mismos tres Client IDs (separados por coma). Esto es necesario aunque
   uses `signInWithIdToken` (no pasa por el redirect OAuth de Supabase) — Supabase igual valida
   el token contra esa lista.

### Apple

1. **developer.apple.com** → tu App ID (`bo.camina.app`) → habilitá la capability
   "Sign In with Apple". Con EAS y credenciales manejadas esto se agrega solo al compilar
   (gracias al plugin `expo-apple-authentication` ya agregado a `app.json`), pero la capability
   en el App ID hay que habilitarla una vez a mano si no la tenías.
2. **Supabase dashboard** → Authentication → Providers → Apple → activalo. En "Authorized
   Client IDs" agregá `bo.camina.app` (el bundle ID — para Sign in with Apple nativo, Supabase
   no necesita el Services ID ni el secret que pide para el flujo web).
3. El botón de Apple solo se muestra en iOS (Android no tiene Sign in with Apple) y solo si
   `AppleAuthentication.isAvailableAsync()` da `true` — en iOS < 13 o si el dispositivo no lo
   soporta, se oculta solo.

## Si el usuario cancela o algo falla

Ambos casos muestran un alert con el motivo, salvo que el usuario haya cancelado el diálogo de
Apple a propósito (`ERR_REQUEST_CANCELED`), donde no se le molesta con nada.
