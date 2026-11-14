import { requireOptionalNativeModule } from 'expo';

// Módulo propio de Camina (solo Android). En iPhone, en la web o en una versión de la app instalada antes de este
// módulo no existe y vale null: quien lo usa tiene que tolerarlo (las actualizaciones por OTA llegan a versiones viejas).
type StepCounterNative = {
  isAvailable(): boolean;
  readAsync(timeoutMs: number): Promise<{ count: number; bootMs: number } | null>;
};

export default requireOptionalNativeModule<StepCounterNative>('StepCounter');
