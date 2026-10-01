-- 1) Funciones: por defecto Postgres deja ejecutar todo a cualquiera (incluso sin sesión). Se cierra todo
--    y solo se abre a personas con sesión lo que la app usa.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- Tareas internas (las corre el reloj de la base, nadie desde la app): nadie con cuenta puede llamarlas.
revoke execute on function weekly_group_maintenance() from authenticated;
revoke execute on function settle_group_challenges() from authenticated;
revoke execute on function close_group_week(date) from authenticated;
revoke execute on function end_founder_periods() from authenticated;
revoke execute on function apply_pending_plan_downgrades() from authenticated;
revoke execute on function queue_notification(uuid, text, text, jsonb, text) from authenticated;
revoke execute on function queue_expiring_points_notifications() from authenticated;
revoke execute on function queue_expiring_redemption_notifications() from authenticated;
revoke execute on function queue_streak_reminder_notifications() from authenticated;
revoke execute on function rls_auto_enable() from authenticated;

-- Lo que se cree de ahora en adelante también nace cerrado.
alter default privileges in schema public revoke execute on functions from public, anon;

-- 2) Nombres y fotos de las personas: solo para quien tiene sesión.
revoke select on public.public_profiles from anon;

-- 3) Borrar la cuenta de quien creó un desafío no debe trabarse (antes fallaba por esta relación).
alter table group_challenges alter column created_by drop not null;
alter table group_challenges drop constraint if exists group_challenges_created_by_fkey;
alter table group_challenges add constraint group_challenges_created_by_fkey foreign key (created_by) references profiles (id) on delete set null;
