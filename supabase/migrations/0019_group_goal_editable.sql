-- La meta semanal del grupo la puede cambiar quien creó el grupo.
alter table groups alter column challenge_target set default 42000;

-- Los grupos existentes seguían mostrando "42.000 pasos por integrante"; se
-- fija ese valor para que la meta no cambie de golpe.
update groups g
set challenge_target = 42000 * greatest(1, (select count(*) from group_members m where m.group_id = g.id))
where g.challenge_target = 200000;

create policy "groups: creator updates" on groups for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by and challenge_target between 5000 and 5000000);
