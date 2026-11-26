// Hoja "Seleccionar sucursal" de la ficha de un comercio (estilo Pasito): todas sus sucursales, la más cercana primero,
// con dirección, si está abierta y a qué distancia. Al tocar una, la ficha pasa a mostrar esa sucursal.
// Usa la misma hoja que Horarios (SwipeSheet): sin capa oscura encima, se desliza y se cierra jalando hacia abajo.
import { useMemo } from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SwipeSheet } from '@/components/ui/SwipeSheet';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { Check, MapPin, X } from '@/components/icons';
import { BusinessAvatar } from '@/components/CategoryAvatar';
import { hoursChipInfo } from '@/components/BusinessHours';
import { colors } from '@/theme/tokens';
import { metersBetween, type Place } from '@/lib/branches';
import { formatDistance, MAX_SHOWN_DISTANCE_M } from '@/components/canjes/parts';

type Props = {
  visible: boolean;
  businessName: string;
  category: string | null;
  logoUrl: string | null;
  featured: boolean;
  places: readonly Place[];
  selectedId: string;
  pos: { latitude: number; longitude: number } | null;
  // Cuántos premios valen en cada sucursal (solo si el comercio eligió premios por sucursal).
  prizesAt?: ReadonlyMap<string, number> | null;
  onSelect: (placeId: string) => void;
  onClose: () => void;
};

export function BranchSheet({ visible, businessName, category, logoUrl, featured, places, selectedId, pos, prizesAt, onSelect, onClose }: Props) {
  const isDark = useColorScheme().colorScheme === 'dark';
  const rows = useMemo(() => {
    const list = places.map((p) => ({ place: p, distance: pos ? metersBetween(pos, p.lat, p.lng) : null }));
    // La más cercana primero; sin ubicación, en el orden del comercio (la principal primero).
    if (pos) list.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    return list;
  }, [places, pos]);
  const text = isDark ? colors.dark.text : colors.light.text;
  const muted = isDark ? colors.dark.muted : colors.light.muted;
  const green = isDark ? colors.mint : colors.aquaInk;
  const red = isDark ? colors.dangerSoft : colors.dangerInk;

  return (
    <SwipeSheet visible={visible} onClose={onClose} background={isDark ? '#1B1530' : '#F4F0FF'} handleColor={isDark ? '#5c4f80' : '#CDBDEB'} maxHeight="82%">
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }}>
        <View className="flex-row items-center justify-between mb-3 mx-1">
          <Text accessibilityRole="header" className="font-bold text-[18px] text-text-light dark:text-text-dark">Seleccionar sucursal</Text>
          <Press accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10} onPress={onClose}>
            <X size={20} color={isDark ? colors.mint : colors.aquaDeep} />
          </Press>
        </View>
        <View style={{ gap: 12 }}>
          {rows.map(({ place, distance }) => {
            const selected = place.id === selectedId;
            const hours = place.opening_hours ? hoursChipInfo(place.opening_hours) : null;
            const prizes = prizesAt?.get(place.id);
            const showDistance = distance != null && distance < MAX_SHOWN_DISTANCE_M;
            return (
              <Press
                key={place.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${businessName} ${place.label}${place.address ? `, ${place.address}` : ''}${hours ? `, ${hours.open ? 'abierto ahora' : 'cerrado'}` : ''}${showDistance ? `, a ${formatDistance(distance!)}` : ''}`}
                onPress={() => onSelect(place.id)}
                className="flex-row items-center rounded-3xl"
                style={{
                  gap: 14,
                  padding: 12,
                  backgroundColor: isDark ? colors.dark.card : colors.light.card,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? (isDark ? colors.mint : colors.aqua) : isDark ? colors.dark.line : colors.light.line,
                }}
              >
                <BusinessAvatar logoUrl={logoUrl} category={category} size={64} featured={featured} />
                <View className="flex-1" style={{ gap: 3 }}>
                  <Text numberOfLines={1} style={{ color: text, fontSize: 16, fontWeight: '800' }}>
                    {businessName} {place.label}
                  </Text>
                  {category ? <Text numberOfLines={1} style={{ color: muted, fontSize: 13 }}>{category}</Text> : null}
                  {place.address ? (
                    <View className="flex-row items-center" style={{ gap: 5 }}>
                      <MapPin size={13} color={muted} />
                      <Text numberOfLines={1} style={{ color: muted, fontSize: 13, flexShrink: 1 }}>{place.address}</Text>
                    </View>
                  ) : null}
                  {prizes != null ? (
                    <Text style={{ color: prizes > 0 ? text : muted, fontSize: 13, fontWeight: '700' }}>
                      {prizes > 0 ? `${prizes} ${prizes === 1 ? 'premio' : 'premios'} en esta sucursal` : 'Sin premios en esta sucursal'}
                    </Text>
                  ) : null}
                  {hours || showDistance ? (
                    <Text style={{ fontSize: 13 }}>
                      {hours ? <Text style={{ color: hours.open ? green : red, fontWeight: '700' }}>{hours.open ? 'Abierto ahora' : 'Cerrado'}</Text> : null}
                      {hours && showDistance ? <Text style={{ color: muted }}>{'  •  '}</Text> : null}
                      {showDistance ? <Text style={{ color: muted, fontWeight: '600' }}>{formatDistance(distance!)}</Text> : null}
                    </Text>
                  ) : null}
                </View>
                {/* Elegida: tilde en chip mint (como los chips de la app); las demás, un aro vacío para que se vea que se pueden elegir. */}
                {selected ? (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color={colors.mintInk} weight="bold" />
                  </View>
                ) : (
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(41,28,71,0.18)' }} />
                )}
              </Press>
            );
          })}
        </View>
      </View>
    </SwipeSheet>
  );
}
