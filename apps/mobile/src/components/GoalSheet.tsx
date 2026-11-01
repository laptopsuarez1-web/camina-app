import { useState } from 'react';
import { Modal, View, Alert, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { GoalWheel, GOAL_VALUES, nearestGoalIndex } from '@/components/GoalWheel';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { friendlyError } from '@/lib/errors';
import { colors } from '@/theme/tokens';
import { DEFAULT_DAILY_GOAL } from '@/constants/business-rules';

// Hoja "Tu meta diaria": la ruedita de pasos, desde Perfil. Guarda con "Listo".
export function GoalSheet({ visible, goal, isDark, onClose }: { visible: boolean; goal: number; isDark: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* El contenido se monta al abrir: la ruedita arranca siempre en la meta actual. */}
      <GoalSheetBody goal={goal} isDark={isDark} onClose={onClose} />
    </Modal>
  );
}

function GoalSheetBody({ goal, isDark, onClose }: { goal: number; isDark: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(() => nearestGoalIndex(goal));
  const [saving, setSaving] = useState(false);
  const value = GOAL_VALUES[index];

  async function save() {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) return;
    if (value === goal) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ daily_goal: value }).eq('id', userId);
      if (error) throw error;
      await useAuthStore.getState().refreshProfile();
      onClose();
    } catch (e) {
      Alert.alert('No pudimos guardar tu meta', friendlyError(e, 'Intenta de nuevo.'));
    } finally {
      setSaving(false);
    }
  }

  const hint =
    value < DEFAULT_DAILY_GOAL ? 'Para empezar está bien. Cuando te acostumbres, súbela.'
    : value === DEFAULT_DAILY_GOAL ? 'Es la meta que recomendamos.'
    : value <= 10000 ? '¡Buena meta! Cada 1.000 pasos te dan 1 Punto.'
    : 'Meta exigente: ve de a poco y cuídate.';

  return (
    <>
      {/* El fondo que cierra la hoja es un hermano, no el padre: si la hoja fuera un Pressable, atraparía el
          toque y la ruedita (ScrollView) no giraría en el iPhone. */}
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }}>
        <Press accessible={false} feedback="none" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3 pb-9">
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
          <Text accessibilityRole="header" className="text-[20px] font-bold text-text-light dark:text-text-dark text-center">Tu meta diaria</Text>
          <Text className="text-[13px] text-muted-light dark:text-muted-dark text-center mt-1 mb-2">Cuántos pasos quieres hacer por día. Todos tus pasos suman, llegues o no.</Text>
          <GoalWheel index={index} onIndex={setIndex} dark={isDark} />
          <Text className="text-[13.5px] text-center text-muted-light dark:text-muted-dark mt-2 mb-4">{hint}</Text>
          <Press accessibilityRole="button" onPress={save} disabled={saving} style={{ backgroundColor: colors.mint, borderRadius: 16, paddingVertical: 15, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
            <Text style={{ color: colors.mintDark, fontWeight: '800', fontSize: 15 }}>{saving ? 'Guardando…' : 'Listo'}</Text>
          </Press>
          <Press accessibilityRole="button" onPress={onClose} className="py-3.5 items-center mt-1">
            <Text className="text-[15px] text-muted-light dark:text-muted-dark">Cancelar</Text>
          </Press>
        </View>
      </View>
    </>
  );
}
