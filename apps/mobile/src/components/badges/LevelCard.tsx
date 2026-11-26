import { useState } from 'react';
import { View } from 'react-native';
import { Press } from '@/components/ui/Press';
import { BadgeSheet } from './BadgeSheet';
import { Text } from '@/components/ui/Text';
import { Glass } from '@/components/ui/Glass';
import { LocalBadge } from './LocalBadge';
import { ChevronRight } from '@/components/icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { levelLabel, nextLevel, useMyLevel } from '@/hooks/useBadges';

// En la ficha del local, justo antes de Premios: una fila fina con tu nivel ahí y cuánto te falta.
// Al tocarla se abre el detalle de cómo sumaste. Si todavía no canjeaste, explica cómo empezar.
export function LevelCard({ businessId, name, logoUrl }: { businessId: string; name: string; logoUrl: string | null }) {
  const { data } = useMyLevel(businessId);
  const [open, setOpen] = useState(false);
  const { muted } = useThemeColors();
  if (!data) return null;
  const next = nextLevel(data.points);
  const pct = next ? Math.min(100, Math.round((data.points / next.target) * 100)) : 100;
  return (
    <>
      <Press
        accessibilityRole="button"
        accessibilityHint="Ver cómo sumaste"
        disabled={!data.level}
        onPress={() => setOpen(true)}
        feedback="none"
      >
        <Glass className="rounded-2xl mt-6 flex-row items-center" style={{ gap: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
          <LocalBadge logoUrl={logoUrl} name={name} level={data.level} size={40} label={false} />
          <View className="flex-1">
            {data.level ? (
              <>
                <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
                  <Text className="font-bold text-[14px] text-text-light dark:text-text-dark">{levelLabel(data.level)}</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark shrink" numberOfLines={1}>
                    {next ? `${data.points} de ${next.target} para ${next.label}` : '¡Nivel más alto!'}
                  </Text>
                </View>
                <View className="h-1.5 rounded-full mt-1.5 overflow-hidden bg-line-light dark:bg-line-dark">
                  <View className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: '#62F0B6' }} />
                </View>
              </>
            ) : (
              <>
                <Text className="font-bold text-[14px] text-text-light dark:text-text-dark">Gana tu insignia de este local</Text>
                <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">Con tu primer canje eres Visitante.</Text>
              </>
            )}
          </View>
          {data.level ? <ChevronRight size={15} color={muted} /> : null}
        </Glass>
      </Press>
      {open && data.level ? (
        <BadgeSheet own onClose={() => setOpen(false)} badge={{ business_id: businessId, name, logo_url: logoUrl, category: null, points: data.points, level: data.level }} />
      ) : null}
    </>
  );
}
