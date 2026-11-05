import { Image, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { levelLabel, type LocalLevel } from '@/hooks/useBadges';

const MINT = '#62F0B6';
const LILA = '#C4B8E8';

// Insignia de un local: el logo en un círculo con un aro según el nivel.
// Visitante = aro lila; Habitual = aro menta; Fan = aro menta doble que brilla.
export function LocalBadge({ logoUrl, name, level, size = 62, label = true }: {
  logoUrl: string | null; name: string; level: LocalLevel | null; size?: number; label?: boolean;
}) {
  const ring = level === 'visitante' ? LILA : MINT;
  const fan = level === 'fan';
  const b = Math.max(3, Math.round(size / 15));
  const outer = fan ? size + b * 3.2 : size;
  return (
    <View accessible accessibilityLabel={`${levelLabel(level)} de ${name}`} style={{ width: outer, height: outer + (label ? size * 0.12 : 0), alignItems: 'center' }}>
      <View style={{
        width: outer, height: outer, borderRadius: outer / 2, alignItems: 'center', justifyContent: 'center',
        borderWidth: fan ? 2 : 0, borderColor: MINT,
        shadowColor: MINT, shadowOpacity: fan ? 0.7 : 0, shadowRadius: size / 4, shadowOffset: { width: 0, height: 0 }, elevation: fan ? 8 : 0,
      }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: b, borderColor: ring, overflow: 'hidden', backgroundColor: '#fff' }}>
          {logoUrl ? <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} /> : (
            <View style={{ flex: 1, backgroundColor: '#1F7A66', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{(name.trim()[0] ?? '·').toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>
      {label && !!level && (
        <View style={{ position: 'absolute', bottom: 0, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: ring }}>
          <Text style={{ color: '#14093a', fontWeight: '800', fontSize: Math.max(9, size * 0.14) }}>{levelLabel(level)}</Text>
        </View>
      )}
    </View>
  );
}
