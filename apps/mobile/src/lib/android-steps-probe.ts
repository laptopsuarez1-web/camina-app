import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { resolveAndroidSetup, SOURCE_LOOKBACK_DAYS, type AndroidStepsSetup, type SetupProbe } from '@/lib/android-steps-setup';

// Mira, sin pedir nada, en qué punto está la activación (solo Android).
export async function probeAndroidSetup(): Promise<AndroidStepsSetup> {
  try {
    const status = await getSdkStatus();
    const sdk: SetupProbe['sdk'] =
      status === SdkAvailabilityStatus.SDK_AVAILABLE
        ? 'available'
        : status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
          ? 'update-required'
          : 'unavailable';
    if (sdk !== 'available') return resolveAndroidSetup({ sdk, granted: false, hasRecentSteps: false });
    if (!(await initialize())) return resolveAndroidSetup({ sdk: 'unavailable', granted: false, hasRecentSteps: false });
    const perms = await getGrantedPermissions();
    const granted = perms.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
    if (!granted) return resolveAndroidSetup({ sdk, granted, hasRecentSteps: false });
    const from = new Date(Date.now() - SOURCE_LOOKBACK_DAYS * 86_400_000);
    const page = await readRecords('Steps', {
      timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: new Date().toISOString() },
      pageSize: 1,
    });
    return resolveAndroidSetup({ sdk, granted, hasRecentSteps: page.records.length > 0 });
  } catch {
    return resolveAndroidSetup({ sdk: 'available', granted: false, hasRecentSteps: false, failed: true });
  }
}

// Abre la hoja de permisos de Health Connect. Devuelve true si Camina quedó con permiso de leer Pasos.
export async function requestStepsPermission(): Promise<boolean> {
  await initialize();
  const granted = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
  return granted.some((p) => p.recordType === 'Steps');
}
