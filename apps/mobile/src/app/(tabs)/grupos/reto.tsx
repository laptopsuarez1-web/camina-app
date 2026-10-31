import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Glass } from '@/components/ui/Glass';
import { Coin } from '@/components/ui/Coin';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { ChevronLeft, Check } from '@/components/icons';
import { useGroupDetail } from '@/hooks/useGroupDetail';
import { useGroupChallenge, useJoinChallenge, RULE_LABEL, daysLeft, type Standing, type ChallengeRule } from '@/hooks/useChallenges';
import { useAuthStore } from '@/store/useAuthStore';
import { groupGradient, groupTheme } from '@/lib/group-look';
import { friendlyServerError } from '@/lib/errors';
import { localDay, plural } from '@/lib/format';
import { colors } from '@/theme/tokens';

const RULE_HELP: Record<ChallengeRule, string> = {
  steps: 'Gana quien suma más pasos durante el desafío.',
  days: 'Gana quien cumple la meta diaria más veces.',
  streak: 'Gana quien mantiene la racha de días con meta más larga.',
};

function valueOf(rule: ChallengeRule, s: Standing) {
  return rule === 'steps' ? s.steps : rule === 'days' ? s.goal_days : s.best_streak;
}

function valueText(rule: ChallengeRule, v: number) {
  return rule === 'steps' ? `${v.toLocaleString('es-BO')} pasos` : rule === 'days' ? `${v} ${plural(v, 'día', 'días')} con meta` : `racha de ${v}`;
}

