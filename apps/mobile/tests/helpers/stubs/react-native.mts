// react-native mínimo para probar en Node (el paquete real trae sintaxis Flow que Node no entiende).
export const Platform = { OS: 'ios' as 'ios' | 'android' | 'web', select: <T,>(o: { ios?: T; android?: T; default?: T }) => o.ios ?? o.default };
export const AppState = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
export default { Platform, AppState };
