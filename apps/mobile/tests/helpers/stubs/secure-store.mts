// Llavero en memoria, con un respiro entre operaciones para que las lecturas y escrituras se crucen como en el teléfono.
const mem = new Map<string, string>();
export const AFTER_FIRST_UNLOCK = 'after-first-unlock';
export type SecureStoreOptions = Record<string, unknown>;
export const resetSecure = () => mem.clear();
const tick = () => new Promise((r) => setTimeout(r, Math.random() * 3));
export async function getItemAsync(k: string) { await tick(); return mem.has(k) ? mem.get(k)! : null; }
export async function setItemAsync(k: string, v: string) { await tick(); mem.set(k, v); }
export async function deleteItemAsync(k: string) { await tick(); mem.delete(k); }
