import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { Press } from '@/components/ui/Press';
import { BadgeSheet } from './BadgeSheet';
import { Text } from '@/components/ui/Text';
import { Glass } from '@/components/ui/Glass';
import { LEVEL_LOOK, LocalBadge } from './LocalBadge';
import { ChevronRight } from '@/components/icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { LEVELS, levelLabel, nextLevel, useMyLevel } from '@/hooks/useBadges';

// En la ficha del local, justo antes de Premios: una fila fina con tu insignia ahí, cuánto falta y el camino Visitante → Habitual → Fan.
// Al tocarla se abre el detalle de cómo sumaste. Si todavía no canjeaste, explica cómo empezar.
export function LevelCard({ businessId, name, logoUrl }: { businessId: string; name: string; logoUrl: string | null }) {
  const { data } = useMyLevel(businessId);
  const [open, setOpen] = useState(false);
  const { muted } = useThemeColors();
  const isDark = useColorScheme().colorScheme === 'dark';
  if (!data) return null;
  const next = nextLevel(data.points);
  const look = data.level ? LEVEL_LOOK[data.level] : null;
  // Avance en el camino de niveles: Visitante (1) en 0 %, Habitual (10) en 50 %, Fan (20) en 100 %.
  const p = data.points;
  const track = p >= 20 ? 100 : p >= 10 ? 50 + ((p - 10) / 10) * 50 : Math.max(0, ((p - 1) / 9) * 50);
  return (
    <>
      <Press
        accessibilityRole="button"
        accessibilityHint="Ver cómo sumaste"
        disabled={!data.level}
        onPress={() => setOpen(true)}
        feedback="none"
      >
        <Glass className="rounded-2xl mt-6 overflow-hidden" style={look ? { borderColor: `${look.ring[1]}55` } : undefined}>
          {look ? (
            <LinearGradient
              pointerEvents="none"
              colors={[`${look.ring[1]}33`, `${look.ring[1]}00`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View className="flex-row items-center" style={{ gap: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
            <LocalBadge logoUrl={logoUrl} name={name} level={data.level} size={40} label={false} />
            <View className="flex-1">
              {data.level && look ? (
                <>
                  <View className="flex-row items-baseline justify-between" style={{ gap: 8 }}>
                    <Text className="font-extrabold text-[14.5px]" style={{ color: isDark ? '#C9ADF5' : '#8149C2' }}>{levelLabel(data.level)}</Text>
                    <Text className="text-[12px] text-muted-light dark:text-muted-dark shrink" numberOfLines={1}>
                      {next ? (
                        <>
                          Faltan <Text className="font-extrabold text-aqua-ink dark:text-aqua">{next.missing}</Text> para {next.label}
                        </>
                      ) : (
                        'Nivel más alto'
                      )}
                    </Text>
                  </View>
                  {/* Camino de niveles: Visitante → Habitual → Fan, con el avance en menta. */}
                  <View style={{ marginTop: 7, height: 10, justifyContent: 'center' }}>
                    <View className="rounded-full bg-line-light dark:bg-line-dark" style={{ height: 4 }}>
                      <View className="rounded-full" style={{ height: 4, width: `${track}%`, backgroundColor: '#62F0B6' }} />
                    </View>
                    {LEVELS.map((l, i) => (
                      <View
                        key={l.key}
                        style={{
                          position: 'absolute', left: `${i * 50}%`, marginLeft: i === 0 ? 0 : i === 2 ? -10 : -5,
                          width: 10, height: 10, borderRadius: 5, borderWidth: 2,
                          borderColor: isDark ? '#221933' : '#FFFFFF',
                          backgroundColor: data.points >= l.from ? LEVEL_LOOK[l.key].ring[1] : isDark ? '#3A2C52' : '#E1D2F5',
                        }}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text className="font-bold text-[14px] text-text-light dark:text-text-dark">Gana tu insignia de este local</Text>
                  <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">Con tu primer canje eres Visitante.</Text>
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
