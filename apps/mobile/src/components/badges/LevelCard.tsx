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

// En la ficha del local, justo antes de Premios: tu insignia ahí, el camino Visitante → Habitual → Fan y cómo se suma.
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
          <View className="flex-row items-center" style={{ gap: 14, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 14 }}>
            <LocalBadge logoUrl={logoUrl} name={name} level={data.level} size={52} label={!!data.level} />
            <View className="flex-1">
              {data.level && look ? (
                <>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-bold uppercase text-muted-light dark:text-muted-dark" style={{ letterSpacing: 0.8 }}>Tu insignia aquí</Text>
                    <ChevronRight size={14} color={muted} />
                  </View>
                  <Text className="font-extrabold text-[16px] text-text-light dark:text-text-dark" style={{ marginTop: 2 }}>
                    {next ? (
                      <>
                        Te faltan <Text className="text-aqua-ink dark:text-aqua">{next.missing} {next.missing === 1 ? 'punto' : 'puntos'}</Text> para {next.label}
                      </>
                    ) : (
                      '¡Llegaste al nivel más alto!'
                    )}
                  </Text>
                  {/* Camino de niveles: Visitante → Habitual → Fan, con el avance en menta. */}
                  <View style={{ marginTop: 10, height: 12, justifyContent: 'center' }}>
                    <View className="rounded-full bg-line-light dark:bg-line-dark" style={{ height: 5 }}>
                      <View className="rounded-full" style={{ height: 5, width: `${track}%`, backgroundColor: '#62F0B6' }} />
                    </View>
                    {LEVELS.map((l, i) => {
                      const reached = data.points >= l.from;
                      return (
                        <View
                          key={l.key}
                          style={{
                            position: 'absolute', left: `${i * 50}%`, marginLeft: i === 0 ? 0 : i === 2 ? -12 : -6,
                            width: 12, height: 12, borderRadius: 6, borderWidth: 2,
                            borderColor: isDark ? '#221933' : '#FFFFFF',
                            backgroundColor: reached ? LEVEL_LOOK[l.key].ring[1] : isDark ? '#3A2C52' : '#E1D2F5',
                          }}
                        />
                      );
                    })}
                  </View>
                  <View className="flex-row justify-between" style={{ marginTop: 4 }}>
                    {LEVELS.map((l) => (
                      <Text
                        key={l.key}
                        className="text-[10.5px]"
                        style={{ fontWeight: l.key === data.level ? '800' : '500', color: l.key === data.level ? (isDark ? '#C9ADF5' : '#8149C2') : muted }}
                      >
                        {l.label}
                      </Text>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text className="font-bold text-[15px] text-text-light dark:text-text-dark">Gana tu insignia de este local</Text>
                  <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">Con tu primer canje eres Visitante.</Text>
                </>
              )}
            </View>
          </View>
          <View className="flex-row justify-center border-t border-line-light dark:border-line-dark" style={{ gap: 14, paddingVertical: 8 }}>
            {[['Canje', '+2'], ['Calificar', '+1'], ['Historia', '+1']].map(([k, v]) => (
              <Text key={k} className="text-[11.5px] text-muted-light dark:text-muted-dark">
                {k} <Text className="font-extrabold text-aqua-ink dark:text-aqua">{v}</Text>
              </Text>
            ))}
          </View>
        </Glass>
      </Press>
      {open && data.level ? (
        <BadgeSheet own onClose={() => setOpen(false)} badge={{ business_id: businessId, name, logo_url: logoUrl, category: null, points: data.points, level: data.level }} />
      ) : null}
    </>
  );
}
