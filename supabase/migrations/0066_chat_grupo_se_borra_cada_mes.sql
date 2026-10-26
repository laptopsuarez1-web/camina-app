-- El chat de grupo se borra una vez por mes (antes cada lunes). El lunes solo se guarda el resultado de la semana.
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
    -- día 1 de cada mes, 04:10 UTC (00:10 en La Paz): borra los mensajes de más de un mes
    perform cron.schedule('purge-old-group-notes', '10 4 1 * *', $cron$delete from public.group_notes where created_at < now() - interval '1 month'$cron$);
  end if;
end $f$;
