import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '@/theme/tokens';

// "Deslizar hacia abajo para actualizar" igual en todas las pantallas: vuelve a pedir los datos que la pantalla está mostrando.
// Uso: `const pull = usePullToRefresh();` y `<ScrollView refreshControl={pull} ...>`.
export function usePullToRefresh() {
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await client.refetchQueries({ type: 'active' });
    } catch {
      // Sin conexión: el aviso de "Sin conexión" ya lo explica.
    } finally {
      setRefreshing(false);
    }
  }, [client]);
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.mint} colors={[colors.aqua]} progressBackgroundColor={colors.authBgSoft} />;
}
