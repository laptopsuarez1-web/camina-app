import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { colors } from '@/theme/tokens';

// Solapas de arriba de una pantalla (Eventos, Comunidad): la misma pastilla en todas.
// `dot` marca que en esa solapa hay algo pendiente (por ejemplo, solicitudes de amistad).
export function Segmented<K extends string>({ options, value, onChange }: {
  options: readonly { key: K; label: string; dot?: boolean; a11yLabel?: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const dark = useColorScheme().colorScheme === 'dark';
  return (
    <View accessibilityRole="tablist" className="flex-row rounded-full p-1 mb-4 bg-purple-light dark:bg-card-dark border border-line-light dark:border-line-dark" style={{ gap: 4 }}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Press
            key={o.key}
            accessibilityRole="tab"
            accessibilityLabel={o.a11yLabel ?? o.label}
            accessibilityState={{ selected: on }}
            haptic="selection"
            feedback="none"
            onPress={() => onChange(o.key)}
            className="flex-1 rounded-full flex-row items-center justify-center py-2.5"
            // Colores fijos según el modo (la clase oscura no siempre llegaba al texto y la solapa apagada no se leía).
            style={[{ gap: 6, paddingHorizontal: 6 }, on ? { backgroundColor: dark ? '#62F0B6' : '#5B31A3' } : null]}
          >
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 14.5, fontWeight: '800', flexShrink: 1, color: on ? (dark ? '#14093a' : '#fff') : dark ? '#E4D6FF' : '#8149C2' }}>
              {o.label}
            </Text>
            {o.dot ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.dangerFill }} /> : null}
          </Press>
        );
      })}
    </View>
  );
}
