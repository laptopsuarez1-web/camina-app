import { View, Text, Image } from 'react-native';
import { Press } from '@/components/ui/Press';
import { colors } from '@/theme/tokens';
import { Glass } from '@/components/ui/Glass';
import { EmptyIllustration, type Illustration } from '@/components/ui/EmptyIllustration';

// Pantalla vacía con explicación: qué falta, por qué y qué hacer. Lleva el logo de Camina.
export function EmptyState({
  title, text, actionLabel, onAction, illustration,
}: { title: string; text: string; actionLabel?: string; onAction?: () => void; illustration?: Illustration }) {
  return (
    <Glass className="rounded-3xl items-center" style={{ paddingVertical: 26, paddingHorizontal: 22 }}>
      {illustration ? (
        <EmptyIllustration kind={illustration} />
      ) : (
        <Image source={require('@/../assets/icon.png')} accessible={false} style={{ width: 54, height: 54, borderRadius: 27, marginBottom: 12 }} />
      )}
      <Text accessibilityRole="header" className="text-[15px] font-bold text-center text-text-light dark:text-text-dark">{title}</Text>
      <Text className="text-[12.5px] text-center text-muted-light dark:text-muted-dark mt-1.5" style={{ lineHeight: 18 }}>{text}</Text>
      {actionLabel && onAction ? (
        <Press accessibilityRole="button" onPress={onAction} style={{ marginTop: 16, backgroundColor: colors.aquaDeep, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 22 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>{actionLabel}</Text>
        </Press>
      ) : null}
    </Glass>
  );
}
