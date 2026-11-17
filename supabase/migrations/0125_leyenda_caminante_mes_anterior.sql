-- 0125: La Leyenda del mes en Actividad la ve SOLO quien más caminó el mes que terminó, y solo los días 1 a 7 del mes nuevo.
-- Reemplaza la walking_legend() de la 0124 (que usaba el mes en curso). Hora de Bolivia (local_today).
-- Idempotente: sí. Se revierte volviendo a aplicar la 0124.
create or replace function public.walking_legend()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $f$
declare
  v_today date := local_today();
  v_month date := (date_trunc('month', v_today) - interval '1 month')::date;
  v_top record;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  -- Después del día 7 la tarjeta desaparece para todos.
  if extract(day from v_today) > 7 then
    return jsonb_build_object('month', v_month, 'steps', 0, 'is_me', false);
  end if;
  select s.user_id, sum(s.steps)::bigint as steps
    into v_top
  from steps_daily s
  join profiles p on p.id = s.user_id
  where s.day >= v_month and s.day < (v_month + interval '1 month')::date and coalesce(p.suspended, false) = false
  group by s.user_id
  having sum(s.steps) > 0
  order by sum(s.steps) desc, min(s.day) asc, s.user_id
  limit 1;
  return jsonb_build_object('month', v_month, 'steps', coalesce(v_top.steps, 0), 'is_me', coalesce(v_top.user_id = auth.uid(), false));
end;
$f$;
revoke all on function public.walking_legend() from public, anon;
grant execute on function public.walking_legend() to authenticated;
