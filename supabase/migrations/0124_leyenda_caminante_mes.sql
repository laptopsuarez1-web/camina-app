-- 0124: Leyenda del mes en Actividad: quien más pasos caminó en el mes (entre todos los usuarios).
-- Cada quien solo recibe su propio dato: is_me = true solo para el primero del mes. No expone a nadie más.
-- Idempotente: sí. Se revierte con: drop function public.walking_legend();
create or replace function public.walking_legend()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $f$
declare
  v_month date := date_trunc('month', local_today())::date;
  v_top record;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  select s.user_id, sum(s.steps)::bigint as steps
    into v_top
  from steps_daily s
  join profiles p on p.id = s.user_id
  where s.day >= v_month and coalesce(p.suspended, false) = false
  group by s.user_id
  having sum(s.steps) > 0
  order by sum(s.steps) desc, min(s.day) asc, s.user_id
  limit 1;
  return jsonb_build_object('month', v_month, 'steps', coalesce(v_top.steps, 0), 'is_me', coalesce(v_top.user_id = auth.uid(), false));
end;
$f$;
revoke all on function public.walking_legend() from public, anon;
grant execute on function public.walking_legend() to authenticated;
