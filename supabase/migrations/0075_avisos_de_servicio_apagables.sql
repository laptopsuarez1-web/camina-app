-- Interruptor de "Notificaciones de servicio" (canjes y Puntos por vencer) en Perfil > Permisos > Notificaciones.
-- Solo corta el push: el aviso sigue apareciendo en la bandeja de Avisos.
alter table profiles add column if not exists push_servicio boolean not null default true;
