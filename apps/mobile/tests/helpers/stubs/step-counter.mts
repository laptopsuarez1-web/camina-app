// Módulo nativo del contador de pasos, simulado. present = false simula una versión de la app sin el módulo.
export const counter = { present: true, available: true, count: 0, bootMs: 0, respond: true, reads: 0 };
export function resetCounter() {
  Object.assign(counter, { present: true, available: true, count: 0, bootMs: 0, respond: true, reads: 0 });
}
const native = {
  isAvailable() {
    return counter.available;
  },
  async readAsync(_timeoutMs: number) {
    counter.reads += 1;
    return counter.respond ? { count: counter.count, bootMs: counter.bootMs } : null;
  },
};
// Igual que requireOptionalNativeModule: null si el módulo no está.
export default new Proxy(native, {
  get(target, prop) {
    if (!counter.present) return undefined;
    return (target as Record<string | symbol, unknown>)[prop];
  },
});
export const isPresent = () => counter.present;
