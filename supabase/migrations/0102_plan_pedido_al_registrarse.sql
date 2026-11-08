-- Qué eligió el comercio al registrarse: el cupo fundador, el plan gratis o un plan de pago (que paga con el QR y manda
-- el comprobante por WhatsApp). Es solo lo que pidió: el plan real lo sigue activando el equipo de Camina al aprobar.
alter table businesses add column if not exists requested_plan text;
alter table businesses drop constraint if exists businesses_requested_plan_check;
alter table businesses add constraint businesses_requested_plan_check
  check (requested_plan is null or requested_plan in ('fundador', 'primer_paso', 'paso_firme', 'paso_adelante'));
