-- Horario semanal del comercio: {"0": {"from":"09:00","to":"19:00"}, ..., "6": null}
-- (0 = lunes ... 6 = domingo; null = cerrado). hours_text queda como resumen legible.
alter table businesses add column if not exists opening_hours jsonb;
