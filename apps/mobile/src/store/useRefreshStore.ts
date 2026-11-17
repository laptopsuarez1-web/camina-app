import { useEffect, useRef } from 'react';
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent, type RefreshControlProps } from 'react-native';
import { makeMutable } from 'react-native-reanimated';
import { create } from 'zustand';
import { colors } from '@/theme/tokens';

// "Tirar para actualizar": cada pantalla avisa aquí si está recargando y un solo indicador (RefreshIndicator) dibuja al Baifo.
export const useRefreshStore = create<{ refreshing: boolean }>(() => ({ refreshing: false }));

// Cuánto se estiró la pantalla hacia abajo (puntos). Lo lee el Baifo para irse llenando de color.
export const pullDistance = makeMutable(0);

// Se pasa a cada ScrollView con "tirar para actualizar": `<ScrollView {...PULL_SCROLL} refreshControl={...}>`.
// Solo escribe cuando la pantalla está estirada más arriba del tope (o vuelve a 0): el scroll normal no hace nada.
export const PULL_SCROLL = {
  scrollEventThrottle: 16,
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const d = y < 0 ? -y : 0;
    if (d !== pullDistance.value) pullDistance.value = d;
  },
};

// Solo avisa cuando el valor de ESTA pantalla cambia, así una pantalla quieta no apaga el indicador de otra.
export function useReportRefreshing(refreshing: boolean) {
  const prev = useRef(false);
  useEffect(() => {
    if (refreshing) useRefreshStore.setState({ refreshing: true });
    else if (prev.current) useRefreshStore.setState({ refreshing: false });
    prev.current = refreshing;
  }, [refreshing]);
  // Si la pantalla se cierra en plena recarga, no deja al Baifo saltando.
  useEffect(() => () => { if (prev.current) useRefreshStore.setState({ refreshing: false }); }, []);
}

// En iPhone el circulito nativo queda invisible: en su lugar está el Baifo. El gesto y el "recargando" siguen siendo los nativos.
// En Android la pantalla no se estira hacia abajo, así que se mantiene el circulito de siempre (menta sobre morado).
export const HIDDEN_SPINNER: Pick<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'> =
  Platform.OS === 'ios'
    ? { tintColor: 'transparent' }
    : { tintColor: colors.mint, colors: [colors.aqua], progressBackgroundColor: colors.authBgSoft };
