# Notificaciones push

Camina manda notificaciones push reales (no locales) para tres eventos: código de canje
por vencer, referido acreditado, y Puntos por vencer. El flujo completo:

1. La app pide permiso y guarda el **Expo Push Token** del dispositivo en la tabla
   `push_tokens` (`src/lib/push-notifications.ts`, se llama solo al entrar autenticado —
   ver `src/app/(tabs)/_layout.tsx`).
2. Triggers y jobs en Postgres (`supabase/migrations/0007_push_notifications.sql`)
   encolan filas en `notifications_outbox` cuando pasa algo que amerita avisar.
3. La Edge Function `supabase/functions/send-push-notifications` lee esa cola y le pega
   a la API de push de Expo (`https://exp.host/--/api/v2/push/send`), que a su vez manda
   la notificación real a APNs (iOS) o FCM (Android) — Expo se encarga de eso, no hace
   falta credencial propia de Apple/Google para esto en concreto (sí para publicar en
   las stores, pero eso es aparte).

## Esto no funciona en Expo Go

Desde el SDK 53 de Expo, `expo-notifications` para push remoto (no local) ya no
funciona en Expo Go — hace falta development build, igual que con el podómetro de
Salud:

```bash
npx expo prebuild --clean
eas build --profile development --platform ios      # o android
```

Tampoco funciona en simulador de iOS ni emulador de Android sin Google Play Services:
Apple y Google no entregan tokens push ahí. Probalo en un dispositivo físico.

## Estado (ya conectado)

Todo esto ya está hecho contra el proyecto real de Supabase — no hace falta tocar nada
para que funcione:

- `eas init` corrido, `app.json` → `extra.eas.projectId` tiene el Project ID real.
- `pg_net` y `pg_cron` habilitados.
- Los dos cron jobs programados (`queue-expiring-redemptions` cada minuto,
  `queue-expiring-points` una vez al día).
- `send-push-notifications` desplegada.
- Un trigger (`notifications_outbox_send_push`, vía `pg_net.http_post`) llama a la
  función automáticamente en cada insert a `notifications_outbox` — cumple el mismo rol
  que un Database Webhook del dashboard, armado directo por SQL.

Lo único pendiente son las **credenciales de push de Expo** (APNs key de iOS, FCM de
Android) — EAS te va a preguntar si las genera y maneja él la primera vez que compiles
con push habilitado; dejá que las maneje EAS salvo que ya tengas las tuyas propias.

## Si el usuario no da permiso

La app sigue funcionando igual — simplemente no le llegan avisos push. No hay ningún
flujo que dependa de que el permiso esté concedido.
