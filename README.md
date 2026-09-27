# Camina

Monorepo de la app Camina: caminá, ganá Puntos, canjealos en comercios de Tarija.

```
apps/mobile     App de usuarios (Expo / React Native — iOS y Android)
apps/partner    Panel web de comercios (Next.js)
supabase/       Schema, funciones SQL y storage (backend real, compartido por ambas apps)
```

Todas las reglas de negocio (1 Punto cada 1000 pasos, tope de 20 Puntos/día, cooldown de
14 días por comercio, código de canje de 6 dígitos que vence a los 15 minutos, vencimiento
de Puntos a los 90 días) viven en `supabase/migrations/0001_init.sql` como funciones
`security definer` — ni la app ni el panel pueden saltárselas desde el cliente.

## 1. Crear el proyecto Supabase

1. Creá un proyecto en https://supabase.com (elegí una región cercana, ej. São Paulo).
2. Instalá la CLI de Supabase y logueate: `npm i -g supabase && supabase login`.
3. Vinculá este repo al proyecto: `supabase link --project-ref <tu-project-ref>` (desde `supabase/`).
4. Aplicá el schema: `supabase db push` (corre `0001_init.sql` y `0002_storage.sql`).
5. En el dashboard de Supabase, copiá **Project URL** y **anon public key** (Settings → API).

## 2. Variables de entorno

```
apps/mobile/.env          (copiar de .env.example)
  EXPO_PUBLIC_SUPABASE_URL=...
  EXPO_PUBLIC_SUPABASE_ANON_KEY=...

apps/partner/.env.local   (copiar de .env.local.example)
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Para builds con EAS, subí las mismas variables como EAS Environment Variables
(`eas env:create --scope project`) en vez de hardcodearlas en `eas.json`.

## 3. Correr en desarrollo

```bash
npm install                 # en la raíz, instala todo el monorepo

npm run mobile               # apps/mobile → npx expo start
npm run partner              # apps/partner → npx next dev
```

La app mobile necesita un **development build** (no alcanza con Expo Go) porque usa
podómetro nativo, mapas y notificaciones:

```bash
cd apps/mobile
npx eas build --profile development --platform ios      # o android
```

## 4. Lo que falta de tu lado para que esto sea 100% real

- **Cuenta de Apple Developer** (US$99/año) para firmar y publicar en la App Store, y
  **cuenta de Google Play Console** (pago único ~US$25) para Android.
- **API Key de Google Maps** (una para iOS, una para Android) — reemplazar
  `REEMPLAZAR_CON_API_KEY_IOS` / `REEMPLAZAR_CON_API_KEY_ANDROID` en `apps/mobile/app.json`.
- **Coordenadas reales (lat/lng) de los comercios** de Tarija que vayan sumándose — hoy la
  tabla `businesses` no tiene datos de ejemplo cargados, arranca vacía.
- **Login con Google/Apple real**: la pantalla ya tiene el flujo de email/password
  funcionando contra Supabase Auth; para los botones de Google/Apple hay que activar esos
  providers en el dashboard de Supabase (Authentication → Providers) y agregar sus
  credenciales OAuth.
- **Cuenta EAS** (gratis para empezar) para poder correr `eas build`/`eas submit`.

## 5. Estructura de reglas de negocio (por si hay que ajustarlas)

Todo en `supabase/migrations/0001_init.sql`:

| Regla | Función SQL |
|---|---|
| 1 Punto cada 1000 pasos, tope 20/día | `earn_points_from_steps` |
| Vigencia de Puntos (90 días) | `points_ttl_days` |
| Cooldown de 14 días por comercio | `redeem_benefit` (usa `business_redemption_cooldown_days`) |
| Código de 6 dígitos, vence en 15 min | `generate_redemption_code`, `redemption_code_ttl_minutes` |
| Validar código en el panel de comercios | `confirm_redemption_code` |
| Plan gratuito → 1 beneficio activo, 100% gratis | trigger `benefits_plan_rules` |
