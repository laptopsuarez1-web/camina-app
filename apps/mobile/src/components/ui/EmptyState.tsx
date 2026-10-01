import { View, Text, Pressable, Image } from 'react-native';
import { colors } from '@/theme/tokens';
import { Glass } from '@/components/ui/Glass';

// Pantalla vacía con explicación: qué falta, por qué y qué hacer. Lleva el logo de Camina.
export function EmptyState({
  title, text, actionLabel, onAction,
}: { title: string; text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <Glass className="rounded-3xl items-center" style={{ paddingVertical: 26, paddingHorizontal: 22 }}>
      <Image source={require('@/../assets/icon.png')} style={{ width: 54, height: 54, borderRadius: 27, marginBottom: 12 }} />
      <Text className="text-[15px] font-bold text-center text-text-light dark:text-text-dark">{title}</Text>
      <Text className="text-[12.5px] text-center text-muted-light dark:text-muted-dark mt-1.5" style={{ lineHeight: 18 }}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={{ marginTop: 16, backgroundColor: colors.aqua, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 22 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Glass>
  );
}
