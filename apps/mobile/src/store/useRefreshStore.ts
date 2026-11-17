import { Platform, type NativeScrollEvent, type NativeSyntheticEvent, type RefreshControlProps } from 'react-native';
import { makeMutable } from 'react-native-reanimated';
import { buzz } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

// En iPhone el circulito nativo de "tirar para actualizar" queda invisible: en su lugar está el Baifo (PullBaifo).
// El gesto y el "recargando" siguen siendo los nativos. En Android la pantalla no se estira hacia abajo,
// así que se mantiene el circulito de siempre (menta sobre morado).
export const HIDDEN_SPINNER: Pick<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'> =
  Platform.OS === 'ios'
    ? { tintColor: 'transparent' }
    : { tintColor: colors.mint, colors: [colors.aqua], progressBackgroundColor: colors.authBgSoft };

// Cuánto se estiró la pantalla hacia abajo (puntos). Con eso se llena de color la palabra CAMINA.
export const pullDistance = makeMutable(0);
// A cuántos puntos de estirar CAMINA queda lleno (más o menos donde iPhone dispara la recarga).
export const PULL_FULL_AT = 100;

let buzzed = false;
// Se pasa a cada ScrollView con "tirar para actualizar": `<ScrollView {...PULL_SCROLL} refreshControl={...}>`.
// Solo escribe mientras la pantalla está estirada más arriba del tope; el scroll normal no hace nada.
// Vibra suave una vez cuando CAMINA queda lleno ("ya puedes soltar").
export const PULL_SCROLL = {
  scrollEventThrottle: 16,
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const d = y < 0 ? -y : 0;
    if (d !== pullDistance.value) pullDistance.value = d;
    if (Platform.OS !== 'ios') return;
    if (!buzzed && d >= PULL_FULL_AT) { buzzed = true; buzz.light(); }
    if (d < 10) buzzed = false;
  },
};
