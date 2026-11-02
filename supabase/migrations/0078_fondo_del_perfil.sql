-- Fondo del perfil: cada persona elige el banner de arriba de su perfil entre 6 opciones.
-- profiles.profile_bg guarda la clave (null = Violeta, el de siempre). friend_card la devuelve para que la vean
-- quienes abren la ficha. La clave solo puede ser una de las 6 (check); la app dibuja el banner.
-- Idempotente: sí. No requiere build nuevo.
-- Cómo se revierte: restaurar friend_card de 0056; alter table profiles drop constraint profiles_bg_key; alter table profiles drop column profile_bg;
alter table profiles add column if not exists profile_bg text;
alter table profiles drop constraint if exists profiles_bg_key;
alter table profiles add constraint profiles_bg_key check (profile_bg is null or profile_bg in ('violeta','bosque','ciudad','sendero','pista','cielo'));

create or replace function friend_card(p_user uuid) returns jsonb as $$
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
$$ language plpgsql stable security definer set search_path = public;
