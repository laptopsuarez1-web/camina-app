import { useEffect, useRef } from 'react';
import type { RefreshControlProps } from 'react-native';
import { create } from 'zustand';

// "Tirar para actualizar": cada pantalla avisa aquí si está recargando y un solo indicador (RefreshIndicator) dibuja al Baifo.
export const useRefreshStore = create<{ refreshing: boolean }>(() => ({ refreshing: false }));

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

// El circulito nativo queda invisible: en su lugar salta el Baifo. El gesto y el "recargando" siguen siendo los nativos.
export const HIDDEN_SPINNER: Pick<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'> = {
  tintColor: 'transparent',
  colors: ['transparent'],
  progressBackgroundColor: 'transparent',
};
