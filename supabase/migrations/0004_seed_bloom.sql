-- Único comercio real cargado por ahora (el resto de la propuesta comercial
-- todavía no tiene dueños reales dados de alta — se suman después desde el
-- panel de comercios).
--
-- OJO: lat/lng son una aproximación al centro de Tarija, NO la ubicación
-- geocodificada real de "Ramón Rojas entre Madrid e Ingavi". Corregir con las
-- coordenadas exactas (tirar un pin en Google Maps y pasar lat/lng) antes de
-- confiar en la distancia mostrada en la app.
insert into businesses (id, owner_user_id, name, category, description, address, instagram, hours_text, lat, lng, plan)
values (
  'a3f1c9b0-0000-4000-8000-000000000001',
  null,
  'Bloom',
  'Belleza',
  'Salón de belleza integral desde 1981. Hair · Makeup · Nails. Ramón Rojas entre Madrid e Ingavi, Tarija.',
  'Ramón Rojas entre Madrid e Ingavi, Tarija',
  '@bloom_bellezaintegral',
  '09:00 – 19:00',
  -21.5355,
  -64.7296,
  'primer_paso'
)
on conflict (id) do nothing;

-- Plan Primer Paso: un solo beneficio activo, 100% gratis (ver trigger
-- benefits_plan_rules). El segundo queda cargado pero inactivo, listo para
-- activarlo el día que Bloom pase a Paso Firme.
insert into benefits (business_id, name, type, cost_points, daily_quota, active, valid_from, valid_to, valid_days_mask)
values (
  'a3f1c9b0-0000-4000-8000-000000000001',
  'Manicura semipermanente',
  'gratis',
  12,
  3,
  true,
  '09:00',
  '18:00',
  62 -- martes(1) a sábado(5): bits 1..5 → 2+4+8+16+32
)
on conflict do nothing;

insert into benefits (business_id, name, type, cost_points, daily_quota, active, valid_from, valid_to, valid_days_mask)
values (
  'a3f1c9b0-0000-4000-8000-000000000001',
  'Tratamiento capilar',
  'gratis',
  18,
  3,
  false,
  '09:00',
  '17:00',
  62
)
on conflict do nothing;
