-- 0078 — Premio "con reserva": el comercio marca que hay que reservar o coordinar por WhatsApp antes de ir,
-- y puede dejar una nota corta (ej. "Reservar con 24 h de anticipación").
-- Solo informa: no cambia el canje, los Puntos ni los cupos. Idempotente. Se revierte borrando las dos columnas.
alter table benefits add column if not exists requires_booking boolean not null default false;
alter table benefits add column if not exists booking_note text check (booking_note is null or char_length(booking_note) <= 120);
alter table benefits drop constraint if exists benefits_booking_note_needs_flag;
alter table benefits add constraint benefits_booking_note_needs_flag check (requires_booking or booking_note is null);
