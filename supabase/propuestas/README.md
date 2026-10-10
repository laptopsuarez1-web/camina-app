# Camina — paquete de migraciones PROPUESTAS (base de datos)

Esto es una **propuesta**: nada de lo que hay en esta carpeta está aplicado en producción ni está en `supabase/migrations/`
(la CLI de Supabase ignora `supabase/propuestas/`). Cada archivo es chico, idempotente (se puede correr dos veces), tiene cabecera
(qué arregla, por qué, ids de hallazgo, impacto en el cliente, cómo se revierte) y fue probado en un Postgres descartable.
Para promover una propuesta: copiarla a `supabase/migrations/` con el número que corresponda y aplicarla como cualquier otra.

Todo se probó con `supabase/tests/run.sh` (Postgres temporal en el puerto 54399; no correr dos suites a la vez).

## Cómo correr las pruebas

| Comando | Qué hace |
|---|---|
| `bash supabase/tests/run.sh` | La suite de siempre (migraciones 0001–0039). No cambia. |
| `PROPUESTAS=1 bash supabase/tests/run.sh` | Aplica además `supabase/propuestas/*.sql` (dos veces, para probar idempotencia) y corre `supabase/tests/propuestas/NN_*.sql`. Un XPASS se informa como "arreglada por la propuesta" y no falla la corrida. Los FAIL de pruebas viejas listadas en `supabase/tests/propuestas/obsoletas.txt` se informan como "obsoleta" (la propuesta cambia esa regla a propósito). |
| `TESTS_DIR=supabase/tests/propuestas bash supabase/tests/run.sh` | Modo "antes": corre solo las pruebas de ataque **sin** las propuestas; los ataques aparecen como FAIL (es lo esperado, demuestra que el problema existe hoy). |
| `VERBOSE=1 …` | Muestra cada verificación. |

### Resultados

| Corrida | Verificaciones | ok | FAIL | xfail | Otros |
|---|---|---|---|---|---|
| Línea base al empezar (sin variable) | 311 | 289 | 0 | 22 | 0 XPASS |
| Después (sin variable, nada cambió) | 311 | 289 | 0 | 22 | 0 XPASS |
| `PROPUESTAS=1` | 528 ok + 13 xfail + 7 arregladas + 13 obsoletas | 528 | 0 | 13 | 7 arregladas por la propuesta (eran xfail), 13 obsoletas |
| Modo "antes" (ataques sin propuestas) | 194 | 95 | 99 | — | los 99 FAIL son los ataques demostrados |

xfail que quedan "arregladas por la propuesta" (7): el barrido de canjes vencidos (30_redemptions, R01 / 0052); `_reto_met`, `_reto_period`,
`_promotion_eligible` ejecutables por authenticated y la lectura de referidos ajenos con `_reto_met` (70_privileges, SEC-10 / 0047); insertar pasos directo
y fijar la meta de un día en `steps_daily` (80_rls_direct_writes, SEC-02 / 0041). Las 13 "obsoletas" son pruebas viejas cuya regla cambia a
propósito (5 de pasos por 0042, 7 del ranking global por 0048, 1 que contaba funciones que cancelan canjes por 0052); la cobertura equivalente está
en las pruebas nuevas.

## Tabla de hallazgos

Gravedad según la auditoría. "Riesgo para la app" resume el grep hecho en `apps/mobile/src`, `apps/partner` y `supabase/functions` **antes** de proponer cada cambio.

