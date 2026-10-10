// AsyncStorage en memoria. failAll = true simula un dispositivo sin almacenamiento.
const mem = new Map<string, string>();
export const control = { failAll: false };

export function resetStorage() {
  mem.clear();
  control.failAll = false;
}
export function dump() {
  return Object.fromEntries(mem);
}

const AsyncStorage = {
  async getItem(key: string) {
    if (control.failAll) throw new Error('storage no disponible');
    return mem.has(key) ? mem.get(key)! : null;
  },
  async setItem(key: string, value: string) {
    if (control.failAll) throw new Error('storage no disponible');
    mem.set(key, value);
  },
  async removeItem(key: string) {
    mem.delete(key);
  },
};
export default AsyncStorage;
