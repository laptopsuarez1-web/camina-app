import { Modal, View, Text, Pressable } from 'react-native';
import { colors } from '@/theme/tokens';

export interface SheetAction {
  label: string;
  danger?: boolean;
  onPress: () => void;
}

// Menú que sube desde abajo (reemplaza al Alert, que en Android admite solo 3 botones).
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(18,10,30,0.5)' }} onPress={onClose}>
        <Pressable className="bg-card-light dark:bg-card-dark rounded-t-[28px] px-5 pt-3 pb-9" onPress={() => {}}>
          <View className="w-9 h-1.5 rounded-full bg-line-light dark:bg-line-dark self-center mb-4" />
          {title ? <Text className="text-[13px] font-bold text-center text-muted-light dark:text-muted-dark mb-3">{title}</Text> : null}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              className="py-3.5 items-center border-t border-line-light dark:border-line-dark"
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: a.danger ? '#E5484D' : colors.aqua }}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} className="py-3.5 items-center border-t border-line-light dark:border-line-dark">
            <Text className="text-[15px] text-muted-light dark:text-muted-dark">Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
