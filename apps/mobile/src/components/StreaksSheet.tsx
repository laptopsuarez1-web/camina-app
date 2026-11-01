import { Modal, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Target } from '@/components/icons';
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
          backgroundColor: icon === 'flame' ? (isDark ? 'rgba(242,152,92,0.18)' : colors.warnLight) : isDark ? 'rgba(127,237,196,0.12)' : 'rgba(18,140,110,0.1)',
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

// Hoja "Tus rachas": Racha (5.000 pasos, da Puntos) y Meta personal (tu meta, no toca la Racha).
export function StreaksSheet({
  visible, racha, meta, goal, isDark, onClose,
}: { visible: boolean; racha: number; meta: number; goal: number; isDark: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Press accessible={false} feedback="none" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Press accessible={false} feedback="none" className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3 pb-9" onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
          <Text accessibilityRole="header" className="text-[20px] font-bold text-text-light dark:text-text-dark mb-1">Tus rachas</Text>
          <Row
            icon="flame" isDark={isDark} title="Racha" value={racha}
            text={`Días seguidos con al menos ${fmt(STREAK_MIN_STEPS)} pasos. Cada ${STREAK_BONUS_DAYS} días sumas +${STREAK_BONUS_POINTS} Puntos. Si te saltas un día, vuelve a 0.`}
          />
          <View className="h-px bg-line-light dark:bg-line-dark" />
          <Row
            icon="target" isDark={isDark} title="Meta personal" value={meta}
            text={`Días seguidos llegando a tu meta de ${fmt(goal)} pasos. No cambia tu Racha.`}
          />
          <Press accessibilityRole="button" onPress={onClose} className="py-3.5 items-center border-t border-line-light dark:border-line-dark mt-2">
            <Text className="text-[15px] font-semibold text-aqua-ink dark:text-aqua">Entendido</Text>
          </Press>
        </Press>
      </Press>
    </Modal>
  );
}
