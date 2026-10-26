import { useCallback, useState } from 'react';
import { View, Alert, ActivityIndicator, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupDetail } from '@/hooks/useGroupDetail';
import { ChevronLeft, Activity, Calendar, Flame, IconBubble } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { usePointsBalance } from '@/hooks/usePoints';
import { groupInviteLink } from '@/constants/sharing';
import { MIN_DAILY_GOAL } from '@/constants/business-rules';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useThemeColors';
import { Glass } from '@/components/ui/Glass';
import { RULE_LABEL, type ChallengeRule } from '@/hooks/useChallenges';
import { ChallengeCreatedScene } from '@/components/challenge/ChallengeCinematics';
import { friendlyServerError } from '@/lib/errors';
import { localDay } from '@/lib/format';
import { Coin } from '@/components/ui/Coin';

const RULES: { key: ChallengeRule; title: string; desc: string; icon: typeof Activity; tone: 'aqua' | 'gold' | 'orange' }[] = [
  { key: 'steps', title: 'Más pasos', desc: 'Gana quien suma más pasos', icon: Activity, tone: 'aqua' },
  { key: 'days', title: 'Más días', desc: 'Gana quien cumple la meta más veces', icon: Calendar, tone: 'gold' },
  { key: 'streak', title: 'Mejor racha', desc: 'Gana quien mantiene la racha más larga', icon: Flame, tone: 'orange' },
];
const STAKES = [0, 5, 10, 20, 50];
// Tope de la base (group_challenges.stake between 0 and 50).
const MAX_STAKE = 50;

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Crear desafío en 3 pasos: nombre → regla y meta → duración y puntos en juego.
export default function NuevoDesafioScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  // El link de invitación lleva el código del grupo, no su id.
  const groupDetail = useGroupDetail(groupId).data;
  const inviteCode = groupDetail?.group.invite_code;
  const groupName = groupDetail?.group.name;
  const { data: balance } = usePointsBalance();
  const { muted, accentIcon, dangerText } = useThemeColors();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [rule, setRule] = useState<ChallengeRule>('steps');
  const [goal, setGoal] = useState(5000);
  const [days, setDays] = useState(7);
  const [stake, setStake] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  // Cantidad propia de Puntos ("Otra"): se escribe a mano entre 1 y MAX_STAKE.
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  // La pantalla queda montada entre visitas (es una pestaña oculta): al salir se vuelve a empezar,
  // así la próxima vez no aparece otra vez el "está en marcha" del desafío anterior.
  useFocusEffect(
    useCallback(
      () => () => {
        setStep(1);
        setName('');
        setRule('steps');
        setGoal(5000);
        setDays(7);
        setStake(0);
        setDone(false);
        setCustomOpen(false);
        setCustomText('');
      },
      [],
    ),
  );
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
      p_start: localDay(start),
      p_end: localDay(end),
      p_stake: stake,
    });
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo crear el desafío', friendlyServerError(error, 'Intenta de nuevo.'));
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
    const toGroup = () => router.replace({ pathname: '/(tabs)/grupos/[groupId]', params: { groupId: groupId! } });
    return (
      <View className="flex-1 bg-bg-light dark:bg-bg-dark">
        <ChallengeCreatedScene
          name={name.trim()}
          groupName={groupName}
          chips={[RULE_LABEL[rule], `${goal.toLocaleString('es-BO')} por día`, `${days} ${days === 1 ? 'día' : 'días'}`]}
          stake={stake}
          dates={`Del ${fmtShort(start)} al ${fmtShort(end)}`}
          onInvite={() =>
            Share.share({
              message: inviteCode
                ? `Súmate a mi desafío "${name.trim()}" en Camina.\nCódigo del grupo: ${inviteCode}\n${groupInviteLink(inviteCode)}`
                : `Súmate a mi desafío "${name.trim()}" en Camina.`,
            })
          }
          onGoGroup={toGroup}
          onHome={() => router.replace('/(tabs)')}
        />
      </View>
    );
  }

  const canNext = step === 1 ? name.trim().length >= 3 : true;
  const insufficient = stake > 0 && (balance ?? 0) < stake;

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg-light dark:bg-bg-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="px-5 pt-14 flex-row items-center justify-between">
        <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={back} hitSlop={10} className="w-9 h-9 rounded-full items-center justify-center bg-card-light dark:bg-card-dark">
          <ChevronLeft size={18} color={accentIcon} />
        </Press>
        <Text className="text-[13px] font-semibold text-muted-light dark:text-muted-dark">Nuevo desafío</Text>
        <View style={{ width: 36 }} />
      </View>
      <View accessible accessibilityLabel={`Paso ${step} de 3`} className="flex-row px-5 mt-4" style={{ gap: 6 }}>
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
              accessibilityLabel="Nombre del desafío"
              placeholderTextColor={muted}
              className="text-center text-[30px] font-extrabold text-text-light dark:text-text-dark mt-16"
            />
            <Text className="text-center text-[12px] text-muted-light dark:text-muted-dark mt-2">{name.length} de 30 letras</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text className="text-[20px] font-extrabold text-text-light dark:text-text-dark mb-3">Elige la regla</Text>
            {RULES.map((r) => (
              <Press
                key={r.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: rule === r.key }}
                aria-checked={rule === r.key}
                onPress={() => setRule(r.key)}
              >
                <Glass className="rounded-2xl p-3.5 mb-2.5 flex-row items-center" style={{ gap: 12, borderColor: rule === r.key ? colors.aqua : undefined, borderWidth: rule === r.key ? 2 : 1 }}>
                  <IconBubble icon={r.icon} tone={r.tone} size={42} />
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-text-light dark:text-text-dark">{r.title}</Text>
                    <Text className="text-[12px] text-muted-light dark:text-muted-dark">{r.desc}</Text>
                  </View>
                </Glass>
              </Press>
            ))}
            <Text className="text-[16px] font-extrabold text-text-light dark:text-text-dark mt-4 mb-2">Meta diaria por persona</Text>
            <View className="flex-row items-center justify-center" style={{ gap: 20 }}>
              <Press accessibilityRole="button" accessibilityLabel="Bajar meta 500 pasos" onPress={() => setGoal(Math.max(MIN_DAILY_GOAL, goal - 500))} className="w-11 h-11 rounded-full items-center justify-center bg-card-light dark:bg-card-dark">
                <Text className="text-[22px] font-bold text-text-light dark:text-text-dark">−</Text>
              </Press>
              <Text className="text-[34px] font-extrabold text-text-light dark:text-text-dark">{goal.toLocaleString('es-BO')}</Text>
              <Press accessibilityRole="button" accessibilityLabel="Subir meta 500 pasos" onPress={() => setGoal(Math.min(30000, goal + 500))} className="w-11 h-11 rounded-full items-center justify-center bg-card-light dark:bg-card-dark">
                <Text className="text-[22px] font-bold text-text-light dark:text-text-dark">+</Text>
              </Press>
            </View>
            <Text className="text-center text-[12px] text-muted-light dark:text-muted-dark mt-1">mínimo {MIN_DAILY_GOAL.toLocaleString('es-BO')} pasos</Text>
          </>
        )}

        {step === 3 && (
          <>
            <Text className="text-[20px] font-extrabold text-text-light dark:text-text-dark mb-3">Duración</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {[3, 7, 10, 14].map((d) => (
                <Press key={d} accessibilityRole="button" accessibilityState={{ selected: days === d }} aria-pressed={days === d} onPress={() => setDays(d)} className="rounded-full px-4 py-2.5" style={{ backgroundColor: days === d ? colors.aquaDeep : 'rgba(124,106,156,0.14)' }}>
                  <Text className="text-muted-light dark:text-muted-dark" style={{ fontWeight: '800', ...(days === d ? { color: '#fff' } : null) }}>{d} días</Text>
                </Press>
              ))}
            </View>
            <Text className="text-[12.5px] text-muted-light dark:text-muted-dark mt-3">Empieza hoy ({fmtShort(start)}) y termina el {fmtShort(end)}.</Text>

            <Text className="text-[16px] font-extrabold text-text-light dark:text-text-dark mt-5">Puntos en juego</Text>
            <View className="flex-row items-center mt-0.5 mb-3" style={{ gap: 6 }}>
              <Text className="text-[12px] text-muted-light dark:text-muted-dark">Cada persona pone de sus propios Puntos · tienes</Text>
              <Coin size={14} />
              <Text className="text-[12px] font-bold text-text-light dark:text-text-dark">{balance ?? 0}</Text>
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {STAKES.map((v) => {
                const on = !customOpen && stake === v;
                return (
                  <Press
                    key={v}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    aria-pressed={on}
                    onPress={() => {
                      setCustomOpen(false);
                      setStake(v);
                    }}
                    className="rounded-full px-5 py-2.5 flex-row items-center"
                    style={{ gap: 5, backgroundColor: on ? colors.aquaDeep : 'rgba(124,106,156,0.14)' }}
                  >
                    {v > 0 && <Coin size={14} />}
                    <Text className="text-muted-light dark:text-muted-dark" style={{ fontWeight: '800', ...(on ? { color: '#fff' } : null) }}>{v}</Text>
                  </Press>
                );
              })}
              <Press
                accessibilityRole="button"
                accessibilityState={{ selected: customOpen }}
                aria-pressed={customOpen}
                onPress={() => {
                  setCustomOpen(true);
                  const n = parseInt(customText, 10);
                  setStake(Number.isFinite(n) ? n : 0);
                }}
                className="rounded-full px-5 py-2.5"
                style={{ backgroundColor: customOpen ? colors.aquaDeep : 'rgba(124,106,156,0.14)' }}
              >
                <Text className="text-muted-light dark:text-muted-dark" style={{ fontWeight: '800', ...(customOpen ? { color: '#fff' } : null) }}>Otra</Text>
              </Press>
            </View>
            {customOpen && (
              <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
                <Coin size={18} />
                <TextInput
                  value={customText}
                  onChangeText={(t) => {
                    const digits = t.replace(/[^0-9]/g, '').slice(0, 2);
                    const n = Math.min(MAX_STAKE, parseInt(digits || '0', 10));
                    setCustomText(digits ? String(n) : '');
                    setStake(n);
                  }}
                  keyboardType="number-pad"
                  autoFocus
                  placeholder={`De 1 a ${MAX_STAKE}`}
                  accessibilityLabel="Cantidad de Puntos en juego"
                  className="flex-1 rounded-2xl px-4 py-3 text-[16px] font-bold bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark"
                />
                <Text className="text-[12px] text-muted-light dark:text-muted-dark">máx. {MAX_STAKE}</Text>
              </View>
            )}
            {insufficient && <Text className="text-[12px] mt-2" style={{ color: dangerText }}>No te alcanzan los Puntos para poner {stake}.</Text>}
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
        <Press
          accessibilityRole="button"
          accessibilityLabel={step < 3 ? 'Siguiente' : 'Crear desafío'}
          accessibilityState={{ busy: saving }}
          onPress={() => (step < 3 ? setStep(step + 1) : create())}
          disabled={!canNext || saving || (step === 3 && insufficient)}
          className="rounded-2xl py-4 items-center"
          style={{ backgroundColor: colors.mint, opacity: !canNext || (step === 3 && insufficient) ? 0.5 : 1 }}
        >
          {saving ? <ActivityIndicator color={colors.mintDark} /> : <Text className="text-mint-dark font-bold text-[15px]">{step < 3 ? 'Siguiente' : 'Crear desafío'}</Text>}
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}
