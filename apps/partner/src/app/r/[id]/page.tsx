import { OpenInApp } from '@/components/OpenInApp';

export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <OpenInApp
      path="r"
      id={id}
      title="Te invitaron a Camina"
      text="Caminá, ganá Puntos y canjealos por beneficios en comercios de tu ciudad."
    />
  );
}
