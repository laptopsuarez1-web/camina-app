-- Lista de espera de la portada (caminaapp.com): "Avísame cuando salga".
-- Solo guarda el correo (y la ciudad si la persona la elige). Cualquiera puede anotarse; nadie puede leer la
-- lista desde la web: se consulta desde el panel de Supabase.
create table if not exists avisame (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ciudad text,
  origen text not null default 'web',
  created_at timestamptz not null default now(),
  constraint avisame_email_valido check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  constraint avisame_ciudad_corta check (ciudad is null or char_length(ciudad) <= 40)
);

-- Un correo se anota una sola vez (sin importar mayúsculas).
create unique index if not exists avisame_email_unico on avisame (lower(email));

alter table avisame enable row level security;

-- Anotarse: permitido para cualquiera. Leer, cambiar o borrar: nadie desde el cliente.
drop policy if exists "avisame: cualquiera se anota" on avisame;
create policy "avisame: cualquiera se anota" on avisame for insert to anon, authenticated with check (true);
