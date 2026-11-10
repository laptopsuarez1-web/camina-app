-- Verificación de correo del panel de comercios. El comercio entra directo al registrarse y verifica el correo después.
-- Las filas las crea y las marca la función panel-email (con la llave de servicio); nadie las lee ni las toca desde afuera.
create table if not exists public.panel_email_verifications (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists panel_email_verifications_user_idx on public.panel_email_verifications (user_id);
alter table public.panel_email_verifications enable row level security;
revoke all on public.panel_email_verifications from anon, authenticated;

-- ¿El correo de esta cuenta está verificado? Las cuentas que ya confirmaron el correo por el camino de siempre
-- (sin filas acá) cuentan como verificadas; las que entraron directo quedan sin verificar hasta abrir el link.
create or replace function public.my_email_verified()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select case
    when not exists (
      select 1 from public.panel_email_verifications v
      join auth.users u on u.id = v.user_id and lower(u.email) = lower(v.email)
      where v.user_id = auth.uid()
    ) then true
    else exists (
      select 1 from public.panel_email_verifications v
      join auth.users u on u.id = v.user_id and lower(u.email) = lower(v.email)
      where v.user_id = auth.uid() and v.verified_at is not null
    )
  end;
$$;
revoke all on function public.my_email_verified() from public, anon;
grant execute on function public.my_email_verified() to authenticated;