// Cómo va el reto de la semana: reglas, tiempo que queda y la tabla completa con barras.
export default function RetoScreen() {
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: group } = useGroupDetail(groupId);
  const { data: ch, isLoading } = useGroupChallenge(groupId);
  const join = useJoinChallenge(groupId);
  const active = ch?.active ?? null;
  const today = localDay();
  const theme = groupTheme(group?.group.background);
  const person = (id: string) => group?.members.find((m) => m.id === id);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/grupos'));
  const header = (
    <LinearGradient colors={groupGradient(group?.group.background)} style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top + 12, paddingBottom: 22, paddingHorizontal: 20 }}>
      <View className="flex-row items-center justify-between">
        <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={back} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
          <ChevronLeft size={18} color="#fff" />
        </Press>
        <Text accessibilityRole="header" className="text-[17px] font-bold text-white">Reto de la semana</Text>
        <View style={{ width: 36 }} />
      </View>
      {active && (
        <View className="items-center mt-4">
          <Text className="text-[20px] font-extrabold text-white text-center" numberOfLines={2}>{active.name}</Text>
          <Text className="text-[12.5px] mt-1" style={{ color: colors.authMuted }}>{RULE_LABEL[active.rule]} · meta {active.daily_goal.toLocaleString('es-BO')} por día</Text>
        </View>
      )}
    </LinearGradient>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg-light dark:bg-bg-dark">
        {header}
        <ActivityIndicator color={colors.aqua} accessibilityLabel="Cargando" style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!active) {
    return (
      <View className="flex-1 bg-bg-light dark:bg-bg-dark">
        {header}
        <Text className="text-center text-[15px] font-bold text-text-light dark:text-text-dark mt-10">No hay un reto en marcha</Text>
        <Text className="text-center text-[13px] text-muted-light dark:text-muted-dark mt-2 mx-10">Cuando alguien del grupo arme uno, acá vas a ver cómo va cada persona.</Text>
      </View>
    );
  }

  const standings = ch?.standings ?? [];
  const left = daysLeft(active.end_day);
  const total = Math.max(1, Math.round((Date.parse(active.end_day) - Date.parse(active.start_day)) / 86400000) + 1);
  const elapsed = Math.min(total, Math.max(0, total - left - (today < active.start_day ? 1 : 0)));
  const pot = active.stake * (ch?.entries ?? 0);
  const canJoin = !ch?.joined && today <= active.start_day;
  const top = Math.max(1, ...standings.map((s) => valueOf(active.rule, s)));
  const myIdx = standings.findIndex((s) => s.user_id === userId);
  const mine = myIdx >= 0 ? standings[myIdx] : null;

  let summary = '';
  if (mine) {
    if (myIdx === 0) summary = standings.length > 1 ? 'Vas 1.º. ¡Sigue así!' : 'Eres la primera persona dentro.';
    else {
      const gap = valueOf(active.rule, standings[0]) - valueOf(active.rule, mine);
      summary = `Vas ${myIdx + 1}.º. Te faltan ${valueText(active.rule, gap).replace(/^racha de /, '')} para el 1.º.`;
    }
  }

  return (
    <View className="flex-1 bg-bg-light dark:bg-bg-dark">
      <LinearGradient pointerEvents="none" colors={[theme.wash + '66', theme.wash + '22', 'transparent']} locations={[0, 0.45, 0.8]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {header}

        <Glass className="mx-5 mt-3 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">Tiempo</Text>
              <Text className="text-[18px] font-extrabold text-text-light dark:text-text-dark">
                {today < active.start_day ? 'Empieza pronto' : left === 0 ? 'Último día' : `${plural(left, 'Queda', 'Quedan')} ${left} ${plural(left, 'día', 'días')}`}
              </Text>
            </View>
            {pot > 0 && (
              <View className="items-end">
                <Text className="text-[12px] text-muted-light dark:text-muted-dark">Bote</Text>
                <View className="flex-row items-center" style={{ gap: 5 }}>
                  <Coin size={18} />
                  <Text className="text-[18px] font-extrabold text-mint-dark dark:text-mint">{pot}</Text>
                </View>
              </View>
            )}
          </View>
          <View className="flex-row mt-3" style={{ gap: 4 }} accessible accessibilityLabel={`Día ${elapsed} de ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <View key={i} className="flex-1 h-2 rounded-full" style={{ backgroundColor: i < elapsed ? theme.accent : 'rgba(150,140,180,0.25)' }} />
            ))}
          </View>
          <Text className="text-[12px] text-muted-light dark:text-muted-dark mt-2">{RULE_HELP[active.rule]}</Text>
        </Glass>

        {mine && (
          <Glass className="mx-5 mt-3 rounded-2xl px-4 py-3.5">
            <Text className="text-[14px] font-bold text-text-light dark:text-text-dark">{summary}</Text>
          </Glass>
        )}

        <Text accessibilityRole="header" className="mx-6 mt-5 mb-2 text-[15px] font-bold text-text-light dark:text-text-dark">Cómo va cada quien</Text>
        <Glass className="mx-5 rounded-2xl px-4 py-2">
          {standings.length === 0 ? (
            <Text className="text-[13px] text-muted-light dark:text-muted-dark py-3">Todavía nadie se sumó.</Text>
          ) : (
            standings.map((s, i) => {
              const p = person(s.user_id);
              const v = valueOf(active.rule, s);
              const pct = Math.min(100, (v / top) * 100);
              const me = s.user_id === userId;
              return (
                <View key={s.user_id} className="py-2.5" style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(150,140,180,0.2)' } : undefined}>
                  <View className="flex-row items-center" style={{ gap: 10 }}>
                    <Text className="w-5 text-[13px] font-extrabold text-text-light dark:text-text-dark">{i + 1}</Text>
                    <AvatarImage
                      uri={p?.photoUrl}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                      fallback={
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontWeight: '900', color: colors.mintDark, fontSize: 13 }}>{(p?.name ?? 'C')[0]?.toUpperCase()}</Text>
                        </View>
                      }
                    />
                    <View className="flex-1">
                      <Text className="text-[13.5px] font-semibold text-text-light dark:text-text-dark" numberOfLines={1}>{me ? `${p?.name ?? 'Tú'} (tú)` : p?.name ?? 'Caminante'}</Text>
                      <Text className="text-[12px] text-muted-light dark:text-muted-dark">{valueText(active.rule, v)}</Text>
                    </View>
                    {s.met_goal && (
                      <View accessible accessibilityLabel="Cumplió la meta de hoy" className="flex-row items-center rounded-full px-2 py-1" style={{ gap: 3, backgroundColor: 'rgba(79,195,168,0.18)' }}>
                        <Check size={12} color={colors.aqua} />
                        <Text importantForAccessibility="no" className="text-[11px] font-bold text-mint-dark dark:text-mint">Hoy</Text>
                      </View>
                    )}
                  </View>
                  <View className="h-2 rounded-full mt-2 bg-line-light dark:bg-line-dark overflow-hidden">
                    <View style={{ width: `${pct}%`, height: '100%', borderRadius: 999, backgroundColor: i === 0 ? colors.mint : theme.accent }} />
                  </View>
                </View>
              );
            })
          )}
        </Glass>

        {canJoin && (
          <Press
            accessibilityRole="button"
            disabled={join.isPending}
            onPress={async () => {
              try {
                await join.mutateAsync(active.id);
              } catch (e) {
                Alert.alert('No se pudo sumar', friendlyServerError(e, 'Intenta de nuevo.'));
              }
            }}
            className="bg-mint rounded-2xl py-3.5 items-center mx-5 mt-4 flex-row justify-center"
            style={{ gap: 6 }}
          >
            <Text className="text-mint-dark font-bold text-[14px]">Sumarme{active.stake > 0 ? ' · pones' : ''}</Text>
            {active.stake > 0 && (
              <>
                <Coin size={16} />
                <Text className="text-mint-dark font-extrabold text-[14px]">{active.stake}</Text>
              </>
            )}
          </Press>
        )}
        {!canJoin && !ch?.joined && <Text className="text-center text-[12px] text-muted-light dark:text-muted-dark mt-4">Ya empezó: ya no se puede sumar.</Text>}
      </ScrollView>
    </View>
  );
}
