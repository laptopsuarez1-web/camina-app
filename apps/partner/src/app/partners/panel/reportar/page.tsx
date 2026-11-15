'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PartnerShell } from '@/components/PartnerShell';
import { CargarLocal } from '@/components/CargarLocal';
import type { Partner, PartnerLead } from '@/lib/partners';

function Contenido({ partner }: { partner: Partner }) {
  const id = useSearchParams().get('id');
  const [lead, setLead] = useState<PartnerLead | null | undefined>(id ? undefined : null);

  useEffect(() => {
    if (!id) return;
    supabase.from('partner_leads').select('*').eq('id', id).eq('partner_id', partner.id).maybeSingle()
      .then(({ data }) => setLead((data as PartnerLead) ?? null));
  }, [id, partner.id]);

  if (lead === undefined) return <p className="text-muted text-[13.5px]">Cargando…</p>;
  return <CargarLocal key={lead?.id ?? 'nuevo'} partner={partner} lead={lead} />;
}

export default function ReportarPage() {
  return (
    <PartnerShell>
      {(p) => (
        <Suspense fallback={<p className="text-muted text-[13.5px]">Cargando…</p>}>
          <Contenido partner={p} />
        </Suspense>
      )}
    </PartnerShell>
  );
}
