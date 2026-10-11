-- El admin puede rechazar un comercio poniendo el motivo: el dueño lo ve en su panel, corrige y lo
-- vuelve a enviar. Un comercio con rejected_at sigue sin aprobar (approved = false) y no aparece en la app.
alter table businesses add column if not exists rejection_reason text;
alter table businesses add column if not exists rejected_at timestamptz;