| Id | Grav. | Qué cambia (en simple) | A quién afecta | Riesgo para la app (grep) | Cómo se revierte | Pruebas |
|---|---|---|---|---|---|---|
| **SEC-01** `0040_lock_down_public_profiles.sql` | crítico | Hoy cualquier persona logueada puede editar o borrar el perfil de cualquier otra (la vista `public_profiles` deja escribir y borrar). Se le saca todo permiso de escritura y queda solo lectura para logueados. Además, las tablas/vistas nuevas ya no nacen con permisos de escritura abiertos. | Todos los usuarios (protege) | **Seguro**: la app solo hace `.select` sobre `public_profiles` (useGroupDetail:30,85,131; useGroupRanking:38; useModeration:24; useMyGroupsWeek:32). No se usa `security_invoker` (rompería el ranking de grupos). | `grant insert, update, delete on public.public_profiles to authenticated;` (no recomendado) | ataque demostrado antes; lectura y ranking de grupos verificados después |
| **SEC-02 / CR-03** `0041_lock_steps_daily_writes.sql` | alto | Los pasos ya no se pueden escribir directo en la tabla; solo por `earn_points_from_steps`. Esto cierra a la vez el hueco de "pasos inventados" y la puerta que dejaba filas sin crédito. | Todos (ranking, retos, pozos de grupo) | **Seguro**: `steps_daily` solo se lee desde el cliente (useStreak, useGroupRanking, useGroupDetail, useMyGroupsWeek, puntos.tsx, actividad.tsx); escribe solo la RPC. | recrear las dos policies "steps: upsert own/update own" y re-otorgar insert/update | ataque antes; `earn_points_from_steps` sigue acreditando |
| **SEC-03 (A)** | alto | La parte "escribir directo" queda cerrada por 0041. | — | ídem | — | ídem |
| **SEC-03 (B)** `0042_steps_absolute_curve.sql` | alto | La plausibilidad de pasos deja de ser "lo que ya tenías + margen" (cada llamada sumaba otros +2.000 sin esperar) y pasa a una curva absoluta desde la medianoche de La Paz (2.000 + 300 pasos/min, tope 100.000). Cortar la acumulación por llamadas repetidas queda probado. | Todos (el uso normal sigue igual) | Sin cambio de cliente. **Ver "Decisiones": la tasa 300/min es una elección tuya** y no cubre el abuso de fondo. | restaurar `earn_points_from_steps` de la 0039 | 7 pruebas nuevas; 5 viejas obsoletas (curva). |
| **SEC-04** `0043_business_insert_guards.sql` | alto | Un comercio nuevo ya no puede nacer con plan pago, fundador o tipo de cuenta elegido a mano: se fuerza `primer_paso`, `founder=false`; `account_kind` no se cambia después. | Comercios / quien administra planes | **Seguro**: el registro de comercio manda plan `primer_paso` y `account_kind` y nunca actualiza `account_kind`. Admin y service_role siguen pudiendo. | recrear `enforce_business_privileged_fields` de la 0014 | ataque antes; registro legítimo después |
| **SEC-05** `0044_profile_moderation_guard.sql` | alto | Una persona suspendida ya no puede levantarse la suspensión (ni cambiar `terms_accepted_at` ya puesto) editando su propio perfil. | Moderación | **Seguro**: el cliente actualiza `zone, dark_mode, daily_goal, terms_accepted_at (primera vez), birth_date, full_name`; nunca `suspended`. | `drop trigger profiles_moderation_guard on public.profiles;` | ataque antes; ediciones legítimas después |
| **SEC-06** `0045_user_spend_lock.sql` | medio | Si alguien dispara dos canjes al mismo tiempo, ya no puede gastar dos veces el mismo saldo ni saltear el cooldown de 14 días: se serializa por usuario (candado `pg_advisory_xact_lock`) en `redeem_benefit`, `create_group_challenge`, `join_group_challenge`. Cuerpos idénticos a la 0033 más una línea (verificado con diff). | Todos (invisible) | Sin cambio de cliente; misma firma. | recrear las tres funciones desde la 0033 | estructural + **concurrencia real** (dblink, dos sesiones) |
| **SEC-08** `0046_groups_read_authenticated.sql` | medio | La lista de grupos ya no se puede leer sin iniciar sesión (con solo la clave pública). Logueados siguen viendo los grupos como hoy en la práctica. | Privacidad de grupos | **Seguro**: `groups` solo se lee con sesión desde la app. | recrear la policy "groups: members read" | prueba nueva |
| **SEC-10** `0047_revoke_internal_helpers.sql` | medio | Se cierran a clientes los ayudantes internos (`_reto_met`, `_reto_period`, `_promotion_eligible`) que dejaban consultar rachas/pasos de cualquiera, y las funciones de trigger. | Privacidad | **Seguro**: 0 usos de esos helpers desde cliente/functions; las 44 RPC que usa la app se prueban una por una. | `grant execute … to authenticated` | regresión de las 44 RPC |
| **SEC-12 / CR-10** `functions/send-push-notifications/index.ts` | medio | Edge Function: el secreto pasa a ser **obligatorio** (si falta o no coincide, no envía nada), no se confía en el contenido del body (solo el id y se relee de la base), y si falla un lote solo se reintentan las filas de ese lote. Ver "Decisiones/Antes de desplegar". | Notificaciones push | La app no llama esta función (la dispara la base). | volver a desplegar la versión viva | mock en bun + tsc con stubs (no Deno real) |
| **SEC-22** `0048_global_ranking_min_users.sql` | medio | El ranking global ahora exige en el servidor más de 1.000 usuarios (la regla aprobada solo la aplicaba el cliente). | Privacidad (hoy hay ~4 perfiles) | **Seguro**: la UI ya está gateada por `useGlobalRankingOpen` (`RANKING_MIN_USERS=1000`). | recrear `global_weekly_ranking` de la migración vigente | 1000 vacío, 1001 funciona |
| **SEC-24** `0049_revoke_extra_table_privileges.sql` | bajo | Se sacan permisos sobrantes (truncate, references, trigger) a todas las tablas para anon/authenticated, y se ajustan los permisos por defecto. | Superficie | **Seguro**: PostgREST no los usa. | `grant … on all tables` | prueba nueva |
| **SEC-25** `0050_fix_function_search_path.sql` | bajo | Se fija `search_path = public` en 12 funciones (aviso del advisor). | Higiene | Sin cambio de comportamiento. | `alter function … reset search_path` | prueba nueva |
| **SEC-29 / CR-02** `0051_group_members_steps.sql` | medio | Nueva función `group_members_steps(p_since)` para que los rankings de grupo vean los pasos de los demás miembros **sin** abrir `steps_daily`. Hoy los rankings muestran 0 para todos menos uno. | Grupos | **Aditiva** (no rompe nada). **Requiere cambio de cliente** (ver abajo). Ventana máxima hoy−7; solo miembros de grupos compartidos. | `drop function public.group_members_steps(date);` | prueba nueva |
| **R01** `0052_expire_pending_redemptions.sql` | crítico | Función `expire_pending_redemptions(gracia)` que cancela canjes pendientes vencidos y **devuelve los Puntos** con el mismo asiento que `cancel_expired_redemption`. Lote de 1000 con `skip locked`. El `cron.schedule` está comentado. | Clientes con canjes trabados | Solo `service_role`; el cliente no la ve. Gracia por defecto 1 hora. | `drop function public.expire_pending_redemptions(interval);` | prueba nueva, incluye idempotencia |
| **UXC-46** `0053_streak_reminder_copy.sql` | medio | El push de racha dice "¡No cortes tu racha! 🔥" (antes "cortés"). Copia fiel de `queue_streak_reminder_notifications` de la 0018, solo cambia el título. | Quien tiene racha | Sin cambio de cliente. **Aviso**: no pude ver la función viva (ver "Qué no pude probar"); conviene comparar con producción antes de aplicar. | recrear desde 0018 | prueba nueva |

