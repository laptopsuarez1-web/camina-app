# Camina — textos y pendientes para publicar

## Datos de la ficha

| Campo | Valor |
|---|---|
| Nombre | Camina |
| Subtítulo iOS (30 car.) | Caminá y ganá Puntos |
| Descripción corta Google Play (80 car.) | Convertí tus pasos en Puntos y canjealos en comercios de tu ciudad. |
| Categoría | Salud y bienestar (secundaria: Estilo de vida) |
| Clasificación de edad | 4+ / Todos |
| Bundle ID / Package | `bo.camina.app` |
| URL de Términos | https://caminaapp.com/terminos |
| URL de Privacidad | https://caminaapp.com/privacidad |
| URL de soporte / marketing | https://caminaapp.com |
| Palabras clave iOS (100 car.) | caminar,pasos,puntos,premios,descuentos,comercios,bienestar,salud,canje,tarija |

## Descripción larga (iOS y Google Play)

Camina convierte tus pasos de todos los días en Puntos que podés canjear en comercios de tu ciudad.

CÓMO FUNCIONA
• Caminá: Camina cuenta tus pasos desde Salud (iPhone) o Health Connect (Android).
• Sumá Puntos: cada 1.000 pasos ganás 1 Punto, hasta un tope diario.
• Canjeá: elegí un premio o descuento en un comercio cercano y mostrá tu código en el mostrador.

TODO EN UNA APP
• Aro de pasos diario con tu meta, tu racha y los Puntos que ganaste hoy.
• Actividad: tu semana, tu promedio frente a tu zona y un calendario de metas cumplidas.
• Mapa de comercios con sus premios y descuentos, cerca tuyo.
• Grupos: caminá con amigos, mirá el ranking del grupo y sumá pasos en equipo.
• Retos Camina: invitá amigos, mantené tu racha y ganá Puntos extra.

TU PRIVACIDAD
Camina solo lee la cantidad de pasos. No escribe en Salud, no vende tus datos y tu ubicación se usa solo para mostrarte comercios cerca.

¿Tenés un comercio? Sumalo en caminaapp.com y ofrecé premios a quienes caminan.

## Justificación de permisos (para App Review y Google Play)

**Salud / HealthKit (lectura de pasos).**
Camina lee únicamente el conteo diario de pasos. Lo usa para calcular los Puntos que gana el usuario. No escribe datos en Salud (`NSHealthUpdateUsageDescription` lo aclara), no lee ningún otro tipo de dato de salud, no usa los datos para publicidad ni los comparte con terceros. Solo se guarda el total de pasos por día en la cuenta del usuario, para calcular Puntos, racha y su historial.

**Ubicación (solo mientras se usa la app).**
Se usa para centrar el mapa de comercios y mostrar la distancia a cada uno. La ubicación no se envía ni se guarda en el servidor. Si el usuario no da permiso, el mapa se muestra en una ciudad por defecto y la app sigue funcionando.

**Movimiento y actividad física (Android `ACTIVITY_RECOGNITION`).**
Respaldo para contar pasos con el sensor del teléfono cuando Health Connect no está disponible.

**Fotos.** Solo para elegir la foto de perfil (opcional). No se pide cámara ni micrófono.

**Notificaciones.** Avisos de cuando un código de canje está por vencer, Puntos por vencer y retos.

**Sign in with Apple.** Está implementado (Google y correo/contraseña también). Apple lo exige al ofrecer login con Google.

### Notas para el revisor (App Review)
- La app requiere cuenta. Proveer un usuario de prueba con datos cargados (crear uno nuevo, no reutilizar el de QA).
- Los pasos se leen de Salud: en simulador no hay datos. Aclarar que se puede revisar el resto de la app sin pasos, o cargar pasos de prueba en Salud del dispositivo.
- Los premios se canjean con un código que muestra el usuario en un comercio; no hay pagos dentro de la app ni compras integradas.

## Google Play — Seguridad de los datos (borrador)
- Datos recopilados: correo y nombre (cuenta), foto de perfil (opcional), pasos diarios (salud y actividad física), historial de canjes, token de notificaciones.
- Ubicación: usada en el dispositivo, no recopilada.
- Cifrado en tránsito: sí. Eliminación de cuenta: sí, desde Perfil (y solicitud en la web).
- Declaración de Health Connect: permiso de lectura de pasos (`READ_STEPS`), uso: calcular Puntos.

## Capturas
Carpeta `docs/store-screenshots/` (1290×2796, formato iPhone 6.9"). Son de la app web con una cuenta casi vacía: para publicar, sacar las definitivas en un teléfono real con datos (pasos, racha, Puntos).

## Ícono
Es el logo aprobado por el dueño (círculo menta con huellas sobre morado `#200a52`), solo redimensionado a 1024×1024 sin transparencia. Archivos en `apps/mobile/assets/`: `icon.png`, `splash-icon.png`, `android-icon-foreground/background.png`, `favicon.png`. No modificar el diseño.

## Pendientes en Supabase (producción)

Estado al 28/09:
- OK: Site URL `https://caminaapp.com`; redirecciones permitidas incluyen `camina://auth-callback`; correo por SMTP propio (Resend, `no-reply@caminaapp.com`); Google activado; funciones `send-push-notifications`, `delete-account` y `delete-business-account` activas; tareas pg_cron y trigger de push creados.
- **Hecho — plantillas de correo:** confirmación, recuperación, enlace mágico, cambio de correo e invitación, en español y con el estilo de Camina.
- **Hecho — Sign in with Apple (lado Supabase):** proveedor Apple activado con Client ID `bo.camina.app`. Falta del lado de Apple: cuenta de Apple Developer y el App ID con la capacidad "Sign in with Apple".
- **Hecho — función de push protegida:** la función exige el header `x-webhook-secret`. El secreto vive en los secretos de la función y en Supabase Vault (el trigger `notify_send_push` lo lee de ahí). Probado: sin secreto responde 401, y una notificación real por el trigger responde 200.
- **Falta — probar push real:** hay 0 tokens registrados, así que nunca se probó en un teléfono.
- Recomendado: restringir la clave de Google Maps (está en `app.json`) a `bo.camina.app` desde Google Cloud.
