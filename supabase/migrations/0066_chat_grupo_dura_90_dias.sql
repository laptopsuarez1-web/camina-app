-- El chat de grupo ya no se vacía cada lunes: los mensajes duran 90 días y se borran solos (sin aviso en la app).
-- El lunes solo se sigue guardando el resultado de la semana que terminó (historial del grupo).
create or replace function weekly_group_maintenance() returns void as $f$
declare
  v_week date := date_trunc('week', now() at time zone 'America/La_Paz')::date - 7;
begin
  perform close_group_week(v_week);
end;
$f$ language plpgsql security definer set search_path = public;

do $f$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-old-group-notes';
    -- domingos 05:30 UTC: borra mensajes de más de 90 días
    perform cron.schedule('purge-old-group-notes', '30 5 * * 0', $cron$delete from public.group_notes where created_at < now() - interval '90 days'$cron$);
  end if;
end $f$;