### Cambios necesarios en la app (no hechos: `apps/` no se toca en esta ronda)

1. **SEC-29 / CR-02** (después de aplicar 0051): en `useGroupRanking.ts`, `useGroupDetail.ts` y `useMyGroupsWeek.ts` reemplazar la lectura de
   `steps_daily` de otros miembros por `supabase.rpc('group_members_steps', { p_since: <lunes de la semana en formato YYYY-MM-DD> })`
   (devuelve `user_id, day, steps`). Los pasos propios se pueden seguir leyendo de `steps_daily`.
2. **R01** (opcional): un aviso "Tenés un canje pendiente" o "Se venció tu canje, te devolvimos los Puntos" mientras el barrido no haya corrido.
3. **SEC-09** (si decidís ir por ahí): confirmación antes de unirse por deep link `camina://join-group/<id>`.

## Decisiones (lo que NO elegí por vos)

- **SEC-03 C/D, tasa de pasos (0042).** Con 300 pasos/min se corta la acumulación por llamadas repetidas, pero no el abuso de fondo: a la 1:06 de La Paz ya se permiten 20.000 pasos. Opciones: (a) dejar 300/min tal cual; (b) bajar la tasa (p. ej. 200) o fijar un tope por hora del día; (c) atestación del dispositivo (HealthKit/Health Connect firmados); (d) detección de anomalías y revisión manual. Recomendación: aplicar 0041 ya (cierra lo grave), y 0042 recién cuando elijas la tasa; es la **última** de la lista.
- **SEC-07 (nombre y foto visibles para todos los logueados).** Hace falta decidir el predicado de la vista (solo grupo compartido, o `ranking_visible`) y si `ranking_visible` pasa a opt-in; implica ajustar el texto legal. Si se filtra, hay que revisar que el ranking de grupos siga viendo a todos los miembros. No preparé migración porque hay opciones de producto.
- **SEC-09 (unirse a un grupo sabiendo el id).** Opciones: código de invitación aleatorio, o aprobación del admin del grupo, más confirmación en el deep link. Recomendación: código de invitación. 0046 (SEC-08) ya evita listar ids sin sesión.
- **SEC-11 (Storage: listado público de `avatars`, etc.).** Quitar las policies "public read" y dejar solo lectura por URL pública rompe o no según cómo se usen las URLs; hay que probarlo con Storage real. No lo incluí como migración para que no se aplique por error; no escribí borrador en `borradores/`.
- **SEC-13 (tokens en AsyncStorage).** Cambio de cliente (`expo-secure-store`) con migración de sesión; decisión de producto sobre qué pasa con sesiones existentes.
- **SEC-15 (regenerar código de canje).** Hay que decidir el vencimiento de la devolución (hoy los Puntos devueltos no vencen) y si se puede regenerar un código ya vencido. Afecta reglas de negocio.
- **SEC-16 (cuentas múltiples / referidos).** Decisión de producto (bloquear vs. solo avisar al equipo).
- **SEC-17 (`qa_accounts`).** Puerta de atrás de pruebas en producción: decidir si se vacía la tabla, y quitar del cliente el `Math.max(deviceSteps, 15000)`.
- **SEC-18 (`google_review_url` libre).** Validar host (Google) con un CHECK y/o en el cliente; hay que decidir la lista de hosts permitidos.
- **SEC-19 (contraseña mínima, confirmación de correo, protección de contraseñas filtradas).** Se cambia en el dashboard de Supabase, no en SQL.
- **SEC-20 / SEC-21 / SEC-23.** Restricciones de claves en Google Cloud; links verificados (assetlinks / associatedDomains); coordenadas redondeadas en el teléfono. Son de cliente o consolas externas.
- **SEC-26 (repo ≠ producción).** `notify_send_push`, su trigger y el secreto de Vault viven en producción pero no están en el repo; recomiendo traerlos al repo (extraer con `pg_get_functiondef` en una sesión autorizada).
- **SEC-27 (delete-account no borra el comercio).** Cambio en Edge Functions con borrado de datos; requiere decisión sobre comercios huérfanos.
- **SEC-28 (13+ solo en el cliente).** Un CHECK en `profiles.birth_date` rompería perfiles existentes sin fecha; opción compatible: validar solo en INSERT/UPDATE de la columna. Falta decisión sobre usuarios existentes.
- **SEC-14 (opcional, no reproducible).** La auditoría lo marcó como no confirmado; no hice nada. R01 devuelve los Puntos de pendientes vencidos, no los de `expired`.
- **R01, gracia de 1 hora.** Elegí una hora entre el vencimiento y el barrido para no pisar a una persona que justo está mostrando el código; si preferís otra, es un parámetro.
- **Permisos futuros.** 0040 y 0049 cambian los permisos por defecto de lo que se cree de acá en adelante: **toda migración nueva debe hacer `grant` explícito** a quien corresponda (ya no hay permisos regalados).
- **Antes de desplegar la edge function (SEC-12).** Confirmar en el dashboard (Edge Functions > Secrets) que `PUSH_WEBHOOK_SECRET` existe y es **igual** al secreto de Vault `push_webhook_secret` que usa `notify_send_push`; si no, se cortan los push. Además la v2 viva es vieja: hay que redeployar.
- **CR-10 (cron sin body).** Un cron que invoque la función sin body (red de seguridad para lo pendiente) usaría `pg_net` y Vault; quedó solo como idea comentada, no como archivo.

