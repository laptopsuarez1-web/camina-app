// Hoja "Seleccionar sucursal" de la ficha de un comercio (estilo Pasito): todas sus sucursales, la más cercana primero,
// con dirección, si está abierta y a qué distancia. Al tocar una, la ficha pasa a mostrar esa sucursal.
// El fondo que cierra la hoja va al lado (no envolviendo) de la lista, así la lista siempre se puede deslizar.
import { useMemo } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Press accessibilityRole="button" accessibilityLabel="Cerrar sucursales" feedback="none" style={{ flex: 1, backgroundColor: 'rgba(20,16,31,0.45)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: isDark ? '#1B1530' : '#F4F0FF',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 10,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 16,
          maxHeight: '82%',
        }}
      >
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: isDark ? '#5c4f80' : '#CDBDEB', alignSelf: 'center', marginBottom: 12 }} />
        <View className="flex-row items-center justify-between mb-3 mx-1">
          <Text accessibilityRole="header" className="font-bold text-[18px] text-text-light dark:text-text-dark">Seleccionar sucursal</Text>
          <Press accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10} onPress={onClose}>
            <X size={20} color={isDark ? colors.mint : colors.aquaDeep} />
          </Press>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }} keyboardShouldPersistTaps="handled">
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
                  borderColor: selected ? colors.aqua : isDark ? colors.dark.line : colors.light.line,
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
                {selected ? (
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.aquaDeep, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={15} color="#fff" />
                  </View>
                ) : null}
              </Press>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
