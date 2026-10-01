import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

// Pide la reseña de la tienda UNA sola vez en la vida: justo después del primer canje confirmado,
// que es cuando la persona acaba de recibir algo bueno. El sistema decide si la muestra.
const KEY = 'camina_review_asked';

export async function askForReviewOnce() {
  try {
    if (await AsyncStorage.getItem(KEY)) return;
    await AsyncStorage.setItem(KEY, '1');
    if (await StoreReview.isAvailableAsync()) setTimeout(() => StoreReview.requestReview().catch(() => {}), 700);
  } catch {
    // sin almacenamiento o sin tienda (por ejemplo, en pruebas): no pasa nada
  }
}
