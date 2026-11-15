'use client';

import { PartnerShell } from '@/components/PartnerShell';
import { GuiaPartner } from '@/components/GuiaPartner';

export default function GuiaPage() {
  return <PartnerShell>{() => <GuiaPartner />}</PartnerShell>;
}
