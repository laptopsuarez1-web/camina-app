-- 0099: portada del grupo. Solo quien creó el grupo la pone o la saca; tiene que ser una dirección https.
begin;

do $$
declare
  owner uuid; other uuid; g uuid; n int;
begin
  owner := tt.mk_user(); other := tt.mk_user();
  insert into groups (name, created_by) values ('Grupo con portada', owner) returning id into g;
  insert into group_members (group_id, user_id) values (g, owner), (g, other) on conflict do nothing;

  perform tt.as_client(owner);
  update groups set banner_url = 'https://x.supabase.co/storage/v1/object/public/group-photos/' || g || '/portada.jpg' where id = g;
  perform tt.as_admin();
  perform tt.t_true('quien creó el grupo pone la portada', (select banner_url is not null from groups where id = g));

  perform tt.as_client(other);
  update groups set banner_url = null where id = g;
  get diagnostics n = row_count;
  perform tt.as_admin();
  perform tt.t_eq('otro miembro no la puede cambiar', n, 0);

  perform tt.t_raises('no acepta direcciones que no sean https',
    format('update groups set banner_url = %L where id = %L', 'javascript:alert(1)', g), 'groups_banner_url_check');

  perform tt.as_client(owner);
  update groups set banner_url = null where id = g;
  perform tt.as_admin();
  perform tt.t_true('la puede sacar (queda el color del grupo)', (select banner_url is null from groups where id = g));
end $$;

rollback;
