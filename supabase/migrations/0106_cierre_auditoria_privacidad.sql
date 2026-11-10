-- Auditoría (9 nov 2026): cierre de fugas de lectura y permisos de sobra.
-- Cómo se revierte: restaurar user_badges de 0083, crear de nuevo la política "winners: read" (using true) y
--   grant insert, update, delete on points_ledger, redemptions, promotion_winners to authenticated.

-- 1) user_badges(uuid): antes cualquier cuenta podía pedir las insignias, el banner y los locales de CUALQUIER persona.
--    Ahora solo: uno mismo, un admin, un amigo o alguien con quien comparte un grupo (igual que friend_card), sin bloqueos.
--    Si no corresponde, devuelve lo mismo pero vacío (la app ya sabe mostrar eso).
create or replace function user_badges(p_user uuid) returns jsonb as $f$
  select case
    when auth.uid() is not null and (
      p_user = auth.uid()
      or is_admin()
      or (
        not users_blocked(auth.uid(), p_user)
        and (
          are_friends(auth.uid(), p_user)
          or exists (select 1 from group_members a join group_members b on a.group_id = b.group_id
                     where a.user_id = auth.uid() and b.user_id = p_user)
        )
      )
    ) then jsonb_build_object(
      'featured', (select featured_badge from profiles where id = p_user),
      'banner_url', (select case when profile_bg = 'foto' then profile_banner_url end from profiles where id = p_user),
      'routes', coalesce((select jsonb_agg(jsonb_build_object('month', month, 'completed_at', completed_at) order by month desc)
                          from route_participants where user_id = p_user and completed_at is not null), '[]'::jsonb),
      'locals', coalesce((select jsonb_agg(x order by x->>'points' desc) from (
          select jsonb_build_object('business_id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category,
            'points', sum(l.points)::int, 'level', level_name(sum(l.points)::int)) x
          from business_level_points l join businesses b on b.id = l.business_id
          where l.user_id = p_user group by b.id) t), '[]'::jsonb)
    )
    else jsonb_build_object('featured', null, 'banner_url', null, 'routes', '[]'::jsonb, 'locals', '[]'::jsonb)
  end;
$f$ language sql stable security definer set search_path = public;

-- 2) promotion_winners: cada persona solo ve sus propios premios (la app solo pregunta por el suyo). Admin ve todo.
drop policy if exists "winners: read" on promotion_winners;
create policy "winners: read own or admin" on promotion_winners for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- 3) Permisos de sobra: estas tablas solo se escriben desde funciones del servidor (security definer), nunca desde la app.
revoke all on points_ledger, redemptions, promotion_winners from anon;
revoke insert, update, delete, truncate, references, trigger on points_ledger, redemptions, promotion_winners from authenticated;
