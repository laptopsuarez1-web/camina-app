-- Las funciones del panel de admin no se pueden ejecutar sin sesión.
-- Ya revisaban is_admin() por dentro (sin sesión no hacían nada), pero al crearlas en 0069 quedaron abiertas para
-- "public" (y por eso para anon). Ahora solo las puede llamar alguien con sesión; adentro se sigue exigiendo ser admin.
revoke execute on function admin_set_business_paused(uuid, boolean, text) from public, anon;
revoke execute on function admin_list_users(text, integer) from public, anon;
grant execute on function admin_set_business_paused(uuid, boolean, text) to authenticated;
grant execute on function admin_list_users(text, integer) to authenticated;
