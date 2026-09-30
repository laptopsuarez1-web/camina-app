import { OpenInApp } from '@/components/OpenInApp';

export default async function JoinGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <OpenInApp
      path="join-group"
      id={id}
      title="Te invitaron a un grupo"
      text="Sumate al grupo en Camina y caminen juntos para ganar Puntos."
    />
  );
}
