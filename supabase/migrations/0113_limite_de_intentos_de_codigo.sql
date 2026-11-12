-- 0113: límite de intentos con código equivocado (código del local para canjear y código de la Ruta).
-- Por qué: los dos códigos son de 4 números y no había tope de intentos. Como la ubicación la manda el teléfono,
-- alguien podía probar los 10.000 códigos por la API sin estar en el local.
-- Ahora: 8 códigos equivocados por persona y por local en una hora; después se frena hasta que pase la hora.
-- Escribir el código de canjes en la Ruta (error común) no cuenta como intento.
-- También: search_path fijo en cinco funciones chicas que no lo tenían (aviso del asesor de seguridad).
-- Impacto en la app: ninguno para quien escribe bien el código. Se revierte volviendo a aplicar las funciones de 0083/0094.

create table if not exists code_attempts (
  user_id uuid not null references profiles (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  kind text not null check (kind in ('local', 'ruta')),
  created_at timestamptz not null default now()
);
create index if not exists code_attempts_lookup on code_attempts (user_id, business_id, kind, created_at desc);
alter table code_attempts enable row level security;
revoke all on code_attempts from public, anon, authenticated;

create or replace function code_attempts_left(p_user uuid, p_business uuid, p_kind text) returns integer
language sql stable security definer set search_path = public
as $f$
  select greatest(0, 8 - (select count(*) from code_attempts
                          where user_id = p_user and business_id = p_business and kind = p_kind
                            and created_at > now() - interval '1 hour'))::int
$f$;
revoke execute on function code_attempts_left(uuid, uuid, text) from public, anon, authenticated;

do $$
declare def text;
begin
  -- Código del local (canje)
  select pg_get_functiondef('public.redeem_with_local_code(uuid, text, double precision, double precision)'::regprocedure) into def;
  if position('code_attempts' in def) = 0 then
    def := replace(def,
      E'  if p_code is distinct from v_code then\n    return jsonb_build_object(''ok'', false, ''reason'', ''codigo_incorrecto'');\n  end if;',
      E'  if code_attempts_left(v_user, v_biz.id, ''local'') = 0 then\n    raise exception ''Probaste muchos códigos equivocados en este local. Pide el código en la caja y vuelve a intentar en un rato.'';\n  end if;\n  if p_code is distinct from v_code then\n    insert into code_attempts (user_id, business_id, kind) values (v_user, v_biz.id, ''local'');\n    return jsonb_build_object(''ok'', false, ''reason'', ''codigo_incorrecto'');\n  end if;');
    if position('code_attempts' in def) = 0 then raise exception 'No se encontró dónde poner el límite en redeem_with_local_code'; end if;
    execute def;
  end if;

  -- Código de la Ruta
  select pg_get_functiondef('public.route_mark_visit(uuid, text, double precision, double precision)'::regprocedure) into def;
  if position('code_attempts' in def) = 0 then
    def := replace(def,
      E'  if p_code is distinct from v_code then\n',
      E'  if code_attempts_left(v_user, p_business, ''ruta'') = 0 then\n    return jsonb_build_object(''ok'', false, ''reason'', ''demasiados_intentos'');\n  end if;\n  if p_code is distinct from v_code then\n');
    def := replace(def,
      E'    return jsonb_build_object(''ok'', false, ''reason'', ''codigo_incorrecto'');\n  end if;\n  insert into route_visits',
      E'    insert into code_attempts (user_id, business_id, kind) values (v_user, p_business, ''ruta'');\n    return jsonb_build_object(''ok'', false, ''reason'', ''codigo_incorrecto'');\n  end if;\n  insert into route_visits');
    if (length(def) - length(replace(def, 'code_attempts', ''))) / length('code_attempts') < 2 then
      raise exception 'No se encontró dónde poner el límite en route_mark_visit';
    end if;
    execute def;
  end if;
end $$;

do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and p.proname in ('new_place_bonus_points', 'streak_bonus_points', 'local_code_max_distance_m', 'streak_bonus_min_steps', 'short_name')
             and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public', f);
  end loop;
end $$;
