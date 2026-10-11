-- PROPUESTA 0043 (SEC-04): al crear un comercio no se puede elegir plan pago ni fundador; account_kind no cambia después.
-- Sin la propuesta: el comercio nace como paso_adelante / fundador (la comprobación 'nace con plan primer_paso' falla).
begin;

do $$
declare
  u uuid; u2 uuid; adm uuid; b uuid; bz businesses; n integer; k text;
begin
  u := tt.mk_user(6000, 'Dueño'); u2 := tt.mk_user(6000, 'Dueño 2'); adm := tt.mk_user(6000, 'Admin');
  insert into app_admins (user_id) values (adm);

  -- ===== El ataque: alta con plan pago y fundador =====
  perform tt.as_client(u);
  insert into businesses (owner_user_id, name, category, plan, founder, founder_until, approved, ad_eligible)
  values (u, 'Comercio tramposo', 'Café', 'paso_adelante', true, now() + interval '5 years', true, true)
  returning * into bz;
  perform tt.as_admin();
  perform tt.t_eq('el comercio nace con plan primer_paso aunque el cliente pidió paso_adelante', bz.plan::text, 'primer_paso');
  perform tt.t_eq('... no nace como fundador', bz.founder, false);
  perform tt.t_eq('... ni con fecha de fundador', bz.founder_until is null, true);
  perform tt.t_eq('... ni aprobado (ya estaba cerrado desde la 0014)', bz.approved, false);
  perform tt.t_eq('... ni elegible para publicidad (ya estaba cerrado)', bz.ad_eligible, false);
  perform tt.t_eq('los cupos del programa fundador siguen en 0', founder_slots_used(), 0);

  -- Tres altas más no consumen cupos
  perform tt.as_client(u2);
  insert into businesses (owner_user_id, name, category, plan, founder) values (u2, 'Otro tramposo', 'Café', 'paso_firme', true);
  perform tt.as_admin();
  perform tt.t_eq('varias altas tramposas no consumen cupos de fundador', founder_slots_used(), 0);
  perform tt.t_eq('... y todas quedan en primer_paso', (select count(*) from businesses where owner_user_id in (u, u2) and plan <> 'primer_paso')::int, 0);

  -- ===== Lo legítimo: el registro del panel (plan primer_paso, tipo de cuenta elegido) =====
  perform tt.as_client(u2);
  insert into businesses (owner_user_id, name, category, plan, account_kind, is_virtual) values (u2, 'Solo eventos', 'Eventos', 'primer_paso', 'events_only', true) returning * into bz;
  perform tt.as_admin();
  perform tt.t_eq('el alta como solo-eventos conserva account_kind = events_only', bz.account_kind, 'events_only');
  perform tt.t_eq('... y queda sin aprobar, como siempre', bz.approved, false);

  -- ===== account_kind no cambia después del alta =====
  perform tt.as_client(u2);
  update businesses set account_kind = 'commerce' where id = bz.id;
  perform tt.as_admin();
  select account_kind into k from businesses where id = bz.id;
  perform tt.t_eq('un update de account_kind por el dueño no surte efecto', k, 'events_only');
  perform tt.as_client(u2);
  update businesses set name = 'Nombre nuevo', phone = '+59170000000' where id = bz.id;
  perform tt.as_admin();
  perform tt.t_eq('el dueño sigue editando sus datos normales (nombre)', (select name from businesses where id = bz.id), 'Nombre nuevo');
  perform tt.as_client(u2);
  perform tt.t_raises('el dueño sigue sin poder subirse el plan (trigger de la 0003/0009)', format('update businesses set plan = ''paso_adelante'' where id = %L', bz.id), 'cambio de plan');
  perform tt.as_admin();

  -- ===== Admin y seeds no cambian =====
  perform tt.as_client(adm);
  insert into businesses (owner_user_id, name, category, plan, approved) values (adm, 'Comercio del equipo', 'Café', 'paso_firme', true) returning * into bz;
  perform tt.as_admin();
  perform tt.t_eq('un admin puede crear un comercio directo con plan paso_firme', bz.plan::text, 'paso_firme');
  perform tt.t_eq('... y aprobado', bz.approved, true);
  perform tt.as_client(adm);
  update businesses set account_kind = 'events_only' where id = bz.id;
  perform tt.as_admin();
  perform tt.t_eq('un admin sí puede cambiar account_kind', (select account_kind from businesses where id = bz.id), 'events_only');
  perform tt.as_client(adm);
  perform grant_founder(bz.id);
  perform tt.as_admin();
  perform tt.t_eq('grant_founder (admin) sigue funcionando', founder_slots_used(), 1);
  perform tt.t_as(null);
  insert into businesses (name, category, plan) values ('Seed por SQL Editor', 'Café', 'paso_firme') returning * into bz;
  perform tt.t_eq('seed sin sesión (SQL Editor / service_role) conserva el plan que se le pone', bz.plan::text, 'paso_firme');
end $$;

rollback;
