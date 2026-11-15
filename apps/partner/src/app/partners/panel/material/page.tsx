'use client';

import { PartnerShell } from '@/components/PartnerShell';
import { MaterialPartner } from '@/components/MaterialPartner';

export default function MaterialPage() {
  return <PartnerShell>{() => <MaterialPartner />}</PartnerShell>;
}
