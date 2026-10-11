-- PROPUESTA 0044 (SEC-05): una persona suspendida no puede levantarse la suspensión; lo legítimo del perfil sigue andando.
-- Sin la propuesta: "la suspensión sigue puesta" falla (el PATCH {suspended:false} funciona).
begin;

do $$
declare
  u uuid; adm uuid; v uuid; rep uuid; s boolean; t timestamptz; t0 timestamptz := timestamptz '2026-01-15 10:00:00+00';
begin
  u := tt.mk_user(6000, 'Persona'); adm := tt.mk_user(6000, 'Admin'); v := tt.mk_user(6000, 'Reportada');
  insert into app_admins (user_id) values (adm);

  -- ===== El ataque: levantarse la suspensión =====
  update profiles set suspended = true where id = u;     -- el equipo la suspende (desde el SQL Editor)
  perform tt.as_client(u);
  update profiles set suspended = false where id = u;
  perform tt.as_admin();
  select suspended into s from profiles where id = u;
  perform tt.t_eq('PATCH {suspended:false} sobre sí misma: la suspensión sigue puesta', s, true);

  -- También con un upsert (INSERT ... ON CONFLICT DO UPDATE), que es lo que usa PostgREST para .upsert()
  perform tt.as_client(u);
  insert into profiles (id, full_name, suspended) values (u, 'Persona', false)
    on conflict (id) do update set suspended = excluded.suspended, full_name = excluded.full_name;
  perform tt.as_admin();
  select suspended into s from profiles where id = u;
  perform tt.t_eq('upsert con suspended=false: la suspensión sigue puesta', s, true);

  -- Tampoco puede suspenderse/des-suspenderse a otros ni a sí misma en sentido contrario (queda como estaba)
  perform tt.as_client(v);
  update profiles set suspended = true where id = v;
  perform tt.as_admin();
  perform tt.t_eq('una persona no se puede suspender a sí misma por la API (queda como estaba)', (select suspended from profiles where id = v), false);

  -- ===== terms_accepted_at: se puede poner una vez, no reescribir =====
  perform tt.as_client(u);
  update profiles set terms_accepted_at = t0 where id = u;
  perform tt.as_admin();
  select terms_accepted_at into t from profiles where id = u;
  perform tt.t_eq('aceptar los términos por primera vez (null -> fecha) funciona', t, t0);
  perform tt.as_client(u);
  update profiles set terms_accepted_at = now() where id = u;
  perform tt.as_admin();
  select terms_accepted_at into t from profiles where id = u;
  perform tt.t_eq('... y la fecha ya puesta no se puede reescribir', t, t0);
  perform tt.as_client(u);
  update profiles set terms_accepted_at = null where id = u;
  perform tt.as_admin();
  perform tt.t_eq('... ni borrar', (select terms_accepted_at from profiles where id = u), t0);

  -- ===== Lo legítimo: editar el perfil =====
  perform tt.as_client(u);
  update profiles set full_name = 'Nuevo Nombre', zone = 'Centro', daily_goal = 8000, ranking_visible = false, dark_mode = true,
                      birth_date = date '1990-05-05', nearby_alerts = false where id = u;
  perform tt.as_admin();
  perform tt.t_true('nombre, zona, meta, ranking, modo oscuro, fecha de nacimiento y alertas se actualizan',
    (select full_name = 'Nuevo Nombre' and zone = 'Centro' and daily_goal = 8000 and not ranking_visible and dark_mode and birth_date = date '1990-05-05' and not nearby_alerts from profiles where id = u));
  perform tt.as_client(u);
  insert into profiles (id, full_name, zone) values (u, 'Nombre por upsert', 'Sur')
    on conflict (id) do update set full_name = excluded.full_name, zone = excluded.zone;
  perform tt.as_admin();
  perform tt.t_eq('el upsert del perfil (auth)/perfil.tsx sigue actualizando', (select full_name from profiles where id = u), 'Nombre por upsert');

  -- ===== Lo legítimo del equipo: las funciones de moderación siguen andando =====
  insert into content_reports (reporter_id, kind, target_user_id, reason) values (u, 'user', v, 'acoso') returning id into rep;
  perform tt.as_client(adm);
  perform admin_resolve_report(rep, 'suspend_user');
  perform tt.as_admin();
  perform tt.t_eq('admin_resolve_report(suspend_user) suspende a la persona reportada', (select suspended from profiles where id = v), true);
  perform tt.as_client(adm);
  perform admin_unsuspend_user(v);
  perform tt.as_admin();
  perform tt.t_eq('admin_unsuspend_user le levanta la suspensión', (select suspended from profiles where id = v), false);
  update profiles set suspended = true where id = v;
  perform tt.t_eq('el SQL Editor / service_role (rol postgres) también puede cambiar suspended', (select suspended from profiles where id = v), true);
end $$;

rollback;
