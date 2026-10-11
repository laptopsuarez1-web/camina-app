-- Redes del comercio en su perfil: Facebook y TikTok (Instagram y sitio web ya existían).
alter table businesses add column if not exists facebook text;
alter table businesses add column if not exists tiktok text;
