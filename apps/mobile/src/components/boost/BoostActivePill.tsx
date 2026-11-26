// Mientras hay Pasos dobles activos: suma lo caminado adentro cada vez que la app se abre y muestra una pastilla
// arriba de la barra de pestañas ("x2 activo · Shopping Norte · +4"). Tocarla abre la ficha del lugar.
import { useState } from 'react';
import { Modal, View, Image } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Press } from '@/components/ui/Press';
import { useTabBarSpace } from '@/components/ui/GlassTabBar';
import { colors } from '@/theme/tokens';
import { useBoostAutoSync, useBoostPlaces, useOpenBoost } from '@/hooks/useBoosts';
import { BoostSheet } from '@/components/boost/BoostSheet';

const COIN = require('@/../assets/camina-coin.png');

export function BoostActivePill() {
  useBoostAutoSync();
  const { data: open } = useOpenBoost();
  const { data: places } = useBoostPlaces();
  const [sheet, setSheet] = useState(false);
  const tabSpace = useTabBarSpace();
  const place = open ? places?.find((p) => p.id === open.place_id) : undefined;
  if (!open || !place) return null;
  return (
    <>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabSpace - 14, alignItems: 'center' }}>
        <Press
          accessibilityRole="button"
          accessibilityLabel={`Pasos dobles activos en ${place.name}, ${open.points} Puntos extra. Ver detalle`}
          onPress={() => setSheet(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14, height: 40, borderRadius: 20, backgroundColor: colors.dark.card, borderWidth: 1.5, borderColor: colors.mint, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
        >
          <View style={{ paddingHorizontal: 7, height: 26, borderRadius: 13, backgroundColor: colors.mint, justifyContent: 'center' }}>
            <Text style={{ color: colors.mintDark, fontWeight: '900', fontSize: 12.5 }}>x2</Text>
          </View>
          <Text numberOfLines={1} style={{ color: colors.dark.text, fontWeight: '700', fontSize: 13, maxWidth: 170 }}>{place.name}</Text>
          <Image source={COIN} style={{ width: 16, height: 16, borderRadius: 8 }} accessible={false} />
          <Text style={{ color: colors.mint, fontWeight: '800', fontSize: 13 }}>+{open.points}</Text>
        </Press>
      </View>
      <Modal visible={sheet} animationType="slide" onRequestClose={() => setSheet(false)}>
        <BoostSheet place={place} onClose={() => setSheet(false)} />
      </Modal>
    </>
  );
}
