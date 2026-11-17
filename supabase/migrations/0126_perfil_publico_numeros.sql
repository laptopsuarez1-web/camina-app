-- 0126: perfil de alguien que no es tu amigo (idea de Marcos, estilo Pasito).
-- friend_card ahora devuelve racha, promedio diario y meta también a quien no es amigo, si esa persona tiene activado
-- «aparecer en el ranking» (profiles.ranking_visible, true por defecto: es lo mismo que ya ve el ranking global).
-- Los días (actividad día a día), la fecha de amistad y los grupos en común siguen siendo solo para amigos.
-- Idempotente: sí. No requiere build nuevo.
-- Cómo se revierte: volver a correr friend_card de 0079 y user_badges de 0083 (o la última que la redefina).
create or replace function friend_card(p_user uuid) returns jsonb as $f$
declare
  v_me uuid := auth.uid();
  v_p profiles;
  v_f friendships;
  v_rel text;
  v_bio_visible boolean;
  v_out jsonb;
begin
  if v_me is null then raise exception 'Sin sesión'; end if;
  select * into v_p from profiles where id = p_user;
  if not found or (p_user <> v_me and users_blocked(v_me, p_user)) then
    return null;
  end if;

  if p_user = v_me then
    v_rel := 'self';
  else
    select * into v_f from friendships
     where (requester_id = v_me and addressee_id = p_user) or (requester_id = p_user and addressee_id = v_me);
    v_rel := case
      when not found then 'none'
      when v_f.status = 'accepted' then 'friend'
      when v_f.requester_id = v_me then 'pending_out'
      else 'pending_in'
    end;
  end if;

  v_bio_visible := v_rel in ('self', 'friend') or exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = v_me and b.user_id = p_user
  );

  v_out := jsonb_build_object(
    'user_id', v_p.id, 'full_name', v_p.full_name, 'photo_url', v_p.photo_url,
    'relation', v_rel, 'bio', case when v_bio_visible then v_p.bio end,
    'profile_bg', v_p.profile_bg
  );

  -- Racha, promedio y meta: los ve cualquiera (como en el ranking), salvo que la persona haya apagado «aparecer en el ranking».
  if v_rel not in ('self', 'friend') and v_p.ranking_visible then
    v_out := v_out || jsonb_build_object(
      'streak', user_streak(p_user),
      'goal', v_p.daily_goal,
      'avg_week', coalesce((select round(sum(s.steps) / 7.0) from steps_daily s
                            where s.user_id = p_user and s.day > local_today() - 7), 0)
    );
  end if;

  if v_rel in ('self', 'friend') then
    v_out := v_out || jsonb_build_object(
      'friends_since', v_f.accepted_at,
      'streak', user_streak(p_user),
      'goal', v_p.daily_goal,
      'avg_week', coalesce((select round(sum(s.steps) / 7.0) from steps_daily s
                            where s.user_id = p_user and s.day > local_today() - 7), 0),
      'days', coalesce((select jsonb_agg(jsonb_build_object('day', s.day, 'steps', s.steps, 'goal', coalesce(nullif(s.goal, 0), v_p.daily_goal)) order by s.day)
                        from steps_daily s where s.user_id = p_user and s.day > local_today() - 35), '[]'::jsonb)
    );
  end if;
  return v_out;
end;
$f$ language plpgsql stable security definer set search_path = public;

-- Insignias: si la persona apagó «aparecer en el ranking», quien no es su amigo tampoco ve sus insignias.
-- Ella misma y sus amigos las siguen viendo. El fondo (banner) se sigue devolviendo siempre.
create or replace function public.user_badges(p_user uuid)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $f$
  with v as (
    select p_user = auth.uid()
        or coalesce((select ranking_visible from profiles where id = p_user), true)
        or exists (select 1 from friendships f where f.status = 'accepted'
                   and ((f.requester_id = auth.uid() and f.addressee_id = p_user) or (f.requester_id = p_user and f.addressee_id = auth.uid()))) as ok
  )
  select jsonb_build_object(
    'featured', case when (select ok from v) then (select featured_badge from profiles where id = p_user) end,
    'banner_url', (select case when profile_bg = 'foto' then profile_banner_url end from profiles where id = p_user),
    'routes', case when (select ok from v) then coalesce((select jsonb_agg(jsonb_build_object('month', month, 'completed_at', completed_at) order by month desc)
                        from route_participants where user_id = p_user and completed_at is not null), '[]'::jsonb) else '[]'::jsonb end,
    'locals', case when (select ok from v) then coalesce((select jsonb_agg(x order by x->>'points' desc) from (
        select jsonb_build_object('business_id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category,
          'points', sum(l.points)::int, 'level', level_name(sum(l.points)::int)) x
        from business_level_points l join businesses b on b.id = l.business_id
        where l.user_id = p_user group by b.id) t), '[]'::jsonb) else '[]'::jsonb end
  );
$f$;
