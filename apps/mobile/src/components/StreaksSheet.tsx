import { Modal, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Check, Target } from '@/components/icons';
import { Coin } from '@/components/ui/Coin';
import { IllArt } from '@/components/ui/IllustratedIcons';
import { colors } from '@/theme/tokens';
import { STREAK_MIN_STEPS, STREAK_BONUS_DAYS, STREAK_BONUS_POINTS } from '@/constants/business-rules';

const fmt = (n: number) => n.toLocaleString('es-BO');
const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

function Row({ icon, title, value, text, isDark }: { icon: 'flame' | 'target'; title: string; value: number; text: string; isDark: boolean }) {
  return (
    <View className="flex-row" style={{ gap: 12, paddingVertical: 12 }}>
      <View
        style={{
          width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
          backgroundColor: icon === 'flame' ? (isDark ? 'rgba(242,152,92,0.18)' : colors.warnLight) : isDark ? 'rgba(98,240,182,0.12)' : 'rgba(18,140,110,0.1)',
        }}
      >
        {icon === 'flame' ? <IllArt kind="flame" size={26} /> : <Target size={22} color={colors.mint} />}
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between items-center">
          <Text className="text-[15px] font-bold text-text-light dark:text-text-dark">{title}</Text>
          <Text className="text-[15px] font-bold text-aqua-ink dark:text-aqua">{dias(value)}</Text>
        </View>
        <Text className="text-[13px] text-muted-light dark:text-muted-dark" style={{ marginTop: 2 }}>{text}</Text>
      </View>
    </View>
  );
}

const INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Los últimos 7 días: con tilde los que mantuvieron la racha, apagados los que no, y hoy con borde si todavía falta.
function Week({ week, isDark }: { week: { key: string; ok: boolean }[]; isDark: boolean }) {
  const last = week.length - 1;
  return (
    <View className="flex-row justify-between" style={{ marginTop: 18 }} accessible accessibilityLabel={`Últimos 7 días: ${week.filter((d) => d.ok).length} con la racha cumplida`}>
      {week.map((d, i) => {
        const [y, m, day] = d.key.split('-').map(Number);
        const today = i === last;
        return (
          <View key={d.key} className="items-center" style={{ gap: 6, flex: 1 }}>
            <View
              style={{
                width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                backgroundColor: d.ok ? colors.mint : today ? 'transparent' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(41,28,71,0.06)',
                borderWidth: today && !d.ok ? 2 : 0, borderStyle: 'dashed', borderColor: isDark ? colors.mint : colors.aquaDeep,
              }}
            >
              {d.ok ? <Check size={16} color={colors.mintDark} weight="bold" /> : today ? null : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(41,28,71,0.22)' }} />}
            </View>
            <Text className={today ? 'text-text-light dark:text-text-dark' : 'text-muted-light dark:text-muted-dark'} style={{ fontSize: 12, fontWeight: today ? '800' : '500' }}>
              {today ? 'Hoy' : INITIALS[new Date(y, m - 1, day).getDay()]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Hoja "Tu racha": la llama, los días seguidos, la semana a la vista y cuánto falta para el bono.
// Abajo, la Meta personal (tu meta, no toca la Racha).
export function StreaksSheet({
  visible, racha, meta, goal, isDark, onClose, week, stepsToday,
}: { visible: boolean; racha: number; meta: number; goal: number; isDark: boolean; onClose: () => void; week?: { key: string; ok: boolean }[]; stepsToday?: number }) {
  const doneToday = (stepsToday ?? 0) >= STREAK_MIN_STEPS;
  const left = Math.max(0, STREAK_MIN_STEPS - (stepsToday ?? 0));
  const lap = racha <= 0 ? 0 : racha % STREAK_BONUS_DAYS === 0 ? STREAK_BONUS_DAYS : racha % STREAK_BONUS_DAYS;
  const toBonus = STREAK_BONUS_DAYS - lap;
  const line = doneToday
    ? racha > 0 && toBonus === 0
      ? `¡Ganaste el bono de ${STREAK_BONUS_POINTS} Puntos! Vuelve mañana para seguir.`
      : 'Hoy ya sumaste. Vuelve mañana para seguir.'
    : racha > 0
      ? `Te faltan ${fmt(left)} pasos hoy para no cortarla.`
      : `Camina ${fmt(STREAK_MIN_STEPS)} pasos hoy y empieza tu racha.`;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3 pb-9" onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
          <View className="items-center">
            <View style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(242,152,92,0.16)' : colors.warnLight, opacity: racha > 0 ? 1 : 0.6 }}>
              <IllArt kind="flame" size={54} />
            </View>
            <Text accessibilityRole="header" accessibilityLabel={`Tu racha: ${dias(racha)} seguidos`} className="text-text-light dark:text-text-dark" style={{ fontSize: 52, lineHeight: 58, fontWeight: '900', letterSpacing: -1.5, marginTop: 8, fontVariant: ['tabular-nums'] }}>{racha}</Text>
            <Text className="text-muted-light dark:text-muted-dark" style={{ fontSize: 15, fontWeight: '700', marginTop: -2 }}>{racha === 1 ? 'día seguido' : 'días seguidos'}</Text>
            <Text className="text-text-light dark:text-text-dark text-center" style={{ fontSize: 14.5, fontWeight: '600', marginTop: 12 }}>{line}</Text>
          </View>
          {week && week.length === 7 ? <Week week={week} isDark={isDark} /> : null}
          <View className="rounded-2xl flex-row items-center" style={{ marginTop: 18, paddingVertical: 11, paddingHorizontal: 14, gap: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(41,28,71,0.05)' }}>
            <Coin size={22} />
            <Text className="flex-1 text-[13px] text-text-light dark:text-text-dark" style={{ lineHeight: 18 }}>
              {fmt(STREAK_MIN_STEPS)} pasos por día mantienen tu racha. Cada {STREAK_BONUS_DAYS} días seguidos ganas <Text className="font-bold">+{STREAK_BONUS_POINTS} Puntos</Text>
              {racha > 0 && toBonus > 0 ? ` (${toBonus === 1 ? 'falta 1 día' : `faltan ${toBonus} días`})` : ''}.
            </Text>
          </View>
          <Row
            icon="target" isDark={isDark} title="Meta personal" value={meta}
            text={`Días seguidos llegando a tu meta de ${fmt(goal)} pasos. No cambia tu Racha.`}
          />
          <Press accessibilityRole="button" onPress={onClose} className="rounded-2xl py-3.5 items-center mt-1" style={{ backgroundColor: colors.aquaDeep }}>
            <Text className="text-[15px] font-bold text-white">Seguir caminando</Text>
          </Press>
        </Press>
      </Press>
    </Modal>
  );
}
