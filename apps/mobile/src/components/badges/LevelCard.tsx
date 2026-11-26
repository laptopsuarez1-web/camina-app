import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Press } from '@/components/ui/Press';
import { BadgeSheet } from './BadgeSheet';
import { Text } from '@/components/ui/Text';
import { Glass } from '@/components/ui/Glass';
import { LEVEL_LOOK, LocalBadge } from './LocalBadge';
import { ChevronRight } from '@/components/icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { levelLabel, nextLevel, useMyLevel } from '@/hooks/useBadges';

// En la ficha del local, justo antes de Premios: tu insignia ahí y cuántos puntos de nivel te faltan.
// Al tocarla se abre el detalle con cómo sumaste y cómo se suma. Si todavía no canjeaste, explica cómo empezar.
// Se dice "puntos de nivel" (no "puntos" solos) para no confundir con los Puntos que se ganan caminando.
export function LevelCard({ businessId, name, logoUrl }: { businessId: string; name: string; logoUrl: string | null }) {
  const { data } = useMyLevel(businessId);
  const [open, setOpen] = useState(false);
  const { muted } = useThemeColors();
  if (!data) return null;
  const next = nextLevel(data.points);
  const pct = next ? Math.min(100, Math.round((data.points / next.target) * 100)) : 100;
  const look = data.level ? LEVEL_LOOK[data.level] : null;
  return (
    <>
      <Press accessibilityRole="button" accessibilityHint="Ver cómo sumaste" disabled={!data.level} onPress={() => setOpen(true)} feedback="none">
        <Glass className="rounded-3xl mt-6 overflow-hidden" style={look ? { borderColor: `${look.ring[1]}55` } : undefined}>
          {look ? (
            <LinearGradient
              pointerEvents="none"
              colors={[`${look.ring[1]}38`, `${look.ring[1]}00`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 0.6 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View className="flex-row items-center" style={{ gap: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
            <LocalBadge logoUrl={logoUrl} name={name} level={data.level} size={48} label={!!data.level} />
            <View className="flex-1">
              {data.level ? (
                <>
                  <Text className="font-extrabold text-[15px] text-text-light dark:text-text-dark">Eres {levelLabel(data.level)}</Text>
                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">
                    {next ? `${data.points} de ${next.target} puntos de nivel para ${next.label}` : '¡Llegaste al nivel más alto!'}
                  </Text>
                  <View className="rounded-full mt-2 bg-line-light dark:bg-line-dark" style={{ height: 6 }}>
                    <View className="rounded-full" style={{ height: 6, width: `${pct}%`, backgroundColor: '#62F0B6' }} />
                  </View>
                </>
              ) : (
                <>
                  <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">Gana tu insignia de este local</Text>
                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">Con tu primer canje eres Visitante.</Text>
                </>
              )}
            </View>
            {data.level ? <ChevronRight size={14} color={muted} /> : null}
          </View>
        </Glass>
      </Press>
      {open && data.level ? (
        <BadgeSheet own onClose={() => setOpen(false)} badge={{ business_id: businessId, name, logo_url: logoUrl, category: null, points: data.points, level: data.level }} />
      ) : null}
    </>
  );
}
