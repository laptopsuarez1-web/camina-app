import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { supabase } from '@/lib/supabase';
import { probeAndroidSetup } from '@/lib/android-steps-probe';
import { readHealthConnectSteps, startOfDay } from '@/lib/health-steps';
import { readSensorDaySteps, sensorStatus } from '@/lib/sensor-steps';

// Al abrir la app (Android) se guarda en el servidor en qué quedó la fuente de pasos: Health Connect (instalado,
// con permiso, con pasos guardados o vacío) y el contador del teléfono. Así se ve quién tiene «0 pasos» y por qué,
// sin preguntarle a nadie. Una vez por apertura; nunca falla hacia afuera.
let reportedFor = '';
export async function reportStepSources(userId: string): Promise<void> {
  if (Platform.OS !== 'android' || reportedFor === userId) return;
  reportedFor = userId;
  try {
    const now = new Date();
    const hc = await probeAndroidSetup();
    const hcSteps = hc === 'active' || hc === 'needs-source' ? await readHealthConnectSteps(startOfDay(now), now).catch(() => null) : null;
    const counter = await sensorStatus();
    const counterSteps = counter === 'active' ? await readSensorDaySteps(now) : null;
    await supabase.rpc('report_step_sources', {
      p_platform: `android ${Platform.Version}`,
      p_app_build: Application.nativeBuildVersion ?? null,
      p_health_connect: hc,
      p_health_connect_steps: hcSteps,
      p_phone_counter: counter,
      p_phone_counter_steps: counterSteps,
    });
  } catch {
    reportedFor = '';
  }
}
