import { Text } from '@/components/ui/Text';
import { typo } from '@/theme/type';
import { useThemeColors } from '@/theme/useThemeColors';

// Título de pantalla (nivel Título de la escala). Con texto grande del sistema crece hasta 1,2x y, si no entra, se achica antes de cortarse.
export function ScreenTitle({ children, marginBottom = 4 }: { children: string; marginBottom?: number }) {
  const t = useThemeColors();
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      maxFontSizeMultiplier={1.2}
      style={[typo.title, { color: t.text, marginBottom }]}
    >
      {children}
    </Text>
  );
}
