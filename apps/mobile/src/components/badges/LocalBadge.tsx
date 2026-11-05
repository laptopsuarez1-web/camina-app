import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { levelLabel, type LocalLevel } from '@/hooks/useBadges';

// Colores por nivel, con el morado y el menta de la marca.
export const LEVEL_LOOK: Record<LocalLevel, { ring: [string, string]; pill: [string, string]; text: string }> = {
  visitante: { ring: ['#B98CF0', '#8B4FD1'], pill: ['#9B5FE0', '#7A3FC4'], text: '#FFFFFF' },
  habitual: { ring: ['#8DF7CB', '#3FD69B'], pill: ['#7FF2C2', '#3FD69B'], text: '#12281F' },
  fan: { ring: ['#FFE08A', '#62F0B6'], pill: ['#FFE08A', '#F2B84B'], text: '#3B1450' },
};

// Insignia de un local: el logo en un círculo con un aro del color del nivel y la etiqueta abajo (siempre en una línea).
// Visitante = morado; Habitual = menta; Fan = aro dorado-menta que brilla.
export function LocalBadge({ logoUrl, name, level, size = 62, label = true }: {
  logoUrl: string | null; name: string; level: LocalLevel | null; size?: number; label?: boolean;
}) {
  const look = LEVEL_LOOK[level ?? 'visitante'];
  const fan = level === 'fan';
  const b = Math.max(3, Math.round(size / 14));
  const font = Math.max(9.5, Math.round(size * 0.16 * 10) / 10);
  return (
    <View accessible accessibilityLabel={`${levelLabel(level)} de ${name}`} style={{ width: size, height: size + (label && level ? font * 0.9 : 0), alignItems: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        shadowColor: fan ? '#FFD166' : look.ring[1], shadowOpacity: fan ? 0.75 : 0.35, shadowRadius: size / (fan ? 4 : 7), shadowOffset: { width: 0, height: 0 }, elevation: fan ? 8 : 3,
      }}>
        <LinearGradient colors={level ? look.ring : ['#4A3B6E', '#2F1E5C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, padding: b }}>
          <View style={{ flex: 1, borderRadius: size, overflow: 'hidden', backgroundColor: '#fff' }}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} cachePolicy="memory-disk" contentFit="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <View style={{ flex: 1, backgroundColor: '#3B2577', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{(name.trim()[0] ?? '·').toUpperCase()}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
      {label && !!level && (
        // La etiqueta puede ser más ancha que el círculo: nunca se parte en dos líneas.
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: -size, right: -size, alignItems: 'center' }}>
          <LinearGradient colors={look.pill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingHorizontal: font * 0.75, paddingVertical: font * 0.18, borderRadius: 999, borderWidth: 1.5, borderColor: '#1d1729' }}>
            <Text allowFontScaling={false} numberOfLines={1} style={{ color: look.text, fontWeight: '800', fontSize: font, letterSpacing: 0.2 }}>{levelLabel(level)}</Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}
