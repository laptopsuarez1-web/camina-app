-- Auditoría (9 nov 2026): permisos de sobra en tablas de puntos y canjes.
-- Estas tablas solo se escriben desde funciones del servidor (security definer), nunca desde la app.
-- Decisión de Marcos (10 nov): las insignias y los ganadores de promociones siguen visibles (transparencia);
-- las fotos de la Ruta ya son solo del dueño (política "own" + carpeta privada), no se tocan.
-- Cómo se revierte: grant select, insert, update, delete on points_ledger, redemptions, promotion_winners to authenticated.
revoke all on points_ledger, redemptions, promotion_winners from anon;
revoke insert, update, delete, truncate, references, trigger on points_ledger, redemptions, promotion_winners from authenticated;
