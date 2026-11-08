-- Retos Camina: cada reto se gana UNA sola vez por cuenta.
-- Antes: la meta semanal se volvía a cobrar cada semana, la racha cada N días y las invitaciones cada N amigos.
-- Ahora: cuando lo completas y lo cobras, queda "Completado" para siempre y no vuelve a dar Puntos.
-- Quien ya lo cobró alguna vez (con las reglas viejas) también lo tiene completado.

create or replace function public.reto_progress()
returns table (reto_id uuid, met integer, target integer, claimable boolean, claimed_now boolean) as $$
declare
  r retos;
  v_met integer;
  v_done boolean;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  for r in select * from retos where active order by sort, created_at loop
    v_done := exists (select 1 from reto_claims c where c.reto_id = r.id and c.user_id = auth.uid());
    reto_id := r.id;
    target := r.target;
    if v_done then
      met := r.target;
      claimable := false;
    else
      v_met := _reto_met(r, auth.uid());
      met := greatest(least(v_met, r.target), 0);
      claimable := v_met >= r.target;
    end if;
    claimed_now := v_done;
    return next;
  end loop;
end;
$$ language plpgsql stable security definer set search_path = public;
grant execute on function public.reto_progress() to authenticated;

create or replace function public.claim_reto(p_reto_id uuid) returns integer as $$
declare
  r retos;
  v_met integer;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  select * into r from retos where id = p_reto_id and active for update;
  if r.id is null then
    raise exception 'Ese reto no está disponible.';
  end if;
  -- Bloquea la fila del usuario para este reto: dos toques seguidos no cobran dos veces.
  perform pg_advisory_xact_lock(hashtext('reto:' || r.id || ':' || auth.uid()));
  if exists (select 1 from reto_claims where reto_id = r.id and user_id = auth.uid()) then
    raise exception 'Ya completaste este reto.';
  end if;

  v_met := _reto_met(r, auth.uid());
  if v_met < r.target then
    if r.kind = 'referrals' then
      raise exception 'Todavía te faltan amigos para este reto.';
    end if;
    raise exception 'Todavía no completaste este reto.';
  end if;

  insert into reto_claims (reto_id, user_id, period, points) values (r.id, auth.uid(), 'unica', r.reward_points)
  on conflict (reto_id, user_id, period) do nothing;
  if not found then
    raise exception 'Ya completaste este reto.';
  end if;

  insert into points_ledger (user_id, amount, reason, expires_at, note)
  values (auth.uid(), r.reward_points, 'challenge', now() + (points_ttl_days() || ' days')::interval, 'Reto: ' || r.title);

  insert into notifications_outbox (user_id, title, body, data, dedupe_key)
  values (auth.uid(), '¡Reto completado! 🎉', 'Ganaste ' || r.reward_points || ' Puntos por "' || r.title || '". ¡Bien hecho!',
          jsonb_build_object('type', 'reto', 'reto_id', r.id), 'reto:' || r.id || ':' || auth.uid() || ':unica')
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return r.reward_points;
end;
$$ language plpgsql security definer set search_path = public;