## Limpieza de datos (comentada, requiere tu OK)

Nada de esto se ejecuta desde las migraciones. Son sentencias para correr **a mano**, en producción, solo si el dueño las aprueba.

```sql
-- 1) 34 filas de steps_daily sin crédito (30 QA/admin del 2026-09-29 y 4 manuales del usuario 5a15974b del 2026-09-28).
--    Revisar primero:
-- select * from public.steps_daily where <criterio acordado> order by day;
--    Y recién con OK explícito:
-- delete from public.steps_daily where <mismo criterio>;

-- 2) 2 canjes vencidos del usuario 25d20b42 (quedaron 'pending' con el código vencido).
--    Opción A: usar el barrido nuevo (después de aplicar 0052), con gracia 0:
-- select public.expire_pending_redemptions(interval '0');
--    Opción B: por id, con la función que ya existe y que dispara el cliente:
-- select public.cancel_expired_redemption('<id_del_canje>');
--    Chequeo previo opcional (por si alguno ya figura como 'expired', que 0052 no toca):
-- select id, status, code_expires_at from public.redemptions where user_id::text like '25d20b42%';
```

## Orden de aplicación recomendado

1. **0040** (SEC-01) primero: es el único crítico de seguridad y es solo un `revoke`.
2. **0041**, **0044**, **0043**, **0047**, **0046**, **0049**, **0050**: son recortes de permisos/guardas sin cambio de cliente.
3. **0045** (candados de gasto).
4. **0052** (R01) y, si se decide, descomentar su cron; luego correr la limpieza de los 2 canjes.
5. **0051** (aditiva) junto con el cambio de cliente en los 3 hooks.
6. **0053** (texto del push de racha).
7. **0048** (ranking global con >1000 usuarios).
8. **0042** al final y **solo** con decisión sobre la tasa de pasos.
9. Edge function (SEC-12/CR-10): después de confirmar `PUSH_WEBHOOK_SECRET`.

