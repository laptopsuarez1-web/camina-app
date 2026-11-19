-- Lista de espera de la portada (caminaapp.com): "Avísame cuando salga".
-- La persona elige cómo quiere el aviso: por WhatsApp (número) o por correo. La ciudad es opcional.
-- Cualquiera puede anotarse; nadie puede leer la lista desde la web: se consulta desde el panel de Supabase.
create table if not exists avisame (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('whatsapp', 'email')),
  contacto text not null,
  ciudad text,
  origen text not null default 'web',
  created_at timestamptz not null default now(),
  constraint avisame_contacto_valido check (
    (canal = 'email' and contacto ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contacto) <= 254)
    or (canal = 'whatsapp' and contacto ~ '^\+?[0-9]{8,15}$')
  ),
  constraint avisame_ciudad_corta check (ciudad is null or char_length(ciudad) <= 40)
);

-- Cada contacto se anota una sola vez (sin importar mayúsculas).
create unique index if not exists avisame_contacto_unico on avisame (canal, lower(contacto));

alter table avisame enable row level security;

-- Anotarse: permitido para cualquiera. Leer, cambiar o borrar: nadie desde el cliente.
drop policy if exists "avisame: cualquiera se anota" on avisame;
create policy "avisame: cualquiera se anota" on avisame for insert to anon, authenticated with check (true);
