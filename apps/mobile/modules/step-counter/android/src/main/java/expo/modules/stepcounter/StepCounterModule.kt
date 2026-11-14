package expo.modules.stepcounter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

// Contador de pasos del propio teléfono (Sensor.TYPE_STEP_COUNTER): pasos desde que se prendió el celular.
// Funciona aunque Camina esté cerrada y no lo puede editar nadie a mano. Camina anota el número cada vez que se abre
// y la diferencia entre dos anotaciones son los pasos de ese rato (ver src/lib/sensor-steps.ts).
class StepCounterModule : Module() {
  private fun manager(): SensorManager? =
    appContext.reactContext?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager

  override fun definition() = ModuleDefinition {
    Name("StepCounter")

    Function("isAvailable") {
      manager()?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    }

    // Devuelve { count, bootMs } o null si el teléfono no responde a tiempo (por ejemplo, sin permiso de actividad física).
    AsyncFunction("readAsync") { timeoutMs: Int, promise: Promise ->
      val sm = manager()
      val sensor = sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (sm == null || sensor == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      val done = AtomicBoolean(false)
      val handler = Handler(Looper.getMainLooper())
      val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
          if (!done.compareAndSet(false, true)) return
          handler.removeCallbacksAndMessages(null)
          sm.unregisterListener(this)
          val bootMs = System.currentTimeMillis() - SystemClock.elapsedRealtime()
          promise.resolve(mapOf("count" to event.values[0].toDouble(), "bootMs" to bootMs.toDouble()))
        }

        override fun onAccuracyChanged(s: Sensor?, accuracy: Int) {}
      }
      handler.postDelayed({
        if (done.compareAndSet(false, true)) {
          sm.unregisterListener(listener)
          promise.resolve(null)
        }
      }, timeoutMs.toLong().coerceIn(500L, 10_000L))
      val ok = sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL, 0, handler)
      if (!ok && done.compareAndSet(false, true)) {
        handler.removeCallbacksAndMessages(null)
        promise.resolve(null)
      }
    }
  }
}