Renumerar al promover: los números 0040–0053 son los que siguen a la última migración aplicada (0039); si entra otra antes, se corren.

## Qué no pude probar

- **pg_cron**: el `cron.schedule` de R01 está comentado y no se probó (la extensión puede no estar habilitada).
- **pg_net / Vault**: el trigger `notify_send_push` y el secreto no están en el repo ni en el Postgres de prueba.
- **Edge Functions reales**: la propuesta se probó con un mock en bun y `tsc` con stubs de Deno, **no** corriendo en Deno/Supabase real. No se llamó a Expo.
- **PostgREST / `safeupdate` / roles reales de Supabase**: el arnés usa roles `authenticated`/`anon` locales con `tt.as_client`, que aplican RLS y permisos reales de Postgres pero no la capa HTTP.
- **Storage real** (SEC-11) y **Auth real** (SEC-19).
- **Postgres 17 y el permiso MAINTAIN**: local es PG16; la rama de `maintain` (`server_version_num >= 170000`) está escrita pero no se ejecutó.
- **La función viva vs. el repo** (0018/0039, `queue_streak_reminder_notifications`, `earn_points_from_steps`): produccion se aplicó a mano parte de las migraciones (SEC-26). Las propuestas parten del repo; comparar con producción antes de aplicar.
- **Concurrencia**: solo con dblink local entre dos sesiones.

## Cosas que vi y no hice

- Una xfail de `earn_points_from_steps` sin sesión (`auth.uid() is null or p_user_id <> auth.uid()`): sigue marcada xfail.
- FIFO del saldo (el recorte con `greatest(0, …)` oculta descuadres): no se tocó.
- R17 `group_member_count`, SEC-26 `notify_send_push` fuera del repo, y las migraciones 0014–0031 que no figuran en `list_migrations` de producción.
- Candado por grupo para "un desafío activo": 0045 serializa por usuario, no por grupo.
