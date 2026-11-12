import { useState } from 'react';
import { View } from 'react-native';
import { Press } from '@/components/ui/Press';
import { BadgeSheet } from './BadgeSheet';
import { Text } from '@/components/ui/Text';
import { Glass } from '@/components/ui/Glass';
import { LocalBadge } from './LocalBadge';
import { levelLabel, nextLevel, useMyLevel } from '@/hooks/useBadges';

// En la ficha del local: tu nivel ahí y cuánto te falta. Si todavía no canjeaste, explica cómo empezar.
export function LevelCard({ businessId, name, logoUrl }: { businessId: string; name: string; logoUrl: string | null }) {
  const { data } = useMyLevel(businessId);
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const next = nextLevel(data.points);
  const pct = next ? Math.min(100, Math.round((data.points / next.target) * 100)) : 100;
  return (
    <>
    <Press accessibilityRole="button" accessibilityHint="Ver cómo sumaste" disabled={!data.level} onPress={() => setOpen(true)} feedback="none">
    <Glass className="rounded-3xl p-4 mt-4">
      <View className="flex-row items-center" style={{ gap: 14 }}>
        <LocalBadge logoUrl={logoUrl} name={name} level={data.level} size={54} label={!!data.level} />
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">
            {data.level ? `Eres ${levelLabel(data.level)}` : 'Gana tu insignia de este local'}
          </Text>
          <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">
            {!data.level ? 'Con tu primer canje eres Visitante.' : next ? `${data.points} de ${next.target} puntos de nivel para ${next.label}` : '¡Llegaste al nivel más alto!'}
          </Text>
          {!!data.level && (
            <View className="h-2 rounded-full mt-2 overflow-hidden bg-line-light dark:bg-line-dark">
              <View className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: '#62F0B6' }} />
            </View>
          )}
        </View>
      </View>
      <Text className="text-[11.5px] text-muted-light dark:text-muted-dark mt-3 text-center">
        {data.level ? 'Toca para ver cómo sumaste · ' : ''}Canje +2 · Calificar +1 · Historia +1
      </Text>
    </Glass>
    </Press>
    {open && data.level ? (
      <BadgeSheet own onClose={() => setOpen(false)} badge={{ business_id: businessId, name, logo_url: logoUrl, category: null, points: data.points, level: data.level }} />
    ) : null}
    </>
  );
}
