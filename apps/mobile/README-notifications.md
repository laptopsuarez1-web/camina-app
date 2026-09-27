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

## Lo que falta configurar de tu lado

1. **`eas init`** — esto genera un Project ID real de EAS y hay que pegarlo en
   `app.json` → `extra.eas.projectId` (ahora mismo dice
   `REEMPLAZAR_CON_EAS_PROJECT_ID`). Sin esto, `getExpoPushTokenAsync` no tiene qué
   pedir y `registerForPushNotificationsAsync()` no hace nada (falla en silencio).
2. **Credenciales de push de Expo** — al compilar con `eas build`, EAS te pregunta si
   querés que genere y maneje las credenciales de push (APNs key para iOS, FCM para
   Android). Dejá que las maneje EAS salvo que ya tengas las tuyas.
3. **Database Webhook en Supabase** (Dashboard → Database → Webhooks → Create a new
   hook): tabla `notifications_outbox`, evento `INSERT`, tipo "Supabase Edge Function",
   apuntando a `send-push-notifications`. Esto es lo que realmente dispara el envío —
   sin este paso, las filas quedan en la cola pero nadie las manda (`sent_at` se queda
   en null para siempre). Si le ponés un secret al webhook, agregalo también como env
   var `PUSH_WEBHOOK_SECRET` de la función (`supabase secrets set`).
4. **`supabase functions deploy send-push-notifications`** — como cualquier Edge
   Function, hay que desplegarla; no se aplica sola con `supabase db push`.
5. **Extensión `pg_cron`** (Dashboard → Database → Extensions) — sin esto, los avisos
   de "código por vencer" y "Puntos por vencer" no se disparan solos (el aviso de
   "referido acreditado" sí funciona igual, porque va por trigger normal, no por cron).
   Si la habilitás después de correr la migración `0007`, corré una vez a mano desde el
   SQL Editor:
   ```sql
   select cron.schedule('queue-expiring-redemptions', '* * * * *', 'select queue_expiring_redemption_notifications()');
   select cron.schedule('queue-expiring-points', '0 12 * * *', 'select queue_expiring_points_notifications()');
   ```

## Si el usuario no da permiso

La app sigue funcionando igual — simplemente no le llegan avisos push. No hay ningún
flujo que dependa de que el permiso esté concedido.
