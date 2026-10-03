import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useColorScheme } from 'nativewind';
import { Search, Locate, X, Check } from '@/components/icons';
import { usePlaces } from '@/hooks/usePlaces';
import { colors } from '@/theme/tokens';

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Barrio por búsqueda: se escribe y salen solo los que coinciden (nada de una lista enorme),
// o se usa la ubicación actual para que la app lo reconozca.
export function BarrioPicker({ city, zone, onChange }: { city: string; zone: string | null; onChange: (zone: string | null) => void }) {
  const { data } = usePlaces();
  const dark = useColorScheme().colorScheme === 'dark';
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const zones = (data?.zones ?? []).filter((z) => z.city === city).map((z) => z.name);
  const q = norm(query);
  const matches = q ? zones.filter((z) => norm(z).includes(q)).slice(0, 6) : [];

  async function useMyLocation() {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Necesitamos tu ubicación', 'Activá el permiso de ubicación para Camina o buscá tu barrio escribiendo.', [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync(pos.coords);
      const words = places.flatMap((p) => [p.district, p.subregion, p.name, p.street, p.city]).filter(Boolean).map((w) => norm(String(w)));
      const found = zones.find((z) => z !== 'Otra zona de Tarija' && words.some((w) => w.includes(norm(z))));
      if (found) {
        onChange(found);
        setQuery('');
      } else {
        Alert.alert('No reconocimos tu barrio', 'Escribilo en el buscador y elegilo de la lista.');
      }
    } catch {
      Alert.alert('No pudimos ubicarte', 'Escribí tu barrio en el buscador.');
    } finally {
      setLocating(false);
    }
  }

  const muted = dark ? colors.dark.muted : colors.light.muted;
  return (
    <View>
      <Text className="text-muted-light dark:text-muted-dark text-[12px] mb-1.5">Barrio</Text>
      {zone && (
        <View className="flex-row items-center self-start rounded-full pl-3.5 pr-2 py-2 mb-2 bg-mint" style={{ gap: 8 }}>
          <Check size={13} color="#1E8F6F" />
          <Text style={{ color: '#1E8F6F', fontWeight: '700', fontSize: 13 }}>{zone}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Quitar barrio ${zone}`} onPress={() => onChange(null)} hitSlop={8}>
            <X size={14} color="#1E8F6F" />
          </Pressable>
        </View>
      )}
      <View className="flex-row items-center bg-bg-light dark:bg-bg-dark border border-line-light dark:border-line-dark rounded-xl px-3" style={{ gap: 8 }}>
        <Search size={16} color={muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Escribí tu barrio"
          placeholderTextColor={muted}
          autoCorrect={false}
          accessibilityLabel="Buscar barrio"
          className="flex-1 py-3 text-[14px] text-text-light dark:text-text-dark"
          style={{ minWidth: 0 }}
        />
      </View>
      {q.length > 0 && (
        <View className="flex-row flex-wrap mt-2">
          {matches.map((z) => (
            <Pressable
              key={z}
              accessibilityRole="button"
              onPress={() => { onChange(z); setQuery(''); }}
              className="rounded-full px-3.5 py-2 mr-2 mb-2 border border-line-light dark:border-line-dark"
            >
              <Text className="text-text-light dark:text-text-dark text-[13px] font-medium">{z}</Text>
            </Pressable>
          ))}
          {matches.length === 0 && <Text className="text-muted-light dark:text-muted-dark text-[12.5px]">No hay un barrio con ese nombre.</Text>}
        </View>
      )}
      <Pressable accessibilityRole="button" onPress={useMyLocation} disabled={locating} className="flex-row items-center self-start mt-2 py-1.5" style={{ gap: 6 }}>
        {locating ? <ActivityIndicator size="small" color={colors.aquaDeep} /> : <Locate size={15} color={dark ? colors.mint : colors.aquaDeep} />}
        <Text className="text-aqua-deep dark:text-mint text-[13px] font-semibold">Usar mi ubicación actual</Text>
      </Pressable>
    </View>
  );
}
