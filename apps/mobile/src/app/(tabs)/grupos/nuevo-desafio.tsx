import { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, Image, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Trophy, Activity, Calendar, Flame, IconBubble } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { usePointsBalance } from '@/hooks/usePoints';
import { groupInviteLink } from '@/constants/sharing';
import { MIN_DAILY_GOAL } from '@/constants/business-rules';
import { colors } from '@/theme/tokens';
import { Glass } from '@/components/ui/Glass';
import type { ChallengeRule } from '@/hooks/useChallenges';

const RULES: { key: ChallengeRule; title: string; desc: string; icon: typeof Activity; tone: 'aqua' | 'gold' | 'orange' }[] = [
  { key: 'steps', title: 'Más pasos', desc: 'Gana quien suma más pasos', icon: Activity, tone: 'aqua' },
  { key: 'days', title: 'Más días', desc: 'Gana quien cumple la meta más veces', icon: Calendar, tone: 'gold' },
  { key: 'streak', title: 'Mejor racha', desc: 'Gana quien mantiene la racha más larga', icon: Flame, tone: 'orange' },
];
const STAKES = [0, 5, 10, 20, 50];

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Crear desafío en 3 pasos: nombre → regla y meta → duración y puntos en juego.
export default function NuevoDesafioScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { data: balance } = usePointsBalance();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [rule, setRule] = useState<ChallengeRule>('steps');
  const [goal, setGoal] = useState(5000);
  const [days, setDays] = useState(7);
  const [stake, setStake] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const start = new Date();
  const end = addDays(start, days - 1);
  const fmtShort = (d: Date) => d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' });

  async function create() {
    setSaving(true);
    const { error } = await supabase.rpc('create_group_challenge', {
      p_group: groupId,
      p_name: name.trim(),
      p_rule: rule,
      p_daily_goal: goal,
      p_start: fmt(start),
      p_end: fmt(end),
      p_stake: stake,
    });
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo crear el desafío', error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['group-challenge', groupId] });
    queryClient.invalidateQueries({ queryKey: ['points-balance'] });
    queryClient.invalidateQueries({ queryKey: ['points-ledger'] });
    queryClient.invalidateQueries({ queryKey: ['points-expiring-soon'] });
    setDone(true);
  }

  function back() {
    if (step > 1 && !done) setStep(step - 1);
    else router.back();
  }

  if (done) {
    return (
      <View className="flex-1 bg-bg-light dark:bg-bg-dark items-center px-8" style={{ paddingTop: 160 }}>
        <IconBubble icon={Trophy} tone="gold" size={110} />
        <Text className="text-[24px] font-extrabold text-center text-text-light dark:text-text-dark mt-6">¡{name.trim()} está en marcha!</Text>
        <Text className="text-[13px] text-center text-muted-light dark:text-muted-dark mt-2 leading-5">
          Del {fmtShort(start)} al {fmtShort(end)}. Invitá a tu grupo: quienes cumplan la meta se reparten los puntos.
        </Text>
        <View className="absolute left-5 right-5" style={{ bottom: 50 }}>
          <Pressable
            onPress={() => Share.share({ message: `Sumate a mi desafío "${name.trim()}" en Camina.\n${groupInviteLink(groupId!)}` })}
            className="bg-mint rounded-2xl py-4 items-center mb-3"
          >
            <Text className="text-mint-dark font-bold text-[15px]">Compartir link</Text>
          </Pressable>
          <Pressable onPress={() => router.replace({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId: groupId! } })} className="items-center py-2">
            <Text className="font-bold text-[14px] text-aqua-deep dark:text-aqua">Ir al grupo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const canNext = step === 1 ? name.trim().length >= 3 : true;
  const insufficient = stake > 0 && (balance ?? 0) < stake;

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg-light dark:bg-bg-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="px-5 pt-14 flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center bg-card-light dark:bg-card-dark">
          <ChevronLeft size={18} color={colors.aqua} />
        </Pressable>
        <Text className="text-[13px] font-semibold text-muted-light dark:text-muted-dark">Nuevo desafío</Text>
        <View style={{ width: 36 }} />
      </View>
      <View className="flex-row px-5 mt-4" style={{ gap: 6 }}>
        {[1, 2, 3].map((n) => (
          <View key={n} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: n <= step ? colors.aqua : 'rgba(124,106,156,0.25)' }} />
        ))}
      </View>

      <View className="flex-1 px-5 pt-8">
        {step === 1 && (
          <>
            <Text className="text-[20px] font-extrabold text-center text-text-light dark:text-text-dark">¿Cómo se llama el desafío?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={30}
              autoFocus
              placeholder="Ej: Semana de fuego"
              placeholderTextColor={colors.light.muted}
              className="text-center text-[30px] font-extrabold text-text-light dark:text-text-dark mt-16"
            />
            <Text className="text-center text-[12px] text-muted-light dark:text-muted-dark mt-2">{name.length} de 30 letras</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text className="text-[20px] font-extrabold text-text-light dark:text-text-dark mb-3">Elegí la regla</Text>
            {RULES.map((r) => (
              <Pressable key={r.key} onPress={() => setRule(r.key)}>
                <Glass className="rounded-2xl p-3.5 mb-2.5 flex-row items-center" style={{ gap: 12, borderColor: rule === r.key ? colors.aqua : undefined, borderWidth: rule === r.key ? 2 : 1 }}>
                  <IconBubble icon={r.icon} tone={r.tone} size={42} />
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-text-light dark:text-text-dark">{r.title}</Text>
                    <Text className="text-[12px] text-muted-light dark:text-muted-dark">{r.desc}</Text>
                  </View>
                </Glass>
              </Pressable>
            ))}
            <Text className="text-[16px] font-extrabold text-text-light dark:text-text-dark mt-4 mb-2">Meta diaria por persona</Text>
            <View className="flex-row items-center justify-center" style={{ gap: 20 }}>
              <Pressable onPress={() => setGoal(Math.max(MIN_DAILY_GOAL, goal - 500))} className="w-11 h-11 rounded-full items-center justify-center bg-card-light dark:bg-card-dark">
                <Text className="text-[22px] font-bold text-text-light dark:text-text-dark">−</Text>
              </Pressable>
              <Text className="text-[34px] font-extrabold text-text-light dark:text-text-dark">{goal.toLocaleString('es-BO')}</Text>
              <Pressable onPress={() => setGoal(Math.min(30000, goal + 500))} className="w-11 h-11 rounded-full items-center justify-center bg-card-light dark:bg-card-dark">
                <Text className="text-[22px] font-bold text-text-light dark:text-text-dark">+</Text>
              </Pressable>
            </View>
            <Text className="text-center text-[12px] text-muted-light dark:text-muted-dark mt-1">mínimo {MIN_DAILY_GOAL.toLocaleString('es-BO')} pasos</Text>
          </>
        )}

        {step === 3 && (
          <>
            <Text className="text-[20px] font-extrabold text-text-light dark:text-text-dark mb-3">Duración</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {[3, 7, 10, 14].map((d) => (
                <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: days === d }} onPress={() => setDays(d)} className="rounded-full px-4 py-2.5" style={{ backgroundColor: days === d ? colors.aquaDeep : 'rgba(124,106,156,0.14)' }}>
                  <Text style={{ fontWeight: '800', color: days === d ? '#fff' : colors.light.muted }}>{d} días</Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-3">Empieza hoy ({fmtShort(start)}) y termina el {fmtShort(end)}.</Text>

            <Text className="text-[16px] font-extrabold text-text-light dark:text-text-dark mt-5">Puntos en juego</Text>
            <View className="flex-row items-center mt-0.5 mb-3" style={{ gap: 6 }}>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">Cada persona pone de sus propios puntos · tenés</Text>
              <Image source={require('@/../assets/camina-coin.png')} style={{ width: 14, height: 14, borderRadius: 7 }} />
              <Text className="text-[12px] font-bold text-text-light dark:text-text-dark">{balance ?? 0}</Text>
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {STAKES.map((v) => (
                <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: stake === v }} onPress={() => setStake(v)} className="rounded-full px-5 py-2.5 flex-row items-center" style={{ gap: 5, backgroundColor: stake === v ? colors.aquaDeep : 'rgba(124,106,156,0.14)' }}>
                  {v > 0 && <Image source={require('@/../assets/camina-coin.png')} style={{ width: 14, height: 14, borderRadius: 7 }} />}
                  <Text style={{ fontWeight: '800', color: stake === v ? '#fff' : colors.light.muted }}>{v}</Text>
                </Pressable>
              ))}
            </View>
            {insufficient && <Text className="text-[12px] mt-2" style={{ color: '#E5484D' }}>No te alcanzan los puntos para poner {stake}.</Text>}
            <Glass className="rounded-2xl p-3.5 mt-4">
              <Text className="text-[12.5px] font-bold text-text-light dark:text-text-dark">Cómo se reparte</Text>
              <Text className="text-[12px] leading-[17px] text-muted-light dark:text-muted-dark mt-1">
                Los puntos de todos forman un pozo. Lo reparten en partes iguales quienes cumplan la meta diaria en al menos el 80% de los días. Si nadie cumple, cada uno recupera los suyos. Camina no se queda con nada. Los puntos no se compran: solo se ganan caminando.
              </Text>
            </Glass>
          </>
        )}
      </View>

      <View className="px-5 pb-8">
        <Pressable
          onPress={() => (step < 3 ? setStep(step + 1) : create())}
          disabled={!canNext || saving || (step === 3 && insufficient)}
          className="rounded-2xl py-4 items-center"
          style={{ backgroundColor: colors.mint, opacity: !canNext || (step === 3 && insufficient) ? 0.5 : 1 }}
        >
          {saving ? <ActivityIndicator color={colors.mintDark} /> : <Text className="text-mint-dark font-bold text-[15px]">{step < 3 ? 'Siguiente' : 'Crear desafío'}</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
