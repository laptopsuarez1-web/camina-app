// expo-sensors mínimo: solo los permisos del podómetro (actividad física), controlables desde la prueba.
export const sensorPerm = { granted: false, grantOnRequest: true, requests: 0, failRequest: false };
export function resetSensorPerm() {
  Object.assign(sensorPerm, { granted: false, grantOnRequest: true, requests: 0, failRequest: false });
}
export const Pedometer = {
  async getPermissionsAsync() {
    return { granted: sensorPerm.granted, status: sensorPerm.granted ? 'granted' : 'undetermined' };
  },
  async requestPermissionsAsync() {
    sensorPerm.requests += 1;
    if (sensorPerm.failRequest) throw new Error('sin actividad');
    if (sensorPerm.grantOnRequest) sensorPerm.granted = true;
    return { granted: sensorPerm.granted, status: sensorPerm.granted ? 'granted' : 'denied' };
  },
  async isAvailableAsync() {
    return true;
  },
};
