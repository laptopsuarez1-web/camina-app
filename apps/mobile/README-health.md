# Salud (HealthKit / Health Connect)

Camina lee el conteo de pasos del día desde la fuente real de salud del teléfono en vez de
depender solo del sensor interno: en iOS via HealthKit (`@kingstinct/react-native-healthkit`),
en Android via Health Connect (`react-native-health-connect`). Si no hay permiso o la plataforma
no está disponible, cae automáticamente al sensor crudo (`expo-sensors` Pedometer) — ver
`src/hooks/usePedometer.ts`.

## Requisitos para que funcione de verdad

Esto **no funciona en Expo Go** — son módulos nativos, hace falta un development build:

```bash
npx expo prebuild --clean
eas build --profile development --platform ios      # o android
```

### iOS

- La capability "HealthKit" tiene que estar habilitada para el App ID en
  developer.apple.com. Con EAS credenciales manejadas, esto se hace solo al compilar.
- Los textos de permiso (`NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription`) ya
  están en `app.json` vía el plugin `@kingstinct/react-native-healthkit`.
- En un dispositivo real: Ajustes → Salud → Acceso de apps → Camina, para revisar/revocar.

### Android

- Necesita la app "Health Connect" instalada (viene de fábrica desde Android 14; en versiones
  anteriores el usuario la instala desde Play Store — la librería no la instala por vos).
- El permiso `android.permission.health.READ_STEPS` ya está declarado en `app.json`.
- **Antes de publicar en Play Store**: hay que declarar el uso de datos de salud en Play
  Console (Google revisa esto — puede tardar hasta ~2 semanas entre la aprobación y que
  el acceso realmente se habilite). Sin esta declaración, Google rechaza la build.
- En un dispositivo real: la app Health Connect → Apps con acceso → Camina, para revisar/revocar.

## Qué pasa si el usuario no da permiso

La app sigue funcionando: `useTodaySteps()` cae al Pedometer del teléfono (mismo comportamiento
que antes de esta integración). Ganás y canjeás Puntos igual, solo que el conteo puede ser menos
preciso que agregando todas las fuentes de Salud (relojes, otras apps de fitness, etc.).
