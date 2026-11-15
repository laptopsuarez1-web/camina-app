import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Text } from '@/components/ui/Text';
import { CrownMark } from '@/components/CrownMark';
import { plural } from '@/lib/format';

// Leyenda del local (como el «Local Legend» de Strava): quien más lo visitó este mes. Migración 0121.
// Si el servidor todavía no la tiene, o nadie lo visitó este mes, no se muestra nada.
type Legend = { month: string; visits: number; name: string | null; is_me: boolean; my_visits: number };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function useBusinessLegend(businessId: string | undefined) {
  return useQuery({
    queryKey: ['business-legend', businessId],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async (): Promise<Legend | null> => {
      const { data, error } = await supabase.rpc('business_legend', { p_business: businessId! });
      if (error || !data) return null;
      return data as unknown as Legend;
    },
  });
}

export function LegendCard({ businessId }: { businessId: string }) {
  const { data } = useBusinessLegend(businessId);
  if (!data || !data.name || data.visits <= 0) return null;
  const mes = MESES[Number(data.month.slice(5, 7)) - 1] ?? '';
  const missing = data.visits - data.my_visits + 1;
  return (
    <LegendBox
      className="mt-3"
      title={`Leyenda de ${mes}`}
      line={`${data.is_me ? '¡Eres tú!' : data.name} · ${data.visits} ${plural(data.visits, 'visita', 'visitas')}`}
      sub={
        data.is_me
          ? 'Eres quien más visitó este local este mes.'
          : data.my_visits > 0
            ? `Llevas ${data.my_visits}. Con ${missing} ${plural(missing, 'visita', 'visitas')} más le quitas el puesto.`
            : 'Quien más visita el local en el mes se queda con la corona.'
      }
    />
  );
}

// Tarjeta dorada de «Leyenda» (la usan la ficha del local y Actividad).
export function LegendBox({ title, line, sub, className }: { title: string; line: string; sub: string; className?: string }) {
  return (
    <View className={`${className ?? ''} rounded-2xl px-3.5 py-3 flex-row items-center`} style={{ gap: 12, backgroundColor: 'rgba(245,198,69,0.12)', borderWidth: 1, borderColor: 'rgba(245,198,69,0.4)' }}>
      <CrownMark size={34} />
      <View className="flex-1">
        <Text className="text-[11px] font-extrabold uppercase" style={{ color: '#E0B43A', letterSpacing: 1.2 }}>{title}</Text>
        <Text className="text-[14.5px] font-extrabold text-text-light dark:text-text-dark">{line}</Text>
        <Text className="text-[12px] text-muted-light dark:text-muted-dark">{sub}</Text>
      </View>
    </View>
  );
}

// Leyenda del mes caminando: solo la ve quien más pasos lleva este mes entre todos. Migración 0124.
export function WalkingLegendCard() {
  const { data } = useQuery({
    queryKey: ['walking-legend'],
    staleTime: 60_000,
    queryFn: async (): Promise<{ month: string; steps: number; is_me: boolean } | null> => {
      const { data, error } = await supabase.rpc('walking_legend' as never);
      if (error || !data) return null;
      return data as unknown as { month: string; steps: number; is_me: boolean };
    },
  });
  if (!data || !data.is_me || data.steps <= 0) return null;
  const mes = MESES[Number(data.month.slice(5, 7)) - 1] ?? '';
  return (
    <LegendBox
      className="mb-3"
      title={`Leyenda de ${mes}`}
      line={`¡Eres tú! · ${data.steps.toLocaleString('es-BO')} pasos`}
      sub="Eres quien más caminó este mes."
    />
  );
}
