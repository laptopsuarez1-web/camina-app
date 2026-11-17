import { Platform, type RefreshControlProps } from 'react-native';
import { colors } from '@/theme/tokens';

// En iPhone el circulito nativo de "tirar para actualizar" queda invisible: en su lugar está el Baifo (PullBaifo).
// El gesto y el "recargando" siguen siendo los nativos. En Android la pantalla no se estira hacia abajo,
// así que se mantiene el circulito de siempre (menta sobre morado).
export const HIDDEN_SPINNER: Pick<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'> =
  Platform.OS === 'ios'
    ? { tintColor: 'transparent' }
    : { tintColor: colors.mint, colors: [colors.aqua], progressBackgroundColor: colors.authBgSoft };
