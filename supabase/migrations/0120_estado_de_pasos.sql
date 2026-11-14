-- 0120: Estado de la fuente de pasos de cada persona (solo Android, por ahora).
-- Cada vez que se abre la app se guarda en qué quedó: si Health Connect está instalado, si dio el permiso, si tiene
-- pasos guardados (alguna app le escribe) y si el contador del teléfono está activo. Así se ve quién tiene el problema
-- de «0 pasos» sin preguntarle a nadie. Una fila por persona (la última apertura).

create table if not exists public.step_source_reports (
  user_id uuid primary key references auth.users (id) on delete cascade,
  platform text not null,
  app_build text,
  health_connect text,      -- active | needs-source (vacío) | needs-permission | needs-system | error
  health_connect_steps integer,
  phone_counter text,       -- active | needs-permission | unavailable
  phone_counter_steps integer,
  reported_at timestamptz not null default now()
);

alter table public.step_source_reports enable row level security;
-- Sin políticas: nadie la lee ni escribe directo desde la app; solo con la función de abajo y desde el panel de Supabase.

create or replace function public.report_step_sources(
  p_platform text,
  p_app_build text,
  p_health_connect text,
  p_health_connect_steps integer,
  p_phone_counter text,
  p_phone_counter_steps integer
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  insert into step_source_reports as r (user_id, platform, app_build, health_connect, health_connect_steps, phone_counter, phone_counter_steps, reported_at)
  values (auth.uid(), left(p_platform, 20), left(p_app_build, 20), left(p_health_connect, 30), p_health_connect_steps, left(p_phone_counter, 30), p_phone_counter_steps, now())
  on conflict (user_id) do update set
    platform = excluded.platform,
    app_build = excluded.app_build,
    health_connect = excluded.health_connect,
    health_connect_steps = excluded.health_connect_steps,
    phone_counter = excluded.phone_counter,
    phone_counter_steps = excluded.phone_counter_steps,
    reported_at = excluded.reported_at;
end;
$$;

revoke all on function public.report_step_sources(text, text, text, integer, text, integer) from public, anon;
grant execute on function public.report_step_sources(text, text, text, integer, text, integer) to authenticated;
