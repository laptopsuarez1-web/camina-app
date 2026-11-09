-- Luz de vida (fisioterapia): su comercio nace aprobado y con rubro Fisioterapia, solo para su correo exacto.
create or replace function enforce_business_privileged_fields() returns trigger as $$
declare
  v_luz boolean := false;
begin
  if tg_op = 'INSERT' then
    if not is_admin() then
      select exists (select 1 from auth.users u where u.id = new.owner_user_id and lower(u.email) = 'luzdevidafisio@gmail.com') into v_luz;
      new.approved := v_luz;
      if v_luz then new.category := 'Fisioterapia'; end if;
      new.ad_eligible := false;
      new.plan_started_at := now();
      new.pending_plan := null;
      new.paused_at := null;
      new.pause_reason := null;
      if auth.role() = 'authenticated' then
        new.plan := 'primer_paso';
        new.founder := false;
        new.founder_until := null;
      end if;
    end if;
    return new;
  end if;

  if auth.role() = 'authenticated' and not is_admin() then
    if new.approved is distinct from old.approved then
      raise exception 'La aprobación del comercio la confirma el equipo de Camina.';
    end if;
    if new.ad_eligible is distinct from old.ad_eligible then
      raise exception 'La elegibilidad para espacios publicitarios la define el equipo de Camina.';
    end if;
    new.plan_started_at := old.plan_started_at;
    new.pending_plan := old.pending_plan;
    new.account_kind := old.account_kind;
    new.paused_at := old.paused_at;
    new.pause_reason := old.pause_reason;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
